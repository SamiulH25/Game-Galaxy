<script lang="ts">
	import AchievementList from '$lib/components/AchievementList.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PlanetThumb from '$lib/components/PlanetThumb.svelte';
	import { formatScore, plural, relativeTime } from '$lib/format';

	let { data } = $props();
	const games = $derived(new Map(data.catalog.games.map((g) => [g.id, g])));
	const user = $derived(data.user!);
	const totalAchievements = $derived(data.catalog.games.reduce((n, g) => n + g.achievements.length, 0));
	const sessions = $derived(data.plays.reduce((n, p) => n + p.count, 0));

	const achievementsByGame = $derived.by(() => {
		const by = new Map<string, Map<string, number | null>>();
		for (const a of data.achievements) {
			if (!by.has(a.gameId)) by.set(a.gameId, new Map());
			by.get(a.gameId)!.set(a.achievementId, a.unlockedAt);
		}
		return [...by].map(([gameId, unlocked]) => ({ game: games.get(gameId)!, unlocked })).filter((x) => x.game);
	});

	const memberSince = $derived(
		data.memberSince ? new Date(data.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
	);
</script>

<svelte:head><title>{user.username} · Game Galaxy</title></svelte:head>

<main class="page">
	<header class="head">
		<span class="avatar" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
		<div>
			<p class="eyebrow">Explorer</p>
			<h1>{user.username}</h1>
			{#if memberSince}<p class="sub">Exploring since {memberSince}</p>{/if}
		</div>
	</header>

	<dl class="tiles">
		<div class="tile"><dt>Worlds visited</dt><dd class="mono">{data.plays.length}<span>/{data.catalog.games.length}</span></dd></div>
		<div class="tile"><dt>Play sessions</dt><dd class="mono">{sessions}</dd></div>
		<div class="tile"><dt>Achievements</dt><dd class="mono">{data.achievements.length}<span>/{totalAchievements}</span></dd></div>
		<div class="tile"><dt>Leaderboards</dt><dd class="mono">{data.bests.length}</dd></div>
	</dl>

	<div class="columns">
		<section class="block">
			<h2>Recently played</h2>
			{#if data.plays.length === 0}
				<p class="empty">Nothing yet. <a href="/">Pick a planet</a> and play your first game.</p>
			{:else}
				<ul class="rows">
					{#each data.plays.slice(0, 8) as p (p.gameId)}
						{@const g = games.get(p.gameId)!}
						<li class="row">
							<PlanetThumb planet={g.planet} size={44} />
							<a class="name" href="/game/{g.id}">{g.title}</a>
							<span class="meta">{relativeTime(p.lastPlayedAt)} · {plural(p.count, 'session')}</span>
							<a class="btn btn-sm" href="/play/{g.id}" data-sveltekit-preload-data="off"><Icon name="play" size={14} /> Play</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="block">
			<h2>Personal bests</h2>
			{#if data.bests.length === 0}
				<p class="empty">No scores posted yet.</p>
			{:else}
				<ul class="rows">
					{#each data.bests as b (b.gameId)}
						{@const g = games.get(b.gameId)!}
						<li class="row">
							<PlanetThumb planet={g.planet} size={44} />
							<a class="name" href="/game/{g.id}">{g.title}</a>
							<span class="score mono">{formatScore(b.score, g.scoring)}</span>
							<span class="rank mono">#{b.rank}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<section class="block">
		<h2>Achievements</h2>
		{#if achievementsByGame.length === 0}
			<p class="empty">Achievements you unlock in games show up here.</p>
		{:else}
			<div class="ach-grid">
				{#each achievementsByGame as { game, unlocked } (game.id)}
					<div class="ach-game">
						<h3><a href="/game/{game.id}">{game.title}</a> <span class="mono">{unlocked.size}/{game.achievements.length}</span></h3>
						<AchievementList achievements={game.achievements} {unlocked} compact />
					</div>
				{/each}
			</div>
		{/if}
	</section>
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 28px;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 76px;
		height: 76px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--sky), #b77dff);
		color: #0b0e1c;
		font: 700 32px var(--font-display);
		box-shadow: 0 0 40px rgba(143, 179, 255, 0.3);
	}
	h1 {
		font-size: clamp(30px, 4vw, 42px);
	}
	.sub {
		color: var(--muted);
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 12px;
		margin: 0 0 40px;
	}
	.tile {
		padding: 18px 20px;
		border-radius: var(--radius);
		background: var(--bg-raised);
		border: 1px solid var(--line);
	}
	dt {
		color: var(--muted);
		font-size: 13px;
	}
	dd {
		margin: 4px 0 0;
		font-size: 30px;
		font-weight: 600;
	}
	dd span {
		color: var(--faint);
		font-size: 18px;
	}
	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
		gap: 32px;
		margin-bottom: 40px;
	}
	.block {
		display: grid;
		gap: 14px;
		align-content: start;
	}
	.block h2 {
		font-size: 22px;
	}
	.empty {
		color: var(--muted);
	}
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 8px 12px 8px 8px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.03);
	}
	.name {
		flex: 1;
		min-width: 0;
		color: var(--ink);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta {
		color: var(--muted);
		font-size: 13.5px;
	}
	.score {
		font-weight: 600;
	}
	.rank {
		min-width: 48px;
		text-align: right;
		color: var(--accent);
	}
	.ach-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
		gap: 24px;
	}
	.ach-game {
		display: grid;
		gap: 10px;
		align-content: start;
	}
	.ach-game h3 {
		display: flex;
		justify-content: space-between;
		font-size: 17px;
	}
	.ach-game h3 a {
		color: var(--ink);
	}
	.ach-game h3 span {
		color: var(--muted);
		font-size: 14px;
	}
	@media (max-width: 520px) {
		.meta {
			display: none;
		}
	}
</style>
