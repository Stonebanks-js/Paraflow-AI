from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime


class ParaphraseRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    mode: Literal["standard", "fluency", "formal", "academic", "creative", "simple", "expand", "shorten"] = "standard"
    strength: int = Field(default=50, ge=0, le=100)


class ParaphraseResponse(BaseModel):
    job_id: UUID
    status: str
    output: Optional[str] = None
    health_score: Optional[int] = None
    word_count_diff: Optional[int] = None


class HumanizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    target_pass_rate: float = Field(default=0.85, ge=0, le=1)


class HumanizeResponse(BaseModel):
    job_id: UUID
    status: str
    output: Optional[str] = None
    detection_scores: Optional[dict] = None


class DetectRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class DetectionResult(BaseModel):
    score: int
    verdict: Literal["human", "ai", "mixed"]
    confidence: float
    highlighted_spans: list[dict]


class DetectResponse(BaseModel):
    job_id: UUID
    status: str
    result: Optional[DetectionResult] = None


class GrammarRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    language: Optional[str] = "en"


class GrammarIssue(BaseModel):
    type: str
    message: str
    position: int
    length: int
    severity: Literal["error", "warning", "info"]
    suggestions: list[str]


class GrammarResponse(BaseModel):
    job_id: UUID
    status: str
    corrected_text: Optional[str] = None
    issues: list[GrammarIssue] = []


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    style: Literal["concise", "detailed", "bullet_points", "executive"] = "concise"
    max_length: Optional[int] = 200


class SummarizeResponse(BaseModel):
    job_id: UUID
    status: str
    summary: Optional[str] = None
    key_points: list[str] = []


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    source_lang: str = "en"
    target_lang: str
    preserve_tone: bool = True


class TranslateResponse(BaseModel):
    job_id: UUID
    status: str
    translated_text: Optional[str] = None
    confidence: Optional[float] = None


class PlagiarismRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class PlagiarismMatch(BaseModel):
    source: str
    url: Optional[str]
    similarity: float
    matched_text: str


class PlagiarismResponse(BaseModel):
    job_id: UUID
    status: str
    similarity_score: Optional[float] = None
    matches: list[PlagiarismMatch] = []


class SEORequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    target_keywords: list[str]
    content_type: Optional[str] = "blog"


class SEOAnalysis(BaseModel):
    keyword_density: dict[str, float]
    readability_score: float
    title_quality: float
    meta_quality: Optional[float] = None
    suggestions: list[str]


class SEOResponse(BaseModel):
    job_id: UUID
    status: str
    analysis: Optional[SEOAnalysis] = None
    health_score: Optional[int] = None


class TransformRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)
    source_format: str
    target_format: str


class TransformResponse(BaseModel):
    job_id: UUID
    status: str
    transformed_text: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: UUID
    status: Literal["queued", "processing", "completed", "failed"]
    result: Optional[dict] = None
    error: Optional[str] = None