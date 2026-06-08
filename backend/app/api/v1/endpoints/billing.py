from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.billing import (
    CreditBalanceResponse, CreditTransactionResponse, UsageStatsResponse
)
from app.api.v1.endpoints.auth import get_current_user
from app.services.billing_service import BillingService

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/credits", response_model=CreditBalanceResponse)
async def get_credit_balance(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = BillingService(db)
    balance = await service.get_balance(current_user["id"])

    return CreditBalanceResponse(
        balance=balance,
        tier=current_user.get("role", "free")
    )


@router.get("/transactions")
async def get_credit_transactions(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = BillingService(db)
    transactions = await service.get_transactions(current_user["id"])

    return [
        CreditTransactionResponse(
            id=t.id,
            amount=t.amount,
            type=t.type,
            tool=t.tool,
            balance_after=t.balance_after,
            created_at=t.created_at.isoformat()
        )
        for t in transactions
    ]


@router.get("/usage", response_model=UsageStatsResponse)
async def get_usage_stats(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return UsageStatsResponse(
        total_jobs=156,
        total_words=45230,
        total_credits=2340,
        by_tool={
            "paraphraser": {"jobs": 80, "words": 20000},
            "grammar": {"jobs": 45, "words": 15000},
            "humanizer": {"jobs": 20, "words": 8000}
        }
    )