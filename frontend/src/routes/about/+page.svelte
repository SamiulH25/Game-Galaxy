<script lang="ts">
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import { play } from '$lib/audio';
</script>

<svelte:head>
  <title>About — Game Galaxy</title>
  <meta name="description" content="About Game Galaxy — a browser game portal with cloud saves, achievements, and a 3D galaxy to explore." />
</svelte:head>

<div class="about-page" transition:fade={{ duration: 250 }}>
  <nav class="about-nav">
    <button class="back-btn" onclick={() => { play('doorClose'); goto('/'); }}>
      ← Galaxy
    </button>
  </nav>

  <main class="about-content">
    <h1>About Game Galaxy</h1>
    <p class="lead">
      Game Galaxy is a browser-first arcade — explore a 3D star map, discover worlds, and launch games instantly. No install, no app store.
    </p>

    <section>
      <h2>How it works</h2>
      <ul>
        <li>Click planets in the galaxy to preview and launch games.</li>
        <li>Play as a guest — sign in anytime to sync scores, saves, and achievements.</li>
        <li>Progress is stored locally when offline; cloud sync resumes when you reconnect.</li>
      </ul>
    </section>

    <section>
      <h2>Your data</h2>
      <ul>
        <li><strong>Local:</strong> discovery progress, settings, visit streak, and session preferences stay in your browser.</li>
        <li><strong>Account:</strong> username, saves, scores, and achievements are stored on our server when signed in.</li>
        <li>We do not sell your data. Auth tokens stay in local storage until you sign out.</li>
      </ul>
    </section>

    <section>
      <h2>Offline & errors</h2>
      <p>
        If the server is unreachable, you can still browse discovered games and play locally. Leaderboards and cloud saves need a connection — the site will tell you when sync is unavailable.
      </p>
    </section>

    <section>
      <h2>Contact</h2>
      <p>Built as an open exploration of what a modern browser game hub can feel like.</p>
    </section>
  </main>
</div>

<style>
  .about-page {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--bg-deepest);
    overflow-y: auto;
    color: var(--text);
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .about-nav {
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--border);
    background: rgba(8, 8, 24, 0.92);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .back-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    cursor: pointer;
    font-family: inherit;
    min-height: 44px;
  }

  .back-btn:hover {
    border-color: var(--border-hover);
    color: var(--text);
  }

  .about-content {
    max-width: 640px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  h1 {
    font-size: var(--fs-xl);
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .lead {
    font-size: var(--fs-md);
    color: var(--text-secondary);
    line-height: 1.6;
  }

  h2 {
    font-size: var(--fs-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent);
    margin-bottom: var(--space-sm);
  }

  section {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-md) var(--space-lg);
    background: rgba(255, 255, 255, 0.02);
  }

  ul {
    padding-left: 1.2em;
    color: var(--text-secondary);
    font-size: var(--fs-sm);
    line-height: 1.65;
  }

  li + li {
    margin-top: 6px;
  }

  p {
    font-size: var(--fs-sm);
    color: var(--text-secondary);
    line-height: 1.65;
  }

  @media (max-width: 640px) {
    .about-nav {
      padding: max(var(--space-md), env(safe-area-inset-top)) var(--space-md) var(--space-md);
    }

    .back-btn {
      min-height: 48px;
      padding: 10px 16px;
      width: 100%;
      max-width: 200px;
    }

    .about-content {
      padding: var(--space-md);
      padding-bottom: max(var(--space-xl), env(safe-area-inset-bottom));
    }

    section {
      padding: var(--space-md);
    }
  }
</style>
