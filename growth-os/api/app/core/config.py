from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = 'Vibhu Growth OS'
    environment: str = 'development'
    supabase_url: str
    supabase_service_role_key: str
    portfolio_owner_user_id: str | None = None
    openai_api_key: str | None = None
    openai_model: str = 'gpt-5.4-mini'
    openai_embedding_model: str = 'text-embedding-3-small'
    redis_url: str = 'redis://localhost:6379/0'
    search_provider: str = 'tavily'
    tavily_api_key: str | None = None
    gmail_client_id: str | None = None
    gmail_client_secret: str | None = None
    gmail_refresh_token: str | None = None
    gmail_user_id: str = 'me'
    allowed_origins: str = 'http://localhost:3000'
    request_timeout_seconds: float = 20.0
    model_config = SettingsConfigDict(env_file='.env', case_sensitive=False, extra='ignore')

    @property
    def origins(self) -> list[str]:
        return [x.strip() for x in self.allowed_origins.split(',') if x.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
