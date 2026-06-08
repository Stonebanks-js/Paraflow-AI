import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import enum


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ToolType(str, enum.Enum):
    PARAPHRASER = "paraphraser"
    HUMANIZER = "humanizer"
    DETECTOR = "detector"
    GRAMMAR = "grammar"
    SUMMARIZER = "summarizer"
    TRANSLATOR = "translator"
    PLAGIARISM = "plagiarism"
    SEO = "seo"
    TRANSFORM = "transform"
    AGENT_STUDIO = "agent_studio"


class ToolJob(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tool_type: str
    mode: Optional[str] = None
    status: str = JobStatus.QUEUED.value
    input_text: str
    output_text: Optional[str] = None
    input_word_count: int = 0
    output_word_count: Optional[int] = None
    model_used: Optional[str] = None
    latency_ms: Optional[int] = None
    extra_data: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WritingDNAProfile(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    style_embedding: Optional[list[float]] = None
    vocabulary_richness: float = 0.0
    formality_score: float = 0.0
    sentence_length_avg: float = 0.0
    tone_score: float = 0.0
    burstiness_score: float = 0.0
    rhythm_score: float = 0.0
    structure_score: float = 0.0
    sample_count: int = 0
    is_active: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class User(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str] = None
    role: str = "free"
    onboarding_done: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Subscription(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tier: str = SubscriptionTier.FREE.value
    status: str = "active"
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Document(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: Optional[str] = None
    content: str
    word_count: int = 0
    tool_origin: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Credit(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    balance: int = 100
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreditTransaction(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    amount: int
    type: str
    tool: Optional[str] = None
    balance_after: int
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UsageHistory(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    date: datetime
    tool_type: str
    job_count: int = 0
    word_count: int = 0
    credits_used: int = 0

    class Config:
        from_attributes = True


class APIKey(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    key_hash: str
    name: str
    scopes: list[str] = []
    rate_limit: int = 60
    last_used_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True