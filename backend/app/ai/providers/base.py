"""Provider-agnostic LLM abstraction.

Defines a common interface for all LLM providers. Each provider implementation
(NVIDIA, OpenAI, Gemini, Groq, OpenRouter) returns a normalized response.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import time
import structlog

logger = structlog.get_logger()


@dataclass
class LLMRequest:
    """A normalized LLM request."""
    system_prompt: str
    user_prompt: str
    temperature: float = 0.7
    max_tokens: int = 1024
    top_p: float = 0.9
    model: Optional[str] = None  # override the provider default
    stop: Optional[List[str]] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMResponse:
    """A normalized LLM response. Same shape regardless of provider."""
    text: str
    model: str
    provider: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    latency_seconds: float = 0.0
    raw_response: Optional[Any] = None

    def to_engine_dict(self) -> dict:
        """Return the dict shape engines expect."""
        return {
            "status": "success",
            "output": self.text,
            "model": self.model,
            "tokens_used": self.total_tokens,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "provider": self.provider,
            "latency_seconds": self.latency_seconds,
        }


@dataclass
class LLMError:
    """A normalized LLM error."""
    code: str
    message: str
    provider: str
    retriable: bool = False
    latency_seconds: float = 0.0

    def to_engine_dict(self) -> dict:
        return {
            "status": "error",
            "error": self.message,
            "error_code": self.code,
            "provider": self.provider,
            "latency_seconds": self.latency_seconds,
        }


class BaseLLMProvider(ABC):
    """Abstract base for all LLM providers.

    All provider implementations must implement `generate`. They should:
    - Use a singleton client (created on first call)
    - Have a hard timeout
    - Return LLMResponse on success
    - Return LLMError on failure
    - Log timing and errors
    """

    name: str = "base"

    def __init__(self):
        self._client = None
        self._client_lock = None  # for thread-safe lazy init if needed

    @abstractmethod
    def _get_client(self):
        """Return the underlying SDK client. Lazy singleton."""
        pass

    @abstractmethod
    def _do_generate(self, client, request: LLMRequest) -> LLMResponse:
        """Actually call the provider. Must be synchronous (caller wraps in executor)."""
        pass

    @property
    def default_model(self) -> str:
        """The default model for this provider if not specified in the request."""
        return ""

    def generate(self, request: LLMRequest) -> LLMResponse | LLMError:
        """Public entry point. Includes timing, error handling, and logging.

        Returns LLMResponse on success, LLMError on failure.
        Never raises. Never hangs forever (callers may wrap with their own timeout).
        """
        start = time.monotonic()
        try:
            client = self._get_client()
            if client is None:
                return LLMError(
                    code="CLIENT_INIT_FAILED",
                    message=f"{self.name} client could not be initialized. Check API key.",
                    provider=self.name,
                    latency_seconds=time.monotonic() - start,
                )

            model = request.model or self.default_model
            response = self._do_generate(client, request)
            response.latency_seconds = time.monotonic() - start
            response.provider = self.name
            response.model = model

            logger.info(
                "llm.request.success",
                provider=self.name,
                model=model,
                latency=round(response.latency_seconds, 3),
                in_tokens=response.input_tokens,
                out_tokens=response.output_tokens,
            )
            return response

        except Exception as e:
            latency = time.monotonic() - start
            logger.error(
                "llm.request.error",
                provider=self.name,
                model=request.model or self.default_model,
                latency=round(latency, 3),
                error_type=type(e).__name__,
                error_msg=str(e)[:200],
            )
            return LLMError(
                code="PROVIDER_ERROR",
                message=f"{self.name} error: {str(e)[:200]}",
                provider=self.name,
                retriable=True,
                latency_seconds=latency,
            )
