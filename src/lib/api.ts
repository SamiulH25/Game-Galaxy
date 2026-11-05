/** Small JSON client for the site's own API (same origin, cookie session). */

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Called whenever a request comes back 401 — the session expired or was revoked. */
export function onUnauthorized(fn: Listener): () => void {
	unauthorizedListeners.add(fn);
	return () => unauthorizedListeners.delete(fn);
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
	let res: Response;
	try {
		res = await fetch(path, {
			method: init.method ?? 'GET',
			headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
			credentials: 'same-origin'
		});
	} catch {
		throw new ApiError(0, "Couldn't reach the server");
	}
	if (!res.ok) {
		let message = `Request failed (${res.status})`;
		try {
			const body = await res.json();
			if (body && typeof body.message === 'string') message = body.message;
		} catch {
			/* not JSON */
		}
		if (res.status === 401) unauthorizedListeners.forEach((fn) => fn());
		throw new ApiError(res.status, message);
	}
	return (await res.json()) as T;
}
