<script lang="ts">
	import { fly } from 'svelte/transition';
	import { guestStore } from '$lib/bridge/guest-store';
	import { formatScore, plural } from '$lib/format';
	import { loadUnlocked } from '$lib/progress-client';
	import { settings } from '$lib/settings.svelte';
	import type { GameInfo, PublicUser, SystemInfo } from '$lib/types';
	import AchievementList from './AchievementList.svelte';
	import Icon from './Icon.svelte';
	import Leaderboard from './Leaderboard.svelte';
	import PlanetThumb from './PlanetThumb.svelte';

	let {
		system,
		game,
		games,
		user,
		onSelectGame,
		onHoverGame,
		onClose
	}: {
		system: SystemInfo;
		game: GameInfo | null;
		games: GameInfo[];
		user: PublicUser | null;
		onSelectGame: (id: string) => void;
		onHoverGame: (id: string | null) => void;
		onClose: () => void;
	} = $props();

	let unlocked = $state<Map<string, number | null>>(new Map());
	$effect(() => {
		const g = game;
		unlocked = new Map();
		if (!g || g.achievements.length === 0) return;
		let cancelled = false;
		loadUnlocked(g.id, user)
			.then((m) => !cancelled && (unlocked = m))
			.catch(() => {});
		return () => (cancelled = true);
	});

	const guestBest = $derived(game && !user ? guestStore.get(game.id).best : undefined);
	const transition = $derived(settings.reducedMotion ? { duration: 0 } : { x: 24, duration: 260 });
</script>

