import asyncio
import json
from pathlib import Path

# In-memory cache of game manifests keyed by game id
games_cache: dict[str, dict] = {}
games_list_sorted: list[dict] = []
system_cache: list[dict] = []
systems_star_config: dict[str, dict] = {}
total_achievements_count: int = 0
scan_generation: int = 0


def _scan_games_sync(games_dir: Path) -> tuple[dict[str, dict], list[dict], list[dict], dict[str, dict], int]:
    if not games_dir.exists():
        return {}, [], [], {}, 0

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

    games_cache_local = {m["id"]: m for m in manifests}
    sorted_list = sorted(manifests, key=lambda g: g["title"])

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

    system_list = sorted(systems.values(), key=lambda s: s["name"])
    ach_total = sum(len(g.get("achievements", [])) for g in games_cache_local.values())

    return games_cache_local, sorted_list, system_list, systems_star_config, ach_total


async def scan_games(games_dir: str):
    """Scan /games/*/manifest.json and cache manifests."""
    global games_cache, games_list_sorted, system_cache, systems_star_config
    global total_achievements_count, scan_generation

    games_path = Path(games_dir)
    (
        games_cache_local,
        sorted_list,
        system_list,
        star_config,
        ach_total,
    ) = await asyncio.to_thread(_scan_games_sync, games_path)

    games_cache.clear()
    games_cache.update(games_cache_local)
    games_list_sorted.clear()
    games_list_sorted.extend(sorted_list)
    system_cache.clear()
    system_cache.extend(system_list)
    systems_star_config.clear()
    systems_star_config.update(star_config)
    total_achievements_count = ach_total
    scan_generation += 1
