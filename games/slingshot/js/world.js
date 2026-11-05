/*
 * Slingshot — physics, level generation and the solvability check (no DOM).
 * Time starts at launch: moons sit at their starting phase until the probe flies,
 * so a shot is a pure function of (level, angle, speed). The generator samples a
 * grid of shots, keeps layouts inside a difficulty band, and drops the shards on a
 * robust winning trajectory so every star is reachable.
 */
(function (SL) {
	'use strict';

	var W = 1000,
		H = 620;
	var DT = 1 / 120;
	var MAX_T = 14;
	var GM_PER_R2 = 1560;
	var SPEED_MIN = 150,
		SPEED_MAX = 520;
	var TARGET_R = 34;
	var SHARD_R = 20;

	function hash(str) {
		var h = 0x811c9dc5;
		for (var i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}
	function rng(seed) {
		var a = seed >>> 0;
		return function () {
			a = (a + 0x6d2b79f5) >>> 0;
			var t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	var KIND_CODE = { planet: 0, moon: 1, hole: 2, repulsor: 3, rock: 4 };

	/** Flatten a level into typed arrays once; the simulator reads only these. */
	function compile(level) {
		if (level._c) return level._c;
		var n = level.bodies.length;
		var c = {
			n: n,
			x: new Float64Array(n),
			y: new Float64Array(n),
			r2: new Float64Array(n),
			r: new Float64Array(n),
			gm: new Float64Array(n),
			kind: new Uint8Array(n),
			moons: []
		};
		for (var i = 0; i < n; i++) {
			var b = level.bodies[i];
			c.x[i] = b.x;
			c.y[i] = b.y;
			c.r[i] = b.r;
			c.r2[i] = b.r * b.r;
			c.gm[i] = b.gm;
			c.kind[i] = KIND_CODE[b.kind];
			if (b.orbit) c.moons.push(i);
		}
		Object.defineProperty(level, '_c', { value: c, enumerable: false, configurable: true });
		return c;
	}

	function placeMoons(level, c, t) {
		for (var m = 0; m < c.moons.length; m++) {
			var i = c.moons[m];
			var o = level.bodies[i].orbit;
			var a = o.phase + o.w * t;
			c.x[i] = c.x[o.parent] + Math.cos(a) * o.r;
			c.y[i] = c.y[o.parent] + Math.sin(a) * o.r;
		}
	}

	/** Positions of every body at time t (for drawing). */
	function bodiesAt(level, t) {
		var c = compile(level);
		placeMoons(level, c, t);
		var out = [];
		for (var i = 0; i < c.n; i++) out.push({ x: c.x[i], y: c.y[i], r: c.r[i], gm: c.gm[i], kind: level.bodies[i].kind, body: level.bodies[i] });
		return out;
	}

	/**
	 * Fly one shot. opts.record: keep the path; opts.maxT: stop early (previews / fast sweeps).
	 * Returns { outcome: 'target'|'crash'|'lost'|'timeout'|'preview', path, shards: [indices], t, closest, wormholed, end }
	 */
	function simulate(level, angle, speed, opts) {
		opts = opts || {};
		var c = compile(level);
		var n = c.n;
		var X = c.x,
			Y = c.y,
			R2 = c.r2,
			GM = c.gm,
			KIND = c.kind;
		var hasMoons = c.moons.length > 0;
		var x = level.pad.x,
			y = level.pad.y;
		var vx = Math.cos(angle) * speed,
			vy = Math.sin(angle) * speed;
		var path = opts.record ? [[x, y]] : null;
		var got = 0;
		var shards = level.shards;
		var tx = level.target.x,
			ty = level.target.y,
			tr2 = TARGET_R * TARGET_R,
			sr2 = SHARD_R * SHARD_R;
		var worms = level.wormholes || [];
		var maxT = opts.maxT || MAX_T;
		var closest = Infinity;
		var cooldown = 0;
		var wormholed = false;
		var steps = Math.ceil(maxT / DT);
		var s = 0;
		placeMoons(level, c, 0);
		for (s = 1; s <= steps; s++) {
			if (hasMoons) placeMoons(level, c, s * DT);
			var ax = 0,
				ay = 0;
			for (var i = 0; i < n; i++) {
				var g = GM[i];
				if (!g) continue;
				var dx = X[i] - x,
					dy = Y[i] - y;
				var d2 = dx * dx + dy * dy + 100;
				var inv = g / (d2 * Math.sqrt(d2));
				ax += dx * inv;
				ay += dy * inv;
			}
			vx += ax * DT;
			vy += ay * DT;
			x += vx * DT;
			y += vy * DT;
			if (path && (s & 1) === 0) path.push([x, y]);

			for (var j = 0; j < n; j++) {
				var ex = X[j] - x,
					ey = Y[j] - y;
				var e2 = ex * ex + ey * ey;
				if (e2 < R2[j]) return done('crash');
				if (KIND[j] === 0 && e2 < R2[j] * 9) {
					var skim = Math.sqrt(e2) - c.r[j];
					if (skim < closest) closest = skim;
				}
			}
			if (cooldown > 0) cooldown -= DT;
			else
				for (var w = 0; w < worms.length; w++) {
					var pair = worms[w];
					for (var e = 0; e < 2; e++) {
						var from = pair[e],
							to = pair[1 - e];
						var fx = from.x - x,
							fy = from.y - y;
						if (fx * fx + fy * fy < from.r * from.r * 0.64) {
							var sp = Math.sqrt(vx * vx + vy * vy) || 1;
							x = to.x + (vx / sp) * (to.r + 4);
							y = to.y + (vy / sp) * (to.r + 4);
							cooldown = 0.25;
							wormholed = true;
							if (path) path.push(null, [x, y]);
							e = 2;
							w = worms.length;
						}
					}
				}
			for (var k = 0; k < shards.length; k++) {
				if (got & (1 << k)) continue;
				var hx = shards[k].x - x,
					hy = shards[k].y - y;
				if (hx * hx + hy * hy < sr2) got |= 1 << k;
			}
			var gx = tx - x,
				gy = ty - y;
			if (gx * gx + gy * gy < tr2) return done('target');
			if (x < -120 || y < -120 || x > W + 120 || y > H + 120) return done('lost');
		}
		s = steps;
		return done(opts.maxT && opts.maxT < MAX_T ? 'preview' : 'timeout');

		function done(outcome) {
			if (path) path.push([x, y]);
			var list = [];
			for (var q = 0; q < shards.length; q++) if (got & (1 << q)) list.push(q);
			return { outcome: outcome, path: path, shards: list, t: s * DT, closest: closest, wormholed: wormholed, end: [x, y] };
		}
	}

	// ── Generation ────────────────────────────────────────────────────

	var ANGLE_STEPS = 144;
	var SPEED_STEPS = 12;

	function sweep(level) {
		var wins = [];
		var total = 0;
		for (var a = 0; a < ANGLE_STEPS; a++) {
			var angle = (a / ANGLE_STEPS) * Math.PI * 2;
			for (var s = 0; s < SPEED_STEPS; s++) {
				var speed = SPEED_MIN + ((SPEED_MAX - SPEED_MIN) * s) / (SPEED_STEPS - 1);
				total++;
				if (simulate(level, angle, speed, { maxT: 10 }).outcome === 'target') wins.push([a, s]);
			}
		}
		return { wins: wins, rate: wins.length / total };
	}

	function chapterParams(ch, li) {
		var t = li / 7;
		switch (ch) {
			case 0:
				return { planets: 1 + (li >= 3 ? 1 : 0), moons: 0, holes: 0, rocks: 0, worms: 0, repulsors: 0, wins: [6, 400], blockDirect: li >= 4, preview: 2.4, par: 2 };
			case 1:
				return { planets: 2 + (li >= 4 ? 1 : 0), moons: 0, holes: li >= 5 ? 1 : 0, rocks: 0, worms: 0, repulsors: 0, wins: [4, 160], blockDirect: true, preview: 1.8, par: 2 };
			case 2:
				return { planets: 2 + (li >= 5 ? 1 : 0), moons: 1 + (li >= 4 ? 1 : 0), holes: li >= 6 ? 1 : 0, rocks: li >= 2 ? 1 : 0, worms: 0, repulsors: 0, wins: [4, 120], blockDirect: true, preview: 1.4 - t * 0.2, par: 3 };
			default:
				return { planets: 2 + (li >= 4 ? 1 : 0), moons: li >= 3 ? 1 : 0, holes: li >= 5 ? 1 : 0, rocks: li >= 2 ? 1 : 0, worms: 1, repulsors: li >= 1 ? 1 : 0, wins: [3, 100], blockDirect: true, preview: 1.1 - t * 0.2, par: 3 };
		}
	}

	function tryBuild(P, r) {
		var pad = { x: 60 + r() * 60, y: 90 + r() * (H - 180) };
		var target = { x: W - 120 + r() * 60, y: 90 + r() * (H - 180) };
		var bodies = [];
		var blockers = [
			{ x: pad.x, y: pad.y, r: 50 },
			{ x: target.x, y: target.y, r: 60 }
		];
		function place(r0, margin) {
			for (var tries = 0; tries < 80; tries++) {
				var x = 220 + r() * (W - 440),
					y = 60 + r0 + r() * (H - 120 - 2 * r0);
				var ok = true;
				for (var i = 0; i < blockers.length && ok; i++) if (Math.hypot(blockers[i].x - x, blockers[i].y - y) < blockers[i].r + r0 + margin) ok = false;
				if (ok) {
					blockers.push({ x: x, y: y, r: r0 });
					return { x: x, y: y };
				}
			}
			return null;
		}
		var planetIdx = [];
		for (var p = 0; p < P.planets; p++) {
			var pr = 26 + r() * 30;
			var pos = place(pr + (P.moons ? 70 : 0), 40);
			if (!pos) return null;
			planetIdx.push(bodies.length);
			bodies.push({ kind: 'planet', x: pos.x, y: pos.y, r: pr, gm: GM_PER_R2 * pr * pr, hue: Math.floor(r() * 360), bands: r() < 0.4 });
		}
		for (var m = 0; m < P.moons; m++) {
			var parent = planetIdx[m % planetIdx.length];
			var mr = 9 + r() * 7;
			bodies.push({
				kind: 'moon',
				x: 0,
				y: 0,
				r: mr,
				gm: GM_PER_R2 * mr * mr * 1.4,
				orbit: { parent: parent, r: bodies[parent].r + 38 + r() * 28, w: (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.5), phase: r() * Math.PI * 2 }
			});
		}
		for (var h = 0; h < P.holes; h++) {
			var hp = place(70, 50);
			if (!hp) return null;
			bodies.push({ kind: 'hole', x: hp.x, y: hp.y, r: 13, gm: 5.2e6 });
		}
		for (var q = 0; q < P.repulsors; q++) {
			var rp = place(40, 30);
			if (!rp) return null;
			bodies.push({ kind: 'repulsor', x: rp.x, y: rp.y, r: 16, gm: -1.6e6 });
		}
		for (var f = 0; f < P.rocks; f++) {
			var cp = place(60, 20);
			if (!cp) return null;
			var n = 5 + Math.floor(r() * 5);
			for (var k = 0; k < n; k++) {
				var a = r() * Math.PI * 2,
					d = r() * 55;
				bodies.push({ kind: 'rock', x: cp.x + Math.cos(a) * d, y: cp.y + Math.sin(a) * d, r: 6 + r() * 7, gm: 0, seed: r() });
			}
		}
		var wormholes = [];
		for (var wi = 0; wi < P.worms; wi++) {
			var a1 = place(30, 30),
				a2 = place(30, 30);
			if (!a1 || !a2) return null;
			wormholes.push([
				{ x: a1.x, y: a1.y, r: 24 },
				{ x: a2.x, y: a2.y, r: 24 }
			]);
		}
		var level = { w: W, h: H, pad: pad, target: target, bodies: bodies, wormholes: wormholes, shards: [], preview: P.preview, par: P.par };

		// Cheap rejection first: a straight aim at the relay must miss when the chapter wants assists.
		if (P.blockDirect) {
			var direct = Math.atan2(target.y - pad.y, target.x - pad.x);
			for (var da = -4; da <= 4; da += 2)
				for (var sp = 0; sp < SPEED_STEPS; sp += 2)
					if (simulate(level, direct + (da * Math.PI) / 180, SPEED_MIN + ((SPEED_MAX - SPEED_MIN) * sp) / (SPEED_STEPS - 1), { maxT: 10 }).outcome === 'target') return null;
		}
		var res = sweep(level);
		if (res.wins.length < P.wins[0] || res.wins.length > P.wins[1]) return null;
		// A robust win: nudging the aim ±0.6° at the same speed still reaches the relay.
		var order = res.wins.slice();
		for (var oi = order.length - 1; oi > 0; oi--) {
			var oj = Math.floor(r() * (oi + 1));
			var tmp = order[oi];
			order[oi] = order[oj];
			order[oj] = tmp;
		}
		var angle = 0,
			speed = 0,
			found = false;
		for (var ci = 0; ci < order.length && !found; ci++) {
			var ca = (order[ci][0] / ANGLE_STEPS) * Math.PI * 2;
			var cs = SPEED_MIN + ((SPEED_MAX - SPEED_MIN) * order[ci][1]) / (SPEED_STEPS - 1);
			if (simulate(level, ca + 0.01, cs, { maxT: 10 }).outcome === 'target' && simulate(level, ca - 0.01, cs, { maxT: 10 }).outcome === 'target') {
				angle = ca;
				speed = cs;
				found = true;
			}
		}
		if (!found) return null;
		var flight = simulate(level, angle, speed, { record: true, maxT: 10 });
		var pts = flight.path.filter(Boolean);
		if (pts.length < 20) return null;
		[0.3, 0.55, 0.78].forEach(function (f) {
			var pt = pts[Math.floor(pts.length * f)];
			level.shards.push({ x: pt[0], y: pt[1] });
		});
		// Shards must sit in open space.
		var check = bodiesAt(level, 0);
		for (var s = 0; s < level.shards.length; s++)
			for (var b = 0; b < check.length; b++) if (Math.hypot(check[b].x - level.shards[s].x, check[b].y - level.shards[s].y) < check[b].r + 14) return null;
		var verify = simulate(level, angle, speed);
		if (verify.outcome !== 'target' || verify.shards.length !== 3) return null;
		level.solution = { angle: angle, speed: speed };
		level.wins = res.wins.length;
		return level;
	}

	var cache = {};
	function build(params, seedStr) {
		if (cache[seedStr]) return cache[seedStr];
		for (var attempt = 0; attempt < 120; attempt++) {
			var level = tryBuild(params, rng(hash(seedStr + '#' + attempt)));
			if (level) {
				level.seed = seedStr;
				cache[seedStr] = level;
				return level;
			}
		}
		// Fall back to an easier band rather than fail.
		var easier = Object.assign({}, params, { wins: [2, 600], blockDirect: false });
		for (var a2 = 0; a2 < 400; a2++) {
			var lv = tryBuild(easier, rng(hash(seedStr + '#easy' + a2)));
			if (lv) {
				lv.seed = seedStr;
				cache[seedStr] = lv;
				return lv;
			}
		}
		throw new Error('Could not generate ' + seedStr);
	}

	SL.CHAPTERS = [
		{ name: 'Launch', blurb: 'Pull back, aim, let go. Gravity does the rest.' },
		{ name: 'Assist', blurb: 'Bend around worlds — and stay clear of black holes.' },
		{ name: 'Orbiters', blurb: 'Moons move once you launch. Asteroids do not forgive.' },
		{ name: 'Folded Space', blurb: 'Wormholes, repulsors and very little preview.' }
	];
	SL.LEVELS_PER_CHAPTER = 8;
	SL.campaignLevel = function (ch, li) {
		// Prefer the pre-generated campaign (js/campaign.js) so every browser gets identical levels.
		var pre = SL.CAMPAIGN && SL.CAMPAIGN[ch * SL.LEVELS_PER_CHAPTER + li];
		if (pre) return pre;
		return build(chapterParams(ch, li), 'campaign:' + ch + ':' + li);
	};
	/** Endless survey: difficulty climbs with depth. */
	SL.surveyLevel = function (runSeed, depth) {
		var r = rng(hash('survey-params:' + runSeed + ':' + depth));
		var ch = Math.min(3, Math.floor(depth / 4) + (r() < 0.3 ? 1 : 0));
		var li = Math.min(7, (depth % 4) * 2 + Math.floor(r() * 2));
		var p = chapterParams(ch, li);
		p.preview = Math.max(0.7, p.preview - depth * 0.02);
		return build(p, 'survey:' + runSeed + ':' + depth);
	};
	SL.simulate = simulate;
	SL.bodiesAt = bodiesAt;
	SL.compile = compile;
	SL.W = W;
	SL.H = H;
	SL.SPEED_MIN = SPEED_MIN;
	SL.SPEED_MAX = SPEED_MAX;
	SL.TARGET_R = TARGET_R;
	SL.SHARD_R = SHARD_R;
	SL.hash = hash;
})((window.Slingshot = window.Slingshot || {}));
