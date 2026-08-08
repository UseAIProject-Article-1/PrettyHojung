from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    apim_base_url: str | None = None
    apim_chat_url: str | None = None
    apim_chat_path: str = "/v1/chat/completions"
    apim_key: str | None = Field(default=None, repr=False)
    apim_key_header: str = "api-key"
    apim_timeout_seconds: float = Field(default=30.0, gt=0, le=120)
    chat_model: str = "gpt-5.4"
    embedding_model: str = "text-embedding-3-small"
    vision_model: str = "gpt-5.4"
    history_turns: int = Field(default=5, ge=1, le=20)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def chat_endpoint(self) -> str | None:
        encoded_model = quote(self.chat_model, safe="")
        if self.apim_chat_url:
            return self.apim_chat_url.strip().replace("{model}", encoded_model)
        if not self.apim_base_url:
            return None
        chat_path = self.apim_chat_path.replace("{model}", encoded_model)
        return f"{self.apim_base_url.rstrip('/')}/{chat_path.lstrip('/')}"

    @field_validator("apim_base_url", "apim_chat_url", "apim_key", mode="before")
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("apim_chat_path", mode="before")
    @classmethod
    def default_empty_chat_path(cls, value: object) -> object:
        return "/v1/chat/completions" if value is None or value == "" else value

    @field_validator("history_turns", mode="before")
    @classmethod
    def default_empty_history_turns(cls, value: object) -> object:
        return 5 if value is None or value == "" else value


@lru_cache
def get_settings() -> Settings:
    return Settings()
