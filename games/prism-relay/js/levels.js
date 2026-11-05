/*
 * Prism Relay — beam tracing and level generation (no DOM).
 * Levels are built solvable-by-construction: beams are walked across an empty board,
 * dropping mirrors/splitters/filters as they go; the pieces are then lifted into the
 * player's tray. Every generated level is verified with the same tracer the game uses.
 */
(function (PR) {
	'use strict';

	var DX = [1, 0, -1, 0];
	var DY = [0, 1, 0, -1];
	// MIRROR[orient][incomingDir] -> outgoing dir. orient 0 = "/", 1 = "\".
	var MIRROR = [
		[3, 2, 1, 0],
		[1, 0, 3, 2]
	];
	var EMPTY = 0,
		WALL = 1,
		EMITTER = 2,
		TARGET = 3;

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

	function shuffle(arr, r) {
		for (var i = arr.length - 1; i > 0; i--) {
			var j = Math.floor(r() * (i + 1));
			var t = arr[i];
			arr[i] = arr[j];
			arr[j] = t;
		}
		return arr;
	}

	function pieceKey(p) {
		return p.type === 'filter' ? 'filter' + p.color : p.type;
	}

	/**
	 * Follow every beam from every emitter.
	 * pieces: { [cellIndex]: { type: 'mirror'|'splitter'|'filter', orient, color } }
	 * Returns { segments: [[x1,y1,x2,y2,color]], received: {cellIndex: mask}, solved, lit: {cellIndex: bool} }
	 */
	function trace(level, pieces) {
		var W = level.w,
			H = level.h,
			cells = level.cells;
		var segments = [];
		var received = {};
		var seen = {};
		var queue = [];
		for (var i = 0; i < cells.length; i++) {
			if (cells[i].kind === EMITTER) queue.push({ x: i % W, y: (i / W) | 0, d: cells[i].dir, c: cells[i].color });
		}
		var guard = 0;
		while (queue.length && guard++ < 4000) {
			var b = queue.pop();
			var x = b.x,
				y = b.y,
				d = b.d,
				col = b.c;
			for (var steps = 0; steps < 400; steps++) {
				var nx = x + DX[d],
					ny = y + DY[d];
				if (nx < 0 || ny < 0 || nx >= W || ny >= H) {
					segments.push([x, y, x + DX[d] * 0.5, y + DY[d] * 0.5, col]);
					break;
				}
				var idx = ny * W + nx;
				var key = idx * 64 + d * 8 + col;
				if (seen[key]) {
					segments.push([x, y, nx, ny, col]);
					break;
				}
				seen[key] = 1;
				var cell = cells[idx];
				if (cell.kind === WALL || cell.kind === EMITTER) {
					segments.push([x, y, nx - DX[d] * 0.42, ny - DY[d] * 0.42, col]);
					break;
				}
				if (cell.kind === TARGET) {
					segments.push([x, y, nx, ny, col]);
					received[idx] = (received[idx] || 0) | col;
					break;
				}
				segments.push([x, y, nx, ny, col]);
				x = nx;
				y = ny;
				var p = pieces[idx];
				if (!p) continue;
				if (p.type === 'mirror') d = MIRROR[p.orient][d];
				else if (p.type === 'splitter') queue.push({ x: x, y: y, d: MIRROR[p.orient][d], c: col });
				else if (p.type === 'filter') {
					col = col & p.color;
					if (!col) break;
				}
			}
		}
		var solved = true;
		var lit = {};
		for (var t = 0; t < cells.length; t++) {
			if (cells[t].kind !== TARGET) continue;
			lit[t] = (received[t] || 0) === cells[t].need;
			if (!lit[t]) solved = false;
		}
		return { segments: segments, received: received, solved: solved, lit: lit };
	}

	// ── Generation ────────────────────────────────────────────────────

	function chapterParams(ch, li) {
		var t = li / 9;
		switch (ch) {
			case 0: // Reflection — one beam, mirrors
				return { w: 6 + (li >= 5 ? 1 : 0), h: 6 + (li >= 3 ? 1 : 0), beams: 1, mixing: 0, splitters: 0, white: false, turns: [1 + Math.floor(t * 1.5), 2 + Math.floor(t * 2)], len: [3, 6 + Math.round(t * 4)], walls: 0.04 + t * 0.08, hints: 0, decoys: li >= 7 ? { mirror: 1 } : {} };
			case 1: // Convergence — two beams, colour mixing
				return { w: 7 + (li >= 6 ? 1 : 0), h: 7 + (li >= 4 ? 1 : 0), beams: 2, mixing: li >= 3 ? 1 : 0, splitters: 0, white: false, turns: [1, 2 + Math.floor(t * 2)], len: [3, 6 + Math.round(t * 3)], walls: 0.06 + t * 0.06, hints: 0, decoys: li >= 6 ? { mirror: 1 } : {} };
			case 2: // Division — splitters
				return { w: 7 + (li >= 4 ? 1 : 0), h: 8, beams: 1 + (li >= 6 ? 1 : 0), mixing: 0, splitters: 1 + (li >= 8 ? 1 : 0), white: false, turns: [1, 2 + Math.floor(t * 2)], len: [3, 6 + Math.round(t * 2)], walls: 0.06 + t * 0.05, hints: li >= 6 ? 1 : 0, decoys: li >= 5 ? { mirror: 1 } : {} };
			case 3: // Spectrum — white light and filters
				return { w: 8 + (li >= 7 ? 1 : 0), h: 8 + (li >= 4 ? 1 : 0), beams: 1 + (li >= 5 ? 1 : 0), mixing: 0, splitters: li >= 2 ? 1 : 0, white: true, turns: [1, 2 + Math.floor(t * 2)], len: [3, 6 + Math.round(t * 2)], walls: 0.07 + t * 0.05, hints: li >= 5 ? 1 : 0, decoys: li >= 6 ? { mirror: 1 } : {} };
			default: // Lattice — everything
				return { w: 9 + (li >= 5 ? 1 : 0), h: 9 + (li >= 3 ? 1 : 0), beams: 2 + (li >= 7 ? 1 : 0), mixing: 1, splitters: 1 + (li >= 8 ? 1 : 0), white: true, turns: [1, 3], len: [3, 7], walls: 0.08 + t * 0.04, hints: 1 + (li >= 6 ? 1 : 0), decoys: { mirror: 1 + (li >= 6 ? 1 : 0), splitter: li >= 8 ? 1 : 0 } };
		}
	}

	function tryBuild(P, r) {
		var W = P.w,
			H = P.h,
			N = W * H;
		var cells = [];
		var usage = []; // 0 free, 1 a beam passes straight through, 2 occupied (piece/emitter/target)
		for (var i = 0; i < N; i++) {
			cells.push({ kind: EMPTY });
			usage.push(0);
		}
		var pieces = {};
		var targets = []; // { idx, color, arrive }
		var idx = function (x, y) {
			return y * W + x;
		};
		var inside = function (x, y) {
			return x >= 0 && y >= 0 && x < W && y < H;
		};
		var free = function (i) {
			return usage[i] === 0 && cells[i].kind === EMPTY;
		};
		var passable = function (i) {
			return cells[i].kind === EMPTY && usage[i] !== 2;
		};
		var ri = function (a, b) {
			return a + Math.floor(r() * (b - a + 1));
		};

		// Walk a beam. forward: from an emitter toward a new target; backward: from a target toward a new emitter.
		function walk(x, y, d, color, opts) {
			var len = 0,
				turns = 0,
				wantLen = ri(P.len[0], P.len[1]),
				wantTurns = ri(P.turns[0], P.turns[1]);
			// Only multi-colour light can be filtered into something new.
			var filterLeft = opts.filter && (color & (color - 1)) !== 0 ? 1 : 0;
			var splitsLeft = opts.splits || 0;
			var branches = [];
			var cx = x,
				cy = y;
			for (var guard = 0; guard < 80; guard++) {
				var nx = cx + DX[d],
					ny = cy + DY[d];
				if (!inside(nx, ny) || !passable(idx(nx, ny))) return null;
				cx = nx;
				cy = ny;
				len++;
				var i = idx(cx, cy);
				if (len >= wantLen && turns >= wantTurns && free(i) && splitsLeft === 0 && filterLeft === 0) {
					usage[i] = 2;
					return { end: i, d: d, color: color, branches: branches };
				}
				if (free(i) && turns < wantTurns && r() < (len >= wantLen ? 0.8 : 0.42)) {
					var opts2 = r() < 0.5 ? [(d + 1) % 4, (d + 3) % 4] : [(d + 3) % 4, (d + 1) % 4];
					var turned = false;
					for (var k = 0; k < 2; k++) {
						var nd = opts2[k];
						var tx = cx + DX[nd],
							ty = cy + DY[nd];
						if (!inside(tx, ty) || !passable(idx(tx, ty))) continue;
						var o = MIRROR[0][d] === nd ? 0 : 1;
						pieces[i] = { type: 'mirror', orient: o };
						usage[i] = 2;
						turns++;
						d = nd;
						turned = true;
						break;
					}
					if (turned) continue;
				}
				if (opts.forward && splitsLeft > 0 && free(i) && len >= 2 && r() < 0.4) {
					var so = r() < 0.5 ? 0 : 1;
					var bd = MIRROR[so][d];
					var bx = cx + DX[bd],
						by = cy + DY[bd];
					if (inside(bx, by) && passable(idx(bx, by))) {
						pieces[i] = { type: 'splitter', orient: so };
						usage[i] = 2;
						splitsLeft--;
						branches.push({ x: cx, y: cy, d: bd, color: color });
						continue;
					}
				}
				if (opts.forward && filterLeft > 0 && free(i) && len >= 1 && r() < 0.4) {
					var comps = [1, 2, 4].filter(function (c) {
						return color & c;
					});
					var fc = comps[Math.floor(r() * comps.length)];
					if (fc && fc !== color) {
						pieces[i] = { type: 'filter', color: fc };
						usage[i] = 2;
						color = color & fc;
						filterLeft = 0;
						continue;
					}
				}
				if (usage[i] === 0) usage[i] = 1;
			}
			return null;
		}

		function placeEmitter(color) {
			// Prefer border cells, firing inward.
			for (var tries = 0; tries < 60; tries++) {
				var side = Math.floor(r() * 4);
				var x, y, d;
				if (side === 0) (x = 0), (y = ri(0, H - 1)), (d = 0);
				else if (side === 1) (x = ri(0, W - 1)), (y = 0), (d = 1);
				else if (side === 2) (x = W - 1), (y = ri(0, H - 1)), (d = 2);
				else (x = ri(0, W - 1)), (y = H - 1), (d = 3);
				var i = idx(x, y);
				if (!free(i)) continue;
				var n = idx(x + DX[d], y + DY[d]);
				if (!inside(x + DX[d], y + DY[d]) || !passable(n)) continue;
				cells[i] = { kind: EMITTER, color: color, dir: d };
				usage[i] = 2;
				return { x: x, y: y, d: d };
			}
			return null;
		}

		function forwardBeam(color, opts) {
			var e = placeEmitter(color);
			if (!e) return false;
			var pending = [{ x: e.x, y: e.y, d: e.d, color: color, opts: opts }];
			while (pending.length) {
				var job = pending.shift();
				var res = walk(job.x, job.y, job.d, job.color, job.opts);
				if (!res) return false;
				cells[res.end] = { kind: TARGET, need: res.color };
				targets.push({ idx: res.end, color: res.color, arrive: res.d });
				for (var b = 0; b < res.branches.length; b++) {
					var br = res.branches[b];
					pending.push({ x: br.x, y: br.y, d: br.d, color: br.color, opts: { forward: true, filter: opts.filter && r() < 0.7, splits: 0 } });
				}
			}
			return true;
		}

		function mixingBeam(palette) {
			var options = targets.filter(function (t) {
				return t.color !== 7 && (t.color & (t.color - 1)) === 0;
			});
			if (!options.length) return false;
			var t = options[Math.floor(r() * options.length)];
			var colors = palette.filter(function (c) {
				return !(c & t.color);
			});
			var color = colors[Math.floor(r() * colors.length)];
			var tx = t.idx % W,
				ty = (t.idx / W) | 0;
			var dirs = [0, 1, 2, 3].filter(function (dIn) {
				return dIn !== t.arrive;
			});
			for (var k = 0; k < dirs.length; k++) {
				var dIn = dirs[(k + Math.floor(r() * 3)) % dirs.length];
				var back = (dIn + 2) % 4;
				var res = walk(tx, ty, back, color, { forward: false });
				if (!res) return false;
				// The walk's end cell becomes the emitter, firing back along the path.
				cells[res.end] = { kind: EMITTER, color: color, dir: (res.d + 2) % 4 };
				cells[t.idx].need = t.color | color;
				t.color = cells[t.idx].need;
				return true;
			}
			return false;
		}

		var palette = [1, 2, 4];
		var shuffled = shuffle(palette.slice(), r);
		var splitsLeft = P.splitters;
		var mixLeft = P.mixing;
		for (var b = 0; b < P.beams; b++) {
			if (b > 0 && mixLeft > 0) {
				if (!mixingBeam(palette)) return null;
				mixLeft--;
				continue;
			}
			var white = P.white && b === 0;
			var color = white ? 7 : shuffled[b % 3];
			var splits = splitsLeft > 0 ? (b === P.beams - 1 ? splitsLeft : 1) : 0;
			splitsLeft -= splits;
			if (!forwardBeam(color, { forward: true, filter: white, splits: splits })) return null;
		}
		if (splitsLeft > 0 || mixLeft > 0) return null;

		// Walls on untouched cells give each board its shape.
		for (var w = 0; w < N; w++) if (usage[w] === 0 && r() < P.walls) cells[w] = { kind: WALL };

		var level = { w: W, h: H, cells: cells };
		if (!trace(level, pieces).solved) return null;
		if (trace(level, {}).solved) return null;

		// Lift pieces into the tray, keeping a few fixed as hints.
		var keys = shuffle(Object.keys(pieces).map(Number), r);
		var fixed = {};
		for (var h = 0; h < Math.min(P.hints, keys.length - 1); h++) fixed[keys[h]] = Object.assign({ fixed: true }, pieces[keys[h]]);
		var inventory = {};
		var solution = {};
		var parMoves = 0;
		var parPieces = 0;
		keys.forEach(function (k) {
			if (fixed[k]) return;
			var p = pieces[k];
			solution[k] = p;
			var key = pieceKey(p);
			inventory[key] = (inventory[key] || 0) + 1;
			parPieces++;
			parMoves += 1 + (p.orient === 1 ? 1 : 0);
		});
		for (var dk in P.decoys) if (P.decoys[dk]) inventory[dk] = (inventory[dk] || 0) + P.decoys[dk];
		if (trace(level, fixed).solved) return null;
		level.fixed = fixed;
		level.inventory = inventory;
		level.solution = solution;
		level.parPieces = parPieces;
		level.parMoves = parMoves + 2 + Math.floor(parPieces / 3);
		return level;
	}

	var cache = {};

	/** Deterministic level for a seed string. */
	function build(params, seedStr) {
		if (cache[seedStr]) return cache[seedStr];
		for (var attempt = 0; attempt < 2000; attempt++) {
			var level = tryBuild(params, rng(hash(seedStr + '#' + attempt)));
			if (level) {
				level.seed = seedStr;
				cache[seedStr] = level;
				return level;
			}
		}
		throw new Error('Could not generate level ' + seedStr);
	}

	PR.CHAPTERS = [
		{ name: 'Reflection', blurb: 'Bend a single beam with mirrors.' },
		{ name: 'Convergence', blurb: 'Two beams. Some targets need their light mixed.' },
		{ name: 'Division', blurb: 'Splitters send light two ways at once.' },
		{ name: 'Spectrum', blurb: 'White light and colour filters.' },
		{ name: 'Lattice', blurb: 'Everything, all at once.' }
	];
	PR.LEVELS_PER_CHAPTER = 10;

	PR.campaignLevel = function (ch, li) {
		return build(chapterParams(ch, li), 'campaign:' + ch + ':' + li);
	};

	PR.dailyLevel = function (dateKey) {
		var r = rng(hash('daily-params:' + dateKey));
		return build(chapterParams(2 + Math.floor(r() * 3), 3 + Math.floor(r() * 7)), 'daily:' + dateKey);
	};

	PR.trace = trace;
	PR.pieceKey = pieceKey;
	PR.MIRROR = MIRROR;
	PR.DX = DX;
	PR.DY = DY;
	PR.KIND = { EMPTY: EMPTY, WALL: WALL, EMITTER: EMITTER, TARGET: TARGET };
})((window.PrismRelay = window.PrismRelay || {}));
