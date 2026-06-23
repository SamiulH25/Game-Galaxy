<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GalaxyScene } from '$lib/three-scene';
  import { systems, currentSystemId, filteredGames, loadGalaxyData, selectedPlanet, hasPlayedGame, games } from '$lib/stores/galaxy';
  import { isAuthenticated } from '$lib/stores/auth';
  import { play } from '$lib/audio';
  import { settings } from '$lib/stores/settings';

  let container: HTMLDivElement;
  let scene: GalaxyScene | undefined;

  onMount(() => {
    // Load data and build scene
    loadGalaxyData().catch(() => {});

    try {
      scene = new GalaxyScene(container, {
        onPlanetClick(game) {
          if ($hasPlayedGame || $isAuthenticated) {
            selectedPlanet.set({ ...game });
            play('select');
          }
        },
      });

      // Apply initial settings once scene is ready
      scene.applySettings($settings);
    } catch (e) {
      console.error('[Scene] Failed to initialize 3D scene:', e);
    }
  });

  // React to system changes — rebuild planets
  $effect(() => {
    const sys = $currentSystemId;
    const g = $filteredGames;
    const s = $systems;
    if (scene && sys && g.length > 0) {
      try { scene.loadAndRender(sys, g, s); } catch (e) { console.warn('[Scene] loadAndRender failed:', e); }
    }
  });

  // React to settings changes
  $effect(() => {
    const s = $settings;
    if (scene) scene.applySettings(s);
  });

  onDestroy(() => {
    scene?.destroy();
    // Clear galaxy stores so re-mount doesn't render stale data before loadGalaxyData completes
    games.set([]);
    systems.set([]);
    currentSystemId.set(null);
    hasPlayedGame.set(false);
  });
</script>

<div bind:this={container} class="scene-container"></div>

<style>
  .scene-container {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 0;
  }
</style>
