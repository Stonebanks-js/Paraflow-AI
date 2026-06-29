"""Groq provider using the OpenAI-compatible Groq API.

Groq is extremely fast (often <1s responses) and supports many open-source
models. We use the OpenAI SDK pointed at Groq's base URL.
"""
from __future__ import annotations

import threading
from openai import OpenAI
import structlog

from .base import BaseLLMProvider, LLMRequest, LLMResponse

logger = structlog.get_logger()

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_client_lock = threading.Lock()
_client_cache = {}


def _get_groq_client(api_key: str, timeout: float = 30.0) -> OpenAI:
    cache_key = f"groq:{api_key[:8]}"
    if cache_key not in _client_cache:
        with _client_lock:
            if cache_key not in _client_cache:
                _client_cache[cache_key] = OpenAI(
                    base_url=GROQ_BASE_URL,
                    api_key=api_key,
                    timeout=timeout,
                    max_retries=0,
                )
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
            return _get_groq_client(self._api_key, timeout=30.0)
        except Exception as e:
            logger.error("groq.client.create_failed", error=str(e))
            return None

    @property
    def default_model(self) -> str:
        return self._default_model

    def _do_generate(self, client, request: LLMRequest) -> LLMResponse:
        response = client.chat.completions.create(
            model=request.model or self._default_model,
            messages=[
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_prompt},
            ],
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_tokens,
        )

        text = (response.choices[0].message.content or "").strip()
        usage = self._safe_usage(response)
        return LLMResponse(
            text=text,
            model=response.model or self._default_model,
            provider=self.name,
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            raw_response=response,
        )

    def _safe_usage(self, response) -> dict:
        try:
            if response.usage:
                if hasattr(response.usage, "model_dump"):
                    return response.usage.model_dump()
                return dict(response.usage)
        except Exception:
            pass
        return {}
