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

    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Active LLM provider selection. Changing this and ACTIVE_MODEL switches the
    # engine layer to a different provider. No code changes required.
    ACTIVE_PROVIDER: str = "groq"  # openai | groq | openrouter | gemini
    ACTIVE_MODEL: str = ""  # empty = use provider default

    # Auto-fallback chain: if the active provider fails, try these in order.
    FALLBACK_PROVIDERS: str = "openrouter,gemini"  # comma-separated

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

    AI_MODEL_HAIKU: str = "claude-3-haiku-20240307"
    AI_MODEL_SONNET: str = "claude-3-5-sonnet-20241022"
    AI_MODEL_GEMINI_FLASH: str = "gemini-2.0-flash"
    AI_MODEL_GEMINI_PRO: str = "gemini-1.5-pro"

    RATE_LIMIT_FREE: int = 10
    RATE_LIMIT_PRO: int = 60
    RATE_LIMIT_TEAM: int = 120

    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    @property
    def cors_origins_list(self) -> list[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    @property
    def fallback_providers_list(self) -> list[str]:
        if not self.FALLBACK_PROVIDERS:
            return []
        return [p.strip() for p in self.FALLBACK_PROVIDERS.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()