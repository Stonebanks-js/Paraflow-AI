from typing import Optional, List
from .base import BaseAIEngine
import structlog

logger = structlog.get_logger()


class DetectionResult:
    def __init__(self, score: int, verdict: str, confidence: float, spans: List[dict]):
        self.score = score
        self.verdict = verdict
        self.confidence = confidence
        self.highlighted_spans = spans


class DetectEngine(BaseAIEngine):
    """Heuristic AI-likelihood estimator -- NOT a trained ML classifier.

    Combines three proxy signals into a weighted score: sentence-length
    uniformity ("perplexity", 35%), sentence-length variance
    ("burstiness", 25%), and known AI-writing phrase matches
    ("semantic", 40%). This is a legitimate, explainable heuristic, but
    it has real, tested limits: live testing against a deliberately
    AI-tell-loaded paragraph vs. genuinely human casual and technical
    writing showed only a ~15-point spread (44-45 human vs 60 AI-styled),
    both landing in the "mixed" band -- i.e. on realistic-length text
    this signal alone is a soft indicator, not a reliable classifier.
    No commercial AI detector (this one included) can certify authorship
    with scientific certainty; the API and UI must not imply otherwise.
    """

    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        perplexity_score = self._analyze_perplexity(input_text)
        burstiness_score = self._analyze_burstiness(input_text)
        semantic_score = self._analyze_semantic(input_text)
        lexical_score = self._analyze_lexical_diversity(input_text)

        weights = {"perplexity": 0.30, "burstiness": 0.20, "semantic": 0.35, "lexical": 0.15}
        final_score = int(
            perplexity_score * weights["perplexity"]
            + burstiness_score * weights["burstiness"]
            + semantic_score * weights["semantic"]
            + lexical_score * weights["lexical"]
        )
        final_score = max(0, min(100, final_score))

        if final_score < 30:
            verdict = "human"
        elif final_score > 70:
            verdict = "ai"
        else:
            verdict = "mixed"

        confidence = 0.85 if abs(final_score - 50) > 20 else 0.65

        spans = self._find_ai_spans(input_text, final_score)

        return {
            "status": "success",
            "result": {
                "score": final_score,
                "verdict": verdict,
                "confidence": confidence,
                "highlighted_spans": spans,
                "classifier_breakdown": {
                    "perplexity": perplexity_score,
                    "burstiness": burstiness_score,
                    "semantic": semantic_score,
                    "lexical_diversity": lexical_score,
                },
            },
        }

    def _analyze_perplexity(self, text: str) -> float:
        words = text.split()
        if len(words) < 10:
            return 50.0

        sentence_lengths = [
            len(s.split())
            for s in text.replace("!", ".").replace("?", ".").split(".")
            if s.strip()
        ]
        if not sentence_lengths:
            return 50.0

        avg_length = sum(sentence_lengths) / len(sentence_lengths)
        variance = sum((l - avg_length) ** 2 for l in sentence_lengths) / len(sentence_lengths)
        uniformity_score = min(variance / (avg_length ** 2 + 1), 100)

        return max(20, min(90, 100 - uniformity_score))

    def _analyze_burstiness(self, text: str) -> float:
        sentences = [
            s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")
            if s.strip()
        ]
        if len(sentences) < 3:
            return 50.0

        lengths = [len(s.split()) for s in sentences]
        avg = sum(lengths) / len(lengths)

        if avg < 1:
            return 50.0

        variance = sum((l - avg) ** 2 for l in lengths) / len(lengths)
        burstiness = (variance ** 0.5) / avg if avg > 0 else 0

        normalized_burstiness = min(burstiness / 2 * 100, 100)
        return max(20, min(90, normalized_burstiness))

    def _analyze_semantic(self, text: str) -> float:
        # Tested live against genuinely contrasting samples (casual human,
        # AI-style formal, technical human): the original 11-phrase list
        # under-detected a paragraph deliberately loaded with classic AI
        # tells (scored 60/100 "mixed" instead of clearly flagging it),
        # while a floor of 20 pulled clean human text upward regardless of
        # whether it matched anything -- both weakened real discrimination.
        # This is still a heuristic phrase-match signal, not a trained
        # classifier (see class docstring / Phase 20 report for that
        # limitation) -- but a materially larger, evidence-based list of
        # documented AI-writing tells is a legitimate, low-risk
        # improvement to the same approach, and removing the artificial
        # floor lets genuinely clean text score near zero on this signal
        # instead of always registering as "somewhat AI-like."
        ai_patterns = [
            "therefore", "furthermore", "moreover", "consequently", "additionally",
            "in conclusion", "it is worth noting", "it should be noted",
            "this suggests", "this indicates", "research shows",
            "in today's world", "in today's fast-paced", "it is important to note",
            "it is crucial to", "it is essential to", "plays a vital role",
            "plays a crucial role", "delve into", "delving into", "a testament to",
            "in the realm of", "navigate the complexities", "navigating the",
            "unlock the potential", "unlocking the potential", "seamless integration",
            "in summary", "to summarize", "overall, it can be concluded",
            "on the other hand", "in this article, we will", "in this post, we will",
            "let's dive in", "the importance of", "cannot be overstated",
            "in the ever-evolving", "in an increasingly", "landscape of",
            "fosters a sense of", "underscores the", "serves as a", "stands as a",
            "boasts", "leverage", "leveraging", "utilize", "utilizing",
            "robust", "myriad of", "plethora of", "multifaceted", "holistic approach",
            "at the end of the day", "it goes without saying", "needless to say",
            "when it comes to", "in order to", "as a result",
        ]

        pattern_count = sum(1 for pattern in ai_patterns if pattern.lower() in text.lower())
        text_length_factor = max(len(text.split()) / 100, 1)

        semantic_score = min(pattern_count / text_length_factor * 18, 100)

        return max(0, min(95, semantic_score))

    def _analyze_lexical_diversity(self, text: str) -> float:
        """A real, established stylometric measure (not a phrase-matching
        heuristic like _analyze_semantic): Root TTR / Guiraud's Index --
        R = unique_words / sqrt(total_words) -- a standard length-
        corrected lexical-diversity metric from computational linguistics
        (plain type-token ratio is unusable here since it mechanically
        drops as text gets longer regardless of authorship; the sqrt
        correction is the well-known fix for that). Combined with a
        genuine, well-documented AI-writing tell: repeated sentence
        openers (starting consecutive sentences with the same word,
        e.g. "The... The... The...", or leaning heavily on a small set
        of transitional openers across the piece).

        Lower diversity / more repeated openers -> higher AI-likelihood
        contribution. This is still a proxy signal, not proof -- some
        human writers are naturally repetitive and some AI output is
        genuinely varied -- which is why it's one of four signals with a
        modest weight, not a standalone verdict.
        """
        words = [w.strip(".,!?;:\"'()").lower() for w in text.split() if w.strip(".,!?;:\"'()")]
        if len(words) < 15:
            return 50.0

        unique_words = len(set(words))
        root_ttr = unique_words / (len(words) ** 0.5)
        # Typical Root TTR for natural English prose lands roughly 4-9;
        # notably low values correlate with repetitive/formulaic word
        # choice. Map onto a 0-100 AI-likelihood contribution (low
        # diversity = higher score), clamped to a sane range.
        diversity_component = max(0, min(100, (7.5 - root_ttr) * 18 + 40))

        sentences = [
            s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")
            if s.strip()
        ]
        openers = [s.split()[0].lower() for s in sentences if s.split()]
        repeat_component = 0.0
        if len(openers) >= 3:
            most_common_count = max((openers.count(o) for o in set(openers)), default=0)
            repeat_ratio = most_common_count / len(openers)
            if repeat_ratio > 0.4:
                repeat_component = min(100, (repeat_ratio - 0.4) * 150)

        combined = diversity_component * 0.7 + repeat_component * 0.3
        return max(0, min(100, combined))

    def _find_ai_spans(self, text: str, overall_score: int) -> List[dict]:
        if overall_score < 50:
            return []
        sentences = [
            s.strip() for s in text.replace("!", ".").replace("?", ".").split(".")
            if s.strip()
        ]
        spans = []
        position = 0
        for sentence in sentences:
            sentence_words = sentence.split()
            if len(sentence_words) < 5:
                position += len(sentence) + 1
                continue
            sentence_score = min(overall_score + 10, 100)
            if sentence_score > 60:
                spans.append({
                    "start": position,
                    "end": position + len(sentence),
                    "probability": sentence_score,
                    "text": sentence[:50] + "..." if len(sentence) > 50 else sentence,
                })
            position += len(sentence) + 1
        return spans[:5]
