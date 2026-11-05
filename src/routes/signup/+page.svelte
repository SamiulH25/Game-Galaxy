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

<svelte:head><title>Create account · Game Galaxy</title></svelte:head>

<AuthCard title="Create your account" subtitle="Keep your saves, post scores and collect achievements on any device.">
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
			<input
				class="input"
				id="username"
				name="username"
				autocomplete="username"
				required
				minlength="3"
				maxlength="24"
				pattern="[A-Za-z0-9_\-]+"
				value={form?.username ?? ''}
				aria-invalid={form?.field === 'username' ? 'true' : undefined}
				aria-describedby="username-hint"
				autofocus
			/>
			<span class="hint" id="username-hint">3–24 characters. Letters, numbers, _ and -. Shown on leaderboards.</span>
		</div>
		<div class="field">
			<label for="password">Password</label>
			<input
				class="input"
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				required
				minlength="8"
				maxlength="200"
				aria-invalid={form?.field === 'password' ? 'true' : undefined}
				aria-describedby="password-hint"
			/>
			<span class="hint" id="password-hint">At least 8 characters.</span>
		</div>
		<button class="btn btn-primary btn-lg" type="submit" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</button>
		<p class="note">Anything you've played as a guest on this device is added to your new account.</p>
	</form>
	{#snippet footer()}
		Already have an account? <a href="/login{qs}">Sign in</a>
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
	.note {
		color: var(--muted);
		font-size: 13.5px;
		text-align: center;
	}
</style>
