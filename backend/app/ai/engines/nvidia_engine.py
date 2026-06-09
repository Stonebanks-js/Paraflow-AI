from typing import Optional
from openai import OpenAI
from app.core.config import settings
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()


class NVIDIAEngine(BaseAIEngine):
    """
    NVIDIA AI Engine using OpenAI-compatible API.
    Model: nvidia/nemotron-3-ultra-550b-a55b with reasoning support.
    """

    def __init__(self):
        super().__init__()
        self.api_key = settings.NVIDIA_API_KEY
        self.model = settings.NVIDIA_MODEL
        self.base_url = settings.NVIDIA_BASE_URL
        self.client = None

        if self.api_key and self.base_url:
            self.client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=120.0,
                max_retries=3,
            )
        else:
            logger.error("NVIDIA API key or base URL not configured")

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        """
        Process text using NVIDIA AI with thinking enabled for better reasoning.
        """
        if not self.validate_input(input_text):
            return {
                "status": "error",
                "error": "Invalid input",
                "error_code": "INVALID_INPUT",
            }

        if not self.client:
            logger.warning("NVIDIA client not initialized - falling back to simulation")
            return self._simulate_process(input_text, options)

        try:
            system_prompt = self._build_system_prompt(options)

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text},
                ],
                temperature=1,
                top_p=0.95,
                max_tokens=4096,
                extra_body={
                    "chat_template_kwargs": {"enable_thinking": True},
                    "reasoning_budget": 4096,
                } if "nemotron" in self.model.lower() and "nano" not in self.model.lower() else {},
            )

            output = response.choices[0].message.content
            usage = response.usage.model_dump() if response.usage else {}

            logger.info(
                "NVIDIA AI processing successful",
                model=self.model,
                tokens_used=usage.get("total_tokens", 0),
            )

            return {
                "status": "success",
                "output": output,
                "model": self.model,
                "tokens_used": usage.get("total_tokens", 0),
                "reasoning_tokens": usage.get("reasoning_tokens", 0),
            }

        except Exception as e:
            logger.warning(f"NVIDIA API error, falling back to simulation: {str(e)}")
            return self._simulate_process(input_text, options)

    def _simulate_process(self, input_text: str, options: Optional[dict] = None) -> dict:
        """Simulation fallback when NVIDIA API is not available."""
        mode = options.get("mode", "standard") if options else "standard"

        transformations = {
            "standard": "rewritten",
            "fluency": "improved and made more natural",
            "formal": "transformed into formal language",
            "academic": "adapted to academic style",
            "creative": "creatively reimagined",
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
        """Build system prompt based on mode and options."""
        mode = options.get("mode", "standard") if options else "standard"
        writing_dna = options.get("writing_dna") if options else None

        base_prompts = {
            "standard": "You are a professional writer. Rewrite the following text maintaining its meaning but improving clarity and flow. Only provide the paraphrased text, no explanations.",
            "fluency": "You are a fluency expert. Rewrite the text to be smooth and natural while preserving meaning. Only provide the paraphrased text.",
            "formal": "You are a formal writing expert. Transform the text into formal, professional language. Only provide the transformed text.",
            "academic": "You are an academic writing expert. Use scholarly tone and precise language. Only provide the adapted text.",
            "creative": "You are a creative writer. Add creative flair while maintaining the core message. Only provide the creative version.",
            "simple": "You are a clear communication expert. Simplify the language for broader accessibility. Only provide the simplified text.",
            "expand": "You are an expansion writer. Elaborate on ideas while maintaining the original intent. Only provide the elaborated text.",
            "shorten": "You are a concise writer. Reduce word count while preserving key information. Only provide the condensed text.",
        }

        prompt = base_prompts.get(mode, base_prompts["standard"])

        if writing_dna:
            prompt += f"\n\nMatch this writing style: {writing_dna}"

        return prompt

    async def stream(self, input_text: str, options: Optional[dict] = None):
        """Stream response from NVIDIA AI with thinking."""
        if not self.validate_input(input_text):
            yield {"status": "error", "error": "Invalid input", "error_code": "INVALID_INPUT"}
            return

        if not self.client:
            logger.warning("NVIDIA client not initialized - falling back to simulation")
            simulated_output = self._simulate_process(input_text, options)["output"]
            for char in simulated_output:
                yield {"status": "success", "type": "content", "chunk": char}
            return

        try:
            system_prompt = self._build_system_prompt(options)

            stream = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": input_text},
                ],
                temperature=1,
                top_p=0.95,
                max_tokens=4096,
                stream=True,
                extra_body={
                    "chat_template_kwargs": {"enable_thinking": True},
                    "reasoning_budget": 4096,
                } if "nemotron" in self.model.lower() and "nano" not in self.model.lower() else {},
            )

            for chunk in stream:
                if not chunk.choices:
                    continue

                reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None)
                if reasoning:
                    yield {"status": "success", "type": "reasoning", "chunk": reasoning}

                if chunk.choices[0].delta.content is not None:
                    yield {"status": "success", "type": "content", "chunk": chunk.choices[0].delta.content}

        except Exception as e:
            logger.warning(f"NVIDIA streaming error, falling back to simulation: {str(e)}")
            simulated_output = self._simulate_process(input_text, options)["output"]
            for char in simulated_output:
                yield {"status": "success", "type": "content", "chunk": char}