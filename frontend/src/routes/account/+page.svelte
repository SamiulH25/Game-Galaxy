<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { isAuthenticated, user, logoutUser } from '$lib/stores/auth';
  import { play } from '$lib/audio';
  import { profile, achievements, profileStats, recentAchievements, loadProfile, loadAchievements, loadLeaderboard, leaderboards } from '$lib/stores/social';
  import { systems, games } from '$lib/stores/galaxy';
  import { loadGalaxyData } from '$lib/stores/galaxy';

  let activeTab = $state<'stats' | 'achievements' | 'leaderboards'>('stats');
  let selectedLbGame = $state<string | null>(null);
  let lbView = $state<'best' | 'latest'>('best');
  let mounted = $state(false);

  const gameList = $derived($games);
  const systemList = $derived($systems);

  const lbGames = $derived(
    $games.filter((g: any) => g.id).map((g: any) => ({ id: g.id, title: g.title }))
  );

  const iconMap: Record<string, string> = {
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    trophy: 'M8 21l3-2 3 2M12 3v6M18 9c0 3.5-2.5 6-6 6s-6-2.5-6-6M6 3h12',
    rocket: 'M4 16l4.5-4.5M19 5l-4 4M5 19l3-3M15 9l-3 3M12 12l4-4M4 20l4-4M12 2v4M17 7l3 3',
    compass: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm3-11l-4 2-2 4 4-2 2-4z',
    galaxy: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    floppy: 'M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-4-4zm-7 16a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm3-10H6V4h9v4z',
    leaderboard: 'M3 21h18M3 10h4v11H3zM10 7h4v14h-4zM17 3h4v18h-4z',
  };

  onMount(async () => {
    mounted = true;
    play('pageEnter');
    if (!$isAuthenticated) { goto('/'); return; }
    await Promise.all([loadProfile(), loadAchievements()]);
    if (lbGames.length > 0) selectedLbGame = lbGames[0].id;
  });

  function handleSignOut() {
    play('cancel');
    logoutUser();
    goto('/');
  }

  function goBack() {
    play('doorClose');
    goto('/');
  }

  function switchLbGame(id: string) {
    selectedLbGame = id;
    play('click');
    loadLeaderboard(id, lbView);
  }

  function switchLbView(view: 'best' | 'latest') {
    lbView = view;
    play('click');
    if (selectedLbGame) loadLeaderboard(selectedLbGame, view);
  }

  const joinDate = $derived($user?.created_at
    ? new Date($user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
  );

  const currentLb = $derived(selectedLbGame ? $leaderboards[selectedLbGame] : null);
</script>

<svelte:window />

{#if mounted && $isAuthenticated}
  <div class="page" transition:fade={{ duration: 300 }}>
    <div class="page-bg">
      <div class="starfield"></div>
      <div class="nebula nebula-1"></div>
      <div class="nebula nebula-2"></div>
    </div>

    <nav class="top-nav">
      <button class="back-btn" onclick={goBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
        Galaxy
      </button>
      <button class="signout-btn" onclick={handleSignOut}>Sign Out</button>
    </nav>

    {#if $profile}
      <main class="profile-content" in:fly={{ y: 20, duration: 400, easing: (t) => 1 - Math.pow(1 - t, 3) }}>
        <!-- Header -->
        <div class="profile-header">
          <div class="avatar-ring">
            <div class="avatar">{$profile.user.username?.charAt(0).toUpperCase() || 'U'}</div>
          </div>
          <div class="header-info">
            <h1>{$profile.user.username}</h1>
            <span class="member-since">Member since {joinDate}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="profile-tabs">
          <button class="tab-btn" class:active={activeTab === 'stats'} onclick={() => { activeTab = 'stats'; play('click'); }}>Stats</button>
          <button class="tab-btn" class:active={activeTab === 'achievements'} onclick={() => { activeTab = 'achievements'; play('click'); }}>Achievements</button>
          <button class="tab-btn" class:active={activeTab === 'leaderboards'} onclick={() => { activeTab = 'leaderboards'; play('click'); }}>Leaderboards</button>
        </div>

        <!-- Stats Tab -->
        {#if activeTab === 'stats'}
          <div class="tab-content" in:fade>
            <div class="stats-grid">
              <div class="stat-card">
                <span class="stat-num">{$profileStats?.games_played || 0}</span>
                <span class="stat-lbl">Games Played</span>
              </div>
              <div class="stat-card">
                <span class="stat-num">{$profileStats?.achievements_unlocked || 0}<span class="stat-denom">/{$profileStats?.total_achievements || 0}</span></span>
                <span class="stat-lbl">Achievements</span>
              </div>
              <div class="stat-card">
                <span class="stat-num">{$profileStats?.total_saves || 0}</span>
                <span class="stat-lbl">Saves Made</span>
              </div>
              <div class="stat-card">
                <span class="stat-num">{$profileStats?.leaderboard_entries || 0}</span>
                <span class="stat-lbl">Leaderboards</span>
              </div>
              <div class="stat-card">
                <span class="stat-num">{$profileStats?.account_age_days || 0}</span>
                <span class="stat-lbl">Days Active</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Achievements Tab -->
        {#if activeTab === 'achievements'}
          <div class="tab-content" in:fade>
            {#if $achievements}
              {#if $achievements.universal.length > 0}
                <div class="ach-section">
                  <h3 class="ach-section-title">Universal</h3>
                  <div class="ach-grid">
                    {#each $achievements.universal as ach}
                      {@const unlocked = $achievements.unlocked.includes('universal:' + ach.id)}
                      <div class="ach-card" class:locked={!unlocked} class:hidden={ach.hidden && !unlocked} title={unlocked ? ach.description : ach.hidden ? '???' : ach.description}>
                        <div class="ach-icon" class:unlocked>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={iconMap[ach.icon] || iconMap.star} /></svg>
                        </div>
                        <span class="ach-title">{unlocked ? ach.title : (ach.hidden ? '???' : ach.title)}</span>
                        <span class="ach-desc">{unlocked ? ach.description : (ach.hidden ? 'Secret achievement' : ach.description)}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#each Object.entries($achievements.per_game) as [gameId, gameAchs]}
                {@const game = $games.find((g: any) => g.id === gameId)}
                <div class="ach-section">
                  <h3 class="ach-section-title">
                    <span class="section-dot" style="background: {game?.planetColor || '#666'}"></span>
                    {game?.title || gameId}
                  </h3>
                  <div class="ach-grid">
                    {#each gameAchs as ach}
                      {@const unlocked = $achievements.unlocked.includes('game:' + gameId + ':' + ach.id)}
                      <div class="ach-card" class:locked={!unlocked} class:hidden={ach.hidden && !unlocked} title={unlocked ? ach.description : ach.hidden ? '???' : ach.description}>
                        <div class="ach-icon" class:unlocked>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={iconMap[ach.icon] || iconMap.star} /></svg>
                        </div>
                        <span class="ach-title">{unlocked ? ach.title : (ach.hidden ? '???' : ach.title)}</span>
                        <span class="ach-desc">{unlocked ? ach.description : (ach.hidden ? 'Secret achievement' : ach.description)}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            {:else}
              <p class="empty">Loading achievements...</p>
            {/if}
          </div>
        {/if}

        <!-- Leaderboards Tab -->
        {#if activeTab === 'leaderboards'}
          <div class="tab-content" in:fade>
            <div class="lb-controls">
              <select class="lb-select" bind:value={selectedLbGame} onchange={() => { if (selectedLbGame) switchLbGame(selectedLbGame); }}>
                {#each lbGames as g}
                  <option value={g.id}>{g.title}</option>
                {/each}
              </select>
              <div class="lb-view-toggle">
                <button class="lb-view-btn" class:active={lbView === 'best'} onclick={() => switchLbView('best')}>Best</button>
                <button class="lb-view-btn" class:active={lbView === 'latest'} onclick={() => switchLbView('latest')}>Latest</button>
              </div>
            </div>

            {#if currentLb}
              <div class="lb-table">
                {#if currentLb.user_entry}
                  <div class="lb-user-row">
                    <span class="lb-rank">#{currentLb.user_rank || '—'}</span>
                    <span class="lb-name">{currentLb.user_entry.username}</span>
                    <span class="lb-score">{JSON.stringify(currentLb.user_entry.score_data)}</span>
                  </div>
                {/if}
                {#each currentLb.entries as entry}
                  <div class="lb-row" class:is-self={currentLb.user_entry?.username === entry.username}>
                    <span class="lb-rank">#{entry.rank}</span>
                    <span class="lb-name">{entry.username}</span>
                    <span class="lb-score">{JSON.stringify(entry.score_data)}</span>
                    <span class="lb-date">{new Date(entry.submitted_at).toLocaleDateString()}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="empty">Select a game to view its leaderboard.</p>
            {/if}
          </div>
        {/if}
      </main>
    {:else}
      <main class="loading-page"><p>Loading profile...</p></main>
    {/if}
  </div>
{/if}

{#if mounted && !$isAuthenticated}
  <div class="page"><main class="loading-page"><p>Not signed in. Redirecting...</p></main></div>
{/if}

<style>
  .page { position: fixed; inset: 0; z-index: 5; display: flex; flex-direction: column; background: var(--bg-deepest); overflow: auto; }
  .page-bg { position: fixed; inset: 0; overflow: hidden; z-index: 0; }
  .starfield { position: absolute; inset: 0; background: radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8) 0%, transparent 100%), radial-gradient(1px 1px at 30% 70%, rgba(255,255,255,0.6) 0%, transparent 100%), radial-gradient(1px 1px at 50% 10%, rgba(255,255,255,0.7) 0%, transparent 100%), radial-gradient(1px 1px at 70% 40%, rgba(255,255,255,0.5) 0%, transparent 100%), radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.6) 0%, transparent 100%); animation: twinkle 4s ease-in-out infinite alternate; }
  .nebula { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.25; animation: nebulaPulse 8s ease-in-out infinite alternate; }
  .nebula-1 { width: 500px; height: 500px; top: -150px; left: -100px; background: radial-gradient(circle, rgba(232,168,56,0.3) 0%, transparent 70%); }
  .nebula-2 { width: 400px; height: 400px; bottom: -100px; right: -80px; background: radial-gradient(circle, rgba(56,200,232,0.25) 0%, transparent 70%); animation-delay: 3s; }

  .top-nav { position: relative; z-index: 10; padding: var(--space-md) var(--space-lg); border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(8,8,24,0.92); display: flex; justify-content: space-between; align-items: center; }
  .back-btn { display: inline-flex; align-items: center; gap: 8px; background: none; border: 1px solid rgba(255,255,255,0.08); color: var(--text-secondary); padding: clamp(6px,0.4vw,8px) clamp(12px,0.8vw,18px); border-radius: var(--radius-sm); font-size: var(--fs-xs); font-weight: 500; font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; transition: all 0.15s var(--ease-out); }
  .back-btn:hover { border-color: var(--border-hover); color: var(--text); background: rgba(255,255,255,0.03); }
  .signout-btn { background: rgba(232,80,80,0.08); border: 1px solid var(--error-border); color: var(--error); padding: clamp(6px,0.4vw,8px) clamp(12px,0.8vw,18px); border-radius: var(--radius-sm); font-size: var(--fs-xs); font-weight: 600; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; }
  .signout-btn:hover { background: rgba(232,80,80,0.14); border-color: var(--error); }

  .profile-content { position: relative; z-index: 10; flex: 1; max-width: 720px; width: 100%; margin: 0 auto; padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md); }
  .loading-page { position: relative; z-index: 10; flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }

  .profile-header { display: flex; align-items: center; gap: var(--space-lg); }
  .avatar-ring { padding: 3px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--cyan)); flex-shrink: 0; }
  .avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--bg-lower); display: flex; align-items: center; justify-content: center; font-size: var(--fs-xl); font-weight: 800; color: var(--accent); }
  .header-info { display: flex; flex-direction: column; gap: 4px; }
  h1 { font-size: var(--fs-xl); font-weight: 700; color: var(--text); }
  .member-since { font-size: var(--fs-xs); color: var(--text-muted); }

  .profile-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); }
  .tab-btn { padding: var(--space-sm) var(--space-md); border: none; background: transparent; color: var(--text-muted); font-size: var(--fs-sm); font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; font-family: 'DM Sans', system-ui, sans-serif; transition: color 0.15s, border-color 0.15s; }
  .tab-btn:hover { color: var(--text-secondary); }
  .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

  .tab-content { min-height: 200px; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: var(--space-sm); }
  .stat-card { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-md); text-align: center; background: rgba(255,255,255,0.02); }
  .stat-num { font-size: var(--fs-xl); font-weight: 800; color: var(--text); display: block; }
  .stat-denom { font-size: var(--fs-sm); color: var(--text-muted); font-weight: 400; }
  .stat-lbl { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; display: block; }

  /* Achievements */
  .ach-section { margin-bottom: var(--space-lg); }
  .ach-section-title { font-size: var(--fs-sm); font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: var(--space-sm); display: flex; align-items: center; gap: 8px; }
  .section-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-sm); }
  .ach-card { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-sm) var(--space-md); display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.02); }
  .ach-card.locked { opacity: 0.45; }
  .ach-card.hidden { opacity: 0.3; filter: blur(1px); }
  .ach-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(232,168,56,0.1); display: flex; align-items: center; justify-content: center; color: var(--accent); margin-bottom: 4px; }
  .ach-icon.unlocked { background: rgba(232,168,56,0.15); box-shadow: 0 0 12px rgba(232,168,56,0.15); }
  .ach-card.locked .ach-icon { background: rgba(255,255,255,0.03); color: var(--text-muted); }
  .ach-title { font-size: var(--fs-xs); font-weight: 600; color: var(--text); }
  .ach-desc { font-size: 10px; color: var(--text-muted); line-height: 1.3; }
  .ach-card.locked .ach-title { color: var(--text-muted); }
  .ach-card.locked .ach-desc { color: var(--text-muted); }

  /* Leaderboards */
  .lb-controls { display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap; }
  .lb-select { flex: 1; min-width: 140px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-input); color: var(--text); font-size: var(--fs-xs); font-family: 'DM Sans', system-ui, sans-serif; cursor: pointer; }
  .lb-view-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius-xs); overflow: hidden; }
  .lb-view-btn { padding: 6px 14px; border: none; background: transparent; color: var(--text-muted); font-size: 10px; font-weight: 600; text-transform: uppercase; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; letter-spacing: 0.5px; }
  .lb-view-btn.active { background: var(--accent); color: var(--bg-deepest); }

  .lb-table { display: flex; flex-direction: column; gap: 2px; margin-top: var(--space-sm); }
  .lb-row, .lb-user-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-xs); font-size: var(--fs-xs); }
  .lb-row { background: rgba(255,255,255,0.02); }
  .lb-row.is-self { background: rgba(232,168,56,0.06); border: 1px solid rgba(232,168,56,0.1); }
  .lb-user-row { background: rgba(232,168,56,0.08); border: 1px solid rgba(232,168,56,0.15); margin-bottom: var(--space-xs); font-weight: 600; }
  .lb-rank { min-width: 30px; color: var(--text-muted); font-weight: 700; }
  .lb-name { flex: 1; color: var(--text-secondary); }
  .lb-score { color: var(--accent); font-family: monospace; font-size: 10px; }
  .lb-date { color: var(--text-muted); font-size: 10px; min-width: 60px; text-align: right; }

  .empty { text-align: center; color: var(--text-muted); font-size: var(--fs-sm); padding: var(--space-xl); }

  @keyframes twinkle { 0% { opacity: 0.5; } 100% { opacity: 1; } }
  @keyframes nebulaPulse { 0% { opacity: 0.15; transform: scale(1); } 100% { opacity: 0.3; transform: scale(1.1); } }
</style>
