from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # extra="ignore" lets the shared .env carry container-only variables
    # (POSTGRES_USER, ...) without breaking host-side runs of the app/alembic.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str
    jwt_secret: str
    admin_password: str

    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    admin_email: str = "admin@grazioso-shelter.dev"

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
