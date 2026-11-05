<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { api, onUnauthorized } from '$lib/api';
	import { guestStore } from '$lib/bridge/guest-store';
	import { plural } from '$lib/format';
	import { toasts } from '$lib/toasts.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import type { MergeSummary } from '$lib/types';

	let { data, children } = $props();

	const route = $derived(page.route.id ?? '');
	const showHeader = $derived(!route.startsWith('/play'));
	const overlayHeader = $derived(route === '/');

	onMount(() =>
		onUnauthorized(() => {
			if (!data.user) return;
			toasts.push({ title: 'Session expired', body: 'Sign in again to keep your progress syncing.', icon: 'lock', tone: 'bad' }, 7000);
			void invalidateAll();
		})
	);

	// Bring guest progress into the account right after signing in.
	let importing = false;
	$effect(() => {
		if (!browser || !data.user || importing || !guestStore.hasProgress()) return;
		importing = true;
		api<MergeSummary>('/api/guest/import', { method: 'POST', body: { games: guestStore.all() } })
			.then((s) => {
				guestStore.clear();
				if (s.games > 0) {
					const kept = s.savesKept ? ` Kept your cloud save for ${plural(s.savesKept, 'game')}.` : '';
					toasts.push(
						{ title: 'Guest progress synced', body: `Imported progress from ${plural(s.games, 'game')}.${kept}`, icon: 'cloud', tone: 'good' },
						7000
					);
				}
			})
			.catch(() => toasts.push({ title: "Couldn't sync guest progress", body: "It's still saved in this browser. We'll retry next time.", icon: 'alert', tone: 'bad' }))
			.finally(() => (importing = false));
	});
</script>

<svelte:head>
	<title>Game Galaxy</title>
	<meta name="description" content="A 3D galaxy of browser games. Fly between star systems, pick a planet, and play." />
</svelte:head>

{#if showHeader}
	<SiteHeader user={data.user} overlay={overlayHeader} />
{/if}

{@render children()}

<Toaster />
