<script lang="ts">
	import { api } from '$lib/api';
	import { formatScore, relativeTime } from '$lib/format';
	import type { GameInfo, LeaderboardData } from '$lib/types';

	let {
		game,
		limit = 5,
		initial = null,
		compact = false
	}: { game: GameInfo; limit?: number; initial?: LeaderboardData | null; compact?: boolean } = $props();

	let data = $state<LeaderboardData | null>(null);
	let error = $state('');
	let loading = $state(false);

	$effect(() => {
		if (initial) {
			data = initial;
			return;
		}
		const id = game.id;
		let cancelled = false;
		loading = true;
		error = '';
		api<LeaderboardData>(`/api/games/${encodeURIComponent(id)}/scores?limit=${limit}`)
			.then((d) => !cancelled && (data = d))
			.catch((e) => !cancelled && (error = e.message))
			.finally(() => !cancelled && (loading = false));
		return () => (cancelled = true);
	});

	const youOutside = $derived(data?.you && !data.entries.some((e) => e.isYou) ? data.you : null);
</script>

<div class="board" class:compact>
	{#if error}
		<p class="note">Leaderboard unavailable: {error}</p>
	{:else if !data && loading}
		<ol class="rows" aria-busy="true">
			{#each { length: Math.min(limit, 3) } as _, i (i)}<li class="row skeleton"></li>{/each}
		</ol>
	{:else if data && data.entries.length === 0}
		<p class="note">No scores yet. Be the first on the board.</p>
	{:else if data}
		<ol class="rows">
			{#each data.entries as e (e.username)}
				<li class="row" class:you={e.isYou} class:podium={e.rank <= 3}>
					<span class="rank mono" data-rank={e.rank}>{e.rank}</span>
					<span class="who">{e.username}{#if e.isYou}<span class="you-tag">you</span>{/if}</span>
					{#if !compact}<span class="when">{relativeTime(e.achievedAt)}</span>{/if}
					<span class="score mono">{formatScore(e.score, game.scoring)}</span>
				</li>
			{/each}
			{#if youOutside}
				<li class="gap" aria-hidden="true">···</li>
				<li class="row you">
					<span class="rank mono">{youOutside.rank}</span>
					<span class="who">{youOutside.username}<span class="you-tag">you</span></span>
					{#if !compact}<span class="when">{relativeTime(youOutside.achievedAt)}</span>{/if}
					<span class="score mono">{formatScore(youOutside.score, game.scoring)}</span>
				</li>
			{/if}
		</ol>
		{#if data.total > data.entries.length && !compact}
			<p class="note">{data.total.toLocaleString('en-US')} players on this board.</p>
		{/if}
	{/if}
</div>

<style>
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
	}
	.row {
		display: grid;
		grid-template-columns: 34px 1fr auto auto;
		align-items: center;
		gap: 12px;
		min-height: 42px;
		padding: 0 12px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.03);
	}
	.compact .row {
		grid-template-columns: 28px 1fr auto;
		min-height: 36px;
		gap: 10px;
		font-size: 14.5px;
	}
	.row.you {
		background: rgba(143, 179, 255, 0.12);
		box-shadow: inset 0 0 0 1px rgba(143, 179, 255, 0.3);
	}
	.skeleton {
		height: 40px;
		animation: pulse 1.4s ease-in-out infinite;
	}
	@keyframes pulse {
		50% {
			opacity: 0.4;
		}
	}
	.rank {
		color: var(--muted);
		font-size: 13px;
		text-align: center;
	}
	.podium .rank {
		font-weight: 700;
	}
	.rank[data-rank='1'] {
		color: #ffd36b;
	}
	.rank[data-rank='2'] {
		color: #cfd8ea;
	}
	.rank[data-rank='3'] {
		color: #e4a46e;
	}
	.who {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}
	.you-tag {
		margin-left: 8px;
		padding: 1px 7px;
		border-radius: 999px;
		background: rgba(143, 179, 255, 0.2);
		color: var(--sky);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		vertical-align: 1px;
	}
	.when {
		color: var(--faint);
		font-size: 13px;
	}
	.score {
		font-weight: 600;
	}
	.gap {
		text-align: center;
		color: var(--faint);
		line-height: 1;
	}
	.note {
		color: var(--muted);
		font-size: 14px;
		margin-top: 8px;
	}
	@media (max-width: 480px) {
		.when {
			display: none;
		}
		.row {
			grid-template-columns: 30px 1fr auto;
		}
	}
</style>
