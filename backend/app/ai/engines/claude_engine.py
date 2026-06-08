from typing import Optional
import anthropic
from app.core.config import settings
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()


class ClaudeEngine(BaseAIEngine):
    def __init__(self):
        super().__init__()
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = settings.AI_MODEL_SONNET
        self.client = None
        if self.api_key:
            self.client = anthropic.Anthropic(api_key=self.api_key)

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        if not self.client:
            return self._simulate_process(input_text, options)

        try:
            system_prompt = self._build_system_prompt(options)
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": input_text}]
            )
            return {
                "status": "success",
                "output": response.content[0].text,
                "model": self.model,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            }
        except Exception as e:
            logger.warning(f"Claude API error, falling back to simulation: {e}")
            return self._simulate_process(input_text, options)

    def _simulate_process(self, input_text: str, options: Optional[dict] = None) -> dict:
        mode = options.get("mode", "standard") if options else "standard"

        transformations = {
            "standard": "rewritten",
            "fluency": "improved",
            "formal": "formalized",
            "academic": "academicized",
            "creative": "creativized",
            "simple": "simplified",
            "expand": "expanded",
            "shorten": "shortened"
        }

        transformed = f"[{mode.capitalize()} version]: {input_text}"

        return {
            "status": "success",
            "output": transformed,
            "model": "simulation",
            "tokens_used": len(input_text.split())
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
            "shorten": "You are a concise writer. Reduce word count while preserving key information."
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
            with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": input_text}]
            ) as stream:
                for text in stream.text_stream:
                    yield {"status": "success", "chunk": text}
        except Exception as e:
            yield self.handle_error(e)