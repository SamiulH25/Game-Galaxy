import json
from pathlib import Path

# Cache of universal achievement definitions
universal_achievements_cache: list[dict] = []


async def scan_universal_achievements(games_dir: str):
    """Scan games/universal_achievements.json and cache definitions."""
    global universal_achievements_cache
    path = Path(games_dir) / "universal_achievements.json"
    if path.exists():
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            universal_achievements_cache = data.get("achievements", [])
        except (json.JSONDecodeError, KeyError):
            universal_achievements_cache = []
    else:
        universal_achievements_cache = []
