<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { settings } from '$lib/stores/settings';
  import { play } from '$lib/audio';

  let { open = $bindable(false) } = $props();

  const shortcuts = [
    { keys: ['Esc'], action: 'Close popup, panel, or help' },
    { keys: ['S'], action: 'Toggle command panel' },
    { keys: ['?'], action: 'Show / hide this help' },
    { keys: ['[', ']'], action: 'Previous / next solar system' },
    { keys: ['Enter'], action: 'Locate top search result in galaxy' },
    { keys: ['Click'], action: 'Select planet in 3D view' },
  ];

  let motionReduced = $derived($settings.reduceMotion);

  function close() {
    open = false;
    play('click');
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div class="help-overlay" transition:fade={{ duration: motionReduced ? 0 : 180 }} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
    <button class="help-backdrop" aria-label="Close help" onclick={close}></button>
    <div
      class="help-card"
      transition:fly={{ y: motionReduced ? 0 : 12, duration: motionReduced ? 0 : 280 }}
      role="presentation"
      onclick={(e) => e.stopPropagation()}
    >
      <header class="help-header">
        <h2>Keyboard & controls</h2>
        <button class="help-close" onclick={close} aria-label="Close">✕</button>
      </header>

      <ul class="shortcut-list">
        {#each shortcuts as row}
          <li class="shortcut-row">
            <span class="shortcut-keys">
              {#each row.keys as key, i}
                {#if i > 0}<span class="key-sep">/</span>{/if}
                <kbd>{key}</kbd>
              {/each}
            </span>
            <span class="shortcut-action">{row.action}</span>
          </li>
        {/each}
      </ul>

      <p class="help-foot">On touch devices, use the panel menu and tap planets directly.</p>
    </div>
  </div>
{/if}

<style>
  .help-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }

  .help-backdrop {
    position: absolute;
    inset: 0;
    border: none;
    background: rgba(4, 4, 18, 0.72);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    cursor: pointer;
  }

  .help-card {
    position: relative;
    width: min(440px, 100%);
    background: rgba(8, 8, 28, 0.97);
    border: 1px solid var(--border-accent);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    box-shadow: var(--shadow-lg);
  }

  .help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
  }

  h2 {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--text);
  }

  .help-close {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
  }

  .help-close:hover {
    color: var(--text);
    border-color: var(--border-hover);
  }

  .shortcut-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .shortcut-row {
    display: grid;
    grid-template-columns: minmax(100px, auto) 1fr;
    gap: var(--space-md);
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  .shortcut-row:last-child {
    border-bottom: none;
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  kbd {
    display: inline-block;
    min-width: 28px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--border-hover);
    background: rgba(255, 255, 255, 0.04);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: var(--text);
    text-align: center;
  }

  .key-sep {
    color: var(--text-muted);
    font-size: 11px;
  }

  .shortcut-action {
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .help-foot {
    margin-top: var(--space-md);
    font-size: var(--fs-xs);
    color: var(--text-muted);
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .help-overlay {
      align-items: flex-end;
      padding: 0;
    }

    .help-card {
      width: 100%;
      max-height: 85dvh;
      overflow-y: auto;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom));
    }

    .shortcut-row {
      grid-template-columns: 1fr;
      gap: 6px;
    }
  }
</style>
