<script lang="ts">
  import { goto } from '$app/navigation';
  import { play } from '$lib/audio';

  function goAbout() {
    play('click');
    goto('/about');
  }
</script>

<footer class="site-footer">
  <button class="footer-link" onclick={goAbout}>About & Privacy</button>
  <span class="footer-dot" aria-hidden="true">·</span>
  <span class="footer-copy">Play free — no download required</span>
</footer>

<style>
  .site-footer {
    position: fixed;
    bottom: calc(var(--space-sm) + env(safe-area-inset-bottom, 0px));
    right: var(--space-lg);
    z-index: 12;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    color: var(--text-muted);
    pointer-events: none;
    opacity: 0.7;
  }

  .footer-link {
    pointer-events: auto;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 10px;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    padding: 4px;
    min-height: 32px;
  }

  .footer-link:hover {
    color: var(--text-secondary);
  }

  .footer-dot {
    opacity: 0.4;
  }

  @media (max-width: 640px) {
    .site-footer {
      display: none;
    }
  }
</style>
