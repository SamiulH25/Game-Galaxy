/* Bastion Ring — maps, towers, enemies, waves and the deterministic simulation. No DOM. */
(function (BR) {
	'use strict';

	var COLS = 16,
		ROWS = 10;
	var CAMPAIGN_WAVES = 25;

	// Waypoints are tile coordinates; segments must be axis-aligned. The first point sits off-map (spawn),
	// the last is the core.
	var MAPS = [
		{ id: 'outer', name: 'Outer Ring', blurb: 'A gentle S-bend. Learn the ropes.', credits: 200, difficulty: 0.9, paths: [[[-1, 2], [4, 2], [4, 7], [10, 7], [10, 2], [16, 2]]] },
		{ id: 'spiral', name: 'Spiral Dock', blurb: 'A long spiral with the core at its heart.', credits: 220, difficulty: 1.9, paths: [[[-1, 1], [14, 1], [14, 8], [1, 8], [1, 4], [11, 4], [11, 6], [5, 6]]] },
		{ id: 'cross', name: 'Crossfire', blurb: 'Hairpin turns and tight build space.', credits: 250, difficulty: 2.1, paths: [[[2, -1], [2, 8], [6, 8], [6, 1], [10, 1], [10, 8], [13, 8], [13, -1]]] },
		{ id: 'twin', name: 'Twin Gates', blurb: 'Two lanes, one core. The final test.', credits: 240, difficulty: 0.88, paths: [[[-1, 1], [6, 1], [6, 5], [16, 5]], [[-1, 8], [6, 8], [6, 5], [16, 5]]] }
	];

	var TOWERS = {
		pulse: {
			name: 'Pulse Turret',
			desc: 'Fast single-target shots. Hits air.',
			cost: [50, 45, 85],
			dmg: [6, 9, 14],
			rate: [3, 3.2, 3.6],
			range: [2.6, 2.8, 3.1],
			air: true,
			color: '#7cd4ff',
			specs: {
				gatling: { name: 'Gatling', desc: 'Doubles fire rate.', cost: 150, dmg: 13, rate: 8, range: 3.1 },
				sniper: { name: 'Long Pulse', desc: 'Heavy, long-range shots.', cost: 160, dmg: 48, rate: 1.4, range: 5 }
			}
		},
		cannon: {
			name: 'Cannon',
			desc: 'Splash damage. Cannot hit flyers.',
			cost: [80, 70, 120],
			dmg: [18, 30, 46],
			rate: [0.8, 0.85, 0.9],
			range: [2.8, 3, 3.3],
			splash: [0.9, 1, 1.1],
			air: false,
			color: '#ffb36b',
			specs: {
				mortar: { name: 'Mortar', desc: 'Huge range and blast radius.', cost: 210, dmg: 70, rate: 0.6, range: 5.2, splash: 1.6 },
				cluster: { name: 'Cluster Shells', desc: 'Each shell scatters four bomblets.', cost: 200, dmg: 42, rate: 0.9, range: 3.3, splash: 1.1, bomblets: 4 }
			}
		},
		frost: {
			name: 'Frost Coil',
			desc: 'Pulses that slow everything nearby. Hits air.',
			cost: [70, 60, 90],
			dmg: [2, 3, 5],
			rate: [1, 1, 1],
			range: [1.8, 2, 2.2],
			slow: [0.35, 0.45, 0.55],
			air: true,
			pulse: true,
			color: '#9feaff',
			specs: {
				cryo: { name: 'Cryo Core', desc: 'Deeper slow; may freeze solid.', cost: 170, dmg: 6, slow: 0.7, freeze: 0.12, range: 2.4 },
				brittle: { name: 'Brittle Field', desc: 'Slowed enemies take +30% damage.', cost: 160, dmg: 6, slow: 0.5, brittle: 0.3, range: 2.4 }
			}
		},
		tesla: {
			name: 'Tesla Arc',
			desc: 'Lightning that chains between enemies. Hits air.',
			cost: [110, 90, 140],
			dmg: [14, 20, 30],
			rate: [1, 1.05, 1.1],
			range: [2.4, 2.6, 2.8],
			chain: [3, 3, 4],
			air: true,
			color: '#c9a0ff',
			specs: {
				storm: { name: 'Storm Arc', desc: 'Chains through seven enemies.', cost: 230, dmg: 34, chain: 7, rate: 1.1, range: 2.9 },
				overload: { name: 'Overload', desc: 'Bigger arcs that stun.', cost: 220, dmg: 44, chain: 4, stun: 0.35, rate: 1.1, range: 2.9 }
			}
		},
		lance: {
			name: 'Lance',
			desc: 'Long-range heavy beam that ignores armor. Hits air.',
			cost: [140, 120, 180],
			dmg: [60, 95, 150],
			rate: [0.4, 0.42, 0.45],
			range: [4.5, 5, 5.5],
			pierceArmor: true,
			air: true,
			color: '#ff7ab8',
			specs: {
				rail: { name: 'Railgun', desc: 'Pierces every enemy in a line.', cost: 270, dmg: 180, rate: 0.45, range: 6, pierce: true },
				exec: { name: 'Executioner', desc: 'Instantly destroys non-bosses under 20% hull.', cost: 250, dmg: 165, rate: 0.5, range: 5.5, execute: 0.2 }
			}
		},
		beacon: {
			name: 'Beacon',
			desc: 'Boosts the damage of nearby towers.',
			cost: [90, 80, 120],
			aura: [0.15, 0.25, 0.35],
			range: [1.6, 1.8, 2.0],
			support: true,
			color: '#ffe36b',
			specs: {
				overclock: { name: 'Overclock', desc: 'Also boosts fire rate by 30%.', cost: 190, aura: 0.35, rateAura: 0.3, range: 2.0 },
				array: { name: 'Targeting Array', desc: 'Also adds +0.6 range.', cost: 180, aura: 0.3, rangeAura: 0.6, range: 2.0 }
			}
		}
	};

	var ENEMIES = {
		runner: { name: 'Runner', hp: 28, speed: 1.7, reward: 4, color: '#ff8a6b', size: 0.18 },
		grunt: { name: 'Grunt', hp: 55, speed: 1.05, reward: 5, color: '#ffb36b', size: 0.22 },
		swarm: { name: 'Swarm', hp: 13, speed: 1.45, reward: 2, color: '#ff6bd0', size: 0.13 },
		brute: { name: 'Brute', hp: 170, speed: 0.7, reward: 13, armor: 6, color: '#c08bff', size: 0.3 },
		flyer: { name: 'Flyer', hp: 46, speed: 1.3, reward: 8, fly: true, color: '#7cf0ff', size: 0.2 },
		shielded: { name: 'Warden', hp: 70, shield: 60, speed: 0.95, reward: 11, color: '#6bb8ff', size: 0.24 },
		splitter: { name: 'Splitter', hp: 90, speed: 0.95, reward: 8, split: 'runner', count: 3, color: '#9dff8a', size: 0.25 },
		boss: { name: 'Dreadnought', hp: 1400, speed: 0.48, reward: 150, armor: 10, lives: 10, boss: true, color: '#ff4d6b', size: 0.42 }
	};

	var UNLOCK = { runner: 1, grunt: 1, swarm: 3, brute: 5, flyer: 6, shielded: 8, splitter: 11 };
	var COST = { runner: 1, grunt: 1.6, swarm: 0.45, brute: 4, flyer: 2, shielded: 3.2, splitter: 3 };
	var GAP = { runner: 0.55, grunt: 0.8, swarm: 0.22, brute: 1.4, flyer: 0.9, shielded: 1.1, splitter: 1.2 };

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

	function hpMul(n) {
		return 1 + 0.15 * (n - 1) + 0.013 * (n - 1) * (n - 1);
	}

	/** Spawn schedule for wave n: [{t, type, path}]. */
	function waveSpawns(map, n) {
		var r = rng(hash(map.id + ':wave' + n));
		var list = [];
		var t = 0;
		var paths = map.paths.length;
		var types = Object.keys(UNLOCK).filter(function (k) {
			return UNLOCK[k] <= n;
		});
		var budget = 6 + n * 8 + n * n * 0.45;
		var boss = n % 10 === 0 || n === CAMPAIGN_WAVES;
		if (boss) budget *= 0.55;
		var groups = 1 + Math.floor(r() * Math.min(3, 1 + n / 6));
		for (var g = 0; g < groups; g++) {
			var type = g === 0 && n >= 3 && r() < 0.5 ? types[types.length - 1] : types[Math.floor(r() * types.length)];
			var count = Math.max(1, Math.round(budget / groups / COST[type]));
			var path = Math.floor(r() * paths);
			for (var i = 0; i < count; i++) {
				list.push({ t: t, type: type, path: paths > 1 && type !== 'flyer' ? (path + (i % 2)) % paths : path });
				t += GAP[type];
			}
			t += 1.2;
		}
		if (boss) {
			list.push({ t: t + 0.5, type: 'boss', path: 0 });
			if (n >= 20 && paths > 1) list.push({ t: t + 1.5, type: 'boss', path: 1 });
		}
		return list;
	}

	function previewTypes(map, n) {
		var seen = {};
		waveSpawns(map, n).forEach(function (s) {
			seen[s.type] = (seen[s.type] || 0) + 1;
		});
		return seen;
	}

	// ── Geometry ──────────────────────────────────────────────────────

	function buildPathData(map) {
		var pathTiles = {};
		var lanes = map.paths.map(function (wps) {
			var pts = wps.map(function (p) {
				return [p[0] + 0.5, p[1] + 0.5];
			});
			var segs = [];
			var total = 0;
			for (var i = 1; i < pts.length; i++) {
				var a = pts[i - 1],
					b = pts[i];
				var len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
				segs.push({ a: a, b: b, len: len, start: total });
				total += len;
				// Mark tiles along the segment.
				var steps = Math.round(len);
				for (var k = 0; k <= steps; k++) {
					var x = Math.floor(a[0] + ((b[0] - a[0]) * k) / Math.max(1, steps)),
						y = Math.floor(a[1] + ((b[1] - a[1]) * k) / Math.max(1, steps));
					if (x >= 0 && y >= 0 && x < COLS && y < ROWS) pathTiles[x + ',' + y] = true;
				}
			}
			return { pts: pts, segs: segs, length: total };
		});
		return { lanes: lanes, pathTiles: pathTiles };
	}

	function pointAt(lane, s) {
		var segs = lane.segs;
		for (var i = 0; i < segs.length; i++) {
			var g = segs[i];
			if (s <= g.start + g.len || i === segs.length - 1) {
				var f = Math.max(0, Math.min(1, (s - g.start) / g.len));
				return [g.a[0] + (g.b[0] - g.a[0]) * f, g.a[1] + (g.b[1] - g.a[1]) * f];
			}
		}
		return lane.pts[lane.pts.length - 1];
	}

	// ── Simulation ────────────────────────────────────────────────────

	function Sim(mapIndex, opts) {
		opts = opts || {};
		this.mapIndex = mapIndex;
		this.map = MAPS[mapIndex];
		var pd = buildPathData(this.map);
		this.lanes = pd.lanes;
		this.pathTiles = pd.pathTiles;
		this.credits = this.map.credits;
		this.lives = 20;
		this.wave = 0;
		this.endless = !!opts.endless;
		this.towers = [];
		this.enemies = [];
		this.projectiles = [];
		this.effects = [];
		this.spawnQueue = [];
		this.time = 0;
		this.waveTime = 0;
		this.uid = 0;
		this.running = false;
		this.over = null;
		this.events = [];
		this.stats = { kills: 0, spent: 0, earned: 0, leaked: 0, bossKills: 0, maxChain: 0, score: 0 };
	}

	Sim.prototype.canBuild = function (x, y) {
		if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
		if (this.pathTiles[x + ',' + y]) return false;
		return !this.towerAt(x, y);
	};

	Sim.prototype.towerAt = function (x, y) {
		for (var i = 0; i < this.towers.length; i++) if (this.towers[i].x === x && this.towers[i].y === y) return this.towers[i];
		return null;
	};

	Sim.prototype.build = function (type, x, y) {
		var cost = TOWERS[type].cost[0];
		if (!this.canBuild(x, y) || this.credits < cost) return null;
		this.credits -= cost;
		this.stats.spent += cost;
		var t = { id: ++this.uid, type: type, x: x, y: y, level: 1, spec: null, cd: 0, mode: 'first', spent: cost, angle: -Math.PI / 2, kills: 0 };
		this.towers.push(t);
		return t;
	};

	Sim.prototype.upgradeCost = function (t) {
		var def = TOWERS[t.type];
		if (t.level < 3) return def.cost[t.level];
		return null;
	};

	Sim.prototype.upgrade = function (t) {
		var c = this.upgradeCost(t);
		if (c === null || this.credits < c) return false;
		this.credits -= c;
		this.stats.spent += c;
		t.spent += c;
		t.level++;
		return true;
	};

	Sim.prototype.specialize = function (t, key) {
		var spec = TOWERS[t.type].specs[key];
		if (t.level !== 3 || t.spec || !spec || this.credits < spec.cost) return false;
		this.credits -= spec.cost;
		this.stats.spent += spec.cost;
		t.spent += spec.cost;
		t.spec = key;
		t.level = 4;
		return true;
	};

	Sim.prototype.sell = function (t) {
		var refund = Math.floor(t.spent * (this.running ? 0.6 : 0.75));
		this.credits += refund;
		this.towers.splice(this.towers.indexOf(t), 1);
		return refund;
	};

	/** Effective stats of a tower, including specialisation and beacon auras. */
	Sim.prototype.stats_ = function (t) {
		var def = TOWERS[t.type];
		var L = Math.min(3, t.level) - 1;
		var s = { dmg: def.dmg ? def.dmg[L] : 0, rate: def.rate ? def.rate[L] : 0, range: def.range[L], splash: def.splash ? def.splash[L] : 0, slow: def.slow ? def.slow[L] : 0, chain: def.chain ? def.chain[L] : 0, aura: def.aura ? def.aura[L] : 0 };
		if (t.spec) {
			var sp = def.specs[t.spec];
			for (var k in sp) if (typeof sp[k] === 'number' && k !== 'cost') s[k] = sp[k];
			s.pierce = sp.pierce;
		}
		if (!def.support) {
			var dmgMul = 1,
				rateMul = 1,
				rangeAdd = 0;
			for (var i = 0; i < this.towers.length; i++) {
				var b = this.towers[i];
				if (b.type !== 'beacon' || b === t) continue;
				var bs = this.stats_(b);
				if (Math.hypot(b.x - t.x, b.y - t.y) <= bs.range + 0.01) {
					dmgMul = Math.max(dmgMul, 1 + bs.aura);
					if (bs.rateAura) rateMul = Math.max(rateMul, 1 + bs.rateAura);
					if (bs.rangeAura) rangeAdd = Math.max(rangeAdd, bs.rangeAura);
				}
			}
			s.dmg *= dmgMul;
			s.rate *= rateMul;
			s.range += rangeAdd;
		}
		return s;
	};

	Sim.prototype.startWave = function () {
		if (this.over) return 0;
		var bonus = 0;
		// Calling a wave early while the previous one is still flying earns a bonus.
		if (this.running && this.spawnQueue.length === 0) bonus = 10 + this.wave * 2;
		this.wave++;
		this.running = true;
		this.waveTime = 0;
		var n = this.wave;
		var self = this;
		var list = waveSpawns(this.map, n);
		this.spawnQueue = this.spawnQueue.concat(
			list.map(function (s) {
				return { t: s.t, type: s.type, path: s.path, n: n };
			})
		);
		if (bonus) {
			this.credits += bonus;
			this.events.push({ type: 'bonus', amount: bonus });
		}
		return bonus;
	};

	Sim.prototype.spawn = function (type, path, n, s) {
		var def = ENEMIES[type];
		// Map difficulty ramps in over the first 15 waves so openings stay fair.
		var mul = hpMul(n) * (1 + ((this.map.difficulty || 1) - 1) * Math.min(1, (n - 1) / 14));
		var hp = Math.round(def.hp * mul);
		var e = { id: ++this.uid, type: type, path: path, s: s || 0, hp: hp, maxHp: hp, shield: def.shield ? Math.round(def.shield * mul) : 0, maxShield: def.shield ? Math.round(def.shield * mul) : 0, sinceHit: 9, slow: 0, slowT: 0, brittle: 0, stun: 0, x: 0, y: 0, dead: false, n: n };
		this.place(e);
		this.enemies.push(e);
		return e;
	};

	Sim.prototype.place = function (e) {
		var p = pointAt(this.lanes[e.path], e.s);
		e.x = p[0];
		e.y = p[1];
	};

	Sim.prototype.remaining = function (e) {
		return this.lanes[e.path].length - e.s;
	};

	Sim.prototype.damage = function (e, amount, opts) {
		if (e.dead) return;
		opts = opts || {};
		var def = ENEMIES[e.type];
		var d = amount;
		if (def.armor && !opts.pierceArmor) d = Math.max(d * 0.2, d - def.armor);
		if (e.brittle > 0 && e.slowT > 0) d *= 1 + e.brittle;
		if (opts.execute && !def.boss && (e.hp - d) / e.maxHp < opts.execute) d = e.hp + e.shield;
		e.sinceHit = 0;
		if (e.shield > 0) {
			var absorbed = Math.min(e.shield, d);
			e.shield -= absorbed;
			d -= absorbed;
		}
		e.hp -= d;
		if (e.hp <= 0) this.kill(e, opts.tower);
	};

	Sim.prototype.kill = function (e, tower) {
		if (e.dead) return;
		e.dead = true;
		var def = ENEMIES[e.type];
		var reward = def.reward + (e.n > 25 ? Math.floor((e.n - 25) / 3) : 0);
		this.credits += reward;
		this.stats.earned += reward;
		this.stats.kills++;
		this.stats.score += reward;
		if (def.boss) {
			this.stats.bossKills++;
			this.events.push({ type: 'bosskill' });
		}
		if (tower) tower.kills++;
		this.effects.push({ type: 'pop', x: e.x, y: e.y, color: def.color, t: 0, size: def.size });
		if (def.split) for (var i = 0; i < def.count; i++) this.spawn(def.split, e.path, e.n, Math.max(0, e.s - i * 0.25));
	};

	Sim.prototype.inRange = function (t, s) {
		var air = TOWERS[t.type].air;
		var self = this;
		return this.enemies.filter(function (e) {
			return !e.dead && (air || !ENEMIES[e.type].fly) && Math.hypot(e.x - (t.x + 0.5), e.y - (t.y + 0.5)) <= s.range;
		});
	};

	Sim.prototype.pickTarget = function (t, list) {
		if (!list.length) return null;
		var self = this;
		var key = {
			first: function (e) {
				return -self.remaining(e);
			},
			last: function (e) {
				return self.remaining(e);
			},
			strong: function (e) {
				return e.hp + e.shield;
			},
			close: function (e) {
				return -Math.hypot(e.x - t.x - 0.5, e.y - t.y - 0.5);
			}
		}[t.mode];
		var best = list[0],
			bv = key(best);
		for (var i = 1; i < list.length; i++) {
			var v = key(list[i]);
			if (v > bv) {
				bv = v;
				best = list[i];
			}
		}
		return best;
	};

	Sim.prototype.fire = function (t, s, target) {
		var cx = t.x + 0.5,
			cy = t.y + 0.5;
		t.angle = Math.atan2(target.y - cy, target.x - cx);
		var def = TOWERS[t.type];
		var self = this;
		if (t.type === 'pulse') {
			this.projectiles.push({ kind: 'bolt', x: cx, y: cy, target: target, speed: 9, dmg: s.dmg, tower: t, color: def.color });
		} else if (t.type === 'cannon') {
			this.projectiles.push({ kind: 'shell', x: cx, y: cy, sx: cx, sy: cy, tx: target.x, ty: target.y, t: 0, dur: Math.max(0.25, Math.hypot(target.x - cx, target.y - cy) / 6), dmg: s.dmg, splash: s.splash, bomblets: s.bomblets || 0, tower: t });
		} else if (t.type === 'tesla') {
			var chain = [target];
			var cur = target;
			while (chain.length < s.chain) {
				var next = null,
					nd = 1.6;
				for (var i = 0; i < this.enemies.length; i++) {
					var e = this.enemies[i];
					if (e.dead || chain.indexOf(e) !== -1) continue;
					var d = Math.hypot(e.x - cur.x, e.y - cur.y);
					if (d < nd) {
						nd = d;
						next = e;
					}
				}
				if (!next) break;
				chain.push(next);
				cur = next;
			}
			this.stats.maxChain = Math.max(this.stats.maxChain, chain.length);
			var pts = [[cx, cy]].concat(
				chain.map(function (e) {
					return [e.x, e.y];
				})
			);
			this.effects.push({ type: 'arc', pts: pts, t: 0, color: def.color });
			chain.forEach(function (e, i) {
				self.damage(e, s.dmg * Math.pow(0.85, i), { tower: t });
				if (s.stun && !ENEMIES[e.type].boss) e.stun = Math.max(e.stun, s.stun);
			});
		} else if (t.type === 'lance') {
			var hits = [target];
			if (s.pierce) {
				var dx = Math.cos(t.angle),
					dy = Math.sin(t.angle);
				hits = this.enemies.filter(function (e) {
					if (e.dead) return false;
					var px = e.x - cx,
						py = e.y - cy;
					var along = px * dx + py * dy;
					var perp = Math.abs(px * dy - py * dx);
					return along > 0 && along <= s.range + 0.5 && perp < 0.35;
				});
			}
			var len = s.pierce ? s.range + 0.5 : Math.hypot(target.x - cx, target.y - cy);
			this.effects.push({ type: 'beam', x: cx, y: cy, x2: cx + Math.cos(t.angle) * len, y2: cy + Math.sin(t.angle) * len, t: 0, color: def.color });
			hits.forEach(function (e) {
				self.damage(e, s.dmg, { pierceArmor: true, execute: s.execute, tower: t });
			});
		}
	};

	Sim.prototype.step = function (dt) {
		if (this.over) return;
		this.time += dt;
		var self = this;
		// Spawns
		if (this.running) {
			this.waveTime += dt;
			var due = this.spawnQueue.filter(function (q) {
				return q.t <= self.waveTime;
			});
			if (due.length) {
				this.spawnQueue = this.spawnQueue.filter(function (q) {
					return q.t > self.waveTime;
				});
				due.forEach(function (q) {
					self.spawn(q.type, q.path, q.n);
				});
			}
		}
		// Enemies
		for (var i = 0; i < this.enemies.length; i++) {
			var e = this.enemies[i];
			if (e.dead) continue;
			var def = ENEMIES[e.type];
			if (e.slowT > 0) e.slowT -= dt;
			else e.slow = 0;
			if (e.stun > 0) {
				e.stun -= dt;
				continue;
			}
			e.sinceHit += dt;
			if (e.maxShield && e.sinceHit > 2 && e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + 12 * dt);
			e.s += def.speed * (1 - e.slow) * dt;
			this.place(e);
			if (this.remaining(e) <= 0) {
				e.dead = true;
				var lost = def.lives || 1;
				this.lives -= lost;
				this.stats.leaked += lost;
				this.events.push({ type: 'leak', lives: lost });
				if (this.lives <= 0) {
					this.lives = 0;
					this.over = 'lose';
				}
			}
		}
		// Towers
		var s, list;
		for (var k = 0; k < this.towers.length; k++) {
			var t = this.towers[k];
			var tdef = TOWERS[t.type];
			if (tdef.support) continue;
			s = this.stats_(t);
			t.cd -= dt;
			if (t.cd > 0) continue;
			list = this.inRange(t, s);
			if (!list.length) continue;
			t.cd = 1 / s.rate;
			if (tdef.pulse) {
				this.effects.push({ type: 'ring', x: t.x + 0.5, y: t.y + 0.5, r: s.range, t: 0, color: tdef.color });
				list.forEach(function (e) {
					self.damage(e, s.dmg, { tower: t });
					if (ENEMIES[e.type].boss) {
						e.slow = Math.max(e.slow, s.slow * 0.5);
					} else {
						e.slow = Math.max(e.slow, s.slow);
						if (s.freeze && Math.random() < s.freeze) e.stun = Math.max(e.stun, 0.8);
					}
					e.slowT = 1.6;
					if (s.brittle) e.brittle = s.brittle;
				});
			} else {
				this.fire(t, s, this.pickTarget(t, list));
			}
		}
		// Projectiles
		this.projectiles = this.projectiles.filter(function (p) {
			if (p.kind === 'bolt') {
				if (p.target.dead) return false;
				var dx = p.target.x - p.x,
					dy = p.target.y - p.y;
				var d = Math.hypot(dx, dy);
				var stepLen = p.speed * dt;
				if (d <= stepLen) {
					self.damage(p.target, p.dmg, { tower: p.tower });
					return false;
				}
				p.x += (dx / d) * stepLen;
				p.y += (dy / d) * stepLen;
				return true;
			}
			// Shells arc to where the target was and burst.
			p.t += dt;
			var f = Math.min(1, p.t / p.dur);
			p.x = p.sx + (p.tx - p.sx) * f;
			p.y = p.sy + (p.ty - p.sy) * f;
			if (f >= 1) {
				self.blast(p.tx, p.ty, p.splash, p.dmg, p.tower);
				for (var b = 0; b < p.bomblets; b++) {
					var a = (b / p.bomblets) * Math.PI * 2;
					self.blast(p.tx + Math.cos(a) * 0.7, p.ty + Math.sin(a) * 0.7, 0.55, p.dmg * 0.4, p.tower);
				}
				return false;
			}
			return true;
		});
		this.enemies = this.enemies.filter(function (e) {
			return !e.dead;
		});
		this.effects = this.effects.filter(function (fx) {
			fx.t += dt;
			return fx.t < 0.45;
		});
		// Wave end
		if (this.running && this.spawnQueue.length === 0 && this.enemies.length === 0 && !this.over) {
			this.running = false;
			var bonus = 20 + this.wave * 2;
			this.credits += bonus;
			this.stats.score += this.wave * 25;
			this.events.push({ type: 'waveclear', wave: this.wave, bonus: bonus });
			if (this.wave >= CAMPAIGN_WAVES && !this.endless) {
				this.over = 'win';
				this.stats.score += this.lives * 25;
			}
		}
	};

	Sim.prototype.blast = function (x, y, radius, dmg, tower) {
		var self = this;
		this.effects.push({ type: 'blast', x: x, y: y, r: radius, t: 0 });
		this.enemies.forEach(function (e) {
			if (!e.dead && !ENEMIES[e.type].fly && Math.hypot(e.x - x, e.y - y) <= radius) self.damage(e, dmg, { tower: tower });
		});
	};

	/** Serialisable snapshot between waves. */
	Sim.prototype.snapshot = function () {
		return {
			mapIndex: this.mapIndex,
			credits: this.credits,
			lives: this.lives,
			wave: this.wave,
			endless: this.endless,
			stats: this.stats,
			towers: this.towers.map(function (t) {
				return { type: t.type, x: t.x, y: t.y, level: t.level, spec: t.spec, mode: t.mode, spent: t.spent, kills: t.kills };
			})
		};
	};

	Sim.restore = function (snap) {
		var sim = new Sim(snap.mapIndex, { endless: snap.endless });
		sim.credits = snap.credits;
		sim.lives = snap.lives;
		sim.wave = snap.wave;
		sim.stats = Object.assign(sim.stats, snap.stats);
		snap.towers.forEach(function (t) {
			sim.towers.push(Object.assign({ id: ++sim.uid, cd: 0, angle: -Math.PI / 2 }, t));
		});
		return sim;
	};

	BR.COLS = COLS;
	BR.ROWS = ROWS;
	BR.CAMPAIGN_WAVES = CAMPAIGN_WAVES;
	BR.MAPS = MAPS;
	BR.TOWERS = TOWERS;
	BR.ENEMIES = ENEMIES;
	BR.Sim = Sim;
	BR.previewTypes = previewTypes;
	BR.waveSpawns = waveSpawns;
	BR.buildPathData = buildPathData;
})((window.BastionRing = window.BastionRing || {}));