<aside class="dossier panel" aria-label={game ? `${game.title} details` : `${system.name} system`} transition:fly={transition}>
	<button class="close btn btn-icon btn-sm btn-ghost" type="button" aria-label="Close panel" onclick={onClose}>
		<Icon name="x" size={18} />
	</button>

	{#if game}
		{#key game.id}
			<div class="scroll" in:fly={settings.reducedMotion ? { duration: 0 } : { y: 10, duration: 220 }}>
				<div class="cover" style:--c={game.planet.color} style:--a={game.planet.accent}>
					{#if game.coverUrl}
						<img src={game.coverUrl} alt="" loading="lazy" />
					{:else}
						<PlanetThumb planet={game.planet} size={120} />
					{/if}
				</div>

				<p class="eyebrow">{system.name} · {game.planet.name}</p>
				<h2 class="title">{game.title}</h2>
				{#if game.tagline}<p class="tagline">{game.tagline}</p>{/if}
				{#if game.genres.length}
					<div class="chips">
						{#each game.genres as g (g)}<span class="chip">{g}</span>{/each}
					</div>
				{/if}

				<div class="actions">
					<a class="btn btn-primary btn-lg play" href="/play/{game.id}" data-sveltekit-preload-data="off">
						<Icon name="play" size={18} /> Play
					</a>
					<a class="btn btn-lg" href="/game/{game.id}">Details</a>
				</div>
				{#if guestBest !== undefined && game.scoring}
					<p class="guest-best">Your best on this device: <strong class="mono">{formatScore(guestBest, game.scoring)}</strong></p>
				{/if}

				<section>
					<h3>About</h3>
					<p class="desc">{game.description}</p>
					{#if game.controls}
						<p class="controls"><Icon name="gamepad" size={18} /> {game.controls}</p>
					{/if}
				</section>

				{#if game.scoring}
					<section>
						<h3>Top {game.scoring.label.toLowerCase()}</h3>
						<Leaderboard {game} limit={5} compact />
						{#if !user}<p class="hint"><a href="/login?next=/play/{game.id}">Sign in</a> to post your scores.</p>{/if}
					</section>
				{/if}

				{#if game.achievements.length}
					<section>
						<h3>Achievements <span class="count mono">{unlocked.size}/{game.achievements.length}</span></h3>
						<AchievementList achievements={game.achievements} {unlocked} compact />
					</section>
				{/if}
			</div>
		{/key}
	{:else}
		<div class="scroll">
			<div class="system-head">
				<span class="star" style:--star={system.star.color} aria-hidden="true"></span>
				<div>
					<p class="eyebrow">Star system</p>
					<h2 class="title">{system.name}</h2>
				</div>
			</div>
			{#if system.description}<p class="desc">{system.description}</p>{/if}

			<section>
				<h3>{games.length ? plural(games.length, 'world') : 'Worlds'}</h3>
				{#if games.length === 0}
					<p class="empty">No games orbit this star yet.</p>
				{:else}
					<ul class="worlds">
						{#each games as g (g.id)}
							<li>
								<button
									type="button"
									class="world"
									onclick={() => onSelectGame(g.id)}
									onpointerenter={() => onHoverGame(g.id)}
									onpointerleave={() => onHoverGame(null)}
									onfocus={() => onHoverGame(g.id)}
									onblur={() => onHoverGame(null)}
								>
									<PlanetThumb planet={g.planet} size={48} />
									<span class="world-text">
										<span class="world-title">{g.title}</span>
										<span class="world-sub">{g.tagline || g.genres.join(' · ')}</span>
									</span>
									<Icon name="chevron-right" size={18} />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	{/if}
</aside>

<style>
	.dossier {
		position: relative;
		background: rgba(10, 13, 28, 0.9);
		flex: 1 1 auto;
		min-height: 0;
		max-height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.scroll {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: 22px 22px 26px;
		display: grid;
		gap: 14px;
		align-content: start;
		overscroll-behavior: contain;
	}
	.close {
		position: absolute;
		top: 12px;
		right: 12px;
		z-index: 2;
		background: rgba(5, 6, 13, 0.5);
	}
	.cover {
		display: grid;
		place-items: center;
		/* Explicit height: aspect-ratio collapses inside the scrolling grid in Chromium. */
		height: 210px;
		margin: -22px -22px 4px;
		overflow: hidden;
		background:
			radial-gradient(circle at 50% 120%, color-mix(in srgb, var(--a) 35%, transparent), transparent 60%),
			radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--c) 30%, transparent), transparent 70%),
			#070912;
		border-bottom: 1px solid var(--line);
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.title {
		font-size: 30px;
		margin-top: -6px;
	}
	.tagline {
		color: var(--ink-soft);
		font-size: 16px;
		margin-top: -6px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 4px;
	}
	.play {
		flex: 1;
	}
	.guest-best {
		color: var(--muted);
		font-size: 14px;
	}
	.guest-best strong {
		color: var(--ink);
	}
	section {
		display: grid;
		gap: 10px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}
	h3 {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.count {
		margin-left: auto;
		letter-spacing: 0;
		color: var(--ink-soft);
	}
	.desc {
		color: var(--ink-soft);
		font-size: 15px;
		white-space: pre-line;
	}
	.controls {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		color: var(--muted);
		font-size: 14px;
	}
	.controls :global(svg) {
		margin-top: 2px;
	}
	.hint {
		font-size: 14px;
		color: var(--muted);
	}
	.system-head {
		display: flex;
		align-items: center;
		gap: 16px;
		padding-right: 40px;
	}
	.star {
		width: 54px;
		height: 54px;
		border-radius: 50%;
		flex: none;
		background: radial-gradient(circle at 40% 40%, #fff, var(--star) 45%, color-mix(in srgb, var(--star) 40%, #000));
		box-shadow:
			0 0 24px color-mix(in srgb, var(--star) 70%, transparent),
			0 0 60px color-mix(in srgb, var(--star) 35%, transparent);
	}
	.empty {
		color: var(--muted);
		font-size: 15px;
	}
	.worlds {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.world {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 8px 12px 8px 8px;
		border: 1px solid transparent;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.03);
		color: var(--ink);
		text-align: left;
		cursor: pointer;
	}
	.world:hover,
	.world:focus-visible {
		background: var(--panel-hover);
		border-color: var(--line-strong);
	}
	.world > :global(svg:last-child) {
		color: var(--faint);
	}
	.world-text {
		display: grid;
		flex: 1;
		min-width: 0;
	}
	.world-title {
		font-weight: 600;
	}
	.world-sub {
		color: var(--muted);
		font-size: 13.5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 900px) {
		.dossier {
			border-radius: var(--radius-l) var(--radius-l) 0 0;
			border-bottom: 0;
			padding-bottom: env(safe-area-inset-bottom);
		}
		.dossier::before {
			content: '';
			display: block;
			width: 40px;
			height: 4px;
			margin: 8px auto 0;
			border-radius: 4px;
			background: var(--line-strong);
			flex: none;
		}
		.scroll {
			padding-top: 14px;
			min-height: 0;
		}
		.cover {
			margin-top: -14px;
			height: 150px;
		}
	}
</style>
