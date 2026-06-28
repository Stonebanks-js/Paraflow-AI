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
    def __init__(self):
        super().__init__()

    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        if not self.validate_input(input_text):
            return {"status": "error", "error": "Invalid input"}

        perplexity_score = self._analyze_perplexity(input_text)
        burstiness_score = self._analyze_burstiness(input_text)
        semantic_score = self._analyze_semantic(input_text)

        weights = {"perplexity": 0.35, "burstiness": 0.25, "semantic": 0.40}
        final_score = int(
            perplexity_score * weights["perplexity"]
            + burstiness_score * weights["burstiness"]
            + semantic_score * weights["semantic"]
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
        ai_patterns = [
            "therefore", "furthermore", "moreover", "consequently", "additionally",
            "in conclusion", "it is worth noting", "it should be noted",
            "this suggests", "this indicates", "research shows",
        ]

        pattern_count = sum(1 for pattern in ai_patterns if pattern.lower() in text.lower())
        text_length_factor = max(len(text.split()) / 100, 1)

        semantic_score = min(pattern_count / text_length_factor * 20, 100)

        return max(20, min(95, semantic_score))

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
