<script lang="ts">
  import { fly } from 'svelte/transition';
  import { galaxyHint } from '$lib/stores/galaxy';
</script>

{#if $galaxyHint}
  <div class="galaxy-hint" transition:fly={{ y: 16, duration: 280 }}>
    <span class="hint-icon" aria-hidden="true">◎</span>
    <p>{$galaxyHint}</p>
  </div>
{/if}

<style>
  .galaxy-hint {
    position: fixed;
    bottom: calc(24px + env(safe-area-inset-bottom, 0px));
    left: 50%;
    transform: translateX(-50%);
    z-index: 18;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(92vw, 420px);
    padding: 12px 16px;
    background: rgba(8, 8, 28, 0.94);
    border: 1px solid rgba(232, 168, 56, 0.25);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    pointer-events: none;
  }

  .hint-icon {
    color: var(--accent);
    font-size: 14px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text);
    line-height: 1.4;
  }
</style>
