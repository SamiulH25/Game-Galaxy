<script lang="ts">
	import type { Snippet } from 'svelte';
	import Logo from './Logo.svelte';

	let { title, subtitle, children, footer }: { title: string; subtitle: string; children: Snippet; footer: Snippet } = $props();
</script>

<main class="wrap">
	<div class="card panel">
		<Logo size={44} />
		<h1>{title}</h1>
		<p class="subtitle">{subtitle}</p>
		{@render children()}
		<div class="footer">{@render footer()}</div>
	</div>
</main>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: calc(var(--header-h) + 24px) 16px 48px;
	}
	.card {
		width: min(420px, 100%);
		padding: 32px clamp(20px, 5vw, 36px);
		display: grid;
		gap: 10px;
		justify-items: center;
		text-align: center;
	}
	h1 {
		font-size: 28px;
		margin-top: 8px;
	}
	.subtitle {
		color: var(--muted);
		margin-bottom: 14px;
	}
	.card :global(form) {
		width: 100%;
		display: grid;
		gap: 16px;
		text-align: left;
	}
	.footer {
		margin-top: 12px;
		color: var(--muted);
		font-size: 14.5px;
	}
</style>
