from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.supabase import get_supabase
from app.schemas.auth import UserResponse
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
import structlog

router = APIRouter(prefix="/users", tags=["users"])
logger = structlog.get_logger()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    if isinstance(current_user, dict) and "id" in current_user and not isinstance(current_user.get("email"), str):
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            return UserResponse(
                id=current_user["id"],
                email=current_user.get("email", ""),
                full_name=current_user.get("full_name"),
                role=current_user.get("role", "free"),
                onboarding_done=current_user.get("onboarding_done", False),
                created_at=current_user.get("created_at", "2024-01-01T00:00:00Z")
            )

        supabase = get_supabase()
        user_data = supabase.table("users").select("*").eq("id", current_user["id"]).execute()
        if user_data.data:
            user = user_data.data[0]
            return UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user.get("full_name"),
                role=user.get("role", "free"),
                onboarding_done=user.get("onboarding_done", False),
                created_at=user["created_at"]
            )

    return UserResponse(
        id=current_user["id"],
        email=current_user.get("email", ""),
        full_name=current_user.get("full_name"),
        role=current_user.get("role", "free"),
        onboarding_done=current_user.get("onboarding_done", False),
        created_at=current_user.get("created_at", datetime.utcnow().isoformat())
    )


@router.patch("/me")
async def update_current_user(
    full_name: str = None,
    onboarding_done: bool = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return {"status": "success", "message": "Profile updated (Supabase not configured)"}

    try:
        supabase = get_supabase()
        user_id = current_user["id"] if isinstance(current_user, dict) else current_user.get("id")

        updates = {}
        if full_name is not None:
            updates["full_name"] = full_name
        if onboarding_done is not None:
            updates["onboarding_done"] = onboarding_done

        if updates:
            supabase.table("users").update(updates).eq("id", user_id).execute()

        return {"status": "success", "message": "Profile updated"}
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.get("/credits")
async def get_user_credits(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return {"balance": 100, "tier": "free"}

    try:
        supabase = get_supabase()
        user_id = current_user["id"] if isinstance(current_user, dict) else current_user.get("id")

        credits_data = supabase.table("credits").select("*").eq("user_id", user_id).execute()
        if credits_data.data:
            return {"balance": credits_data.data[0].get("amount", 100), "tier": current_user.get("role", "free")}
        return {"balance": 100, "tier": current_user.get("role", "free")}
    except:
        return {"balance": 100, "tier": current_user.get("role", "free")}


from datetime import datetime