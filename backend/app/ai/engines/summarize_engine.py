from typing import Optional, List
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog

logger = structlog.get_logger()


class SummarizeEngine(BaseAIEngine):
    STYLES = ["concise", "detailed", "bullet_points", "executive"]

    def __init__(self):
        super().__init__()
        self._nvidia = NVIDIAEngine()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        style = options.get("style", "concise") if options else "concise"
        max_length = options.get("max_length", 200) if options else 200

        if style not in self.STYLES:
            return {"status": "error", "error": f"Invalid style. Choose from: {self.STYLES}"}

        summary = ""
        try:
            summary = await self._summarize(input_text, style, max_length)
        except Exception as e:
            logger.error(f"Summarize LLM call failed: {e}")
            return {
                "status": "error",
                "error": f"Failed to summarize: {str(e)[:200]}",
            }

        key_points = await self._extract_key_points(input_text)

        return {
            "status": "success",
            "summary": summary,
            "key_points": key_points,
            "style": style,
            "original_word_count": len(input_text.split()),
            "summary_word_count": len(summary.split()),
        }

    async def _summarize(self, text: str, style: str, max_length: int) -> str:
        if not self._nvidia or not self._nvidia.client:
            return self._extractive_summary(text, max_length)

        style_instructions = {
            "concise": f"Summarize the following text in approximately {max_length} words. Capture the key points concisely. Return ONLY the summary text with no explanations, no labels, no markdown.",
            "detailed": f"Provide a detailed summary in approximately {max_length * 2} words, covering all important aspects. Return ONLY the summary text with no explanations, no labels, no markdown.",
            "bullet_points": f"Extract the key points as bullet points (use '-' prefix), suitable for quick scanning. Return ONLY the bullet points with no explanations, no labels, no markdown.",
            "executive": f"Provide an executive summary in approximately {max_length} words, focusing on actionable insights. Return ONLY the summary text with no explanations, no labels, no markdown.",
        }

        instruction = style_instructions.get(style, style_instructions["concise"])

        try:
            response = self._nvidia.client.chat.completions.create(
                model=self._nvidia.model,
                messages=[
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": text},
                ],
                temperature=0.5,
                top_p=0.9,
                max_tokens=min(1024, max_length * 3),
            )
            output = (response.choices[0].message.content or "").strip()
            if not output:
                return self._extractive_summary(text, max_length)
            return output
        except Exception as e:
            logger.error(f"Summarize LLM call failed: {e}")
            return self._extractive_summary(text, max_length)

    def _extractive_summary(self, text: str, max_length: int) -> str:
        """Local fallback: take the first N words."""
        words = text.split()
        if len(words) <= max_length:
            return text
        return " ".join(words[:max_length]) + "..."

    async def _extract_key_points(self, original: str) -> List[str]:
        if not self._nvidia or not self._nvidia.client:
            return self._extractive_key_points(original)

        instruction = (
            "Extract 3-5 key points from the following text. "
            "Return each point on its own line. Do not number them. "
            "No explanations, no labels, no markdown."
        )
        try:
            response = self._nvidia.client.chat.completions.create(
                model=self._nvidia.model,
                messages=[
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": original},
                ],
                temperature=0.3,
                top_p=0.9,
                max_tokens=512,
            )
            output = (response.choices[0].message.content or "").strip()
            if not output:
                return self._extractive_key_points(original)
            points = [p.lstrip("- •\t ").rstrip() for p in output.split("\n") if p.strip()]
            return points[:5]
        except Exception as e:
            logger.error(f"Key points extraction failed: {e}")
            return self._extractive_key_points(original)

    def _extractive_key_points(self, text: str) -> List[str]:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        return sentences[:5]


import re
