<script lang="ts">
  import { fade, slide } from 'svelte/transition';
  import { systems, games, currentSystemId, launchDiscoveredGame, discoveredGameIds, focusPlanetInGalaxy, newGameCount, acknowledgeNewGames, showOnboardingCoach } from '$lib/stores/galaxy';
  import { showUnchartedOnly, replayOnboarding } from '$lib/stores/progression';
  import { isAuthenticated } from '$lib/stores/auth';
  import { isMobile, lockBodyScroll } from '$lib/stores/viewport';
  import { trapFocus } from '$lib/utils/focusTrap';
  import { play } from '$lib/audio';
  import { settings, resetSettings } from '$lib/stores/settings';
  import ProfileCard from './ProfileCard.svelte';
  import GalaxyJournal from './GalaxyJournal.svelte';

  let { open = $bindable(false) } = $props();

  let activeTab = $state<'games' | 'systems' | 'journal' | 'settings' | 'profile'>('games');
  let searchQuery = $state('');
  let difficultyFilter = $state<string | null>(null);
  let genreFilter = $state<string | null>(null);
  let sheetDragY = $state(0);
  let panelDialogEl = $state<HTMLElement | null>(null);
  let touchStartY = 0;

  const systemList = $derived($systems);
  const gameList = $derived($games);
  const currentSysId = $derived($currentSystemId);

  const genreOptions = $derived.by(() => {
    const set = new Set<string>();
    for (const g of gameList) {
      if (g.genre) g.genre.split(',').forEach((part: string) => set.add(part.trim()));
    }
    return [...set].sort();
  });

  const filteredGames = $derived.by(() => {
    let list = gameList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(g => g.title?.toLowerCase().includes(q) || g.tags?.join(' ').toLowerCase().includes(q));
    }
    if (difficultyFilter) {
      list = list.filter((g) => g.difficulty === difficultyFilter);
    }
    if (genreFilter) {
      list = list.filter((g) => g.genre?.includes(genreFilter));
    }
    return list;
  });

  const gamesBySystem = $derived.by(() => {
    const map: Record<string, any[]> = {};
    for (const g of filteredGames) {
      const sid = g.solarSystemId || 'unknown';
      if (!map[sid]) map[sid] = [];
      map[sid].push(g);
    }
    return map;
  });

  const totalGames = $derived(gameList.length);
  const totalSystems = $derived(systemList.length);

  let lastSearchFocusId = $state<string | null>(null);

  $effect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      lastSearchFocusId = null;
      return;
    }
    const timer = setTimeout(() => {
      let list = gameList;
      list = list.filter(
        (g) => g.title?.toLowerCase().includes(q) || g.tags?.join(' ').toLowerCase().includes(q)
      );
      if (difficultyFilter) list = list.filter((g) => g.difficulty === difficultyFilter);
      if (genreFilter) list = list.filter((g) => g.genre?.includes(genreFilter));
      if (list.length === 0) return;

      let pick = list[0];
      const exact = list.find((g) => g.title?.toLowerCase() === q);
      const starts = list.filter((g) => g.title?.toLowerCase().startsWith(q));
      if (exact) pick = exact;
      else if (starts.length === 1) pick = starts[0];
      else if (list.length > 1) return;

      if (pick.id !== lastSearchFocusId) {
        lastSearchFocusId = pick.id;
        focusPlanetInGalaxy(pick);
      }
    }, 420);
    return () => clearTimeout(timer);
  });

  function launchGame(game: any) {
    if (!launchDiscoveredGame(game)) {
      open = false;
      play('cancel');
      return;
    }
    open = false;
    play('select');
  }

  function focusSearchResult() {
    const first = filteredGames[0];
    if (!first) return;
    focusPlanetInGalaxy(first);
    open = false;
    play('select');
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      focusSearchResult();
    }
  }

  function openJournalTab() {
    activeTab = 'journal';
    acknowledgeNewGames();
    play('click');
  }

  function switchSystem(id: string) {
    currentSystemId.set(id);
    activeTab = 'games';
    play('click');
  }

  function starColor(c: string) {
    return c || '#ffffff';
  }

  $effect(() => {
    if (!open) return;
    return lockBodyScroll();
  });

  $effect(() => {
    if (!open || !panelDialogEl) return;
    return trapFocus(panelDialogEl);
  });

  function onSheetTouchStart(e: TouchEvent) {
    if (!$isMobile) return;
    touchStartY = e.touches[0].clientY;
  }

  function onSheetTouchMove(e: TouchEvent) {
    if (!$isMobile || !open) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 0) sheetDragY = dy;
  }

  function onSheetTouchEnd() {
    if (sheetDragY > 100) {
      open = false;
      play('click');
    }
    sheetDragY = 0;
  }
