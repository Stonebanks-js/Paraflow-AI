"""Provider factory and runner.

Gemini is the ONLY active LLM provider. This factory preserves the
provider abstraction (BaseLLMProvider) so future providers can be added
without touching engine code, but the current implementation only
registers Gemini.

Engines should call `get_active_provider().generate(request)` and handle
the LLMResponse or LLMError returned. They should NOT need to know which
provider is active.
"""
from __future__ import annotations

import threading
import time
from typing import List, Optional

import structlog

from app.core.config import settings

from .base import BaseLLMProvider, LLMRequest, LLMResponse, LLMError
from .gemini import GeminiProvider

logger = structlog.get_logger()

_provider_lock = threading.Lock()
_provider_cache: dict[str, BaseLLMProvider] = {}


def _build_provider(name: str) -> BaseLLMProvider:
    """Instantiate the provider for a given name. Throws ValueError on unknown name."""
    name = (name or "").lower().strip()
    if name == "gemini":
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            default_model=settings.ACTIVE_MODEL or settings.GEMINI_MODEL,
        )
    raise ValueError(f"Unknown provider: {name}")


def get_provider(name: str) -> BaseLLMProvider:
    """Return a singleton provider instance by name."""
    name = (name or "").lower().strip()
    if name not in _provider_cache:
        with _provider_lock:
            if name not in _provider_cache:
                try:
                    _provider_cache[name] = _build_provider(name)
                    logger.info("provider.created", provider=name)
                except Exception as e:
                    logger.error("provider.create_failed", provider=name, error=str(e))
                    raise
    return _provider_cache[name]


def get_active_provider() -> BaseLLMProvider:
    """Return the singleton active provider (Gemini)."""
    return get_provider(settings.ACTIVE_PROVIDER)


def reset_provider_cache():
    """Clear the provider cache. Useful for tests."""
    global _provider_cache
    with _provider_lock:
        _provider_cache = {}


def get_fallback_chain() -> List[str]:
    """Return the fallback chain. Always empty because Gemini is the only
    provider. Kept for API compatibility with the engine layer."""
    return []


def _run_with_timeout(provider: BaseLLMProvider, request: LLMRequest, timeout: float) -> LLMResponse | LLMError:
    """Run a provider.generate() call under a hard wall-clock timeout.

    The httpx calls are synchronous and would block the event loop.
    We offload to a dedicated executor and wait at most `timeout` seconds.
    """
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(provider.generate, request)
        try:
            return future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            return LLMError(
                code="PROVIDER_TIMEOUT",
                message=f"{provider.name} timed out after {timeout}s",
                provider=provider.name,
                retriable=True,
                latency_seconds=timeout,
            )
        except Exception as e:
            return LLMError(
                code="PROVIDER_ERROR",
                message=f"{provider.name} error: {str(e)[:200]}",
                provider=provider.name,
                retriable=True,
                latency_seconds=0.0,
            )


def _quick_check_provider(provider: BaseLLMProvider) -> bool:
    """Skip the provider if it can't be initialized (e.g., missing API key)."""
    try:
        client = provider._get_client()
        return client is not None
    except Exception:
        return False


def generate_with_fallback(
    request: LLMRequest,
    *,
    timeout: Optional[float] = None,
    max_retries: int = 1,
) -> LLMResponse | LLMError:
    """Run the request against the active provider, then fallback chain on failure.

    Returns the first LLMResponse that comes back, or the last LLMError.
    Never raises. Each provider attempt gets up to `max_retries` extra
    tries when the failure is marked retriable (timeouts, transient
    provider errors) -- e.g. under momentary rate limiting or a slow
    response, a single hiccup no longer fails the whole request. Non-
    retriable failures (bad API key, etc.) are not retried.

    With Gemini as the only provider, the fallback chain is empty and
    we go straight to Gemini. If Gemini fails, the engine's local
    fallback kicks in.
    """
    if timeout is None:
        timeout = settings.LLM_TIMEOUT_SECONDS

    attempts = [settings.ACTIVE_PROVIDER] + get_fallback_chain()

    last_error: Optional[LLMError] = None
    for provider_name in attempts:
        if not provider_name:
            continue
        try:
            provider = get_provider(provider_name)
        except Exception as e:
            logger.warning("provider.unavailable", provider=provider_name, error=str(e))
            continue

        if not _quick_check_provider(provider):
            logger.debug("provider.skipped", provider=provider_name, reason="client_init_failed")
            continue

        for attempt in range(1 + max(0, max_retries)):
            result = _run_with_timeout(provider, request, timeout=timeout)
            if isinstance(result, LLMResponse):
                if provider_name != settings.ACTIVE_PROVIDER:
                    logger.info(
                        "fallback.used",
                        active=settings.ACTIVE_PROVIDER,
                        used=provider_name,
                        model=result.model,
                    )
                if attempt > 0:
                    logger.info("llm.retry.succeeded", provider=provider_name, attempt=attempt)
                return result
            last_error = result
            if not result.retriable or attempt >= max_retries:
                break
            # ROOT CAUSE FIX: this loop used to retry immediately with no
            # delay at all. For the most common retriable failure in
            # production -- a Gemini 429 (see Phase 22/23's rate-limit
            # finding) -- retrying 0ms later hits the exact same
            # still-throttled window almost every time, wasting a second
            # real API call and doubling pressure on an already-strained
            # key instead of giving it a chance to recover. A short,
            # bounded backoff trades a little latency (still well inside
            # the frontend's own request timeout) for a real chance of
            # success.
            backoff_seconds = min(1.5 * (attempt + 1), 3.0)
            logger.warning(
                "llm.retry",
                provider=provider_name,
                attempt=attempt + 1,
                code=result.code,
                backoff_seconds=backoff_seconds,
            )
            time.sleep(backoff_seconds)

    if last_error is None:
        return LLMError(
            code="NO_PROVIDER",
            message="No LLM provider configured. Set ACTIVE_PROVIDER and a valid API key.",
            provider="",
            retriable=False,
            latency_seconds=0.0,
        )
    return last_error
