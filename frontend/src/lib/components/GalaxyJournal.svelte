<script lang="ts">
  import {
    systems,
    games,
    discoveredGameIds,
    exploredCount,
    totalGameCount,
    currentSystemId,
    selectedPlanet,
    launchDiscoveredGame,
    nudgeGalaxyDiscovery,
    isGameDiscovered,
    newGameIds,
  } from '$lib/stores/galaxy';
  import {
    getPersonalBest,
    getSeasonInfo,
    readChallengeHistory,
  } from '$lib/stores/progression';
  import { play } from '$lib/audio';

  let { onLaunch }: { onLaunch?: () => void } = $props();

  let progressPct = $derived(
    $totalGameCount > 0 ? Math.round(($exploredCount / $totalGameCount) * 100) : 0
  );

  function systemProgress(sysId: string) {
    const inSystem = $games.filter((g) => g.solarSystemId === sysId);
    const discovered = inSystem.filter((g) => $discoveredGameIds.has(g.id)).length;
    return { discovered, total: inSystem.length };
  }

  function openGame(game: any) {
    if (!launchDiscoveredGame(game)) {
      onLaunch?.();
      play('cancel');
      return;
    }
    onLaunch?.();
    play('doorOpen');
  }

  function previewGame(game: any) {
    if (!isGameDiscovered(game.id)) {
      nudgeGalaxyDiscovery(game);
      onLaunch?.();
      play('cancel');
      return;
    }
    if (game.solarSystemId) currentSystemId.set(game.solarSystemId);
    selectedPlanet.set({ ...game });
    onLaunch?.();
    play('select');
  }

  const season = getSeasonInfo();
  let challengeHistory = $derived(readChallengeHistory());
</script>