</script>

<!-- Trigger button -->
<button
  class="panel-trigger"
  class:panel-open={open}
  onclick={() => { open = !open; play(open ? 'pop' : 'click'); }}
  aria-label="Toggle side panel"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
</button>

<!-- Panel -->
{#if open}
  <div class="panel-backdrop" role="button" tabindex="-1" aria-label="Close panel" onclick={() => { open = false; play('click'); }} onkeydown={(e) => e.key === 'Escape' && (open = false)} transition:fade={{ duration: 200 }}></div>
{/if}

<div class="side-panel" class:open class:closed={!open} class:mobile-sheet={$isMobile} role="dialog" aria-label="Explorer panel" bind:this={panelDialogEl}>
  {#if open}
    <div
      class="panel-inner"
      style={$isMobile && sheetDragY ? `transform: translateY(${sheetDragY}px)` : undefined}
      ontouchstart={onSheetTouchStart}
      ontouchmove={onSheetTouchMove}
      ontouchend={onSheetTouchEnd}
      transition:slide={{ duration: 250, axis: $isMobile ? 'y' : 'x' }}
    >
      {#if $isMobile}
        <div class="sheet-grab" aria-hidden="true"></div>
      {/if}
      <!-- Header -->
      <div class="panel-header">
        <h2>Explorer</h2>
        <button class="close-btn" onclick={() => { open = false; play('click'); }} aria-label="Close panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="panel-tabs">
        <button class="tab-btn" class:active={activeTab === 'games'} onclick={() => { activeTab = 'games'; play('click'); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg>
          Games
        </button>
        <button class="tab-btn" class:active={activeTab === 'systems'} onclick={() => { activeTab = 'systems'; play('click'); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
          Systems
        </button>
        <button class="tab-btn" class:active={activeTab === 'journal'} class:has-badge={$newGameCount > 0} onclick={openJournalTab}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Journal
          {#if $newGameCount > 0}
            <span class="tab-badge">{$newGameCount}</span>
          {/if}
        </button>
        <button class="tab-btn" class:active={activeTab === 'settings'} onclick={() => { activeTab = 'settings'; play('click'); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </button>
        <button class="tab-btn" class:active={activeTab === 'profile'} onclick={() => { activeTab = 'profile'; play('click'); }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          Profile
        </button>
      </div>

      <!-- Tab: Games -->
      {#if activeTab === 'games'}
        <div class="tab-content">
          <div class="search-wrap">
            <svg class="search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              class="search-input"
              placeholder="Search games… (Enter to locate)"
              bind:value={searchQuery}
              onkeydown={onSearchKeydown}
            />
            {#if searchQuery}
              <button class="clear-btn" onclick={() => { searchQuery = ''; play('click'); }}>✕</button>
            {/if}
          </div>

          <div class="filter-row">
            <button
              class="filter-chip"
              class:active={!difficultyFilter}
              onclick={() => { difficultyFilter = null; play('click'); }}
            >All</button>
            {#each ['Easy', 'Medium', 'Hard'] as diff}
              <button
                class="filter-chip"
                class:active={difficultyFilter === diff}
                onclick={() => { difficultyFilter = difficultyFilter === diff ? null : diff; play('click'); }}
              >{diff}</button>
            {/each}
            <button
              class="filter-chip filter-uncharted"
              class:active={$showUnchartedOnly}
              onclick={() => { showUnchartedOnly.update((v) => !v); play('click'); }}
            >Uncharted</button>
          </div>

          {#if genreOptions.length > 0}
            <div class="filter-row filter-row-wrap">
              {#each genreOptions.slice(0, 6) as genre}
                <button
                  class="filter-chip filter-chip-sm"
                  class:active={genreFilter === genre}
                  onclick={() => { genreFilter = genreFilter === genre ? null : genre; play('click'); }}
                >{genre}</button>
              {/each}
            </div>
          {/if}

          <div class="games-scroll">
            {#if Object.keys(gamesBySystem).length === 0}
              <div class="empty-state">No games match your search.</div>
            {/if}
            {#each Object.entries(gamesBySystem) as [sysId, sysGames]}
              {@const sys = systemList.find(s => s.id === sysId)}
              <div class="sys-group">
                <div class="sys-group-header" style="--sys-color: {starColor(sys?.star?.starColor)};">
                  <span class="sys-dot"></span>
                  <span class="sys-name">{sys?.name || sysId}</span>
                  <span class="sys-count">{sysGames.length}</span>
                </div>
                <div class="sys-games">
                  {#each sysGames as game}
                    {@const discovered = $discoveredGameIds.has(game.id)}
                    <button
                      class="game-item"
                      class:undiscovered={!discovered}
                      class:locked={!discovered}
                      onclick={() => launchGame(game)}
                      title={discovered ? game.title : 'Discover in the galaxy first'}
                    >
                      <span class="game-planet" class:mystery={!discovered} style="background: {game.planetColor || '#444'};"></span>
                      <span class="game-title">{discovered ? game.title : '???'}</span>
                      {#if discovered && game.difficulty}
                        <span class="game-diff">{game.difficulty[0]}</span>
                      {/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Tab: Systems -->
      {#if activeTab === 'systems'}
        <div class="tab-content">
          <div class="systems-scroll">
            <div class="systems-grid">
              {#each systemList as sys}
                <button
                  class="sys-card"
                  class:active={sys.id === currentSysId}
                  onclick={() => switchSystem(sys.id)}
                  style="--sys-color: {starColor(sys.star?.starColor)};"
                >
                  <div class="sys-card-star">
                    <div class="star-glow" style="background: radial-gradient(circle, {sys.star?.starColor || '#666'}33, transparent 70%);"></div>
                    <div class="star-core" style="background: {sys.star?.starColor || '#666'};"></div>
                  </div>
                  <div class="sys-card-info">
                    <span class="sys-card-name">{sys.name}</span>
                    <span class="sys-card-count">{sys.game_count} game{sys.game_count !== 1 ? 's' : ''}</span>
                  </div>
                  {#if sys.id === currentSysId}
                    <span class="active-badge">Active</span>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Tab: Journal -->
      {#if activeTab === 'journal'}
        <div class="tab-content tab-content-flex">
          <GalaxyJournal onLaunch={() => { open = false; }} />
        </div>
      {/if}

      <!-- Tab: Settings -->
      {#if activeTab === 'settings'}
        <div class="tab-content">
          <div class="settings-scroll">
            <!-- Visual -->
            <div class="settings-section">
              <div class="settings-section-header">Visual</div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Camera Rotation Speed</span>
                  <span class="setting-desc">How fast the camera orbits the system</span>
                </div>
                <div class="setting-control">
                  <input
                    type="range" min="0.1" max="2.0" step="0.1"
                    bind:value={$settings.cameraRotSpeed}
                    oninput={() => play('click')}
                    class="slider"
                  />
                  <span class="slider-val">{$settings.cameraRotSpeed.toFixed(1)}x</span>
                </div>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Star Density</span>
                  <span class="setting-desc">Number of background stars</span>
                </div>
                <div class="setting-control setting-segmented">
                  {#each ['low', 'medium', 'high'] as opt}
                    <button
                      class="seg-btn" class:active={$settings.starDensity === opt}
                      onclick={() => { settings.update(s => ({ ...s, starDensity: opt as 'low' | 'medium' | 'high' })); play('click'); }}
                    >{opt}</button>
                  {/each}
                </div>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Star Brightness</span>
                  <span class="setting-desc">Luminosity of background stars</span>
                </div>
                <div class="setting-control">
                  <input
                    type="range" min="0.3" max="1.5" step="0.1"
                    bind:value={$settings.starBrightness}
                    oninput={() => play('click')}
                    class="slider"
                  />
                  <span class="slider-val">{$settings.starBrightness.toFixed(1)}x</span>
                </div>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Nebula Clouds</span>
                  <span class="setting-desc">Faint color clouds in the background</span>
                </div>
                <button
                  class="toggle" class:on={$settings.nebulaClouds}
                  onclick={() => { settings.update(s => ({ ...s, nebulaClouds: !s.nebulaClouds })); play('click'); }}
                  role="switch" aria-checked={$settings.nebulaClouds} aria-label="Toggle nebula clouds"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Distant Galaxies</span>
                  <span class="setting-desc">Background galaxy sprites</span>
                </div>
                <button
                  class="toggle" class:on={$settings.galaxySprites}
                  onclick={() => { settings.update(s => ({ ...s, galaxySprites: !s.galaxySprites })); play('click'); }}
                  role="switch" aria-checked={$settings.galaxySprites} aria-label="Toggle distant galaxies"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Planet Glow</span>
                  <span class="setting-desc">Atmospheric glow around planets</span>
                </div>
                <button
                  class="toggle" class:on={$settings.planetGlow}
                  onclick={() => { settings.update(s => ({ ...s, planetGlow: !s.planetGlow })); play('click'); }}
                  role="switch" aria-checked={$settings.planetGlow} aria-label="Toggle planet glow"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Orbit Rings</span>
                  <span class="setting-desc">Planetary orbit path rings</span>
                </div>
                <button
                  class="toggle" class:on={$settings.orbitRings}
                  onclick={() => { settings.update(s => ({ ...s, orbitRings: !s.orbitRings })); play('click'); }}
                  role="switch" aria-checked={$settings.orbitRings} aria-label="Toggle orbit rings"
                ><span class="toggle-knob"></span></button>
              </div>
            </div>

            <!-- Audio -->
            <div class="settings-section">
              <div class="settings-section-header">Audio</div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Master Volume</span>
                </div>
                <div class="setting-control">
                  <input
                    type="range" min="0" max="100" step="1"
                    bind:value={$settings.masterVolume}
                    oninput={() => play('click')}
                    class="slider"
                  />
                  <span class="slider-val">{$settings.masterVolume}%</span>
                </div>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">SFX Volume</span>
                </div>
                <div class="setting-control">
                  <input
                    type="range" min="0" max="100" step="1"
                    bind:value={$settings.sfxVolume}
                    oninput={() => play('click')}
                    class="slider"
                  />
                  <span class="slider-val">{$settings.sfxVolume}%</span>
                </div>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Music Volume</span>
                </div>
                <div class="setting-control">
                  <input
                    type="range" min="0" max="100" step="1"
                    bind:value={$settings.musicVolume}
                    oninput={() => play('click')}
                    class="slider"
                  />
                  <span class="slider-val">{$settings.musicVolume}%</span>
                </div>
              </div>
            </div>

            <!-- UI -->
            <div class="settings-section">
              <div class="settings-section-header">UI</div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">UI Scale</span>
                  <span class="setting-desc">Interface element sizing</span>
                </div>
                <div class="setting-control setting-segmented">
                  {#each ['small', 'normal', 'large'] as opt}
                    <button
                      class="seg-btn" class:active={$settings.uiScale === opt}
                      onclick={() => { settings.update(s => ({ ...s, uiScale: opt as 'small' | 'normal' | 'large' })); play('click'); }}
                    >{opt}</button>
                  {/each}
                </div>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Tutorial Hints</span>
                  <span class="setting-desc">Show helpful tips while browsing</span>
                </div>
                <button
                  class="toggle" class:on={$settings.showTutorialHints}
                  onclick={() => { settings.update(s => ({ ...s, showTutorialHints: !s.showTutorialHints })); play('click'); }}
                  role="switch" aria-checked={$settings.showTutorialHints} aria-label="Toggle tutorial hints"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Reduce Motion</span>
                  <span class="setting-desc">Minimize hero, reveal, and camera animations</span>
                </div>
                <button
                  class="toggle" class:on={$settings.reduceMotion}
                  onclick={() => { settings.update(s => ({ ...s, reduceMotion: !s.reduceMotion })); play('click'); }}
                  role="switch" aria-checked={$settings.reduceMotion} aria-label="Toggle reduce motion"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Auto-Save</span>
                  <span class="setting-desc">Automatically save game progress</span>
                </div>
                <button
                  class="toggle" class:on={$settings.autoSave}
                  onclick={() => { settings.update(s => ({ ...s, autoSave: !s.autoSave })); play('click'); }}
                  role="switch" aria-checked={$settings.autoSave} aria-label="Toggle auto-save"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Confirm Close</span>
                  <span class="setting-desc">Ask before closing a game</span>
                </div>
                <button
                  class="toggle" class:on={$settings.confirmCloseGame}
                  onclick={() => { settings.update(s => ({ ...s, confirmCloseGame: !s.confirmCloseGame })); play('click'); }}
                  role="switch" aria-checked={$settings.confirmCloseGame} aria-label="Toggle confirm close"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Double-tap Launch</span>
                  <span class="setting-desc">Double-tap a planet to launch instantly</span>
                </div>
                <button
                  class="toggle" class:on={$settings.doubleTapLaunch}
                  onclick={() => { settings.update(s => ({ ...s, doubleTapLaunch: !s.doubleTapLaunch })); play('click'); }}
                  role="switch" aria-checked={$settings.doubleTapLaunch} aria-label="Toggle double-tap launch"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Mobile Fullscreen</span>
                  <span class="setting-desc">Auto fullscreen when launching on phone</span>
                </div>
                <button
                  class="toggle" class:on={$settings.mobileAutoFullscreen}
                  onclick={() => { settings.update(s => ({ ...s, mobileAutoFullscreen: !s.mobileAutoFullscreen })); play('click'); }}
                  role="switch" aria-checked={$settings.mobileAutoFullscreen} aria-label="Toggle mobile auto fullscreen"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">Haptic Feedback</span>
                  <span class="setting-desc">Vibration on discoveries and rank-ups</span>
                </div>
                <button
                  class="toggle" class:on={$settings.hapticsEnabled}
                  onclick={() => { settings.update(s => ({ ...s, hapticsEnabled: !s.hapticsEnabled })); play('click'); }}
                  role="switch" aria-checked={$settings.hapticsEnabled} aria-label="Toggle haptics"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">High Contrast</span>
                  <span class="setting-desc">Stronger text and border contrast</span>
                </div>
                <button
                  class="toggle" class:on={$settings.highContrast}
                  onclick={() => { settings.update(s => ({ ...s, highContrast: !s.highContrast })); play('click'); }}
                  role="switch" aria-checked={$settings.highContrast} aria-label="Toggle high contrast"
                ><span class="toggle-knob"></span></button>
              </div>
            </div>

            <!-- Advanced -->
            <div class="settings-section">
              <div class="settings-section-header">Advanced</div>

              <div class="setting-row setting-toggle">
                <div class="setting-info">
                  <span class="setting-label">FPS Counter</span>
                  <span class="setting-desc">Display frames per second overlay</span>
                </div>
                <button
                  class="toggle" class:on={$settings.fpsDisplay}
                  onclick={() => { settings.update(s => ({ ...s, fpsDisplay: !s.fpsDisplay })); play('click'); }}
                  role="switch" aria-checked={$settings.fpsDisplay} aria-label="Toggle FPS counter"
                ><span class="toggle-knob"></span></button>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Replay Tour</span>
                  <span class="setting-desc">Show the galaxy onboarding coach again</span>
                </div>
                <button
                  class="reset-btn"
                  onclick={() => {
                    replayOnboarding();
                    showOnboardingCoach.set(true);
                    open = false;
                    play('click');
                  }}
                >Replay</button>
              </div>

              <div class="setting-row">
                <div class="setting-info">
                  <span class="setting-label">Reset Settings</span>
                  <span class="setting-desc">Revert all settings to defaults</span>
                </div>
                <button
                  class="reset-btn"
                  onclick={() => { resetSettings(); play('click'); }}
                >Reset</button>
              </div>
            </div>

            <div class="settings-footer">
              Settings are saved automatically
            </div>
          </div>
        </div>
      {/if}

      <!-- Tab: Profile -->
      {#if activeTab === 'profile'}
        <div class="tab-content">
          <div class="profile-scroll">
            <ProfileCard />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ─── Trigger ─── */
  .panel-trigger {
    position: fixed;
    right: var(--space-lg);
    bottom: var(--space-lg);
    z-index: 15;
    width: clamp(38px, 3vw, 48px);
    height: clamp(38px, 3vw, 48px);
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-md), var(--shadow-glow);
    transition: background 0.15s var(--ease-out), border-color 0.15s var(--ease-out), color 0.15s var(--ease-out);
  }
  .panel-trigger:hover { background: var(--surface-raised); border-color: var(--border-hover); color: var(--text); }
  .panel-trigger.panel-open { border-color: var(--border-accent); color: var(--accent); }

  /* ─── Backdrop ─── */
  .panel-backdrop {
    position: fixed; inset: 0; z-index: 16; background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* ─── Panel ─── */
  .side-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: min(380px, 90vw);
    height: 100%;
    height: 100dvh;
    z-index: 17;
    pointer-events: none;
  }
  .side-panel.open { pointer-events: auto; }

  .panel-inner {
    height: 100%;
    background: var(--surface);
    border-left: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ─── Header ─── */
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-header h2 {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--text);
    letter-spacing: 0.02em;
  }
  .close-btn {
    width: 30px; height: 30px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .close-btn:hover { background: rgba(255,255,255,0.04); color: var(--text); }

  /* ─── Tabs ─── */
  .panel-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: var(--space-sm) var(--space-xs);
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 500;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
  }
  .tab-btn:hover { color: var(--text-secondary); background: rgba(255,255,255,0.02); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .tab-btn.has-badge {
    position: relative;
  }

  .tab-badge {
    position: absolute;
    top: 4px;
    right: 2px;
    min-width: 14px;
    height: 14px;
    padding: 0 4px;
    border-radius: 7px;
    background: var(--accent);
    color: #0a0a18;
    font-size: 9px;
    font-weight: 800;
    line-height: 14px;
    text-align: center;
  }

  /* ─── Tab content ─── */
  .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .tab-content-flex {
    overflow: hidden;
  }

  .filter-row {
    display: flex;
    gap: 6px;
    padding: 0 var(--space-lg) var(--space-sm);
    flex-shrink: 0;
  }

  .filter-row-wrap {
    flex-wrap: wrap;
    padding-top: 0;
  }

  .filter-chip {
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-muted);
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: all 0.15s var(--ease-out);
  }

  .filter-chip-sm {
    text-transform: none;
    font-size: 10px;
    letter-spacing: 0;
  }

  .filter-chip:hover {
    border-color: var(--border-hover);
    color: var(--text-secondary);
  }

  .filter-chip.active {
    border-color: rgba(232, 168, 56, 0.3);
    background: rgba(232, 168, 56, 0.1);
    color: var(--accent);
  }

  /* ─── Search ─── */
  .search-wrap {
    position: relative;
    padding: var(--space-sm) var(--space-lg);
    flex-shrink: 0;
  }
  .search-icon {
    position: absolute;
    left: calc(var(--space-lg) + 10px);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 8px 30px 8px 32px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-input);
    color: var(--text);
    font-size: var(--fs-xs);
    font-family: 'DM Sans', system-ui, sans-serif;
    outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: var(--border-hover); }
  .search-input::placeholder { color: var(--text-muted); }
  .clear-btn {
    position: absolute;
    right: calc(var(--space-lg) + 6px);
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 11px;
    padding: 2px;
  }
  .clear-btn:hover { color: var(--text); }

  /* ─── Games scroll ─── */
  .games-scroll, .systems-scroll, .info-scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-xs) var(--space-lg) var(--space-lg);
  }

  .games-scroll::-webkit-scrollbar, .systems-scroll::-webkit-scrollbar, .info-scroll::-webkit-scrollbar { width: 4px; }
  .games-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .empty-state {
    text-align: center;
    padding: var(--space-xl) 0;
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }

  /* ─── System group ─── */
  .sys-group { margin-bottom: var(--space-md); }

  .sys-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: var(--space-xs) 0;
    margin-bottom: var(--space-xs);
    border-bottom: 1px solid var(--border);
  }
  .sys-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--sys-color, #666);
    box-shadow: 0 0 10px color-mix(in srgb, var(--sys-color, #666) 40%, transparent);
    flex-shrink: 0;
  }
  .sys-name { font-size: var(--fs-xs); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
  .sys-count { margin-left: auto; font-size: 10px; color: var(--text-muted); background: var(--surface-input); padding: 1px 7px; border-radius: 10px; }

  .sys-games { display: flex; flex-direction: column; gap: 2px; }

  .game-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: var(--space-xs) var(--space-sm);
    border: none;
    border-radius: var(--radius-xs);
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--fs-xs);
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }
  .game-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
  .game-item.undiscovered { opacity: 0.55; }
  .game-item.locked { cursor: not-allowed; }
  .game-item.undiscovered .game-title { font-style: italic; color: var(--text-muted); }
  .game-planet.mystery {
    background: #555570 !important;
    box-shadow: none;
    border: 1px dashed rgba(255, 255, 255, 0.15);
  }
  .game-diff {
    font-size: 8px;
    font-weight: 700;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.04);
    padding: 2px 5px;
    border-radius: 3px;
    margin-left: auto;
    flex-shrink: 0;
  }
  .game-planet { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .game-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ─── Systems grid ─── */
  .systems-grid { display: flex; flex-direction: column; gap: var(--space-sm); padding-top: var(--space-xs); }

  .sys-card {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    text-align: left;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: background 0.15s, border-color 0.15s;
    position: relative;
  }
  .sys-card:hover { background: rgba(255,255,255,0.03); border-color: var(--border-hover); }
  .sys-card.active { border-color: var(--border-accent); background: rgba(232,168,56,0.04); }

  .sys-card-star {
    position: relative;
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .star-glow {
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }
  .star-core {
    width: 12px; height: 12px;
    border-radius: 50%;
  }

  .sys-card-info { display: flex; flex-direction: column; min-width: 0; }
  .sys-card-name { font-size: var(--fs-sm); font-weight: 600; color: var(--text); }
  .sys-card-count { font-size: 10px; color: var(--text-muted); }

  .active-badge {
    margin-left: auto;
    font-size: 9px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(232,168,56,0.1);
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
  }

  /* ─── Info tab ─── */
  .info-card {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin-bottom: var(--space-sm);
  }
  .info-card--accent { border-color: var(--border-accent); background: rgba(232,168,56,0.03); }

  .info-card-header {
    font-size: var(--fs-xs);
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--space-sm);
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-xs) 0;
    font-size: var(--fs-xs);
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
  }
  .info-row:last-child { border-bottom: none; }
  .info-val { color: var(--text); font-weight: 600; }

  .tip-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .tip-list li {
    padding: var(--space-xs) 0;
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    padding-left: 14px;
    position: relative;
  }
  .tip-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--accent-dim);
  }
  .tip-list kbd {
    display: inline-block;
    padding: 0 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(232,168,56,0.08);
    border: 1px solid rgba(232,168,56,0.15);
    border-radius: 3px;
    font-family: 'DM Sans', monospace;
  }

  .info-text { font-size: var(--fs-xs); color: var(--text-secondary); line-height: 1.5; }

  .shortcut-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-xs) var(--space-sm);
    font-size: var(--fs-xs);
    color: var(--text-secondary);
  }
  .shortcut-key { display: flex; gap: 4px; }
  .shortcut-key kbd {
    font-size: 10px;
    font-weight: 600;
    color: var(--text);
    background: var(--surface-input);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 1px 6px;
    font-family: 'DM Sans', monospace;
  }

  /* ─── Settings tab ─── */
  .settings-scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm) var(--space-lg) var(--space-lg);
  }
  .settings-scroll::-webkit-scrollbar { width: 4px; }
  .settings-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .settings-section {
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: var(--space-sm);
  }
  .settings-section-header {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: var(--space-sm) var(--space-md);
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-md);
    border-bottom: 1px solid var(--border);
    min-height: 40px;
  }
  .setting-row:last-of-type { border-bottom: none; }
  .setting-toggle { min-height: 36px; }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .setting-label {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--text-secondary);
  }
  .setting-desc {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* Slider */
  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 80px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    outline: none;
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
    box-shadow: 0 0 6px rgba(232,168,56,0.3);
    cursor: pointer;
  }
  .slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
    cursor: pointer;
  }
  .slider-val {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    min-width: 30px;
    text-align: right;
  }

  /* Segmented control */
  .setting-segmented {
    display: flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    overflow: hidden;
  }
  .seg-btn {
    padding: 4px 10px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 10px;
    font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .seg-btn:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
  .seg-btn.active {
    background: var(--accent);
    color: var(--bg-deepest);
  }

  /* Toggle switch */
  .toggle {
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 10px;
    border: none;
    background: var(--border);
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.2s var(--ease-out);
  }
  .toggle.on { background: var(--accent); }
  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform 0.2s var(--ease-out);
  }
  .toggle.on .toggle-knob { transform: translateX(16px); background: var(--bg-deepest); }

  /* Reset button */
  .reset-btn {
    padding: 5px 12px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--accent-red, #dd4466);
    background: transparent;
    color: var(--accent-red, #dd4466);
    font-size: 10px;
    font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    transition: background 0.15s;
  }
  .reset-btn:hover { background: rgba(221,68,102,0.1); }

  .settings-footer {
    text-align: center;
    font-size: 10px;
    color: var(--text-muted);
    padding: var(--space-sm) 0 var(--space-md);
  }

  /* ─── Profile tab ─── */
  .profile-scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-sm) var(--space-lg) var(--space-lg);
  }
  .profile-scroll::-webkit-scrollbar { width: 4px; }
  .profile-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  @media (max-width: 640px) {
    .side-panel.mobile-sheet {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: min(92dvh, calc(100dvh - var(--chrome-top, 48px)));
    }

    .side-panel.mobile-sheet .panel-inner {
      border-left: none;
      border-top: 1px solid var(--border);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    .panel-tabs .tab-btn {
      min-height: 44px;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .panel-trigger {
      bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px));
    }

    .sheet-grab {
      width: 40px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.2);
      margin: 8px auto 4px;
      flex-shrink: 0;
    }

    .panel-inner {
      transition: transform 0.1s ease-out;
    }
  }
</style>
