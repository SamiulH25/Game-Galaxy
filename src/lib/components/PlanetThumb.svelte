<script lang="ts">
	import type { PlanetVisual } from '$lib/types';

	let { planet, size = 64 }: { planet: PlanetVisual; size?: number } = $props();
	const tilt = $derived((planet.rings?.tilt ?? 0) * 40 - 14);
</script>

<!-- A CSS-only planet so lists and cards don't need WebGL. -->
<span
	class="thumb kind-{planet.kind}"
	class:has-rings={!!planet.rings}
	style:--c={planet.color}
	style:--a={planet.accent}
	style:--atmo={planet.atmosphere ?? 'transparent'}
	style:--ring={planet.rings?.color ?? 'transparent'}
	style:--tilt="{tilt}deg"
	style:--size="{size}px"
	aria-hidden="true"
>
	{#if planet.rings}<span class="ring back"></span>{/if}
	<span class="body"></span>
	{#if planet.rings}<span class="ring front"></span>{/if}
</span>

<style>
	.thumb {
		position: relative;
		display: inline-grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		flex: none;
	}
	.has-rings .body {
		width: 62%;
		height: 62%;
	}
	.body {
		position: relative;
		width: 82%;
		height: 82%;
		border-radius: 50%;
		background:
			radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.35), transparent 38%),
			radial-gradient(circle at 70% 75%, rgba(0, 0, 0, 0.75), transparent 65%),
			radial-gradient(circle at 40% 40%, var(--c), color-mix(in srgb, var(--c) 35%, #000) 90%);
		box-shadow:
			0 0 calc(var(--size) * 0.18) color-mix(in srgb, var(--atmo) 55%, transparent),
			inset -4px -6px 14px rgba(0, 0, 0, 0.55);
		overflow: hidden;
	}
	.body::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 50%;
		mix-blend-mode: soft-light;
		opacity: 0.85;
	}
	.kind-gas .body::after {
		background: repeating-linear-gradient(
			172deg,
			transparent 0 7%,
			color-mix(in srgb, var(--a) 80%, transparent) 7% 12%,
			transparent 12% 19%,
			rgba(255, 255, 255, 0.25) 19% 21%
		);
	}
	.kind-terran .body::after,
	.kind-ocean .body::after {
		background:
			radial-gradient(ellipse 30% 18% at 30% 40%, var(--a), transparent 70%),
			radial-gradient(ellipse 22% 26% at 65% 60%, var(--a), transparent 70%),
			radial-gradient(ellipse 40% 10% at 50% 8%, #fff, transparent 70%);
	}
	.kind-ocean .body::after {
		opacity: 0.6;
	}
	.kind-rocky .body::after,
	.kind-ice .body::after {
		background:
			radial-gradient(circle at 30% 60%, rgba(0, 0, 0, 0.5) 0 6%, transparent 7%),
			radial-gradient(circle at 62% 35%, rgba(0, 0, 0, 0.4) 0 4%, transparent 5%),
			radial-gradient(circle at 55% 70%, rgba(255, 255, 255, 0.35) 0 8%, transparent 10%);
	}
	.kind-lava .body::after {
		mix-blend-mode: screen;
		background:
			linear-gradient(120deg, transparent 40%, var(--a) 42%, transparent 45%),
			linear-gradient(60deg, transparent 58%, var(--a) 60%, transparent 62%),
			linear-gradient(170deg, transparent 30%, var(--a) 31%, transparent 33%);
	}
	.ring {
		position: absolute;
		width: 100%;
		height: 30%;
		border-radius: 50%;
		border: calc(var(--size) * 0.045) solid color-mix(in srgb, var(--ring) 75%, transparent);
		transform: rotate(var(--tilt));
	}
	.ring.front {
		clip-path: inset(50% 0 0 0);
	}
	.ring.back {
		clip-path: inset(0 0 50% 0);
		opacity: 0.6;
	}
</style>
