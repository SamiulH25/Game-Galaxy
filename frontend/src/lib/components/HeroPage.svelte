<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { showAuth, games } from '$lib/stores/galaxy';
  import { play } from '$lib/audio';

  let mounted = $state(false);
  let mouseX = $state(0);
  let mouseY = $state(0);

  let motionReduced = $state(false);

  onMount(() => {
    mounted = true;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { motionReduced = mq.matches; };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });

  function handleMouseMove(e: MouseEvent) {
    if (motionReduced) return;
    mouseX = (e.clientX / window.innerWidth - 0.5) * 12;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 12;
  }

  function openAuth() {
    showAuth.set(true);
    play('click');
  }

  let gameCount = $derived($games.length);
</script>

<svelte:window onmousemove={handleMouseMove} />

{#if mounted}
  <div class="hero-container" class:motion-reduced={motionReduced} transition:fade={{ duration: motionReduced ? 0 : 400 }}>
    <div class="hero-scrim" aria-hidden="true"></div>

    <div class="hero-content" style="transform: translate({mouseX * 0.08}px, {mouseY * 0.08}px)">
      <h1 class="hero-title" in:fly={{ y: 30, duration: 700, delay: 200 }}>
        <span class="title-accent">Game Galaxy</span>
      </h1>

      <p class="hero-tagline" in:fly={{ y: 20, duration: 600, delay: 350 }}>
        A universe of browser games
      </p>

      <p class="hero-subtitle" in:fly={{ y: 20, duration: 600, delay: 500 }}>
        {#if gameCount > 0}
          {gameCount} {gameCount === 1 ? 'game' : 'games'} orbit in the live galaxy behind you.
          <br />
        {/if}
        Sign in to fly between worlds, discover planets, and play.
      </p>

      <div class="hero-cta-group" in:fly={{ y: 20, duration: 600, delay: 700 }}>
        <button class="cta-primary" onclick={openAuth}>Sign in to explore</button>
        <p class="hero-play-hint">
          <span class="hint-pulse"></span>
          Free account — saves, scores, and achievements sync across devices
        </p>
        <button class="cta-secondary cta-save" onclick={openAuth}>
          Create account
        </button>
      </div>

      <div class="hero-features" in:fly={{ y: 20, duration: 600, delay: 900 }}>
        <div class="feature-item">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
          </div>
          <span>Cloud Saves</span>
        </div>
        <div class="feature-divider"></div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <span>Leaderboards</span>
        </div>
        <div class="feature-divider"></div>
        <div class="feature-item">
          <div class="feature-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span>Discover worlds</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .hero-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }

  .hero-scrim {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 45%, rgba(10, 10, 30, 0.35) 0%, rgba(10, 10, 30, 0.72) 70%),
      linear-gradient(180deg, rgba(10, 10, 30, 0.2) 0%, rgba(10, 10, 30, 0.55) 100%);
    pointer-events: none;
  }

  .hero-content {
    position: relative;
    z-index: 10;
    text-align: center;
    padding: var(--space-xl);
    max-width: 680px;
    pointer-events: none;
  }

  .hero-title {
    margin-bottom: var(--space-sm);
    filter: drop-shadow(0 2px 24px rgba(0, 0, 0, 0.65));
  }

  .title-accent {
    display: block;
    font-size: clamp(40px, 7vw, 72px);
    font-weight: 800;
    color: var(--text);
    letter-spacing: -1.5px;
    line-height: 1.05;
    background: linear-gradient(135deg, var(--text) 0%, var(--accent) 45%, var(--cyan) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .hero-tagline {
    font-size: var(--fs-md);
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: var(--space-md);
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
  }

  .hero-subtitle {
    font-size: var(--fs-base);
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: var(--space-xl);
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
  }

  .hero-cta-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-xl);
    pointer-events: auto;
  }

  .hero-play-hint {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
    padding: 10px 18px;
    background: rgba(8, 8, 28, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 100px;
    backdrop-filter: blur(12px);
  }

  .hint-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 12px var(--accent);
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .cta-primary {
    display: block;
    width: 100%;
    max-width: 280px;
    margin: 0 auto;
    min-height: 48px;
    padding: 12px 24px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(232, 168, 56, 0.45);
    background: linear-gradient(135deg, rgba(232, 168, 56, 0.22), rgba(232, 168, 56, 0.1));
    color: var(--accent);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: var(--fs-sm);
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s var(--ease-out), border-color 0.2s var(--ease-out), transform 0.15s var(--ease-out);
  }

  .cta-primary:hover {
    background: linear-gradient(135deg, rgba(232, 168, 56, 0.32), rgba(232, 168, 56, 0.16));
    border-color: rgba(232, 168, 56, 0.6);
    transform: translateY(-1px);
  }

  .cta-save {
    font-size: var(--fs-xs);
    padding: 10px 18px;
    min-height: 40px;
    color: var(--text-muted);
    border: 1px solid transparent;
    background: transparent;
    border-radius: var(--radius-sm);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
  }

  .cta-save:hover {
    color: var(--text);
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .hero-features {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    pointer-events: none;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 500;
    letter-spacing: 0.5px;
    padding: 6px 10px;
    background: rgba(8, 8, 28, 0.45);
    border-radius: var(--radius-xs);
    backdrop-filter: blur(6px);
  }

  .feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: var(--accent);
  }

  .feature-divider {
    width: 1px;
    height: 24px;
    background: rgba(255,255,255,0.08);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  @media (max-width: 640px) {
    .hero-content {
      padding: var(--space-lg);
    }

    .hero-cta-group {
      width: 100%;
    }

    .cta-save {
      width: 100%;
    }

    .feature-divider {
      display: none;
    }

    .feature-item {
      flex: 1;
      min-width: 90px;
      justify-content: center;
    }
  }

  .hero-container.motion-reduced .hint-pulse {
    animation: none !important;
  }
</style>
