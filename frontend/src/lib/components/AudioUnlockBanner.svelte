<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { initAudio, isAudioInitialized } from '$lib/audio';
  import { setVolume } from '$lib/audio';
  import { settings } from '$lib/stores/settings';
  import { isCoarse } from '$lib/stores/viewport';
  import { play } from '$lib/audio';

  const DISMISS_KEY = 'gg-audio-banner-dismissed';

  let visible = $state(false);
  let dismissed = $state(false);

  onMount(() => {
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    } catch { /* ignore */ }
    visible = !dismissed && !isAudioInitialized();
  });

  function enable() {
    initAudio();
    setVolume($settings.masterVolume);
    play('chime');
    dismissed = true;
    visible = false;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch { /* ignore */ }
  }

  function dismiss() {
    dismissed = true;
    visible = false;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch { /* ignore */ }
  }
</script>

{#if visible && $isCoarse}
  <div class="audio-unlock" transition:fly={{ y: 20, duration: 280 }} role="region" aria-label="Enable sound">
    <button class="unlock-btn" onclick={enable}>Tap to enable sound</button>
    <button class="dismiss-btn" onclick={dismiss} aria-label="Dismiss">✕</button>
  </div>
{/if}

<style>
  .audio-unlock {
    position: fixed;
    bottom: calc(var(--chrome-bottom, 64px) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 35;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px 8px 14px;
    background: rgba(12, 12, 36, 0.96);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    max-width: min(360px, calc(100vw - 2 * var(--space-lg)));
  }

  .unlock-btn {
    flex: 1;
    min-height: 44px;
    border: none;
    background: var(--accent-dim);
    color: var(--accent);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: var(--fs-sm);
    font-weight: 600;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .dismiss-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius-xs);
    flex-shrink: 0;
  }
</style>
