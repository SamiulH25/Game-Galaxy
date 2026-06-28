<script lang="ts">
  import { fade } from 'svelte/transition';
  import { galaxyLoadState, galaxyLoadError, retryLoadGalaxyData } from '$lib/stores/galaxy';
  import { play } from '$lib/audio';

  let retrying = $state(false);

  async function retry() {
    retrying = true;
    play('click');
    try {
      await retryLoadGalaxyData();
      play('success');
    } catch {
      play('error');
    } finally {
      retrying = false;
    }
  }
</script>

{#if $galaxyLoadState === 'loading' && $galaxyLoadError === null}
  <div class="status-bar status-loading" transition:fade={{ duration: 150 }}>
    <span class="status-dot"></span>
    <span>Syncing galaxy catalog…</span>
  </div>
{/if}

{#if $galaxyLoadState === 'error'}
  <div class="status-bar status-error" transition:fade={{ duration: 200 }} role="alert">
    <span>{$galaxyLoadError || "Couldn't reach the server. Your local progress is safe."}</span>
    <button class="retry-btn" onclick={retry} disabled={retrying}>
      {retrying ? 'Retrying…' : 'Retry'}
    </button>
  </div>
{/if}

<style>
  .status-bar {
    position: fixed;
    top: clamp(52px, 5.5vw, 68px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 500;
    font-family: 'DM Sans', system-ui, sans-serif;
    max-width: min(520px, calc(100vw - 2 * var(--space-lg)));
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  }

  .status-loading {
    background: rgba(8, 8, 28, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
  }

  .status-error {
    background: rgba(28, 8, 8, 0.92);
    border: 1px solid var(--error-border);
    color: var(--error);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .retry-btn {
    flex-shrink: 0;
    padding: 4px 12px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--error-border);
    background: rgba(232, 80, 80, 0.12);
    color: var(--error);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 32px;
  }

  .retry-btn:hover:not(:disabled) {
    background: rgba(232, 80, 80, 0.2);
  }

  .retry-btn:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  @media (max-width: 640px) {
    .status-bar {
      top: auto;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      flex-wrap: wrap;
      justify-content: center;
      text-align: center;
    }
  }
</style>
