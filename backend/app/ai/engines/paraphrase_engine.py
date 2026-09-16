"""Paraphrase engine - pure prompt builder, no provider-specific code."""
from typing import Optional

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict


class ParaphraseEngine(BaseAIEngine):
    MODES = ["standard", "fluency", "formal", "academic", "creative", "simple", "expand", "shorten"]

    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        mode = options.get("mode", "standard") if options else "standard"
        strength = options.get("strength", 50) if options else 50

        if mode not in self.MODES:
            return {"status": "error", "error": f"Invalid mode. Choose from: {self.MODES}"}

        writing_dna = options.get("writing_dna") if options else None

        system_prompt = self._build_system_prompt(mode, writing_dna)

        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.7 + (strength / 200.0),
            max_tokens=min(2048, max(256, len(input_text.split()) * 3)),
        )

        if result.get("status") == "success" and result.get("output"):
            output = result["output"]
            return {
                "status": "success",
                "output": output,
                "mode": mode,
                "word_count_diff": len(output.split()) - len(input_text.split()),
                "model_used": result.get("model"),
                "provider": result.get("provider"),
            }

        # Previously fell back to a local rule-based "paraphrase" here and
        # still reported status:"success". Found live during this phase's
        # testing (Gemini under sustained rate-limiting): that fallback's
        # entire vocabulary is a ~12-word substitution dictionary capped
        # at one swap per request at moderate strength -- for the large
        # majority of realistic sentences (no dictionary word present) it
        # is a complete no-op, returning the input text 100% unchanged
        # while still reporting success and charging credits. Confirmed
        # reproducible: three different real sentences all came back
        # byte-identical to their input. This is the exact same failure
        # class as the Translator bug fixed earlier this phase --
        # pretending a non-result is a result -- so it gets the same fix:
        # an honest error instead of a fake success. No credits are
        # charged for this (_run_tool only deducts on genuine success).
        return {
            "status": "error",
            "error": f"Paraphrasing failed: {result.get('error', 'the AI service did not respond in time')}. Please try again.",
        }

    def _build_system_prompt(self, mode: str, writing_dna: Optional[str]) -> str:
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
        # None of the 8 mode prompts above had an explicit instruction to
        # preserve facts/numbers/negation -- a well-documented LLM
        # paraphrasing failure mode (e.g. "does NOT support X" silently
        # becoming "supports X"). Relying on the model's general sense of
        # "preserving meaning" isn't a substitute for stating it
        # explicitly, so make it a hard constraint on every mode.
        prompt += (
            "\n\nCRITICAL CONSTRAINTS: Never change the meaning of a negation "
            "(e.g. 'does not support' must never become 'supports'). Preserve all "
            "numbers, dates, names, quantities, and technical terms exactly as "
            "given -- do not invent, round, or substitute any of them."
        )
        if writing_dna:
            prompt += f"\n\nMatch this writing style: {writing_dna}"
        return prompt
