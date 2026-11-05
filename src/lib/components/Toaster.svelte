<script lang="ts">
	import { fly } from 'svelte/transition';
	import { toasts } from '$lib/toasts.svelte';
	import Icon from './Icon.svelte';
</script>

<div class="toaster" role="status" aria-live="polite">
	{#each toasts.list as toast (toast.id)}
		<div class="toast tone-{toast.tone ?? 'default'}" in:fly={{ y: 16, duration: 220 }} out:fly={{ y: 8, duration: 160 }}>
			{#if toast.icon}
				<span class="icon"><Icon name={toast.icon} size={20} /></span>
			{/if}
			<div class="text">
				<p class="title">{toast.title}</p>
				{#if toast.body}<p class="body">{toast.body}</p>{/if}
			</div>
			<button class="close" type="button" aria-label="Dismiss" onclick={() => toasts.dismiss(toast.id)}>
				<Icon name="x" size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		z-index: 100;
		right: max(16px, env(safe-area-inset-right));
		bottom: max(16px, env(safe-area-inset-bottom));
		display: grid;
		gap: 10px;
		width: min(380px, calc(100vw - 32px));
		pointer-events: none;
	}
	.toast {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 12px 14px 16px;
		border-radius: var(--radius);
		background: var(--panel-solid);
		border: 1px solid var(--line-strong);
		box-shadow: var(--shadow);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: rgba(143, 179, 255, 0.12);
		color: var(--sky);
		flex: none;
	}
	.tone-good .icon {
		background: rgba(99, 226, 168, 0.12);
		color: var(--good);
	}
	.tone-bad .icon {
		background: rgba(255, 122, 138, 0.12);
		color: var(--bad);
	}
	.tone-achievement {
		border-color: rgba(255, 181, 71, 0.45);
		background: linear-gradient(135deg, rgba(255, 181, 71, 0.14), transparent 60%), var(--panel-solid);
	}
	.tone-achievement .icon {
		background: rgba(255, 181, 71, 0.16);
		color: var(--accent);
	}
	.text {
		flex: 1;
		min-width: 0;
		padding-top: 1px;
	}
	.title {
		font-weight: 600;
		font-size: 15px;
	}
	.body {
		color: var(--muted);
		font-size: 14px;
		margin-top: 2px;
	}
	.close {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
	}
	.close:hover {
		background: rgba(255, 255, 255, 0.08);
		color: var(--ink);
	}
</style>
