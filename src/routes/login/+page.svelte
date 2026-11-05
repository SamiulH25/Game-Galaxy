<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AuthCard from '$lib/components/AuthCard.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { form } = $props();
	let pending = $state(false);
	const next = $derived(page.url.searchParams.get('next') ?? '');
	const qs = $derived(next ? `?next=${encodeURIComponent(next)}` : '');
</script>

<svelte:head><title>Sign in · Game Galaxy</title></svelte:head>

<AuthCard title="Welcome back" subtitle="Sign in to sync saves, scores and achievements.">
	<form
		method="POST"
		use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update();
				pending = false;
			};
		}}
	>
		{#if form?.message}
			<p class="error" role="alert"><Icon name="alert" size={18} />{form.message}</p>
		{/if}
		<div class="field">
			<label for="username">Username</label>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="input" id="username" name="username" autocomplete="username" required value={form?.username ?? ''} autofocus />
		</div>
		<div class="field">
			<label for="password">Password</label>
			<input class="input" id="password" name="password" type="password" autocomplete="current-password" required />
		</div>
		<button class="btn btn-primary btn-lg" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
	</form>
	{#snippet footer()}
		New here? <a href="/signup{qs}">Create an account</a> · <a href={next || '/'}>Keep playing as a guest</a>
	{/snippet}
</AuthCard>

<style>
	.error {
		display: flex;
		gap: 8px;
		align-items: center;
		padding: 10px 12px;
		border-radius: 10px;
		background: rgba(255, 122, 138, 0.1);
		border: 1px solid rgba(255, 122, 138, 0.3);
		color: #ffc2ca;
		font-size: 14.5px;
	}
</style>
