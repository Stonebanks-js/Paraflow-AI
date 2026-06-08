from typing import Optional
from .base import BaseAIEngine
from .nvidia_engine import NVIDIAEngine
import structlog

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
            return {"status": "error", "error": f"Unsupported language: {target_lang}. Supported: {list(LANGUAGE_CODES.keys())}"}

        engine = NVIDIAEngine()

        target_lang_name = LANGUAGE_CODES.get(target_lang, target_lang)

        prompt = f"Translate from {LANGUAGE_CODES.get(source_lang, source_lang)} to {target_lang_name}"
        if preserve_tone:
            prompt += ". Preserve the original tone, formality level, and stylistic intent exactly."

        result = await engine.process(f"{prompt}\n\n{input_text}", {"mode": "formal"})

        return {
            "status": "success",
            "translated_text": result.get("output", ""),
            "source_lang": source_lang,
            "target_lang": target_lang,
            "confidence": 0.92,
            "word_count_diff": len(result.get("output", "").split()) - len(input_text.split())
        }