<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  let { title, icon = 'star' } = $props();

  const iconMap: Record<string, string> = {
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    trophy: 'M8 21l3-2 3 2M12 3v6M18 9c0 3.5-2.5 6-6 6s-6-2.5-6-6M6 3h12M6 3v3c0 1.5-1 2-2 3-1 1-1 2-1 3h18c0-1 0-2-1-3s-2-1.5-2-3V3',
    rocket: 'M4 16l4.5-4.5M19 5l-4 4M5 19l3-3M15 9l-3 3M12 12l4-4M4 20l4-4M12 2v4M17 7l3 3M3 3l3 3M5 13l6-6',
    compass: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm3-11l-4 2-2 4 4-2 2-4z',
    galaxy: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-2-8l2-2 2 2-2 2z',
    floppy: 'M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-4-4zm-7 16a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm3-10H6V4h9v4z',
    leaderboard: 'M3 21h18M3 10h4v11H3zM10 7h4v14h-4zM17 3h4v18h-4z',
  };
</script>

{#key title}
  <div class="ach-toast" transition:fly={{ y: -12, duration: 400, easing: (t) => 1 - Math.pow(1 - t, 3) }}>
    <div class="ach-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d={iconMap[icon] || iconMap.star} />
      </svg>
    </div>
    <div class="ach-text">
      <span class="ach-label">Achievement Unlocked!</span>
      <span class="ach-title">{title}</span>
    </div>
  </div>
{/key}

<style>
  .ach-toast {
    position: fixed;
    top: clamp(60px, 6vw, 80px);
    right: var(--space-lg);
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, rgba(232,168,56,0.12), rgba(232,168,56,0.04));
    border: 1px solid rgba(232,168,56,0.2);
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-md);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(232,168,56,0.08);
    z-index: 400;
    backdrop-filter: blur(12px);
  }
  .ach-icon {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(232,168,56,0.15);
    display: flex; align-items: center; justify-content: center;
    color: var(--accent);
    flex-shrink: 0;
  }
  .ach-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .ach-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--accent);
  }
  .ach-title {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text);
  }
</style>
