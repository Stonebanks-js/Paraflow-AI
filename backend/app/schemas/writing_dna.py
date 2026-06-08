from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime


class WritingDNAAnalysis(BaseModel):
    vocabulary_richness: float
    formality_score: float
    sentence_length_avg: float
    tone_score: float
    burstiness_score: float
    rhythm_score: float
    structure_score: float


class WritingDNAUploadRequest(BaseModel):
    samples: list[str] = Field(..., min_length=1, max_length=10)


class WritingDNAResponse(BaseModel):
    profile_id: UUID
    status: str
    analysis: WritingDNAAnalysis
    sample_count: int
    is_active: bool


class WritingDNAStylePrompt(BaseModel):
    vocabulary: str
    sentence_length: str
    tone: str
    contractions: str
    punctuation: str
    transitions: str
    lists: str


class WritingDNAProfileResponse(BaseModel):
    profile_id: UUID
    radar_chart_data: dict
    style_prompt: WritingDNAStylePrompt
    maturity: Literal["developing", "active", "mature"]