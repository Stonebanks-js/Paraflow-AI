from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class ProjectUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    created_at: str
    updated_at: str


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
