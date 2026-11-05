/** Fixed-window in-memory rate limiter. Good enough for a single-process deployment. */
export class RateLimiter {
	private hits = new Map<string, { count: number; resetAt: number }>();
	private lastSweep = 0;

	constructor(
		private readonly limit: number,
		private readonly windowMs: number
	) {}

	/** Returns true if the action is allowed (and counts it). */
	take(key: string, now = Date.now()): boolean {
		this.sweep(now);
		const entry = this.hits.get(key);
		if (!entry || entry.resetAt <= now) {
			this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
			return true;
		}
		if (entry.count >= this.limit) return false;
		entry.count++;
		return true;
	}

	private sweep(now: number) {
		if (now - this.lastSweep < this.windowMs) return;
		this.lastSweep = now;
		for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
	}
}
