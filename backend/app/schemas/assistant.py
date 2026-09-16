from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class AssistantMessageOut(BaseModel):
    id: Optional[UUID] = None
    role: str
    content: str
    attachment_name: Optional[str] = None
    suggested_engine: Optional[str] = None
    suggested_engine_url: Optional[str] = None
    created_at: str


class AssistantSessionOut(BaseModel):
    id: UUID
    title: Optional[str] = None
    project_id: Optional[UUID] = None
    created_at: str
    updated_at: str


class AssistantSessionListResponse(BaseModel):
    items: list[AssistantSessionOut]


class AssistantSessionDetail(AssistantSessionOut):
    messages: list[AssistantMessageOut]


class AssistantSessionCreate(BaseModel):
    project_id: Optional[str] = None


class AssistantSendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=8000)
    attachment_text: Optional[str] = Field(default=None, max_length=20000)
    attachment_name: Optional[str] = None


class AssistantSendMessageResponse(BaseModel):
    session_id: UUID
    title: Optional[str] = None
    user_message: AssistantMessageOut
    assistant_message: AssistantMessageOut
