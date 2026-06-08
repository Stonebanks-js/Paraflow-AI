from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger()


class HealthScoreService:
    DIMENSIONS = {
        "grammar": 0.25,
        "readability": 0.20,
        "originality": 0.20,
        "human_likeness": 0.20,
        "seo": 0.10,
        "tone": 0.05
    }

    def __init__(self):
        pass

    def calculate_score(
        self,
        grammar_score: float = 100,
        readability_score: float = 100,
        plagiarism_score: float = 100,
        ai_detection_score: float = 100,
        seo_score: float = 100,
        tone_score: float = 100
    ) -> Dict:
        originality_score = plagiarism_score

        human_likeness_score = 100 - ai_detection_score

        weighted_score = (
            grammar_score * self.DIMENSIONS["grammar"] +
            readability_score * self.DIMENSIONS["readability"] +
            originality_score * self.DIMENSIONS["originality"] +
            human_likeness_score * self.DIMENSIONS["human_likeness"] +
            seo_score * self.DIMENSIONS["seo"] +
            tone_score * self.DIMENSIONS["tone"]
        )

        if plagiarism_score < 60:
            weighted_score = min(weighted_score, 40)
        if ai_detection_score > 80:
            weighted_score = min(weighted_score, 55)

        return {
            "score": int(weighted_score),
            "dimensions": {
                "grammar": int(grammar_score),
                "readability": int(readability_score),
                "originality": int(originality_score),
                "human_likeness": int(human_likeness_score),
                "seo": int(seo_score),
                "tone": int(tone_score)
            },
            "status": self._get_status(int(weighted_score)),
            "recommendations": self._get_recommendations(
                grammar_score, readability_score, plagiarism_score,
                ai_detection_score, seo_score, tone_score
            )
        }

    def _get_status(self, score: int) -> str:
        if score >= 90:
            return "excellent"
        elif score >= 75:
            return "good"
        elif score >= 60:
            return "fair"
        elif score >= 40:
            return "poor"
        else:
            return "critical"

    def _get_recommendations(
        self,
        grammar: float,
        readability: float,
        plagiarism: float,
        ai_detection: float,
        seo: float,
        tone: float
    ) -> List[str]:
        recommendations = []

        if grammar < 80:
            recommendations.append("Run Grammar Checker to fix errors")
        if readability < 75:
            recommendations.append("Simplify sentence structure for better readability")
        if plagiarism > 20:
            recommendations.append("Rewrite flagged sections to improve originality")
        if ai_detection > 30:
            recommendations.append("Run Humanizer to reduce AI detection signals")
        if seo < 70:
            recommendations.append("Add target keywords and improve SEO structure")
        if tone < 75:
            recommendations.append("Maintain consistent tone throughout")

        return recommendations[:3]

    def get_score_interpretation(self, score: int) -> Dict:
        interpretations = {
            (90, 100): {
                "status": "excellent",
                "label": "Ready to publish",
                "color": "green",
                "action": "Content is publication-ready"
            },
            (75, 89): {
                "status": "good",
                "label": "Minor refinements needed",
                "color": "yellow",
                "action": "Address flagged dimensions before publishing"
            },
            (60, 74): {
                "status": "fair",
                "label": "Significant improvements needed",
                "color": "orange",
                "action": "Work on flagged dimensions"
            },
            (40, 59): {
                "status": "poor",
                "label": "Major revision needed",
                "color": "red",
                "action": "Content requires substantial improvement"
            },
            (0, 39): {
                "status": "critical",
                "label": "Critical issues detected",
                "color": "darkred",
                "action": "Likely plagiarism or high AI detection"
            }
        }

        for (low, high), interpretation in interpretations.items():
            if low <= score <= high:
                return interpretation

        return {"status": "unknown", "label": "Unknown", "color": "gray", "action": ""}