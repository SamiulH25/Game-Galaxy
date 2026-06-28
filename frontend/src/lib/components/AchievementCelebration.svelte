<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { play } from '$lib/audio';

  let {
    title,
    icon = 'star',
    onDismiss,
  }: {
    title: string;
    icon?: string;
    onDismiss: () => void;
  } = $props();

  const iconMap: Record<string, string> = {
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    trophy: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 9v1a6 6 0 0 0 12 0V9M12 15v4M8 21h8',
    bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    diamond: 'M6 3h12l4 7-10 11L2 10l4-7z',
    moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  };

  let particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 10 + ((i * 37) % 80),
    delay: (i * 0.08) % 1.2,
    hue: i % 3 === 0 ? '56' : i % 3 === 1 ? '190' : '270',
  }));

  $effect(() => {
    play('powerup');
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDismiss();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="celebration-overlay" transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" aria-label="Achievement unlocked">
  <button class="celebration-backdrop" aria-label="Dismiss" onclick={onDismiss}></button>

  <div class="celebration-card" transition:scale={{ start: 0.88, duration: 400, easing: (t) => 1 - Math.pow(1 - t, 3) }}>
    <div class="celebration-rays" aria-hidden="true"></div>

    <div class="celebration-particles" aria-hidden="true">
      {#each particles as p (p.id)}
        <span
          class="particle"
          style="--x: {p.x}%; --delay: {p.delay}s; --hue: {p.hue}"
        ></span>
      {/each}
    </div>

    <div class="celebration-icon-wrap">
      <div class="celebration-icon-ring"></div>
      <div class="celebration-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
          <path d={iconMap[icon] || iconMap.star} />
        </svg>
      </div>
    </div>

    <p class="celebration-label">Achievement Unlocked</p>
    <h2 class="celebration-title">{title}</h2>
    <p class="celebration-sub">Added to your explorer log</p>

    <button class="celebration-btn" onclick={onDismiss}>Continue</button>
  </div>
</div>

<style>
  .celebration-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }

  .celebration-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(2, 2, 12, 0.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: none;
    cursor: pointer;
  }

  .celebration-card {
    position: relative;
    width: min(400px, 92vw);
    text-align: center;
    padding: var(--space-xl) var(--space-lg);
    background: linear-gradient(165deg, rgba(22, 22, 56, 0.98) 0%, rgba(12, 12, 32, 0.98) 100%);
    border: 1px solid rgba(232, 168, 56, 0.28);
    border-radius: var(--radius-lg);
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.65),
      0 0 60px rgba(232, 168, 56, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    overflow: hidden;
    z-index: 1;
  }

  .celebration-rays {
    position: absolute;
    inset: -50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      rgba(232, 168, 56, 0.06) 30deg,
      transparent 60deg,
      rgba(56, 200, 232, 0.04) 120deg,
      transparent 150deg,
      rgba(232, 168, 56, 0.06) 210deg,
      transparent 240deg
    );
    animation: spin 12s linear infinite;
    pointer-events: none;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .celebration-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .particle {
    position: absolute;
    bottom: 30%;
    left: var(--x);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: hsl(var(--hue), 80%, 60%);
    box-shadow: 0 0 8px hsl(var(--hue), 80%, 55%);
    animation: rise 1.8s ease-out var(--delay) forwards;
    opacity: 0;
  }

  @keyframes rise {
    0% { opacity: 0; transform: translateY(0) scale(0.5); }
    15% { opacity: 1; }
    100% { opacity: 0; transform: translateY(-120px) scale(0.2); }
  }

  .celebration-icon-wrap {
    position: relative;
    width: 88px;
    height: 88px;
    margin: 0 auto var(--space-md);
  }

  .celebration-icon-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid rgba(232, 168, 56, 0.35);
    animation: ringPulse 2s ease-in-out infinite;
  }

  @keyframes ringPulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.12); opacity: 0.4; }
  }

  .celebration-icon {
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(232, 168, 56, 0.25), rgba(232, 168, 56, 0.08));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    box-shadow: 0 0 30px rgba(232, 168, 56, 0.2);
  }

  .celebration-label {
    position: relative;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
  }

  .celebration-title {
    position: relative;
    font-size: var(--fs-xl);
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .celebration-sub {
    position: relative;
    font-size: var(--fs-xs);
    color: var(--text-muted);
    margin-bottom: var(--space-lg);
  }

  .celebration-btn {
    position: relative;
    padding: 12px 32px;
    background: linear-gradient(135deg, var(--accent), #d4952e);
    color: var(--bg-deepest);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 700;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    transition: transform 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out);
    box-shadow: 0 4px 20px rgba(232, 168, 56, 0.3);
  }

  .celebration-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(232, 168, 56, 0.4);
  }
</style>
