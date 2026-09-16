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
        writing_dna = options.get("writing_dna") if options else None

        issues = self._stage1_rule_based(input_text)

        # Always run the LLM pass. The rule-based scan above only catches a
        # small fixed list of common misspellings (see _stage1_rule_based)
        # and cannot detect genuine grammar/syntax errors -- subject-verb
        # agreement, tense, articles, etc. -- which is this engine's actual
        # purpose. Previously the LLM call was skipped whenever no
        # rule-based issue matched, so real grammar errors were silently
        # never corrected at all (reproduced live: "I has went to the
        # market yesterday." came back completely unchanged with "no
        # issues found", since none of its words are in the misspelling
        # dictionary even though the sentence has an obvious error).
        style_clause = (
            f"\n\nThe author's established writing style (from their Writing DNA profile):\n{writing_dna}\n"
            "Preserve genuine stylistic choices that match this profile (e.g. contraction use, "
            "sentence length, tone) even if a different phrasing would also be valid -- only "
            "change what is an actual error, never 'correct' a real stylistic preference away."
            if writing_dna else ""
        )
        system_prompt = (
            "Fix grammar, spelling, punctuation, and style issues in the following text. "
            "Preserve the author's voice and the original meaning."
            f"{style_clause} "
            "Return ONLY the corrected text with no explanations, no labels, no quotes, no markdown."
        )
        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.3,
            max_tokens=1024,
        )
        # Unlike Paraphraser/Humanizer/Translator, there IS an honest
        # partial local check here when Gemini fails: the rule-based scan
        # genuinely looks for real (if narrow) issues, and _apply_rule_fixes
        # genuinely fixes whatever it found -- neither is fabricated. The
        # real risk is narrower: if Gemini fails AND the rule-based scan
        # (which only catches ~8 known misspellings) finds nothing, the
        # response looks identical to a full Gemini-verified "no issues
        # found" even though only the narrow local check actually ran, so
        # a genuine grammar error Gemini would have caught goes silently
        # unreported. checked_by makes that distinction visible to callers
        # instead of presenting both cases identically.
        gemini_reached = result.get("status") == "success" and bool(result.get("output"))
        if gemini_reached:
            corrected_text = result["output"]
        elif issues:
            corrected_text = self._apply_rule_fixes(input_text, issues)
        else:
            corrected_text = input_text

        issue_dicts = [self._issue_to_dict(i) for i in issues]
        if corrected_text.strip() != input_text.strip() and not issue_dicts:
            # The LLM changed the text in a way the rule-based scan didn't
            # catch (the common case -- real grammar errors). Represent
            # that honestly instead of showing "no issues found" next to
            # visibly different corrected text; this isn't a claim of
            # precise per-error positions, just an honest summary that a
            # real correction was made and what it was.
            issue_dicts = [{
                "type": "grammar",
                "message": "Grammar and phrasing improvements applied",
                "position": 0,
                "length": len(input_text),
                "severity": "info",
                "suggestions": [corrected_text],
            }]

        return {
            "status": "success",
            "corrected_text": corrected_text,
            "issues": issue_dicts,
            "language": language,
            "checked_by": "gemini" if gemini_reached else "rule_based_only",
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
