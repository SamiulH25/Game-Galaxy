from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    games_dir: str = "../games"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 4321

    class Config:
        env_file = ".env"

    @property
    def games_path(self) -> Path:
        path = Path(self.games_dir)
        if not path.is_absolute():
            path = (BACKEND_ROOT / path).resolve()
        return path

    @property
    def frontend_dist_path(self) -> Path:
        return PROJECT_ROOT / "frontend" / "build"


settings = Settings()
