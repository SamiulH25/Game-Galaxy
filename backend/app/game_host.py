"""Game static file hosting with correct MIME types and cache policy."""

from __future__ import annotations

import mimetypes
from pathlib import Path

from starlette.staticfiles import StaticFiles

# Ensure common web types resolve correctly on Windows.
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/wasm", ".wasm")

MIME_OVERRIDES: dict[str, str] = {
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".wasm": "application/wasm",
}


class GameStaticFiles(StaticFiles):
    """Serve /games/* with safe headers so browsers never mis-parse assets."""

    def __init__(self, *args, dev_mode: bool = False, **kwargs):
        super().__init__(*args, **kwargs)
        self.dev_mode = dev_mode

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)

        if response.status_code != 200:
            return response

        ext = Path(path).suffix.lower()
        if ext in MIME_OVERRIDES:
            response.headers["content-type"] = MIME_OVERRIDES[ext]

        response.headers["x-content-type-options"] = "nosniff"

        query = scope.get("query_string", b"").decode()
        if self.dev_mode or query:
            response.headers["cache-control"] = "no-cache, must-revalidate"
        elif ext in {".js", ".mjs", ".css", ".html"}:
            response.headers["cache-control"] = "public, max-age=300"
        else:
            response.headers["cache-control"] = "public, max-age=86400"

        return response


def resolve_games_directory(games_dir: str, backend_root: Path) -> Path:
    """Resolve games_dir relative to backend/ when not absolute."""
    path = Path(games_dir)
    if not path.is_absolute():
        path = (backend_root / path).resolve()
    return path
