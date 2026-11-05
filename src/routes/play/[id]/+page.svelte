<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { api } from '$lib/api';
	import { GameHost } from '$lib/bridge/host';
	import { guestStore } from '$lib/bridge/guest-store';
	import Icon from '$lib/components/Icon.svelte';
	import PlanetThumb from '$lib/components/PlanetThumb.svelte';
	import { formatScore } from '$lib/format';
	import { settings } from '$lib/settings.svelte';
	import { toasts } from '$lib/toasts.svelte';

	let { data } = $props();
	const game = $derived(data.game);

	let iframe: HTMLIFrameElement;
	let frameWrap: HTMLDivElement;
	let host: GameHost | null = $state(null);
	let loaded = $state(false);
	let slow = $state(false);
	let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let isFullscreen = $state(false);
	let guestNoticeShown = false;
	let savedTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		const g = game;
		host = new GameHost(
			iframe,
			g,
			() => data.user,
			() => ({ muted: settings.muted, reducedMotion: settings.reducedMotion }),
			{
				onSave: (state, detail) => {
					clearTimeout(savedTimer);
					saveState = state;
					if (state === 'saved') savedTimer = setTimeout(() => (saveState = 'idle'), 2500);
					if (state === 'error') toasts.push({ title: "Couldn't save your progress", body: detail.message, icon: 'alert', tone: 'bad' });
				},
				onScore: (r) => {
					if (r.personalBest) {
						const rank = r.rank ? ` · rank #${r.rank}` : '';
						toasts.push({ title: 'New personal best', body: `${formatScore(r.score, g.scoring)} ${g.scoring?.label.toLowerCase() ?? ''}${rank}`, icon: 'trophy', tone: 'good' });
					}
					if (!r.cloud && !guestNoticeShown) {
						guestNoticeShown = true;
						toasts.push({ title: 'Playing as a guest', body: 'Your best is kept on this device. Sign in to post it to the leaderboard.', icon: 'info' }, 7000);
					}
				},
				onAchievement: (a) => toasts.push({ title: a.title, body: `Achievement unlocked · ${a.description}`, icon: a.icon, tone: 'achievement' }, 6000)
			}
		);
		// Start loading only once the host is listening, so no early message is missed.
		iframe.src = g.url;

		if (data.user) api(`/api/games/${encodeURIComponent(g.id)}/play`, { method: 'POST' }).catch(() => {});
		else guestStore.update(g.id, (p) => ({ ...p, plays: (p.plays ?? 0) + 1, lastPlayedAt: Date.now() }));

		const slowTimer = setTimeout(() => (slow = !loaded), 12000);
		const onVisibility = () => host?.emit(document.hidden ? 'pause' : 'resume');
		const onFullscreen = () => (isFullscreen = document.fullscreenElement === frameWrap);
		document.addEventListener('visibilitychange', onVisibility);
		document.addEventListener('fullscreenchange', onFullscreen);
		return () => {
			clearTimeout(slowTimer);
			clearTimeout(savedTimer);
			document.removeEventListener('visibilitychange', onVisibility);
			document.removeEventListener('fullscreenchange', onFullscreen);
			host?.destroy();
		};
	});

	$effect(() => {
		const s = { muted: settings.muted, reducedMotion: settings.reducedMotion };
		host?.emit('settings', s);
	});

	function onLoad(e: Event) {
		// The initial about:blank load can fire before bind:this runs; only count the real game.
		const el = e.currentTarget as HTMLIFrameElement;
		if (!el.getAttribute('src')) return;
		loaded = true;
		el.focus();
	}

	function toggleMute() {
		settings.muted = !settings.muted;
		settings.save();
	}

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await frameWrap.requestFullscreen();
		} catch {
			toasts.push({ title: 'Fullscreen is not available here', icon: 'info' });
		}
	}

	const status = $derived.by(() => {
		if (saveState === 'saving') return { icon: 'cloud' as const, text: 'Saving…' };
		if (saveState === 'saved') return { icon: 'check' as const, text: data.user ? 'Saved to your account' : 'Saved on this device' };
		if (saveState === 'error') return { icon: 'alert' as const, text: 'Save failed' };
		return data.user ? { icon: 'cloud' as const, text: 'Cloud saves on' } : { icon: 'device' as const, text: 'Guest · saves on this device' };
	});
</script>

<svelte:head><title>{game.title} · Game Galaxy</title></svelte:head>

<div class="player">
	<header class="bar">
		<a class="btn btn-sm btn-ghost back" href="/?game={game.id}" aria-label="Back to the galaxy">
			<Icon name="arrow-left" size={18} /><span class="hide-sm">Galaxy</span>
		</a>
		<div class="title">
			<PlanetThumb planet={game.planet} size={28} />
			<h1>{game.title}</h1>
		</div>
		<div class="tools">
			<span class="status" class:error={saveState === 'error'} aria-live="polite">
				<Icon name={status.icon} size={16} /><span class="hide-sm">{status.text}</span>
			</span>
			{#if !data.user}
				<a class="btn btn-sm hide-sm" href="/login?next=/play/{game.id}">Sign in to sync</a>
			{/if}
			<button class="btn btn-sm btn-icon btn-ghost" type="button" onclick={toggleMute} aria-pressed={settings.muted} aria-label={settings.muted ? 'Unmute game' : 'Mute game'} title={settings.muted ? 'Unmute' : 'Mute'}>
				<Icon name={settings.muted ? 'volume-off' : 'volume'} size={18} />
			</button>
			<button class="btn btn-sm btn-icon btn-ghost" type="button" onclick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} title="Fullscreen">
				<Icon name={isFullscreen ? 'minimize' : 'maximize'} size={18} />
			</button>
		</div>
	</header>

	<div class="frame" bind:this={frameWrap}>
		<iframe
			bind:this={iframe}
			title={game.title}
			onload={onLoad}
			sandbox="allow-scripts allow-pointer-lock allow-downloads"
			allow="autoplay; fullscreen; gamepad; clipboard-write"
		></iframe>
		{#if !loaded}
			<div class="loading" out:fade={{ duration: 300 }}>
				<div class="orb"><PlanetThumb planet={game.planet} size={96} /></div>
				<p>Landing on {game.planet.name}…</p>
				{#if slow}
					<p class="slow">This is taking a while. <a href="/game/{game.id}">Back to details</a></p>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.player {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: #000;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 56px;
		padding: 0 12px;
		padding-top: env(safe-area-inset-top);
		background: var(--bg-raised);
		border-bottom: 1px solid var(--line);
		flex: none;
	}
	.title {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	h1 {
		font-size: 17px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tools {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-right: 6px;
		color: var(--muted);
		font-size: 13.5px;
		white-space: nowrap;
	}
	.status.error {
		color: var(--bad);
	}
	.frame {
		position: relative;
		flex: 1;
		min-height: 0;
		background: #000;
	}
	iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
		background: #000;
	}
	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 16px;
		color: var(--ink-soft);
		background: radial-gradient(circle at 50% 45%, #0e1330, #02030a 70%);
	}
	.orb {
		animation: float 2.4s ease-in-out infinite;
	}
	@keyframes float {
		50% {
			transform: translateY(-8px) scale(1.03);
		}
	}
	.slow {
		color: var(--muted);
		font-size: 14px;
	}
	@media (max-width: 640px) {
		.hide-sm {
			display: none;
		}
	}
</style>
