<script lang="ts">
  import { galaxySceneApi } from '$lib/stores/progression';
  import { play } from '$lib/audio';

  function recenter() {
    $galaxySceneApi?.recenter();
    play('click');
  }
</script>

{#if $galaxySceneApi}
  <button class="recenter-btn galaxy-recenter-btn" onclick={recenter} title="Recenter galaxy view" aria-label="Recenter galaxy">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
    </svg>
  </button>
{/if}

<style>
  .recenter-btn {
    position: fixed;
    bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
    left: var(--space-lg);
    z-index: 17;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(8, 8, 28, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--text-muted);
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    transition: color 0.15s, border-color 0.15s;
  }

  .recenter-btn:hover {
    color: var(--cyan);
    border-color: rgba(56, 200, 232, 0.35);
  }

  @media (max-width: 640px) {
    .recenter-btn {
      bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
