import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

const MIME: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.htm': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.map': 'application/json; charset=utf-8',
	'.txt': 'text/plain; charset=utf-8',
	'.xml': 'application/xml',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.ico': 'image/x-icon',
	'.wav': 'audio/wav',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.oga': 'audio/ogg',
	'.m4a': 'audio/mp4',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.wasm': 'application/wasm',
	'.pck': 'application/octet-stream',
	'.glb': 'model/gltf-binary',
	'.gltf': 'model/gltf+json',
	'.bin': 'application/octet-stream'
};

export function contentType(file: string): string {
	return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Resolve `relPath` inside `root`, refusing traversal, hidden segments and symlinks that escape the root.
 * Returns the real path of an existing regular file, or null.
 */
export function resolveInside(root: string, relPath: string): string | null {
	if (!relPath || relPath.length > 512 || relPath.includes('\0') || relPath.includes('\\')) return null;
	const segments = relPath.split('/');
	if (segments.some((s) => s === '' || s === '.' || s === '..' || s.startsWith('.'))) return null;
	let realRoot: string;
	let real: string;
	try {
		realRoot = fs.realpathSync(root);
		real = fs.realpathSync(path.join(root, ...segments));
	} catch {
		return null;
	}
	if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return null;
	try {
		return fs.statSync(real).isFile() ? real : null;
	} catch {
		return null;
	}
}

/**
 * HTML documents of a game are sandboxed by CSP as well as by the iframe attribute,
 * so a game opened directly in a tab still runs in an opaque origin without the player's cookies.
 */
const GAME_DOCUMENT_CSP = 'sandbox allow-scripts allow-pointer-lock allow-downloads';

/** Build a static-file response with ETag revalidation and single-range support. */
export function fileResponse(file: string, request: Request): Response {
	const stat = fs.statSync(file);
	const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
	const type = contentType(file);
	const headers = new Headers({
		'content-type': type,
		etag,
		'cache-control': 'no-cache',
		'accept-ranges': 'bytes',
		'access-control-allow-origin': '*',
		'x-content-type-options': 'nosniff'
	});
	if (type.startsWith('text/html')) headers.set('content-security-policy', GAME_DOCUMENT_CSP);

	if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });

	const range = request.headers.get('range');
	const match = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
	if (match && stat.size > 0) {
		let start = match[1] ? Number(match[1]) : NaN;
		let end = match[2] ? Number(match[2]) : NaN;
		if (Number.isNaN(start)) {
			start = Math.max(0, stat.size - end);
			end = stat.size - 1;
		} else if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
		if (start > end || start >= stat.size) {
			headers.set('content-range', `bytes */${stat.size}`);
			return new Response(null, { status: 416, headers });
		}
		headers.set('content-range', `bytes ${start}-${end}/${stat.size}`);
		headers.set('content-length', String(end - start + 1));
		if (request.method === 'HEAD') return new Response(null, { status: 206, headers });
		return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream, { status: 206, headers });
	}

	headers.set('content-length', String(stat.size));
	if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
	return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, { status: 200, headers });
}
