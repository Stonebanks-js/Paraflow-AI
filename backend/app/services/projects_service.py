"""Projects service -- backed by public.projects.

A project is just a user-named container that history entries and Para
Agent chat sessions can optionally be filed under (Claude/ChatGPT-style
"Projects"). Follows the same get_supabase_admin() service-role pattern as
every other Supabase-backed service in this app -- see the note in
history_service.py / writing_dna_service.py for why the admin client is
required here rather than the anon client.
"""
from typing import Optional
import structlog

from app.db.supabase import get_supabase_admin

logger = structlog.get_logger()


class ProjectsService:
    def __init__(self):
        self.admin = get_supabase_admin()

    async def create_project(self, user_id: str, name: str) -> dict:
        response = self.admin.table("projects").insert({
            "user_id": user_id,
            "name": name,
        }).execute()
        if not response.data:
            raise RuntimeError("Failed to create project")
        return response.data[0]

    async def list_projects(self, user_id: str) -> list:
        response = (
            self.admin.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    async def rename_project(self, user_id: str, project_id: str, name: str) -> Optional[dict]:
        response = (
            self.admin.table("projects")
            .update({"name": name})
            .eq("user_id", user_id)
            .eq("id", project_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete_project(self, user_id: str, project_id: str) -> bool:
        response = (
            self.admin.table("projects")
            .delete()
            .eq("user_id", user_id)
            .eq("id", project_id)
            .execute()
        )
        return bool(response.data)
