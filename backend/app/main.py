from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import structlog

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.database import init_db
from app.db.supabase import init_supabase

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    import time
    t0 = time.time()
    logger.info("Paraflow AI starting up", version=settings.APP_VERSION)
    print(f"[STARTUP] Step 1 - Starting: {time.time() - t0:.3f}s")

    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            service_key = getattr(settings, 'SUPABASE_SERVICE_KEY', None)
            init_supabase(settings.SUPABASE_URL, settings.SUPABASE_KEY, service_key)
            logger.info("Supabase initialized", url=settings.SUPABASE_URL[:30] + "...")
            print(f"[STARTUP] Step 2 - Supabase init: {time.time() - t0:.3f}s")
        except Exception as e:
            logger.warning("Supabase initialization failed", reason=str(e))
            print(f"[STARTUP] Step 2 - Supabase FAILED: {time.time() - t0:.3f}s")
    else:
        logger.warning("Supabase not configured - running in demo mode")
        print(f"[STARTUP] Step 2 - Supabase not configured: {time.time() - t0:.3f}s")

    print(f"[STARTUP] Step 3 - About to init_db: {time.time() - t0:.3f}s")
    try:
        await init_db()
        logger.info("Database initialized")
        print(f"[STARTUP] Step 3 - Database init done: {time.time() - t0:.3f}s")
    except Exception as e:
        logger.warning("Database initialization skipped", reason=str(e))
        print(f"[STARTUP] Step 3 - Database init FAILED: {time.time() - t0:.3f}s")

    print(f"[STARTUP] Step 4 - About to yield: {time.time() - t0:.3f}s")

    # Log LLM provider configuration on startup so the operator can see
    # exactly which provider is active and which keys are loaded.
    _log_llm_startup_config()

    yield
    print(f"[STARTUP] Step 5 - Shutdown: {time.time() - t0:.3f}s")
    logger.info("Paraflow AI shutting down")


def _log_llm_startup_config() -> None:
    """Print LLM provider status on startup so the operator can verify config."""
    print()
    print("=" * 60)
    print("LLM PROVIDER CONFIGURATION")
    print("=" * 60)

    active = (settings.ACTIVE_PROVIDER or "").lower()
    active_key = settings.OPENAI_API_KEY if active == "openai" else (
        settings.GROQ_API_KEY if active == "groq" else (
            settings.OPENROUTER_API_KEY if active == "openrouter" else (
                settings.GEMINI_API_KEY if active == "gemini" else (
                    settings.NVIDIA_API_KEY if active == "nvidia" else ""
                )
            )
        )
    )
    active_model = settings.ACTIVE_MODEL
    if not active_model and active == "groq":
        active_model = settings.GROQ_MODEL
    elif not active_model and active == "nvidia":
        active_model = settings.NVIDIA_MODEL
    elif not active_model and active == "openai":
        active_model = "gpt-4o-mini"
    elif not active_model and active == "openrouter":
        active_model = settings.OPENROUTER_MODEL
    elif not active_model and active == "gemini":
        active_model = settings.GEMINI_MODEL

    print(f"  ACTIVE_PROVIDER:   {active or '(none)'}")
    print(f"  ACTIVE_MODEL:      {active_model or '(provider default)'}")
    print(f"  LLM_TIMEOUT:       {settings.LLM_TIMEOUT_SECONDS}s")
    print(f"  FALLBACK_CHAIN:    {', '.join(settings.fallback_providers_list) or '(none)'}")
    print()
    print("  Available providers:")
    providers = [
        ("openai", "OPENAI_API_KEY", bool(settings.OPENAI_API_KEY)),
        ("groq", "GROQ_API_KEY", bool(settings.GROQ_API_KEY)),
        ("openrouter", "OPENROUTER_API_KEY", bool(settings.OPENROUTER_API_KEY)),
        ("gemini", "GEMINI_API_KEY", bool(settings.GEMINI_API_KEY)),
        ("nvidia", "NVIDIA_API_KEY", bool(settings.NVIDIA_API_KEY)),
    ]
    for name, env_var, configured in providers:
        status = "READY" if configured else "MISSING"
        marker = " *" if name == active else "  "
        print(f"  {marker} {name:12s} [{status:7s}] ({env_var})")
    print("=" * 60)
    print()

    # Also emit structured logs so they appear in Render's log stream
    logger.info(
        "llm.config",
        active_provider=active or None,
        active_model=active_model or None,
        timeout_seconds=settings.LLM_TIMEOUT_SECONDS,
        fallback_chain=settings.fallback_providers_list,
        providers_available=[name for name, _, ok in providers if ok],
        providers_missing=[name for name, _, ok in providers if not ok],
        provider_selected=active or None,
        model_selected=active_model or None,
    )


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Writing Intelligence Platform - From First Draft to Final Form",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": settings.APP_NAME
    }


@app.get("/api/debug")
async def debug_settings():
    return {
        "DEMO_MODE": settings.DEMO_MODE,
        "SUPABASE_URL": settings.SUPABASE_URL,
        "SUPABASE_KEY": settings.SUPABASE_KEY,
        "condition": settings.DEMO_MODE or not settings.SUPABASE_KEY,
        "NVIDIA_API_KEY_set": bool(settings.NVIDIA_API_KEY),
        "NVIDIA_API_KEY_len": len(settings.NVIDIA_API_KEY) if settings.NVIDIA_API_KEY else 0,
        "NVIDIA_BASE_URL": settings.NVIDIA_BASE_URL,
        "NVIDIA_MODEL": settings.NVIDIA_MODEL,
        "ACTIVE_PROVIDER": settings.ACTIVE_PROVIDER,
        "ACTIVE_MODEL": settings.ACTIVE_MODEL,
        "FALLBACK_PROVIDERS": settings.fallback_providers_list,
        "LLM_TIMEOUT_SECONDS": settings.LLM_TIMEOUT_SECONDS,
        "GROQ_API_KEY_set": bool(settings.GROQ_API_KEY),
        "OPENAI_API_KEY_set": bool(settings.OPENAI_API_KEY),
        "GEMINI_API_KEY_set": bool(settings.GEMINI_API_KEY),
        "OPENROUTER_API_KEY_set": bool(settings.OPENROUTER_API_KEY),
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to Paraflow AI",
        "version": settings.APP_VERSION,
        "docs": "/api/docs"
    }


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=os.getenv("DEBUG", "false").lower() == "true")