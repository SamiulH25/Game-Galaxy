<script lang="ts">
	let { size = 28 }: { size?: number } = $props();
</script>

<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
	<defs>
		<radialGradient id="logo-p" cx="38%" cy="34%" r="70%">
			<stop offset="0" stop-color="#ffe2a8" />
			<stop offset="0.55" stop-color="#ffb547" />
			<stop offset="1" stop-color="#7a3f0c" />
		</radialGradient>
		<clipPath id="logo-front"><rect x="0" y="34" width="64" height="30" /></clipPath>
	</defs>
	<g transform="rotate(-18 32 34)">
		<ellipse cx="32" cy="34" rx="29" ry="9" fill="none" stroke="#8fb3ff" stroke-width="3" opacity="0.7" />
	</g>
	<circle cx="32" cy="33" r="15" fill="url(#logo-p)" />
	<g transform="rotate(-18 32 34)" clip-path="url(#logo-front)">
		<ellipse cx="32" cy="34" rx="29" ry="9" fill="none" stroke="#8fb3ff" stroke-width="3" />
	</g>
	<circle cx="54" cy="14" r="3.5" fill="#e9ecf8" />
</svg>
