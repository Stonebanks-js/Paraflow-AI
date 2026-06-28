from typing import Optional
from openai import OpenAI
from app.core.config import settings
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()

_client_cache: dict = {}


def _get_nvidia_client() -> Optional[OpenAI]:
    """Return a singleton OpenAI client configured for the NVIDIA API."""
    api_key = settings.NVIDIA_API_KEY
    base_url = settings.NVIDIA_BASE_URL
    if not api_key or not base_url:
        return None

    cache_key = f"{api_key[:8]}:{base_url}"
    if cache_key not in _client_cache:
        _client_cache[cache_key] = OpenAI(
            base_url=base_url,
            api_key=api_key,
            timeout=60.0,
            max_retries=1,
        )
    return _client_cache[cache_key]


class NVIDIAEngine(BaseAIEngine):
    """
    NVIDIA AI Engine using OpenAI-compatible API.
    """

    def __init__(self):
        super().__init__()
        self.api_key = settings.NVIDIA_API_KEY
        self.model = settings.NVIDIA_MODEL
        self.base_url = settings.NVIDIA_BASE_URL
        self.client = _get_nvidia_client()

        if not self.client:
            logger.error("NVIDIA API key or base URL not configured")

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {
                "status": "error",
                "error": "Invalid input. Text must be between 1 and 50,000 characters.",
                "error_code": "INVALID_INPUT",
            }

        if not self.client:
            return {
                "status": "error",
                "error": "AI service is not configured. Please contact support.",
                "error_code": "SERVICE_UNAVAILABLE",
            }

        system_prompt = self._build_system_prompt(options)

        try:
            extra = {}
            model_lower = (self.model or "").lower()
            if "nemotron" in model_lower and "nano" not in model_lower:
                extra["chat_template_kwargs"] = {"enable_thinking": False}
                extra["reasoning_budget"] = 2048

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text},
                ],
                temperature=0.7,
                top_p=0.9,
                max_tokens=1024,
                extra_body=extra or None,
            )

            output = (response.choices[0].message.content or "").strip()
            if not output:
                return {
                    "status": "error",
                    "error": "AI returned empty response. Please try again.",
                    "error_code": "EMPTY_RESPONSE",
                }

            usage = {}
            if response.usage:
                try:
                    usage = response.usage.model_dump() if hasattr(response.usage, "model_dump") else {}
                except Exception:
                    usage = {}

            return {
                "status": "success",
                "output": output,
                "model": self.model,
                "tokens_used": int(usage.get("total_tokens", 0) or 0),
                "reasoning_tokens": int(usage.get("reasoning_tokens", 0) or 0),
            }

        except Exception as e:
            logger.error(f"NVIDIA API error: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": f"AI service error: {str(e)[:200]}",
                "error_code": "NVIDIA_ERROR",
            }

    def _build_system_prompt(self, options: Optional[dict]) -> str:
        mode = options.get("mode", "standard") if options else "standard"
        writing_dna = options.get("writing_dna") if options else None

        base_prompts = {
            "standard": "You are a professional writer. Rewrite the text preserving meaning, improving clarity and flow. Output only the rewritten text, no explanations, no labels, no markdown.",
            "fluency": "You are a fluency expert. Rewrite the text so it flows smoothly and naturally while preserving meaning. Output only the rewritten text, no explanations, no labels, no markdown.",
            "formal": "You are a formal writing expert. Transform the text into formal, professional language. Output only the transformed text, no explanations, no labels, no markdown.",
            "academic": "You are an academic writing expert. Use scholarly tone and precise language. Output only the adapted text, no explanations, no labels, no markdown.",
            "creative": "You are a creative writer. Add creative flair while keeping the core message. Output only the creative version, no explanations, no labels, no markdown.",
            "simple": "You are a clear communication expert. Simplify the language for broader accessibility. Output only the simplified text, no explanations, no labels, no markdown.",
            "expand": "You are an expansion writer. Elaborate on ideas while maintaining the original intent. Output only the elaborated text, no explanations, no labels, no markdown.",
            "shorten": "You are a concise writer. Reduce word count while preserving key information. Output only the condensed text, no explanations, no labels, no markdown.",
        }

        prompt = base_prompts.get(mode, base_prompts["standard"])

        if writing_dna:
            prompt += f"\n\nMatch this writing style: {writing_dna}"

        return prompt

    async def stream(self, input_text: str, options: Optional[dict] = None):
        """Streaming is not used in the current frontend. Stub for compatibility."""
        if not self.validate_input(input_text):
            yield {"status": "error", "error": "Invalid input", "error_code": "INVALID_INPUT"}
            return

        if not self.client:
            yield {"status": "error", "error": "AI service not configured", "error_code": "SERVICE_UNAVAILABLE"}
            return

        system_prompt = self._build_system_prompt(options)
        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text},
                ],
                temperature=0.7,
                top_p=0.9,
                max_tokens=1024,
                stream=True,
            )
            for chunk in stream:
                if not chunk.choices:
                    continue
                content = getattr(chunk.choices[0].delta, "content", None)
                if content:
                    yield {"status": "success", "type": "content", "chunk": content}
        except Exception as e:
            yield {"status": "error", "error": str(e), "error_code": "NVIDIA_ERROR"}
