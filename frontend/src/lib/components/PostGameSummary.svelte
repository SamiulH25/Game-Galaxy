<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import {
    sessionSummary,
    showGame,
    selectedPlanet,
    showAuth,
    games,
    discoveredGameIds,
    nudgeGalaxyDiscovery,
    isGameDiscovered,
    type SessionSummary,
  } from '$lib/stores/galaxy';
  import { isAuthenticated } from '$lib/stores/auth';
  import { fetchLeaderboard } from '$lib/api';
  import { play } from '$lib/audio';
  import { goto } from '$app/navigation';

  let summary = $derived($sessionSummary);
  let lbEntries = $state<{ rank: number; username: string; score: number | null }[]>([]);
  let lbLoading = $state(false);

  function findSimilar(game: any) {
    const tags = new Set(game.tags || []);
    const primaryGenre = game.genre?.split(',')[0]?.trim();
    const scored = $games
      .filter((g) => g.id !== game.id)
      .map((g) => {
        let score = 0;
        (g.tags || []).forEach((t: string) => { if (tags.has(t)) score += 2; });
        if (primaryGenre && g.genre?.includes(primaryGenre)) score += 3;
        if (g.solarSystemId === game.solarSystemId) score += 1;
        if (!$discoveredGameIds.has(g.id)) score += 1;
        return { g, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.g || $games.find((g) => g.id !== game.id && g.solarSystemId === game.solarSystemId) || null;
  }

  let recommendedGame = $derived(summary?.game ? findSimilar(summary.game) : null);
  let recIsDiscovered = $derived(
    recommendedGame ? $discoveredGameIds.has(recommendedGame.id) : false
  );

  $effect(() => {
    const s = summary;
    if (!s?.game?.id) {
      lbEntries = [];
      return;
    }
    lbLoading = true;
    fetchLeaderboard(s.game.id, 'best', 5)
      .then((data) => {
        lbEntries = (data.entries || []).map((e: any) => ({
          rank: e.rank,
          username: e.username,
          score: e.score_data?.score ?? null,
        }));
      })
      .catch(() => { lbEntries = []; })
      .finally(() => { lbLoading = false; });
  });

  function formatDuration(ms: number): string {
    const sec = Math.max(1, Math.round(ms / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
  }

  function formatScore(score: number | null): string {
    if (score === null) return '—';
    return score.toLocaleString();
  }

  function dismiss() {
    sessionSummary.set(null);
    play('click');
  }

  function playAgain() {
    if (!summary) return;
    sessionSummary.set(null);
    showGame.set({ ...summary.game });
    play('doorOpen');
  }

  function tryRecommended() {
    if (!recommendedGame) return;
    sessionSummary.set(null);
    if (!isGameDiscovered(recommendedGame.id)) {
      nudgeGalaxyDiscovery(recommendedGame);
      play('select');
      return;
    }
    selectedPlanet.set({ ...recommendedGame });
    play('select');
  }

  function openLeaderboard() {
    const gameId = summary?.game?.id;
    dismiss();
    play('select');
    goto(gameId ? `/account?tab=leaderboards&game=${gameId}` : '/account?tab=leaderboards');
  }

  function signIn() {
    dismiss();
    showAuth.set(true);
    play('click');
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') dismiss();
  }

  function outcomeLabel(s: SessionSummary): string {
    if (s.won === true) return 'Mission Complete';
    if (s.won === false) return 'Run Complete';
    return 'Session Complete';
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if summary}
  <div class="summary-overlay" transition:fade={{ duration: 220 }} role="dialog" aria-modal="true">
    <button class="summary-backdrop" aria-label="Close" onclick={dismiss}></button>

    <div
      class="summary-card"
      class:is-win={summary.won === true}
      transition:fly={{ y: 20, duration: 350, easing: (t) => 1 - Math.pow(1 - t, 3) }}
    >
      <div class="summary-glow" aria-hidden="true"></div>

      <div class="summary-header">
        <span class="summary-badge">{outcomeLabel(summary)}</span>
        <h2>{summary.game.title}</h2>
        <span class="summary-meta">{formatDuration(summary.durationMs)} played</span>
      </div>

      <div class="summary-stats">
        {#if summary.dailyMissionTarget != null && summary.dailyMissionBeat !== null}
          <div class="mission-banner" class:mission-win={summary.dailyMissionBeat}>
            {#if summary.dailyMissionBeat}
              Daily mission complete — you beat {summary.dailyMissionTarget.toLocaleString()}!
            {:else}
              Daily mission: needed {summary.dailyMissionTarget.toLocaleString()}+
            {/if}
          </div>
        {/if}
        {#if summary.challengeTarget != null && summary.challengeBeat !== null}
          <div class="mission-banner" class:mission-win={summary.challengeBeat}>
            {#if summary.challengeBeat}
              Challenge cleared — you beat {summary.challengeTarget.toLocaleString()}!
            {:else}
              Challenge missed — target was {summary.challengeTarget.toLocaleString()}
            {/if}
          </div>
        {/if}
        {#if summary.score !== null}
          <div class="stat-block">
            <span class="stat-label">Score</span>
            <span class="stat-value">{formatScore(summary.score)}</span>
            {#if summary.isPersonalBest}
              <span class="stat-tag">Personal best</span>
            {/if}
          </div>
        {/if}
        {#if summary.rank}
          <div class="stat-block">
            <span class="stat-label">Galaxy rank</span>
            <span class="stat-value">#{summary.rank}</span>
            {#if summary.rankDelta && summary.rankDelta > 0}
              <span class="stat-tag rank-up">↑ {summary.rankDelta} places</span>
            {/if}
          </div>
        {/if}
        {#if summary.achievements.length > 0}
          <div class="stat-block stat-block-wide">
            <span class="stat-label">Unlocked</span>
            <div class="ach-list">
              {#each summary.achievements as ach}
                <span class="ach-chip">{ach.title}</span>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      {#if lbLoading || lbEntries.length > 0}
        <div class="mini-leaderboard">
          <span class="lb-title">Leaderboard</span>
          {#if lbLoading}
            <p class="lb-empty">Loading…</p>
          {:else}
            <ol class="lb-list">
              {#each lbEntries as entry}
                <li class="lb-row" class:is-you={$isAuthenticated && entry.rank === summary.rank}>
                  <span class="lb-rank">#{entry.rank}</span>
                  <span class="lb-name">{entry.username}</span>
                  <span class="lb-score">{entry.score !== null ? entry.score.toLocaleString() : '—'}</span>
                </li>
              {/each}
            </ol>
          {/if}
        </div>
      {/if}

      {#if recommendedGame}
        <div class="recommendation">
          <span class="rec-label">You might also like</span>
          <span class="rec-game">{recIsDiscovered ? recommendedGame.title : '???'}</span>
        </div>
      {/if}

      {#if !$isAuthenticated && summary.hadPendingGuest}
        <div class="summary-nudge sync-nudge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          </svg>
          <span>Sign in now to keep this session's score and achievements.</span>
        </div>
      {:else if !$isAuthenticated && (summary.score !== null || summary.achievements.length > 0)}
        <div class="summary-nudge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          </svg>
          <span>Sign in to keep your score and achievements across devices.</span>
        </div>
      {/if}

      <div class="summary-actions">
        <button class="action primary" onclick={playAgain}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          Play again
        </button>
        {#if recommendedGame}
          <button class="action" onclick={tryRecommended}>
            {recIsDiscovered ? `Try ${recommendedGame.title}` : 'Find in galaxy'}
          </button>
        {/if}
        {#if summary.rank || lbEntries.length > 0}
          <button class="action" onclick={openLeaderboard}>Full leaderboard</button>
        {/if}
        {#if !$isAuthenticated}
          <button class="action accent" onclick={signIn}>Sign in to save</button>
        {:else}
          <button class="action ghost" onclick={dismiss}>Explore galaxy</button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .summary-overlay {
    position: fixed;
    inset: 0;
    z-index: 250;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }

  .summary-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 4, 18, 0.82);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: none;
    cursor: pointer;
  }

  .summary-card {
    position: relative;
    width: min(440px, 94vw);
    max-height: 90vh;
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    z-index: 1;
  }

  .summary-card.is-win {
    border-color: rgba(56, 200, 120, 0.25);
    box-shadow: var(--shadow-lg), 0 0 50px rgba(56, 200, 120, 0.08);
  }

  .summary-glow {
    position: absolute;
    top: -40%;
    left: 50%;
    width: 120%;
    height: 60%;
    transform: translateX(-50%);
    background: radial-gradient(ellipse, rgba(232, 168, 56, 0.1) 0%, transparent 70%);
    pointer-events: none;
  }

  .summary-card.is-win .summary-glow {
    background: radial-gradient(ellipse, rgba(56, 200, 120, 0.12) 0%, transparent 70%);
  }

  .summary-header {
    position: relative;
    text-align: center;
    margin-bottom: var(--space-md);
  }

  .summary-badge {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
    background: rgba(232, 168, 56, 0.1);
    border: 1px solid rgba(232, 168, 56, 0.2);
    padding: 4px 12px;
    border-radius: 100px;
    margin-bottom: var(--space-sm);
  }

  .summary-card.is-win .summary-badge {
    color: var(--success);
    background: var(--success-bg);
    border-color: var(--success-border);
  }

  h2 {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }

  .summary-meta {
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .summary-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .stat-block {
    flex: 1;
    min-width: 120px;
    padding: var(--space-sm) var(--space-md);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-block-wide { flex: 1 1 100%; }

  .mission-banner {
    flex: 1 1 100%;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 600;
    text-align: center;
    background: rgba(232, 80, 80, 0.08);
    border: 1px solid rgba(232, 80, 80, 0.2);
    color: var(--text-secondary);
  }

  .mission-banner.mission-win {
    background: var(--success-bg);
    border-color: var(--success-border);
    color: var(--success);
  }

  .sync-nudge {
    border-color: rgba(56, 200, 232, 0.25);
    background: rgba(56, 200, 232, 0.06);
  }

  .stat-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .stat-value {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .stat-tag {
    font-size: 9px;
    font-weight: 600;
    color: var(--success);
    margin-top: 2px;
  }

  .stat-tag.rank-up {
    color: var(--cyan);
  }

  .ach-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .ach-chip {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(232, 168, 56, 0.1);
    border: 1px solid rgba(232, 168, 56, 0.18);
    padding: 3px 8px;
    border-radius: 100px;
  }

  .mini-leaderboard {
    margin-bottom: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .lb-title {
    display: block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .lb-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .lb-row {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    gap: 8px;
    font-size: var(--fs-xs);
    padding: 3px 0;
  }

  .lb-row.is-you {
    color: var(--accent);
    font-weight: 600;
  }

  .lb-rank {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .lb-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
  }

  .lb-row.is-you .lb-name { color: var(--accent); }

  .lb-score {
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }

  .lb-empty {
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .recommendation {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    margin-bottom: var(--space-md);
    background: rgba(168, 120, 255, 0.06);
    border: 1px solid rgba(168, 120, 255, 0.15);
    border-radius: var(--radius-sm);
  }

  .rec-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .rec-game {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text);
  }

  .summary-nudge {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: var(--space-sm) var(--space-md);
    background: rgba(56, 200, 232, 0.06);
    border: 1px solid rgba(56, 200, 232, 0.15);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: var(--space-md);
  }

  .summary-nudge svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: var(--cyan);
  }

  .summary-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px var(--space-md);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-secondary);
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), color 0.15s var(--ease-out);
    min-height: 44px;
  }

  .action:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: var(--border-hover);
    color: var(--text);
  }

  .action.primary {
    background: linear-gradient(135deg, var(--accent), #d4952e);
    border-color: transparent;
    color: var(--bg-deepest);
    box-shadow: 0 4px 16px rgba(232, 168, 56, 0.25);
  }

  .action.primary:hover {
    box-shadow: 0 6px 24px rgba(232, 168, 56, 0.35);
    color: var(--bg-deepest);
  }

  .action.accent {
    border-color: rgba(56, 200, 232, 0.25);
    color: var(--cyan);
    background: rgba(56, 200, 232, 0.06);
  }

  .action.ghost {
    background: transparent;
    color: var(--text-muted);
    border-color: transparent;
  }

  @media (max-width: 640px) {
    .summary-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .summary-card {
      width: 100%;
      max-width: none;
      max-height: 88vh;
      max-height: 88dvh;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      padding: var(--space-md) var(--space-lg);
      padding-bottom: max(var(--space-lg), env(safe-area-inset-bottom, 0px));
    }

    .summary-card::before {
      content: '';
      display: block;
      width: 36px;
      height: 4px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      margin: 0 auto var(--space-sm);
    }

    .summary-actions .action {
      min-height: 44px;
    }
  }
</style>
