import { browser } from '$app/environment';

type Motion = 'system' | 'reduced' | 'full';
type Graphics = 'auto' | 'high' | 'low';
const KEY = 'galaxy:settings:v1';

/** Per-browser preferences. Nothing here needs an account. */
class Settings {
	muted = $state(false);
	motion = $state<Motion>('system');
	graphics = $state<Graphics>('auto');
	private systemReduced = $state(false);
	private lowPower = $state(false);

	constructor() {
		if (!browser) return;
		try {
			const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
			if (typeof saved.muted === 'boolean') this.muted = saved.muted;
			if (['system', 'reduced', 'full'].includes(saved.motion)) this.motion = saved.motion;
			if (['auto', 'high', 'low'].includes(saved.graphics)) this.graphics = saved.graphics;
		} catch {
			/* storage blocked or corrupt: keep defaults */
		}
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		this.systemReduced = mq.matches;
		mq.addEventListener('change', (e) => (this.systemReduced = e.matches));
		const coarse = matchMedia('(pointer: coarse)').matches;
		const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
		this.lowPower = coarse || memory < 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
	}

	get reducedMotion(): boolean {
		return this.motion === 'reduced' || (this.motion === 'system' && this.systemReduced);
	}

	get quality(): 'high' | 'low' {
		if (this.graphics !== 'auto') return this.graphics;
		return this.lowPower ? 'low' : 'high';
	}

	save(): void {
		try {
			localStorage.setItem(KEY, JSON.stringify({ muted: this.muted, motion: this.motion, graphics: this.graphics }));
		} catch {
			/* ignore */
		}
	}
}

export const settings = new Settings();
