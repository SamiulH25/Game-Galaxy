/** Only allow same-site relative redirect targets like "/play/x". */
export function safeNext(url: URL): string {
	const next = url.searchParams.get('next') ?? '/';
	return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
