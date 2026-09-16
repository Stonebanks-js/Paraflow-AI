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
            # Previously "detection_scores" named three specific commercial
            # tools (GPTZero, Originality.ai, Turnitin) but the values for
            # all three were just target_pass_rate -- the USER'S requested
            # target, echoed back as if it were three independent real
            # measurements. This product has no integration with any of
            # those tools. Replaced with a genuine before/after measurement
            # from Paraflow's own Detector engine (a real cross-engine use,
            # not a fabricated one), clearly labeled as this product's own
            # heuristic rather than borrowing a third party's name.
            detection_scores = await self._measure_before_after(input_text, output)
            return {
                "status": "success",
                "output": output,
                "detection_scores": detection_scores,
                "passes_completed": 1,
                "model": result.get("model"),
                "provider": result.get("provider"),
            }

        # Previously fell back to a local contraction-substitution
        # "humanize" here and still reported status:"success". Found live
        # during this phase's testing (Gemini under sustained rate-
        # limiting): its entire vocabulary is ~10 exact formal phrases
        # ("do not", "will not", ...) -- for the large majority of
        # realistic input (no exact match, or already-casual text) it is
        # a complete no-op, returning the input 100% unchanged while
        # still charging credits and reporting success. Same failure
        # class as the Translator and Paraphraser bugs fixed this phase --
        # an honest error instead of a fake success. No credits are
        # charged for this (_run_tool only deducts on genuine success).
        return {
            "status": "error",
            "error": f"Humanization failed: {result.get('error', 'the AI service did not respond in time')}. Please try again.",
        }

    async def _measure_before_after(self, original: str, humanized: str) -> dict:
        """Real before/after AI-likelihood scores from Paraflow's own
        Detector engine -- honest about being this product's own
        heuristic, not a claim of GPTZero/Originality.ai/Turnitin
        integration this product doesn't have. Never lets a detector
        failure break humanization itself; degrades to None on error."""
        try:
            from .detect_engine import DetectEngine
            detector = DetectEngine()
            before = await detector.process(original)
            after = await detector.process(humanized)
            before_score = before.get("result", {}).get("score") if before.get("status") == "success" else None
            after_score = after.get("result", {}).get("score") if after.get("status") == "success" else None
            return {
                "ai_likelihood_before": before_score,
                "ai_likelihood_after": after_score,
                "source": "paraflow_detector",
            }
        except Exception:
            return {"ai_likelihood_before": None, "ai_likelihood_after": None, "source": "paraflow_detector"}

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
            "CRITICAL: Never change the meaning of a negation (e.g. 'does not support' must "
            "never become 'supports'). Preserve all numbers, dates, names, quantities, and "
            "technical terms exactly as given. "
            "Return ONLY the humanized text with no explanations, no labels, no markdown."
        )
