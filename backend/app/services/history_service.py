"""History service -- backed by public.tool_jobs, a table that has
existed in the schema since the original migration (user_id, tool_name,
input_data, output_data, status, credits_used, created_at -- exactly the
right shape for an engine-usage history feature) but was never actually
written to by any backend code. This wires it up for real.
"""
from typing import Optional
from datetime import datetime, timezone
import structlog

from app.db.supabase import get_supabase_admin

logger = structlog.get_logger()

MAX_TITLE_LENGTH = 60


def make_title(tool_name: str, input_text: str) -> str:
    """Auto-generate a session title from the actual input, the same way
    ChatGPT/Claude title a conversation from its first message -- never a
    generic "Session 1" placeholder."""
    snippet = " ".join(input_text.split())[:MAX_TITLE_LENGTH]
    if len(input_text) > MAX_TITLE_LENGTH:
        snippet = snippet.rstrip() + "..."
    label = tool_name.replace("_", " ").title()
    return f"{label}: {snippet}" if snippet else label


class HistoryService:
    def __init__(self):
        self.admin = get_supabase_admin()

    async def log_job(
        self,
        user_id: str,
        tool_name: str,
        input_text: str,
        output_summary: Optional[str],
        status: str,
        credits_used: int,
        error_message: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> None:
        """Best-effort: a history-logging failure must never break the
        actual tool call that triggered it, so every error here is
        swallowed and logged, not raised."""
        try:
            now = datetime.now(timezone.utc).isoformat()
            row = {
                "user_id": user_id,
                "tool_name": tool_name,
                "title": make_title(tool_name, input_text),
                "input_data": {"text": input_text[:5000]},
                "output_data": {"summary": (output_summary or "")[:5000]} if output_summary else None,
                "status": status,
                "credits_used": credits_used,
                "error_message": error_message,
                "started_at": now,
                "completed_at": now,
                "project_id": project_id,
            }
            self.admin.table("tool_jobs").insert(row).execute()
        except Exception as e:
            logger.warning("history.log_failed", tool=tool_name, error=str(e)[:200])

    async def list_history(self, user_id: str, limit: int = 50, project_id: Optional[str] = None) -> list:
        try:
            query = (
                self.admin.table("tool_jobs")
                .select("id,tool_name,title,status,credits_used,created_at,project_id")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
            )
            if project_id:
                query = query.eq("project_id", project_id)
            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.warning("history.list_failed", error=str(e)[:200])
            return []

    async def get_job(self, user_id: str, job_id: str) -> Optional[dict]:
        try:
            response = (
                self.admin.table("tool_jobs")
                .select("*")
                .eq("user_id", user_id)
                .eq("id", job_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.warning("history.get_failed", error=str(e)[:200])
            return None

    async def delete_job(self, user_id: str, job_id: str) -> bool:
        try:
            self.admin.table("tool_jobs").delete().eq("user_id", user_id).eq("id", job_id).execute()
            return True
        except Exception as e:
            logger.warning("history.delete_failed", error=str(e)[:200])
            return False
