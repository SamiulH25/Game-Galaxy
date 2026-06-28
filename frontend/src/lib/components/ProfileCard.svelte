<script lang="ts">
  import { isAuthenticated, user } from '$lib/stores/auth';
  import { showAuth } from '$lib/stores/galaxy';
  import { profile, profileStats, recentAchievements, loadProfile, loadAchievements } from '$lib/stores/social';
  import { goto } from '$app/navigation';
  import { play } from '$lib/audio';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  onMount(() => {
    loadProfile();
  });

  function goToProfile() {
    play('select');
    goto('/account');
  }

  const iconMap: Record<string, string> = {
    rocket: 'M4 16l4.5-4.5M19 5l-4 4M5 19l3-3M15 9l-3 3M12 12l4-4M4 20l4-4M12 2v4M17 7l3 3',
    compass: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm3-11l-4 2-2 4 4-2 2-4z',
    galaxy: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    floppy: 'M19 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-4-4zm-7 16a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm3-10H6V4h9v4z',
    leaderboard: 'M3 21h18M3 10h4v11H3zM10 7h4v14h-4zM17 3h4v18h-4z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  };
</script>

{#if !$isAuthenticated}
  <div class="card card-login" transition:fade>
    <div class="card-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
    </div>
    <div class="card-text">
      <span class="card-title">Log In</span>
      <span class="card-desc">Sign in to track achievements and scores</span>
    </div>
    <button class="card-btn" onclick={() => { play('click'); showAuth.set(true); }}>Sign In</button>
  </div>
{:else}
  <div class="card" transition:fade>
    {#if $profile}
      <div class="profile-head">
        <div class="avatar">{$profile.user.username?.charAt(0).toUpperCase() || 'U'}</div>
        <div class="profile-info">
          <span class="username">{$profile.user.username}</span>
          <span class="joined">Joined {new Date($profile.user.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat">
          <span class="stat-val">{$profileStats?.games_played || 0}</span>
          <span class="stat-label">Played</span>
        </div>
        <div class="stat">
          <span class="stat-val">{$profileStats?.achievements_unlocked || 0}<span class="stat-total">/{$profileStats?.total_achievements || 0}</span></span>
          <span class="stat-label">Achievements</span>
        </div>
        <div class="stat">
          <span class="stat-val">{$profileStats?.total_saves || 0}</span>
          <span class="stat-label">Saves</span>
        </div>
      </div>

      {#if $recentAchievements.length > 0}
        <div class="recent-achs">
          <span class="recent-label">Recent Achievements</span>
          <div class="ach-mini-list">
            {#each $recentAchievements.slice(0, 3) as ach}
              <div class="ach-mini" title={ach.title}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d={iconMap[ach.icon] || iconMap.star} />
                </svg>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <button class="view-btn" onclick={goToProfile}>View Full Profile</button>
    {:else}
      <div class="loading">Loading...</div>
    {/if}
  </div>
{/if}

<style>
  .card {
    padding: var(--space-md);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .card-login {
    align-items: center;
    text-align: center;
    gap: var(--space-xs);
    padding: var(--space-lg) var(--space-md);
  }
  .card-icon { color: var(--text-muted); }
  .card-text { display: flex; flex-direction: column; gap: 2px; }
  .card-title { font-size: var(--fs-sm); font-weight: 600; color: var(--text); }
  .card-desc { font-size: 10px; color: var(--text-muted); }
  .card-btn {
    margin-top: var(--space-xs);
    padding: 6px 18px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-accent);
    background: rgba(232,168,56,0.08);
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .card-btn:hover { background: rgba(232,168,56,0.15); }

  .profile-head { display: flex; align-items: center; gap: var(--space-sm); }
  .avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--accent); color: var(--bg-deepest);
    display: flex; align-items: center; justify-content: center;
    font-size: var(--fs-sm); font-weight: 700;
    flex-shrink: 0;
  }
  .profile-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .username { font-size: var(--fs-sm); font-weight: 600; color: var(--text); }
  .joined { font-size: 10px; color: var(--text-muted); }

  .stats-row { display: flex; gap: var(--space-sm); }
  .stat {
    flex: 1;
    display: flex; flex-direction: column; align-items: center;
    padding: var(--space-xs) 0;
    background: rgba(255,255,255,0.02);
    border-radius: var(--radius-xs);
  }
  .stat-val { font-size: var(--fs-md); font-weight: 700; color: var(--text); }
  .stat-total { font-size: 10px; color: var(--text-muted); font-weight: 400; }
  .stat-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }

  .recent-achs { display: flex; flex-direction: column; gap: 4px; }
  .recent-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
  .ach-mini-list { display: flex; gap: 4px; }
  .ach-mini {
    width: 24px; height: 24px; border-radius: 50%;
    background: rgba(232,168,56,0.1);
    display: flex; align-items: center; justify-content: center;
    color: var(--accent);
  }

  .view-btn {
    width: 100%;
    padding: 6px;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    cursor: pointer;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: color 0.15s, border-color 0.15s;
  }
  .view-btn:hover { color: var(--text-secondary); border-color: var(--border-hover); }

  .loading { text-align: center; color: var(--text-muted); font-size: var(--fs-xs); padding: var(--space-md); }
</style>
