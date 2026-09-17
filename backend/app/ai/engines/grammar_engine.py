"""Grammar engine - pure prompt builder, no provider-specific code."""
from typing import Optional
import json
import re
import structlog

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict

logger = structlog.get_logger()


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
        # Ask for structured, itemized issues (type/original/correction/
        # explanation/severity) instead of only corrected text. Previously
        # a genuine Gemini correction was represented as a single synthetic
        # "Grammar and phrasing improvements applied" entry -- honestly
        # labeled, but not the itemized breakdown a real writing assistant
        # should give (which specific issue, where, why). Falls back to
        # that same honest summary if Gemini doesn't return parseable
        # JSON, rather than failing the whole request over a formatting
        # slip.
        system_prompt = (
            "You are a professional grammar and writing editor. Analyze the text below for genuine "
            "grammar, spelling, punctuation, and clarity issues -- do not invent issues that aren't "
            "there; if the text is already correct, return an empty issues list. Preserve the "
            "author's voice and original meaning."
            f"{style_clause}\n\n"
            "Respond with ONLY valid JSON (no markdown fences, no text outside the JSON) in exactly "
            "this shape:\n"
            '{"corrected_text": "the fully corrected text", "issues": [{"type": '
            '"grammar|spelling|punctuation|clarity", "original": "the exact problematic snippet as it '
            'appears in the input", "correction": "the fixed version of that snippet", "explanation": '
            '"one short sentence explaining the issue", "severity": "error|warning|info"}]}'
        )
        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.2,
            max_tokens=1536,
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
        issue_dicts = None
        if gemini_reached:
            parsed = self._parse_structured_output(result["output"], input_text)
            if parsed is not None:
                corrected_text, issue_dicts = parsed
            else:
                # Gemini responded but not in the requested JSON shape --
                # still a real result, just fall back to the summary form
                # rather than discarding a genuine correction.
                corrected_text = result["output"]
        elif issues:
            corrected_text = self._apply_rule_fixes(input_text, issues)
        else:
            corrected_text = input_text

        if issue_dicts is None:
            issue_dicts = [self._issue_to_dict(i) for i in issues]
            if corrected_text.strip() != input_text.strip() and not issue_dicts:
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

    def _parse_structured_output(self, raw_output: str, input_text: str):
        """Parse Gemini's {"corrected_text", "issues": [...]} JSON response
        into the engine's (corrected_text, issue_dicts) shape. Returns None
        if the output isn't valid/usable JSON, so the caller can fall back
        to the honest summary form instead of fabricating structure."""
        text = raw_output.strip()
        # Models frequently wrap JSON in ```json fences despite being told
        # not to -- strip that rather than failing to parse over it.
        fence_match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
        if fence_match:
            text = fence_match.group(1)

        try:
            data = json.loads(text)
        except (json.JSONDecodeError, ValueError):
            return None
        if not isinstance(data, dict) or "corrected_text" not in data:
            return None

        corrected_text = str(data.get("corrected_text") or "")
        if not corrected_text.strip():
            return None

        raw_issues = data.get("issues")
        if not isinstance(raw_issues, list):
            raw_issues = []

        issue_dicts = []
        for item in raw_issues:
            if not isinstance(item, dict):
                continue
            original = str(item.get("original") or "")
            correction = str(item.get("correction") or "")
            explanation = str(item.get("explanation") or "").strip()
            issue_type = str(item.get("type") or "grammar").strip() or "grammar"
            severity = item.get("severity")
            if severity not in ("error", "warning", "info"):
                severity = "warning"
            # Best-effort position lookup so the frontend can still
            # highlight the right span; falls back to 0/0 (whole-text)
            # rather than dropping a genuine issue just because the exact
            # substring wasn't found verbatim in the input.
            position = input_text.find(original) if original else -1
            if position < 0:
                position, length = 0, 0
            else:
                length = len(original)
            message = explanation or f"Possible {issue_type} issue"
            if original:
                message = f"{message} (\"{original}\")"
            issue_dicts.append({
                "type": issue_type,
                "message": message,
                "position": position,
                "length": length,
                "severity": severity,
                "suggestions": [correction] if correction else [],
            })

        return corrected_text, issue_dicts

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
