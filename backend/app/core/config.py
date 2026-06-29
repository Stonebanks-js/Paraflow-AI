from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "Paraflow AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Active LLM provider selection. The only supported value is "gemini".
    ACTIVE_PROVIDER: str = "gemini"  # only "gemini" is supported
    ACTIVE_MODEL: str = ""  # empty = use provider default (GEMINI_MODEL)

    # LLM request timeout (seconds) - hard cap on each provider call
    LLM_TIMEOUT_SECONDS: float = 10.0

    DEMO_MODE: bool = True

    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CLOUDFLARE_API_KEY: str = ""
    STRIPE_API_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    S3_BUCKET: str = "paraflow-ai"
    S3_ENDPOINT: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    RATE_LIMIT_FREE: int = 10
    RATE_LIMIT_PRO: int = 60
    RATE_LIMIT_TEAM: int = 120

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    @property
    def cors_origins_list(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()