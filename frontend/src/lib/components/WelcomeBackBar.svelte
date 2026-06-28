<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import {
    hasPlayedGame,
    lastPlayedGame,
    exploredCount,
    totalGameCount,
    launchDiscoveredGame,
    games,
    getVisitStreak,
    getExplorerRank,
    getDailyPlanet,
    focusDailyPlanet,
    isGameDiscovered,
  } from '$lib/stores/galaxy';
  import { getDailyMission, isDailyMissionComplete } from '$lib/stores/progression';
  import { isAuthenticated, user } from '$lib/stores/auth';
  import { viewport } from '$lib/stores/viewport';
  import { play } from '$lib/audio';

  let streak = $state(0);

  $effect(() => {
    if ($hasPlayedGame) streak = getVisitStreak();
  });

  let showBar = $derived($hasPlayedGame && ($lastPlayedGame || $exploredCount > 0));
  let greeting = $derived($isAuthenticated && $user?.username ? $user.username : 'Explorer');
  let rank = $derived(getExplorerRank($exploredCount, $totalGameCount, $hasPlayedGame));
  let dailyPlanet = $derived(getDailyPlanet($games));
  let dailyDiscovered = $derived(dailyPlanet ? isGameDiscovered(dailyPlanet.id) : false);
  let dailyMission = $derived(getDailyMission());
  let missionDone = $derived(isDailyMissionComplete());
  let compactMode = $derived($viewport.mobile && $lastPlayedGame);

  function continueLastGame() {
    const last = $lastPlayedGame;
    if (!last) return;
    const full = $games.find((g) => g.id === last.id);
    if (full && launchDiscoveredGame(full)) play('doorOpen');
  }

  function goDailyPlanet() {
    if (!dailyPlanet) return;
    if (focusDailyPlanet()) play('select');
  }

  function formatLastPlayed(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }
</script>

{#if showBar}
  <div class="welcome-bar" class:compact={compactMode} transition:fly={{ y: -12, duration: 350, easing: (t) => 1 - Math.pow(1 - t, 3) }}>
    <div class="welcome-inner">
      {#if !compactMode}
      <div class="welcome-stats">
        <span class="welcome-greeting">Welcome back, <strong>{greeting}</strong></span>
        <span class="welcome-divider" aria-hidden="true">·</span>
        {#if streak > 1}
          <span class="welcome-streak">{streak}-day streak</span>
          <span class="welcome-divider" aria-hidden="true">·</span>
        {:else if streak === 1}
          <span class="welcome-streak">Playing today</span>
          <span class="welcome-divider" aria-hidden="true">·</span>
        {/if}
        <span class="welcome-explored">{$exploredCount}/{$totalGameCount} explored</span>
        <span class="welcome-divider" aria-hidden="true">·</span>
        <span class="welcome-rank" title={rank.nextTitle && rank.remaining ? `${rank.remaining} more to ${rank.nextTitle}` : rank.title}>{rank.title}</span>
      </div>
      {/if}

      <div class="welcome-actions">
        {#if compactMode && $lastPlayedGame}
        <button class="continue-btn continue-btn-compact" onclick={continueLastGame}>
          <span class="continue-dot" style="--pcolor: {$lastPlayedGame.planetColor || '#4488ff'}"></span>
          <span class="continue-text">
            <span class="continue-label">Continue</span>
            <span class="continue-game">{$lastPlayedGame.title}</span>
          </span>
          <svg class="continue-arrow" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>
        {:else}
        {#if dailyPlanet}
          <button class="daily-btn" onclick={goDailyPlanet} title="Today's highlighted planet">
            <span class="daily-label">{missionDone ? 'Daily ✓' : 'Daily'}</span>
            <span class="daily-game">
              {dailyDiscovered ? dailyPlanet.title : '???'}
              {#if dailyMission && !missionDone}
                <span class="daily-target"> · {dailyMission.targetScore.toLocaleString()}+</span>
              {/if}
            </span>
          </button>
        {/if}

        {#if $lastPlayedGame}
        <button class="continue-btn" onclick={continueLastGame}>
          <span class="continue-dot" style="--pcolor: {$lastPlayedGame.planetColor || '#4488ff'}"></span>
          <span class="continue-text">
            <span class="continue-label">Continue</span>
            <span class="continue-game">{$lastPlayedGame.title}</span>
          </span>
          <span class="continue-time">{formatLastPlayed($lastPlayedGame.playedAt)}</span>
          <svg class="continue-arrow" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21"/>
          </svg>
        </button>
        {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .welcome-bar {
    position: fixed;
    top: clamp(52px, 5.5vw, 68px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 18;
    width: min(900px, calc(100vw - 2 * var(--space-lg)));
    pointer-events: none;
  }

  .welcome-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: 8px 12px 8px 16px;
    background: rgba(8, 8, 28, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: var(--radius-md);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
  }

  .welcome-stats {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .welcome-greeting strong {
    color: var(--accent);
    font-weight: 700;
  }

  .welcome-divider {
    opacity: 0.35;
  }

  .welcome-streak {
    color: var(--cyan);
    font-weight: 600;
  }

  .welcome-explored {
    color: var(--text-secondary);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .welcome-rank {
    color: var(--accent);
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .welcome-actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
  }

  .daily-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    padding: 6px 12px;
    background: rgba(56, 200, 232, 0.06);
    border: 1px solid rgba(56, 200, 232, 0.2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 40px;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }

  .daily-btn:hover {
    background: rgba(56, 200, 232, 0.12);
    border-color: rgba(56, 200, 232, 0.35);
  }

  .daily-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--cyan);
    line-height: 1.2;
  }

  .daily-game {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text);
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .daily-target {
    color: var(--cyan);
    font-weight: 700;
  }

  .continue-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 8px;
    background: rgba(232, 168, 56, 0.08);
    border: 1px solid rgba(232, 168, 56, 0.22);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
    flex-shrink: 0;
    min-height: 40px;
  }

  .continue-btn:hover {
    background: rgba(232, 168, 56, 0.14);
    border-color: rgba(232, 168, 56, 0.35);
    box-shadow: 0 0 20px rgba(232, 168, 56, 0.1);
  }

  .continue-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, color-mix(in srgb, var(--pcolor) 80%, #fff), var(--pcolor));
    box-shadow: 0 0 8px color-mix(in srgb, var(--pcolor) 50%, transparent);
    flex-shrink: 0;
  }

  .continue-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    text-align: left;
  }

  .continue-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--accent);
    line-height: 1.2;
  }

  .continue-game {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .continue-time {
    font-size: 9px;
    color: var(--text-muted);
    margin-left: 4px;
    white-space: nowrap;
  }

  .continue-arrow {
    color: var(--accent);
    flex-shrink: 0;
    opacity: 0.8;
  }

  .welcome-bar.compact {
    width: auto;
    left: auto;
    right: max(var(--space-md), env(safe-area-inset-right, 0px));
    transform: none;
  }

  .welcome-bar.compact .welcome-inner {
    padding: 6px 8px;
    background: rgba(8, 8, 28, 0.88);
    border-radius: var(--radius-md);
  }

  .continue-btn-compact {
    min-height: 44px;
  }

  @media (max-width: 720px) {
    .welcome-inner {
      flex-direction: column;
      align-items: stretch;
    }

    .welcome-stats {
      justify-content: center;
    }

    .continue-btn {
      width: 100%;
      justify-content: flex-start;
    }

    .continue-time {
      margin-left: auto;
    }
  }
</style>
