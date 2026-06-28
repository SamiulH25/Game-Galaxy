<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { GalaxyScene } from '$lib/three-scene';
  import {
    systems,
    currentSystemId,
    filteredGames,
    loadGalaxyData,
    startGalaxyCatalogWatch,
    stopGalaxyCatalogWatch,
    selectedPlanet,
    markGamePlayed,
    maybeShowOnboarding,
    games,
    discoveredGameIds,
    animateRevealGameId,
    markGameDiscovered,
    focusPlanetId,
    launchDiscoveredGame,
    showGame,
  } from '$lib/stores/galaxy';
  import { get } from 'svelte/store';
  import { play } from '$lib/audio';
  import { settings } from '$lib/stores/settings';
  import { galaxySceneApi, showUnchartedOnly } from '$lib/stores/progression';
  import { galaxyRenderReady } from '$lib/stores/galaxyRender';
  import { isAuthenticated } from '$lib/stores/auth';

  let container: HTMLDivElement;
  let scene = $state<GalaxyScene | undefined>(undefined);
  let webglFailed = $state(false);
  let initStarted = false;

  function handlePlanetClick(game: any) {
    if (!get(isAuthenticated)) return;
    markGamePlayed();
    maybeShowOnboarding();
    const isNew = markGameDiscovered(game.id);
    selectedPlanet.set({ ...game, __newDiscovery: isNew });
    play('select');
  }

  function handlePlanetDoubleClick(game: any) {
    if (!get(isAuthenticated)) return;
    if (launchDiscoveredGame(game)) {
      selectedPlanet.set(null);
      play('doorOpen');
    } else {
      handlePlanetClick(game);
    }
  }

  function syncGalaxyRendering(s: GalaxyScene) {
    if (get(showGame) || document.hidden) s.pauseRendering();
    else s.resumeRendering();
  }

  $effect(() => {
    if (!$galaxyRenderReady || initStarted || scene) return;
    initStarted = true;
    loadGalaxyData().catch(() => {});
    startGalaxyCatalogWatch();

    (async () => {
      try {
        const { GalaxyScene } = await import('$lib/three-scene');
        scene = new GalaxyScene(container, {
          onPlanetClick: handlePlanetClick,
          onPlanetDoubleClick: handlePlanetDoubleClick,
        });
        scene.applySettings($settings);
        scene.setInteractionsEnabled(get(isAuthenticated));
        syncGalaxyRendering(scene);
        galaxySceneApi.set({ recenter: () => scene?.recenterCamera() });
      } catch (e) {
        console.error('[Scene] Failed to initialize 3D scene:', e);
        webglFailed = true;
      }
    })();
  });

  let lastRenderedSystem: string | null = null;

  // React to system changes — rebuild planets
  $effect(() => {
    const sys = $currentSystemId;
    const g = $filteredGames;
    const s = $systems;
    if (!scene || !sys || g.length === 0) return;
    if (sys === lastRenderedSystem) return;
    lastRenderedSystem = sys;
    try { scene.loadAndRender(sys, g, s); } catch (e) { console.warn('[Scene] loadAndRender failed:', e); }
  });

  // React to settings changes
  $effect(() => {
    const s = $settings;
    if (scene) scene.applySettings(s);
  });

  $effect(() => {
    const ids = [...$discoveredGameIds];
    const revealId = $animateRevealGameId;
    if (!scene) return;
    if (revealId) {
      scene.revealPlanet(revealId);
      animateRevealGameId.set(null);
    }
    scene.setDiscoveredGameIds(ids, revealId);
  });

  $effect(() => {
    const id = $focusPlanetId;
    const sys = $currentSystemId;
    const g = $filteredGames;
    if (!scene || !id || !sys || g.length === 0) return;
    if (!g.some((game) => game.id === id)) return;
    const t = setTimeout(() => {
      scene?.focusPlanet(id);
    }, 120);
    return () => clearTimeout(t);
  });

  $effect(() => {
    const s = scene;
    const _gameOpen = $showGame;
    if (!s) return;
    syncGalaxyRendering(s);
    const onVisibility = () => syncGalaxyRendering(s);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  });

  $effect(() => {
    const authed = $isAuthenticated;
    if (scene) scene.setInteractionsEnabled(authed);
  });

  $effect(() => {
    if (!scene) return;
    scene.setHighlightUndiscoveredOnly($showUnchartedOnly);
  });

  onDestroy(() => {
    stopGalaxyCatalogWatch();
    galaxySceneApi.set(null);
    scene?.destroy();
  });
</script>

<div bind:this={container} class="scene-container" class:scene-fallback-active={webglFailed} class:scene-pending={!$galaxyRenderReady && !webglFailed}>
  {#if !$galaxyRenderReady && !webglFailed}
    <div class="scene-placeholder" aria-hidden="true"></div>
  {/if}
  {#if webglFailed}
    <div class="scene-fallback">
      <p class="fallback-title">3D view unavailable</p>
      <p class="fallback-desc">Your browser couldn't start WebGL. Open the side panel to browse and launch games.</p>
    </div>
  {/if}
</div>

<style>
  .scene-container {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 0;
    touch-action: none;
    -webkit-touch-callout: none;
    user-select: none;
  }

  .scene-pending {
    background: radial-gradient(ellipse at 50% 30%, rgba(32, 24, 64, 0.9) 0%, var(--bg-deepest) 70%);
  }

  .scene-placeholder {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 40%, rgba(48, 36, 96, 0.35) 0%, transparent 60%);
    animation: shimmer 2.4s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .scene-fallback-active {
    background: radial-gradient(ellipse at 50% 30%, rgba(32, 24, 64, 0.9) 0%, var(--bg-deepest) 70%);
  }

  .scene-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    padding: var(--space-xl);
    text-align: center;
    z-index: 1;
    pointer-events: none;
  }

  .fallback-title {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text-secondary);
  }

  .fallback-desc {
    font-size: var(--fs-sm);
    color: var(--text-muted);
    max-width: 320px;
    line-height: 1.5;
  }
</style>
