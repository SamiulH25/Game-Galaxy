import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileResponse, resolveInside } from '$lib/server/files';
import { RateLimiter } from '$lib/server/rate-limit';
import { tempGames } from './helpers';

describe('resolveInside', () => {
	const root = tempGames({ 'g/index.html': '<p>hi</p>', 'g/a/b.js': '1', 'g/.secret': 's', 'outside.txt': 'nope' });
	const game = path.join(root, 'g');
	fs.symlinkSync(path.join(root, 'outside.txt'), path.join(game, 'link.txt'));

	it('serves files inside the folder', () => {
		expect(resolveInside(game, 'index.html')).toBe(fs.realpathSync(path.join(game, 'index.html')));
		expect(resolveInside(game, 'a/b.js')).not.toBeNull();
	});

	it('refuses traversal, hidden files, directories and escaping symlinks', () => {
		for (const bad of ['../outside.txt', 'a/../../outside.txt', '.secret', 'a', '', 'a//b.js', 'a\\b.js', 'link.txt']) {
			expect(resolveInside(game, bad), bad).toBeNull();
		}
	});

	it('sandboxes HTML and supports ranges and revalidation', async () => {
		const file = resolveInside(game, 'index.html')!;
		const res = fileResponse(file, new Request('http://x/g/g/index.html'));
		expect(res.headers.get('content-security-policy')).toContain('sandbox');
		expect(await res.text()).toBe('<p>hi</p>');
		const etag = res.headers.get('etag')!;
		expect(fileResponse(file, new Request('http://x', { headers: { 'if-none-match': etag } })).status).toBe(304);
		const part = fileResponse(file, new Request('http://x', { headers: { range: 'bytes=3-4' } }));
		expect(part.status).toBe(206);
		expect(await part.text()).toBe('hi');
		expect(fileResponse(file, new Request('http://x', { headers: { range: 'bytes=99-' } })).status).toBe(416);
	});
});

describe('RateLimiter', () => {
	it('allows up to the limit per window', () => {
		const rl = new RateLimiter(2, 1000);
		expect(rl.take('k', 0)).toBe(true);
		expect(rl.take('k', 10)).toBe(true);
		expect(rl.take('k', 20)).toBe(false);
		expect(rl.take('other', 20)).toBe(true);
		expect(rl.take('k', 1001)).toBe(true);
	});
});
