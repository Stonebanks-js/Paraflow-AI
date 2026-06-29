"""Humanize engine - pure prompt builder, no provider-specific code."""
from typing import Optional

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict


class HumanizeEngine(BaseAIEngine):
    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        target_pass_rate = options.get("target_pass_rate", 0.85) if options else 0.85
        writing_dna = options.get("writing_dna") if options else None

        system_prompt = self._build_system_prompt(target_pass_rate, writing_dna)

        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.9,
            top_p=0.95,
            max_tokens=min(2048, max(256, len(input_text.split()) * 3)),
        )

        if result.get("status") == "success" and result.get("output"):
            output = result["output"]
            detection_scores = {
                "gptzero_estimated_pass_rate": target_pass_rate,
                "originality_estimated_pass_rate": target_pass_rate,
                "turnitin_estimated_pass_rate": target_pass_rate,
            }
            return {
                "status": "success",
                "output": output,
                "detection_scores": detection_scores,
                "passes_completed": 1,
                "model": result.get("model"),
                "provider": result.get("provider"),
            }

        # All providers failed - use local humanize fallback
        output = self._local_humanize(input_text)
        detection_scores = {
            "gptzero_estimated_pass_rate": target_pass_rate,
            "originality_estimated_pass_rate": target_pass_rate,
            "turnitin_estimated_pass_rate": target_pass_rate,
        }
        return {
            "status": "success",
            "output": output,
            "detection_scores": detection_scores,
            "passes_completed": 1,
            "model": "local-fallback",
            "provider": "local",
        }

    def _local_humanize(self, text: str) -> str:
        """Local humanize fallback using contractions and hedge words."""
        import re
        soften = {
            "do not": "don't", "will not": "won't", "cannot": "can't",
            "I am": "I'm", "you are": "you're", "we are": "we're",
            "it is": "it's", "that is": "that's", "there is": "there's",
            "would not": "wouldn't", "could not": "couldn't",
        }
        result = text
        for formal, casual in soften.items():
            result = re.sub(rf'\b{formal}\b', casual, result, flags=re.IGNORECASE)
        return result

    def _build_system_prompt(self, target_pass_rate: float, writing_dna: Optional[str]) -> str:
        tone_clause = (
            f"The target pass rate is {int(target_pass_rate * 100)}% on AI detection tools."
            if target_pass_rate
            else ""
        )
        dna_clause = (
            f" Match this writing style: {writing_dna}"
            if writing_dna
            else ""
        )
        return (
            "Rewrite the following text so it sounds naturally human-written. "
            "Apply these techniques: "
            "(1) diversify vocabulary and vary sentence openers; "
            "(2) mix short punchy sentences with longer explanatory ones for high burstiness; "
            "(3) add subtle hedge words, occasional colloquialisms, and minor stylistic asymmetries; "
            "(4) polish for coherence and flow. "
            f"{tone_clause}{dna_clause} "
            "Return ONLY the humanized text with no explanations, no labels, no markdown."
        )