<div class="journal-scroll">
  {#if $newGameIds.size > 0}
    <div class="journal-new-banner">
      <span class="new-banner-dot"></span>
      <span>{$newGameIds.size} new world{$newGameIds.size === 1 ? '' : 's'} in the galaxy</span>
    </div>
  {/if}

  <div class="journal-hero">
    <div class="progress-ring" style="--pct: {progressPct}">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle class="ring-bg" cx="24" cy="24" r="20" />
        <circle class="ring-fill" cx="24" cy="24" r="20" />
      </svg>
      <span class="progress-num">{progressPct}%</span>
    </div>
    <div class="journal-hero-text">
      <span class="journal-label">Galaxy explored</span>
      <span class="journal-stat">{$exploredCount} of {$totalGameCount} worlds visited</span>
    </div>
  </div>

  {#if season.active}
    <div class="season-banner">
      <span class="season-name">{season.name}</span>
      <span class="season-ends">{season.daysLeft} day{season.daysLeft === 1 ? '' : 's'} left this month</span>
    </div>
  {/if}

  {#if challengeHistory.length > 0}
    <div class="challenge-section">
      <span class="section-label">Recent challenges</span>
      {#each challengeHistory.slice(0, 3) as ch}
        <div class="challenge-row" class:won={ch.won}>
          <span class="ch-game">{ch.gameTitle || ch.gameId}</span>
          <span class="ch-result">{ch.won ? 'Won' : 'Lost'} · {ch.yourScore.toLocaleString()} vs {ch.challengerScore.toLocaleString()}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#each $systems as sys}
    {@const prog = systemProgress(sys.id)}
    {#if prog.total > 0}
      <div class="journal-system">
        <div class="journal-system-header">
          <span class="sys-dot" style="--sc: {sys.star?.starColor || '#ffcc44'}"></span>
          <span class="sys-name">{sys.name}</span>
          <span class="sys-prog">{prog.discovered}/{prog.total}</span>
        </div>
        <div class="sys-progress-track">
          <div
            class="sys-progress-fill"
            style="width: {prog.total ? (prog.discovered / prog.total) * 100 : 0}%"
          ></div>
        </div>
        <div class="journal-games">
          {#each $games.filter((g) => g.solarSystemId === sys.id) as game}
            {@const discovered = $discoveredGameIds.has(game.id)}
            {@const isNew = $newGameIds.has(game.id)}
            {@const best = discovered ? getPersonalBest(game.id) : null}
            <div class="journal-game" class:undiscovered={!discovered} class:is-new={isNew}>
              <span class="game-dot" style="background: {discovered ? game.planetColor || '#4488ff' : '#555570'}"></span>
              <div class="game-info">
                <span class="game-name">
                  {discovered ? game.title : 'Unknown world'}
                  {#if isNew}<span class="new-pill">NEW</span>{/if}
                </span>
                {#if discovered && game.difficulty}
                  <span class="game-meta">
                    {game.difficulty}
                    {#if best !== null} · Best {best.toLocaleString()}{/if}
                  </span>
                {/if}
              </div>
              <div class="game-actions">
                <button
                  class="action-btn"
                  class:disabled={!discovered}
                  onclick={() => previewGame(game)}
                  title={discovered ? 'Preview' : 'Discover in the galaxy first'}
                  disabled={!discovered}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </button>
                <button
                  class="action-btn primary"
                  class:disabled={!discovered}
                  onclick={() => openGame(game)}
                  title={discovered ? 'Launch' : 'Discover in the galaxy first'}
                  disabled={!discovered}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .journal-scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm) var(--space-md) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .journal-scroll::-webkit-scrollbar { width: 4px; }
  .journal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

  .journal-new-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: rgba(232, 168, 56, 0.1);
    border: 1px solid rgba(232, 168, 56, 0.22);
    font-size: var(--fs-xs);
    color: var(--accent);
    font-weight: 600;
  }

  .new-banner-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(232, 168, 56, 0.6);
    flex-shrink: 0;
  }

  .journal-hero {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: rgba(232, 168, 56, 0.06);
    border: 1px solid rgba(232, 168, 56, 0.15);
    border-radius: var(--radius-sm);
  }

  .progress-ring {
    position: relative;
    width: 52px;
    height: 52px;
    flex-shrink: 0;
  }

  .progress-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.06);
    stroke-width: 4;
  }

  .ring-fill {
    fill: none;
    stroke: var(--accent);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 125.6;
    stroke-dashoffset: calc(125.6 - (125.6 * var(--pct) / 100));
    transition: stroke-dashoffset 0.6s var(--ease-out);
  }

  .progress-num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
  }

  .journal-label {
    display: block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 2px;
  }

  .journal-stat {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-weight: 500;
  }

  .journal-system {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .journal-system-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--border);
  }

  .sys-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--sc);
    box-shadow: 0 0 6px color-mix(in srgb, var(--sc) 50%, transparent);
    flex-shrink: 0;
  }

  .sys-name {
    flex: 1;
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text);
  }

  .sys-prog {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .sys-progress-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.04);
  }

  .sys-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-dim), var(--accent));
    transition: width 0.4s var(--ease-out);
  }

  .journal-games {
    display: flex;
    flex-direction: column;
  }

  .journal-game {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px var(--space-md);
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    transition: background 0.15s var(--ease-out);
  }

  .journal-game:last-child {
    border-bottom: none;
  }

  .journal-game.undiscovered {
    opacity: 0.65;
  }

  .journal-game:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .game-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .game-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .game-name {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .journal-game:not(.undiscovered) .game-name {
    color: var(--text);
  }

  .new-pill {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(232, 168, 56, 0.18);
    color: var(--accent);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.4px;
    vertical-align: middle;
  }

  .journal-game.is-new {
    border-color: rgba(232, 168, 56, 0.2);
    background: rgba(232, 168, 56, 0.04);
  }

  .game-meta {
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .game-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s var(--ease-out);
    padding: 0;
  }

  .action-btn:hover {
    border-color: var(--border-hover);
    color: var(--text);
    background: rgba(255, 255, 255, 0.04);
  }

  .action-btn.primary {
    border-color: rgba(232, 168, 56, 0.25);
    color: var(--accent);
    background: rgba(232, 168, 56, 0.08);
  }

  .action-btn.primary:hover {
    background: rgba(232, 168, 56, 0.15);
  }

  .action-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    pointer-events: none;
  }

  .season-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    margin-bottom: var(--space-md);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(106, 140, 255, 0.25);
    background: rgba(106, 140, 255, 0.08);
    font-size: var(--fs-xs);
  }

  .season-name { font-weight: 700; color: var(--cyan); }
  .season-ends { color: var(--text-muted); font-size: 10px; }

  .challenge-section {
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.02);
  }

  .section-label {
    display: block;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
  }

  .challenge-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    font-size: 10px;
  }

  .challenge-row:last-child { border-bottom: none; }
  .challenge-row.won .ch-result { color: var(--success); }
  .ch-game { font-weight: 600; color: var(--text-secondary); }
  .ch-result { color: var(--text-muted); }
</style>
