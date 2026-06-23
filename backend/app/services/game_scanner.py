import json
from pathlib import Path

# In-memory cache of game manifests keyed by game id
games_cache: dict[str, dict] = {}
system_cache: list[dict] = []
systems_star_config: dict[str, dict] = {}


async def scan_games(games_dir: str):
    """Scan /games/*/manifest.json and cache manifests."""
    global games_cache, system_cache, systems_star_config

    games_dir = Path(games_dir)
    if not games_dir.exists():
        games_cache.clear()
        system_cache.clear()
        systems_star_config.clear()
        return

    # Load systems star config
    systems_config_path = games_dir / "systems.json"
    if systems_config_path.exists():
        try:
            with open(systems_config_path, encoding="utf-8") as f:
                systems_star_config = json.load(f)
        except (json.JSONDecodeError, OSError):
            print(f"Warning: could not parse {systems_config_path}")
            systems_star_config = {}
    else:
        systems_star_config = {}

    manifests = []
    for manifest_path in games_dir.glob("*/manifest.json"):
        try:
            with open(manifest_path, encoding="utf-8") as f:
                data = json.load(f)
            data["id"] = manifest_path.parent.name
            manifests.append(data)
        except (json.JSONDecodeError, KeyError) as e:
            print(f"Warning: skipping {manifest_path}: {e}")

    games_cache.clear()
    games_cache.update({m["id"]: m for m in manifests})

    # Build solar system index
    systems: dict[str, dict] = {}
    for m in manifests:
        sid = m.get("solarSystemId", "unknown")
        if sid not in systems:
            star_props = systems_star_config.get(sid, {})
            systems[sid] = {
                "id": sid,
                "name": m.get("solarSystemName", sid),
                "game_count": 0,
                "star": star_props,
            }
        systems[sid]["game_count"] += 1
    system_cache.clear()
    system_cache.extend(sorted(systems.values(), key=lambda s: s["name"]))
