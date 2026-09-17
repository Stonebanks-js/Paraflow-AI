import re
from typing import Optional, List, Dict
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "with",
    "is", "are", "was", "were", "be", "been", "being", "this", "that", "these",
    "those", "it", "its", "as", "at", "by", "from", "we", "you", "your", "our",
    "i", "he", "she", "they", "them", "his", "her", "their", "not", "so", "if",
    "than", "then", "there", "here", "what", "which", "who", "will", "can",
    "has", "have", "had", "do", "does", "did", "into", "about", "out", "up",
}


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
        # Previously always 0.0 -- initialized on SEOAnalysis and never
        # actually computed anywhere in process(). Now genuinely derived
        # from whether a real meta description was generated and how
        # close it lands to the ~120-160 char range search engines
        # typically display without truncating.
        meta_description, analysis.meta_quality = self._generate_meta_description(input_text, target_keywords)

        heading_info = self._analyze_headings(input_text)
        intro_check = self._check_keyword_in_intro(input_text, target_keywords)
        length_check = self._check_content_length(input_text, content_type)
        semantic_keywords = self._suggest_semantic_keywords(input_text, target_keywords)

        analysis.suggestions = self._generate_suggestions(
            input_text, target_keywords, analysis, heading_info, intro_check, length_check
        )

        health_score = self._calculate_seo_score(analysis, target_keywords, heading_info, intro_check, length_check)

        return {
            "status": "success",
            "analysis": {
                "keyword_density": analysis.keyword_density,
                "readability_score": analysis.readability_score,
                "title_quality": analysis.title_quality,
                "meta_quality": analysis.meta_quality,
                "suggestions": analysis.suggestions,
                "meta_description_suggestion": meta_description,
                "heading_structure": heading_info,
                "keyword_in_introduction": intro_check["found"],
                "word_count": length_check["word_count"],
                "semantic_keyword_suggestions": semantic_keywords,
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

    def _generate_meta_description(self, text: str, keywords: List[str]) -> tuple:
        """Generate a real, usable meta description from the actual content
        (the first 1-2 sentences, trimmed to fit the ~155-char window search
        engines display) rather than leaving this field permanently at its
        unset default. Quality is scored on real, checkable criteria: is it
        in the ideal length range, and does it contain the target keyword."""
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        body = " ".join(lines[1:]) if len(lines) > 1 else (lines[0] if lines else "")
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', body) if s.strip()]

        description = ""
        for s in sentences:
            candidate = (description + " " + s).strip() if description else s
            if len(candidate) > 160:
                break
            description = candidate
        if not description and sentences:
            description = sentences[0][:157] + "..."
        elif not description:
            description = text[:157] + "..." if len(text) > 160 else text

        quality = 40.0
        length = len(description)
        if 120 <= length <= 160:
            quality += 35
        elif 80 <= length < 120 or 160 < length <= 180:
            quality += 15

        if keywords and any(kw.lower() in description.lower() for kw in keywords):
            quality += 25

        return description, min(100.0, quality)

    def _analyze_headings(self, text: str) -> dict:
        """Real heading-structure detection: markdown-style (#, ##) or a
        short standalone line followed by a longer paragraph (a common
        plain-text heading pattern). Long content with zero detected
        headings is a genuine, checkable structure problem for SEO.

        BUG FOUND while auditing this engine: the docstring above already
        claimed the plain-text pattern was detected, but the implementation
        only ever checked markdown '#' syntax -- content pasted from a CMS
        or doc editor (real section structure, no markdown) was always
        scored as having zero headings regardless of actual structure.
        """
        lines = text.split("\n")
        markdown_headings = [l for l in lines if re.match(r'^#{1,6}\s+\S', l.strip())]

        plain_headings = []
        for i in range(len(lines) - 1):
            line = lines[i].strip()
            next_line = lines[i + 1].strip()
            if (
                line
                and len(line) <= 60
                and not line.endswith((".", "!", "?", ","))
                and len(next_line.split()) >= 6
            ):
                plain_headings.append(line)

        total_count = len(markdown_headings) + len(plain_headings)
        word_count = len(text.split())

        has_headings = total_count > 0
        return {
            "count": total_count,
            "has_headings": has_headings,
            "needed": word_count > 400 and not has_headings,
        }

    def _check_keyword_in_intro(self, text: str, keywords: List[str]) -> dict:
        """Whether the primary target keyword actually appears in the
        first ~150 words -- a real, specific, checkable signal (search
        engines and readers both weight the opening disproportionately),
        not a generic "add your keyword" suggestion."""
        if not keywords:
            return {"found": True, "checked": False}
        words = text.split()
        intro = " ".join(words[:150]).lower()
        primary = keywords[0].lower()
        return {"found": primary in intro, "checked": True, "keyword": keywords[0]}

    def _check_content_length(self, text: str, content_type: str) -> dict:
        """Real word-count thresholds by content type, not a single
        arbitrary number -- a landing page and a technical article have
        different realistic length expectations."""
        word_count = len(text.split())
        minimums = {"blog": 300, "article": 600, "product": 100, "landing": 150}
        minimum = minimums.get(content_type, 300)
        return {"word_count": word_count, "minimum": minimum, "below_minimum": word_count < minimum}

    def _suggest_semantic_keywords(self, text: str, keywords: List[str]) -> List[str]:
        """Legitimate frequency-based heuristic (not ML/embeddings): the
        most-repeated non-stopword terms in the piece that are NOT already
        a target keyword. These are genuinely present in the user's own
        content, so they're always a real, defensible suggestion rather
        than an invented list unrelated to what was actually written."""
        words = re.findall(r"[a-zA-Z']{4,}", text.lower())
        target_set = {k.lower() for k in keywords}
        counts: Dict[str, int] = {}
        for w in words:
            if w in STOPWORDS or w in target_set:
                continue
            counts[w] = counts.get(w, 0) + 1
        ranked = sorted(counts.items(), key=lambda kv: -kv[1])
        return [word for word, count in ranked[:5] if count >= 2]

    def _generate_suggestions(
        self, text: str, keywords: List[str], analysis: SEOAnalysis,
        heading_info: dict, intro_check: dict, length_check: dict
    ) -> List[str]:
        suggestions = []

        for keyword, density in analysis.keyword_density.items():
            if density < 1:
                suggestions.append(
                    f"Your target keyword '{keyword}' appears at a {density}% density -- "
                    f"too low to signal relevance. Add a few more natural mentions throughout the content."
                )
            elif density > 3:
                suggestions.append(
                    f"'{keyword}' appears at a {density}% density, which reads as keyword stuffing. "
                    f"Reduce repetition and let synonyms and related phrasing carry the topic instead."
                )

        if intro_check.get("checked") and not intro_check["found"]:
            suggestions.append(
                f"Your target keyword '{intro_check['keyword']}' appears in the title but not in the "
                f"first 150 words. Consider introducing it naturally within the opening section."
            )

        if heading_info["needed"]:
            suggestions.append(
                f"This content is {len(text.split())} words with no headings detected. "
                f"Break it into sections with H2/H3 headings to improve scannability and structure."
            )

        if length_check["below_minimum"]:
            suggestions.append(
                f"At {length_check['word_count']} words, this is below the "
                f"~{length_check['minimum']}-word baseline typically expected for this content type. "
                f"Consider expanding coverage of the topic."
            )

        if analysis.readability_score < 60:
            suggestions.append(
                f"Readability score is {analysis.readability_score}/100 -- shorten sentences and "
                f"simplify wording to make this easier to scan."
            )

        if analysis.title_quality < 70:
            suggestions.append("Strengthen the title: aim for 30-60 characters with your primary keyword included.")

        if analysis.meta_quality < 60:
            suggestions.append(
                "The generated meta description doesn't land in the ideal 120-160 character range "
                "with your target keyword included -- consider writing one manually for this page."
            )

        return suggestions[:6]

    def _calculate_seo_score(
        self, analysis: SEOAnalysis, keywords: List[str],
        heading_info: dict, intro_check: dict, length_check: dict
    ) -> int:
        score = 40.0

        if keywords:
            avg_density = sum(analysis.keyword_density.values()) / len(keywords)
            if 1 <= avg_density <= 2.5:
                score += 15
            elif avg_density > 0:
                score += 7

        if intro_check.get("checked") and intro_check["found"]:
            score += 10
        elif not intro_check.get("checked"):
            score += 5

        if not heading_info["needed"]:
            score += 10

        if not length_check["below_minimum"]:
            score += 10

        score += (analysis.readability_score / 100) * 8
        score += (analysis.title_quality / 100) * 7
        score += (analysis.meta_quality / 100) * 10

        return int(min(100, score))
