from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.database import get_db
from app.db.supabase import get_supabase
from app.schemas.auth import (
    UserCreate, UserResponse, TokenResponse, LoginRequest, RefreshTokenRequest, SignUpResponse
)
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_token, hash_password
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import timedelta, datetime
import structlog

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()
logger = structlog.get_logger()


def get_user_from_token(token: str) -> Optional[dict]:
    try:
        payload = verify_token(token)
        if payload:
            return {"sub": payload.get("sub"), "email": payload.get("email")}
        return None
    except:
        return None


@router.post("/register", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured. Please set SUPABASE_URL and SUPABASE_KEY."
        )

    try:
        supabase = get_supabase()

        existing_user = supabase.table("users").select("*").eq("email", user_data.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name or ""
                }
            }
        })

        if auth_response.user:
            user_response = supabase.table("users").upsert({
                "id": auth_response.user.id,
                "email": user_data.email,
                "full_name": user_data.full_name,
                "role": "free",
                "onboarding_done": False
            }, on_conflict="id").execute()

            # Create 100 credits for new user
            try:
                from app.services.billing_service import BillingService
                billing = BillingService()
                await billing._get_or_create_credits_row(auth_response.user.id, initial_amount=100)
            except Exception as credit_err:
                logger.warning(f"Could not create credits for new user: {credit_err}")

            return SignUpResponse(
                id=auth_response.user.id,
                email=auth_response.user.email,
                created_at=datetime.utcnow(),
                message="Account created successfully. Please check your email to verify your account."
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed"
        )

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured. Please set SUPABASE_URL and SUPABASE_KEY."
        )

    try:
        supabase = get_supabase()

        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        if auth_response.user:
            access_token = create_access_token({"sub": auth_response.user.id, "email": auth_response.user.email})
            refresh_token = create_refresh_token({"sub": auth_response.user.id})

            user_data = supabase.table("users").select("*").eq("id", auth_response.user.id).execute()
            user = user_data.data[0] if user_data.data else None

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user=UserResponse(
                    id=user["id"],
                    email=user["email"],
                    full_name=user.get("full_name"),
                    role=user.get("role", "free"),
                    onboarding_done=user.get("onboarding_done", False),
                    created_at=datetime.fromisoformat(user["created_at"].replace("Z", "+00:00")) if isinstance(user.get("created_at"), str) else datetime.utcnow()
                ) if user else None
            )

        raise HTTPException(status_code=401, detail="Login failed")

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshTokenRequest):
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured"
        )

    try:
        supabase = get_supabase()

        auth_response = supabase.auth.refresh_session({
            "refresh_token": request.refresh_token
        })

        if auth_response.user and auth_response.session:
            access_token = create_access_token({"sub": auth_response.user.id, "email": auth_response.user.email})
            refresh_token = auth_response.session.refresh_token

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )

        raise HTTPException(status_code=401, detail="Token refresh failed")

    except Exception as e:
        logger.error(f"Refresh error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
async def logout(token: str = Depends(lambda: None)):
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except:
        return {"message": "Logged out successfully"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return {
            "id": user_id,
            "email": payload.get("email", ""),
            "full_name": None,
            "role": "free",
            "onboarding_done": False
        }

    try:
        supabase = get_supabase()
        user_data = supabase.table("users").select("*").eq("id", user_id).execute()

        if not user_data.data:
            raise HTTPException(status_code=401, detail="User not found")

        user = user_data.data[0]
        return user

    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_user_simple(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    return get_user_from_token(token)