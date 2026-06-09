from typing import Optional, List, Dict
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()


class SEOAnalysis:
    def __init__(self):
        self.keyword_density: Dict[str, float] = {}
        self.readability_score: float = 0.0
        self.title_quality: float = 0.0
        self.meta_quality: float = 0.0
        self.suggestions: List[str] = []


class SEOEngine(BaseAIEngine):
    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        target_keywords = options.get("target_keywords", []) if options else []
        content_type = options.get("content_type", "blog") if options else "blog"

        analysis = SEOAnalysis()

        analysis.keyword_density = self._calculate_keyword_density(input_text, target_keywords)

        analysis.readability_score = self._calculate_readability(input_text)

        analysis.title_quality = self._evaluate_title(input_text)

        analysis.suggestions = self._generate_suggestions(input_text, target_keywords, analysis)

        health_score = self._calculate_seo_score(analysis, target_keywords)

        return {
            "status": "success",
            "analysis": {
                "keyword_density": analysis.keyword_density,
                "readability_score": analysis.readability_score,
                "title_quality": analysis.title_quality,
                "meta_quality": analysis.meta_quality,
                "suggestions": analysis.suggestions
            },
            "health_score": health_score,
            "content_type": content_type
        }

    def _calculate_keyword_density(self, text: str, keywords: List[str]) -> Dict[str, float]:
        text_lower = text.lower()
        words = text.split()
        total_words = len(words) if words else 1

        density = {}
        for keyword in keywords:
            keyword_lower = keyword.lower()
            count = text_lower.count(keyword_lower)
            density[keyword] = round((count / total_words) * 100, 2)

        return density

    def _calculate_readability(self, text: str) -> float:
        sentences = [s for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
        if not sentences:
            return 50.0

        words = text.split()
        total_words = len(words)
        if total_words == 0:
            return 50.0

        def count_syllables(word: str) -> int:
            word = word.lower()
            count = 0
            vowels = "aeiouy"
            if word and word[0] in vowels:
                count += 1
            for index in range(1, len(word)):
                if word[index] in vowels and word[index - 1] not in vowels:
                    count += 1
            if word.endswith("e"):
                count -= 1
            if word.endswith("le") and len(word) > 2 and word[-3] not in vowels:
                count += 1
            if count == 0:
                count = 1
            return count

        total_syllables = sum(count_syllables(w) for w in words)
        avg_sentence_length = total_words / len(sentences)
        avg_syllables_per_word = total_syllables / total_words

        flesch_score = 206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables_per_word

        readability = max(0, min(100, flesch_score))

        return round(readability, 1)

    def _evaluate_title(self, text: str) -> float:
        lines = text.split("\n")
        first_line = lines[0] if lines else ""

        title_score = 50.0

        if len(first_line) > 0:
            title_score += 15

        if 30 <= len(first_line) <= 60:
            title_score += 15

        title_words = first_line.split()
        if 5 <= len(title_words) <= 12:
            title_score += 10

        return min(100, title_score)

    def _generate_suggestions(self, text: str, keywords: List[str], analysis: SEOAnalysis) -> List[str]:
        suggestions = []

        for keyword, density in analysis.keyword_density.items():
            if density < 1:
                suggestions.append(f"Add more instances of '{keyword}' (current density: {density}%)")
            elif density > 3:
                suggestions.append(f"Reduce '{keyword}' usage (density too high: {density}%)")

        if analysis.readability_score < 60:
            suggestions.append("Improve readability by using shorter sentences and simpler words")

        if analysis.title_quality < 70:
            suggestions.append("Strengthen the title with clear value proposition and target keywords")

        first_line = text.split("\n")[0] if text else ""
        if not any(kw.lower() in first_line.lower() for kw in keywords[:3]):
            suggestions.append("Include primary keyword in the title")

        return suggestions[:5]

    def _calculate_seo_score(self, analysis: SEOAnalysis, keywords: List[str]) -> int:
        score = 50.0

        if keywords:
            avg_density = sum(analysis.keyword_density.values()) / len(keywords)
            if 1 <= avg_density <= 2.5:
                score += 20
            elif avg_density > 0:
                score += 10

        score += (analysis.readability_score / 100) * 15
        score += (analysis.title_quality / 100) * 15

        return int(min(100, score))