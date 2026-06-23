<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { initAudio, setVolume } from '$lib/audio';
  import { settings } from '$lib/stores/settings';
  import '../app.css';
  let { children } = $props();

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
    return () => document.removeEventListener('click', handleFirstClick);
  });
</script>

<div transition:fade={{ duration: 200 }}>
  {@render children()}
</div>