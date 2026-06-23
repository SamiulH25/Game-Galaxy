<script lang="ts">
  import { systems, currentSystemId } from '$lib/stores/galaxy';
  import { play } from '$lib/audio';

  let open = $state(false);

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
      {/if}
    {:else}
      <span class="trigger-label">Select System</span>
    {/if}
    <svg class="trigger-chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
      <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  </button>

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
</div>

<style>
  .system-selector { position: relative; display: flex; justify-content: center; z-index: 30; animation: fadeSlideUp 0.4s var(--ease-out) both; animation-delay: 0.05s; }
  .selector-trigger { --star-color: #ffcc44; display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: color-mix(in srgb, var(--star-color) 8%, rgba(255,255,255,0.02)); border: 1px solid color-mix(in srgb, var(--star-color) 25%, rgba(255,255,255,0.08)); border-radius: var(--radius-sm); font-family: 'DM Sans', system-ui, sans-serif; color: var(--text); cursor: pointer; font-size: var(--fs-xs); font-weight: 500; letter-spacing: 0.5px; min-height: 32px; white-space: nowrap; box-shadow: 0 0 12px color-mix(in srgb, var(--star-color) 6%, transparent); transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out); }
  .selector-trigger:hover { background: color-mix(in srgb, var(--star-color) 12%, rgba(255,255,255,0.04)); border-color: color-mix(in srgb, var(--star-color) 40%, rgba(255,255,255,0.12)); box-shadow: 0 0 20px color-mix(in srgb, var(--star-color) 10%, transparent); }
  .selector-trigger.open { background: color-mix(in srgb, var(--star-color) 10%, rgba(255,255,255,0.03)); border-color: color-mix(in srgb, var(--star-color) 35%, rgba(255,255,255,0.15)); box-shadow: 0 0 24px color-mix(in srgb, var(--star-color) 12%, transparent); }
  .trigger-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; background: var(--star-color); box-shadow: 0 0 8px color-mix(in srgb, var(--star-color) 50%, transparent); }
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
</style>
