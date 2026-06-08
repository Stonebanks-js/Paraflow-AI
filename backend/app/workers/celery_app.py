from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "paraflow",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)

celery_app.conf.task_routes = {
    "app.workers.tasks.paraphrase_task": {"queue": "ai_priority"},
    "app.workers.tasks.humanize_task": {"queue": "ai_priority"},
    "app.workers.tasks.detect_task": {"queue": "ai_standard"},
    "app.workers.tasks.grammar_task": {"queue": "ai_standard"},
    "app.workers.tasks.agent_studio_task": {"queue": "ai_priority"},
}


@celery_app.task(bind=True, name="app.workers.tasks.paraphrase_task")
def paraphrase_task(self, job_id: str, text: str, mode: str, strength: int):
    from app.db.database import async_session_maker
    from app.services.tool_service import ToolService
    from app.ai.engines.paraphrase_engine import ParaphraseEngine
    import asyncio

    async def process():
        async with async_session_maker() as db:
            tool_service = ToolService(db)
            engine = ParaphraseEngine()
            result = await engine.process(text, {"mode": mode, "strength": strength})
            if result.get("status") == "success":
                await tool_service.update_job_result(job_id, result["output"])
            else:
                await tool_service.update_job_failed(job_id, result.get("error", "Unknown"))

    asyncio.run(process())
    return {"status": "completed", "job_id": job_id}


@celery_app.task(bind=True, name="app.workers.tasks.humanize_task")
def humanize_task(self, job_id: str, text: str, target_pass_rate: float):
    from app.db.database import async_session_maker
    from app.services.tool_service import ToolService
    from app.ai.engines.humanize_engine import HumanizeEngine
    import asyncio

    async def process():
        async with async_session_maker() as db:
            tool_service = ToolService(db)
            engine = HumanizeEngine()
            result = await engine.process(text, {"target_pass_rate": target_pass_rate})
            if result.get("status") == "success":
                await tool_service.update_job_result(job_id, result["output"])
            else:
                await tool_service.update_job_failed(job_id, result.get("error", "Unknown"))

    asyncio.run(process())
    return {"status": "completed", "job_id": job_id}


@celery_app.task(bind=True, name="app.workers.tasks.detect_task")
def detect_task(self, job_id: str, text: str):
    from app.db.database import async_session_maker
    from app.services.tool_service import ToolService
    from app.ai.engines.detect_engine import DetectEngine
    import asyncio

    async def process():
        async with async_session_maker() as db:
            tool_service = ToolService(db)
            engine = DetectEngine()
            result = await engine.process(text)
            if result.get("status") == "success":
                await tool_service.update_job_result(job_id, text, metadata=result["result"])
            else:
                await tool_service.update_job_failed(job_id, result.get("error", "Unknown"))

    asyncio.run(process())
    return {"status": "completed", "job_id": job_id}


@celery_app.task(bind=True, name="app.workers.tasks.agent_studio_task")
def agent_studio_task(self, job_id: str, text: str, target_score: int, max_iterations: int, active_agents: list):
    from app.db.database import async_session_maker
    from app.services.tool_service import ToolService
    from app.services.agent_studio_service import AgentStudioService
    import asyncio

    async def process():
        async with async_session_maker() as db:
            tool_service = ToolService(db)
            agent_service = AgentStudioService()
            result = await agent_service.run_session(text, target_score, max_iterations, active_agents)
            await tool_service.update_job_result(job_id, result["final_text"])

    asyncio.run(process())
    return {"status": "completed", "job_id": job_id}