from typing import Optional, List
from uuid import UUID
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import WritingDNAProfile
from app.ai.engines.claude_engine import ClaudeEngine
import structlog

logger = structlog.get_logger()


class WritingDNAService:
    DIMENSIONS = [
        "vocabulary_richness",
        "formality_score",
        "sentence_length_avg",
        "tone_score",
        "burstiness_score",
        "rhythm_score",
        "structure_score"
    ]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_profile(self, user_id: UUID, samples: List[str]) -> WritingDNAProfile:
        analysis = await self._analyze_samples(samples)

        embedding = await self._generate_embedding(analysis)

        profile = WritingDNAProfile(
            user_id=user_id,
            style_embedding=embedding,
            vocabulary_richness=analysis["vocabulary_richness"],
            formality_score=analysis["formality_score"],
            sentence_length_avg=analysis["sentence_length_avg"],
            tone_score=analysis["tone_score"],
            burstiness_score=analysis["burstiness_score"],
            rhythm_score=analysis["rhythm_score"],
            structure_score=analysis["structure_score"],
            sample_count=len(samples),
            is_active=True
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_profile(self, user_id: UUID) -> Optional[WritingDNAProfile]:
        result = await self.db.execute(
            select(WritingDNAProfile).where(WritingDNAProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_profile(self, user_id: UUID, samples: List[str]) -> Optional[WritingDNAProfile]:
        profile = await self.get_profile(user_id)
        if not profile:
            return None

        analysis = await self._analyze_samples(samples, existing_profile=profile)
        embedding = await self._generate_embedding(analysis)

        profile.style_embedding = embedding
        profile.vocabulary_richness = analysis["vocabulary_richness"]
        profile.formality_score = analysis["formality_score"]
        profile.sentence_length_avg = analysis["sentence_length_avg"]
        profile.tone_score = analysis["tone_score"]
        profile.burstiness_score = analysis["burstiness_score"]
        profile.rhythm_score = analysis["rhythm_score"]
        profile.structure_score = analysis["structure_score"]
        profile.sample_count = profile.sample_count + len(samples)

        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def _analyze_samples(
        self,
        samples: List[str],
        existing_profile: Optional[WritingDNAProfile] = None
    ) -> dict:
        combined_text = " ".join(samples)
        words = combined_text.split()
        sentences = [s for s in combined_text.replace("!", ".").replace("?", ".").split(".") if s.strip()]

        vocabulary_richness = self._calculate_ttr(samples)
        formality_score = self._calculate_formality(combined_text)
        sentence_length_avg = len(words) / max(len(sentences), 1)
        tone_score = self._calculate_tone(combined_text)
        burstiness_score = self._calculate_burstiness(sentences)
        rhythm_score = self._calculate_rhythm(sentences)
        structure_score = self._calculate_structure(samples)

        return {
            "vocabulary_richness": vocabulary_richness,
            "formality_score": formality_score,
            "sentence_length_avg": sentence_length_avg,
            "tone_score": tone_score,
            "burstiness_score": burstiness_score,
            "rhythm_score": rhythm_score,
            "structure_score": structure_score
        }

    def _calculate_ttr(self, samples: List[str]) -> float:
        all_words = " ".join(samples).split()
        if not all_words:
            return 0.0
        unique_words = set(all_words)
        return len(unique_words) / len(all_words) * 100

    def _calculate_formality(self, text: str) -> float:
        formal_indicators = ["however", "therefore", "furthermore", "moreover", "consequently"]
        informal_indicators = ["don't", "can't", "won't", "yeah", "gonna", "wanna"]

        text_lower = text.lower()
        formal_count = sum(1 for w in formal_indicators if w in text_lower)
        informal_count = sum(1 for w in informal_indicators if w in text_lower)

        formality = 50 + (formal_count - informal_count) * 10
        return max(0, min(100, formality))

    def _calculate_tone(self, text: str) -> float:
        hedging_words = ["perhaps", "might", "may", "possibly", "suggest"]
        text_lower = text.lower()

        hedging_count = sum(1 for w in hedging_words if w in text_lower)
        words = text.split()
        hedging_ratio = hedging_count / max(len(words), 1)

        return max(0, min(100, 50 + (hedging_ratio * 500)))

    def _calculate_burstiness(self, sentences: List[str]) -> float:
        if len(sentences) < 2:
            return 50.0

        lengths = [len(s.split()) for s in sentences]
        avg = sum(lengths) / len(lengths)
        if avg < 1:
            return 50.0

        variance = sum((l - avg) ** 2 for l in lengths) / len(lengths)
        burstiness = (variance ** 0.5) / avg

        return max(0, min(100, burstiness * 50))

    def _calculate_rhythm(self, sentences: List[str]) -> float:
        if not sentences:
            return 50.0

        lengths = [len(s.split()) for s in sentences]
        variance = sum((l - sum(lengths) / len(lengths)) ** 2 for l in lengths) / max(len(lengths), 1)
        normalized_variance = variance / 100

        return max(0, min(100, 100 - normalized_variance))

    def _calculate_structure(self, samples: List[str]) -> float:
        paragraph_indicators = samples if len(samples) > 1 else [samples[0]] if samples else []
        has_structure = len(paragraph_indicators) > 1

        transition_words = ["however", "therefore", "furthermore", "additionally", "consequently"]
        text = " ".join(samples)
        text_lower = text.lower()

        transition_count = sum(1 for w in transition_words if w in text_lower)

        structure_score = 50 + (transition_count * 5)
        if has_structure:
            structure_score += 20

        return max(0, min(100, structure_score))

    async def _generate_embedding(self, analysis: dict) -> List[float]:
        profile_text = self._analysis_to_text(analysis)

        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            embedding = model.encode(profile_text).tolist()
            return embedding
        except Exception as e:
            logger.warning(f"Embedding generation failed, using placeholder: {e}")
            return [0.0] * 384

    def _analysis_to_text(self, analysis: dict) -> str:
        return f"""
        Writing style profile:
        - Vocabulary richness: {analysis['vocabulary_richness']:.1f}/100
        - Formality: {analysis['formality_score']:.1f}/100
        - Avg sentence length: {analysis['sentence_length_avg']:.1f} words
        - Tone: {analysis['tone_score']:.1f}/100
        - Burstiness: {analysis['burstiness_score']:.1f}/100
        - Rhythm: {analysis['rhythm_score']:.1f}/100
        - Structure: {analysis['structure_score']:.1f}/100
        """

    def get_style_prompt(self, profile: WritingDNAProfile) -> str:
        prompts = []

        if profile.vocabulary_richness > 70:
            prompts.append("- Vocabulary: elevated, sophisticated word choices")
        elif profile.vocabulary_richness < 40:
            prompts.append("- Vocabulary: simple, accessible word choices")

        if profile.formality_score > 70:
            prompts.append("- Tone: formal, professional")
        elif profile.formality_score < 40:
            prompts.append("- Tone: casual, conversational")

        prompts.append(f"- Sentence length: varied, mix of short and long sentences")
        prompts.append(f"- Burstiness: {'high' if profile.burstiness_score > 60 else 'low' if profile.burstiness_score < 40 else 'moderate'}")

        if profile.formality_score < 50:
            prompts.append("- Contractions: use them naturally")

        return "\n".join(prompts) if prompts else "- Write in a clear, natural style"

    def get_radar_chart_data(self, profile: WritingDNAProfile) -> dict:
        return {
            "vocabulary": profile.vocabulary_richness,
            "formality": profile.formality_score,
            "sentence_length": profile.sentence_length_avg / 30 * 100,
            "tone": profile.tone_score,
            "burstiness": profile.burstiness_score,
            "rhythm": profile.rhythm_score,
            "structure": profile.structure_score
        }