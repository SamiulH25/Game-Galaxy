<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { selectedPlanet, showGame, buildShareUrl } from '$lib/stores/galaxy';
  import { isAuthenticated } from '$lib/stores/auth';
  import { fetchLeaderboard } from '$lib/api';
  import { getPersonalBest, getDailyMission, isDailyMissionForGame, isDailyMissionComplete } from '$lib/stores/progression';
  import { lastPlayedGame } from '$lib/stores/galaxy';
  import { play } from '$lib/audio';
  import { lockBodyScroll } from '$lib/stores/viewport';
  import { trapFocus } from '$lib/utils/focusTrap';
  import { isGameDiscovered } from '$lib/stores/galaxy';

  let game = $state<any>(null);
  let visible = $state(false);
  let mounted = $state(false);
  let lbLoading = $state(false);
  let lbError = $state(false);
  let lbEntries = $state<{ rank: number; username: string; score: number | null }[]>([]);
  let lbTotal = $state(0);
  let userRank = $state<number | null>(null);
  let userBest = $state<number | null>(null);
  let isNewDiscovery = $state(false);
  let shareChallenge = $state<number | null>(null);
  let shareCopied = $state(false);
  let localBest = $state<number | null>(null);
  let popupDialogEl = $state<HTMLElement | null>(null);

  let discoveryLabel = $derived.by(() => {
    if (!game?.id) return 'Planet preview';
    if (isNewDiscovery) return 'New discovery';
    return isGameDiscovered(game.id) ? 'Discovered' : 'Undiscovered — click in galaxy to chart';
  });

  let dailyMission = $derived(getDailyMission());
  let isTodaysMission = $derived(game?.id ? isDailyMissionForGame(game.id) : false);
  let missionDone = $derived(isDailyMissionComplete());

  const PLAY_TIME: Record<string, string> = {
    Easy: '5–10 min',
    Medium: '10–20 min',
    Hard: '20+ min',
  };

  function estimatePlayTime(g: any): string {
    return g?.estimatedTime || PLAY_TIME[g?.difficulty] || '10–15 min';
  }

  function scoreFromEntry(entry: any): number | null {
    const raw = entry?.score_data?.score;
    return typeof raw === 'number' ? raw : null;
  }

  async function loadLeaderboardPreview(gameId: string) {
    lbLoading = true;
    lbEntries = [];
    lbTotal = 0;
    userRank = null;
    userBest = null;
    lbError = false;
    try {
      const data = await fetchLeaderboard(gameId, 'best', 5);
      lbEntries = (data.entries || []).map((e: any) => ({
        rank: e.rank,
        username: e.username,
        score: scoreFromEntry(e),
      }));
      lbTotal = data.total || 0;
      userRank = data.user_rank ?? null;
      userBest = scoreFromEntry(data.user_entry);
    } catch {
      lbError = true;
    }
    lbLoading = false;
  }

  $effect(() => {
    const g = $selectedPlanet;
    if (g) {
      game = g;
      mounted = true;
      isNewDiscovery = !!(g as { __newDiscovery?: boolean }).__newDiscovery;
      const challenge = (g as { __shareChallenge?: number }).__shareChallenge;
      shareChallenge = typeof challenge === 'number' && !Number.isNaN(challenge) ? challenge : null;
      shareCopied = false;
      selectedScreenshot = 0;
      localBest = getPersonalBest(g.id);
      requestAnimationFrame(() => { visible = true; });
      loadLeaderboardPreview(g.id);
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

  $effect(() => {
    if (!visible) return;
    return lockBodyScroll();
  });

  $effect(() => {
    if (!visible || !popupDialogEl) return;
    return trapFocus(popupDialogEl);
  });

  let selectedScreenshot = $state<number>(0);

  function close() {
    visible = false;
    play('cancel');
    setTimeout(() => selectedPlanet.set(null), 250);
  }

  function launch() {
    if (game) {
      const payload = { ...game };
      if (shareChallenge !== null) payload.__shareChallenge = shareChallenge;
      const dailyMission = (game as { __dailyMission?: number }).__dailyMission;
      if (typeof dailyMission === 'number') payload.__dailyMission = dailyMission;
      showGame.set(payload);
      close();
      play('doorOpen');
    }
  }

  async function copyShareLink() {
    if (!game?.id || typeof window === 'undefined') return;
    const challenge = userBest ?? shareChallenge;
    const url = buildShareUrl(game.id, challenge);
    try {
      await navigator.clipboard.writeText(url);
      shareCopied = true;
      play('chime');
      setTimeout(() => { shareCopied = false; }, 2200);
    } catch {
      play('cancel');
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
  <div
    class="popup-overlay"
    class:visible
    role="dialog"
    aria-modal="true"
    aria-label="{game.title} — {discoveryLabel}"
    bind:this={popupDialogEl}
    tabindex="-1"
    onclick={close}
    onkeydown={(e) => e.key === 'Escape' && close()}
  >
    <div class="popup-backdrop" class:visible></div>
    <div class="popup-card" class:visible role="presentation" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
      <div class="sheet-handle" aria-hidden="true"></div>
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
          {#if isNewDiscovery}
            <span class="discovery-badge" in:fly={{ y: -8, duration: 300 }}>New discovery</span>
          {/if}
          {#if shareChallenge !== null}
            <span class="challenge-badge" in:fly={{ y: -8, duration: 300 }}>
              Challenge: beat {shareChallenge.toLocaleString()}
            </span>
          {/if}
          {#if isTodaysMission && dailyMission && !missionDone}
            <span class="daily-badge" in:fly={{ y: -8, duration: 300 }}>
              Daily mission: score {dailyMission.targetScore.toLocaleString()}+
            </span>
          {/if}
          <h2>{game.title}</h2>
          {#if lbTotal > 0 && !lbLoading}
            <p class="social-proof">{lbTotal} pilot{lbTotal === 1 ? '' : 's'} on the board</p>
          {/if}
          <p class="how-to-play">{game.description}</p>
          <div class="popup-quick-stats">
            {#if game.difficulty}
              <span class="quick-stat">
                <span class="quick-stat-label">Difficulty</span>
                <span class="quick-stat-value" style="color: {difficultyColor[game.difficulty] || 'var(--accent)'}">{game.difficulty}</span>
              </span>
            {/if}
            <span class="quick-stat">
              <span class="quick-stat-label">Play time</span>
              <span class="quick-stat-value">{estimatePlayTime(game)}</span>
            </span>
            {#if game.genre}
              <span class="quick-stat">
                <span class="quick-stat-label">Genre</span>
                <span class="quick-stat-value">{game.genre.split(',')[0].trim()}</span>
              </span>
            {/if}
          </div>
        </div>

        {#if $isAuthenticated && userBest !== null}
          <div class="personal-best">
            <span class="pb-label">Your best</span>
            <span class="pb-value">{userBest.toLocaleString()}</span>
            {#if userRank}
              <span class="pb-rank">Rank #{userRank}</span>
            {/if}
          </div>
        {:else if localBest !== null}
          <div class="personal-best guest-best">
            <span class="pb-label">Local best</span>
            <span class="pb-value">{localBest.toLocaleString()}</span>
            <span class="pb-rank">Sign in to sync</span>
          </div>
        {/if}

        {#if $lastPlayedGame?.id === game.id}
          <p class="last-played-hint">Last played {new Date($lastPlayedGame.playedAt).toLocaleDateString()}</p>
        {/if}

        <div class="leaderboard-preview">
          <div class="lb-header">
            <span class="lb-title">Top pilots</span>
            {#if lbTotal > 0}
              <span class="lb-count">{lbTotal} entries</span>
            {/if}
          </div>
          {#if lbLoading}
            <p class="lb-empty">Loading scores…</p>
          {:else if lbError}
            <p class="lb-empty lb-offline">Scores offline — sign in and retry when connected.</p>
          {:else if lbEntries.length > 0}
            <ol class="lb-list">
              {#each lbEntries as entry}
                <li class="lb-row">
                  <span class="lb-rank">#{entry.rank}</span>
                  <span class="lb-name">{entry.username}</span>
                  <span class="lb-score">{entry.score !== null ? entry.score.toLocaleString() : '—'}</span>
                </li>
              {/each}
            </ol>
          {:else}
            <p class="lb-empty">Be the first on the board — launch and set a score.</p>
          {/if}
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
            Launch
          </button>
          <button class="btn btn-ghost" onclick={copyShareLink} title="Copy share link">
            {shareCopied ? 'Copied!' : 'Share'}
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

  .discovery-badge {
    align-self: flex-start;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--cyan);
    background: rgba(56, 200, 232, 0.1);
    border: 1px solid rgba(56, 200, 232, 0.22);
    padding: 4px 10px;
    border-radius: 100px;
    margin-bottom: 2px;
  }

  .challenge-badge {
    align-self: flex-start;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: var(--accent);
    background: rgba(232, 168, 56, 0.1);
    border: 1px solid rgba(232, 168, 56, 0.28);
    padding: 4px 10px;
    border-radius: 100px;
    margin-bottom: 2px;
  }

  .daily-badge {
    align-self: flex-start;
    font-size: 9px;
    font-weight: 700;
    color: var(--cyan);
    background: rgba(56, 200, 232, 0.08);
    border: 1px solid rgba(56, 200, 232, 0.25);
    padding: 4px 10px;
    border-radius: 100px;
    margin-bottom: 2px;
  }

  .social-proof {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .how-to-play {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    line-height: 1.45;
    margin-top: var(--space-xs);
  }

  .last-played-hint {
    font-size: 10px;
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
  }

  .guest-best .pb-rank {
    color: var(--cyan);
  }

  h2 {
    font-size: var(--fs-xl); font-weight: 700; color: var(--text);
    letter-spacing: -0.3px; line-height: 1.2;
  }

  .popup-quick-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding-top: var(--space-sm);
  }

  .quick-stat {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    min-width: 72px;
  }

  .quick-stat-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .quick-stat-value {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .personal-best {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(232, 168, 56, 0.06);
    border: 1px solid rgba(232, 168, 56, 0.15);
    border-radius: var(--radius-sm);
  }

  .pb-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--accent);
  }

  .pb-value {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .pb-rank {
    margin-left: auto;
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .leaderboard-preview {
    margin-top: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .lb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-xs);
  }

  .lb-title {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .lb-count {
    font-size: 9px;
    color: var(--text-muted);
  }

  .lb-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lb-row {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: var(--fs-xs);
    padding: 4px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  }

  .lb-row:last-child {
    border-bottom: none;
  }

  .lb-rank {
    font-weight: 700;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .lb-name {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lb-score {
    font-weight: 600;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .lb-empty {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    line-height: 1.5;
    padding: 4px 0;
  }

  .lb-offline {
    color: var(--text-secondary);
    font-style: italic;
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

  .sheet-handle {
    display: none;
  }

  @media (max-width: 640px) {
    .popup-overlay {
      align-items: flex-end;
      justify-content: stretch;
      padding: 0;
    }

    .popup-card {
      max-width: none;
      width: 100%;
      max-height: 94dvh;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      border-bottom: none;
      transform: translateY(100%);
    }

    .popup-card.visible {
      transform: translateY(0);
    }

    .sheet-handle {
      display: block;
      width: 40px;
      height: 4px;
      margin: 10px auto 0;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.18);
      flex-shrink: 0;
    }

    .popup-body {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .popup-actions {
      flex-direction: column;
      position: sticky;
      bottom: 0;
      background: linear-gradient(transparent, var(--surface) 12%);
      padding-top: var(--space-md);
      padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
    }

    .btn {
      min-height: 44px;
      width: 100%;
    }

    .btn-primary {
      order: -1;
    }
  }
</style>
