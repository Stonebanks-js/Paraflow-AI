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
        self._nvidia = NVIDIAEngine()

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

        target_lang_name = LANGUAGE_CODES.get(target_lang, target_lang)
        source_lang_name = LANGUAGE_CODES.get(source_lang, source_lang)

        if not self._nvidia or not self._nvidia.client:
            return {
                "status": "error",
                "error": "Translation service is not configured.",
            }

        tone_clause = (
            " Preserve the original tone, formality level, and stylistic intent."
            if preserve_tone
            else ""
        )
        instruction = (
            f"Translate the following text from {source_lang_name} to {target_lang_name}."
            f"{tone_clause} Return ONLY the translated text with no explanations, no labels, no quotes, no markdown."
        )

        try:
            import asyncio
            loop = asyncio.get_event_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(
                    None,
                    lambda: self._nvidia.client.chat.completions.create(
                        model=self._nvidia.model,
                        messages=[
                            {"role": "system", "content": instruction},
                            {"role": "user", "content": input_text},
                        ],
                        temperature=0.3,
                        top_p=0.9,
                        max_tokens=1024,
                    ),
                ),
                timeout=45.0,
            )
            translated = (response.choices[0].message.content or "").strip()
            if not translated:
                return {"status": "error", "error": "Translation returned empty response."}
            return {
                "status": "success",
                "translated_text": translated,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "confidence": 0.92,
                "word_count_diff": len(translated.split()) - len(input_text.split()),
            }
        except (asyncio.TimeoutError, Exception) as e:
            logger.error(f"Translate LLM call failed: {e}")
            return {
                "status": "error",
                "error": f"Translation failed: {str(e)[:200]}",
            }
