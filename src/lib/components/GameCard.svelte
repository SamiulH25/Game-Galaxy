<script lang="ts">
	import type { GameInfo, SystemInfo } from '$lib/types';
	import PlanetThumb from './PlanetThumb.svelte';

	let { game, system }: { game: GameInfo; system?: SystemInfo } = $props();
</script>

<a class="card" href="/game/{game.id}" style:--c={game.planet.color} style:--a={game.planet.accent}>
	<div class="art">
		{#if game.coverUrl}
			<img src={game.coverUrl} alt="" loading="lazy" />
		{:else}
			<PlanetThumb planet={game.planet} size={96} />
		{/if}
	</div>
	<div class="meta">
		<h3>{game.title}</h3>
		<p>{game.tagline || game.description}</p>
		<div class="foot">
			{#if system}<span class="sys"><span class="dot" style:--star={system.star.color}></span>{system.name}</span>{/if}
			{#each game.genres.slice(0, 2) as g (g)}<span class="chip">{g}</span>{/each}
		</div>
	</div>
</a>

<style>
	.card {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-l);
		overflow: hidden;
		background: var(--bg-raised);
		border: 1px solid var(--line);
		color: var(--ink);
		text-decoration: none;
		transition:
			transform 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.card:hover {
		transform: translateY(-3px);
		border-color: color-mix(in srgb, var(--c) 50%, var(--line-strong));
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
		text-decoration: none;
	}
	.art {
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9;
		background:
			radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--a) 30%, transparent), transparent 60%),
			radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c) 25%, transparent), transparent 70%),
			#070912;
		border-bottom: 1px solid var(--line);
	}
	.art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.meta {
		display: grid;
		gap: 6px;
		padding: 16px 18px 18px;
	}
	h3 {
		font-size: 19px;
	}
	p {
		color: var(--muted);
		font-size: 14.5px;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}
	.sys {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		color: var(--ink-soft);
		margin-right: 4px;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--star);
		box-shadow: 0 0 8px var(--star);
	}
</style>
