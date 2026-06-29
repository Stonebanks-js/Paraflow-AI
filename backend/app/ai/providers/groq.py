"""Groq provider using direct httpx calls to the OpenAI-compatible Groq API.

We use httpx directly (not the OpenAI SDK) because:
1. The OpenAI SDK on Render free tier has been observed to take >10s
   even for fast responses, likely due to retry logic or connection pool
   behavior interacting with Render's network.
2. httpx gives us explicit control over timeouts and connection reuse.
"""
from __future__ import annotations

import threading
import time
import httpx
import structlog

from .base import BaseLLMProvider, LLMRequest, LLMResponse

logger = structlog.get_logger()

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Track create failures so we don't retry the same broken client repeatedly
_create_failures = 0

_client_lock = threading.Lock()
_client_cache = {}


def _get_groq_client(api_key: str, timeout: float = 10.0) -> httpx.Client:
    """Return a singleton httpx.Client for Groq with connection reuse."""
    global _create_failures
    cache_key = f"groq:{api_key[:8]}"
    if cache_key not in _client_cache:
        with _client_lock:
            if cache_key not in _client_cache:
                try:
                    _client_cache[cache_key] = httpx.Client(
                        base_url=GROQ_BASE_URL,
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        timeout=httpx.Timeout(timeout, connect=5.0),
                        limits=httpx.Limits(
                            max_connections=10,
                            max_keepalive_connections=5,
                            keepalive_expiry=30.0,
                        ),
                    )
                    _create_failures = 0
                except Exception as e:
                    _create_failures += 1
                    logger.error("groq.client.create_failed", error=str(e))
                    raise
    return _client_cache[cache_key]


class GroqProvider(BaseLLMProvider):
    name = "groq"

    def __init__(self, api_key: str, default_model: str = "llama-3.3-70b-versatile"):
        super().__init__()
        self._api_key = api_key
        self._default_model = default_model

    def _get_client(self):
        if not self._api_key:
            return None
        try:
            return _get_groq_client(self._api_key, timeout=10.0)
        except Exception as e:
            logger.error("groq.client.create_failed", error=str(e))
            return None

    @property
    def default_model(self) -> str:
        return self._default_model

    def _do_generate(self, client, request: LLMRequest) -> LLMResponse:
        payload = {
            "model": request.model or self._default_model,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_prompt},
            ],
            "temperature": request.temperature,
            "top_p": request.top_p,
            "max_tokens": request.max_tokens,
        }

        start = time.monotonic()
        try:
            response = client.post("/chat/completions", json=payload)
            elapsed = time.monotonic() - start
            logger.info(
                "groq.request.success",
                latency=round(elapsed, 3),
                status=response.status_code,
            )
            response.raise_for_status()
        except httpx.TimeoutException as e:
            elapsed = time.monotonic() - start
            logger.warning(
                "groq.request.timeout",
                latency=round(elapsed, 3),
                error=str(e)[:200],
            )
            raise RuntimeError(f"Groq timed out after {elapsed:.1f}s") from e
        except httpx.HTTPError as e:
            elapsed = time.monotonic() - start
            logger.error(
                "groq.request.error",
                latency=round(elapsed, 3),
                error=str(e)[:200],
            )
            raise

        data = response.json()

        text = (data["choices"][0]["message"]["content"] or "").strip()
        usage = data.get("usage", {})
        return LLMResponse(
            text=text,
            model=data.get("model", request.model or self._default_model),
            provider=self.name,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            raw_response=data,
        )

