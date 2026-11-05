/* Deepcore — turn-based roguelike: rules, AI, rendering, UI. */
(function (DC) {
	'use strict';

	var W = DC.W,
		H = DC.H,
		T = DC.T,
		idx = DC.idx;
	var $ = function (id) {
		return document.getElementById(id);
	};

	// ── Content ───────────────────────────────────────────────────────

	var MONSTERS = {
		crawler: { name: 'Crawler', hp: 5, dmg: [1, 3], speed: 100, xp: 3, depth: 1, color: '#ff7a6b' },
		drone: { name: 'Drone', hp: 5, dmg: [1, 3], range: 5, kite: true, machine: true, speed: 100, xp: 4, depth: 2, color: '#ffd66b' },
		sentry: { name: 'Sentry', hp: 10, dmg: [3, 5], range: 7, stationary: true, machine: true, speed: 100, xp: 6, depth: 3, color: '#ff9d4d' },
		leech: { name: 'Leech', hp: 9, dmg: [2, 4], drain: true, speed: 100, xp: 6, depth: 4, color: '#7dff8a' },
		hulk: { name: 'Hulk', hp: 22, dmg: [5, 8], speed: 50, xp: 12, depth: 5, color: '#b77dff' },
		swarmer: { name: 'Swarmer', hp: 4, dmg: [1, 2], speed: 200, xp: 3, depth: 6, group: 3, color: '#ff7ad9' },
		wraith: { name: 'Wraith', hp: 12, dmg: [3, 5], phase: true, speed: 100, xp: 9, depth: 7, color: '#a99bff' },
		warden: { name: 'Core Warden', hp: 60, dmg: [6, 9], speed: 100, xp: 50, boss: true, machine: true, color: '#ff4dd8' }
	};

	var WEAPONS = {
		wrench: { name: 'Wrench', dmg: [2, 5], tier: 0 },
		baton: { name: 'Shock Baton', dmg: [3, 6], stun: 0.25, tier: 1 },
		cutter: { name: 'Plasma Cutter', dmg: [5, 8], tier: 2 },
		arcblade: { name: 'Arc Blade', dmg: [7, 11], stun: 0.15, tier: 3 }
	};
	var ARMORS = {
		vest: { name: 'Padded Vest', def: 1, tier: 1 },
		hardsuit: { name: 'Hardsuit', def: 2, tier: 2 },
		exoframe: { name: 'Exo-frame', def: 3, tier: 3 }
	};
	var ITEMS = {
		medkit: { name: 'Medkit', desc: 'Repair 12 HP.', color: '#ff5b6b' },
		stim: { name: 'Adrenal Stim', desc: 'Heal 4 and +2 melee damage for 15 turns.', color: '#6fe3a1' },
		grenade: { name: 'Frag Grenade', desc: 'Throw up to 6 tiles: 8–12 damage in a 3×3 blast.', target: 6, color: '#ffa04d' },
		emp: { name: 'EMP Charge', desc: 'Stun every machine you can see for 4 turns and deal 3 damage.', color: '#6bb8ff' },
		blink: { name: 'Blink Module', desc: 'Teleport to a visible tile up to 7 tiles away.', target: 7, color: '#c08bff' },
		scanner: { name: 'Deck Scanner', desc: 'Reveal the whole deck map.', color: '#5ff0e0' }
	};
	var PERKS = {
		tough: { name: 'Toughened', desc: '+6 max HP.', max: 9 },
		brawler: { name: 'Brawler', desc: '+1 melee damage.', max: 9 },
		plating: { name: 'Reinforced Plating', desc: '+1 armor.', max: 2 },
		medic: { name: 'Field Medic', desc: 'Medkits heal 6 more.', max: 1 },
		scavenger: { name: 'Scavenger', desc: '+50% scrap from every pile.', max: 1 },
		marksman: { name: 'Marksman', desc: 'Sidearm +2 damage and +1 range.', max: 3 },
		secondwind: { name: 'Second Wind', desc: 'Regenerate 1 HP every 8 turns (stacks).', max: 3 },
		deadeye: { name: 'Demolitions', desc: 'Grenades deal 4 more damage.', max: 1 }
	};

	// ── State ─────────────────────────────────────────────────────────

	var meta = { best: 0, wins: 0, deepest: 0, runs: 0, ach: {} };
	var G = null; // current dive
	var settings = { muted: false, reducedMotion: false };
	var view = { w: 1, h: 1, dpr: 1, tile: 32 };
	var canvas = $('view');
	var ctx = canvas.getContext('2d');
	var floats = [];
	var flashes = [];
	var targeting = null; // { kind, range, cursor:[x,y], valid(x,y) }
	var autoPath = null;
	var autoTimer = 0;
	var saveTimer = 0;
	var dmap = null;

	function rand(r, a, b) {
		return a + Math.floor(r() * (b - a + 1));
	}
	function R() {
		return G.r();
	}
	function dateKey() {
		var d = new Date();
		return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
	}

	function newDive(daily) {
		var seed = daily ? 'daily:' + daily : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		G = {
			v: 1,
			seed: seed,
			daily: daily || null,
			depth: 0,
			turn: 0,
			rngState: DC.hash(seed),
			p: { x: 0, y: 0, hp: 36, maxHp: 36, lvl: 1, xp: 0, weapon: 'wrench', armor: null, sidearm: false, cells: 0, scrap: 0, inv: { medkit: 2, grenade: 1 }, perks: {}, stim: 0 },
			stats: { kills: 0, meds: 0, killsSidearm: 0, deckDamage: 0, deckKills: 0, ghostDecks: 0 },
			log: [],
			over: null,
			wardenDead: false
		};
		G.r = makeR();
		meta.runs++;
		descend();
	}

	/** Persistent PRNG: its state lives in G so saves resume the same sequence. */
	function makeR() {
		return function () {
			var a = (G.rngState = (G.rngState + 0x6d2b79f5) >>> 0);
			var t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function log(msg, tone) {
		G.log.push({ t: msg, c: tone || '' });
		if (G.log.length > 40) G.log.shift();
		renderLog();
	}

	function descend() {
		if (G.depth > 0) {
			if (G.stats.deckDamage === 0 && G.depth >= 3) unlock('clean-deck');
			if (G.stats.deckKills === 0) {
				G.stats.ghostDecks++;
				if (G.stats.ghostDecks >= 3) unlock('ghost');
			} else G.stats.ghostDecks = 0;
		}
		G.depth++;
		G.stats.deckDamage = 0;
		G.stats.deckKills = 0;
		meta.deepest = Math.max(meta.deepest, G.depth);
		if (G.depth >= 5) unlock('deck-5');
		var r = DC.rng(DC.hash(G.seed + ':deck' + G.depth));
		var map = DC.generate(G.depth, r);
		G.tiles = map.tiles;
		G.lift = map.lift || null;
		G.core = map.core || null;
		G.fab = map.fab || null;
		G.fabStock = null;
		G.explored = new Uint8Array(W * H);
		G.monsters = [];
		G.items = [];
		G.p.x = map.start[0];
		G.p.y = map.start[1];
		populate(map, r);
		log(G.depth === DC.MAX_DEPTH ? 'Deck ' + G.depth + '. The Core hums somewhere ahead.' : 'Deck ' + G.depth + '. Find the lift down.', 'info');
		computeFov();
		persist(true);
	}

	function freeTileIn(room, r) {
		for (var t = 0; t < 30; t++) {
			var x = room.x + rand(r, 0, room.w - 1),
				y = room.y + rand(r, 0, room.h - 1);
			if (G.tiles[idx(x, y)] !== T.FLOOR) continue;
			if (x === G.p.x && y === G.p.y) continue;
			if (monsterAt(x, y) || itemAt(x, y)) continue;
			return [x, y];
		}
		return null;
	}

	function populate(map, r) {
		var d = G.depth;
		var rooms = map.rooms.filter(function (rm) {
			return !(G.p.x >= rm.x && G.p.x < rm.x + rm.w && G.p.y >= rm.y && G.p.y < rm.y + rm.h);
		});
		var kinds = Object.keys(MONSTERS).filter(function (k) {
			return !MONSTERS[k].boss && MONSTERS[k].depth <= d;
		});
		var count = 3 + Math.round(d * 1.1);
		for (var i = 0; i < count; i++) {
			var kind = kinds[Math.floor(Math.pow(r(), 0.7) * kinds.length)];
			var room = rooms[rand(r, 0, rooms.length - 1)];
			var n = MONSTERS[kind].group || 1;
			for (var g = 0; g < n; g++) {
				var pos = freeTileIn(room, r);
				if (pos) spawn(kind, pos[0], pos[1]);
			}
		}
		if (d === DC.MAX_DEPTH) {
			var c = map.coreRoom;
			var wpos = freeTileIn(c, r) || [c.cx + 1, c.cy];
			spawn('warden', wpos[0], wpos[1]);
		}
		var drop = function (kind, extra) {
			var room = rooms.length ? rooms[rand(r, 0, rooms.length - 1)] : map.rooms[0];
			var pos = freeTileIn(room, r);
			if (pos) G.items.push(Object.assign({ x: pos[0], y: pos[1], kind: kind }, extra || {}));
		};
		var consumables = ['medkit', 'medkit', 'medkit', 'stim', 'grenade', 'emp', 'blink', 'scanner'];
		for (var k = 0; k < 3 + rand(r, 0, 2); k++) drop(consumables[rand(r, 0, consumables.length - 1)]);
		for (var s = 0; s < 3 + rand(r, 0, 3); s++) drop('scrap', { n: 5 + rand(r, 0, 5 + d) });
		if (d >= 2) for (var c2 = 0; c2 < 1 + rand(r, 0, 1); c2++) drop('cells', { n: 3 + rand(r, 0, 3) });
		if ((d === 2 || d === 3) && !G.p.sidearm && r() < (d === 3 ? 1 : 0.6)) drop('sidearm');
		// Equipment: one tier ahead of what the depth "expects", rarely.
		var tier = Math.min(3, 1 + Math.floor((d - 1) / 3));
		if (r() < 0.55) drop('weapon', { id: ['wrench', 'baton', 'cutter', 'arcblade'][Math.min(3, tier + (r() < 0.2 ? 1 : 0))] });
		if (r() < 0.45) drop('armor', { id: ['vest', 'vest', 'hardsuit', 'exoframe'][Math.min(3, tier + (r() < 0.2 ? 1 : 0))] });
	}

	function spawn(kind, x, y) {
		var def = MONSTERS[kind];
		var hp = Math.round(def.hp * (def.boss ? 1 : 1 + Math.max(0, G.depth - def.depth) * 0.12));
		var m = { id: (G.uid = (G.uid || 0) + 1), kind: kind, x: x, y: y, hp: hp, maxHp: hp, energy: 0, stunned: 0, awake: false, t: 0 };
		G.monsters.push(m);
		return m;
	}

	function monsterAt(x, y) {
		for (var i = 0; i < G.monsters.length; i++) if (G.monsters[i].x === x && G.monsters[i].y === y && G.monsters[i].hp > 0) return G.monsters[i];
		return null;
	}
	function itemAt(x, y) {
		for (var i = 0; i < G.items.length; i++) if (G.items[i].x === x && G.items[i].y === y) return G.items[i];
		return null;
	}

	var vis = new Uint8Array(W * H);
	function computeFov() {
		vis = DC.fov(G.tiles, G.p.x, G.p.y, 8);
		for (var i = 0; i < vis.length; i++) if (vis[i]) G.explored[i] = 1;
	}
	function visible(x, y) {
		return DC.inBounds(x, y) && vis[idx(x, y)] === 1;
	}

	// ── Player stats ──────────────────────────────────────────────────

	function perk(id) {
		return G.p.perks[id] || 0;
	}
	function def() {
		return (G.p.armor ? ARMORS[G.p.armor].def : 0) + perk('plating');
	}
	function meleeRange() {
		var w = WEAPONS[G.p.weapon];
		var bonus = perk('brawler') + (G.p.stim > 0 ? 2 : 0);
		return [w.dmg[0] + bonus, w.dmg[1] + bonus];
	}
	function sidearmRange() {
		return 6 + perk('marksman');
	}
	function xpNeeded() {
		return 4 * G.p.lvl * G.p.lvl + 8;
	}

	// ── Combat ────────────────────────────────────────────────────────

	function hurtMonster(m, dmg, how) {
		m.hp -= dmg;
		m.awake = true;
		floatText(m.x, m.y, '-' + dmg, '#ffd6d6');
		if (m.hp <= 0) {
			var def = MONSTERS[m.kind];
			log((def.boss ? 'The ' : 'The ') + def.name + ' is destroyed.', 'good');
			G.stats.kills++;
			G.stats.deckKills++;
			if (how === 'sidearm') {
				G.stats.killsSidearm++;
				if (G.stats.killsSidearm >= 20) unlock('marksman');
			}
			if (m.kind === 'hulk') unlock('hulk-slayer');
			unlock('first-blood');
			gainXp(def.xp);
			if (def.boss) {
				G.wardenDead = true;
				unlock('warden');
				log('The Warden falls. The Core is unguarded — reach it!', 'info');
			}
			sfx.kill();
			return true;
		}
		sfx.hit();
		return false;
	}

	function gainXp(n) {
		G.p.xp += n;
		while (G.p.xp >= xpNeeded()) {
			G.p.xp -= xpNeeded();
			G.p.lvl++;
			G.p.maxHp += 3;
			G.p.hp = Math.min(G.p.maxHp, G.p.hp + 8);
			if (G.p.lvl >= 8) unlock('level-8');
			G.pendingPerks = (G.pendingPerks || 0) + 1;
			log('Level ' + G.p.lvl + '! Choose an upgrade.', 'info');
		}
	}

	function hurtPlayer(dmg, src, pierce) {
		var d = pierce ? dmg : Math.max(1, dmg - def());
		G.p.hp -= d;
		G.stats.deckDamage += d;
		floatText(G.p.x, G.p.y, '-' + d, '#ff6b6b');
		sfx.hurt();
		interruptAuto();
		if (G.p.hp <= 0 && !G.over) {
			G.p.hp = 0;
			G.over = 'dead';
			log('Your suit fails. ' + (src ? 'Killed by a ' + src + '.' : ''), 'bad');
		}
		return d;
	}

	function playerAttack(m) {
		var r = meleeRange();
		var dmg = rand(R, r[0], r[1]);
		var w = WEAPONS[G.p.weapon];
		var killed = hurtMonster(m, dmg, 'melee');
		if (!killed) {
			log('You hit the ' + MONSTERS[m.kind].name + ' for ' + dmg + '.');
			if (w.stun && R() < w.stun) {
				m.stunned = 2;
				log('It is stunned!', 'good');
			}
		}
	}

	// ── Turn engine ───────────────────────────────────────────────────

	/** Run after every player action that takes time. */
	function endTurn() {
		G.turn++;
		var p = G.p;
		if (p.stim > 0) p.stim--;
		if (perk('secondwind') && G.turn % 8 === 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + perk('secondwind'));
		dmap = DC.bfs(G.tiles, p.x, p.y);
		for (var i = 0; i < G.monsters.length && !G.over; i++) {
			var m = G.monsters[i];
			if (m.hp <= 0) continue;
			m.energy += MONSTERS[m.kind].speed;
			while (m.energy >= 100 && !G.over && m.hp > 0) {
				m.energy -= 100;
				act(m);
			}
		}
		G.monsters = G.monsters.filter(function (m) {
			return m.hp > 0;
		});
		computeFov();
		if (G.over) return gameOver(false);
		if (G.pendingPerks) showPerks();
		persist();
	}

	function act(m) {
		var def = MONSTERS[m.kind];
		var p = G.p;
		m.t++;
		if (m.stunned > 0) {
			m.stunned--;
			return;
		}
		var dist = DC.chebyshev(m.x, m.y, p.x, p.y);
		var canSee = visible(m.x, m.y);
		if (!m.awake) {
			if (canSee && (dist <= 6 || R() < 0.5)) {
				m.awake = true;
				if (def.boss) log('The Core Warden turns its sensors on you.', 'bad');
			}
			return;
		}
		if (def.boss) {
			if (m.t % 6 === 0) {
				var made = 0;
				for (var d = 0; d < 8 && made < 2; d++) {
					var sx = m.x + DC.DIRS8[d][0],
						sy = m.y + DC.DIRS8[d][1];
					if (DC.passable(G.tiles, sx, sy) && !monsterAt(sx, sy) && !(sx === p.x && sy === p.y)) {
						var c = spawn('crawler', sx, sy);
						c.awake = true;
						made++;
					}
				}
				if (made) log('The Warden releases crawlers!', 'bad');
				return;
			}
			if (m.t % 4 === 0 && dist <= 2) {
				log('A shock pulse ripples out from the Warden!', 'bad');
				flash(m.x, m.y, 2.5, '#ff4dd8');
				hurtPlayer(4, 'shock pulse', true);
				return;
			}
		}
		// Ranged attackers
		if (def.range && dist <= def.range && DC.lineOfSight(G.tiles, m.x, m.y, p.x, p.y) && !(def.kite && dist === 1)) {
			var dmg = rand(R, def.dmg[0], def.dmg[1]);
			beam(m.x, m.y, p.x, p.y, def.color);
			var dealt = hurtPlayer(dmg, def.name);
			log('The ' + def.name + ' fires: ' + dealt + ' damage.', 'bad');
			return;
		}
		if (def.stationary) return;
		if (dist === 1 && !(def.kite && def.range)) {
			var d2 = rand(R, def.dmg[0], def.dmg[1]);
			var dealt2 = hurtPlayer(d2, def.name);
			log('The ' + def.name + ' hits you for ' + dealt2 + '.', 'bad');
			if (def.drain) m.hp = Math.min(m.maxHp, m.hp + dealt2);
			return;
		}
		// Movement
		var best = null;
		if (def.phase) {
			var nx = m.x + Math.sign(p.x - m.x),
				ny = m.y + Math.sign(p.y - m.y);
			if (DC.inBounds(nx, ny) && !monsterAt(nx, ny) && !(nx === p.x && ny === p.y)) best = [nx, ny];
		} else {
			var cur = dmap[idx(m.x, m.y)];
			var want = def.kite && dist <= 2 ? 1 : -1; // kiters back away when close
			var score = cur;
			for (var k = 0; k < 8; k++) {
				var dx = DC.DIRS8[k][0],
					dy = DC.DIRS8[k][1];
				if (!DC.canStep(G.tiles, m.x, m.y, dx, dy)) continue;
				var tx = m.x + dx,
					ty = m.y + dy;
				if (monsterAt(tx, ty) || (tx === p.x && ty === p.y)) continue;
				var v = dmap[idx(tx, ty)];
				if (v < 0) continue;
				if ((want < 0 && v < score) || (want > 0 && v > score)) {
					score = v;
					best = [tx, ty];
				}
			}
		}
		if (best) {
			m.x = best[0];
			m.y = best[1];
		}
	}

	// ── Player actions ────────────────────────────────────────────────

	function tryMove(dx, dy) {
		if (!G || G.over || targeting || modalOpen()) return false;
		var p = G.p;
		var tx = p.x + dx,
			ty = p.y + dy;
		var m = monsterAt(tx, ty);
		if (m && DC.chebyshev(p.x, p.y, tx, ty) === 1) {
			playerAttack(m);
			endTurn();
			draw();
			return true;
		}
		if (G.fab && tx === G.fab[0] && ty === G.fab[1]) {
			showFab();
			return false;
		}
		if (!DC.canStep(G.tiles, p.x, p.y, dx, dy)) return false;
		p.x = tx;
		p.y = ty;
		pickUp();
		if (G.core && tx === G.core[0] && ty === G.core[1]) {
			if (G.wardenDead) return gameOver(true);
			log('The Core is sealed while the Warden stands.', 'bad');
		}
		if (G.lift && tx === G.lift[0] && ty === G.lift[1]) log('A lift. Press > or tap Descend to go deeper.', 'info');
		endTurn();
		draw();
		return true;
	}

	function pickUp() {
		var it = itemAt(G.p.x, G.p.y);
		if (!it) return;
		var p = G.p;
		G.items.splice(G.items.indexOf(it), 1);
		sfx.pick();
		if (it.kind === 'scrap') {
			var n = Math.round(it.n * (perk('scavenger') ? 1.5 : 1));
			p.scrap += n;
			log('Salvaged ' + n + ' scrap.');
			if (p.scrap >= 200) unlock('scavenger');
		} else if (it.kind === 'cells') {
			p.cells += it.n;
			log('Picked up ' + it.n + ' energy cells.');
		} else if (it.kind === 'sidearm') {
			p.sidearm = true;
			p.cells += 6;
			log('Found an Arc Pistol! Press F (or tap Fire) to shoot.', 'good');
		} else if (it.kind === 'weapon') {
			var w = WEAPONS[it.id];
			if (w.tier > WEAPONS[p.weapon].tier) {
				p.weapon = it.id;
				log('Equipped ' + w.name + ' (' + w.dmg[0] + '–' + w.dmg[1] + ').', 'good');
			} else {
				p.scrap += 10;
				log('A ' + w.name + ' — no better than yours. Stripped for 10 scrap.');
			}
		} else if (it.kind === 'armor') {
			var a = ARMORS[it.id];
			if (!p.armor || a.tier > ARMORS[p.armor].tier) {
				p.armor = it.id;
				log('Equipped ' + a.name + ' (+' + a.def + ' armor).', 'good');
			} else {
				p.scrap += 10;
				log('A ' + a.name + ' — stripped for 10 scrap.');
			}
		} else {
			p.inv[it.kind] = (p.inv[it.kind] || 0) + 1;
			log('Picked up: ' + ITEMS[it.kind].name + '.');
		}
		renderHud();
	}

	function wait() {
		if (!G || G.over || modalOpen()) return;
		endTurn();
		draw();
	}

	function goDown() {
		if (!G || G.over || modalOpen()) return;
		if (!G.lift || G.p.x !== G.lift[0] || G.p.y !== G.lift[1]) {
			log('You need to stand on the lift.', 'info');
			return;
		}
		sfx.lift();
		descend();
		draw();
		renderHud();
	}

	function useItem(kind) {
		if (!G || G.over || modalOpen() || !G.p.inv[kind]) return;
		var p = G.p;
		var def = ITEMS[kind];
		if (def.target) return startTargeting(kind, def.target);
		if (kind === 'medkit') {
			if (p.hp >= p.maxHp) return log('Already at full health.', 'info');
			var heal = 12 + perk('medic') * 6;
			p.hp = Math.min(p.maxHp, p.hp + heal);
			G.stats.meds++;
			floatText(p.x, p.y, '+' + heal, '#7dffa8');
			log('You patch up (+' + heal + ').', 'good');
		} else if (kind === 'stim') {
			p.stim = 15;
			p.hp = Math.min(p.maxHp, p.hp + 4);
			log('The stim kicks in. +2 damage for 15 turns.', 'good');
		} else if (kind === 'emp') {
			var hit = 0;
			G.monsters.forEach(function (m) {
				if (MONSTERS[m.kind].machine && visible(m.x, m.y) && m.hp > 0) {
					m.stunned = Math.max(m.stunned, 4);
					hurtMonster(m, 3, 'emp');
					hit++;
				}
			});
			flash(p.x, p.y, 8, '#6bb8ff');
			log(hit ? 'EMP! ' + hit + ' machine' + (hit === 1 ? '' : 's') + ' disabled.' : 'The EMP crackles. Nothing mechanical in sight.', 'good');
		} else if (kind === 'scanner') {
			for (var i = 0; i < G.explored.length; i++) if (G.tiles[i] !== T.WALL) G.explored[i] = 1;
			log('Deck schematics downloaded.', 'good');
		}
		p.inv[kind]--;
		if (!p.inv[kind]) delete p.inv[kind];
		sfx.use();
		endTurn();
		draw();
		renderHud();
	}

	function fire() {
		if (!G || G.over || modalOpen()) return;
		if (!G.p.sidearm) return log('You have no sidearm.', 'info');
		if (G.p.cells <= 0) return log('No energy cells left.', 'info');
		startTargeting('sidearm', sidearmRange());
	}

	function startTargeting(kind, range) {
		interruptAuto();
		var p = G.p;
		var enemies = G.monsters
			.filter(function (m) {
				return m.hp > 0 && visible(m.x, m.y) && DC.chebyshev(p.x, p.y, m.x, m.y) <= range && DC.lineOfSight(G.tiles, p.x, p.y, m.x, m.y);
			})
			.sort(function (a, b) {
				return DC.chebyshev(p.x, p.y, a.x, a.y) - DC.chebyshev(p.x, p.y, b.x, b.y);
			});
		if (kind === 'sidearm' && !enemies.length) return log('No target in range.', 'info');
		var start = enemies[0] ? [enemies[0].x, enemies[0].y] : [p.x, p.y];
		targeting = { kind: kind, range: range, cursor: start, enemies: enemies, i: 0 };
		$('prompt').textContent = (kind === 'sidearm' ? 'Fire at' : 'Use ' + ITEMS[kind].name + ' on') + ' a tile — tap/click, or Tab + Enter. Esc cancels.';
		$('prompt').classList.remove('hidden');
		draw();
	}

	function validTarget(x, y) {
		var p = G.p;
		var t = targeting;
		if (!visible(x, y) || DC.chebyshev(p.x, p.y, x, y) > t.range) return false;
		if (!DC.lineOfSight(G.tiles, p.x, p.y, x, y)) return false;
		if (t.kind === 'sidearm') return !!monsterAt(x, y);
		if (t.kind === 'blink') return G.tiles[idx(x, y)] !== T.WALL && !monsterAt(x, y);
		return G.tiles[idx(x, y)] !== T.WALL;
	}

	function confirmTarget(x, y) {
		var t = targeting;
		if (!t || !validTarget(x, y)) {
			sfx.deny();
			return;
		}
		var p = G.p;
		targeting = null;
		$('prompt').classList.add('hidden');
		if (t.kind === 'sidearm') {
			var m = monsterAt(x, y);
			p.cells--;
			beam(p.x, p.y, x, y, '#7cf0ff');
			var dmg = rand(R, 4, 7) + perk('marksman') * 2;
			if (!hurtMonster(m, dmg, 'sidearm')) log('Arc bolt hits the ' + MONSTERS[m.kind].name + ' for ' + dmg + '.');
			sfx.zap();
		} else if (t.kind === 'grenade') {
			flash(x, y, 1.6, '#ffa04d');
			sfx.boom();
			var killed = 0;
			var dmg2 = rand(R, 8, 12) + perk('deadeye') * 4;
			G.monsters.slice().forEach(function (mm) {
				if (mm.hp > 0 && Math.abs(mm.x - x) <= 1 && Math.abs(mm.y - y) <= 1) if (hurtMonster(mm, dmg2, 'grenade')) killed++;
			});
			if (Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1) hurtPlayer(Math.round(dmg2 / 2), 'your own grenade');
			if (killed >= 3) unlock('grenadier');
			log('Boom! ' + (killed ? killed + ' destroyed.' : ''), 'good');
			consume('grenade');
		} else if (t.kind === 'blink') {
			flash(p.x, p.y, 1, '#c08bff');
			p.x = x;
			p.y = y;
			flash(x, y, 1, '#c08bff');
			pickUp();
			log('Blink!', 'good');
			consume('blink');
			sfx.use();
		}
		endTurn();
		draw();
		renderHud();
	}

	function consume(kind) {
		G.p.inv[kind]--;
		if (!G.p.inv[kind]) delete G.p.inv[kind];
	}

	function cancelTargeting() {
		targeting = null;
		$('prompt').classList.add('hidden');
		draw();
	}

	// Tap/click to walk: follow a path one step at a time until something interesting happens.
	function walkTo(x, y) {
		interruptAuto();
		var p = G.p;
		var m = monsterAt(x, y);
		if (m && DC.chebyshev(p.x, p.y, x, y) === 1) return tryMove(x - p.x, y - p.y);
		if (!G.explored[idx(x, y)] || G.tiles[idx(x, y)] === T.WALL) return;
		var path = DC.findPath(G.tiles, p.x, p.y, x, y, function (n) {
			return G.explored[n] === 1;
		});
		if (!path || !path.length) return;
		autoPath = { path: path, seen: visibleEnemyCount() };
		stepAuto();
	}

	function visibleEnemyCount() {
		return G.monsters.filter(function (m) {
			return m.hp > 0 && visible(m.x, m.y);
		}).length;
	}

	function stepAuto() {
		if (!autoPath || !G || G.over) return;
		var next = autoPath.path.shift();
		if (!next) return interruptAuto();
		var p = G.p;
		if (monsterAt(next[0], next[1])) return interruptAuto();
		var moved = tryMove(next[0] - p.x, next[1] - p.y);
		if (!moved || !autoPath) return interruptAuto();
		if (visibleEnemyCount() > autoPath.seen || itemAt(p.x, p.y)) return interruptAuto();
		if (autoPath.path.length) autoTimer = setTimeout(stepAuto, settings.reducedMotion ? 30 : 70);
		else interruptAuto();
	}

	function interruptAuto() {
		clearTimeout(autoTimer);
		autoPath = null;
	}

	// ── End of run ────────────────────────────────────────────────────

	function score(won) {
		return G.depth * 150 + G.stats.kills * 10 + G.p.lvl * 25 + (won ? 2000 : 0);
	}

	function gameOver(won) {
		interruptAuto();
		G.over = won ? 'won' : 'dead';
		var s = score(won);
		var best = s > meta.best;
		if (best) meta.best = s;
		if (won) {
			meta.wins++;
			unlock('core');
			if (G.stats.meds === 0) unlock('no-meds');
			sfx.win();
		} else sfx.die();
		if (G.daily) unlock('daily-dive');
		Galaxy.submitScore(s).catch(function (e) {
			console.warn(e);
		});
		var dive = G;
		persist(true);
		openModal(
			'<p class="eyebrow">' + (won ? 'Beacon lit' : 'Signal lost') + '</p><h2>' + (won ? 'You reached the Core' : 'Lost on deck ' + dive.depth) + '</h2>' +
				'<dl class="stats"><dt>Deepest deck</dt><dd>' + dive.depth + '/' + DC.MAX_DEPTH + '</dd><dt>Level</dt><dd>' + dive.p.lvl + '</dd><dt>Kills</dt><dd>' + dive.stats.kills + '</dd><dt>Turns</dt><dd>' + dive.turn + '</dd><dt>Score</dt><dd>' + s + (best ? ' ★ best' : '') + '</dd></dl>' +
				'<div class="actions"><button class="btn" type="button" id="go-title">Title</button><button class="btn primary" type="button" id="go-again">Dive again</button></div>'
		);
		$('go-title').onclick = function () {
			closeModal();
			showTitle();
		};
		$('go-again').onclick = function () {
			closeModal();
			startDive(null);
		};
	}

	// ── Modals ────────────────────────────────────────────────────────

	function modalOpen() {
		return !$('modal').classList.contains('hidden');
	}
	function openModal(html) {
		$('modal-body').innerHTML = html;
		$('modal').classList.remove('hidden');
		var b = $('modal-body').querySelector('button:not(:disabled)');
		if (b) b.focus();
	}
	function closeModal() {
		$('modal').classList.add('hidden');
		$('modal-body').innerHTML = '';
	}

	function showPerks() {
		var r = DC.rng(DC.hash(G.seed + ':perk' + G.p.lvl));
		var pool = Object.keys(PERKS).filter(function (k) {
			return perk(k) < PERKS[k].max && !(k === 'marksman' && !G.p.sidearm);
		});
		for (var i = pool.length - 1; i > 0; i--) {
			var j = Math.floor(r() * (i + 1));
			var t = pool[i];
			pool[i] = pool[j];
			pool[j] = t;
		}
		var pick = pool.slice(0, 3);
		openModal(
			'<p class="eyebrow">Level ' + G.p.lvl + '</p><h2>Choose an upgrade</h2><div class="options">' +
				pick
					.map(function (k) {
						return '<button type="button" class="option" data-perk="' + k + '"><b>' + PERKS[k].name + (perk(k) ? ' ' + (perk(k) + 1) : '') + '</b><small>' + PERKS[k].desc + '</small></button>';
					})
					.join('') +
				'</div>'
		);
		$('modal-body').querySelectorAll('[data-perk]').forEach(function (b) {
			b.onclick = function () {
				if (!G.pendingPerks) return closeModal();
				var k = b.dataset.perk;
				G.p.perks[k] = perk(k) + 1;
				if (k === 'tough') {
					G.p.maxHp += 6;
					G.p.hp += 6;
				}
				G.pendingPerks--;
				closeModal();
				renderHud();
				persist();
				if (G.pendingPerks > 0) showPerks();
			};
		});
	}

	function showFab() {
		var p = G.p;
		if (!G.fabStock) {
			var r = DC.rng(DC.hash(G.seed + ':fab' + G.depth));
			var nextW = Object.keys(WEAPONS).find(function (k) {
				return WEAPONS[k].tier === WEAPONS[p.weapon].tier + 1;
			});
			var nextA = Object.keys(ARMORS).find(function (k) {
				return ARMORS[k].tier === (p.armor ? ARMORS[p.armor].tier : 0) + 1;
			});
			G.fabStock = [
				{ kind: 'medkit', price: 25 },
				{ kind: ['grenade', 'emp', 'blink', 'stim'][Math.floor(r() * 4)], price: 30 },
				{ kind: 'cells', n: 4, price: 15 }
			];
			if (nextW && r() < 0.7) G.fabStock.push({ kind: 'weapon', id: nextW, price: 70 + WEAPONS[nextW].tier * 20 });
			if (nextA) G.fabStock.push({ kind: 'armor', id: nextA, price: 60 + ARMORS[nextA].tier * 20 });
		}
		var label = function (s) {
			if (s.kind === 'weapon') return WEAPONS[s.id].name + ' (' + WEAPONS[s.id].dmg.join('–') + ' dmg)';
			if (s.kind === 'armor') return ARMORS[s.id].name + ' (+' + ARMORS[s.id].def + ' armor)';
			if (s.kind === 'cells') return s.n + ' energy cells';
			return ITEMS[s.kind].name + ' — ' + ITEMS[s.kind].desc;
		};
		openModal(
			'<p class="eyebrow">Fabricator</p><h2>Print supplies</h2><p class="sub">Scrap: <b>' + p.scrap + '</b></p><div class="options">' +
				G.fabStock
					.map(function (s, i) {
						return '<button type="button" class="option" data-buy="' + i + '"' + (s.sold || p.scrap < s.price ? ' disabled' : '') + '><b>' + label(s) + '</b><small>' + (s.sold ? 'Printed' : s.price + ' scrap') + '</small></button>';
					})
					.join('') +
				'</div><div class="actions"><button class="btn primary" type="button" id="fab-done">Done</button></div>'
		);
		$('modal-body').querySelectorAll('[data-buy]').forEach(function (b) {
			b.onclick = function () {
				var s = G.fabStock[Number(b.dataset.buy)];
				if (s.sold || p.scrap < s.price) return;
				p.scrap -= s.price;
				s.sold = true;
				if (s.kind === 'weapon') p.weapon = s.id;
				else if (s.kind === 'armor') p.armor = s.id;
				else if (s.kind === 'cells') p.cells += s.n;
				else p.inv[s.kind] = (p.inv[s.kind] || 0) + 1;
				sfx.pick();
				renderHud();
				persist();
				showFab();
			};
		});
		$('fab-done').onclick = function () {
			closeModal();
			draw();
		};
	}

	// ── Rendering ─────────────────────────────────────────────────────

	function resize() {
		var r = canvas.getBoundingClientRect();
		view.dpr = Math.min(window.devicePixelRatio || 1, 2);
		view.w = r.width;
		view.h = r.height;
		canvas.width = Math.round(r.width * view.dpr);
		canvas.height = Math.round(r.height * view.dpr);
		view.tile = Math.max(22, Math.min(40, Math.floor(Math.min(view.w / 17, view.h / 13))));
		draw();
	}

	function camera() {
		var t = view.tile;
		return [view.w / 2 - (G.p.x + 0.5) * t, view.h / 2 - (G.p.y + 0.5) * t];
	}

	function floatText(x, y, text, color) {
		if (settings.reducedMotion) return;
		floats.push({ x: x, y: y, text: text, color: color, age: 0 });
	}
	function flash(x, y, r, color) {
		flashes.push({ x: x, y: y, r: r, color: color, age: 0, kind: 'blast' });
	}
	function beam(x0, y0, x1, y1, color) {
		flashes.push({ x: x0, y: y0, x1: x1, y1: y1, color: color, age: 0, kind: 'beam' });
	}

	function drawGlyph(kind, cx, cy, s, color, t) {
		var c = ctx;
		c.save();
		c.translate(cx, cy);
		c.shadowColor = color;
		c.shadowBlur = s * 0.5;
		c.fillStyle = color;
		c.strokeStyle = color;
		c.lineWidth = Math.max(1.5, s * 0.07);
		switch (kind) {
			case 'player':
				c.beginPath();
				c.moveTo(0, -s * 0.38);
				c.lineTo(s * 0.32, 0);
				c.lineTo(0, s * 0.38);
				c.lineTo(-s * 0.32, 0);
				c.closePath();
				c.fill();
				c.shadowBlur = 0;
				c.fillStyle = '#e9fbff';
				c.fillRect(-s * 0.16, -s * 0.08, s * 0.32, s * 0.12);
				break;
			case 'crawler':
				c.beginPath();
				c.arc(0, 0, s * 0.18, 0, Math.PI * 2);
				c.fill();
				for (var i = 0; i < 6; i++) {
					var a = (i / 6) * Math.PI * 2 + 0.3;
					c.beginPath();
					c.moveTo(Math.cos(a) * s * 0.15, Math.sin(a) * s * 0.15);
					c.lineTo(Math.cos(a) * s * 0.36, Math.sin(a) * s * 0.36);
					c.stroke();
				}
				break;
			case 'drone':
			case 'warden':
				var big = kind === 'warden' ? 1.35 : 1;
				c.beginPath();
				for (var h = 0; h < 6; h++) {
					var ang = (h / 6) * Math.PI * 2 + (settings.reducedMotion ? 0 : t);
					c.lineTo(Math.cos(ang) * s * 0.3 * big, Math.sin(ang) * s * 0.3 * big);
				}
				c.closePath();
				c.stroke();
				c.beginPath();
				c.arc(0, 0, s * 0.12 * big, 0, Math.PI * 2);
				c.fill();
				break;
			case 'sentry':
				c.beginPath();
				c.moveTo(0, -s * 0.34);
				c.lineTo(s * 0.32, s * 0.28);
				c.lineTo(-s * 0.32, s * 0.28);
				c.closePath();
				c.fill();
				c.shadowBlur = 0;
				c.fillStyle = '#2a1405';
				c.beginPath();
				c.arc(0, s * 0.06, s * 0.09, 0, Math.PI * 2);
				c.fill();
				break;
			case 'leech':
				c.beginPath();
				c.ellipse(0, 0, s * 0.22, s * 0.32, 0.4, 0, Math.PI * 2);
				c.fill();
				break;
			case 'hulk':
				c.fillRect(-s * 0.36, -s * 0.36, s * 0.72, s * 0.72);
				c.shadowBlur = 0;
				c.fillStyle = '#ffe9ff';
				c.fillRect(-s * 0.2, -s * 0.12, s * 0.1, s * 0.08);
				c.fillRect(s * 0.1, -s * 0.12, s * 0.1, s * 0.08);
				break;
			case 'swarmer':
				[[-0.12, -0.1], [0.14, -0.06], [0, 0.14]].forEach(function (q) {
					c.beginPath();
					c.arc(q[0] * s, q[1] * s, s * 0.09, 0, Math.PI * 2);
					c.fill();
				});
				break;
			case 'wraith':
				c.globalAlpha = 0.75;
				c.beginPath();
				c.arc(0, -s * 0.06, s * 0.24, Math.PI, 0);
				c.lineTo(s * 0.24, s * 0.3);
				c.lineTo(s * 0.08, s * 0.18);
				c.lineTo(-s * 0.08, s * 0.3);
				c.lineTo(-s * 0.24, s * 0.18);
				c.closePath();
				c.fill();
				break;
		}
		c.restore();
	}

	function drawItem(it, cx, cy, s) {
		var c = ctx;
		var color = it.kind === 'scrap' ? '#a8b3c7' : it.kind === 'cells' ? '#ffe36b' : it.kind === 'weapon' || it.kind === 'armor' || it.kind === 'sidearm' ? '#ffffff' : ITEMS[it.kind].color;
		c.save();
		c.translate(cx, cy);
		c.shadowColor = color;
		c.shadowBlur = s * 0.3;
		c.fillStyle = color;
		c.strokeStyle = color;
		c.lineWidth = 2;
		if (it.kind === 'scrap') {
			for (var i = 0; i < 3; i++) c.fillRect(-s * 0.2 + i * s * 0.14, -s * 0.06 + (i % 2) * s * 0.1, s * 0.1, s * 0.1);
		} else if (it.kind === 'cells') {
			c.strokeRect(-s * 0.12, -s * 0.2, s * 0.24, s * 0.36);
			c.fillRect(-s * 0.06, -s * 0.26, s * 0.12, s * 0.06);
			c.fillRect(-s * 0.08, -s * 0.04, s * 0.16, s * 0.18);
		} else if (it.kind === 'weapon' || it.kind === 'sidearm') {
			c.beginPath();
			c.moveTo(-s * 0.22, s * 0.22);
			c.lineTo(s * 0.22, -s * 0.22);
			c.stroke();
			c.beginPath();
			c.moveTo(-s * 0.08, s * 0.02);
			c.lineTo(s * 0.02, s * 0.12);
			c.stroke();
		} else if (it.kind === 'armor') {
			c.beginPath();
			c.moveTo(0, -s * 0.24);
			c.lineTo(s * 0.2, -s * 0.14);
			c.lineTo(s * 0.16, s * 0.14);
			c.lineTo(0, s * 0.26);
			c.lineTo(-s * 0.16, s * 0.14);
			c.lineTo(-s * 0.2, -s * 0.14);
			c.closePath();
			c.stroke();
		} else {
			c.beginPath();
			c.arc(0, 0, s * 0.18, 0, Math.PI * 2);
			c.fill();
			c.shadowBlur = 0;
			c.fillStyle = '#0b1020';
			c.font = '700 ' + Math.round(s * 0.24) + 'px system-ui';
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.fillText(ITEMS[it.kind].name[0], 0, 1);
		}
		c.restore();
	}

	var lastFrame = 0;
	function draw() {
		if (!G) return;
		var now = performance.now();
		var t = now / 1000;
		var dt = Math.min(0.05, (now - lastFrame) / 1000 || 0);
		lastFrame = now;
		var c = ctx;
		var s = view.tile;
		c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
		c.fillStyle = '#04060b';
		c.fillRect(0, 0, view.w, view.h);
		var cam = camera();
		var x0 = Math.max(0, Math.floor(-cam[0] / s) - 1),
			x1 = Math.min(W - 1, Math.ceil((view.w - cam[0]) / s));
		var y0 = Math.max(0, Math.floor(-cam[1] / s) - 1),
			y1 = Math.min(H - 1, Math.ceil((view.h - cam[1]) / s));
		for (var y = y0; y <= y1; y++) {
			for (var x = x0; x <= x1; x++) {
				var i = idx(x, y);
				if (!G.explored[i]) continue;
				var px = cam[0] + x * s,
					py = cam[1] + y * s;
				var seen = vis[i];
				var tile = G.tiles[i];
				if (tile === T.WALL) {
					c.fillStyle = seen ? '#2c3650' : '#151a26';
					c.fillRect(px, py, s, s);
					c.fillStyle = seen ? '#3d4a6b' : '#1b2131';
					c.fillRect(px, py, s, s * 0.22);
				} else {
					c.fillStyle = seen ? ((x + y) % 2 ? '#1a2539' : '#172135') : '#0b1019';
					c.fillRect(px, py, s, s);
					if (seen) {
						c.strokeStyle = 'rgba(120,160,255,0.05)';
						c.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
					}
					if (tile === T.LIFT) {
						c.fillStyle = seen ? 'rgba(80,220,255,0.25)' : 'rgba(80,220,255,0.1)';
						c.fillRect(px + 3, py + 3, s - 6, s - 6);
						c.strokeStyle = '#5ce0ff';
						c.lineWidth = 2;
						c.beginPath();
						c.moveTo(px + s * 0.3, py + s * 0.35);
						c.lineTo(px + s * 0.5, py + s * 0.55);
						c.lineTo(px + s * 0.7, py + s * 0.35);
						c.moveTo(px + s * 0.3, py + s * 0.55);
						c.lineTo(px + s * 0.5, py + s * 0.75);
						c.lineTo(px + s * 0.7, py + s * 0.55);
						c.stroke();
					} else if (tile === T.FAB) {
						c.fillStyle = '#3a2a0a';
						c.fillRect(px + 3, py + 3, s - 6, s - 6);
						c.fillStyle = '#ffc14d';
						c.fillRect(px + s * 0.25, py + s * 0.25, s * 0.5, s * 0.3);
						c.fillRect(px + s * 0.35, py + s * 0.62, s * 0.3, s * 0.1);
					} else if (tile === T.CORE) {
						var pulse = settings.reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 3);
						var g = c.createRadialGradient(px + s / 2, py + s / 2, 0, px + s / 2, py + s / 2, s * 1.4 * pulse);
						g.addColorStop(0, G.wardenDead ? '#ffffff' : '#ff4dd8');
						g.addColorStop(0.3, 'rgba(255,77,216,0.6)');
						g.addColorStop(1, 'rgba(255,77,216,0)');
						c.fillStyle = g;
						c.fillRect(px - s, py - s, s * 3, s * 3);
					}
				}
			}
		}
		// Items (remembered once seen)
		G.items.forEach(function (it) {
			if (!G.explored[idx(it.x, it.y)]) return;
			c.globalAlpha = vis[idx(it.x, it.y)] ? 1 : 0.4;
			drawItem(it, cam[0] + (it.x + 0.5) * s, cam[1] + (it.y + 0.5) * s, s);
			c.globalAlpha = 1;
		});
		// Monsters (only in view)
		G.monsters.forEach(function (m) {
			if (m.hp <= 0 || !vis[idx(m.x, m.y)]) return;
			var def = MONSTERS[m.kind];
			var mx = cam[0] + (m.x + 0.5) * s,
				my = cam[1] + (m.y + 0.5) * s;
			drawGlyph(m.kind, mx, my, s, m.stunned ? '#8899aa' : def.color, t);
			if (m.hp < m.maxHp) {
				c.fillStyle = 'rgba(0,0,0,0.6)';
				c.fillRect(mx - s * 0.36, my - s * 0.5, s * 0.72, 4);
				c.fillStyle = def.color;
				c.fillRect(mx - s * 0.36, my - s * 0.5, s * 0.72 * (m.hp / m.maxHp), 4);
			}
			if (!m.awake) {
				c.fillStyle = 'rgba(255,255,255,0.6)';
				c.font = '700 ' + Math.round(s * 0.3) + 'px system-ui';
				c.textAlign = 'center';
				c.fillText('z', mx + s * 0.3, my - s * 0.25);
			}
		});
		drawGlyph('player', cam[0] + (G.p.x + 0.5) * s, cam[1] + (G.p.y + 0.5) * s, s, G.p.stim > 0 ? '#9dffcf' : '#5ce0ff', t);

		// Helmet light
		var lg = c.createRadialGradient(view.w / 2, view.h / 2, s * 2, view.w / 2, view.h / 2, s * 9);
		lg.addColorStop(0, 'rgba(0,0,0,0)');
		lg.addColorStop(1, 'rgba(2,3,8,0.55)');
		c.fillStyle = lg;
		c.fillRect(0, 0, view.w, view.h);

		// Targeting overlay
		if (targeting) {
			for (var ty = G.p.y - targeting.range; ty <= G.p.y + targeting.range; ty++)
				for (var tx = G.p.x - targeting.range; tx <= G.p.x + targeting.range; tx++) {
					if (!DC.inBounds(tx, ty) || !validTarget(tx, ty)) continue;
					c.fillStyle = 'rgba(92,224,255,0.12)';
					c.fillRect(cam[0] + tx * s, cam[1] + ty * s, s, s);
				}
			var cx = targeting.cursor[0],
				cy = targeting.cursor[1];
			c.strokeStyle = validTarget(cx, cy) ? '#5ce0ff' : '#ff6b6b';
			c.lineWidth = 2;
			c.strokeRect(cam[0] + cx * s + 2, cam[1] + cy * s + 2, s - 4, s - 4);
			if (targeting.kind === 'grenade') {
				c.strokeStyle = 'rgba(255,160,77,0.7)';
				c.strokeRect(cam[0] + (cx - 1) * s, cam[1] + (cy - 1) * s, s * 3, s * 3);
			}
		}

		// Effects
		for (var f = flashes.length - 1; f >= 0; f--) {
			var fl = flashes[f];
			fl.age += dt;
			var life = fl.kind === 'beam' ? 0.18 : 0.4;
			if (fl.age > life || settings.reducedMotion) {
				flashes.splice(f, 1);
				continue;
			}
			c.globalAlpha = 1 - fl.age / life;
			if (fl.kind === 'beam') {
				c.strokeStyle = fl.color;
				c.lineWidth = 3;
				c.beginPath();
				c.moveTo(cam[0] + (fl.x + 0.5) * s, cam[1] + (fl.y + 0.5) * s);
				c.lineTo(cam[0] + (fl.x1 + 0.5) * s, cam[1] + (fl.y1 + 0.5) * s);
				c.stroke();
			} else {
				c.fillStyle = fl.color;
				c.beginPath();
				c.arc(cam[0] + (fl.x + 0.5) * s, cam[1] + (fl.y + 0.5) * s, fl.r * s * (0.5 + fl.age / life), 0, Math.PI * 2);
				c.fill();
			}
			c.globalAlpha = 1;
		}
		for (var k = floats.length - 1; k >= 0; k--) {
			var fx = floats[k];
			fx.age += dt;
			if (fx.age > 0.8) {
				floats.splice(k, 1);
				continue;
			}
			c.globalAlpha = 1 - fx.age / 0.8;
			c.fillStyle = fx.color;
			c.font = '800 ' + Math.round(s * 0.45) + 'px system-ui';
			c.textAlign = 'center';
			c.fillText(fx.text, cam[0] + (fx.x + 0.5) * s, cam[1] + fx.y * s - fx.age * s);
			c.globalAlpha = 1;
		}
		renderHud();
	}

	function loop() {
		requestAnimationFrame(loop);
		if (G && (floats.length || flashes.length || (!settings.reducedMotion && G.depth === DC.MAX_DEPTH) || targeting)) draw();
	}

	// ── HUD ───────────────────────────────────────────────────────────

	var lastHud = '';
	function renderHud() {
		if (!G) return;
		var p = G.p;
		var w = WEAPONS[p.weapon];
		var key = JSON.stringify([p.hp, p.maxHp, p.lvl, p.xp, G.depth, p.scrap, p.weapon, p.armor, p.cells, p.inv, p.stim > 0, G.lift && p.x === G.lift[0] && p.y === G.lift[1], p.sidearm, perk('brawler')]);
		if (key === lastHud) return;
		lastHud = key;
		$('hp-text').textContent = p.hp + '/' + p.maxHp;
		$('hp-bar').style.width = Math.max(0, (p.hp / p.maxHp) * 100) + '%';
		$('hp-bar').classList.toggle('low', p.hp / p.maxHp < 0.3);
		$('lvl').textContent = 'Lv ' + p.lvl;
		$('xp-bar').style.width = (p.xp / xpNeeded()) * 100 + '%';
		$('depth').textContent = 'Deck ' + G.depth + '/' + DC.MAX_DEPTH;
		$('scrap').textContent = p.scrap;
		var mr = meleeRange();
		$('gear').textContent = w.name + ' ' + mr[0] + '–' + mr[1] + ' · Armor ' + def() + (p.sidearm ? ' · Cells ' + p.cells : '');
		var inv = $('inventory');
		inv.innerHTML = Object.keys(ITEMS)
			.map(function (k, i) {
				var n = p.inv[k] || 0;
				return '<button type="button" class="slot" data-item="' + k + '"' + (n ? '' : ' disabled') + ' title="' + ITEMS[k].name + ': ' + ITEMS[k].desc + '" aria-label="' + ITEMS[k].name + ', ' + n + '"><span class="dot" style="background:' + ITEMS[k].color + '">' + ITEMS[k].name[0] + '</span><span class="n">' + n + '</span><span class="key">' + (i + 1) + '</span></button>';
			})
			.join('');
		$('btn-fire').classList.toggle('hidden', !p.sidearm);
		$('btn-down').classList.toggle('hidden', !(G.lift && p.x === G.lift[0] && p.y === G.lift[1]));
	}

	function renderLog() {
		$('log').innerHTML = G.log
			.slice(-4)
			.map(function (l) {
				return '<p class="' + l.c + '">' + l.t + '</p>';
			})
			.join('');
	}

	// ── Persistence ───────────────────────────────────────────────────

	function encode() {
		if (!G) return null;
		var copy = {};
		for (var k in G) if (k !== 'r' && k !== 'tiles' && k !== 'explored') copy[k] = G[k];
		copy.tiles = Array.prototype.join.call(G.tiles, '');
		copy.explored = Array.prototype.join.call(G.explored, '');
		return copy;
	}
	function decode(d) {
		G = d;
		G.tiles = Uint8Array.from(d.tiles.split('').map(Number));
		G.explored = Uint8Array.from(d.explored.split('').map(Number));
		G.r = makeR();
	}
	function persist(now) {
		clearTimeout(saveTimer);
		var go = function () {
			var dive = G && !G.over ? encode() : null;
			Galaxy.save({ v: 1, meta: meta, dive: dive }).catch(function (e) {
				console.warn(e);
			});
		};
		if (now) go();
		else saveTimer = setTimeout(go, 800);
	}
	function unlock(id) {
		if (meta.ach[id]) return;
		meta.ach[id] = 1;
		Galaxy.unlock(id).catch(function (e) {
			console.warn(e);
		});
	}

	// ── Audio ─────────────────────────────────────────────────────────

	var audio = null;
	function tone(f, d, type, g, delay, slide) {
		if (settings.muted) return;
		try {
			audio = audio || new (window.AudioContext || window.webkitAudioContext)();
			var t = audio.currentTime + (delay || 0);
			var o = audio.createOscillator(),
				gg = audio.createGain();
			o.type = type || 'sine';
			o.frequency.setValueAtTime(f, t);
			if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
			gg.gain.setValueAtTime(0.0001, t);
			gg.gain.exponentialRampToValueAtTime(g || 0.06, t + 0.01);
			gg.gain.exponentialRampToValueAtTime(0.0001, t + d);
			o.connect(gg).connect(audio.destination);
			o.start(t);
			o.stop(t + d + 0.02);
		} catch (e) {
			/* no audio */
		}
	}
	var sfx = {
		hit: function () {
			tone(220, 0.08, 'square', 0.04);
		},
		kill: function () {
			tone(330, 0.15, 'triangle', 0.06, 0, 110);
		},
		hurt: function () {
			tone(120, 0.15, 'sawtooth', 0.05);
		},
		pick: function () {
			tone(880, 0.08, 'sine', 0.05);
		},
		use: function () {
			tone(520, 0.15, 'triangle', 0.05, 0, 1040);
		},
		zap: function () {
			tone(1400, 0.12, 'sawtooth', 0.04, 0, 300);
		},
		boom: function () {
			tone(90, 0.4, 'sawtooth', 0.08, 0, 30);
		},
		lift: function () {
			tone(300, 0.6, 'sine', 0.06, 0, 120);
		},
		deny: function () {
			tone(140, 0.08, 'square', 0.03);
		},
		win: function () {
			[523, 659, 784, 1046, 1318].forEach(function (f, i) {
				tone(f, 0.5, 'triangle', 0.06, i * 0.1);
			});
		},
		die: function () {
			[300, 220, 160, 110].forEach(function (f, i) {
				tone(f, 0.4, 'sawtooth', 0.05, i * 0.15);
			});
		}
	};

	// ── Input ─────────────────────────────────────────────────────────

	var KEYS = {
		ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
		w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
		k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0], y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
		Home: [-1, -1], PageUp: [1, -1], End: [-1, 1], PageDown: [1, 1]
	};
	var NUMPAD = { 8: [0, -1], 2: [0, 1], 4: [-1, 0], 6: [1, 0], 7: [-1, -1], 9: [1, -1], 1: [-1, 1], 3: [1, 1] };

	window.addEventListener('keydown', function (e) {
		if (!G || $('screen-play').classList.contains('hidden')) return;
		if (modalOpen()) return;
		if (targeting) {
			var t = targeting;
			var mv = KEYS[e.key];
			if (e.key === 'Escape') return cancelTargeting();
			if (e.key === 'Enter' || e.key === ' ' || e.key === 'f') {
				e.preventDefault();
				return confirmTarget(t.cursor[0], t.cursor[1]);
			}
			if (e.key === 'Tab' && t.enemies.length) {
				e.preventDefault();
				t.i = (t.i + 1) % t.enemies.length;
				t.cursor = [t.enemies[t.i].x, t.enemies[t.i].y];
				return draw();
			}
			if (mv) {
				e.preventDefault();
				t.cursor = [t.cursor[0] + mv[0], t.cursor[1] + mv[1]];
				return draw();
			}
			return;
		}
		interruptAuto();
		var dir = KEYS[e.key] || (e.code && e.code.indexOf('Numpad') === 0 ? NUMPAD[e.key] : null);
		if (dir) {
			e.preventDefault();
			return tryMove(dir[0], dir[1]);
		}
		if (e.key === '.' || e.key === ' ' || e.key === '5') {
			e.preventDefault();
			return wait();
		}
		if (e.key === '>' || e.key === 'Enter') return goDown();
		if (e.key === 'f' || e.key === 'F') return fire();
		var n = Number(e.key);
		if (n >= 1 && n <= 6 && !e.code.startsWith('Numpad')) {
			var kind = Object.keys(ITEMS)[n - 1];
			useItem(kind);
		}
	});

	canvas.addEventListener('pointerup', function (e) {
		if (!G || G.over || modalOpen()) return;
		var r = canvas.getBoundingClientRect();
		var cam = camera();
		var x = Math.floor((e.clientX - r.left - cam[0]) / view.tile),
			y = Math.floor((e.clientY - r.top - cam[1]) / view.tile);
		if (!DC.inBounds(x, y)) return;
		if (targeting) {
			if (targeting.cursor[0] === x && targeting.cursor[1] === y) return confirmTarget(x, y);
			targeting.cursor = [x, y];
			if (validTarget(x, y)) return confirmTarget(x, y);
			return draw();
		}
		if (x === G.p.x && y === G.p.y) {
			if (G.lift && x === G.lift[0] && y === G.lift[1]) return goDown();
			return wait();
		}
		walkTo(x, y);
	});

	$('inventory').addEventListener('click', function (e) {
		var b = e.target.closest('[data-item]');
		if (b) useItem(b.dataset.item);
	});
	$('btn-wait').addEventListener('click', wait);
	$('btn-fire').addEventListener('click', fire);
	$('btn-down').addEventListener('click', goDown);
	$('btn-menu').addEventListener('click', function () {
		persist(true);
		showTitle();
	});
	window.addEventListener('resize', resize);

	// ── Screens ───────────────────────────────────────────────────────

	var saved = null;
	function showTitle() {
		interruptAuto();
		$('screen-title').classList.remove('hidden');
		$('screen-play').classList.add('hidden');
		$('btn-resume').classList.toggle('hidden', !saved && !(G && !G.over));
		var today = dateKey();
		$('btn-daily').textContent = meta.lastDaily === today ? 'Daily dive (done today)' : 'Daily dive';
		$('btn-daily').disabled = meta.lastDaily === today;
		$('meta').textContent = 'Dives ' + meta.runs + ' · Wins ' + meta.wins + ' · Deepest deck ' + meta.deepest + ' · Best ' + meta.best;
	}

	function startDive(daily) {
		saved = null;
		newDive(daily);
		if (daily) meta.lastDaily = daily;
		enterPlay();
		log('Tap a tile to walk there, or use arrows / WASD / numpad. Bump enemies to attack.', 'info');
	}

	function enterPlay() {
		$('screen-title').classList.add('hidden');
		$('screen-play').classList.remove('hidden');
		resize();
		lastHud = '';
		renderHud();
		renderLog();
		draw();
		if (G.pendingPerks) showPerks();
	}

	$('btn-new').addEventListener('click', function () {
		startDive(null);
	});
	$('btn-daily').addEventListener('click', function () {
		startDive(dateKey());
	});
	$('btn-resume').addEventListener('click', function () {
		if (saved) {
			decode(saved);
			saved = null;
		}
		if (!G || G.over) return showTitle();
		computeFov();
		enterPlay();
	});

	Galaxy.on('settings', function (s) {
		settings = s;
	});

	showTitle();
	requestAnimationFrame(loop);
	Galaxy.ready()
		.then(function (info) {
			settings = info.settings || settings;
			$('greeting').textContent = info.player.guest ? 'Halcyon Deep salvage guild' : 'Welcome back, diver ' + info.player.name;
			return Galaxy.load();
		})
		.then(function (data) {
			if (data && data.v === 1) {
				meta = Object.assign(meta, data.meta || {});
				saved = data.dive || null;
			}
			showTitle();
		})
		.catch(function (e) {
			console.warn(e);
		});

	window.Deepcore.debug = {
		state: function () {
			return G;
		},
		move: tryMove,
		wait: wait,
		goDown: goDown,
		use: useItem,
		meta: function () {
			return meta;
		},
		MONSTERS: MONSTERS
	};
})(window.Deepcore);
