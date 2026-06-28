from typing import Optional
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog

logger = structlog.get_logger()


class ParaphraseEngine(BaseAIEngine):
    MODES = ["standard", "fluency", "formal", "academic", "creative", "simple", "expand", "shorten"]

    def __init__(self):
        super().__init__()
        self._nvidia = NVIDIAEngine()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        mode = options.get("mode", "standard") if options else "standard"
        strength = options.get("strength", 50) if options else 50

        if mode not in self.MODES:
            return {"status": "error", "error": f"Invalid mode. Choose from: {self.MODES}"}

        prompt_options = {
            "mode": mode,
            "writing_dna": options.get("writing_dna") if options else None,
        }

        result = await self._nvidia.process(input_text, prompt_options)

        if result.get("status") != "success":
            return result

        output = result.get("output", "")
        return {
            "status": "success",
            "output": output,
            "mode": mode,
            "word_count_diff": len(output.split()) - len(input_text.split()),
            "model_used": result.get("model"),
        }
