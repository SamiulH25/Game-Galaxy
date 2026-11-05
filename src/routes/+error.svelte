<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head><title>{page.status} · Game Galaxy</title></svelte:head>

<main class="wrap">
	<p class="code mono">{page.status}</p>
	<h1>{page.status === 404 ? 'Lost in space' : 'Something went wrong'}</h1>
	<p class="msg">{page.error?.message ?? 'Unexpected error'}</p>
	<div class="actions">
		<a class="btn btn-primary" href="/"><Icon name="orbit" size={18} /> Back to the galaxy</a>
		<a class="btn" href="/library">Browse the library</a>
	</div>
</main>

<style>
	.wrap {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 12px;
		padding: calc(var(--header-h) + 24px) 16px 48px;
		text-align: center;
	}
	.code {
		font-size: 64px;
		font-weight: 700;
		line-height: 1;
		background: linear-gradient(180deg, var(--accent-strong), var(--accent) 60%, #8a4a10);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	h1 {
		font-size: clamp(28px, 4vw, 40px);
	}
	.msg {
		color: var(--muted);
		max-width: 50ch;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 12px;
	}
</style>
