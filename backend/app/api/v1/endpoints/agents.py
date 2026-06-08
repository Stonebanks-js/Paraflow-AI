from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.agent_studio import (
    AgentStudioRequest, AgentStudioResponse, AgentIteration, AgentMessage
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.agent_studio_service import AgentStudioService
from uuid import uuid4

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/studio", response_model=AgentStudioResponse)
async def run_agent_studio(
    request: AgentStudioRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AgentStudioService()

    result = await service.run_session(
        text=request.text,
        target_score=request.target_score,
        max_iterations=request.max_iterations,
        active_agents=request.active_agents
    )

    iterations = []
    for iter_data in result.get("iterations", []):
        iterations.append(AgentIteration(
            iteration=iter_data["iteration"],
            health_score=iter_data["health_score"],
            agents_run=iter_data["agents_run"],
            changes_made=iter_data["changes_made"],
            messages=[
                AgentMessage(**msg) for msg in iter_data.get("messages", [])
            ]
        ))

    return AgentStudioResponse(
        session_id=uuid4(),
        status=result["status"],
        final_text=result["final_text"],
        initial_score=result["initial_score"],
        final_score=result["final_score"],
        iterations=iterations,
        improvement=result["improvement"]
    )