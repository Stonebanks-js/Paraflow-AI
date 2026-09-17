"""Gemini provider using direct httpx calls to Google's Generative Language API.

This is the ONLY LLM provider for the production stack. The provider
abstraction (BaseLLMProvider / factory / llm_service) is preserved so
future providers can be added without touching engine code, but right now
everything goes through Gemini.

Why httpx directly (not google.generativeai SDK):
1. The SDK on Render free tier interacts poorly with the network stack.
2. httpx gives us explicit timeouts and connection-pool reuse.
3. The Gemini REST API is simple and stable - no SDK needed.
"""
from __future__ import annotations

import threading
import time
import httpx
import structlog

from .base import BaseLLMProvider, LLMRequest, LLMResponse

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

_client_lock = threading.Lock()
_client_cache = {}


class GeminiAPIError(RuntimeError):
    """A Gemini API failure with a known retriability, carried on the
    exception itself so base.py's generate() doesn't have to guess.

    Root cause traced live: base.py previously marked EVERY exception
    retriable=True regardless of type, and factory.py's retry loop had
    zero backoff between attempts. That meant a genuine 429 (Gemini's
    documented, persistent rate-limit issue -- see Phase 22/23) got
    retried immediately against the exact same still-throttled window,
    turning one user click into two real Gemini calls and doubling load
    at the worst possible moment instead of recovering from it. A 4xx
    client error (bad request, auth, not found) is even worse to retry
    identically -- it will just fail the same way again, wasting a
    second call for zero benefit. Only 429 and 5xx are worth a retry.
    """

    def __init__(self, message: str, *, retriable: bool):
        super().__init__(message)
        self.retriable = retriable


def _get_gemini_client(api_key: str, timeout: float = 10.0) -> httpx.Client:
    """Return a singleton httpx.Client for Gemini with connection reuse.

    SECURITY: the key is sent as the `x-goog-api-key` header, never as a
    `?key=` query param. This was previously query-param auth, which
    means the live key was baked into every request URL -- and httpx
    exceptions (HTTPStatusError, and generic HTTPError string reprs)
    include the request URL in their message. That meant any code path
    that surfaced a raw exception message (logs, or worse, an API error
    response returned to a browser) leaked the key in plaintext. This
    was reproduced live: a genuine 429 from Gemini came back to the
    frontend with the full key visible in the error text. Header-based
    auth removes the entire class of bug at its source, since the key
    can no longer appear in a URL under any circumstance -- see also
    the exception-message sanitization below as defense in depth.
    """
    cache_key = f"gemini:{api_key[:8]}"
    if cache_key not in _client_cache:
        with _client_lock:
            if cache_key not in _client_cache:
                _client_cache[cache_key] = httpx.Client(
                    base_url=GEMINI_BASE_URL,
                    headers={"x-goog-api-key": api_key},
                    timeout=httpx.Timeout(timeout, connect=5.0),
                    limits=httpx.Limits(
                        max_connections=10,
                        max_keepalive_connections=5,
                        keepalive_expiry=30.0,
                    ),
                )
                logger.info("gemini.client.created", key_prefix=api_key[:8])
    return _client_cache[cache_key]


