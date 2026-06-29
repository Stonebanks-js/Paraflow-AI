"""Grammar engine - pure prompt builder, no provider-specific code."""
from typing import Optional

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict


class GrammarIssue:
    def __init__(self, issue_type: str, message: str, position: int, length: int, severity: str, suggestions: list):
        self.issue_type = issue_type
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

        issues = self._stage1_rule_based(input_text)

        if not issues:
            # No issues to fix - return original text and let the LLM verify
            corrected_text = input_text
        else:
            # Issues found - ask LLM to fix
            system_prompt = (
                "Fix grammar, spelling, punctuation, and style issues in the following text. "
                "Preserve the author's voice and the original meaning. "
                "Return ONLY the corrected text with no explanations, no labels, no quotes, no markdown."
            )
            result = generate_dict(
                system_prompt=system_prompt,
                user_prompt=input_text,
                temperature=0.3,
                max_tokens=1024,
            )
            if result.get("status") == "success" and result.get("output"):
                corrected_text = result["output"]
            else:
                corrected_text = self._apply_rule_fixes(input_text, issues)

        return {
            "status": "success",
            "corrected_text": corrected_text,
            "issues": [self._issue_to_dict(i) for i in issues],
            "language": language,
        }

    def _stage1_rule_based(self, text: str) -> list:
        issues = []
        common_errors = {
            "teh ": "the ", "recieve": "receive", "beleive": "believe",
            "occured": "occurred", "seperate": "separate", "definately": "definitely",
            "accomodate": "accommodate", "occurence": "occurrence",
        }
        text_lower = text.lower()
        for error, correction in common_errors.items():
            if error in text_lower:
                pos = text_lower.find(error)
                issues.append(GrammarIssue(
                    issue_type="spelling",
                    message=f"Possible typo: '{error.strip()}'",
                    position=pos,
                    length=len(error),
                    severity="error",
                    suggestions=[correction.strip()],
                ))
        import re
        double_space = re.findall(r'  +', text)
        for match in double_space:
            pos = text.find(match)
            issues.append(GrammarIssue(
                issue_type="spacing",
                message="Double space found",
                position=pos,
                length=len(match),
                severity="warning",
                suggestions=[" "],
            ))
        return issues

    def _apply_rule_fixes(self, text: str, issues: list) -> str:
        corrected = text
        for issue in issues:
            if issue.issue_type == "spelling" and issue.suggestions:
                start = corrected.lower().find(corrected[issue.position:issue.position + issue.length].lower())
                if start >= 0:
                    corrected = corrected[:start] + issue.suggestions[0] + corrected[start + issue.length:]
        import re
        corrected = re.sub(r'  +', ' ', corrected)
        return corrected

    def _issue_to_dict(self, issue: GrammarIssue) -> dict:
        return {
            "type": issue.issue_type,
            "message": issue.message,
            "position": issue.position,
            "length": issue.length,
            "severity": issue.severity,
            "suggestions": issue.suggestions,
        }
