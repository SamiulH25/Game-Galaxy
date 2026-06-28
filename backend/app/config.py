from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./game_galaxy.db"
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    games_dir: str = "../games"
    debug: bool = False
    # Re-scan games/*/manifest.json when files change (no restart needed)
    games_watch: bool = False
    games_watch_interval: float = 3.0
    # Optional token for POST /api/games/rescan when DEBUG=false (CLI / agents on server)
    games_rescan_token: str = ""
    # Serve /games/* with no-cache headers even in production (edit assets, refresh iframe)
    games_live_reload: bool = False
    host: str = "0.0.0.0"
    port: int = 4321
    cors_origins: str = ""

    @property
    def games_path(self) -> Path:
        path = Path(self.games_dir)
        if not path.is_absolute():
            path = (BACKEND_ROOT / path).resolve()
        return path

    @property
    def frontend_dist_path(self) -> Path:
        return PROJECT_ROOT / "frontend" / "build"

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip():
            return [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return [
            f"http://{self.host}:{self.port}",
            f"http://localhost:{self.port}",
            "http://127.0.0.1:" + str(self.port),
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]

    @property
    def using_default_secret(self) -> bool:
        return self.secret_key == "change-me-in-production"


settings = Settings()
