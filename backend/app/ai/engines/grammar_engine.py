from typing import Optional, List
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog

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

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        language = options.get("language", "en") if options else "en"

        issues = await self._stage1_rule_based(input_text)

        corrected_text = await self._stage2_llm_rewrite(input_text, issues)

        return {
            "status": "success",
            "corrected_text": corrected_text,
            "issues": [self._issue_to_dict(i) for i in issues],
            "language": language
        }

    async def _stage1_rule_based(self, text: str) -> List[GrammarIssue]:
        issues = []

        common_errors = {
            "teh ": "the ",
            "recieve": "receive",
            "beleive": "believe",
            "occured": "occurred",
            "seperate": "separate",
            "definately": "definitely",
            "accomodate": "accommodate",
            "occurence": "occurrence"
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
                    suggestions=[correction]
                ))

        import re
        double_space = re.findall(r'  +', text)
        for match in double_space:
            pos = text.find(match)
            issues.append(GrammarIssue(
                type="spacing",
                message="Double space found",
                position=pos,
                length=len(match),
                severity="warning",
                suggestions=[" "]
            ))

        return issues

    async def _stage2_llm_rewrite(self, text: str, issues: List[GrammarIssue]) -> str:
        if not issues:
            return text

        engine = NVIDIAEngine()

        error_summary = "\n".join([
            f"- {issue.type}: {issue.message}" for issue in issues[:10]
        ])

        prompt = f"Fix these grammar and style issues in the text:\n{error_summary}\n\nOriginal text:\n{text}\n\nProvide only the corrected text without explanations."
        result = await engine.process(prompt, {"mode": "fluency"})

        return result.get("output", text)

    def _issue_to_dict(self, issue: GrammarIssue) -> dict:
        return {
            "type": issue.type,
            "message": issue.message,
            "position": issue.position,
            "length": issue.length,
            "severity": issue.severity,
            "suggestions": issue.suggestions
        }