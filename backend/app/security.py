"""Security middleware: headers, rate limiting."""

from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

# In-memory rate limit buckets: key -> list of timestamps
_rate_buckets: dict[str, list[float]] = defaultdict(list)

RATE_LIMITS: dict[str, tuple[int, int]] = {
    "/api/auth/login": (10, 60),
    "/api/auth/register": (5, 3600),
}


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def check_rate_limit(path: str, client: str) -> bool:
    limit, window = RATE_LIMITS.get(path, (0, 0))
    if limit <= 0:
        return True
    now = time.time()
    key = f"{path}:{client}"
    bucket = [t for t in _rate_buckets[key] if now - t < window]
    if len(bucket) >= limit:
        _rate_buckets[key] = bucket
        return False
    bucket.append(now)
    _rate_buckets[key] = bucket
    return True


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path in RATE_LIMITS and request.method == "POST":
            if not check_rate_limit(path, _client_key(request)):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Try again later."},
                )

        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        # Allow same-origin embedding (game iframes). Blocks third-party embeds.
        if not path.startswith("/api/"):
            response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
            response.headers.setdefault("Content-Security-Policy", "frame-ancestors 'self'")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

        if not settings.debug and request.url.path.startswith("/api"):
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; frame-ancestors 'none'",
            )
            response.headers["X-Frame-Options"] = "DENY"

        return response
