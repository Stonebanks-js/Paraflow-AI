from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, tools, writing_dna, agents, health, billing

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(tools.router)
api_router.include_router(writing_dna.router)
api_router.include_router(agents.router)
api_router.include_router(health.router)
api_router.include_router(billing.router)