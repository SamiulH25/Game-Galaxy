# games/

Every folder here with a `game.json` is a planet in the galaxy. Files are served live from
disk at `/g/<folder>/…`, so adding or editing a game needs no rebuild or restart.

- `systems.json` — the star systems games can belong to.
- `<id>/game.json` — the game's manifest (see `docs/GAMES.md`).
- `<id>/index.html` — the entry page; include `<script src="/sdk/galaxy.js"></script>`.

Folders starting with `_` or `.` are ignored (use `_archive/` for drafts or old games).

Create a new game from the template:

```bash
npm run new-game -- my-game --title "My Game" --system aurora
```
