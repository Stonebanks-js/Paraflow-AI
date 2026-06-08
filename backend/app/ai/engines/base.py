from abc import ABC, abstractmethod
from typing import Optional, Any
import structlog

logger = structlog.get_logger()


class BaseAIEngine(ABC):
    def __init__(self):
        self.name = self.__class__.__name__

    @abstractmethod
    async def process(self, input_text: str, options: Optional[dict] = None) -> dict:
        pass

    def validate_input(self, text: str) -> bool:
        if not text or len(text.strip()) == 0:
            return False
        if len(text) > 50000:
            return False
        return True

    def get_model_context(self) -> str:
        return self.name

    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4

    def handle_error(self, error: Exception) -> dict:
        logger.error(f"{self.name} error", error=str(error))
        return {
            "status": "error",
            "error": str(error),
            "engine": self.name
        }