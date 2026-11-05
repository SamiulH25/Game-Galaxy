/* Deepcore — map generation, field of view, pathing. No DOM. */
(function (DC) {
	'use strict';

	var W = 44,
		H = 28;
	var T = { FLOOR: 0, WALL: 1, LIFT: 2, FAB: 3, CORE: 4 };
	var DIRS8 = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
		[1, 1],
		[1, -1],
		[-1, 1],
		[-1, -1]
	];

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
	function ri(r, a, b) {
		return a + Math.floor(r() * (b - a + 1));
	}

	function idx(x, y) {
		return y * W + x;
	}
	function inBounds(x, y) {
		return x >= 0 && y >= 0 && x < W && y < H;
	}
	/** Walls and fabricator terminals block movement (terminals are used by bumping into them). */
	function passable(tiles, x, y) {
		if (!inBounds(x, y)) return false;
		var t = tiles[idx(x, y)];
		return t !== T.WALL && t !== T.FAB;
	}

	/** Moving diagonally may not squeeze between two walls. */
	function canStep(tiles, x, y, dx, dy) {
		if (!passable(tiles, x + dx, y + dy)) return false;
		if (dx && dy && (!passable(tiles, x + dx, y) || !passable(tiles, x, y + dy))) return false;
		return true;
	}

	function generate(depth, r) {
		var tiles = new Uint8Array(W * H).fill(T.WALL);
		var rooms = [];
		var want = 7 + Math.min(depth, 4);
		for (var tries = 0; tries < 400 && rooms.length < want; tries++) {
			var w = ri(r, 5, 10),
				h = ri(r, 4, 7);
			var x = ri(r, 1, W - w - 2),
				y = ri(r, 1, H - h - 2);
			var ok = rooms.every(function (o) {
				return x + w + 1 < o.x || o.x + o.w + 1 < x || y + h + 1 < o.y || o.y + o.h + 1 < y;
			});
			if (!ok) continue;
			rooms.push({ x: x, y: y, w: w, h: h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
			for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) tiles[idx(xx, yy)] = T.FLOOR;
		}
		rooms.sort(function (a, b) {
			return a.cx - b.cx;
		});
		function corridor(a, b) {
			var x = a.cx,
				y = a.cy;
			var horizontalFirst = r() < 0.5;
			var carve = function () {
				tiles[idx(x, y)] = T.FLOOR;
			};
			if (horizontalFirst) {
				while (x !== b.cx) {
					x += Math.sign(b.cx - x);
					carve();
				}
				while (y !== b.cy) {
					y += Math.sign(b.cy - y);
					carve();
				}
			} else {
				while (y !== b.cy) {
					y += Math.sign(b.cy - y);
					carve();
				}
				while (x !== b.cx) {
					x += Math.sign(b.cx - x);
					carve();
				}
			}
		}
		for (var i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i]);
		for (var k = 0; k < 2; k++) corridor(rooms[ri(r, 0, rooms.length - 1)], rooms[ri(r, 0, rooms.length - 1)]);

		var start = rooms[ri(r, 0, rooms.length - 1)];
		var dist = bfs(tiles, start.cx, start.cy);
		var far = rooms.slice().sort(function (a, b) {
			return dist[idx(b.cx, b.cy)] - dist[idx(a.cx, a.cy)];
		})[0];
		var map = { w: W, h: H, tiles: tiles, rooms: rooms, start: [start.cx, start.cy], depth: depth };
		if (depth >= DC.MAX_DEPTH) {
			tiles[idx(far.cx, far.cy)] = T.CORE;
			map.core = [far.cx, far.cy];
		} else {
			tiles[idx(far.cx, far.cy)] = T.LIFT;
			map.lift = [far.cx, far.cy];
		}
		map.coreRoom = far;
		if (depth >= 2) {
			var others = rooms.filter(function (o) {
				return o !== start && o !== far;
			});
			var floorCount = 0;
			for (var f = 0; f < tiles.length; f++) if (tiles[f] !== T.WALL) floorCount++;
			// A terminal sits against a wall and must never cut the deck in two.
			for (var tries2 = 0; tries2 < 40 && others.length && !map.fab; tries2++) {
				var fr = others[ri(r, 0, others.length - 1)];
				var fx = fr.x + ri(r, 0, fr.w - 1),
					fy = fr.y;
				if (tiles[idx(fx, fy)] !== T.FLOOR) continue;
				tiles[idx(fx, fy)] = T.FAB;
				var reach = bfs(tiles, start.cx, start.cy);
				var n = 0;
				for (var q = 0; q < reach.length; q++) if (reach[q] >= 0) n++;
				if (n === floorCount - 1) map.fab = [fx, fy];
				else tiles[idx(fx, fy)] = T.FLOOR;
			}
		}
		return map;
	}

	/** Breadth-first distance from (sx, sy) over passable tiles (8-way). */
	function bfs(tiles, sx, sy, blocked) {
		var dist = new Int16Array(W * H).fill(-1);
		var q = [idx(sx, sy)];
		dist[q[0]] = 0;
		for (var h = 0; h < q.length; h++) {
			var c = q[h];
			var x = c % W,
				y = (c / W) | 0;
			for (var d = 0; d < 8; d++) {
				var dx = DIRS8[d][0],
					dy = DIRS8[d][1];
				if (!canStep(tiles, x, y, dx, dy)) continue;
				var n = idx(x + dx, y + dy);
				if (dist[n] !== -1 || (blocked && blocked(n))) continue;
				dist[n] = dist[c] + 1;
				q.push(n);
			}
		}
		return dist;
	}

	/** Path of [x,y] steps (excluding start) to (tx, ty), or null. */
	function findPath(tiles, sx, sy, tx, ty, allowed) {
		var dist = bfs(tiles, tx, ty, function (n) {
			return allowed && !allowed(n) && n !== idx(sx, sy);
		});
		if (dist[idx(sx, sy)] < 0) return null;
		var path = [];
		var x = sx,
			y = sy;
		for (var guard = 0; guard < 400 && !(x === tx && y === ty); guard++) {
			var best = null,
				bestD = dist[idx(x, y)];
			for (var d = 0; d < 8; d++) {
				var dx = DIRS8[d][0],
					dy = DIRS8[d][1];
				if (!canStep(tiles, x, y, dx, dy)) continue;
				var nd = dist[idx(x + dx, y + dy)];
				if (nd >= 0 && nd < bestD) {
					bestD = nd;
					best = [x + dx, y + dy];
				}
			}
			if (!best) return null;
			path.push(best);
			x = best[0];
			y = best[1];
		}
		return path;
	}

	/** Recursive shadowcasting. Returns a Uint8Array mask of visible tiles. */
	function fov(tiles, ox, oy, radius) {
		var vis = new Uint8Array(W * H);
		vis[idx(ox, oy)] = 1;
		var mult = [
			[1, 0, 0, -1, -1, 0, 0, 1],
			[0, 1, -1, 0, 0, -1, 1, 0],
			[0, 1, 1, 0, 0, -1, -1, 0],
			[1, 0, 0, 1, -1, 0, 0, -1]
		];
		function cast(row, start, end, xx, xy, yx, yy) {
			if (start < end) return;
			var newStart = 0;
			for (var j = row; j <= radius; j++) {
				var dx = -j - 1,
					dy = -j;
				var blocked = false;
				while (dx <= 0) {
					dx += 1;
					var X = ox + dx * xx + dy * xy,
						Y = oy + dx * yx + dy * yy;
					var lSlope = (dx - 0.5) / (dy + 0.5),
						rSlope = (dx + 0.5) / (dy - 0.5);
					if (start < rSlope) continue;
					if (end > lSlope) break;
					if (dx * dx + dy * dy < radius * radius && inBounds(X, Y)) vis[idx(X, Y)] = 1;
					var wall = !inBounds(X, Y) || tiles[idx(X, Y)] === T.WALL;
					if (blocked) {
						if (wall) {
							newStart = rSlope;
							continue;
						}
						blocked = false;
						start = newStart;
					} else if (wall && j < radius) {
						blocked = true;
						cast(j + 1, start, lSlope, xx, xy, yx, yy);
						newStart = rSlope;
					}
				}
				if (blocked) break;
			}
		}
		for (var o = 0; o < 8; o++) cast(1, 1.0, 0.0, mult[0][o], mult[1][o], mult[2][o], mult[3][o]);
		return vis;
	}

	/** True if a straight line between two tiles is free of walls (Bresenham). */
	function lineOfSight(tiles, x0, y0, x1, y1) {
		var dx = Math.abs(x1 - x0),
			dy = -Math.abs(y1 - y0);
		var sx = x0 < x1 ? 1 : -1,
			sy = y0 < y1 ? 1 : -1;
		var err = dx + dy;
		var x = x0,
			y = y0;
		while (!(x === x1 && y === y1)) {
			var e2 = 2 * err;
			if (e2 >= dy) {
				err += dy;
				x += sx;
			}
			if (e2 <= dx) {
				err += dx;
				y += sy;
			}
			if (x === x1 && y === y1) return true;
			if (tiles[idx(x, y)] === T.WALL) return false;
		}
		return true;
	}

	function chebyshev(x0, y0, x1, y1) {
		return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
	}

	DC.MAX_DEPTH = 10;
	DC.W = W;
	DC.H = H;
	DC.T = T;
	DC.DIRS8 = DIRS8;
	DC.hash = hash;
	DC.rng = rng;
	DC.ri = ri;
	DC.idx = idx;
	DC.inBounds = inBounds;
	DC.passable = passable;
	DC.canStep = canStep;
	DC.generate = generate;
	DC.bfs = bfs;
	DC.findPath = findPath;
	DC.fov = fov;
	DC.lineOfSight = lineOfSight;
	DC.chebyshev = chebyshev;
})((window.Deepcore = window.Deepcore || {}));
