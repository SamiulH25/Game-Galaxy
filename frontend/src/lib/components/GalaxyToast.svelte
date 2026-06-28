<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { toasts, dismissToast } from '$lib/stores/toast';

  const kindClass: Record<string, string> = {
    info: '',
    success: 'toast-success',
    error: 'toast-error',
  };
</script>

<div class="toast-stack" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div
      class="galaxy-toast {kindClass[toast.kind] || ''}"
      role="status"
      in:fly={{ y: 12, duration: 220 }}
      out:fade={{ duration: 150 }}
    >
      <span>{toast.message}</span>
      <button class="toast-dismiss" onclick={() => dismissToast(toast.id)} aria-label="Dismiss">✕</button>
    </div>
  {/each}
</div>

<style>
  .toast-stack {
    position: fixed;
    bottom: clamp(16px, 2.5vw, 32px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 400;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    width: min(420px, calc(100vw - 2 * var(--space-lg)));
    pointer-events: none;
  }

  .galaxy-toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: rgba(12, 12, 32, 0.96);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--text-secondary);
    font-family: 'DM Sans', system-ui, sans-serif;
    pointer-events: auto;
  }

  .toast-success {
    border-color: var(--success-border);
    color: var(--success);
    background: rgba(8, 24, 16, 0.96);
  }

  .toast-error {
    border-color: var(--error-border);
    color: var(--error);
    background: rgba(28, 8, 8, 0.96);
  }

  .toast-dismiss {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
    font-size: 12px;
    border-radius: var(--radius-xs);
  }

  .toast-dismiss:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.06);
  }
</style>
