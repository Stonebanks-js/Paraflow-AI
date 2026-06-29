"""Provider factory and runner.

Provides:
- `get_provider(name)`: returns a singleton provider by name
- `get_active_provider()`: returns the configured ACTIVE_PROVIDER
- `generate_with_fallback(request)`: tries active then fallback chain

Engines should call `get_active_provider().generate(request)` and handle the
LLMResponse or LLMError returned. They should NOT need to know which provider
is active.
"""
from __future__ import annotations

import threading
from typing import List, Optional

import structlog

from app.core.config import settings

from .base import BaseLLMProvider, LLMRequest, LLMResponse, LLMError
from .openai_provider import OpenAIProvider
from .groq import GroqProvider
from .openrouter import OpenRouterProvider
from .gemini import GeminiProvider

logger = structlog.get_logger()

_provider_lock = threading.Lock()
_provider_cache: dict[str, BaseLLMProvider] = {}


def _build_provider(name: str) -> BaseLLMProvider:
    """Instantiate the provider for a given name. Throws ValueError on unknown name."""
    name = (name or "").lower().strip()
    if name == "openai":
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            default_model=settings.ACTIVE_MODEL or "gpt-4o-mini",
        )
    if name == "groq":
        return GroqProvider(
            api_key=settings.GROQ_API_KEY,
            default_model=settings.ACTIVE_MODEL or settings.GROQ_MODEL,
        )
    if name == "openrouter":
        return OpenRouterProvider(
            api_key=settings.OPENROUTER_API_KEY,
            default_model=settings.ACTIVE_MODEL or settings.OPENROUTER_MODEL,
        )
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
    """Return the singleton active provider based on ACTIVE_PROVIDER."""
    return get_provider(settings.ACTIVE_PROVIDER)


def reset_provider_cache():
    """Clear the provider cache. Useful for tests."""
    global _provider_cache
    with _provider_lock:
        _provider_cache = {}


def get_fallback_chain() -> List[str]:
    """Return the ordered list of fallback provider names (excluding the active one)."""
    active = (settings.ACTIVE_PROVIDER or "").lower()
    chain = []
    for name in settings.fallback_providers_list:
        n = name.lower()
        if n != active:
            chain.append(n)
    return chain


def _run_with_timeout(provider: BaseLLMProvider, request: LLMRequest, timeout: float) -> LLMResponse | LLMError:
    """Run a provider.generate() call under a hard wall-clock timeout.

    The httpx calls are synchronous and would block the event loop.
    We offload to a dedicated executor and wait at most `timeout` seconds.
    """
    import concurrent.futures

    # Use a dedicated executor so we don't compete with the FastAPI default
    # thread pool. This also makes the timeout cancellation more reliable.
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
    """Skip the provider if it can't be initialized (e.g., missing API key).
    Avoids wasting 10s on a provider that will just immediately fail.
    """
    try:
        client = provider._get_client()
        return client is not None
    except Exception:
        return False


def generate_with_fallback(
    request: LLMRequest,
    *,
    timeout: Optional[float] = None,
    max_retries: int = 0,
) -> LLMResponse | LLMError:
    """Run the request against the active provider, then fallback chain on failure.

    Returns the first LLMResponse that comes back, or the last LLMError.
    Never raises. Each provider is given a single shot with the timeout - no retries
    by default, to keep total latency bounded across the fallback chain.

    Providers without a valid API key are skipped immediately (don't waste timeout).
    """
    if timeout is None:
        timeout = settings.LLM_TIMEOUT_SECONDS

    # Try the active provider first, then the configured fallback chain
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

        # Skip providers that can't be initialized (no API key configured)
        if not _quick_check_provider(provider):
            logger.debug("provider.skipped", provider=provider_name, reason="client_init_failed")
            continue

        # Single shot per provider - keep latency bounded
        result = _run_with_timeout(provider, request, timeout=timeout)
        if isinstance(result, LLMResponse):
            if provider_name != settings.ACTIVE_PROVIDER:
                logger.info(
                    "fallback.used",
                    active=settings.ACTIVE_PROVIDER,
                    used=provider_name,
                    model=result.model,
                )
            return result
        last_error = result

    if last_error is None:
        return LLMError(
            code="NO_PROVIDER",
            message="No LLM provider configured. Set ACTIVE_PROVIDER and a valid API key.",
            provider="",
            retriable=False,
            latency_seconds=0.0,
        )
    return last_error
