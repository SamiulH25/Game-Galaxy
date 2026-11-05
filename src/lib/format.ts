import type { Scoring } from '$lib/types';

const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatScore(score: number, scoring: Scoring | null): string {
	if (scoring?.format === 'time') {
		const total = Math.max(0, score);
		const m = Math.floor(total / 60);
		const s = total - m * 60;
		return `${m}:${s.toFixed(2).padStart(5, '0')}`;
	}
	return numberFmt.format(score);
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 31536000],
	['month', 2592000],
	['week', 604800],
	['day', 86400],
	['hour', 3600],
	['minute', 60]
];

export function relativeTime(ts: number, now = Date.now()): string {
	const diff = (ts - now) / 1000;
	for (const [unit, secs] of UNITS) {
		if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
	}
	return 'just now';
}

export function plural(n: number, one: string, many = `${one}s`): string {
	return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}
