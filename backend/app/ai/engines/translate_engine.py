"""Translate engine - pure prompt builder, no provider-specific code."""
from typing import Optional
import structlog

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict

logger = structlog.get_logger()


LANGUAGE_CODES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "ru": "Russian", "zh": "Chinese",
    "ja": "Japanese", "ko": "Korean", "ar": "Arabic", "hi": "Hindi",
    "nl": "Dutch", "pl": "Polish", "tr": "Turkish", "vi": "Vietnamese",
    "th": "Thai", "sv": "Swedish", "da": "Danish", "fi": "Finnish",
    "no": "Norwegian", "cs": "Czech", "el": "Greek", "he": "Hebrew",
    "id": "Indonesian", "ms": "Malay", "ro": "Romanian", "hu": "Hungarian",
    "uk": "Ukrainian", "bg": "Bulgarian", "hr": "Croatian", "sk": "Slovak",
    "sl": "Slovenian", "lt": "Lithuanian", "lv": "Latvian", "et": "Estonian"
}

# langdetect's ISO codes for the handful of cases that don't match our own
# 2-letter codes 1:1 (Chinese splits into simplified/traditional variants;
# Hebrew's ISO 639-1 code is "he" in both, listed for clarity).
_LANGDETECT_ALIASES = {
    "zh": {"zh-cn", "zh-tw"},
}


class TranslateEngine(BaseAIEngine):
    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        source_lang = options.get("source_lang", "en") if options else "en"
        target_lang = options.get("target_lang", "es") if options else "es"
        preserve_tone = options.get("preserve_tone", True) if options else True

        if target_lang not in LANGUAGE_CODES:
            return {
                "status": "error",
                "error": f"Unsupported language: {target_lang}. Supported: {list(LANGUAGE_CODES.keys())}",
            }

        system_prompt = self._build_system_prompt(source_lang, target_lang, preserve_tone)

        result = generate_dict(
            system_prompt=system_prompt,
            user_prompt=input_text,
            temperature=0.3,
            max_tokens=1024,
        )

        if result.get("status") == "success" and result.get("output"):
            translated = result["output"]

            # OUTPUT VALIDATION (was missing entirely): the engine used to
            # trust Gemini's HTTP success as proof the translation actually
            # happened, but a model can return HTTP 200 with text that is
            # still just the original language -- e.g. if it misreads the
            # instruction on a short/ambiguous input. Checking the UI's
            # selected target_lang alone doesn't catch this; the OUTPUT
            # itself has to be checked. A confident language-detection
            # mismatch is treated as a genuine failure, not silently shown
            # as a successful translation.
            mismatch = self._detect_language_mismatch(translated, target_lang)
            if mismatch:
                detected_name, confidence = mismatch
                target_name = LANGUAGE_CODES.get(target_lang, target_lang.upper())
                logger.warning(
                    "translate.output_language_mismatch",
                    target_lang=target_lang,
                    detected=detected_name,
                    confidence=round(confidence, 2),
                )
                return {
                    "status": "error",
                    "error": (
                        f"Translation to {target_name} failed validation: the output looks like "
                        f"{detected_name}, not {target_name}. Please try again."
                    ),
                }

            return {
                "status": "success",
                "translated_text": translated,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "word_count_diff": len(translated.split()) - len(input_text.split()),
                "model": result.get("model"),
                "provider": result.get("provider"),
            }

        # Unlike Grammar/Humanizer, there is no honest local fallback for
        # translation -- returning the original text is not "a degraded
        # translation," it is no translation at all. Previously this
        # returned status:"success" with the untranslated input (prefixed
        # with a bracketed note), which (a) charged the user credits for a
        # request that produced no actual translation, since _run_tool()
        # only skips billing on a real failure, and (b) reproduced live as
        # exactly the "translator just returns the same text" symptom.
        # Surface the real failure instead.
        target_name = LANGUAGE_CODES.get(target_lang, target_lang.upper())
        return {
            "status": "error",
            "error": f"Translation to {target_name} failed: {result.get('error', 'the AI service did not respond in time')}. Please try again.",
        }

    def _build_system_prompt(self, source_lang: str, target_lang: str, preserve_tone: bool) -> str:
        source_name = LANGUAGE_CODES.get(source_lang, source_lang)
        target_name = LANGUAGE_CODES.get(target_lang, target_lang)
        tone = (
            " Preserve the original tone, formality level, and stylistic intent."
            if preserve_tone
            else ""
        )
        return (
            f"Translate the following text from {source_name} to {target_name}."
            f"{tone} The ENTIRE output must be genuinely written in {target_name} -- "
            f"never leave it in {source_name} or any other language, even for a short "
            f"or ambiguous input. Preserve numbers, dates, proper names, URLs, and "
            f"technical terms/acronyms exactly as given rather than translating or "
            f"altering them. Return ONLY the translated text with no explanations, "
            f"no labels, no quotes, no markdown."
        )

    # Only languages langdetect can reliably distinguish are checked;
    # detection on very short strings or closely related languages is
    # inherently noisy, so this stays a targeted safety net, not a
    # strict grammar-level verifier.
    _DETECTABLE = set(LANGUAGE_CODES.keys()) - {"en"}

    def _detect_language_mismatch(self, text: str, target_lang: str):
        """Return (detected_language_name, confidence) if the translated
        output confidently looks like a language OTHER than target_lang,
        or None if it passes (matches, is undetectable, or the detector
        itself is unavailable/inconclusive -- never block a possibly-good
        translation on a broken or uncertain validator)."""
        if target_lang not in self._DETECTABLE:
            return None
        # Too short for language detection to be meaningful -- a 2-3 word
        # phrase can plausibly "detect" as several languages at once.
        if len(text.split()) < 4:
            return None
        try:
            from langdetect import detect_langs, DetectorFactory, LangDetectException
            # langdetect is a probabilistic n-gram detector that reseeds
            # itself randomly on every call by default -- confirmed live
            # (identical input produced confidence scores that varied
            # between 0.71 and 0.9999 run to run before pinning this).
            # A fixed seed makes it deterministic, which a validation gate
            # that decides success/failure must be.
            DetectorFactory.seed = 0
        except ImportError:
            return None
        try:
            candidates = detect_langs(text)
        except LangDetectException:
            return None
        except Exception:
            return None
        if not candidates:
            return None

        top = candidates[0]
        expected_codes = _LANGDETECT_ALIASES.get(target_lang, {target_lang})
        if top.lang in expected_codes:
            return None
        # Only flag a CONFIDENT mismatch. Calibrated against a real
        # reproduction of the original bug (Gemini returning the
        # untranslated English input when French was requested), which
        # scored 0.71 confidence for English -- comfortably above this
        # threshold, while every genuine short translation tested scored
        # >=0.999 for the correct target language, leaving a wide margin
        # so ambiguous/mixed text isn't false-flagged.
        if top.prob < 0.6:
            return None
        detected_name = LANGUAGE_CODES.get(top.lang, top.lang.upper())
        return detected_name, top.prob
