from typing import Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import ToolJob, JobStatus, ToolType
import structlog

logger = structlog.get_logger()


class ToolService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_job(
        self,
        user_id: UUID,
        tool_type: str,
        input_text: str,
        mode: Optional[str] = None,
        extra_data: Optional[Dict] = None
    ) -> ToolJob:
        job = ToolJob(
            id=uuid4(),
            user_id=user_id,
            tool_type=tool_type,
            mode=mode,
            status=JobStatus.QUEUED.value,
            input_text=input_text,
            input_word_count=len(input_text.split()),
            extra_data=extra_data or {}
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def get_job(self, job_id: UUID) -> Optional[ToolJob]:
        result = await self.db.execute(select(ToolJob).where(ToolJob.id == job_id))
        return result.scalar_one_or_none()

    async def update_job_result(
        self,
        job_id: UUID,
        output_text: str,
        status: str = JobStatus.COMPLETED.value,
        extra_data: Optional[Dict] = None,
        model_used: Optional[str] = None,
        latency_ms: Optional[int] = None
    ) -> Optional[ToolJob]:
        job = await self.get_job(job_id)
        if not job:
            return None

        job.output_text = output_text
        job.status = status
        job.output_word_count = len(output_text.split()) if output_text else None
        if extra_data:
            job.extra_data = extra_data
        if model_used:
            job.model_used = model_used
        if latency_ms:
            job.latency_ms = latency_ms
        if status == JobStatus.COMPLETED.value:
            job.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def update_job_failed(self, job_id: UUID, error_message: str) -> Optional[ToolJob]:
        job = await self.get_job(job_id)
        if not job:
            return None

        job.status = JobStatus.FAILED.value
        job.error_message = error_message
        job.completed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def update_job_status(self, job_id: UUID, status: str) -> Optional[ToolJob]:
        job = await self.get_job(job_id)
        if not job:
            return None

        job.status = status
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def get_user_jobs(self, user_id: UUID, limit: int = 50) -> list[ToolJob]:
        result = await self.db.execute(
            select(ToolJob)
            .where(ToolJob.user_id == user_id)
            .order_by(ToolJob.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())