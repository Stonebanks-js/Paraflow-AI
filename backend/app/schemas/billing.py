from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class CreditBalanceResponse(BaseModel):
    balance: int
    tier: str


class CreditTransactionResponse(BaseModel):
    id: UUID
    amount: int
    type: str
    tool: Optional[str]
    balance_after: int
    created_at: str


class CreditPurchaseRequest(BaseModel):
    pack_id: str


class UsageStatsResponse(BaseModel):
    total_jobs: int
    total_words: int
    total_credits: int
    by_tool: dict[str, dict]