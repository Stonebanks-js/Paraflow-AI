from typing import Optional, List
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog

logger = structlog.get_logger()


class SummarizeEngine(BaseAIEngine):
    STYLES = ["concise", "detailed", "bullet_points", "executive"]

    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        style = options.get("style", "concise") if options else "concise"
        max_length = options.get("max_length", 200) if options else 200

        if style not in self.STYLES:
            return {"status": "error", "error": f"Invalid style. Choose from: {self.STYLES}"}

        engine = NVIDIAEngine()

        style_prompts = {
            "concise": f"Summarize the following text in approximately {max_length} words, capturing the key points.",
            "detailed": f"Provide a detailed summary of approximately {max_length * 2} words, covering all important aspects.",
            "bullet_points": f"Extract the key points as bullet points, suitable for quick scanning.",
            "executive": f"Provide an executive summary in approximately {max_length} words, focusing on actionable insights."
        }

        prompt = style_prompts.get(style, style_prompts["concise"])
        result = await engine.process(f"{prompt}\n\n{input_text}", {"mode": "formal"})

        summary = result.get("output", "")

        key_points = await self._extract_key_points(input_text, summary)

        return {
            "status": "success",
            "summary": summary,
            "key_points": key_points,
            "style": style,
            "original_word_count": len(input_text.split()),
            "summary_word_count": len(summary.split())
        }

    async def _extract_key_points(self, original: str, summary: str) -> List[str]:
        engine = NVIDIAEngine()

        prompt = f"Extract 3-5 key points from this text. Format as a simple list:\n\n{original}"
        result = await engine.process(prompt, {"mode": "simple"})

        points_text = result.get("output", "")
        points = [p.strip() for p in points_text.split("\n") if p.strip()]

        return points[:5]