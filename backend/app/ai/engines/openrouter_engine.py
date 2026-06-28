from typing import Optional
import httpx
from app.core.config import settings
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()


class OpenRouterEngine(BaseAIEngine):
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self):
        super().__init__()
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL or "anthropic/claude-3.5-sonnet"
        self.client = None
        if self.api_key:
            self.client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://paraflow.ai",
                    "X-Title": "Paraflow AI",
                },
                timeout=60.0,
            )

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        if not self.client:
            return self._simulate_process(input_text, options)

        try:
            system_prompt = self._build_system_prompt(options)
            response = await self.client.post(
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": input_text},
                    ],
                    "max_tokens": 4096,
                },
            )
            response.raise_for_status()
            data = response.json()

            output = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            return {
                "status": "success",
                "output": output,
                "model": self.model,
                "tokens_used": usage.get("total_tokens", 0),
            }
        except Exception as e:
            logger.warning(f"OpenRouter API error, falling back to simulation: {e}")
            return self._simulate_process(input_text, options)

    def _simulate_process(self, input_text: str, options: Optional[dict] = None) -> dict:
        mode = options.get("mode", "standard") if options else "standard"

        transformations = {
            "standard": "rewritten",
            "fluency": "improved and made more natural",
            "formal": "transformed into formal language",
            "academic": "adapted to academic style",
            "creative": "creativly reimagined",
            "simple": "simplified for clarity",
            "expand": "elaborated in detail",
            "shorten": "condensed concisely",
        }

        transformed = f"[{transformations.get(mode, 'processed')} version]: {input_text}"

        return {
            "status": "success",
            "output": transformed,
            "model": "simulation",
            "tokens_used": len(input_text.split()),
        }

    def _build_system_prompt(self, options: Optional[dict]) -> str:
        mode = options.get("mode", "standard") if options else "standard"
        writing_dna = options.get("writing_dna") if options else None

        base_prompts = {
            "standard": "You are a professional writer. Rewrite the text maintaining its meaning but improving clarity and flow.",
            "fluency": "You are a fluency expert. Rewrite the text to be smooth and natural while preserving meaning.",
            "formal": "You are a formal writing expert. Transform the text into formal, professional language.",
            "academic": "You are an academic writing expert. Use scholarly tone and precise language.",
            "creative": "You are a creative writer. Add creative flair while maintaining the core message.",
            "simple": "You are a clear communication expert. Simplify the language for broader accessibility.",
            "expand": "You are an expansion writer. Elaborate on ideas while maintaining the original intent.",
            "shorten": "You are a concise writer. Reduce word count while preserving key information.",
        }

        prompt = base_prompts.get(mode, base_prompts["standard"])

        if writing_dna:
            prompt += f"\n\nMatch this writing style: {writing_dna}"

        return prompt

    async def stream(self, input_text: str, options: Optional[dict] = None):
        if not self.validate_input(input_text):
            yield {"status": "error", "error": "Invalid input"}
            return

        try:
            system_prompt = self._build_system_prompt(options)
            async with self.client.stream(
                "POST",
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": input_text},
                    ],
                    "max_tokens": 4096,
                    "stream": True,
                },
            ) as stream:
                async for chunk in stream.aiter_lines():
                    if chunk:
                        import json
                        try:
                            data = json.loads(chunk)
                            if "choices" in data:
                                content = data["choices"][0].get("delta", {}).get("content", "")
                                if content:
                                    yield {"status": "success", "chunk": content}
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield {"status": "error", "error": str(e)}
