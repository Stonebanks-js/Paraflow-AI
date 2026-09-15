from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.agent_studio import (
    AgentStudioRequest, AgentStudioResponse, AgentIteration, AgentMessage
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.agent_studio_service import AgentStudioService
from app.services.billing_service import BillingService
from uuid import uuid4

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/studio", response_model=AgentStudioResponse)
async def run_agent_studio(
    request: AgentStudioRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # This endpoint never charged credits at all -- every other tool goes
    # through _run_tool() in tools.py, which validates balance before
    # calling the engine and deducts only after a genuine success; this
    # one bypassed that path entirely. Mirrors the same check-before,
    # deduct-after-success ordering.
    user_id = str(current_user["id"])
    billing = BillingService()
    cost = billing.get_tool_cost("agent_studio")

    current_balance = await billing.get_balance(user_id)
    if current_balance < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    service = AgentStudioService()

    result = await service.run_session(
        text=request.text,
        target_score=request.target_score,
        max_iterations=request.max_iterations,
        active_agents=request.active_agents
    )

    if result.get("status") in ("success", "completed"):
        deducted = await billing.deduct_credits(user_id, cost, "agent_studio")
        if not deducted:
            import structlog
            structlog.get_logger().warning(
                "agent_studio.deduct_after_success_failed",
                user_id=user_id,
                cost=cost,
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