class GeminiProvider(BaseLLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, default_model: str = "gemini-2.5-flash"):
        super().__init__()
        self._api_key = api_key
        self._default_model = default_model

    def _get_client(self):
        if not self._api_key:
            return None
        try:
            return _get_gemini_client(self._api_key, timeout=10.0)
        except Exception as e:
            logger.error("gemini.client.create_failed", error=str(e))
            return None

    @property
    def default_model(self) -> str:
        return self._default_model

    def _do_generate(self, client, request: LLMRequest) -> LLMResponse:
        model = request.model or self._default_model
        url = f"/models/{model}:generateContent"

        # Gemini's generateContent uses a "contents" array of role/parts.
        # System instructions go in a separate `systemInstruction` field.
        payload = {
            "systemInstruction": {
                "parts": [{"text": request.system_prompt}],
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": request.user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": request.temperature,
                "topP": request.top_p,
                "maxOutputTokens": request.max_tokens,
                # Gemini 2.5 models "think" by default, and those reasoning
                # tokens are drawn from the same maxOutputTokens budget as
                # the visible answer. For short, deterministic text-transform
                # tasks (paraphrase/summarize/translate/etc.) with a modest
                # token budget, thinking can consume most or all of it,
                # truncating the actual output to a few words before it even
                # starts (observed live: an 81-word summarize request with
                # maxOutputTokens=120 returned only 4 words). None of these
                # engines need chain-of-thought reasoning, so disable it to
                # give the full budget to the real answer.
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }

        start = time.monotonic()
        try:
            response = client.post(url, json=payload)
            elapsed = time.monotonic() - start
            logger.info(
                "gemini.request.success",
                model=model,
                latency=round(elapsed, 3),
                status=response.status_code,
            )
            response.raise_for_status()
        except httpx.TimeoutException as e:
            elapsed = time.monotonic() - start
            logger.warning(
                "gemini.request.timeout",
                model=model,
                latency=round(elapsed, 3),
            )
            raise GeminiAPIError(f"Gemini timed out after {elapsed:.1f}s", retriable=True) from None
        except httpx.HTTPStatusError as e:
            # Build the message from status code + reason only -- never
            # str(e), which for HTTPStatusError includes the full request
            # URL. Now that auth is header-based the key can't appear
            # there anymore either way, but this is deliberate defense in
            # depth: no exception's raw string repr should ever reach a
            # log line or an API response without going through an
            # explicit allow-list of what's safe to include.
            elapsed = time.monotonic() - start
            status = e.response.status_code
            reason = e.response.reason_phrase or "error"
            logger.error(
                "gemini.request.error",
                model=model,
                latency=round(elapsed, 3),
                status=status,
                reason=reason,
            )
            # 429 (rate limit) and 5xx (transient server-side failure) can
            # genuinely succeed on a retry. A 4xx client error (400 bad
            # request, 401/403 auth, 404 unknown model) means the exact
            # same request will fail the exact same way again -- retrying
            # it only burns another call and adds latency for nothing.
            retriable = status == 429 or status >= 500
            raise GeminiAPIError(f"Gemini error: {status} {reason}", retriable=retriable) from None
        except httpx.HTTPError as e:
            elapsed = time.monotonic() - start
            logger.error(
                "gemini.request.error",
                model=model,
                latency=round(elapsed, 3),
                error_type=type(e).__name__,
            )
            raise GeminiAPIError("Gemini request failed", retriable=True) from None

        data = response.json()

        # Parse response text
        text = ""
        try:
            candidates = data.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if parts:
                    text = (parts[0].get("text") or "").strip()
        except (IndexError, KeyError, TypeError):
            text = ""

        if not text:
            finish_reason = ""
            try:
                finish_reason = data.get("candidates", [{}])[0].get("finishReason", "")
            except (IndexError, KeyError, TypeError):
                pass
            # Not retriable: an empty response is almost always systematic
            # (a safety filter or the same prompt/token-budget interaction)
            # rather than a network blip, so an identical retry would very
            # likely produce the exact same empty result.
            raise GeminiAPIError(
                f"Gemini returned empty response. finishReason={finish_reason or 'unknown'}",
                retriable=False,
            )

        # Parse usage metadata
        usage = data.get("usageMetadata", {})

        return LLMResponse(
            text=text,
            model=data.get("modelVersion", model),
            provider=self.name,
            input_tokens=int(usage.get("promptTokenCount", 0) or 0),
            output_tokens=int(usage.get("candidatesTokenCount", 0) or 0),
            total_tokens=int(usage.get("totalTokenCount", 0) or 0),
            raw_response=data,
        )
