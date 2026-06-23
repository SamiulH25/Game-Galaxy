<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import Scene from '$lib/threlte/Scene.svelte';
  import SystemSelector from '$lib/components/SystemSelector.svelte';
  import PlanetPopup from '$lib/components/PlanetPopup.svelte';
  import GameFrame from '$lib/components/GameFrame.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import SidePanel from '$lib/components/SidePanel.svelte';
  import HeroPage from '$lib/components/HeroPage.svelte';
  import { systems, currentSystemId, loadGalaxyData, showAuth, hasPlayedGame } from '$lib/stores/galaxy';
  import { isAuthenticated, user, logoutUser } from '$lib/stores/auth';
  import { play } from '$lib/audio';

  let showDropdown = $state(false);
  let panelOpen = $state(false);
  let dropdownRef: HTMLDivElement | undefined = $state(undefined);

  onMount(() => {
    loadGalaxyData().catch(() => {
      console.warn('[Galaxy] Backend unreachable — running in offline mode');
    });
  });

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    if ($isAuthenticated) {
      showDropdown = !showDropdown;
      play(showDropdown ? 'pop' : 'click');
    } else {
      showAuth.set(true);
      play('click');
    }
  }

  function closeDropdown() {
    showDropdown = false;
  }

  function handleSignOut(e: MouseEvent) {
    e.stopPropagation();
    showDropdown = false;
    play('cancel');
    logoutUser();
  }

  function goToAccount(e: MouseEvent) {
    e.stopPropagation();
    showDropdown = false;
    play('select');
    goto('/account');
  }
</script>

<svelte:window onclick={closeDropdown} />

<div>
  <Scene />
  
  {#if !$hasPlayedGame && !$isAuthenticated}
    <div class="hero-blur-overlay" transition:fade={{ duration: 400 }}></div>
    <HeroPage />
  {/if}
  
  <PlanetPopup />
  <GameFrame />

  {#if $hasPlayedGame || $isAuthenticated}
    <div id="ui-overlay" transition:fade={{ duration: 300 }}>
      <div class="title-bar">
        <SystemSelector />

        <div class="title-bar-right" role="presentation" onclick={closeDropdown}>
          <div class="auth-dropdown-container">
            <button
              class="auth-btn"
              class:auth-active={showDropdown}
              onclick={toggleDropdown}
            >
              {$isAuthenticated ? $user?.username || 'Account' : 'Log In'}
              {#if $isAuthenticated}
                <svg class="dropdown-chevron" class:chevron-open={showDropdown} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
              {/if}
            </button>
            {#if showDropdown}
              <div class="auth-dropdown" transition:fly={{ y: -4, duration: 150, easing: (t) => 1 - Math.pow(1 - t, 3) }} role="menu" bind:this={dropdownRef}>
                <div class="dropdown-header">
                  <div class="dropdown-avatar">{$user?.username?.charAt(0).toUpperCase() || 'U'}</div>
                  <div class="dropdown-user">
                    <span class="dropdown-username">{$user?.username || 'User'}</span>
                    <span class="dropdown-label">Account</span>
                  </div>
                </div>
                <button class="dropdown-item" onclick={goToAccount} role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                  Account Details
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item dropdown-signout" onclick={handleSignOut} role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <AuthModal />
  <SidePanel bind:open={panelOpen} />
</div>

<style>
  #ui-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    z-index: 10;
    pointer-events: none;
  }
  #ui-overlay > * {
    pointer-events: auto;
  }

  .title-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: var(--space-md) var(--space-lg);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    z-index: 20;
    height: clamp(48px, 5vw, 64px);
    background: transparent;
    pointer-events: none;
  }
  .title-bar > * {
    pointer-events: auto;
  }

  .title-bar-right {
    position: absolute;
    right: var(--space-lg);
    flex-shrink: 0;
    animation: fadeSlideUp 0.4s var(--ease-out) both;
    animation-delay: 0.15s;
  }

  .hero-blur-overlay {
    position: fixed;
    inset: 0;
    z-index: 4;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    pointer-events: none;
  }

  .auth-btn {
    background: rgba(8,8,28,0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--text-secondary);
    padding: clamp(5px, 0.4vw, 7px) clamp(12px, 1vw, 18px);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 500;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    min-height: 32px;
    transition: background 0.15s var(--ease-out),
                border-color 0.15s var(--ease-out),
                color 0.15s var(--ease-out);
  }

  .auth-btn:hover {
    border-color: rgba(255,255,255,0.15);
    color: var(--text);
    background: rgba(16,16,40,0.6);
  }

  .auth-btn.auth-active {
    border-color: var(--border-accent);
    background: rgba(232,168,56,0.06);
    color: var(--accent);
  }

  .dropdown-chevron {
    transition: transform 0.15s var(--ease-out);
  }
  .chevron-open {
    transform: rotate(180deg);
  }

  .auth-dropdown-container {
    position: relative;
    display: inline-block;
  }

  .auth-dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    min-width: 200px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md), var(--shadow-glow);
    overflow: hidden;
    z-index: 100;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--border);
  }

  .dropdown-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent-dim));
    color: var(--bg-deepest);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: var(--fs-sm);
    flex-shrink: 0;
  }

  .dropdown-user {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .dropdown-username {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-label {
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: var(--fs-sm);
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s var(--ease-out), color 0.1s var(--ease-out);
  }

  .dropdown-item:hover {
    background: rgba(255,255,255,0.03);
    color: var(--text);
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border);
  }

  .dropdown-signout {
    color: var(--error);
  }

  .dropdown-signout:hover {
    background: var(--error-bg);
    color: var(--error);
  }

  @media (max-width: 480px) {
    .title-bar {
      height: auto;
      gap: var(--space-xs);
      padding: var(--space-sm) var(--space-md);
    }
  }

  @media (min-width: 2560px) {
    .title-bar {
      max-width: 2400px;
      margin: 0 auto;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    }
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
