"""Gemini provider using Google's Generative Language API.

Uses the `google-generativeai` SDK. Falls back to using the REST endpoint
via `httpx` if the SDK is not available.
"""
from __future__ import annotations

import threading
import structlog
import httpx

from .base import BaseLLMProvider, LLMRequest, LLMResponse

logger = structlog.get_logger()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

_client_lock = threading.Lock()
_client_cache = {}


def _get_gemini_client(api_key: str, timeout: float = 30.0):
    """Return a singleton Gemini client (google.generativeai or fallback)."""
    cache_key = f"gemini:{api_key[:8]}"
    if cache_key not in _client_cache:
        with _client_lock:
            if cache_key not in _client_cache:
                try:
                    import google.generativeai as genai
                    _client_cache[cache_key] = genai.configure(api_key=api_key)
                except ImportError:
                    _client_cache[cache_key] = None
    return _client_cache[cache_key]


class GeminiProvider(BaseLLMProvider):
    name = "gemini"

    def __init__(self, api_key: str, default_model: str = "gemini-2.0-flash"):
        super().__init__()
        self._api_key = api_key
        self._default_model = default_model

    def _get_client(self):
        if not self._api_key:
            return None
        return _get_gemini_client(self._api_key, timeout=30.0)

    @property
    def default_model(self) -> str:
        return self._default_model

    def _do_generate(self, client, request: LLMRequest) -> LLMResponse:
        """Use REST API directly - more reliable than google.generativeai SDK."""
        model = request.model or self._default_model
        url = f"{GEMINI_BASE_URL}/models/{model}:generateContent?key={self._api_key}"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{request.system_prompt}\n\n{request.user_prompt}"}],
                }
            ],
            "generationConfig": {
                "temperature": request.temperature,
                "topP": request.top_p,
                "maxOutputTokens": request.max_tokens,
            },
        }

        with httpx.Client(timeout=30.0) as http:
            resp = http.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        # Parse Gemini response
        text = ""
        try:
            candidates = data.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if parts:
                    text = parts[0].get("text", "").strip()
        except (IndexError, KeyError, TypeError):
            text = ""

        usage = data.get("usageMetadata", {})
        return LLMResponse(
            text=text,
            model=model,
            provider=self.name,
            input_tokens=usage.get("promptTokenCount", 0),
            output_tokens=usage.get("candidatesTokenCount", 0),
            total_tokens=usage.get("totalTokenCount", 0),
            raw_response=data,
        )
