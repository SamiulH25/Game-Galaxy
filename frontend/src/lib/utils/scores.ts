/** Format leaderboard score_data for display. */
export function formatScoreData(data: unknown): string {
  if (data == null) return '—';
  if (typeof data === 'number') return data.toLocaleString();
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.score === 'number') return obj.score.toLocaleString();
    if (typeof obj.time === 'number') return `${obj.time}s`;
    if (typeof obj.waves === 'number') return `${obj.waves} waves`;
    const vals = Object.values(obj).filter((v) => typeof v === 'number') as number[];
    if (vals.length === 1) return vals[0].toLocaleString();
    if (vals.length > 1) return vals.map((v) => v.toLocaleString()).join(' · ');
    try {
      const s = JSON.stringify(data);
      return s.length > 24 ? s.slice(0, 21) + '…' : s;
    } catch {
      return '—';
    }
  }
  return String(data);
}
