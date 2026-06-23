<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { showAuth, systems, games } from '$lib/stores/galaxy';
  import { isAuthenticated, user } from '$lib/stores/auth';
  import { play } from '$lib/audio';

  let mounted = $state(false);
  let mouseX = $state(0);
  let mouseY = $state(0);

  onMount(() => {
    mounted = true;
  });

  function handleMouseMove(e: MouseEvent) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
  }

  function openAuth() {
    showAuth.set(true);
    play('click');
  }

  let gameCount = $derived($games.length);
  let systemCount = $derived($systems.length);
</script>

<svelte:window onmousemove={handleMouseMove} />

{#if mounted}
  <div class="hero-container" transition:fade={{ duration: 400 }}>
    <div class="hero-bg">
      <div class="starfield"></div>
      <div class="nebula nebula-1"></div>
      <div class="nebula nebula-2"></div>
      <div class="nebula nebula-3"></div>
      <div class="grid-floor"></div>
    </div>

    <div class="hero-content" style="transform: translate({mouseX * 0.1}px, {mouseY * 0.1}px)">
      <div class="hero-badge" in:fly={{ y: 20, duration: 600, delay: 200 }}>
        <span class="badge-dot"></span>
        <span>Explore the Galaxy</span>
      </div>

      <h1 class="hero-title" in:fly={{ y: 30, duration: 700, delay: 300 }}>
        <span class="title-line">Welcome to</span>
        <span class="title-accent">Game Galaxy</span>
      </h1>

      <p class="hero-subtitle" in:fly={{ y: 20, duration: 600, delay: 500 }}>
        A universe of {gameCount} playable games across {systemCount} solar systems.
        <br/>Click planets to explore, play, and save your progress.
      </p>

      {#if !$isAuthenticated}
        <div class="hero-cta-group" in:fly={{ y: 20, duration: 600, delay: 700 }}>
          <button class="cta-primary" onclick={openAuth}>
            <span class="cta-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </span>
            Sign In to Save Progress
          </button>
          <button class="cta-secondary" onclick={openAuth}>
            Create Account
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
            <span>Auto-Sync</span>
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
            <span>Cross-Device</span>
          </div>
        </div>
      {:else}
        <div class="hero-welcome" in:fly={{ y: 20, duration: 600, delay: 700 }}>
          <span class="welcome-text">Welcome back, <strong>{$user?.username}</strong></span>
          <span class="welcome-hint">Click any planet to start playing</span>
        </div>
      {/if}

      <div class="hero-scroll-hint" in:fade={{ duration: 600, delay: 1200 }}>
        <span>Click a planet to begin</span>
        <div class="scroll-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 13l5 5 5-5"/>
            <path d="M7 6l5 5 5-5"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="hero-particles">
      {#each Array(20) as _, i}
        <div 
          class="particle" 
          style="
            --delay: {((i * 7 + 3) % 50) / 10}s;
            --duration: {3 + ((i * 13) % 40) / 10}s;
            --x: {((i * 17 + 11) % 100)}%;
            --y: {((i * 23 + 7) % 100)}%;
            --size: {2 + ((i * 5) % 30) / 10}px;
          "
        ></div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .hero-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .starfield {
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8) 0%, transparent 100%),
      radial-gradient(1px 1px at 30% 70%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.7) 0%, transparent 100%),
      radial-gradient(1px 1px at 70% 40%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.6) 0%, transparent 100%),
      radial-gradient(1px 1px at 15% 85%, rgba(255,255,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 85% 15%, rgba(255,255,255,0.5) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 25% 45%, rgba(232,168,56,0.6) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 75% 25%, rgba(56,200,232,0.5) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 45% 65%, rgba(168,120,255,0.4) 0%, transparent 100%);
    animation: twinkle 4s ease-in-out infinite alternate;
  }

  .nebula {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.3;
    animation: nebulaPulse 8s ease-in-out infinite alternate;
  }

  .nebula-1 {
    width: 600px;
    height: 600px;
    top: -200px;
    right: -100px;
    background: radial-gradient(circle, rgba(232,168,56,0.4) 0%, transparent 70%);
    animation-delay: 0s;
  }

  .nebula-2 {
    width: 500px;
    height: 500px;
    bottom: -150px;
    left: -100px;
    background: radial-gradient(circle, rgba(56,200,232,0.3) 0%, transparent 70%);
    animation-delay: 2s;
  }

  .nebula-3 {
    width: 400px;
    height: 400px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(168,80,232,0.2) 0%, transparent 70%);
    animation-delay: 4s;
  }

  .grid-floor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40%;
    background: 
      linear-gradient(180deg, transparent 0%, rgba(232,168,56,0.03) 100%),
      repeating-linear-gradient(
        90deg,
        rgba(232,168,56,0.03) 0px,
        rgba(232,168,56,0.03) 1px,
        transparent 1px,
        transparent 80px
      ),
      repeating-linear-gradient(
        0deg,
        rgba(232,168,56,0.03) 0px,
        rgba(232,168,56,0.03) 1px,
        transparent 1px,
        transparent 80px
      );
    transform: perspective(500px) rotateX(60deg);
    transform-origin: bottom;
    mask-image: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%);
    -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%);
  }

  .hero-content {
    position: relative;
    z-index: 10;
    text-align: center;
    padding: var(--space-xl);
    max-width: 680px;
    pointer-events: auto;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    background: rgba(232,168,56,0.08);
    border: 1px solid rgba(232,168,56,0.2);
    border-radius: 100px;
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: var(--space-lg);
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s ease-in-out infinite;
  }

  .hero-title {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: var(--space-md);
  }

  .title-line {
    font-size: var(--fs-md);
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 4px;
    text-transform: uppercase;
  }

  .title-accent {
    font-size: clamp(32px, 5vw, 56px);
    font-weight: 800;
    color: var(--text);
    letter-spacing: -1px;
    line-height: 1.1;
    background: linear-gradient(135deg, var(--text) 0%, var(--accent) 50%, var(--cyan) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: none;
  }

  .hero-subtitle {
    font-size: var(--fs-base);
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: var(--space-xl);
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-cta-group {
    display: flex;
    gap: var(--space-sm);
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: var(--space-xl);
  }

  .cta-primary {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 28px;
    background: linear-gradient(135deg, var(--accent) 0%, #d4952e 100%);
    color: var(--bg-deepest);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 700;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
    box-shadow: 0 4px 20px rgba(232,168,56,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
    min-height: 48px;
  }

  .cta-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(232,168,56,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
    background: linear-gradient(135deg, #f0b848 0%, var(--accent) 100%);
  }

  .cta-primary:active {
    transform: translateY(0);
  }

  .cta-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cta-secondary {
    padding: 14px 28px;
    background: rgba(255,255,255,0.04);
    color: var(--text-secondary);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    transition: all 0.2s var(--ease-out);
    min-height: 48px;
  }

  .cta-secondary:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.15);
    color: var(--text);
  }

  .hero-features {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .feature-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: var(--radius-xs);
    color: var(--accent);
  }

  .feature-divider {
    width: 1px;
    height: 24px;
    background: rgba(255,255,255,0.08);
  }

  .hero-welcome {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  .welcome-text {
    font-size: var(--fs-md);
    color: var(--text-secondary);
  }

  .welcome-text strong {
    color: var(--accent);
    font-weight: 700;
  }

  .welcome-hint {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    letter-spacing: 0.5px;
  }

  .hero-scroll-hint {
    position: absolute;
    bottom: -60px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.6;
  }

  .scroll-arrow {
    animation: bounce 2s ease-in-out infinite;
  }

  .hero-particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .particle {
    position: absolute;
    width: var(--size);
    height: var(--size);
    background: rgba(232,168,56,0.6);
    border-radius: 50%;
    left: var(--x);
    top: var(--y);
    animation: float var(--duration) ease-in-out var(--delay) infinite;
    box-shadow: 0 0 6px rgba(232,168,56,0.4);
  }

  @keyframes twinkle {
    0% { opacity: 0.6; }
    100% { opacity: 1; }
  }

  @keyframes nebulaPulse {
    0% { opacity: 0.2; transform: scale(1); }
    100% { opacity: 0.35; transform: scale(1.1); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    50% { transform: translateY(-30px) translateX(10px); }
  }

  @media (max-width: 640px) {
    .hero-content {
      padding: var(--space-lg);
    }

    .hero-cta-group {
      flex-direction: column;
      width: 100%;
    }

    .cta-primary, .cta-secondary {
      width: 100%;
      justify-content: center;
    }

    .hero-features {
      gap: var(--space-sm);
    }

    .feature-divider {
      display: none;
    }

    .feature-item {
      flex: 1;
      min-width: 80px;
      justify-content: center;
    }
  }
</style>
