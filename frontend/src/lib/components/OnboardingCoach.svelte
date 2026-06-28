<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { showOnboardingCoach, dismissOnboarding } from '$lib/stores/galaxy';
  import { settings } from '$lib/stores/settings';
  import { play } from '$lib/audio';

  let motionReduced = $derived($settings.reduceMotion);

  const steps = [
    { num: 1, text: 'Click a planet to preview' },
    { num: 2, text: 'Launch to play instantly' },
    { num: 3, text: 'Sign in anytime to sync saves' },
  ];

  function skip() {
    play('click');
    dismissOnboarding();
  }
</script>

{#if $showOnboardingCoach}
  <div class="coach-bar" transition:fly={{ y: motionReduced ? 0 : 24, duration: motionReduced ? 0 : 400, easing: (t) => 1 - Math.pow(1 - t, 3) }}>
    <div class="coach-inner">
      <div class="coach-steps">
        {#each steps as step, i}
          <div class="coach-step" in:fade={{ delay: motionReduced ? 0 : i * 80, duration: motionReduced ? 0 : 300 }}>
            <span class="step-num">{step.num}</span>
            <span class="step-text">{step.text}</span>
          </div>
          {#if i < steps.length - 1}
            <span class="step-arrow" aria-hidden="true">→</span>
          {/if}
        {/each}
      </div>
      <button class="coach-dismiss" onclick={skip}>Got it</button>
    </div>
  </div>
{/if}

<style>
  .coach-bar {
    position: fixed;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    z-index: 90;
    width: min(720px, calc(100vw - 2 * var(--space-lg)));
  }

  .coach-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    background: rgba(8, 8, 28, 0.88);
    border: 1px solid rgba(232, 168, 56, 0.2);
    border-radius: var(--radius-md);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(232, 168, 56, 0.06);
  }

  .coach-steps {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-xs);
    flex: 1;
    min-width: 0;
  }

  .coach-step {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .step-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(232, 168, 56, 0.15);
    border: 1px solid rgba(232, 168, 56, 0.3);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step-text {
    font-size: var(--fs-xs);
    color: var(--text-secondary);
    font-weight: 500;
    white-space: nowrap;
  }

  .step-arrow {
    color: var(--text-muted);
    font-size: var(--fs-xs);
    opacity: 0.5;
    padding: 0 2px;
  }

  .coach-dismiss {
    flex-shrink: 0;
    padding: 8px 16px;
    background: rgba(232, 168, 56, 0.12);
    border: 1px solid rgba(232, 168, 56, 0.25);
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-size: var(--fs-xs);
    font-weight: 700;
    font-family: 'DM Sans', system-ui, sans-serif;
    cursor: pointer;
    transition: background 0.15s var(--ease-out);
    min-height: 36px;
  }

  .coach-dismiss:hover {
    background: rgba(232, 168, 56, 0.2);
  }

  @media (max-width: 640px) {
    .coach-bar {
      bottom: var(--space-md);
      width: calc(100vw - 2 * var(--space-md));
    }

    .coach-inner {
      flex-direction: column;
      align-items: stretch;
    }

    .coach-steps {
      flex-direction: column;
      align-items: flex-start;
    }

    .step-arrow {
      display: none;
    }

    .coach-dismiss {
      width: 100%;
    }
  }
</style>
