<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { dev } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Dossier from '$lib/components/Dossier.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { plural } from '$lib/format';
	import type { GalaxyScene, PickTarget, View } from '$lib/galaxy/scene';
	import { settings } from '$lib/settings.svelte';

	let { data } = $props();

	const catalog = $derived(data.catalog);
	const gamesById = $derived(new Map(catalog.games.map((g) => [g.id, g])));
	const systemsById = $derived(new Map(catalog.systems.map((s) => [s.id, s])));

	function viewFromUrl(url: URL): View {
		const game = url.searchParams.get('game');
		if (game && catalog.games.some((g) => g.id === game)) return { kind: 'planet', gameId: game };
		const system = url.searchParams.get('system');
		if (system && catalog.systems.some((s) => s.id === system)) return { kind: 'system', systemId: system };
		return { kind: 'galaxy' };
	}

	let view = $state<View>(untrack(() => viewFromUrl(page.url)));
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let stage: HTMLDivElement;
	let labels: HTMLDivElement;
	let scene: GalaxyScene | null = null;
	let dossierWidth = $state(0);
	let dossierHeight = $state(0);
	let introHeight = $state(0);
	let viewportWidth = $state(1200);

	const currentGame = $derived(view.kind === 'planet' ? (gamesById.get(view.gameId) ?? null) : null);
	const currentSystem = $derived(
		view.kind === 'system' ? systemsById.get(view.systemId) : currentGame ? systemsById.get(currentGame.systemId) : undefined
	);
	const systemGames = $derived(currentSystem ? currentSystem.gameIds.map((id) => gamesById.get(id)!).filter(Boolean) : []);

	function onPick(target: PickTarget) {
		if (target.kind === 'system') view = { kind: 'system', systemId: target.id };
		else if (target.kind === 'planet') view = { kind: 'planet', gameId: target.id };
		else if (view.kind === 'planet' && currentGame) view = { kind: 'system', systemId: currentGame.systemId };
	}

	function up() {
		if (view.kind === 'planet' && currentGame) view = { kind: 'system', systemId: currentGame.systemId };
		else if (view.kind !== 'galaxy') view = { kind: 'galaxy' };
	}

	onMount(() => {
		let destroyed = false;
		import('$lib/galaxy/scene')
			.then(({ GalaxyScene }) => {
				if (destroyed) return;
				scene = new GalaxyScene(stage, labels, catalog, {
					reducedMotion: settings.reducedMotion,
					quality: settings.quality,
					onPick
				});
				if (view.kind !== 'galaxy') scene.setView(view);
				status = 'ready';
			})
			.catch((err) => {
				console.error('Galaxy failed to start', err);
				status = 'error';
			});
		return () => {
			destroyed = true;
			scene?.destroy();
			scene = null;
		};
	});

	// Drive the camera and keep the URL shareable.
	$effect(() => {
		const v = view;
		if (status !== 'ready') return;
		untrack(() => {
			scene?.setView(v);
			// Shallow replaceState doesn't update page.url, so compare against the real location.
			const url = new URL(location.href);
			url.searchParams.delete('game');
			url.searchParams.delete('system');
			if (v.kind === 'planet') url.searchParams.set('game', v.gameId);
			if (v.kind === 'system') url.searchParams.set('system', v.systemId);
			if (url.href !== location.href) replaceState(url, {});
		});
	});

	$effect(() => scene?.setReducedMotion(settings.reducedMotion));

	// Keep the subject centred in the space the panel leaves free.
	$effect(() => {
		const open = view.kind !== 'galaxy';
		const wide = viewportWidth > 900;
		if (status !== 'ready') return;
		const bottom = wide ? 0 : open ? dossierHeight : introHeight * 0.75;
		scene?.setInsets({ right: open && wide ? dossierWidth + 16 : 0, bottom });
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape' || e.defaultPrevented) return;
		const t = e.target as HTMLElement;
		if (t.closest('input, textarea, select, [role="menu"]')) return;
		up();
	}

	const title = $derived(currentGame ? `${currentGame.title} · Game Galaxy` : currentSystem ? `${currentSystem.name} · Game Galaxy` : 'Game Galaxy');
</script>

<svelte:window bind:innerWidth={viewportWidth} onkeydown={onKeydown} />
<svelte:head><title>{title}</title></svelte:head>

<div class="galaxy">
	<div class="stage" bind:this={stage}></div>
	<div class="labels" bind:this={labels}></div>

	{#if status === 'loading'}
		<div class="loading" out:fade={{ duration: 400 }}>
			<span class="spinner" aria-hidden="true"></span>
			<span>Charting the galaxy…</span>
		</div>
	{:else if status === 'error'}
		<div class="fallback panel" role="alert">
			<Icon name="alert" size={22} />
			<div>
				<h2>The 3D galaxy couldn't start</h2>
				<p>Your browser or device may not support WebGL. Every game is still in the library.</p>
				<a class="btn btn-primary" href="/library">Open the library</a>
			</div>
		</div>
	{/if}

	{#if view.kind !== 'galaxy'}
		<nav class="crumbs" aria-label="Location" transition:fade={{ duration: 150 }}>
			<button class="btn btn-sm crumb-back" type="button" onclick={up}>
				<Icon name="arrow-left" size={16} /> Back
			</button>
			<ol>
				<li><button type="button" onclick={() => (view = { kind: 'galaxy' })}>Galaxy</button></li>
				{#if currentSystem}
					<li>
						{#if currentGame}
							<button type="button" onclick={() => (view = { kind: 'system', systemId: currentSystem.id })}>{currentSystem.name}</button>
						{:else}
							<span aria-current="location">{currentSystem.name}</span>
						{/if}
					</li>
				{/if}
				{#if currentGame}<li><span aria-current="location">{currentGame.title}</span></li>{/if}
			</ol>
		</nav>
	{:else}
		<div class="scrim" aria-hidden="true" transition:fade={{ duration: 200 }}></div>
		<section class="intro" bind:clientHeight={introHeight} transition:fade={{ duration: 200 }}>
			<p class="eyebrow">{plural(catalog.games.length, 'game')} · {plural(catalog.systems.length, 'star system')}</p>
			<h1>Pick a star. Find a world. Play.</h1>
			<p class="lede">Every planet is a game. Drag to look around, choose a system to fly in, then pick a world to play — no account needed.</p>
			{#if catalog.systems.length}
				<ul class="systems">
					{#each catalog.systems as s (s.id)}
						<li>
							<button class="system" type="button" onclick={() => (view = { kind: 'system', systemId: s.id })} style:--star={s.star.color}>
								<span class="dot" aria-hidden="true"></span>
								<span>{s.name}</span>
								<span class="n mono">{s.gameIds.length}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if catalog.games.length === 0}
				<div class="empty">
					<Icon name="sparkles" size={20} />
					<p>
						No games have landed yet.
						{#if dev}Scaffold one with <code>npm run new-game -- my-game</code> and it will appear here in a few seconds.{:else}Check back soon.{/if}
					</p>
				</div>
			{/if}
		</section>
	{/if}

	{#if currentSystem && view.kind !== 'galaxy'}
		<div class="dossier-host" bind:clientWidth={dossierWidth} bind:clientHeight={dossierHeight}>
			<Dossier
				system={currentSystem}
				game={currentGame}
				games={systemGames}
				user={data.user}
				onSelectGame={(id) => (view = { kind: 'planet', gameId: id })}
				onHoverGame={(id) => scene?.highlight(id)}
				onClose={up}
			/>
		</div>
	{/if}
</div>

<style>
	.galaxy {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #02030a;
	}
	.stage {
		position: absolute;
		inset: 0;
	}
	.stage :global(canvas) {
		display: block;
		width: 100%;
		height: 100%;
		touch-action: none;
		outline: none;
	}
	.labels {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}

	/* Labels are plain DOM buttons created by the scene. */
	.labels :global(.gl-label) {
		position: absolute;
		left: 0;
		top: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px 5px 8px;
		margin: 0;
		border: 1px solid transparent;
		border-radius: 999px;
		background: rgba(5, 7, 18, 0.55);
		color: var(--ink);
		font: 500 13.5px/1.2 var(--font-body);
		white-space: nowrap;
		cursor: pointer;
		translate: -50% 0;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.35s,
			visibility 0.35s,
			background 0.15s,
			border-color 0.15s;
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		will-change: transform;
	}
	.labels :global(.gl-label.is-visible:not(.is-offscreen)) {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}
	.labels :global(.gl-label:hover),
	.labels :global(.gl-label:focus-visible),
	.labels :global(.gl-label.is-selected) {
		background: rgba(18, 24, 52, 0.85);
		border-color: color-mix(in srgb, var(--dot) 60%, transparent);
	}
	.labels :global(.gl-system) {
		translate: -50% 22px;
		padding: 7px 14px 7px 10px;
		font-size: 14.5px;
	}
	.labels :global(.gl-dot) {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--dot);
		box-shadow: 0 0 10px var(--dot);
		flex: none;
	}
	.labels :global(.gl-text) {
		display: grid;
		text-align: left;
	}
	.labels :global(.gl-name) {
		font-weight: 600;
	}
	.labels :global(.gl-sub) {
		color: var(--muted);
		font-size: 11.5px;
		font-weight: 500;
		letter-spacing: 0.02em;
	}

	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 14px;
		color: var(--muted);
		font-size: 15px;
		background: radial-gradient(circle at 50% 50%, #0b0e22, #02030a 70%);
		z-index: 5;
	}
	.spinner {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		border: 2px solid rgba(143, 179, 255, 0.2);
		border-top-color: var(--sky);
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.fallback {
		position: absolute;
		z-index: 6;
		inset: 50% auto auto 50%;
		transform: translate(-50%, -50%);
		width: min(460px, calc(100vw - 32px));
		display: flex;
		gap: 14px;
		padding: 24px;
		color: var(--bad);
	}
	.fallback div {
		display: grid;
		gap: 10px;
		color: var(--ink);
		justify-items: start;
	}
	.fallback h2 {
		font-size: 20px;
	}
	.fallback p {
		color: var(--muted);
	}

	.scrim {
		position: absolute;
		z-index: 9;
		inset: auto 0 0 0;
		height: min(55%, 460px);
		background: linear-gradient(0deg, rgba(2, 3, 10, 0.88), rgba(2, 3, 10, 0.55) 55%, transparent);
		pointer-events: none;
	}
	.intro {
		position: absolute;
		z-index: 10;
		left: var(--gutter);
		bottom: max(var(--gutter), env(safe-area-inset-bottom));
		width: min(560px, calc(100vw - 2 * var(--gutter)));
		display: grid;
		gap: 12px;
		pointer-events: none;
	}
	.intro > * {
		pointer-events: auto;
	}
	.intro h1 {
		font-size: clamp(30px, 4.6vw, 52px);
		letter-spacing: -0.035em;
		text-shadow: 0 2px 30px rgba(0, 0, 0, 0.6);
	}
	.lede {
		color: var(--ink-soft);
		font-size: clamp(15px, 1.5vw, 17px);
		max-width: 48ch;
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.8);
	}
	.systems {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.system {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px 8px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: rgba(8, 10, 24, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		font-weight: 500;
		font-size: 14.5px;
		cursor: pointer;
	}
	.system:hover {
		border-color: color-mix(in srgb, var(--star) 55%, transparent);
		background: rgba(18, 22, 48, 0.8);
	}
	.system .dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--star);
		box-shadow: 0 0 12px var(--star);
	}
	.system .n {
		color: var(--muted);
		font-size: 12.5px;
	}
	.empty {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		margin-top: 4px;
		padding: 14px 16px;
		border-radius: var(--radius);
		background: rgba(255, 181, 71, 0.08);
		border: 1px solid rgba(255, 181, 71, 0.25);
		color: var(--accent);
	}
	.empty p {
		color: var(--ink-soft);
		font-size: 14.5px;
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.92em;
		padding: 1px 6px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--ink);
	}

	.crumbs {
		position: absolute;
		z-index: 15;
		top: calc(var(--header-h) + 8px);
		left: var(--gutter);
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.crumb-back {
		background: rgba(8, 10, 24, 0.65);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.crumbs ol {
		list-style: none;
		margin: 0;
		padding: 7px 14px;
		border-radius: 999px;
		background: rgba(8, 10, 24, 0.65);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--muted);
	}
	.crumbs li + li::before {
		content: '/';
		margin-right: 8px;
		color: var(--faint);
	}
	.crumbs ol button {
		border: 0;
		padding: 0;
		background: none;
		color: var(--muted);
		cursor: pointer;
		font-size: 14px;
	}
	.crumbs ol button:hover {
		color: var(--ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.crumbs [aria-current] {
		color: var(--ink);
		font-weight: 500;
	}

	.dossier-host {
		position: absolute;
		z-index: 20;
		top: calc(var(--header-h) + 8px);
		right: 16px;
		bottom: 16px;
		width: min(420px, calc(100vw - 32px));
		display: flex;
		flex-direction: column;
	}

	@media (max-width: 900px) {
		.crumbs ol {
			display: none;
		}
		.dossier-host {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: 100%;
			max-height: min(62dvh, 640px);
		}
	}
</style>
