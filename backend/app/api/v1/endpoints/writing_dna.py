from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.writing_dna import (
    WritingDNAUploadRequest, WritingDNAResponse,
    WritingDNAProfileResponse, WritingDNAAnalysis, WritingDNAStylePrompt
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.writing_dna_service import WritingDNAService
from app.core.config import settings
from uuid import uuid4

router = APIRouter(prefix="/writing-dna", tags=["writing-dna"])


@router.post("/enroll", response_model=WritingDNAResponse)
async def enroll_writing_dna(
    request: WritingDNAUploadRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    demo_mode = settings.DEMO_MODE or not settings.SUPABASE_KEY

    if demo_mode:
        service = WritingDNAService(db)
        analysis = await service._analyze_samples(request.samples)

        return WritingDNAResponse(
            profile_id=str(uuid4()),
            status="completed",
            analysis=WritingDNAAnalysis(
                vocabulary_richness=analysis["vocabulary_richness"],
                formality_score=analysis["formality_score"],
                sentence_length_avg=analysis["sentence_length_avg"],
                tone_score=analysis["tone_score"],
                burstiness_score=analysis["burstiness_score"],
                rhythm_score=analysis["rhythm_score"],
                structure_score=analysis["structure_score"]
            ),
            sample_count=len(request.samples),
            is_active=True
        )

    service = WritingDNAService(db)
    profile = await service.create_profile(current_user["id"], request.samples)

    return WritingDNAResponse(
        profile_id=profile.id,
        status="completed",
        analysis=WritingDNAAnalysis(
            vocabulary_richness=profile.vocabulary_richness,
            formality_score=profile.formality_score,
            sentence_length_avg=profile.sentence_length_avg,
            tone_score=profile.tone_score,
            burstiness_score=profile.burstiness_score,
            rhythm_score=profile.rhythm_score,
            structure_score=profile.structure_score
        ),
        sample_count=profile.sample_count,
        is_active=profile.is_active
    )


@router.get("/profile", response_model=WritingDNAProfileResponse)
async def get_writing_dna_profile(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WritingDNAService(db)
    profile = await service.get_profile(current_user["id"])

    if not profile:
        raise HTTPException(status_code=404, detail="Writing DNA profile not found")

    radar_data = service.get_radar_chart_data(profile)
    style_prompt = service.get_style_prompt(profile)

    maturity = "developing" if profile.sample_count < 5 else "active" if profile.sample_count < 15 else "mature"

    return WritingDNAProfileResponse(
        profile_id=profile.id,
        radar_chart_data=radar_data,
        style_prompt=WritingDNAStylePrompt(
            vocabulary="elevated" if profile.vocabulary_richness > 70 else "simple",
            sentence_length="varied",
            tone="formal" if profile.formality_score > 60 else "casual",
            contractions="use naturally" if profile.formality_score < 60 else "avoid",
            punctuation="standard",
            transitions="use explicitly",
            lists="prefer prose"
        ),
        maturity=maturity
    )


@router.post("/update", response_model=WritingDNAResponse)
async def update_writing_dna(
    request: WritingDNAUploadRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = WritingDNAService(db)
    profile = await service.update_profile(current_user["id"], request.samples)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please enroll first.")

    return WritingDNAResponse(
        profile_id=profile.id,
        status="completed",
        analysis=WritingDNAAnalysis(
            vocabulary_richness=profile.vocabulary_richness,
            formality_score=profile.formality_score,
            sentence_length_avg=profile.sentence_length_avg,
            tone_score=profile.tone_score,
            burstiness_score=profile.burstiness_score,
            rhythm_score=profile.rhythm_score,
            structure_score=profile.structure_score
        ),
        sample_count=profile.sample_count,
        is_active=profile.is_active
    )