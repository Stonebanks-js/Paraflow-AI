from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class HistoryItem(BaseModel):
    id: UUID
    tool_name: str
    title: Optional[str] = None
    status: str
    credits_used: Optional[int] = 0
    created_at: str
    project_id: Optional[UUID] = None


class HistoryListResponse(BaseModel):
    items: list[HistoryItem]


class HistoryDetail(BaseModel):
    id: UUID
    tool_name: str
    title: Optional[str] = None
    status: str
    input_data: Optional[dict] = None
    output_data: Optional[dict] = None
    error_message: Optional[str] = None
    credits_used: Optional[int] = 0
    created_at: str
    project_id: Optional[UUID] = None
