from typing import Optional, List
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog
import re

logger = structlog.get_logger()


class GrammarIssue:
    def __init__(self, issue_type: str, message: str, position: int, length: int, severity: str, suggestions: List[str]):
        self.type = issue_type
        self.message = message
        self.position = position
        self.length = length
        self.severity = severity
        self.suggestions = suggestions


class GrammarEngine(BaseAIEngine):
    def __init__(self):
        super().__init__()
        self._nvidia = NVIDIAEngine()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        language = options.get("language", "en") if options else "en"

        issues = self._stage1_rule_based(input_text)

        corrected_text = input_text
        try:
            corrected_text = await self._stage2_llm_rewrite(input_text, issues)
        except Exception as e:
            logger.error(f"Grammar LLM rewrite failed: {e}")
            corrected_text = input_text

        return {
            "status": "success",
            "corrected_text": corrected_text,
            "issues": [self._issue_to_dict(i) for i in issues],
            "language": language,
        }

    def _stage1_rule_based(self, text: str) -> List[GrammarIssue]:
        issues = []

        common_errors = {
            "teh ": "the ",
            "recieve": "receive",
            "beleive": "believe",
            "occured": "occurred",
            "seperate": "separate",
            "definately": "definitely",
            "accomodate": "accommodate",
            "occurence": "occurrence",
        }

        text_lower = text.lower()
        for error, correction in common_errors.items():
            if error in text_lower:
                pos = text_lower.find(error)
                issues.append(GrammarIssue(
                    type="spelling",
                    message=f"Possible typo: '{error.strip()}'",
                    position=pos,
                    length=len(error),
                    severity="error",
                    suggestions=[correction.strip()],
                ))

        double_space = re.findall(r'  +', text)
        for match in double_space:
            pos = text.find(match)
            issues.append(GrammarIssue(
                type="spacing",
                message="Double space found",
                position=pos,
                length=len(match),
                severity="warning",
                suggestions=[" "],
            ))

        return issues

    async def _stage2_llm_rewrite(self, text: str, issues: List[GrammarIssue]) -> str:
        """Send the original text to NVIDIA. The LLM is told to correct grammar.
        We never feed the user text inside an instruction prompt - the LLM gets
        the text directly as the user message so the simulation fallback (which
        would echo a string) cannot leak prompt instructions to the UI.
        """
        if not self._nvidia or not self._nvidia.client:
            if issues:
                return self._apply_rule_fixes(text, issues)
            return text

        if issues:
            error_summary = "; ".join([f"{i.type}: {i.message}" for i in issues[:10]])
            instruction = (
                "Fix grammar, spelling, punctuation, and style issues in the following text. "
                "Preserve the author's voice and the original meaning. "
                "Return ONLY the corrected text with no explanations, no labels, no quotes, no markdown."
            )
        else:
            instruction = (
                "Review the following text and fix any grammar, punctuation, or clarity issues. "
                "If no issues exist, return it unchanged. "
                "Return ONLY the corrected text with no explanations, no labels, no quotes, no markdown."
            )

        # Use chat completion with system + user role separation
        # We do NOT concatenate instruction with text - that would leak on fallback.
        try:
            response = self._nvidia.client.chat.completions.create(
                model=self._nvidia.model,
                messages=[
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
                top_p=0.9,
                max_tokens=1024,
            )
            output = (response.choices[0].message.content or "").strip()
            if not output:
                return text
            return output
        except Exception as e:
            logger.error(f"Grammar LLM call failed: {e}")
            if issues:
                return self._apply_rule_fixes(text, issues)
            return text

    def _apply_rule_fixes(self, text: str, issues: List[GrammarIssue]) -> str:
        corrected = text
        for issue in issues:
            if issue.type == "spelling" and issue.suggestions:
                start = corrected.lower().find(corrected[issue.position:issue.position + issue.length].lower())
                if start >= 0:
                    corrected = corrected[:start] + issue.suggestions[0] + corrected[start + issue.length:]
        corrected = re.sub(r'  +', ' ', corrected)
        return corrected

    def _issue_to_dict(self, issue: GrammarIssue) -> dict:
        return {
            "type": issue.type,
            "message": issue.message,
            "position": issue.position,
            "length": issue.length,
            "severity": issue.severity,
            "suggestions": issue.suggestions,
        }
