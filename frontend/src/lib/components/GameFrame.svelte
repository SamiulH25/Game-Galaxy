<script lang="ts">
  import {
    showGame,
    markGamePlayed,
    showAuth,
    sessionSummary,
    recordLastPlayed,
    type SessionAchievement,
  } from '$lib/stores/galaxy';
  import { isAuthenticated } from '$lib/stores/auth';
  import {
    queuePendingGuest,
    recordPersonalBest,
    evaluateDailyMission,
    markDailyMissionComplete,
    isDailyMissionForGame,
    getDailyMission,
    readPendingGuest,
    evaluateChallenge,
    recordChallengeResult,
  } from '$lib/stores/progression';
  import { settings } from '$lib/stores/settings';
  import { fetchSave, saveGame, unlockAchievement, submitScore, getApiToken, fetchLeaderboard } from '$lib/api';
  import { fade } from 'svelte/transition';
  import { play } from '$lib/audio';
  import AchievementCelebration from './AchievementCelebration.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { parseApiError } from '$lib/api';
  import { showToast as pushToast } from '$lib/stores/toast';
  import { lockBodyScroll } from '$lib/stores/viewport';
  import { isMobile } from '$lib/stores/viewport';
  import { get } from 'svelte/store';

  const APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

  function replyToGame(e: MessageEvent, payload: Record<string, unknown>) {
    if (e.source && 'postMessage' in e.source) {
      (e.source as Window).postMessage(payload, APP_ORIGIN);
    }
  }

  function isTrustedGameMessage(e: MessageEvent): boolean {
    if (e.origin !== APP_ORIGIN) return false;
    if (!iframeEl?.contentWindow) return false;
    return e.source === iframeEl.contentWindow;
  }

  let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingSaveData: Record<string, unknown> | null = null;
  let game = $derived($showGame);
  let currentGameId = $state<string | null>(null);

  let isEngineGame = $derived(game?.type && game.type !== 'html');

  let toastMsg = $state<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let achCelebration = $state<{ title: string; icon: string } | null>(null);
  let achQueue = $state<{ title: string; icon: string }[]>([]);
  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let iframeLoading = $state(true);
  let iframeError = $state(false);
  let showCloseConfirm = $state(false);
  let loadTimer: ReturnType<typeof setTimeout> | null = null;

  const IFRAME_LOAD_TIMEOUT = 20_000;
  let tick = $state(0);

  $effect(() => {
    if (!game) return;
    const id = setInterval(() => { tick++; }, 1000);
    return () => clearInterval(id);
  });

  $effect(() => {
    if (!game) return;
    return lockBodyScroll();
  });

  $effect(() => {
    if (!game) return;
    const mq = window.matchMedia('(orientation: portrait)');
    const updateOrientation = () => { portraitMode = mq.matches; };
    updateOrientation();
    mq.addEventListener('change', updateOrientation);
    return () => mq.removeEventListener('change', updateOrientation);
  });

  $effect(() => {
    if (!game) return;
    const vv = window.visualViewport;
    const apply = () => {
      if (!overlayEl || !vv) return;
      overlayEl.style.height = `${vv.height}px`;
      overlayEl.style.top = `${vv.offsetTop}px`;
    };
    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      if (overlayEl) {
        overlayEl.style.height = '';
        overlayEl.style.top = '';
      }
    };
  });

  $effect(() => {
    if (!game || !$settings.mobileAutoFullscreen) return;
    if (!get(isMobile)) return;
    const t = setTimeout(() => { void toggleFullscreen(); }, 500);
    return () => clearTimeout(t);
  });

  let sessionStart = $state<number>(0);
  let sessionScore = $state<number | null>(null);
  let sessionRank = $state<number | null>(null);
  let sessionPreviousRank = $state<number | null>(null);
  let sessionRankDelta = $state<number | null>(null);
  let sessionPersonalBest = $state(false);
  let sessionWon = $state<boolean | null>(null);
  let sessionAchievements = $state<SessionAchievement[]>([]);
  let authBanner = $state<string | null>(null);
  let isFullscreen = $state(false);
  let sessionScoreData = $state<Record<string, unknown> | null>(null);
  let overlayEl = $state<HTMLElement | null>(null);
  let iframeWrapEl = $state<HTMLElement | null>(null);
  let swipeStartY = 0;
  let gameSrc = $derived(
    game?.id ? `${typeof window !== 'undefined' ? window.location.origin : ''}/games/${game.id}/index.html` : 'about:blank',
  );
  let portraitMode = $state(false);

  let sessionElapsed = $derived.by(() => {
    tick;
    if (!sessionStart) return 0;
    return Math.max(0, Math.floor((Date.now() - sessionStart) / 1000));
  });
  let sessionElapsedLabel = $derived.by(() => {
    const s = sessionElapsed;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${s}s`;
  });

  $effect(() => {
    if (game) {
      currentGameId = game.id;
      recordLastPlayed(game);
      sessionStart = Date.now();
      sessionScore = null;
      sessionRank = null;
      sessionPreviousRank = null;
      sessionRankDelta = null;
      sessionPersonalBest = false;
      sessionWon = null;
      sessionAchievements = [];
      authBanner = null;
      sessionScoreData = null;
      isFullscreen = false;
      iframeLoading = true;
      iframeError = false;
      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = setTimeout(() => {
        if (iframeLoading) {
          iframeLoading = false;
          iframeError = true;
        }
      }, IFRAME_LOAD_TIMEOUT);
    }
    return () => {
      if (loadTimer) clearTimeout(loadTimer);
    };
  });

  function achievementMeta(gameData: any, achievementId: string): { title: string; icon: string } {
    const list = gameData?.achievements as { id: string; title: string; icon?: string }[] | undefined;
    const found = list?.find((a) => a.id === achievementId);
    if (found) {
      return { title: found.title, icon: found.icon || 'star' };
    }
    const title = achievementId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return { title, icon: 'star' };
  }

  function queueCelebration(meta: { title: string; icon: string }) {
    if (achCelebration) {
      achQueue = [...achQueue, meta];
    } else {
      achCelebration = meta;
    }
  }

  function dismissCelebration() {
    achCelebration = null;
    if (achQueue.length > 0) {
      const [next, ...rest] = achQueue;
      achQueue = rest;
      achCelebration = next;
    }
  }

  function onIframeLoad() {
    iframeLoading = false;
    iframeError = false;
    if (loadTimer) clearTimeout(loadTimer);
    if (!isEngineGame || !iframeEl || !$isAuthenticated) return;
    const token = getApiToken();
    if (!token) return;
    iframeEl.contentWindow?.postMessage({
      type: 'galaxy-auth',
      token,
      gameId: game.id,
    }, APP_ORIGIN);
  }

  function showToast(msg: string) {
    toastMsg = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastMsg = null; }, 2000);
  }

  function finishClose() {
    markGamePlayed();
    showGame.set(null);
    currentGameId = null;
    play('doorClose');
  }

  function doClose() {
    const durationMs = sessionStart ? Date.now() - sessionStart : 0;
    const isDaily = game?.id ? isDailyMissionForGame(game.id) : false;
    const dailyTarget = isDaily ? getDailyMission()?.targetScore ?? null : null;
    const dailyBeat = isDaily ? evaluateDailyMission(sessionScore) : null;
    if (dailyBeat === true) markDailyMissionComplete();

    const challengeTarget =
      typeof (game as { __shareChallenge?: number })?.__shareChallenge === 'number'
        ? (game as { __shareChallenge: number }).__shareChallenge
        : null;
    const challengeBeat = evaluateChallenge(sessionScore, challengeTarget);
    if (challengeBeat !== null && challengeTarget !== null && typeof sessionScore === 'number') {
      recordChallengeResult({
        gameId: game.id,
        gameTitle: game.title,
        challengerScore: challengeTarget,
        yourScore: sessionScore,
        won: challengeBeat,
        at: Date.now(),
      });
    }

    if (typeof sessionScore === 'number' && game?.id) {
      recordPersonalBest(game.id, sessionScore);
    }

    const guestHasProgress =
      !$isAuthenticated &&
      (sessionScore !== null || sessionAchievements.length > 0 || sessionScoreData !== null);

    if (guestHasProgress && game?.id) {
      queuePendingGuest({
        gameId: game.id,
        gameTitle: game.title,
        score: sessionScore,
        scoreData: sessionScoreData,
        achievements: sessionAchievements
          .filter((a) => a.id)
          .map((a) => ({ ...a, id: a.id! })),
      });
    }

    sessionSummary.set({
      game: { ...game },
      score: sessionScore,
      achievements: [...sessionAchievements],
      durationMs,
      rank: sessionRank,
      isPersonalBest: sessionPersonalBest,
      won: sessionWon,
      rankDelta: sessionRankDelta,
      previousRank: sessionPreviousRank,
      dailyMissionBeat: dailyBeat,
      dailyMissionTarget: dailyTarget,
      challengeBeat,
      challengeTarget,
      hadPendingGuest: guestHasProgress || !!readPendingGuest(),
    });
    showCloseConfirm = false;
    if (isFullscreen) exitFullscreen();
    finishClose();
  }

  async function toggleFullscreen() {
    const el = document.querySelector('.iframe-wrap') as HTMLElement | null;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        isFullscreen = true;
      } else {
        await document.exitFullscreen();
        isFullscreen = false;
      }
      play('click');
    } catch {
      play('error');
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    isFullscreen = false;
  }

  function close() {
    if ($settings.confirmCloseGame) {
      showCloseConfirm = true;
      return;
    }
    doClose();
  }

  function retryIframe() {
    if (!iframeEl || !game) return;
    iframeLoading = true;
    iframeError = false;
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(() => {
      if (iframeLoading) {
        iframeLoading = false;
        iframeError = true;
      }
    }, IFRAME_LOAD_TIMEOUT);
    iframeEl.src = `${window.location.origin}/games/${game.id}/index.html`;
    play('click');
  }

  async function handleMessage(e: MessageEvent) {
    const msg = e.data;
    if (!msg || !msg._bridge) return;
    if (!isTrustedGameMessage(e)) return;
    const gid = currentGameId;
    if (!gid) return;

    if (msg.type === 'save') {
      if (!$isAuthenticated) {
        replyToGame(e, { _bridge: true, _id: msg._id, type: 'save-response', data: null });
        authBanner = 'Sign in to sync your save across devices';
        return;
      }
      pendingSaveData = msg.data;
      const msgId = msg._id;
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(async () => {
        const data = pendingSaveData;
        pendingSaveData = null;
        if (!data || !currentGameId) return;
        try {
          await saveGame(currentGameId, data);
          showToast('Progress synced');
          play('chime');
          iframeEl?.contentWindow?.postMessage(
            { _bridge: true, _id: msgId, type: 'save-response', data: true },
            APP_ORIGIN,
          );
        } catch {
          iframeEl?.contentWindow?.postMessage(
            { _bridge: true, _id: msgId, type: 'save-response', data: null },
            APP_ORIGIN,
          );
          pushToast(parseApiError(new Error('save failed')), 'error');
        }
      }, 1500);
      return;
    } else if (msg.type === 'load') {
      if (!$isAuthenticated) {
        replyToGame(e, { _bridge: true, _id: msg._id, type: 'load-response', data: null });
        authBanner = 'Sign in to load your cloud save';
        return;
      }
      try {
        const data = await fetchSave(gid);
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'load-response',
          data: data ? data.save_data : null,
        });
      } catch {
        replyToGame(e, { _bridge: true, _id: msg._id, type: 'load-response', data: null });
      }
    } else if (msg.type === 'unlock-achievement') {
      const meta = achievementMeta(game, msg.data.achievementId);
      if (!$isAuthenticated) {
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'unlock-achievement-response',
          data: { success: false, already_unlocked: false },
        });
        sessionAchievements = [...sessionAchievements, { ...meta, id: msg.data.achievementId }];
        queueCelebration(meta);
        queuePendingGuest({
          gameId: gid,
          gameTitle: game?.title,
          score: sessionScore,
          achievements: [{ ...meta, id: msg.data.achievementId }],
        });
        authBanner = 'Sign in to keep achievements permanently';
        return;
      }
      try {
        const result = await unlockAchievement(gid, msg.data.achievementId);
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'unlock-achievement-response',
          data: result,
        });
        if (result.success && !result.already_unlocked) {
          sessionAchievements = [...sessionAchievements, { ...meta, id: msg.data.achievementId }];
          queueCelebration(meta);
        }
      } catch {
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'unlock-achievement-response',
          data: { success: false },
        });
      }
    } else if (msg.type === 'submit-score') {
      const scoreVal = msg.data?.score?.score ?? msg.data?.score;
      if (typeof scoreVal === 'number') {
        sessionScore = scoreVal;
        if (msg.data?.score?.won === true || msg.data?.won === true) {
          sessionWon = true;
        }
      }

      if (!$isAuthenticated) {
        sessionScoreData = msg.data.score ?? { score: scoreVal };
        queuePendingGuest({
          gameId: gid,
          gameTitle: game?.title,
          score: typeof scoreVal === 'number' ? scoreVal : null,
          scoreData: sessionScoreData,
        });
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'submit-score-response',
          data: { success: false },
        });
        authBanner = 'Sign in to post your score to the galaxy leaderboard';
        return;
      }
      try {
        let oldRank: number | null = null;
        try {
          const lb = await fetchLeaderboard(gid, 'best', 1);
          oldRank = lb.user_rank ?? null;
        } catch { /* offline */ }
        const result = await submitScore(gid, msg.data.score);
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'submit-score-response',
          data: result,
        });
        if (result.rank) {
          sessionPreviousRank = oldRank;
          if (oldRank && oldRank > result.rank) {
            sessionRankDelta = oldRank - result.rank;
          }
          sessionRank = result.rank;
          sessionPersonalBest = true;
        }
        play('notification');
      } catch {
        replyToGame(e, {
          _bridge: true,
          _id: msg._id,
          type: 'submit-score-response',
          data: { success: false },
        });
      }
    }
  }

  async function handleSave() {
    if (!$isAuthenticated) {
      authBanner = 'Sign in to sync your save across devices';
      return;
    }
    if ((window as any).gameBridge && (window as any).__gameSaveData) {
      await (window as any).gameBridge.save((window as any).__gameSaveData());
      showToast('Progress synced');
      play('chime');
    } else {
      showToast('This game does not support saving.');
      play('error');
    }
  }

  async function handleLoad() {
    if (!$isAuthenticated) {
      authBanner = 'Sign in to load your cloud save';
      return;
    }
    const gid = currentGameId;
    if (!gid) return;
    if ((window as any).__gameLoadData) {
      const data = await fetchSave(gid);
      if (data && data.save_data) {
        (window as any).__gameLoadData(data.save_data);
        showToast('Save loaded');
        play('notification');
      } else {
        showToast('No save data found.');
        play('error');
      }
    } else {
      showToast('This game does not support loading.');
      play('error');
    }
  }

  function openAuthFromBanner() {
    authBanner = null;
    showAuth.set(true);
    play('click');
  }

  function dismissBanner() {
    authBanner = null;
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && $showGame && !achCelebration) close();
  }

  function onHeaderTouchStart(e: TouchEvent) {
    swipeStartY = e.touches[0].clientY;
  }

  function onHeaderTouchEnd(e: TouchEvent) {
    const dy = e.changedTouches[0].clientY - swipeStartY;
    if (dy > 72) close();
  }
</script>

<svelte:window onmessage={handleMessage} onkeydown={onKeydown} />

{#if game}
  <div class="game-frame-overlay" bind:this={overlayEl} transition:fade={{ duration: 200 }}>
    <div
      class="game-frame-header"
      ontouchstart={onHeaderTouchStart}
      ontouchend={onHeaderTouchEnd}
    >
      <div class="game-frame-info">
        <span class="game-frame-dot" class:loading={iframeLoading}></span>
        <h3>{game.title}</h3>
        {#if !iframeLoading && !iframeError}
          <span class="session-timer">{sessionElapsedLabel}</span>
        {/if}
      </div>
      <div class="game-frame-actions">
        {#if !isEngineGame}
          <button class="gf-btn" onclick={handleSave}>Save</button>
          <button class="gf-btn" onclick={handleLoad}>Load</button>
        {/if}
        <button class="gf-btn" onclick={toggleFullscreen} title="Fullscreen">⛶</button>
        <button class="gf-btn gf-close" onclick={close}>Close</button>
      </div>
    </div>

    {#if authBanner}
      <div class="auth-banner" transition:fade={{ duration: 150 }}>
        <span>{authBanner}</span>
        <div class="banner-actions">
          <button class="banner-btn primary" onclick={openAuthFromBanner}>Sign in</button>
          <button class="banner-btn" onclick={dismissBanner} aria-label="Dismiss">✕</button>
        </div>
      </div>
    {/if}

    {#if isEngineGame && portraitMode && get(isMobile)}
      <div class="rotate-hint" role="status">
        Rotate your device for the best experience
      </div>
    {/if}

    <div class="iframe-wrap" bind:this={iframeWrapEl}>
      {#if iframeLoading}
        <div class="iframe-loader">
          <div class="loader-ring"></div>
          <span>Loading {game.title}…</span>
        </div>
      {:else if iframeError}
        <div class="iframe-error">
          <p>Couldn't load this game.</p>
          <button class="gf-btn" onclick={retryIframe}>Try again</button>
          <button class="gf-btn gf-close" onclick={close}>Close</button>
        </div>
      {/if}
      <iframe
        bind:this={iframeEl}
        src={gameSrc}
        onload={onIframeLoad}
        title={game.title}
        class:hidden={iframeError}
      ></iframe>
    </div>

    {#if toastMsg}
      <div class="save-toast" transition:fade>{toastMsg}</div>
    {/if}
  </div>
{/if}

{#if achCelebration}
  <AchievementCelebration
    title={achCelebration.title}
    icon={achCelebration.icon}
    onDismiss={dismissCelebration}
  />
{/if}

{#if showCloseConfirm}
  <ConfirmDialog
    title="Close game?"
    message="Unsaved progress in this session may be lost."
    confirmLabel="Close"
    cancelLabel="Keep playing"
    onConfirm={doClose}
    onCancel={() => { showCloseConfirm = false; }}
  />
{/if}

<style>
  .game-frame-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 200;
    display: flex;
    flex-direction: column;
    background: var(--bg-deepest);
  }

  .game-frame-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 var(--space-md);
    background: rgba(4, 4, 18, 0.96);
    border-bottom: 1px solid var(--border);
    z-index: 1;
    min-height: clamp(36px, 3.5vw, 48px);
  }

  .game-frame-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }

  .game-frame-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 8px rgba(56, 200, 120, 0.4);
    flex-shrink: 0;
  }

  .game-frame-dot.loading {
    background: var(--accent);
    box-shadow: 0 0 8px rgba(232, 168, 56, 0.4);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  h3 {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-timer {
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .game-frame-actions {
    display: flex;
    gap: var(--space-xs);
    align-items: center;
    flex-shrink: 0;
  }

  .gf-btn {
    background: var(--surface-input);
    border: 1px solid var(--border);
    color: var(--text-muted);
    padding: clamp(4px, 0.35vw, 6px) clamp(10px, 0.8vw, 14px);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 500;
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 32px;
    min-width: 32px;
    transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), border-color 0.15s var(--ease-out);
  }

  .gf-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
    border-color: var(--border-hover);
  }

  .gf-close {
    color: var(--accent-dim);
    border-color: rgba(232, 168, 56, 0.12);
  }

  .gf-close:hover {
    background: rgba(232, 168, 56, 0.08);
    color: var(--accent);
    border-color: rgba(232, 168, 56, 0.2);
  }

  .auth-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(56, 200, 232, 0.08);
    border-bottom: 1px solid rgba(56, 200, 232, 0.15);
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    z-index: 2;
  }

  .banner-actions {
    display: flex;
    gap: var(--space-xs);
    flex-shrink: 0;
  }

  .banner-btn {
    padding: 4px 12px;
    border-radius: var(--radius-xs);
    font-size: var(--fs-xs);
    font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    min-height: 28px;
  }

  .banner-btn.primary {
    background: rgba(56, 200, 232, 0.12);
    border-color: rgba(56, 200, 232, 0.25);
    color: var(--cyan);
  }

  .banner-btn.primary:hover {
    background: rgba(56, 200, 232, 0.18);
  }

  .iframe-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    touch-action: manipulation;
  }

  .rotate-hint {
    flex-shrink: 0;
    text-align: center;
    padding: 8px var(--space-md);
    font-size: var(--fs-xs);
    color: var(--accent);
    background: rgba(232, 168, 56, 0.08);
    border-bottom: 1px solid rgba(232, 168, 56, 0.15);
  }

  iframe {
    border: none;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: manipulation;
  }

  iframe.hidden {
    visibility: hidden;
    position: absolute;
    pointer-events: none;
  }

  .iframe-error {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    background: var(--bg-deepest);
    z-index: 1;
    font-size: var(--fs-sm);
    color: var(--text-muted);
  }

  .iframe-error p {
    color: var(--error);
    font-weight: 500;
  }

  @media (max-width: 640px) {
    .game-frame-header {
      min-height: 48px;
      padding: 0 var(--space-sm);
    }

    .gf-btn {
      min-height: 44px;
      min-width: 44px;
    }

    h3 {
      max-width: 40vw;
    }
  }

  .iframe-loader {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    background: var(--bg-deepest);
    z-index: 1;
    font-size: var(--fs-sm);
    color: var(--text-muted);
    font-weight: 500;
  }

  .loader-ring {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid rgba(232, 168, 56, 0.15);
    border-top-color: var(--accent);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .save-toast {
    position: fixed;
    bottom: clamp(20px, 2.5vw, 36px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    color: var(--success);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 600;
    z-index: 300;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
</style>
