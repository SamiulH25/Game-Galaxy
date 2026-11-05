<script lang="ts">
	import { onMount } from 'svelte';
	import { guestStore } from '$lib/bridge/guest-store';
	import AchievementList from '$lib/components/AchievementList.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Leaderboard from '$lib/components/Leaderboard.svelte';
	import PlanetThumb from '$lib/components/PlanetThumb.svelte';
	import { formatScore } from '$lib/format';

	let { data } = $props();
	const game = $derived(data.game);
	const system = $derived(data.catalog.systems.find((s) => s.id === game.systemId));

	let guestUnlocked = $state<string[]>([]);
	let guestBest = $state<number | undefined>(undefined);
	onMount(() => {
		if (data.user) return;
		const g = guestStore.get(game.id);
		guestUnlocked = g.achievements ?? [];
		guestBest = g.best;
	});

	const unlocked = $derived(
		data.unlocked ? new Map<string, number | null>(data.unlocked) : new Map<string, number | null>(guestUnlocked.map((id) => [id, null]))
	);
	const yourBest = $derived(data.leaderboard?.you?.score ?? guestBest);
</script>

<svelte:head>
	<title>{game.title} · Game Galaxy</title>
	<meta name="description" content={game.tagline || game.description.slice(0, 150)} />
</svelte:head>

<main class="page">
	<section class="hero" style:--c={game.planet.color} style:--a={game.planet.accent}>
		<div class="art">
			{#if game.coverUrl}
				<img src={game.coverUrl} alt="" />
			{:else}
				<PlanetThumb planet={game.planet} size={200} />
			{/if}
		</div>
		<div class="info">
			<p class="eyebrow">
				{#if system}<span class="dot" style:--star={system.star.color}></span>{system.name} ·{/if}
				{game.planet.name}
			</p>
			<h1>{game.title}</h1>
			{#if game.tagline}<p class="tagline">{game.tagline}</p>{/if}
			{#if game.genres.length}
				<div class="chips">{#each game.genres as g (g)}<span class="chip">{g}</span>{/each}</div>
			{/if}
			<div class="actions">
				<a class="btn btn-primary btn-lg" href="/play/{game.id}" data-sveltekit-preload-data="off"><Icon name="play" size={18} /> Play now</a>
				<a class="btn btn-lg" href="/?game={game.id}"><Icon name="orbit" size={18} /> See in galaxy</a>
			</div>
			<dl class="stats">
				{#if game.scoring}
					<div>
						<dt>Your best</dt>
						<dd class="mono">{yourBest !== undefined ? formatScore(yourBest, game.scoring) : '—'}</dd>
					</div>
					{#if data.leaderboard?.you}
						<div><dt>Your rank</dt><dd class="mono">#{data.leaderboard.you.rank}</dd></div>
					{/if}
				{/if}
				{#if game.achievements.length}
					<div><dt>Achievements</dt><dd class="mono">{unlocked.size}/{game.achievements.length}</dd></div>
				{/if}
			</dl>
		</div>
	</section>

	<div class="columns">
		<div class="col">
			<section class="block">
				<h2>About</h2>
				<p class="desc">{game.description}</p>
				{#if game.controls}<p class="controls"><Icon name="gamepad" size={18} /> {game.controls}</p>{/if}
			</section>
			{#if game.achievements.length}
				<section class="block">
					<h2>Achievements</h2>
					{#if !data.user && game.achievements.length}<p class="hint">Unlocked as a guest on this device. <a href="/login?next=/game/{game.id}">Sign in</a> to keep them.</p>{/if}
					<AchievementList achievements={game.achievements} {unlocked} />
				</section>
			{/if}
		</div>
		{#if game.scoring}
			<section class="block board">
				<h2>Leaderboard</h2>
				<p class="hint">Best {game.scoring.label.toLowerCase()} per player{game.scoring.order === 'asc' ? ' (lower is better)' : ''}.</p>
				<Leaderboard {game} initial={data.leaderboard} limit={20} />
				{#if !data.user}<p class="hint"><a href="/login?next=/game/{game.id}">Sign in</a> to get on the board.</p>{/if}
			</section>
		{/if}
	</div>
</main>

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: clamp(24px, 4vw, 48px);
		align-items: center;
		margin-bottom: 48px;
	}
	.art {
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 10;
		border-radius: var(--radius-l);
		overflow: hidden;
		border: 1px solid var(--line);
		background:
			radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--a) 35%, transparent), transparent 60%),
			radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c) 30%, transparent), transparent 70%),
			#070912;
	}
	.art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.info {
		display: grid;
		gap: 14px;
		justify-items: start;
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--star);
		box-shadow: 0 0 8px var(--star);
	}
	h1 {
		font-size: clamp(34px, 5vw, 58px);
		letter-spacing: -0.035em;
	}
	.tagline {
		font-size: 18px;
		color: var(--ink-soft);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 6px;
	}
	.stats {
		display: flex;
		gap: 32px;
		margin: 8px 0 0;
	}
	.stats div {
		display: grid;
	}
	dt {
		font-size: 12px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-size: 22px;
		font-weight: 600;
	}
	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: clamp(24px, 4vw, 48px);
		align-items: start;
	}
	.col {
		display: grid;
		gap: 40px;
	}
	.block {
		display: grid;
		gap: 12px;
	}
	.block h2 {
		font-size: 22px;
	}
	.desc {
		color: var(--ink-soft);
		white-space: pre-line;
		max-width: 65ch;
	}
	.controls {
		display: flex;
		gap: 10px;
		color: var(--muted);
	}
	.controls :global(svg) {
		margin-top: 3px;
	}
	.hint {
		color: var(--muted);
		font-size: 14px;
	}
	.board {
		padding: 22px;
		border-radius: var(--radius-l);
		background: var(--bg-raised);
		border: 1px solid var(--line);
	}
	@media (max-width: 860px) {
		.hero,
		.columns {
			grid-template-columns: 1fr;
		}
	}
</style>
