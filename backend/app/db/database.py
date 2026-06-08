from typing import AsyncIterator

async def get_db() -> AsyncIterator[None]:
    yield None

async def init_db():
    pass