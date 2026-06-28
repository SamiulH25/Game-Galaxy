<script lang="ts">
  import { fade } from 'svelte/transition';
  import { play } from '$lib/audio';

  interface Props {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    title = 'Confirm',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
  }: Props = $props();

  function handleConfirm() {
    play('click');
    onConfirm();
  }

  function handleCancel() {
    play('cancel');
    onCancel();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleCancel();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="confirm-overlay" transition:fade={{ duration: 150 }} role="dialog" aria-modal="true">
  <button class="confirm-backdrop" aria-label="Cancel" onclick={handleCancel}></button>
  <div class="confirm-card">
    <h3>{title}</h3>
    <p>{message}</p>
    <div class="confirm-actions">
      <button class="btn ghost" onclick={handleCancel}>{cancelLabel}</button>
      <button class="btn primary" onclick={handleConfirm}>{confirmLabel}</button>
    </div>
  </div>
</div>

<style>
  .confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 350;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
  }

  .confirm-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(4, 4, 18, 0.75);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    cursor: pointer;
  }

  .confirm-card {
    position: relative;
    width: min(360px, 94vw);
    padding: var(--space-lg);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 1;
  }

  h3 {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text);
    margin-bottom: var(--space-xs);
  }

  p {
    font-size: var(--fs-sm);
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: var(--space-md);
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
  }

  .btn {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    min-height: 44px;
    border: 1px solid var(--border);
  }

  .btn.ghost {
    background: transparent;
    color: var(--text-muted);
  }

  .btn.ghost:hover {
    color: var(--text-secondary);
    border-color: var(--border-hover);
  }

  .btn.primary {
    background: rgba(232, 80, 80, 0.12);
    border-color: var(--error-border);
    color: var(--error);
  }

  .btn.primary:hover {
    background: rgba(232, 80, 80, 0.2);
  }
</style>
