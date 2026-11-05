<script lang="ts">
	import { relativeTime } from '$lib/format';
	import type { Achievement } from '$lib/types';
	import Icon from './Icon.svelte';

	let {
		achievements,
		unlocked,
		compact = false
	}: { achievements: Achievement[]; unlocked: Map<string, number | null>; compact?: boolean } = $props();
</script>

<ul class="list" class:compact>
	{#each achievements as a (a.id)}
		{@const got = unlocked.has(a.id)}
		{@const hidden = a.secret && !got}
		<li class="item" class:got>
			<span class="badge"><Icon name={hidden ? 'lock' : a.icon} size={compact ? 18 : 22} /></span>
			<span class="text">
				<span class="title">{hidden ? 'Hidden achievement' : a.title}</span>
				<span class="desc">{hidden ? 'Keep playing to discover it.' : a.description}</span>
			</span>
			{#if got && !compact}
				{@const when = unlocked.get(a.id)}
				<span class="when"><Icon name="check" size={14} />{when ? relativeTime(when) : 'Unlocked'}</span>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 6px;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid transparent;
	}
	.item.got {
		border-color: rgba(255, 181, 71, 0.25);
		background: linear-gradient(100deg, rgba(255, 181, 71, 0.09), transparent 70%);
	}
	.badge {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		color: var(--faint);
		flex: none;
	}
	.compact .badge {
		width: 34px;
		height: 34px;
		border-radius: 10px;
	}
	.got .badge {
		background: rgba(255, 181, 71, 0.16);
		color: var(--accent);
	}
	.text {
		display: grid;
		min-width: 0;
		flex: 1;
	}
	.title {
		font-weight: 600;
		font-size: 15px;
	}
	.item:not(.got) .title {
		color: var(--ink-soft);
	}
	.desc {
		color: var(--muted);
		font-size: 13.5px;
	}
	.compact .desc {
		font-size: 13px;
	}
	.when {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--accent);
		font-size: 12.5px;
		white-space: nowrap;
	}
</style>
