from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class AgentMessage(BaseModel):
    agent: str
    message: str
    timestamp: str


class AgentStudioRequest(BaseModel):
    text: str
    target_score: int = 85
    max_iterations: int = 3
    active_agents: list[str] = ["grammar", "seo", "humanizer", "tone", "fact_checker"]


class AgentIteration(BaseModel):
    iteration: int
    health_score: int
    agents_run: list[str]
    changes_made: int
    messages: list[AgentMessage]


class AgentStudioResponse(BaseModel):
    session_id: UUID
    status: str
    final_text: Optional[str] = None
    initial_score: int
    final_score: int
    iterations: list[AgentIteration]
    improvement: int