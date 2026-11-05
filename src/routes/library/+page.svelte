<script lang="ts">
	import { dev } from '$app/environment';
	import GameCard from '$lib/components/GameCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { plural } from '$lib/format';

	let { data } = $props();
	const catalog = $derived(data.catalog);
	const systemsById = $derived(new Map(catalog.systems.map((s) => [s.id, s])));

	let query = $state('');
	let genre = $state<string | null>(null);
	let system = $state<string | null>(null);

	const genres = $derived([...new Set(catalog.games.flatMap((g) => g.genres))].sort());
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return catalog.games.filter(
			(g) =>
				(!genre || g.genres.includes(genre)) &&
				(!system || g.systemId === system) &&
				(!q || [g.title, g.tagline, g.description, g.planet.name, ...g.genres].some((t) => t.toLowerCase().includes(q)))
		);
	});
</script>

<svelte:head><title>Library · Game Galaxy</title></svelte:head>

<main class="page">
	<header class="head">
		<div>
			<p class="eyebrow">Library</p>
			<h1>Every world in the galaxy</h1>
			<p class="sub">{plural(catalog.games.length, 'game')} across {plural(catalog.systems.length, 'star system')}.</p>
		</div>
		<label class="search">
			<Icon name="search" size={18} />
			<span class="visually-hidden">Search games</span>
			<input class="input" type="search" placeholder="Search games" bind:value={query} />
		</label>
	</header>

	{#if catalog.games.length > 0}
		<div class="filters" role="group" aria-label="Filters">
			<button type="button" class="filter" aria-pressed={!system} onclick={() => (system = null)}>All systems</button>
			{#each catalog.systems.filter((s) => s.gameIds.length) as s (s.id)}
				<button type="button" class="filter" aria-pressed={system === s.id} onclick={() => (system = system === s.id ? null : s.id)}>
					<span class="dot" style:--star={s.star.color}></span>{s.name}
				</button>
			{/each}
			{#if genres.length}<span class="sep" aria-hidden="true"></span>{/if}
			{#each genres as g (g)}
				<button type="button" class="filter" aria-pressed={genre === g} onclick={() => (genre = genre === g ? null : g)}>{g}</button>
			{/each}
		</div>
	{/if}

	{#if results.length}
		<ul class="grid">
			{#each results as game (game.id)}
				<li><GameCard {game} system={systemsById.get(game.systemId)} /></li>
			{/each}
		</ul>
	{:else if catalog.games.length}
		<p class="none">No games match. <button type="button" class="link" onclick={() => ((query = ''), (genre = null), (system = null))}>Clear filters</button></p>
	{:else}
		<div class="none panel">
			<Icon name="sparkles" size={22} />
			<div>
				<h2>The library is empty</h2>
				<p>No games have been added yet.{#if dev} Run <code>npm run new-game -- my-game</code> to scaffold one from the template.{/if}</p>
			</div>
		</div>
	{/if}
</main>

<style>
	.head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
		margin-bottom: 24px;
	}
	h1 {
		font-size: clamp(30px, 4vw, 44px);
		margin-top: 6px;
	}
	.sub {
		color: var(--muted);
		margin-top: 6px;
	}
	.search {
		position: relative;
		display: block;
		width: min(320px, 100%);
		color: var(--muted);
	}
	.search :global(svg) {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
	}
	.search .input {
		padding-left: 42px;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 28px;
	}
	.filter {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 7px 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: rgba(255, 255, 255, 0.03);
		color: var(--ink-soft);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		text-transform: capitalize;
	}
	.filter:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}
	.filter[aria-pressed='true'] {
		background: rgba(143, 179, 255, 0.14);
		border-color: rgba(143, 179, 255, 0.45);
		color: var(--ink);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--star);
		box-shadow: 0 0 8px var(--star);
	}
	.sep {
		width: 1px;
		background: var(--line);
		margin: 4px 4px;
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 18px;
	}
	.grid li {
		display: flex;
	}
	.grid li > :global(*) {
		flex: 1;
	}
	.none {
		color: var(--muted);
	}
	.none.panel {
		display: flex;
		gap: 14px;
		padding: 24px;
		color: var(--accent);
		max-width: 560px;
	}
	.none.panel h2 {
		font-size: 20px;
		color: var(--ink);
		margin-bottom: 6px;
	}
	.none.panel p {
		color: var(--muted);
	}
	.link {
		border: 0;
		background: none;
		padding: 0;
		color: var(--sky);
		cursor: pointer;
	}
	code {
		font-family: var(--font-mono);
		font-size: 0.92em;
		padding: 1px 6px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.08);
		color: var(--ink);
	}
</style>
