<script lang="ts">
	import { FILLED, ICONS, type IconName } from './icons';

	let { name, size = 20, label }: { name: IconName; size?: number; label?: string } = $props();
	const filled = $derived(FILLED.has(name));
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill={filled ? 'currentColor' : 'none'}
	stroke={filled ? 'none' : 'currentColor'}
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	style="flex: none"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static, trusted icon markup -->
	{@html ICONS[name]}
</svg>
