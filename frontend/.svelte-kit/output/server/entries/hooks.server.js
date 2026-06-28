//#region src/hooks.server.ts
/** Match unified backend: same-origin pages may be embedded (game iframes). */
var handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	if (!event.url.pathname.startsWith("/api")) {
		response.headers.set("X-Frame-Options", "SAMEORIGIN");
		response.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
	}
	return response;
};
//#endregion
export { handle };
