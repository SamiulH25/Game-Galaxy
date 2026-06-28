<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { initAudio, setVolume } from '$lib/audio';
  import { settings, initMotionPreferences, initUiScale } from '$lib/stores/settings';
  import { getSeasonInfo } from '$lib/stores/progression';
  import { initViewport } from '$lib/stores/viewport';
  import { initNetworkMonitor } from '$lib/stores/network';
  import { initHighContrast, initDataPreferences } from '$lib/stores/settings';
  import { enableGalaxyRender } from '$lib/stores/galaxyRender';
  import { isAuthenticated } from '$lib/stores/auth';
  import '../app.css';
  import '../lib/mobile-shell.css';
  let { children } = $props();

  const season = getSeasonInfo();

  // Init audio on first user interaction
  function handleFirstClick() {
    initAudio();
    // Apply stored volume now that audio context is ready
    setVolume($settings.masterVolume);
    document.removeEventListener('click', handleFirstClick);
  }

  // Keep volume in sync with settings changes after audio is initialized
  $effect(() => {
    setVolume($settings.masterVolume);
  });

  onMount(() => {
    document.addEventListener('click', handleFirstClick);
    const cleanupMotion = initMotionPreferences();
    const cleanupUi = initUiScale();
    const cleanupViewport = initViewport();
    const cleanupNetwork = initNetworkMonitor();
    const cleanupContrast = initHighContrast();
    const cleanupData = initDataPreferences();
    document.documentElement.classList.add(season.themeClass);

    // Live galaxy for everyone (hero gates guests until sign-in)
    enableGalaxyRender();

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const unsubAuth = isAuthenticated.subscribe((authed) => {
      if (authed) enableGalaxyRender();
    });

    return () => {
      document.removeEventListener('click', handleFirstClick);
      cleanupMotion();
      cleanupUi();
      cleanupViewport();
      cleanupNetwork();
      cleanupContrast();
      cleanupData();
      unsubAuth();
      document.documentElement.classList.remove(season.themeClass);
    };
  });
</script>

<svelte:head>
  <meta name="description" content="Explore a 3D galaxy of browser games. Play free — sign in to sync saves and scores." />
  <meta name="theme-color" content="#0a0a2e" />
  <link rel="manifest" href="/manifest.json" />
  <meta property="og:title" content="Game Galaxy" />
  <meta property="og:description" content="A universe of browser games — click a planet and launch instantly." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div transition:fade={{ duration: 200 }}>
  {@render children()}
</div>