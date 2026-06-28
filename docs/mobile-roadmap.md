# Game Galaxy — Mobile UX Roadmap

Long-horizon plan for making the shell feel native on phones and tablets.

**North star:** A player on a phone can discover, preview, launch, and return — without precision taps, overlapping UI, or lost scroll position.

---

## Done (M1–M6)

### M1 — Mobile shell
- [x] Viewport store, bottom bar, side panel bottom sheet, scroll lock, PWA viewport, layout tokens

### M2 — Galaxy interaction
- [x] One-finger orbit drag (rotate camera)
- [x] Double-tap planet → launch (setting: **Double-tap Launch**)
- [x] Haptic feedback on discovery / rank-up / system charted
- [x] Mobile auto-detect: lower star density, fewer sprites
- [x] **Tap to enable sound** banner (coarse pointer / iOS)

### M3 — Game session
- [x] Optional auto-fullscreen on mobile launch (**Mobile Fullscreen** setting)
- [x] Swipe-down on game header to close
- [x] Orientation hint for engine (WASM/Godot) games in portrait
- [x] Visual viewport resize — iframe overlay tracks URL bar
- [x] `touch-action: manipulation` on game iframe wrapper

### M4 — Navigation & IA
- [x] System picker full-screen sheet on mobile
- [x] Welcome bar compact **Continue** chip on mobile when last game exists
- [x] Pull-to-refresh guard (`overscroll-behavior-y: none`)
- [x] Account + About: sticky nav, 48px tap targets
- [x] Side panel swipe-down to dismiss

### M5 — Performance & offline
- [x] Lazy-init Three.js on mobile until hero dismiss / sign-in
- [x] Service worker caches shell + `/games/` assets
- [x] Connection quality hint (slow / offline banner)
- [x] `prefers-reduced-data` disables nebula/sprites by default

### M6 — Polish & a11y
- [x] Focus trap on panel, popup, auth modal
- [x] Screen reader labels for planet discovery state
- [x] High contrast mode toggle
- [x] Tablet layout (`641px–1024px`) — narrower panel column

---

## Testing checklist (run on real devices)

| Device / browser | Galaxy tap | Panel sheet | Game fullscreen | Safe area |
|------------------|------------|-------------|-----------------|-----------|
| iOS Safari       |            |             |                 |           |
| Android Chrome   |            |             |                 |           |
| iPad Safari      |            |             |                 |           |

---

## CSS conventions

- Use `--chrome-top` / `--chrome-bottom` for fixed UI
- Mobile-only: `@media (max-width: 640px)` or `MobileBottomBar`
- Desktop-only: class `desktop-only`
- Prefer `dvh`; pad with `env(safe-area-inset-*)`

## New settings (Explorer → Settings)

| Setting | Default (mobile) |
|---------|------------------|
| Double-tap Launch | Off |
| Mobile Fullscreen | Off |
| Haptic Feedback | On |
| High Contrast | Off |
