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
    ".pck": "application/octet-stream",
}

LONG_CACHE_EXTS = {".js", ".mjs", ".css", ".wasm", ".pck", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".woff", ".woff2"}
IMMUTABLE_PREFIXES = ("/_app/immutable/",)


def _is_version_query(query: str) -> bool:
    """Allow long cache when query string is only a version bump (?v=...)."""
    if not query:
        return False
    for part in query.split("&"):
        if not part.startswith("v=") and not part.startswith("ver="):
            return False
    return True


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
        response.headers["x-frame-options"] = "SAMEORIGIN"
        response.headers["content-security-policy"] = "frame-ancestors 'self'"

        query = scope.get("query_string", b"").decode()
        if self.dev_mode:
            response.headers["cache-control"] = "no-cache, must-revalidate"
        elif query and not _is_version_query(query):
            response.headers["cache-control"] = "no-cache, must-revalidate"
        elif ext == ".html":
            response.headers["cache-control"] = "no-cache"
        elif ext in LONG_CACHE_EXTS:
            response.headers["cache-control"] = "public, max-age=31536000, immutable"
        else:
            response.headers["cache-control"] = "public, max-age=86400"

        return response


class FrontendStaticFiles(StaticFiles):
    """Serve built SvelteKit assets with appropriate cache headers."""

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)

        if response.status_code != 200:
            return response

        response.headers["x-content-type-options"] = "nosniff"
        response.headers["x-frame-options"] = "SAMEORIGIN"
        response.headers["content-security-policy"] = "frame-ancestors 'self'"
        url_path = scope.get("path", "")

        if any(url_path.startswith(p) for p in IMMUTABLE_PREFIXES):
            response.headers["cache-control"] = "public, max-age=31536000, immutable"
        elif path.endswith(".html") or path == "" or path.endswith("/"):
            response.headers["cache-control"] = "no-cache"
        elif Path(path).suffix.lower() in {".js", ".css", ".woff", ".woff2", ".png", ".svg", ".webp"}:
            response.headers["cache-control"] = "public, max-age=86400"

        return response


def resolve_games_directory(games_dir: str, backend_root: Path) -> Path:
    """Resolve games_dir relative to backend/ when not absolute."""
    path = Path(games_dir)
    if not path.is_absolute():
        path = (backend_root / path).resolve()
    return path
