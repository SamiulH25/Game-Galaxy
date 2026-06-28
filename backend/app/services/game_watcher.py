"""Poll games/ for manifest changes and trigger rescans (server-side dev workflow)."""

from __future__ import annotations

import asyncio
from pathlib import Path

from app.services.game_scanner import scan_games

_watch_task: asyncio.Task | None = None


def _manifest_snapshot(games_dir: Path) -> dict[str, float]:
    if not games_dir.exists():
        return {}
    snapshot: dict[str, float] = {}
    for manifest in games_dir.glob("*/manifest.json"):
        try:
            snapshot[str(manifest)] = manifest.stat().st_mtime
        except OSError:
            continue
    systems = games_dir / "systems.json"
    if systems.exists():
        try:
            snapshot[str(systems)] = systems.stat().st_mtime
        except OSError:
            pass
    return snapshot


async def _watch_loop(games_dir: str, interval_seconds: float) -> None:
    games_path = Path(games_dir)
    last = _manifest_snapshot(games_path)
    while True:
        await asyncio.sleep(interval_seconds)
        current = _manifest_snapshot(games_path)
        if current != last:
            last = current
            await scan_games(games_dir)
            print(f"  games watch: rescanned ({len(current)} manifest(s))")


def start_games_watch(games_dir: str, interval_seconds: float = 3.0) -> None:
    global _watch_task
    if _watch_task and not _watch_task.done():
        return
    _watch_task = asyncio.create_task(_watch_loop(games_dir, interval_seconds))
    print(f"  games watch: enabled (every {interval_seconds:g}s)")


async def stop_games_watch() -> None:
    global _watch_task
    if _watch_task and not _watch_task.done():
        _watch_task.cancel()
        try:
            await _watch_task
        except asyncio.CancelledError:
            pass
    _watch_task = None
