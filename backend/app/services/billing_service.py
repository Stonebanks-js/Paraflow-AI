from typing import Optional
from uuid import UUID
from datetime import datetime
from app.db.supabase import get_supabase, get_supabase_admin
from app.core.config import settings
import structlog

logger = structlog.get_logger()


class BillingService:
    def __init__(self, db=None):
        self.db = db
        self.demo_mode = settings.DEMO_MODE or not settings.SUPABASE_KEY
        self.supabase = None
        self.admin = None
        if not self.demo_mode:
            try:
                self.supabase = get_supabase()
                self.admin = get_supabase_admin()
            except Exception as e:
                logger.warning(f"Supabase not available, running in demo mode: {e}")
                self.demo_mode = True

    async def get_balance(self, user_id: str) -> int:
        """Get user's current credit balance"""
        if self.demo_mode:
            return 100

        try:
            response = self.supabase.table("credits").select("amount").eq("user_id", user_id).execute()
            if response.data:
                return response.data[0].get("amount", 0)
            return 0
        except Exception as e:
            logger.warning(f"Failed to get balance: {e}")
            return 0

    async def _user_exists_in_users(self, user_id: str) -> bool:
        """Check if user exists in users table"""
        if self.demo_mode:
            return True

        try:
            response = self.supabase.table("users").select("id").eq("id", user_id).execute()
            return len(response.data) > 0
        except:
            return False

    async def _get_or_create_credits_row(self, user_id: str, initial_amount: int = 100) -> bool:
        """Create or update credits row for user with specified amount"""
        if self.demo_mode:
            return True

        try:
            now = datetime.utcnow()
            period_end = datetime(now.year + (1 if now.month > 6 else 0), ((now.month + 6) % 12) or 12, min(now.day, 28))

            existing = self.supabase.table("credits").select("id").eq("user_id", user_id).execute()
            if existing.data:
                self.admin.table("credits").update({
                    "amount": initial_amount,
                    "used": 0,
                    "period_start": now.isoformat(),
                    "period_end": period_end.isoformat()
                }).eq("user_id", user_id).execute()
                logger.info(f"Updated credits row for user {user_id} to {initial_amount} credits")
                return True

            response = self.admin.table("credits").insert({
                "user_id": user_id,
                "amount": initial_amount,
                "used": 0,
                "period_start": now.isoformat(),
                "period_end": period_end.isoformat()
            }).execute()

            if response.data:
                logger.info(f"Created credits row for user {user_id} with {initial_amount} credits")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to create/update credits row: {e}")
            return False

    async def deduct_credits(self, user_id: str, amount: int, tool: str) -> bool:
        """Deduct credits from user's balance"""
        if self.demo_mode:
            logger.info(f"Demo mode: allowing {amount} credits for {tool}")
            return True

        try:
            if not await self._user_exists_in_users(user_id):
                logger.error(f"User {user_id} not found in users table")
                return False

            await self._get_or_create_credits_row(user_id, initial_amount=100)

            current = await self.get_balance(user_id)

            if current < amount:
                logger.warning(f"Insufficient credits for user {user_id}: has {current}, needs {amount}")
                return False

            response = self.admin.table("credits").update({
                "amount": current - amount,
                "used": (current - amount)
            }).eq("user_id", user_id).execute()

            if response.data:
                logger.info(f"Credits deducted for user {user_id}: -{amount} for {tool}, remaining: {current - amount}")
                return True

            logger.error(f"Failed to deduct credits for user {user_id}")
            return False

        except Exception as e:
            logger.error(f"Failed to deduct credits: {e}")
            return False

    async def add_credits(self, user_id: str, amount: int, transaction_type: str = "purchase") -> bool:
        if self.demo_mode:
            return True

        try:
            current = await self.get_balance(user_id)
            response = self.admin.table("credits").update({
                "amount": current + amount
            }).eq("user_id", user_id).execute()
            return True
        except Exception as e:
            logger.warning(f"Failed to add credits: {e}")
            return False

    async def refund_credits(self, user_id: str, amount: int, tool: str) -> bool:
        if self.demo_mode:
            return True
        try:
            return await self.add_credits(user_id, amount, f"refund_{tool}")
        except Exception as e:
            logger.error(f"Refund failed for user {user_id}: {e}")
            return False

    async def get_transactions(self, user_id: str, limit: int = 50) -> list:
        return []

    def get_tool_cost(self, tool_type: str) -> int:
        costs = {
            "paraphraser": 5,
            "humanizer": 10,
            "detector": 3,
            "grammar": 3,
            "summarizer": 5,
            "translator": 8,
            "plagiarism": 10,
            "seo": 5,
            "transform": 10,
            "agent_studio": 20
        }
        return costs.get(tool_type, 5)