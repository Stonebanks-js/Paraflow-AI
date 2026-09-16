from typing import Optional, List
from uuid import UUID
from datetime import datetime
import numpy as np
from app.models.models import WritingDNAProfile
from app.db.supabase import get_supabase, get_supabase_admin
import structlog

logger = structlog.get_logger()


class WritingDNAService:
    """Persists Writing DNA profiles via Supabase (public.writing_dna_profiles).

    Previously this service used a SQLAlchemy AsyncSession from the app's
    abandoned SQLAlchemy/Postgres scaffolding (app.db.database.get_db()),
    which yields None in production — every call here crashed with
    AttributeError. Production uses Supabase directly everywhere else
    (auth, billing); this now matches that, storing the full analysis in
    the `profile_data` JSONB column the migration already defines, so no
    schema change is needed.
    """

    DIMENSIONS = [
        "vocabulary_richness",
        "formality_score",
        "sentence_length_avg",
        "tone_score",
        "burstiness_score",
        "rhythm_score",
        "structure_score"
    ]

    def __init__(self, db=None):
        # `db` accepted for call-site compatibility; unused (see docstring).
        self.supabase = get_supabase()
        self.admin = get_supabase_admin()

    async def create_profile(self, user_id: UUID, samples: List[str]) -> WritingDNAProfile:
        analysis = await self._analyze_samples(samples)
        return await self._upsert_profile(user_id, analysis, sample_count=len(samples))

    async def get_profile(self, user_id: UUID) -> Optional[WritingDNAProfile]:
        # Service-role read: RLS is `auth.uid() = user_id`, and this
        # backend's anon client never binds a per-request Postgres session
        # to the caller's JWT, so an anon-client SELECT here silently
        # returns empty even when the row exists. See the same note in
        # auth.py's get_current_user().
        response = self.admin.table("writing_dna_profiles").select("*").eq("user_id", str(user_id)).execute()
        if not response.data:
            return None
        return self._row_to_profile(response.data[0])

    async def update_profile(self, user_id: UUID, samples: List[str]) -> Optional[WritingDNAProfile]:
        existing = await self.get_profile(user_id)
        if not existing:
            return None

        analysis = await self._analyze_samples(samples, existing_profile=existing)
        new_sample_count = existing.sample_count + len(samples)
        return await self._upsert_profile(user_id, analysis, sample_count=new_sample_count)

    async def _upsert_profile(self, user_id: UUID, analysis: dict, sample_count: int) -> WritingDNAProfile:
        embedding = await self._generate_embedding(analysis)
        profile_data = {
            **analysis,
            "sample_count": sample_count,
            "is_active": True,
            "style_embedding": embedding,
        }
        row = {
            "user_id": str(user_id),
            "profile_data": profile_data,
            "dominant_style": "formal" if analysis["formality_score"] >= 50 else "casual",
            "vocabulary_score": round(analysis["vocabulary_richness"]),
            "sentence_variation_score": round(analysis["burstiness_score"]),
            "readability_score": round(analysis["rhythm_score"]),
        }
        response = self.admin.table("writing_dna_profiles").upsert(row, on_conflict="user_id").execute()
        if not response.data:
            raise RuntimeError("Failed to persist Writing DNA profile")
        return self._row_to_profile(response.data[0])

    def _row_to_profile(self, row: dict) -> WritingDNAProfile:
        data = row.get("profile_data") or {}
        return WritingDNAProfile(
            id=row["id"],
            user_id=row["user_id"],
            style_embedding=data.get("style_embedding"),
            vocabulary_richness=data.get("vocabulary_richness", 0.0),
            formality_score=data.get("formality_score", 0.0),
            sentence_length_avg=data.get("sentence_length_avg", 0.0),
            tone_score=data.get("tone_score", 0.0),
            burstiness_score=data.get("burstiness_score", 0.0),
            rhythm_score=data.get("rhythm_score", 0.0),
            structure_score=data.get("structure_score", 0.0),
            sample_count=data.get("sample_count", 0),
            is_active=data.get("is_active", True),
            created_at=row.get("created_at") or datetime.utcnow().isoformat(),
            updated_at=row.get("updated_at") or datetime.utcnow().isoformat(),
        )

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

    async def get_style_context(self, user_id: UUID) -> Optional[str]:
        """The cross-engine personalization entry point: fetch this user's
        Writing DNA profile (if any) and return a ready-to-use style prompt
        string, or None if they haven't built one yet.

        This is the piece that was missing end-to-end: get_style_prompt()
        already existed and was already wired into paraphrase_engine.py
        and humanize_engine.py's prompt builders (both accept a
        `writing_dna` option and fold it into the system prompt), but
        nothing ever called this to actually fetch a user's profile and
        pass it through -- so Writing DNA never influenced any other
        engine despite being built for exactly that. Callers should treat
        a None return (no profile yet, or a transient read failure) as
        "no style preference," never as an error -- personalization is an
        enhancement, not a requirement for the engine to run.
        """
        try:
            profile = await self.get_profile(user_id)
        except Exception as e:
            logger.warning("writing_dna.style_context_fetch_failed", user_id=str(user_id), error=str(e))
            return None
        if not profile:
            return None
        return self.get_style_prompt(profile)

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