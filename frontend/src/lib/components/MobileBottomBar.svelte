<script lang="ts">
  import { play } from '$lib/audio';
  import { isAuthenticated, user } from '$lib/stores/auth';
  import { showAuth } from '$lib/stores/galaxy';
  import { galaxySceneApi } from '$lib/stores/progression';
  import { goto } from '$app/navigation';

  interface Props {
    panelOpen?: boolean;
    onTogglePanel?: () => void;
    onToggleHelp?: () => void;
  }

  let { panelOpen = false, onTogglePanel, onToggleHelp }: Props = $props();

  function togglePanel() {
    play(panelOpen ? 'click' : 'pop');
    onTogglePanel?.();
  }

  function openHelp() {
    play('click');
    onToggleHelp?.();
  }

  function openAuth() {
    if ($isAuthenticated) {
      play('select');
      goto('/account');
    } else {
      play('click');
      showAuth.set(true);
    }
  }

  function recenter() {
    $galaxySceneApi?.recenter();
    play('click');
  }
</script>

<nav class="mobile-bottom-bar" aria-label="Galaxy navigation">
  <button class="bar-btn" class:active={panelOpen} onclick={togglePanel} aria-label="Explorer menu">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
    <span>Menu</span>
  </button>

  <button class="bar-btn" onclick={recenter} aria-label="Recenter galaxy">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
    </svg>
    <span>Center</span>
  </button>

  <button class="bar-btn" onclick={openHelp} aria-label="Help">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <span>Help</span>
  </button>

  <button class="bar-btn bar-btn-accent" onclick={openAuth} aria-label={$isAuthenticated ? 'Account' : 'Sign in'}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
    <span>{$isAuthenticated ? ($user?.username?.slice(0, 8) || 'You') : 'Sign in'}</span>
  </button>
</nav>

<style>
  .mobile-bottom-bar {
    display: none;
  }

  @media (max-width: 640px) {
    .mobile-bottom-bar {
      display: flex;
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 22;
      padding: 6px 8px;
      padding-bottom: max(6px, env(safe-area-inset-bottom, 0px));
      background: rgba(8, 8, 28, 0.94);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      justify-content: space-around;
      gap: 4px;
    }

    .bar-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-height: 48px;
      max-width: 88px;
      padding: 4px 6px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      font-size: 9px;
      font-weight: 600;
      font-family: 'DM Sans', system-ui, sans-serif;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .bar-btn:active {
      background: rgba(255, 255, 255, 0.06);
    }

    .bar-btn.active {
      color: var(--accent);
      background: rgba(232, 168, 56, 0.08);
    }

    .bar-btn-accent {
      color: var(--cyan);
    }
  }
</style>
