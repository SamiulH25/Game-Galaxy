# Creating a Godot Game for Game Galaxy 2.0

This guide walks you through creating a Godot game and exporting it for the Game Galaxy 2.0 platform.

## Prerequisites

- Godot 4.3+ installed ([download](https://godotengine.org/download/))
- The Web export templates installed (in Godot: **Editor > Manage Export Templates > Download and Install**)
- A running Game Galaxy 2.0 backend (see project README)

## Quick Start

### 1. Copy the Template

```
Copy games/galaxy-godot-template/ to games/024-my-game/
```

### 2. Open in Godot

- Launch Godot
- Click **Import** and navigate to `games/024-my-game/project.godot`
- The template includes `GalaxyAPI.gd` (autoload singleton) and an example scene

### 3. Customize the Project

- Edit **Project > Project Settings > General > Application > Config > Name**
- Edit `games/024-my-game/example/ExampleGame.tscn` to build your game
- The `GalaxyAPI` autoload is already configured and available globally

### 4. Create Your Game

Add nodes, write GDScript, and build your game. The `GalaxyAPI` singleton is available from any script:

```gdscript
# Save progress (fire-and-forget, no callback needed)
GalaxyAPI.save({"level": 3, "score": 5000, "health": 80})

# Save with callback to handle response
GalaxyAPI.save({"level": 3}, func(result):
    if result and not result.is_empty():
        print("Save successful!")
)

# Load save data (callback receives the data Dictionary)
GalaxyAPI.load(func(data):
    if data and not data.is_empty():
        level = data.get("level", 1)
        score = data.get("score", 0)
)

# Submit score to leaderboard (fire-and-forget or with callback)
GalaxyAPI.submit_score({"score": 5000, "level": 3})

# Unlock an achievement (match the ID in manifest.json)
GalaxyAPI.unlock_achievement("first_kill")
```

### 5. Create manifest.json

Create `games/024-my-game/manifest.json` with your game's metadata:

```json
{
  "title": "My Game Title",
  "description": "A short description",
  "detailedDescription": "A longer description for the planet popup.",
  "planetName": "My Planet",
  "solarSystemId": "alpha-centauri",
  "solarSystemName": "Alpha Centauri",
  "planetColor": "#44dd88",
  "planetSize": 1.0,
  "orbitRadius": 10,
  "orbitSpeed": 0.4,
  "thumbnail": "thumbnail.svg",
  "difficulty": "Medium",
  "controls": "Describe the controls here",
  "genre": "Action, Arcade",
  "type": "godot",
  "tags": ["godot", "webgl", "arcade"],
  "characteristics": {
    "type": "atmosphere",
    "atmosphereColor": "#44dd88",
    "atmosphereOpacity": 0.35,
    "atmosphereScale": 1.3
  },
  "achievements": [
    { "id": "first_kill", "title": "First Blood", "description": "Kill your first enemy", "icon": "bolt" },
    { "id": "level_5", "title": "Explorer", "description": "Reach level 5", "icon": "trophy" }
  ]
}
```

**Important:** The `type` field must be `"godot"` for engine-based games.

### 6. Export for Web

In Godot:

1. Open **Project > Export**
2. Add an **HTML5 (Web)** preset
3. Set **Export Path** to `games/024-my-game/index.html` (relative to the project root)
4. Under **Html > Custom HTML Shell**, set it to `res://galaxy_template.html`
5. **Important:** Set the export file name to `index.html` (Godot's Web export uses this as the base for all generated files)
6. Click **Export Project > Export**

This generates:
- `games/024-my-game/index.html` (custom template with Galaxy bridge)
- `games/024-my-game/index.wasm` (compiled engine)
- `games/024-my-game/index.pck` (game assets)
- `games/024-my-game/index.js` (loader script)

### 7. Restart the Backend

The backend auto-scans the `games/` directory. Restart the backend or call:

```
POST /api/games/rescan
```

Your game will appear in the galaxy with the planet name and color you specified.

### 8. Play

Open the galaxy portal, find your planet, and click **Play**. The game loads in an iframe with the auth token automatically delivered.

## API Reference

### GalaxyAPI

| Method | Parameters | Description |
|--------|-----------|-------------|
| `save(data, callback?)` | `Dictionary`, optional `Callable` | Save game data to backend |
| `load(callback)` | `Callable(data: Dictionary)` | Load saved game data |
| `submit_score(data, callback?)` | `Dictionary{score: int, ...}`, optional `Callable` | Submit leaderboard score |
| `unlock_achievement(id, callback?)` | `String`, optional `Callable` | Unlock an achievement |
| `refresh_auth()` | none | Re-fetch auth token from JS bridge. Returns bool |

All methods are async. Pass an optional callback to receive the server response Dictionary (or `{}` on failure). Without a callback, the call is fire-and-forget.

### Error Handling

All API methods fail gracefully — they return empty `{}` if:
- The game is not running on Web export
- The auth token hasn't arrived yet
- The network request fails
- The user is not authenticated

Check the result in the callback:

```gdscript
GalaxyAPI.save(my_data, func(result):
    if result and not result.is_empty():
        print("Save successful!")
    else:
        print("Save failed or no auth")
)
```

## Export Options

Godot's Web export supports these relevant options:

| Option | Recommendation |
|--------|---------------|
| **Thread Support** | Off (causes issues in iframes without specific CORS headers) |
| **Extensions Support** | Off (unless you use GDExtensions compiled for Web) |
| **VRAM Texture Compression** | Desktop only (smaller exports) |
| **Custom HTML Shell** | `res://galaxy_template.html` (required for Galaxy integration) |

## Limitations

| Issue | Details |
|-------|---------|
| **C# games** | C# Godot 4 cannot export to Web. Use GDScript or Godot 3 |
| **File size** | Godot Web builds are 5-15MB compressed. The backend serves with cache headers |
| **Audio** | Use the default **Sample** playback mode (not Stream) for low latency |
| **Fullscreen** | Must be triggered by user input (click/key press) |
| **Persistence** | Browser IndexedDB stores `user://` files. Incognito mode may not persist |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Game doesn't load (blank iframe) | Check browser console (F12). Ensure `.wasm` and `.pck` files exist in the game directory |
| "Failed to load game" in loading screen | Verify the export paths. The `.wasm`, `.pck`, and `.js` files must be next to `index.html` |
| API calls return `{}` | Check if auth token is being sent: open dev tools, check Network tab for `Authorization` header |
| Game not appearing in galaxy | Check `manifest.json` is valid JSON. Restart backend or call `POST /api/games/rescan` |
| "No auth token" warning | Wait for the parent frame to deliver the token. The game retries automatically |
