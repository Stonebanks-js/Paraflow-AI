"""Provider-agnostic LLM service.

This is the single entry point for all engines. Engines should call:
    from app.ai.llm_service import generate, generate_dict

Engines don't import any provider directly. The service handles provider
selection, fallbacks, timeouts, and error normalization.

The service is intentionally synchronous (returns a dict) so that:
- Engines remain simple `async def` methods
- The same `generate_dict` works regardless of provider
- Engines get the same dict shape they used to from the old `NVIDIAEngine`
"""
from __future__ import annotations

import time
from typing import Optional

import structlog

from app.core.config import settings

from .providers import (
    generate_with_fallback,
    LLMRequest,
    LLMResponse,
    LLMError,
)

logger = structlog.get_logger()


def generate_dict(
    *,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    top_p: float = 0.9,
    model: Optional[str] = None,
    timeout: Optional[float] = None,
) -> dict:
    """Call the active LLM provider (with fallback) and return a dict for engines.

    Returns the same shape that the old `NVIDIAEngine.process` returned:
    {
        "status": "success" | "error",
        "output": str,
        "model": str,
        "tokens_used": int,
        ...
    }
    """
    request = LLMRequest(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
        model=model or (settings.ACTIVE_MODEL or None),
    )

    start = time.monotonic()
    result = generate_with_fallback(request, timeout=timeout)
    elapsed = time.monotonic() - start

    if isinstance(result, LLMResponse):
        logger.info(
            "llm.service.success",
            provider=result.provider,
            model=result.model,
            elapsed=round(elapsed, 3),
            in_tokens=result.input_tokens,
            out_tokens=result.output_tokens,
        )
        return result.to_engine_dict()

    logger.warning(
        "llm.service.error",
        provider=result.provider,
        elapsed=round(elapsed, 3),
        code=result.code,
        message=result.message[:200],
    )
    return result.to_engine_dict()
