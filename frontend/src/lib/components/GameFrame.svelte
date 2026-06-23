<script lang="ts">
  import { showGame, markGamePlayed } from '$lib/stores/galaxy';
  import { showAuth } from '$lib/stores/galaxy';
  import { isAuthenticated } from '$lib/stores/auth';
  import { settings } from '$lib/stores/settings';
  import { fetchSave, saveGame, unlockAchievement, submitScore } from '$lib/api';
  import { fade } from 'svelte/transition';
  import { play } from '$lib/audio';
  import AchievementToast from './AchievementToast.svelte';

  let game = $derived($showGame);
  let currentGameId = $state<string | null>(null);

  // Sync currentGameId when a game opens so bridge messages can use it
  $effect(() => {
    if (game) currentGameId = game.id;
  });
  let toastMsg = $state<string | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let achToast = $state<{ title: string; icon: string } | null>(null);

  function showToast(msg: string) {
    toastMsg = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastMsg = null; }, 2000);
  }

  function close() {
    const shouldClose = !$settings.confirmCloseGame || confirm('Are you sure you want to close this game? Unsaved progress may be lost.');
    if (!shouldClose) return;
    markGamePlayed();
    showGame.set(null);
    currentGameId = null;
    play('doorClose');
  }

  async function handleMessage(e: MessageEvent) {
    const msg = e.data;
    if (!msg || !msg._bridge) return;
    const gid = currentGameId;
    if (!gid) return; // no game open — ignore stray messages

    if (msg.type === 'save') {
      if (!$isAuthenticated) {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'save-response', data: null }, '*');
        showAuth.set(true);
        return;
      }
      try {
        await saveGame(gid, msg.data);
        showToast('Game saved!');
        play('chime');
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'save-response', data: true }, '*');
      } catch {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'save-response', data: null }, '*');
      }
    } else if (msg.type === 'load') {
      if (!$isAuthenticated) {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'load-response', data: null }, '*');
        showAuth.set(true);
        return;
      }
      try {
        const data = await fetchSave(gid);
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'load-response', data: data ? data.save_data : null }, '*');
      } catch {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'load-response', data: null }, '*');
      }
    } else if (msg.type === 'unlock-achievement') {
      if (!$isAuthenticated) {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'unlock-achievement-response', data: { success: false, already_unlocked: false } }, '*');
        showAuth.set(true);
        return;
      }
      try {
        const result = await unlockAchievement(gid, msg.data.achievementId);
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'unlock-achievement-response', data: result }, '*');
        if (result.success && !result.already_unlocked) {
          // Try to find the achievement title from the game's manifest
          const title = msg.data.achievementId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          achToast = { title, icon: 'star' };
          play('powerup');
          setTimeout(() => { achToast = null; }, 4000);
        }
      } catch {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'unlock-achievement-response', data: { success: false } }, '*');
      }
    } else if (msg.type === 'submit-score') {
      if (!$isAuthenticated) {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'submit-score-response', data: { success: false } }, '*');
        showAuth.set(true);
        return;
      }
      try {
        const result = await submitScore(gid, msg.data.score);
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'submit-score-response', data: result }, '*');
        play('notification');
      } catch {
        (e.source as Window)?.postMessage({ _bridge: true, _id: msg._id, type: 'submit-score-response', data: { success: false } }, '*');
      }
    }
  }

  async function handleSave() {
    if (!$isAuthenticated) { showAuth.set(true); return; }
    if ((window as any).gameBridge && (window as any).__gameSaveData) {
      await (window as any).gameBridge.save((window as any).__gameSaveData());
      showToast('Game saved!');
      play('chime');
    } else { showToast('This game does not support saving.'); play('error'); }
  }

  async function handleLoad() {
    if (!$isAuthenticated) { showAuth.set(true); return; }
    const gid = currentGameId;
    if (!gid) return;
    if ((window as any).__gameLoadData) {
      const data = await fetchSave(gid);
      if (data && data.save_data) { (window as any).__gameLoadData(data.save_data); showToast('Game loaded!'); play('notification'); }
      else { showToast('No save data found.'); play('error'); }
    } else { showToast('This game does not support loading.'); play('error'); }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && $showGame) close();
  }
</script>

<svelte:window onmessage={handleMessage} onkeydown={onKeydown} />

{#if game}
  <div class="game-frame-overlay" transition:fade={{ duration: 200 }}>
    <div class="game-frame-header">
      <div class="game-frame-info">
        <span class="game-frame-dot"></span>
        <h3>{game.title}</h3>
      </div>
      <div class="game-frame-actions">
        <button class="gf-btn" onclick={handleSave}>Save</button>
        <button class="gf-btn" onclick={handleLoad}>Load</button>
        <button class="gf-btn gf-close" onclick={close}>Close</button>
      </div>
    </div>
    <iframe id="game-iframe" src="/games/{game.id}/index.html" sandbox="allow-scripts" title="Game"></iframe>
    {#if toastMsg}
      <div class="save-toast" transition:fade>{toastMsg}</div>
    {/if}
    {#if achToast}
      <AchievementToast title={achToast.title} icon={achToast.icon} />
    {/if}
  </div>
{/if}

<style>
  .game-frame-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 200; display: flex; flex-direction: column; background: var(--bg-deepest); }
  .game-frame-header { display: flex; justify-content: space-between; align-items: center; padding: 0 var(--space-md); background: rgba(4,4,18,0.96); border-bottom: 1px solid var(--border); z-index: 1; min-height: clamp(36px, 3.5vw, 48px); }
  .game-frame-info { display: flex; align-items: center; gap: var(--space-xs); min-width: 0; }
  .game-frame-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px rgba(56,200,120,0.4); flex-shrink: 0; }
  h3 { font-size: var(--fs-xs); font-weight: 600; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .game-frame-actions { display: flex; gap: var(--space-xs); align-items: center; flex-shrink: 0; }
  .gf-btn { background: var(--surface-input); border: 1px solid var(--border); color: var(--text-muted); padding: clamp(4px, 0.35vw, 6px) clamp(10px, 0.8vw, 14px); border-radius: var(--radius-sm); font-size: var(--fs-xs); font-weight: 500; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; min-height: 32px; min-width: 32px; transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), border-color 0.15s var(--ease-out); }
  .gf-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-secondary); border-color: var(--border-hover); }
  .gf-close { color: var(--accent-dim); border-color: rgba(232,168,56,0.12); }
  .gf-close:hover { background: rgba(232,168,56,0.08); color: var(--accent); border-color: rgba(232,168,56,0.2); }
  iframe { flex: 1; border: none; width: 100%; }
  .save-toast { position: fixed; bottom: clamp(20px, 2.5vw, 36px); left: 50%; transform: translateX(-50%); background: var(--success-bg); border: 1px solid var(--success-border); color: var(--success); padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-sm); font-size: var(--fs-sm); font-weight: 600; z-index: 300; font-family: 'DM Sans', system-ui, sans-serif; }
</style>
