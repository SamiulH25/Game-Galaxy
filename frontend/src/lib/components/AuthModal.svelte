<script lang="ts">
  import { showAuth } from '$lib/stores/galaxy';
  import { loginUser, registerUser } from '$lib/stores/auth';
  import { parseApiError } from '$lib/api';
  import { fly, fade } from 'svelte/transition';
  import { play } from '$lib/audio';
  import { lockBodyScroll } from '$lib/stores/viewport';
  import { trapFocus } from '$lib/utils/focusTrap';

  let authCardEl = $state<HTMLElement | null>(null);

  let isLogin = $state(true);
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let submitting = $state(false);

  function close() { showAuth.set(false); reset(); play('cancel'); }
  function reset() { username = ''; password = ''; error = ''; }
  function toggleMode() { isLogin = !isLogin; error = ''; play('click'); }

  async function handleSubmit() {
    if (submitting) return;
    error = '';
    play('select');
    submitting = true;
    try {
      if (isLogin) { await loginUser(username, password); }
      else { await registerUser(username, password); }
      play('success');
      close();
    } catch (err: unknown) {
      error = parseApiError(err);
      play('error');
    } finally {
      submitting = false;
      password = '';
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  function onBackdropClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target === e.currentTarget || target.classList.contains('auth-backdrop'))) {
      close();
    }
  }

  $effect(() => {
    if (!$showAuth) return;
    const unlock = lockBodyScroll();
    return unlock;
  });

  $effect(() => {
    if (!$showAuth || !authCardEl) return;
    return trapFocus(authCardEl);
  });
</script>

<svelte:window onkeydown={onKeydown} />

{#if $showAuth}
  <div class="auth-overlay" role="dialog" aria-modal="true" tabindex="-1" transition:fade={{ duration: 200 }} onclick={onBackdropClick} onkeydown={(e) => e.key === 'Escape' && close()}>
    <div class="auth-backdrop"></div>
    <div class="auth-card" bind:this={authCardEl}>
      <div class="auth-accent-line"></div>
      <div class="auth-header">
        <h2>{isLogin ? 'Log In' : 'Create Account'}</h2>
        <p class="auth-subtitle">{isLogin ? 'Sign in to save your progress across games.' : 'Create an account to save your progress.'}</p>
      </div>
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="auth-field">
          <label for="auth-username">Username</label>
          <input id="auth-username" bind:value={username} type="text" placeholder="Enter username" autocomplete="username" required minlength={3} maxlength={32} />
        </div>
        <div class="auth-field">
          <label for="auth-password">Password</label>
          <input id="auth-password" bind:value={password} type="password" placeholder="Enter password" autocomplete="current-password" required minlength={6} />
        </div>
        {#if error}
          <div class="auth-error" role="alert">{error}</div>
        {/if}
        <button type="submit" class="auth-submit" disabled={submitting}>
          {#if submitting}
            <span class="auth-spinner"></span>
            {isLogin ? 'Signing in…' : 'Creating…'}
          {:else}
            {isLogin ? 'Log In' : 'Create Account'}
          {/if}
        </button>
      </form>
      <p class="auth-toggle">
        <span>{isLogin ? "Don't have an account?" : 'Already have an account?'}</span>
        <button type="button" class="link-btn" onclick={toggleMode}>{isLogin ? 'Create one' : 'Log in'}</button>
      </p>
      <button class="auth-close" onclick={close} aria-label="Close auth dialog">✕</button>
    </div>
  </div>
{/if}

<style>
  .auth-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 150; }
  .auth-backdrop { position: absolute; inset: 0; background: rgba(4,4,18,0.88); backdrop-filter: blur(4px); animation: fadeIn 0.25s var(--ease-out) both; }
  .auth-card { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 0; max-width: min(380px, 90vw); width: 100%; box-shadow: var(--shadow-lg), var(--shadow-glow); overflow: hidden; }
  .auth-accent-line { height: 2px; background: linear-gradient(90deg, var(--accent), var(--accent-dim), transparent); }
  .auth-header { padding: var(--space-lg) var(--space-lg) 0; }
  h2 { font-size: var(--fs-lg); font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .auth-subtitle { font-size: var(--fs-sm); color: var(--text-muted); margin-bottom: var(--space-lg); }
  .auth-field { padding: 0 var(--space-lg); margin-bottom: var(--space-md); }
  .auth-field label { display: block; font-size: var(--fs-xs); color: var(--text-muted); margin-bottom: var(--space-xs); text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; }
  .auth-field input { width: 100%; padding: clamp(8px, 0.7vw, 11px) clamp(10px, 0.8vw, 14px); border-radius: var(--radius-sm); background: var(--surface-input); border: 1px solid var(--border); color: var(--text); font-size: var(--fs-base); font-family: 'DM Sans', system-ui, sans-serif; outline: none; min-height: 40px; transition: border-color 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out); }
  .auth-field input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
  .auth-field input::placeholder { color: var(--text-muted); }
  .auth-error { margin: 0 var(--space-lg) var(--space-md); background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); font-size: var(--fs-xs); animation: shakeIn 0.3s var(--ease-out); }
  @keyframes shakeIn { 0% { opacity: 0; transform: translateX(-8px); } 60% { transform: translateX(4px); } 100% { opacity: 1; transform: translateX(0); } }
  .auth-submit { margin: 0 var(--space-lg) var(--space-md); width: calc(100% - var(--space-lg) * 2); padding: clamp(8px, 0.7vw, 11px); background: var(--accent); color: var(--bg-deepest); border: none; border-radius: var(--radius-sm); font-size: var(--fs-sm); font-weight: 700; cursor: pointer; font-family: 'DM Sans', system-ui, sans-serif; min-height: 44px; transition: background 0.15s var(--ease-out), box-shadow 0.15s var(--ease-out); display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .auth-submit:hover:not(:disabled) { background: #f0b848; box-shadow: 0 4px 20px rgba(232,168,56,0.3); }
  .auth-submit:disabled { opacity: 0.75; cursor: wait; }
  .auth-spinner { width: 14px; height: 14px; border: 2px solid rgba(4,4,18,0.2); border-top-color: var(--bg-deepest); border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .auth-toggle { text-align: center; font-size: var(--fs-xs); color: var(--text-muted); padding: 0 var(--space-lg) var(--space-lg); }
  .link-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: var(--fs-xs); font-family: 'DM Sans', system-ui, sans-serif; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; transition: color 0.15s var(--ease-out); }
  .link-btn:hover { color: #f0b848; }
  .auth-close { position: absolute; top: var(--space-md); right: var(--space-md); background: none; border: none; color: var(--text-muted); font-size: var(--fs-md); cursor: pointer; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; transition: color 0.15s var(--ease-out); }
  .auth-close:hover { color: var(--text-secondary); }
  
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes authEnter { from { opacity: 0; transform: translateY(12px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
</style>
