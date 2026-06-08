from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class HealthScoreResponse(BaseModel):
    score: int
    status: str
    dimensions: dict[str, int]
    recommendations: list[str]


class EvolutionStage(BaseModel):
    stage: int
    name: str
    health_score: int
    changes_summary: str
    diff: Optional[dict] = None


class ContentEvolutionResponse(BaseModel):
    job_id: UUID
    stages: list[EvolutionStage]