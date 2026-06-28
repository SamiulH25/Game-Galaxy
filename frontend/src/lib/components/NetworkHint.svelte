<script lang="ts">
  import { fade } from 'svelte/transition';
  import { networkQuality, dismissNetworkHint } from '$lib/stores/network';
  import { play } from '$lib/audio';

  let show = $derived($networkQuality === 'slow' || $networkQuality === 'offline');

  function dismiss() {
    dismissNetworkHint();
    play('click');
  }
</script>

{#if show}
  <div class="network-hint" transition:fade={{ duration: 200 }} role="status">
    <span>
      {#if $networkQuality === 'offline'}
        You're offline — local progress is safe.
      {:else}
        Slow connection — some features may lag.
      {/if}
    </span>
    <button class="hint-dismiss" onclick={dismiss} aria-label="Dismiss">✕</button>
  </div>
{/if}

<style>
  .network-hint {
    position: fixed;
    top: calc(var(--chrome-top, 52px) + 4px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 24;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: 8px 12px;
    background: rgba(28, 20, 8, 0.94);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    color: var(--accent);
    max-width: min(420px, calc(100vw - 2 * var(--space-lg)));
    box-shadow: var(--shadow-md);
  }

  .hint-dismiss {
    border: none;
    background: transparent;
    color: inherit;
    opacity: 0.7;
    cursor: pointer;
    min-width: 32px;
    min-height: 32px;
  }
</style>
