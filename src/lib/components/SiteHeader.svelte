<script lang="ts">
	import { page } from '$app/state';
	import type { PublicUser } from '$lib/types';
	import Icon from './Icon.svelte';
	import Logo from './Logo.svelte';

	let { user, overlay = false }: { user: PublicUser | null; overlay?: boolean } = $props();
	let menuOpen = $state(false);
	let menuEl: HTMLElement | undefined = $state();

	const path = $derived(page.url.pathname);
	const next = $derived(encodeURIComponent(page.url.pathname + page.url.search));
	const links = [
		{ href: '/', label: 'Galaxy', icon: 'orbit' as const },
		{ href: '/library', label: 'Library', icon: 'grid' as const }
	];

	function onWindowClick(e: MouseEvent) {
		if (menuOpen && menuEl && !menuEl.contains(e.target as Node)) menuOpen = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)} />

<header class="header" class:overlay>
	<a class="brand" href="/" aria-label="Game Galaxy home">
		<Logo size={30} />
		<span class="wordmark">Game Galaxy</span>
	</a>

	<nav aria-label="Main">
		{#each links as link (link.href)}
			<a class="nav-link" href={link.href} aria-current={path === link.href ? 'page' : undefined}>
				<Icon name={link.icon} size={18} />
				<span>{link.label}</span>
			</a>
		{/each}
	</nav>

	<div class="account">
		{#if user}
			<div class="menu" bind:this={menuEl}>
				<button class="avatar-btn" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
					<span class="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
					<span class="name">{user.username}</span>
				</button>
				{#if menuOpen}
					<div class="dropdown panel" role="menu">
						<a role="menuitem" href="/me" onclick={() => (menuOpen = false)}><Icon name="user" size={18} /> Profile</a>
						<form method="POST" action="/logout">
							<button role="menuitem" type="submit"><Icon name="log-out" size={18} /> Sign out</button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<a class="btn btn-sm" href="/login?next={next}">Sign in</a>
		{/if}
	</div>
</header>

<style>
	.header {
		position: fixed;
		z-index: 50;
		inset: 0 0 auto 0;
		height: var(--header-h);
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 0 var(--gutter);
		padding-top: env(safe-area-inset-top);
		background: rgba(5, 6, 13, 0.72);
		border-bottom: 1px solid var(--line);
		backdrop-filter: var(--blur);
		-webkit-backdrop-filter: var(--blur);
	}
	.header.overlay {
		background: linear-gradient(180deg, rgba(5, 6, 13, 0.7), transparent);
		border-bottom-color: transparent;
		backdrop-filter: none;
		-webkit-backdrop-filter: none;
		pointer-events: none;
	}
	.header.overlay > * {
		pointer-events: auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--ink);
		text-decoration: none;
	}
	.wordmark {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 18px;
		letter-spacing: -0.02em;
	}
	nav {
		display: flex;
		gap: 4px;
	}
	.nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 999px;
		color: var(--muted);
		font-weight: 500;
		font-size: 15px;
		text-decoration: none;
	}
	.nav-link:hover {
		color: var(--ink);
		background: rgba(255, 255, 255, 0.06);
		text-decoration: none;
	}
	.nav-link[aria-current='page'] {
		color: var(--ink);
		background: rgba(143, 179, 255, 0.12);
	}
	.account {
		margin-left: auto;
	}
	.menu {
		position: relative;
	}
	.avatar-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 14px 4px 4px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		cursor: pointer;
	}
	.avatar-btn:hover {
		border-color: var(--line-strong);
		background: rgba(255, 255, 255, 0.08);
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--sky), #b77dff);
		color: #0b0e1c;
		font-weight: 700;
		font-size: 14px;
	}
	.name {
		font-weight: 500;
		font-size: 14.5px;
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		min-width: 190px;
		padding: 6px;
		border-radius: var(--radius);
		background: var(--panel-solid);
	}
	.dropdown a,
	.dropdown button {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		border: 0;
		border-radius: 10px;
		background: none;
		color: var(--ink-soft);
		font-size: 15px;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}
	.dropdown a:hover,
	.dropdown button:hover {
		background: rgba(255, 255, 255, 0.07);
		color: var(--ink);
	}
	.dropdown form {
		margin: 0;
	}
	@media (max-width: 640px) {
		.header {
			gap: 10px;
		}
		.wordmark,
		.nav-link span,
		.name {
			display: none;
		}
		.avatar-btn {
			padding: 4px;
		}
		.nav-link {
			padding: 10px;
		}
	}
</style>
