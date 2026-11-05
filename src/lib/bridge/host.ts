import { api } from '$lib/api';
import type { Achievement, GameInfo, PublicUser, ScoreResult } from '$lib/types';
import { guestStore } from './guest-store';

/** Must match PROTOCOL in static/sdk/galaxy.js. */
export const PROTOCOL = 'galaxy/1';

export interface HostSettings {
	muted: boolean;
	reducedMotion: boolean;
}

export interface HostCallbacks {
	onReady?: () => void;
	onSave?: (state: 'saving' | 'saved' | 'error', detail: { cloud: boolean; message?: string }) => void;
	onScore?: (result: ScoreResult & { score: number; cloud: boolean }) => void;
	onAchievement?: (achievement: Achievement) => void;
	onError?: (message: string) => void;
}

interface Request {
	protocol: string;
	type: 'request';
	id: number;
	method: string;
	params: Record<string, unknown>;
}

function isRequest(data: unknown): data is Request {
	const m = data as Request;
	return !!m && m.protocol === PROTOCOL && m.type === 'request' && typeof m.id === 'number' && typeof m.method === 'string';
}

/**
 * The shell side of the SDK. Answers requests from one sandboxed game iframe,
 * storing progress through the API for signed-in players and in localStorage for guests.
 */
export class GameHost {
	private saveQueue: { data: unknown; waiters: { resolve: (v: unknown) => void; reject: (e: unknown) => void }[] } | null = null;
	private flushing = false;
	private readonly listener = (e: MessageEvent) => void this.onMessage(e);

	constructor(
		private readonly iframe: HTMLIFrameElement,
		private readonly game: GameInfo,
		private readonly getUser: () => PublicUser | null,
		private readonly getSettings: () => HostSettings,
		private readonly cb: HostCallbacks = {}
	) {
		window.addEventListener('message', this.listener);
	}

	destroy(): void {
		window.removeEventListener('message', this.listener);
	}

	/** Push an event ('pause' | 'resume' | 'settings') into the game. */
	emit(name: string, data?: unknown): void {
		this.iframe.contentWindow?.postMessage({ protocol: PROTOCOL, type: 'event', name, data }, '*');
	}

	private reply(id: number, ok: boolean, payload: unknown) {
		// The game runs in an opaque (sandboxed) origin, so '*' is the only usable target;
		// we always address this game's own window.
		this.iframe.contentWindow?.postMessage(
			ok ? { protocol: PROTOCOL, type: 'response', id, ok: true, result: payload } : { protocol: PROTOCOL, type: 'response', id, ok: false, error: String(payload) },
			'*'
		);
	}

	private async onMessage(event: MessageEvent) {
		if (event.source !== this.iframe.contentWindow || !isRequest(event.data)) return;
		const { id, method } = event.data;
		const params = event.data.params && typeof event.data.params === 'object' ? event.data.params : {};
		try {
			this.reply(id, true, await this.handle(method, params));
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.reply(id, false, message);
		}
	}

	private base() {
		return `/api/games/${encodeURIComponent(this.game.id)}`;
	}

	private async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
		const user = this.getUser();
		switch (method) {
			case 'ready': {
				this.cb.onReady?.();
				return {
					gameId: this.game.id,
					standalone: false,
					player: user ? { name: user.username, guest: false } : { name: 'Guest', guest: true },
					settings: this.getSettings()
				};
			}

			case 'save.load': {
				if (user) return (await api<{ data: unknown }>(`${this.base()}/save`)).data ?? null;
				return guestStore.get(this.game.id).save ?? null;
			}

			case 'save.write':
				return this.enqueueSave(params.data ?? null);

			case 'save.clear': {
				if (user) await api(`${this.base()}/save`, { method: 'DELETE' });
				else guestStore.update(this.game.id, ({ save: _s, savedAt: _t, ...rest }) => rest);
				return { ok: true };
			}

			case 'score.submit': {
				const score = params.score;
				if (typeof score !== 'number' || !Number.isFinite(score)) throw new Error('score must be a finite number');
				if (!this.game.scoring) throw new Error('This game has no leaderboard — add "scoring" to game.json');
				let result: ScoreResult;
				if (user) {
					result = await api<ScoreResult>(`${this.base()}/scores`, { method: 'POST', body: { score } });
				} else {
					const order = this.game.scoring.order;
					const prev = guestStore.get(this.game.id).best;
					const personalBest = prev === undefined || (order === 'desc' ? score > prev : score < prev);
					const best = personalBest ? score : prev!;
					guestStore.update(this.game.id, (g) => ({ ...g, best }));
					result = { best, personalBest, rank: null };
				}
				this.cb.onScore?.({ ...result, score, cloud: !!user });
				return { ...result, cloud: !!user };
			}

			case 'achievement.unlock': {
				const achievement = this.game.achievements.find((a) => a.id === params.id);
				if (!achievement) throw new Error(`Unknown achievement "${String(params.id)}" — declare it in game.json`);
				let isNew: boolean;
				if (user) {
					isNew = (await api<{ new: boolean }>(`${this.base()}/achievements`, { method: 'POST', body: { id: achievement.id } })).new;
				} else {
					const have = guestStore.get(this.game.id).achievements ?? [];
					isNew = !have.includes(achievement.id);
					if (isNew) guestStore.update(this.game.id, (g) => ({ ...g, achievements: [...have, achievement.id] }));
				}
				if (isNew) this.cb.onAchievement?.(achievement);
				return { new: isNew };
			}

			case 'achievement.list': {
				if (user) return (await api<{ unlocked: { id: string }[] }>(`${this.base()}/achievements`)).unlocked.map((a) => a.id);
				return guestStore.get(this.game.id).achievements ?? [];
			}

			default:
				throw new Error(`Unknown Galaxy method "${method}"`);
		}
	}

	/** Coalesce rapid saves: only the newest value is written, but every caller gets an answer. */
	private enqueueSave(data: unknown): Promise<unknown> {
		return new Promise((resolve, reject) => {
			if (this.saveQueue) {
				this.saveQueue.data = data;
				this.saveQueue.waiters.push({ resolve, reject });
			} else {
				this.saveQueue = { data, waiters: [{ resolve, reject }] };
			}
			void this.flushSaves();
		});
	}

	private async flushSaves() {
		if (this.flushing) return;
		this.flushing = true;
		while (this.saveQueue) {
			const job = this.saveQueue;
			this.saveQueue = null;
			const cloud = !!this.getUser();
			this.cb.onSave?.('saving', { cloud });
			try {
				let savedAt: number;
				if (cloud) {
					savedAt = (await api<{ updatedAt: number }>(`${this.base()}/save`, { method: 'PUT', body: { data: job.data } })).updatedAt;
				} else {
					if (JSON.stringify(job.data).length > 256 * 1024) throw new Error('Save data must be under 256 KB');
					savedAt = Date.now();
					guestStore.update(this.game.id, (g) => ({ ...g, save: job.data, savedAt }));
				}
				this.cb.onSave?.('saved', { cloud });
				job.waiters.forEach((w) => w.resolve({ savedAt, cloud }));
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				this.cb.onSave?.('error', { cloud, message });
				job.waiters.forEach((w) => w.reject(err));
			}
		}
		this.flushing = false;
	}
}
