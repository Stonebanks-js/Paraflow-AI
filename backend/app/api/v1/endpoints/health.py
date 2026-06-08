from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.health_score import HealthScoreResponse, ContentEvolutionResponse, EvolutionStage
from app.api.v1.endpoints.auth import get_current_user
from app.services.health_score_service import HealthScoreService
from uuid import UUID

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/score")
async def get_health_score(
    text: str = None,
    current_user = Depends(get_current_user)
):
    service = HealthScoreService()

    score = service.calculate_score(
        grammar_score=85,
        readability_score=78,
        plagiarism_score=92,
        ai_detection_score=28,
        seo_score=65,
        tone_score=80
    )

    return HealthScoreResponse(
        score=score["score"],
        status=score["status"],
        dimensions=score["dimensions"],
        recommendations=score["recommendations"]
    )


@router.get("/evolution/{job_id}", response_model=ContentEvolutionResponse)
async def get_content_evolution(
    job_id: UUID,
    current_user = Depends(get_current_user)
):
    stages = [
        EvolutionStage(
            stage=1,
            name="Original Input",
            health_score=42,
            changes_summary="Initial document loaded",
            diff=None
        ),
        EvolutionStage(
            stage=2,
            name="Paraphrased",
            health_score=61,
            changes_summary="+42 rephrases, +8 grammar points",
            diff=None
        ),
        EvolutionStage(
            stage=3,
            name="Humanized",
            health_score=74,
            changes_summary="-18 AI signals, +2 tone points",
            diff=None
        ),
        EvolutionStage(
            stage=4,
            name="Grammar Enhanced",
            health_score=83,
            changes_summary="-6 errors, +9 SEO points",
            diff=None
        )
    ]

    return ContentEvolutionResponse(
        job_id=job_id,
        stages=stages
    )