"""Summarize engine - pure prompt builder, no provider-specific code."""
from typing import Optional

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict


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

        input_word_count = len(input_text.split())
        # A summary must actually be shorter than its source. `max_length`
        # is a user-chosen target independent of input size (frontend
        # default: 200 words). For any input at or below that target,
        # asking Gemini for "~200 words" from an 81-word input is a
        # no-op instruction -- it (and the local fallback below, which
        # only truncates when the running total *exceeds* the cap) would
        # just return the text back essentially unchanged. Cap the target
        # to a fraction of the actual input length so a summary is always
        # a genuine compression, while still respecting a smaller
        # user-requested length.
        target_length = self._compute_target_length(style, max_length, input_word_count)

        system_prompt = self._build_system_prompt(style, target_length)

        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.5,
            max_tokens=min(1024, max(64, target_length * 3)),
        )

        if result.get("status") == "success" and result.get("output"):
            summary = result["output"]
            return {
                "status": "success",
                "summary": summary,
                "key_points": self._extract_key_points(summary),
                "style": style,
                "original_word_count": input_word_count,
                "summary_word_count": len(summary.split()),
                "model": result.get("model"),
                "provider": result.get("provider"),
            }

        # All providers failed - use local extractive summary
        summary = self._local_summary(input_text, target_length)
        return {
            "status": "success",
            "summary": summary,
            "key_points": self._extract_key_points(input_text),
            "style": style,
            "original_word_count": input_word_count,
            "summary_word_count": len(summary.split()),
            "model": "local-fallback",
            "provider": "local",
        }

    def _compute_target_length(self, style: str, requested_max_length: int, input_word_count: int) -> int:
        """Never target more than a fraction of the actual input length,
        regardless of what the user's length slider asked for."""
        ratio = 0.75 if style == "detailed" else 0.5
        cap = max(10, int(input_word_count * ratio))
        return min(requested_max_length, cap)

    def _local_summary(self, text: str, max_length: int) -> str:
        """Local extractive summary - take first sentences up to max_length words."""
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        result = []
        word_count = 0
        for s in sentences:
            s_words = len(s.split())
            if word_count + s_words > max_length and result:
                break
            result.append(s)
            word_count += s_words
        return " ".join(result) if result else text[:max_length * 5]

    def _build_system_prompt(self, style: str, target_length: int) -> str:
        prompts = {
            "concise": f"Summarize the following text in approximately {target_length} words. Capture the key points concisely. Return ONLY the summary text with no explanations, no labels, no markdown.",
            "detailed": f"Provide a detailed summary in approximately {target_length} words, covering all important aspects. Return ONLY the summary text with no explanations, no labels, no markdown.",
            "bullet_points": f"Extract the key points as bullet points (use '-' prefix), suitable for quick scanning, totaling roughly {target_length} words across all bullets. Return ONLY the bullet points with no explanations, no labels, no markdown.",
            "executive": f"Provide an executive summary in approximately {target_length} words, focusing on actionable insights. Return ONLY the summary text with no explanations, no labels, no markdown.",
        }
        return prompts.get(style, prompts["concise"])

    def _extract_key_points(self, summary: str) -> list:
        """Extract bullet points from the summary if formatted with '-' prefix,
        otherwise split into sentences."""
        import re
        lines = summary.split("\n")
        points = []
        for line in lines:
            line = line.strip()
            if line.startswith("-"):
                points.append(line[1:].strip())
            elif line and "." in line:
                sentences = re.split(r'(?<=[.!?])\s+', line)
                points.extend(s.strip() for s in sentences if s.strip())
        return points[:5]
