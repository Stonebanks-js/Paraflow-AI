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


def _get_gemini_client(api_key: str, timeout: float = 10.0) -> httpx.Client:
    """Return a singleton httpx.Client for Gemini with connection reuse."""
    cache_key = f"gemini:{api_key[:8]}"
    if cache_key not in _client_cache:
        with _client_lock:
            if cache_key not in _client_cache:
                _client_cache[cache_key] = httpx.Client(
                    base_url=GEMINI_BASE_URL,
                    params={"key": api_key},
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
                error=str(e)[:200],
            )
            raise RuntimeError(f"Gemini timed out after {elapsed:.1f}s") from e
        except httpx.HTTPError as e:
            elapsed = time.monotonic() - start
            logger.error(
                "gemini.request.error",
                model=model,
                latency=round(elapsed, 3),
                error=str(e)[:200],
            )
            raise

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
            raise RuntimeError(
                f"Gemini returned empty response. finishReason={finish_reason or 'unknown'}"
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
