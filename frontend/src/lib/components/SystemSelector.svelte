<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { systems, currentSystemId, currentSystemProgress } from '$lib/stores/galaxy';
  import { isMobile } from '$lib/stores/viewport';
  import { lockBodyScroll } from '$lib/stores/viewport';
  import { trapFocus } from '$lib/utils/focusTrap';
  import { play } from '$lib/audio';

  let open = $state(false);
  let sheetEl = $state<HTMLElement | null>(null);

  function toggle(e: Event) {
    e.stopPropagation();
    open = !open;
    play(open ? 'pop' : 'click');
  }
  function close() { open = false; }
  function select(e: Event, id: string) {
    e.stopPropagation();
    currentSystemId.set(id);
    close();
    play('whoosh');
  }
  function stopProp(e: Event) { e.stopPropagation(); }

  $effect(() => {
    if (!open || !$isMobile) return;
    return lockBodyScroll();
  });

  $effect(() => {
    if (!open || !$isMobile || !sheetEl) return;
    return trapFocus(sheetEl);
  });
</script>

<svelte:window onclick={close} />

<div class="system-selector" role="presentation">
  <button
    class="selector-trigger"
    class:open
    onclick={toggle}
    aria-haspopup="listbox"
    aria-expanded={open}
  >
    {#if $currentSystemId}
      {@const sys = $systems.find(s => s.id === $currentSystemId)}
      {#if sys}
        <span class="trigger-dot" style="--star-color: {sys.star?.starColor || '#ffcc44'}"></span>
        <span class="trigger-label">{sys.name}</span>
        {#if $currentSystemProgress.total > 0}
          <span class="trigger-progress">{$currentSystemProgress.discovered}/{$currentSystemProgress.total}</span>
        {/if}
      {/if}
    {:else}
      <span class="trigger-label">Select System</span>
    {/if}
    <svg class="trigger-chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  </button>

  {#if $isMobile}
    {#if open}
      <div class="system-sheet-backdrop" role="button" tabindex="-1" aria-label="Close system picker" onclick={close} transition:fade={{ duration: 200 }}></div>
      <div class="system-sheet" bind:this={sheetEl} role="dialog" aria-label="Star systems" transition:fly={{ y: 40, duration: 280 }}>
        <div class="sheet-header">
          <h2>Star systems</h2>
          <button class="sheet-close" onclick={close} aria-label="Close">✕</button>
        </div>
        <div class="sheet-list" role="listbox">
          {#each $systems as sys}
            <button
              type="button"
              class="dropdown-item"
              class:active={sys.id === $currentSystemId}
              style="--item-color: {sys.star?.starColor || '#ffcc44'}"
              role="option"
              aria-selected={sys.id === $currentSystemId}
              onclick={(e) => select(e, sys.id)}
            >
              <span class="dropdown-item-dot"></span>
              <span class="dropdown-item-label">{sys.name}</span>
              <span class="dropdown-item-count">{sys.game_count}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="selector-dropdown" class:open role="listbox" aria-label="Star systems" tabindex="-1" onclick={stopProp} onkeydown={stopProp}>
      {#each $systems as sys}
        <button
          type="button"
          class="dropdown-item"
          class:active={sys.id === $currentSystemId}
          style="--item-color: {sys.star?.starColor || '#ffcc44'}"
          role="option"
          aria-selected={sys.id === $currentSystemId}
          onclick={(e) => select(e, sys.id)}
        >
          <span class="dropdown-item-dot"></span>
          <span class="dropdown-item-label">{sys.name}</span>
          <span class="dropdown-item-count">{sys.game_count}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .system-selector { position: relative; display: flex; justify-content: center; z-index: 30; animation: fadeSlideUp 0.4s var(--ease-out) both; animation-delay: 0.05s; }
  .selector-trigger { --star-color: #ffcc44; display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: color-mix(in srgb, var(--star-color) 8%, rgba(255,255,255,0.02)); border: 1px solid color-mix(in srgb, var(--star-color) 25%, rgba(255,255,255,0.08)); border-radius: var(--radius-sm); font-family: 'DM Sans', system-ui, sans-serif; color: var(--text); cursor: pointer; font-size: var(--fs-xs); font-weight: 500; letter-spacing: 0.5px; min-height: 32px; white-space: nowrap; box-shadow: 0 0 12px color-mix(in srgb, var(--star-color) 6%, transparent); transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out); }
  .selector-trigger:hover { background: color-mix(in srgb, var(--star-color) 12%, rgba(255,255,255,0.04)); border-color: color-mix(in srgb, var(--star-color) 40%, rgba(255,255,255,0.12)); box-shadow: 0 0 20px color-mix(in srgb, var(--star-color) 10%, transparent); }
  .selector-trigger.open { background: color-mix(in srgb, var(--star-color) 10%, rgba(255,255,255,0.03)); border-color: color-mix(in srgb, var(--star-color) 35%, rgba(255,255,255,0.15)); box-shadow: 0 0 24px color-mix(in srgb, var(--star-color) 12%, transparent); }
  .trigger-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--star-color); box-shadow: 0 0 8px color-mix(in srgb, var(--star-color) 50%, transparent); }
  .trigger-label { flex-shrink: 0; }
  .trigger-progress {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 2px 7px;
    border-radius: 100px;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .trigger-chevron { transition: transform 0.2s var(--ease-out); color: color-mix(in srgb, var(--star-color) 60%, var(--text-muted)); flex-shrink: 0; }
  .open .trigger-chevron { transform: rotate(180deg); color: var(--star-color); }
  .selector-dropdown { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(-6px); min-width: 240px; background: rgba(8,8,28,0.97); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 6px; opacity: 0; pointer-events: none; transition: opacity 0.2s var(--ease-out), transform 0.2s var(--ease-out); backdrop-filter: blur(20px); box-shadow: 0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset; }
  .selector-dropdown.open { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
  .dropdown-item { --item-color: #ffcc44; display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px 10px 14px; border: none; border-left: 3px solid transparent; background: transparent; border-radius: var(--radius-xs); font-family: 'DM Sans', system-ui, sans-serif; color: var(--text-secondary); cursor: pointer; font-size: var(--fs-xs); font-weight: 500; text-align: left; letter-spacing: 0.3px; transition: background 0.15s var(--ease-out), color 0.15s var(--ease-out), border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out); }
  .dropdown-item:hover { background: color-mix(in srgb, var(--item-color) 8%, rgba(255,255,255,0.02)); color: var(--text); border-left-color: color-mix(in srgb, var(--item-color) 40%, transparent); }
  .dropdown-item.active { color: var(--text); background: color-mix(in srgb, var(--item-color) 12%, rgba(255,255,255,0.03)); border-left-color: var(--item-color); box-shadow: 0 0 16px color-mix(in srgb, var(--item-color) 6%, transparent); }
  .dropdown-item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--item-color); box-shadow: 0 0 6px color-mix(in srgb, var(--item-color) 40%, transparent); }
  .dropdown-item-label { flex: 1; }
  .dropdown-item-count { font-size: var(--fs-xs); opacity: 0.35; font-weight: 400; }
  .dropdown-item.active .dropdown-item-count { opacity: 0.6; color: var(--item-color); }

  .system-sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
  }

  .system-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    max-height: min(88dvh, 560px);
    background: rgba(8, 8, 28, 0.98);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    display: flex;
    flex-direction: column;
    padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .sheet-header h2 {
    font-size: var(--fs-md);
    font-weight: 600;
    margin: 0;
  }

  .sheet-close {
    width: 40px;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .sheet-list {
    overflow-y: auto;
    padding: var(--space-sm);
    flex: 1;
  }

  .sheet-list .dropdown-item {
    min-height: 48px;
    padding: 14px 16px;
    font-size: var(--fs-sm);
  }

  @media (max-width: 640px) {
    .selector-trigger {
      min-height: 44px;
      padding: 8px 16px;
    }
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
