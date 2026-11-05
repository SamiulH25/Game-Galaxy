/*!
 * Game Galaxy SDK v1
 * Include with: <script src="/sdk/galaxy.js"></script>
 * Then use the global `Galaxy` object. Every method returns a Promise.
 *
 *   const { player } = await Galaxy.ready();  // call once when your game has loaded
 *   const data = await Galaxy.load();          // your last save, or null
 *   await Galaxy.save({ level: 3 });           // any JSON value, up to 256 KB
 *   await Galaxy.submitScore(1200);            // needs "scoring" in game.json
 *   await Galaxy.unlock('first-win');          // id from "achievements" in game.json
 *   Galaxy.on('pause', fn); Galaxy.on('resume', fn); Galaxy.on('settings', fn);
 *
 * Inside the Game Galaxy player the shell stores everything (cloud for signed-in
 * players, the browser for guests). Opened on its own, the SDK falls back to
 * localStorage so a game can be developed without the site.
 */
(function (global) {
	'use strict';

	var PROTOCOL = 'galaxy/1';
	var TIMEOUT_MS = 15000;
	var embedded = !!global.parent && global.parent !== global;
	var seq = 0;
	var pending = {};
	var listeners = {};
	var readyPromise = null;

	function emit(name, data) {
		var fns = (listeners[name] || []).slice();
		for (var i = 0; i < fns.length; i++) {
			try {
				fns[i](data);
			} catch (err) {
				console.error('[Galaxy] listener for "' + name + '" threw', err);
			}
		}
	}

	function send(method, params) {
		return new Promise(function (resolve, reject) {
			var id = ++seq;
			var timer = setTimeout(function () {
				delete pending[id];
				reject(new Error('Galaxy.' + method + ' timed out'));
			}, TIMEOUT_MS);
			pending[id] = { resolve: resolve, reject: reject, timer: timer };
			global.parent.postMessage({ protocol: PROTOCOL, type: 'request', id: id, method: method, params: params || {} }, '*');
		});
	}

	global.addEventListener('message', function (event) {
		if (!embedded || event.source !== global.parent) return;
		var msg = event.data;
		if (!msg || msg.protocol !== PROTOCOL) return;
		if (msg.type === 'response') {
			var p = pending[msg.id];
			if (!p) return;
			clearTimeout(p.timer);
			delete pending[msg.id];
			if (msg.ok) p.resolve(msg.result);
			else p.reject(new Error(msg.error || 'Galaxy request failed'));
		} else if (msg.type === 'event' && typeof msg.name === 'string') {
			emit(msg.name, msg.data);
		}
	});

	// ── Standalone fallback (game opened outside the Galaxy player) ─────────
	var memory = {};
	var gameId = (location.pathname.match(/\/g\/([^/]+)\//) || [])[1] || location.pathname;
	var storeKey = 'galaxy-standalone:' + gameId;

	function readState() {
		var raw = null;
		try {
			raw = global.localStorage.getItem(storeKey);
		} catch (e) {
			raw = memory[storeKey] || null;
		}
		try {
			return raw ? JSON.parse(raw) : { save: null, best: null, achievements: [] };
		} catch (e) {
			return { save: null, best: null, achievements: [] };
		}
	}
	function writeState(state) {
		var raw = JSON.stringify(state);
		try {
			global.localStorage.setItem(storeKey, raw);
		} catch (e) {
			memory[storeKey] = raw;
		}
	}

	function local(method, params) {
		var state = readState();
		switch (method) {
			case 'ready':
				var reduced = false;
				try {
					reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
				} catch (e) {}
				return { gameId: gameId, standalone: true, player: { name: 'Developer', guest: true }, settings: { muted: false, reducedMotion: reduced } };
			case 'save.load':
				return state.save;
			case 'save.write':
				state.save = params.data;
				writeState(state);
				return { savedAt: Date.now(), cloud: false };
			case 'save.clear':
				state.save = null;
				writeState(state);
				return { ok: true };
			case 'score.submit':
				var personalBest = state.best === null || params.score > state.best;
				if (personalBest) state.best = params.score;
				writeState(state);
				return { best: state.best, personalBest: personalBest, rank: null, cloud: false };
			case 'achievement.unlock':
				var isNew = state.achievements.indexOf(params.id) === -1;
				if (isNew) state.achievements.push(params.id);
				writeState(state);
				return { new: isNew };
			case 'achievement.list':
				return state.achievements.slice();
			default:
				throw new Error('Unknown Galaxy method ' + method);
		}
	}

	function call(method, params) {
		if (embedded) return send(method, params);
		try {
			return Promise.resolve(local(method, params || {}));
		} catch (err) {
			return Promise.reject(err);
		}
	}

	var Galaxy = {
		version: '1.0.0',
		/** true when running inside the Game Galaxy player. */
		embedded: embedded,

		/** Tell the player your game has loaded. Resolves with { gameId, player: { name, guest }, settings: { muted, reducedMotion } }. */
		ready: function () {
			return readyPromise || (readyPromise = call('ready'));
		},

		/** Resolve with the last saved value, or null. */
		load: function () {
			return call('save.load');
		},

		/** Save any JSON value (max 256 KB). Rapid calls are coalesced; every promise resolves. */
		save: function (data) {
			var copy;
			try {
				copy = JSON.parse(JSON.stringify(data === undefined ? null : data));
			} catch (err) {
				return Promise.reject(new Error('Galaxy.save: data must be JSON-serialisable'));
			}
			return call('save.write', { data: copy });
		},

		clearSave: function () {
			return call('save.clear');
		},

		/** Submit a score. Resolves with { best, personalBest, rank } (rank is null for guests). */
		submitScore: function (score) {
			if (typeof score !== 'number' || !isFinite(score)) {
				return Promise.reject(new Error('Galaxy.submitScore: score must be a finite number'));
			}
			return call('score.submit', { score: score });
		},

		/** Unlock an achievement declared in game.json. Resolves with { new: boolean }. */
		unlock: function (id) {
			return call('achievement.unlock', { id: String(id) });
		},

		/** Resolve with the ids of the achievements the player has unlocked. */
		achievements: function () {
			return call('achievement.list');
		},

		/** Listen for player events: 'pause', 'resume', 'settings'. Returns an unsubscribe function. */
		on: function (name, fn) {
			(listeners[name] = listeners[name] || []).push(fn);
			return function () {
				Galaxy.off(name, fn);
			};
		},

		off: function (name, fn) {
			listeners[name] = (listeners[name] || []).filter(function (f) {
				return f !== fn;
			});
		}
	};

	global.Galaxy = Galaxy;
})(window);
