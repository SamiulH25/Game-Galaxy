<script lang="ts">
  import { selectedPlanet, showGame } from '$lib/stores/galaxy';
  import { play } from '$lib/audio';

  let game = $state<any>(null);
  let visible = $state(false);
  let mounted = $state(false);

  $effect(() => {
    const g = $selectedPlanet;
    if (g) {
      game = g;
      mounted = true;
      requestAnimationFrame(() => { visible = true; });
    } else if (mounted) {
      visible = false;
    }
  });

  // Remove from DOM after CSS transition completes
  $effect(() => {
    if (!visible && game && mounted) {
      const t = setTimeout(() => {
        game = null;
        mounted = false;
      }, 250);
      return () => clearTimeout(t);
    }
  });

  let selectedScreenshot = $state<number>(0);

  function close() {
    visible = false;
    play('cancel');
    setTimeout(() => selectedPlanet.set(null), 250);
  }

  function launch() {
    if (game) {
      showGame.set({ ...game });
      close();
      play('doorOpen');
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  function thumbnailUrl(id: string | undefined, thumb: string | undefined): string | null {
    if (!id || !thumb) return null;
    if (thumb.startsWith('http')) return thumb;
    return `/games/${id}/${thumb}`;
  }

  function screenshotUrl(id: string | undefined, idx: number): string | null {
    if (!id || !game?.screenshots) return null;
    const s = game.screenshots[idx];
    if (!s) return null;
    if (s.startsWith('http')) return s;
    return `/games/${id}/${s}`;
  }

  const difficultyColor: Record<string, string> = {
    Easy: 'var(--accent-green)',
    Medium: 'var(--accent)',
    Hard: 'var(--accent-red)',
  };
</script>

<svelte:window onkeydown={onKeydown} />

{#if game}
  <div class="popup-overlay" class:visible role="dialog" aria-modal="true" tabindex="-1" onclick={close} onkeydown={(e) => e.key === 'Escape' && close()}>
    <div class="popup-backdrop" class:visible></div>
    <div class="popup-card" class:visible role="presentation" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <!-- Hero / Thumbnail -->
      <div class="popup-hero" style="--planet-color: {game.planetColor || '#4488ff'}">
        {#if thumbnailUrl(game.id, game.thumbnail)}
          <img src={thumbnailUrl(game.id, game.thumbnail)!} alt={game.title} class="popup-hero-img" loading="lazy" />
        {:else}
          <div class="popup-hero-placeholder">
            <div class="hero-planet-icon" style="--pcolor: {game.planetColor || '#4488ff'}"></div>
            <div class="hero-planet-ring" style="--pcolor: {game.planetColor || '#4488ff'}"></div>
            <span class="hero-planet-name">{game.planetName}</span>
          </div>
        {/if}
        <div class="popup-hero-gradient"></div>
      </div>

      <!-- Body -->
      <div class="popup-body">
        <div class="popup-header">
          <h2>{game.title}</h2>
          <div class="popup-badges">
            {#if game.difficulty}
              <span class="badge badge-difficulty" style="--badge-color: {difficultyColor[game.difficulty] || 'var(--accent)'}">
                {game.difficulty}
              </span>
            {/if}
            {#if game.genre}
              <span class="badge badge-genre">{game.genre}</span>
            {/if}
          </div>
        </div>

        {#if game.tags?.length}
          <div class="popup-tags">
            {#each game.tags as tag}
              <span class="tag">#{tag}</span>
            {/each}
          </div>
        {/if}

        <div class="popup-desc-container">
          <p class="popup-desc">{game.detailedDescription || game.description}</p>
        </div>

        {#if game.screenshots?.length}
          <div class="screenshot-gallery">
            <div class="screenshot-main">
              {#if screenshotUrl(game.id, selectedScreenshot)}
                <img src={screenshotUrl(game.id, selectedScreenshot)!} alt="Screenshot {selectedScreenshot + 1}" class="screenshot-img" loading="lazy" />
              {:else}
                <div class="screenshot-placeholder" style="--pcolor: {game.planetColor || '#4488ff'}">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M22 13l-4-4-6 6-3-3-5 5"/></svg>
                </div>
              {/if}
            </div>
            {#if game.screenshots.length > 1}
              <div class="screenshot-thumbnails">
                {#each game.screenshots as _, i}
                  <button
                    class="screenshot-thumb"
                    class:active={i === selectedScreenshot}
                    onclick={() => { selectedScreenshot = i; play('click'); }}
                  >
                    {#if screenshotUrl(game.id, i)}
                      <img src={screenshotUrl(game.id, i)!} alt="Thumb {i + 1}" loading="lazy" />
                    {:else}
                      <div class="thumb-placeholder" style="--pcolor: {game.planetColor || '#4488ff'}"></div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <div class="popup-meta">
          {#if game.solarSystemName}
            <div class="meta-item">
              <span class="meta-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              </span>
              <div class="meta-text">
                <span class="meta-label">System</span>
                <span class="meta-value">{game.solarSystemName}</span>
              </div>
            </div>
          {/if}
          {#if game.planetName}
            <div class="meta-item">
              <span class="meta-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/></svg>
              </span>
              <div class="meta-text">
                <span class="meta-label">Planet</span>
                <span class="meta-value">{game.planetName}</span>
              </div>
            </div>
          {/if}
          {#if game.controls}
            <div class="meta-item meta-item-wide">
              <span class="meta-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4"/></svg>
              </span>
              <div class="meta-text">
                <span class="meta-label">Controls</span>
                <span class="meta-value">{game.controls}</span>
              </div>
            </div>
          {/if}
        </div>

        <div class="popup-actions">
          <button class="btn btn-primary" onclick={launch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            Launch Game
          </button>
          <button class="btn btn-ghost" onclick={close}>Close</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .popup-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    opacity: 0;
    transition: opacity 0.2s ease-out;
  }
  .popup-overlay.visible { opacity: 1; }

  .popup-backdrop {
    position: absolute; inset: 0;
    background: rgba(4,4,18,0.85);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.2s var(--ease-out);
  }
  .popup-backdrop.visible { opacity: 1; }

  .popup-card {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    max-width: min(520px, 92vw);
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.25s ease-out, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .popup-card.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .popup-card::-webkit-scrollbar { width: 4px; }
  .popup-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  /* Hero */
  .popup-hero {
    position: relative;
    width: 100%;
    height: clamp(140px, 18vw, 200px);
    background: radial-gradient(ellipse at 30% 40%, color-mix(in srgb, var(--planet-color, #4488ff) 20%, transparent), transparent 70%),
                radial-gradient(ellipse at 70% 60%, color-mix(in srgb, var(--planet-color, #4488ff) 10%, transparent), transparent 60%);
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
  }
  .popup-hero-img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .popup-hero-placeholder {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .hero-planet-icon {
    width: 48px; height: 48px; border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--pcolor, #4488ff) 80%, #fff), var(--pcolor, #4488ff));
    box-shadow: 0 0 30px color-mix(in srgb, var(--pcolor, #4488ff) 30%, transparent);
  }
  .hero-planet-ring {
    position: absolute; top: 50%; left: 50%;
    width: 80px; height: 20px; margin: -10px 0 0 -40px;
    border: 2px solid color-mix(in srgb, var(--pcolor, #4488ff) 40%, transparent);
    border-radius: 50%; transform: rotateX(60deg);
  }
  .hero-planet-name {
    font-size: var(--fs-xs); color: var(--text-muted); letter-spacing: 2px;
    text-transform: uppercase; margin-top: 4px;
  }
  .popup-hero-gradient {
    position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
    background: linear-gradient(transparent, var(--surface));
  }

  /* Body */
  .popup-body {
    position: relative; z-index: 1;
    padding: 0 var(--space-lg) var(--space-lg);
    margin-top: -2px;
  }

  /* Header */
  .popup-header {
    display: flex; flex-direction: column; gap: 6px;
    padding-top: var(--space-md);
  }
  h2 {
    font-size: var(--fs-xl); font-weight: 700; color: var(--text);
    letter-spacing: -0.3px; line-height: 1.2;
  }
  .popup-badges {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .badge {
    font-size: 10px; font-weight: 700; letter-spacing: 0.8px;
    text-transform: uppercase; padding: 3px 10px; border-radius: 20px;
  }
  .badge-difficulty {
    background: color-mix(in srgb, var(--badge-color, var(--accent)) 15%, transparent);
    color: var(--badge-color, var(--accent));
    border: 1px solid color-mix(in srgb, var(--badge-color, var(--accent)) 25%, transparent);
  }
  .badge-genre {
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
    border: 1px solid rgba(255,255,255,0.06);
  }

  /* Tags */
  .popup-tags {
    display: flex; flex-wrap: wrap; gap: 4px;
    padding-top: var(--space-sm);
  }
  .tag {
    font-size: 10px; color: var(--text-muted);
    background: rgba(255,255,255,0.03);
    padding: 2px 8px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.04);
  }

  /* Description */
  .popup-desc-container {
    padding-top: var(--space-md);
  }
  .popup-desc {
    color: var(--text-secondary); font-size: var(--fs-sm);
    line-height: 1.7;
  }

  /* Screenshot Gallery */
  .screenshot-gallery {
    padding-top: var(--space-md);
    display: flex; flex-direction: column; gap: 8px;
  }
  .screenshot-main {
    width: 100%; aspect-ratio: 16/9;
    border-radius: var(--radius-sm); overflow: hidden;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.04);
  }
  .screenshot-img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .screenshot-placeholder, .thumb-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: color-mix(in srgb, var(--pcolor, #4488ff) 40%, rgba(255,255,255,0.2));
    background: radial-gradient(circle, color-mix(in srgb, var(--pcolor, #4488ff) 8%, transparent) 0%, transparent 70%);
  }
  .screenshot-thumbnails {
    display: flex; gap: 6px;
  }
  .screenshot-thumb {
    width: 60px; height: 40px; border-radius: 4px; overflow: hidden;
    cursor: pointer; border: 2px solid transparent;
    background: rgba(0,0,0,0.3); padding: 0;
    transition: border-color 0.15s var(--ease-out);
  }
  .screenshot-thumb img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .screenshot-thumb.active {
    border-color: var(--accent);
  }
  .screenshot-thumb:not(.active):hover {
    border-color: rgba(255,255,255,0.15);
  }

  /* Meta Grid */
  .popup-meta {
    padding-top: var(--space-md);
    display: flex; flex-direction: column; gap: 10px;
  }
  .meta-item {
    display: flex; align-items: flex-start; gap: 10px;
  }
  .meta-icon {
    flex-shrink: 0; width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--radius-xs);
    background: rgba(255,255,255,0.03);
    color: var(--text-muted);
  }
  .meta-text {
    display: flex; flex-direction: column; gap: 1px;
    min-width: 0;
  }
  .meta-label {
    font-size: 10px; font-weight: 600; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1.2px;
  }
  .meta-value {
    font-size: var(--fs-xs); color: var(--text-secondary);
    line-height: 1.5;
  }

  /* Actions */
  .popup-actions {
    padding-top: var(--space-lg);
    display: flex; gap: var(--space-sm);
  }
  .btn {
    padding: clamp(8px, 0.7vw, 12px) clamp(16px, 1.5vw, 26px);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm); font-weight: 600; cursor: pointer;
    border: none; font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 40px;
    transition: background 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
  }
  .btn-primary {
    background: var(--accent); color: var(--bg-deepest);
    flex: 1; display: flex; align-items: center; justify-content: center;
    gap: 6px;
  }
  .btn-primary:hover {
    background: #f0b848;
    box-shadow: 0 4px 20px rgba(232,168,56,0.25);
  }
  .btn-ghost {
    background: transparent; color: var(--text-muted);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover {
    color: var(--text-secondary);
    border-color: var(--border-hover);
    background: rgba(255,255,255,0.02);
  }
</style>
