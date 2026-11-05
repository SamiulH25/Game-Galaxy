/* Starward — run state, map, combat rules, rewards. No DOM. */
(function (SW) {
	'use strict';

	var C = SW.CARDS,
		E = SW.ENEMIES,
		M = SW.MODULES;

	function hash(str) {
		var h = 0x811c9dc5;
		for (var i = 0; i < str.length; i++) {
			h ^= str.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}
	function mulberry(seed) {
		var a = seed >>> 0;
		return function () {
			a = (a + 0x6d2b79f5) >>> 0;
			var t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}
	function rngFor(run, tag) {
		return mulberry(hash(run.seed + ':' + tag));
	}
	function shuffle(arr, rng) {
		for (var i = arr.length - 1; i > 0; i--) {
			var j = Math.floor(rng() * (i + 1));
			var t = arr[i];
			arr[i] = arr[j];
			arr[j] = t;
		}
		return arr;
	}
	function pick(arr, rng) {
		return arr[Math.floor(rng() * arr.length)];
	}
	function has(run, mod) {
		return run.modules.indexOf(mod) !== -1;
	}

	// ── Run ───────────────────────────────────────────────────────────

	function newRun(seed, threat) {
		var run = {
			v: 1,
			seed: String(seed),
			threat: threat || 0,
			sector: 1,
			row: -1,
			at: null,
			hull: 70,
			maxHull: 70,
			credits: 60,
			deck: [],
			modules: [],
			removals: 0,
			blackboxUsed: false,
			uid: 0,
			map: null,
			pending: null,
			stats: { floors: 0, elites: 0, bosses: 0, maxHit: 0, cardsPlayed: 0, maxTurnCards: 0, bossNoDamage: false },
			over: null
		};
		SW.STARTER.forEach(function (id) {
			addCard(run, id);
		});
		if (threat >= 3) addCard(run, 'static');
		run.map = genMap(run);
		return run;
	}

	function addCard(run, id, up) {
		var card = { uid: ++run.uid, id: id, up: !!up };
		run.deck.push(card);
		return card;
	}

	function cardName(card) {
		return C[card.id].name + (card.up ? '+' : '');
	}

	function canUpgrade(card) {
		return !card.up && C[card.id].type !== 'curse';
	}

	function upgradeRandom(run, rng) {
		var options = run.deck.filter(canUpgrade);
		if (!options.length) return null;
		var c = pick(options, rng);
		c.up = true;
		return cardName(c);
	}

	function gainModule(run, rng, rarity) {
		var pool = Object.keys(M).filter(function (k) {
			return !has(run, k) && (!rarity || M[k].rarity === rarity);
		});
		if (!pool.length)
			pool = Object.keys(M).filter(function (k) {
				return !has(run, k);
			});
		if (!pool.length) return null;
		var id = pick(pool, rng);
		run.modules.push(id);
		if (M[id].onGain) M[id].onGain(run);
		return id;
	}

	function randomCard(rng, rarity) {
		var pool = Object.keys(C).filter(function (k) {
			return C[k].rarity === rarity;
		});
		return pick(pool, rng);
	}

	function rollRarity(rng, weights) {
		var r = rng();
		if (r < weights[0]) return 'common';
		if (r < weights[0] + weights[1]) return 'uncommon';
		return 'rare';
	}

	// ── Map ───────────────────────────────────────────────────────────

	var ROWS = 7;
	function genMap(run) {
		var rng = rngFor(run, 'map' + run.sector);
		var rows = [];
		for (var r = 0; r < ROWS; r++) {
			var n = r === 0 ? 3 : 2 + Math.floor(rng() * 3);
			var row = [];
			for (var i = 0; i < n; i++) {
				var type;
				if (r === 0) type = 'battle';
				else if (r === ROWS - 1) type = 'repair';
				else {
					var x = rng();
					type = x < 0.48 ? 'battle' : x < 0.62 ? (r >= 2 ? 'elite' : 'battle') : x < 0.82 ? 'event' : x < 0.93 ? 'shop' : 'repair';
				}
				row.push({ id: 's' + run.sector + 'r' + r + 'n' + i, row: r, type: type, x: (i + 1) / (n + 1), next: [] });
			}
			rows.push(row);
		}
		// Guarantee a shop mid-sector.
		var mid = rows.slice(2, 6);
		var hasShop = mid.some(function (row) {
			return row.some(function (nd) {
				return nd.type === 'shop';
			});
		});
		if (!hasShop) pick(pick(mid, rng), rng).type = 'shop';
		// Connect rows without crossings: each node's targets are >= every earlier node's targets.
		for (var k = 0; k < ROWS - 1; k++) {
			var a = rows[k],
				b = rows[k + 1];
			var prevMax = 0;
			var targets = [];
			a.forEach(function (nd, i) {
				var base = a.length === 1 ? 0 : Math.round((i * (b.length - 1)) / (a.length - 1));
				var j = Math.max(prevMax, base);
				var t = [j];
				if (rng() < 0.55) {
					var extra = j + (rng() < 0.5 ? -1 : 1);
					if (extra >= prevMax && extra < b.length && extra !== j) t.push(extra);
				}
				t.sort(function (x, y) {
					return x - y;
				});
				prevMax = t[t.length - 1];
				targets.push(t);
			});
			// Any node left without a parent gets the one parent that can reach it without crossing.
			for (var j2 = 0; j2 < b.length; j2++) {
				var reached = targets.some(function (t) {
					return t.indexOf(j2) !== -1;
				});
				if (reached) continue;
				var p = 0;
				for (var i2 = 0; i2 < targets.length; i2++) if (targets[i2][0] <= j2) p = i2;
				targets[p].push(j2);
				targets[p].sort(function (x, y) {
					return x - y;
				});
			}
			a.forEach(function (nd, i) {
				nd.next = targets[i].map(function (j) {
					return b[j].id;
				});
			});
		}
		var boss = { id: 's' + run.sector + 'boss', row: ROWS, type: 'boss', x: 0.5, next: [] };
		rows[ROWS - 1].forEach(function (nd) {
			nd.next = [boss.id];
		});
		return { rows: rows, boss: boss };
	}

	function findNode(run, id) {
		if (run.map.boss.id === id) return run.map.boss;
		for (var r = 0; r < run.map.rows.length; r++)
			for (var i = 0; i < run.map.rows[r].length; i++) if (run.map.rows[r][i].id === id) return run.map.rows[r][i];
		return null;
	}

	function reachable(run) {
		if (run.pending) return [];
		if (!run.at)
			return run.map.rows[0].map(function (n) {
				return n.id;
			});
		var cur = findNode(run, run.at);
		return cur ? cur.next.slice() : [];
	}

	function enterNode(run, id) {
		var node = findNode(run, id);
		run.at = id;
		run.row = node.row;
		run.stats.floors++;
		if (node.type === 'battle' || node.type === 'elite' || node.type === 'boss') run.pending = { kind: 'combat', node: id, type: node.type };
		else if (node.type === 'event') {
			var rng = rngFor(run, 'event' + id);
			var seen = run.seenEvents || (run.seenEvents = []);
			var pool = SW.EVENTS.filter(function (e) {
				return seen.indexOf(e.id) === -1;
			});
			if (!pool.length) pool = SW.EVENTS;
			var ev = pick(pool, rng);
			seen.push(ev.id);
			run.pending = { kind: 'event', node: id, event: ev.id };
		} else if (node.type === 'shop') run.pending = { kind: 'shop', node: id, shop: makeShop(run, id) };
		else if (node.type === 'repair') run.pending = { kind: 'repair', node: id };
		return run.pending;
	}

	// ── Shop & rewards ────────────────────────────────────────────────

	var PRICE = { common: 45, uncommon: 72, rare: 115 };
	function makeShop(run, id) {
		var rng = rngFor(run, 'shop' + id);
		var cards = ['common', 'common', 'uncommon', 'uncommon', 'rare'].map(function (rar) {
			return { id: randomCard(rng, rar), price: Math.round(PRICE[rar] * (0.9 + rng() * 0.2)), sold: false };
		});
		var mods = [];
		var pool = Object.keys(M).filter(function (k) {
			return !has(run, k);
		});
		shuffle(pool, rng);
		pool.slice(0, 2).forEach(function (k) {
			mods.push({ id: k, price: { common: 120, uncommon: 155, rare: 195 }[M[k].rarity] + Math.round(rng() * 20), sold: false });
		});
		return { cards: cards, mods: mods, removalUsed: false };
	}
	function removalPrice(run) {
		return 60 + run.removals * 25;
	}

	function makeReward(run, nodeId, type) {
		var rng = rngFor(run, 'reward' + nodeId);
		var credits = type === 'boss' ? 70 : type === 'elite' ? 28 + Math.floor(rng() * 11) : 12 + Math.floor(rng() * 9);
		if (has(run, 'salvager')) credits += 10;
		if (has(run, 'bounty') && type !== 'battle') credits += 30;
		var weights = type === 'boss' ? [0, 0, 1] : type === 'elite' ? [0.4, 0.45] : [0.63, 0.32];
		var n = has(run, 'lucky') ? 4 : 3;
		var cards = [];
		var guard = 0;
		while (cards.length < n && guard++ < 50) {
			var id = randomCard(rng, rollRarity(rng, weights));
			if (cards.indexOf(id) === -1) cards.push(id);
		}
		var modules = [];
		if (type === 'elite') modules = [null];
		if (type === 'boss') {
			var pool = Object.keys(M).filter(function (k) {
				return !has(run, k);
			});
			modules = shuffle(pool, rng).slice(0, 3);
		}
		return { credits: credits, cards: cards, modules: modules, type: type, takenCard: false, takenModule: false };
	}

	// ── Combat ────────────────────────────────────────────────────────

	function Combat(run, nodeId, type) {
		var self = this;
		this.run = run;
		this.nodeId = nodeId;
		this.type = type;
		this.rng = rngFor(run, 'combat' + nodeId);
		this.fx = [];
		this.turn = 1;
		this.over = null;
		this.enemyUid = 0;
		this.firstAttack = true;
		this.firstCard = true;
		this.cardsThisTurn = 0;
		this.startHull = run.hull;
		this.player = { shield: 0, energy: 0, maxEnergy: 3, status: {}, powers: {} };
		var group;
		var enc = SW.ENCOUNTERS[run.sector];
		if (type === 'boss') group = enc.boss.slice();
		else group = pick(type === 'elite' ? enc.elite : enc.normal, this.rng).slice();
		this.enemies = [];
		group.forEach(function (id) {
			self.spawn(id);
		});
		var deck = run.deck.filter(function (c) {
			return true;
		});
		this.draw = shuffle(
			deck.map(function (c) {
				return { uid: c.uid, id: c.id, up: c.up };
			}),
			this.rng
		);
		this.hand = [];
		this.discard = [];
		this.exhaust = [];
		if (has(run, 'plating')) this.player.shield = 8;
		if (has(run, 'dampers'))
			this.enemies.forEach(function (e) {
				e.status.jammed = (e.status.jammed || 0) + 1;
			});
		this.enemies.forEach(function (e) {
			self.chooseIntent(e);
		});
		this.startTurn();
	}

	Combat.prototype.spawn = function (id) {
		var def = E[id];
		var t = this.run.threat;
		var hp = def.hp[0] + Math.floor(this.rng() * (def.hp[1] - def.hp[0] + 1));
		hp = Math.round(hp * (1 + (t >= 1 ? 0.1 : 0) + (t >= 5 && def.boss ? 0.2 : 0)));
		var e = { uid: ++this.enemyUid, id: id, name: def.name, art: def.art, hp: hp, maxHp: hp, shield: 0, status: {}, turn: 0, intent: null, dead: false, boss: !!def.boss, elite: !!def.elite };
		this.enemies.push(e);
		return e;
	};

	Combat.prototype.alive = function () {
		return this.enemies.filter(function (e) {
			return !e.dead;
		});
	};

	Combat.prototype.chooseIntent = function (e) {
		e.intent = E[e.id].ai(e, e.turn, this.rng);
	};

	/** Predicted damage per hit of an enemy attack against the player (for intent display). */
	Combat.prototype.enemyHitValue = function (e, base) {
		var d = base + (e.status.charge || 0) + (this.run.threat >= 2 ? 1 : 0);
		if (this.player.status.exposed) d *= 1.5;
		if (e.status.jammed) d *= 0.75;
		return Math.max(0, Math.floor(d));
	};

	Combat.prototype.playerHitValue = function (target, base) {
		var d = base;
		if (this.firstAttackPending && has(this.run, 'targeting')) d *= 2;
		if (target && target.status.exposed) d *= 1.5;
		if (this.player.status.jammed) d *= 0.75;
		return Math.max(0, Math.floor(d));
	};

	Combat.prototype.damageEnemy = function (e, amount, source) {
		if (!e || e.dead) return 0;
		var blocked = Math.min(e.shield, amount);
		e.shield -= blocked;
		var dmg = amount - blocked;
		e.hp -= dmg;
		this.fx.push({ type: 'hit', target: e.uid, amount: dmg, blocked: blocked, source: source || 'player' });
		if (e.hp <= 0) {
			e.hp = 0;
			e.dead = true;
			this.fx.push({ type: 'death', target: e.uid });
		}
		return dmg;
	};

	Combat.prototype.damagePlayer = function (amount, attacker, pierce) {
		var p = this.player;
		var blocked = pierce ? 0 : Math.min(p.shield, amount);
		p.shield -= blocked;
		var dmg = amount - blocked;
		this.run.hull -= dmg;
		this.fx.push({ type: 'hit', target: 'player', amount: dmg, blocked: blocked });
		if (attacker && !attacker.dead) {
			if (p.status.reflect) this.damageEnemy(attacker, p.status.reflect, 'reflect');
			if (dmg > 0 && has(this.run, 'mines')) this.damageEnemy(attacker, 3, 'mines');
		}
		this.checkDeath();
	};

	Combat.prototype.checkDeath = function () {
		if (this.run.hull > 0 || this.over) return;
		if (has(this.run, 'blackbox') && !this.run.blackboxUsed) {
			this.run.blackboxUsed = true;
			this.run.hull = Math.ceil(this.run.maxHull * 0.25);
			this.fx.push({ type: 'text', target: 'player', text: 'Black Box!' });
			return;
		}
		this.run.hull = 0;
		this.over = 'lose';
	};

	Combat.prototype.checkWin = function () {
		if (!this.over && this.alive().length === 0) this.over = 'win';
	};

	Combat.prototype.drawCards = function (n) {
		for (var i = 0; i < n; i++) {
			if (this.hand.length >= 10) return;
			if (!this.draw.length) {
				if (!this.discard.length) return;
				this.draw = shuffle(this.discard, this.rng);
				this.discard = [];
				this.fx.push({ type: 'reshuffle' });
			}
			this.hand.push(this.draw.pop());
		}
	};

	Combat.prototype.startTurn = function () {
		var p = this.player;
		var run = this.run;
		this.cardsThisTurn = 0;
		if (p.status.burn) {
			this.damagePlayer(p.status.burn, null, true);
			p.status.burn--;
			if (this.over) return;
		}
		if (has(run, 'core')) {
			run.hull -= 1;
			this.fx.push({ type: 'hit', target: 'player', amount: 1, blocked: 0 });
			this.checkDeath();
			if (this.over) return;
		}
		if (p.status.retain) delete p.status.retain;
		else if (this.turn > 1 || !has(run, 'plating')) p.shield = has(run, 'coolant') ? Math.min(p.shield, 6) : 0;
		var energy = 3 + (p.powers.reactor || 0) + (has(run, 'core') ? 1 : 0) + (this.turn === 1 && has(run, 'capacitor') ? 1 : 0) + (p.status.charged || 0) - (p.status.drained || 0);
		delete p.status.charged;
		delete p.status.drained;
		p.energy = Math.max(0, energy);
		if (p.powers.plating) p.shield += p.powers.plating;
		this.drawCards(5 + (this.turn === 1 && has(run, 'loader') ? 2 : 0));
	};

	Combat.prototype.cardCost = function (card) {
		var c = C[card.id].cost;
		return c === 'X' ? this.player.energy : c;
	};

	Combat.prototype.canPlay = function (card) {
		var def = C[card.id];
		if (def.type === 'curse' || this.over) return false;
		return def.cost === 'X' || def.cost <= this.player.energy;
	};

	/** Play the card at hand index i at target enemy uid (if it needs one). */
	Combat.prototype.play = function (i, targetUid) {
		var card = this.hand[i];
		if (!card || !this.canPlay(card)) return false;
		var def = C[card.id];
		var target = null;
		if (def.target === 'enemy') {
			target = this.enemies.find(function (e) {
				return e.uid === targetUid && !e.dead;
			});
			if (!target) target = this.alive()[0];
			if (!target) return false;
		}
		var cost = this.cardCost(card);
		this.player.energy -= cost;
		this.hand.splice(i, 1);
		var times = this.firstCard && has(this.run, 'echo') ? 2 : 1;
		this.firstCard = false;
		var self = this;
		var dealt = 0;
		for (var k = 0; k < times; k++) {
			if (target && target.dead) target = this.alive()[0] || null;
			if (def.target === 'enemy' && !target) break;
			if (def.type === 'attack') this.firstAttackPending = this.firstAttack;
			var ctx = this.context(target, cost, function (d) {
				dealt += d;
			});
			def.play(ctx, card.up);
			if (def.type === 'attack') {
				this.firstAttack = false;
				this.firstAttackPending = false;
			}
		}
		if (dealt > this.run.stats.maxHit) this.run.stats.maxHit = dealt;
		this.run.stats.cardsPlayed++;
		this.cardsThisTurn++;
		if (this.cardsThisTurn > this.run.stats.maxTurnCards) this.run.stats.maxTurnCards = this.cardsThisTurn;
		var p = this.player;
		if (def.type === 'attack' && p.powers.combatai) {
			p.shield += p.powers.combatai;
			this.fx.push({ type: 'shield', target: 'player', n: p.powers.combatai });
		}
		if (def.type === 'skill' && p.powers.siphon) {
			var r = this.randomEnemy();
			if (r) this.damageEnemy(r, p.powers.siphon, 'siphon');
		}
		if (def.type === 'power') {
			/* powers leave play */
		} else if (def.exhaust) this.exhaust.push(card);
		else this.discard.push(card);
		this.checkWin();
		return true;
	};

	Combat.prototype.randomEnemy = function () {
		var a = this.alive();
		return a.length ? a[Math.floor(this.rng() * a.length)] : null;
	};

	Combat.prototype.context = function (target, xSpent, onDealt) {
		var self = this;
		var p = this.player;
		return {
			player: p,
			target: target,
			xSpent: xSpent,
			hit: function (t, base, times) {
				for (var i = 0; i < (times || 1); i++) {
					if (!t || t.dead) return;
					onDealt(self.damageEnemy(t, self.playerHitValue(t, base)));
				}
			},
			hitAll: function (base) {
				self.alive().forEach(function (e) {
					onDealt(self.damageEnemy(e, self.playerHitValue(e, base)));
				});
			},
			randomEnemy: function () {
				return self.randomEnemy();
			},
			shield: function (n) {
				p.shield += n;
				self.fx.push({ type: 'shield', target: 'player', n: n });
			},
			draw: function (n) {
				self.drawCards(n);
			},
			energy: function (n) {
				p.energy += n;
			},
			heal: function (n) {
				var before = self.run.hull;
				self.run.hull = Math.min(self.run.maxHull, self.run.hull + n);
				self.fx.push({ type: 'heal', target: 'player', n: self.run.hull - before });
			},
			status: function (t, s, n) {
				if (!t || t.dead) return;
				t.status[s] = (t.status[s] || 0) + n;
				self.fx.push({ type: 'status', target: t === p ? 'player' : t.uid, status: s, n: n });
			},
			statusAll: function (s, n) {
				self.alive().forEach(function (e) {
					e.status[s] = (e.status[s] || 0) + n;
				});
				self.fx.push({ type: 'status', target: 'all', status: s, n: n });
			},
			power: function (id, n) {
				p.powers[id] = (p.powers[id] || 0) + n;
				self.fx.push({ type: 'power', id: id });
			}
		};
	};

	/** End the player's turn and resolve the enemy turn. */
	Combat.prototype.endTurn = function () {
		if (this.over) return;
		var p = this.player;
		var self = this;
		var run = this.run;
		if (p.powers.turret) {
			var t = this.randomEnemy();
			if (t) this.damageEnemy(t, p.powers.turret, 'turret');
		}
		this.hand.forEach(function (c) {
			if (c.id === 'breach') {
				run.hull -= 2;
				self.fx.push({ type: 'hit', target: 'player', amount: 2, blocked: 0 });
			}
		});
		this.checkDeath();
		if (p.status.regen) {
			var before = run.hull;
			run.hull = Math.min(run.maxHull, run.hull + p.status.regen);
			this.fx.push({ type: 'heal', target: 'player', n: run.hull - before });
			p.status.regen--;
			if (!p.status.regen) delete p.status.regen;
		}
		this.discard = this.discard.concat(this.hand);
		this.hand = [];
		['exposed', 'jammed'].forEach(function (s) {
			if (p.status[s]) {
				p.status[s]--;
				if (!p.status[s]) delete p.status[s];
			}
		});
		delete p.status.reflect;
		this.checkWin();
		if (this.over) return;

		// Enemy turn
		var acting = this.alive();
		for (var i = 0; i < acting.length && !this.over; i++) {
			var e = acting[i];
			if (e.dead) continue;
			if (e.status.burn) {
				this.damageEnemy(e, e.status.burn, 'burn');
				e.status.burn--;
				if (!e.status.burn) delete e.status.burn;
				if (e.dead) continue;
			}
			e.shield = 0;
			var acts = e.intent ? e.intent.actions : [];
			for (var a = 0; a < acts.length && !this.over && !e.dead; a++) this.enemyAction(e, acts[a]);
			['exposed', 'jammed'].forEach(function (s) {
				if (e.status[s]) {
					e.status[s]--;
					if (!e.status[s]) delete e.status[s];
				}
			});
		}
		this.checkWin();
		if (this.over) return;
		this.alive().forEach(function (e) {
			e.turn++;
			self.chooseIntent(e);
		});
		this.turn++;
		this.startTurn();
	};

	Combat.prototype.enemyAction = function (e, act) {
		var p = this.player;
		switch (act.type) {
			case 'attack':
				for (var k = 0; k < act.times && !this.over && !e.dead; k++) this.damagePlayer(this.enemyHitValue(e, act.dmg), e);
				break;
			case 'shield':
				e.shield += act.n;
				this.fx.push({ type: 'shield', target: e.uid, n: act.n });
				break;
			case 'status':
				var who = act.who === 'self' ? e.status : p.status;
				who[act.status] = (who[act.status] || 0) + act.n;
				this.fx.push({ type: 'status', target: act.who === 'self' ? e.uid : 'player', status: act.status, n: act.n });
				break;
			case 'charge':
				e.status.charge = (e.status.charge || 0) + act.n;
				this.fx.push({ type: 'status', target: e.uid, status: 'charge', n: act.n });
				break;
			case 'heal':
				e.hp = Math.min(e.maxHp, e.hp + act.n);
				this.fx.push({ type: 'heal', target: e.uid, n: act.n });
				break;
			case 'summon':
				var same = this.alive().filter(function (x) {
					return x.id === act.id;
				}).length;
				if (this.alive().length < 4 && (!act.max || same < act.max)) {
					var s = this.spawn(act.id);
					this.chooseIntent(s);
					this.fx.push({ type: 'summon', target: s.uid });
				}
				break;
			case 'drain':
				p.status.drained = 1;
				this.fx.push({ type: 'status', target: 'player', status: 'drained', n: 1 });
				break;
		}
	};

	// ── Scoring ───────────────────────────────────────────────────────

	function score(run, won) {
		var s = run.stats.floors * 10 + run.stats.elites * 40 + run.stats.bosses * 150 + (won ? 500 + run.hull * 3 : 0);
		return Math.round(s * (1 + run.threat * 0.25));
	}

	SW.newRun = newRun;
	SW.addCard = addCard;
	SW.cardName = cardName;
	SW.canUpgrade = canUpgrade;
	SW.upgradeRandom = upgradeRandom;
	SW.gainModule = gainModule;
	SW.randomCard = randomCard;
	SW.genMap = genMap;
	SW.findNode = findNode;
	SW.reachable = reachable;
	SW.enterNode = enterNode;
	SW.makeReward = makeReward;
	SW.removalPrice = removalPrice;
	SW.Combat = Combat;
	SW.score = score;
	SW.rngFor = rngFor;
	SW.has = has;
	SW.ROWS = ROWS;
})(window.Starward);
