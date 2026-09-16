"""Translate engine - pure prompt builder, no provider-specific code."""
from typing import Optional

from .base import BaseAIEngine
from app.ai.llm_service import generate_dict


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
            f"{tone} Return ONLY the translated text with no explanations, no labels, no quotes, no markdown."
        )
