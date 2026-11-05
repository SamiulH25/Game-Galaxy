/* Starward — cards, enemies, modules and events. Pure data + small effect functions. */
(function (SW) {
	'use strict';

	// ── Cards ─────────────────────────────────────────────────────────
	// play(c, up): c is the combat context (see engine.js); up = upgraded.
	var CARDS = {
		laser: { name: 'Laser', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 9 : 6) + ' damage.'; }, play: function (c, u) { c.hit(c.target, u ? 9 : 6); } },
		deflector: { name: 'Deflector', type: 'skill', rarity: 'starter', cost: 1, text: function (u) { return 'Gain ' + (u ? 8 : 5) + ' Shield.'; }, play: function (c, u) { c.shield(u ? 8 : 5); } },
		overload: { name: 'Overload', type: 'attack', rarity: 'starter', cost: 2, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 13 : 9) + ' damage. Apply 2 Exposed.'; }, play: function (c, u) { c.hit(c.target, u ? 13 : 9); c.status(c.target, 'exposed', 2); } },

		twin: { name: 'Twin Lasers', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 5 : 3) + ' damage twice.'; }, play: function (c, u) { c.hit(c.target, u ? 5 : 3, 2); } },
		flak: { name: 'Flak Burst', type: 'attack', rarity: 'common', cost: 1, text: function (u) { return 'Deal ' + (u ? 7 : 4) + ' damage to ALL enemies.'; }, play: function (c, u) { c.hitAll(u ? 7 : 4); } },
		ion: { name: 'Ion Lance', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 7 : 5) + ' damage. Apply ' + (u ? 3 : 2) + ' Jammed.'; }, play: function (c, u) { c.hit(c.target, u ? 7 : 5); c.status(c.target, 'jammed', u ? 3 : 2); } },
		harpoon: { name: 'Harpoon', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 10 : 7) + ' damage. Draw 1 card.'; }, play: function (c, u) { c.hit(c.target, u ? 10 : 7); c.draw(1); } },
		torch: { name: 'Plasma Torch', type: 'attack', rarity: 'common', cost: 0, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 6 : 4) + ' damage.'; }, play: function (c, u) { c.hit(c.target, u ? 6 : 4); } },
		burnround: { name: 'Incendiary Round', type: 'attack', rarity: 'common', cost: 1, target: 'enemy', text: function (u) { return 'Deal 3 damage. Apply ' + (u ? 7 : 5) + ' Burn.'; }, play: function (c, u) { c.hit(c.target, 3); c.status(c.target, 'burn', u ? 7 : 5); } },
		evasive: { name: 'Evasive Roll', type: 'skill', rarity: 'common', cost: 1, text: function (u) { return 'Gain ' + (u ? 7 : 4) + ' Shield. Draw 1 card.'; }, play: function (c, u) { c.shield(u ? 7 : 4); c.draw(1); } },
		scan: { name: 'Deep Scan', type: 'skill', rarity: 'common', cost: 0, exhaust: true, text: function (u) { return 'Draw ' + (u ? 3 : 2) + ' cards. Exhaust.'; }, play: function (c, u) { c.draw(u ? 3 : 2); } },
		patch: { name: 'Hull Patch', type: 'skill', rarity: 'common', cost: 1, exhaust: true, text: function (u) { return 'Repair ' + (u ? 9 : 6) + ' hull. Exhaust.'; }, play: function (c, u) { c.heal(u ? 9 : 6); } },
		counter: { name: 'Countermeasures', type: 'skill', rarity: 'common', cost: 1, text: function (u) { return 'Gain ' + (u ? 5 : 3) + ' Shield. Apply 1 Jammed to ALL enemies.'; }, play: function (c, u) { c.shield(u ? 5 : 3); c.statusAll('jammed', 1); } },
		lock: { name: 'Target Lock', type: 'skill', rarity: 'common', cost: 1, target: 'enemy', text: function (u) { return 'Apply ' + (u ? 4 : 3) + ' Exposed.'; }, play: function (c, u) { c.status(c.target, 'exposed', u ? 4 : 3); } },

		railgun: { name: 'Railgun', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 21 : 16) + ' damage.'; }, play: function (c, u) { c.hit(c.target, u ? 21 : 16); } },
		barrage: { name: 'Missile Barrage', type: 'attack', rarity: 'uncommon', cost: 2, text: function (u) { return 'Deal 4 damage to a random enemy ' + (u ? 5 : 4) + ' times.'; }, play: function (c, u) { for (var i = 0; i < (u ? 5 : 4); i++) c.hit(c.randomEnemy(), 4); } },
		chain: { name: 'Chain Arc', type: 'attack', rarity: 'uncommon', cost: 2, text: function (u) { return 'Deal ' + (u ? 10 : 7) + ' damage to ALL enemies. Apply 1 Jammed to ALL.'; }, play: function (c, u) { c.hitAll(u ? 10 : 7); c.statusAll('jammed', 1); } },
		ram: { name: 'Ram', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', text: function (u) { return 'Deal damage equal to your Shield' + (u ? ' +5' : '') + '.'; }, play: function (c, u) { c.hit(c.target, c.player.shield + (u ? 5 : 0)); } },
		execute: { name: 'Execution Protocol', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy', text: function (u) { return 'Deal ' + (u ? 10 : 7) + ' damage. Double if the target is Exposed.'; }, play: function (c, u) { var d = u ? 10 : 7; c.hit(c.target, c.target.status.exposed ? d * 2 : d); } },
		salvo: { name: 'Salvo', type: 'attack', rarity: 'uncommon', cost: 'X', target: 'enemy', text: function (u) { return 'Deal ' + (u ? 7 : 5) + ' damage X times (X = energy spent).'; }, play: function (c, u) { c.hit(c.target, u ? 7 : 5, c.xSpent); } },
		bulwark: { name: 'Bulwark', type: 'skill', rarity: 'uncommon', cost: 2, text: function (u) { return 'Gain ' + (u ? 17 : 12) + ' Shield.'; }, play: function (c, u) { c.shield(u ? 17 : 12); } },
		reroute: { name: 'Reroute Power', type: 'skill', rarity: 'uncommon', cost: 0, exhaust: true, text: function (u) { return 'Gain ' + (u ? 2 : 1) + ' Energy. Exhaust.'; }, play: function (c, u) { c.energy(u ? 2 : 1); } },
		overclock: { name: 'Overclock', type: 'skill', rarity: 'uncommon', cost: 1, text: function (u) { return 'Next turn, gain ' + (u ? 3 : 2) + ' Energy.'; }, play: function (c, u) { c.player.status.charged = (c.player.status.charged || 0) + (u ? 3 : 2); } },
		mirror: { name: 'Mirror Shield', type: 'skill', rarity: 'uncommon', cost: 2, text: function (u) { return 'Gain ' + (u ? 11 : 8) + ' Shield. Reflect ' + (u ? 4 : 3) + ' damage per hit this turn.'; }, play: function (c, u) { c.shield(u ? 11 : 8); c.player.status.reflect = (c.player.status.reflect || 0) + (u ? 4 : 3); } },
		nanites: { name: 'Nanite Swarm', type: 'skill', rarity: 'uncommon', cost: 1, exhaust: true, text: function (u) { return 'Gain ' + (u ? 6 : 4) + ' Regen. Exhaust.'; }, play: function (c, u) { c.status(c.player, 'regen', u ? 6 : 4); } },
		fortify: { name: 'Fortify', type: 'skill', rarity: 'uncommon', cost: 1, text: function (u) { return (u ? 'Gain 4 Shield. ' : '') + 'Your Shield carries over to next turn.'; }, play: function (c, u) { if (u) c.shield(4); c.player.status.retain = 1; } },

		turret: { name: 'Auto-Turret', type: 'power', rarity: 'rare', cost: 2, text: function (u) { return 'At the end of your turn, deal ' + (u ? 6 : 4) + ' damage to a random enemy.'; }, play: function (c, u) { c.power('turret', u ? 6 : 4); } },
		reactor: { name: 'Reactor Tuning', type: 'power', rarity: 'rare', cost: 2, text: function (u) { return 'Gain 1 extra Energy at the start of each turn.' + (u ? ' Gain 1 Energy now.' : ''); }, play: function (c, u) { c.power('reactor', 1); if (u) c.energy(1); } },
		plating: { name: 'Hardened Plating', type: 'power', rarity: 'rare', cost: 2, text: function (u) { return 'At the start of each turn, gain ' + (u ? 5 : 3) + ' Shield.'; }, play: function (c, u) { c.power('plating', u ? 5 : 3); } },
		combatai: { name: 'Combat AI', type: 'power', rarity: 'rare', cost: 1, text: function (u) { return 'Whenever you play an Attack, gain ' + (u ? 2 : 1) + ' Shield.'; }, play: function (c, u) { c.power('combatai', u ? 2 : 1); } },
		siphon: { name: 'Power Siphon', type: 'power', rarity: 'rare', cost: 1, text: function (u) { return 'Whenever you play a Skill, deal ' + (u ? 4 : 3) + ' damage to a random enemy.'; }, play: function (c, u) { c.power('siphon', u ? 4 : 3); } },
		voidlance: { name: 'Void Lance', type: 'attack', rarity: 'rare', cost: 2, target: 'enemy', exhaust: true, text: function (u) { return 'Deal ' + (u ? 40 : 30) + ' damage. Exhaust.'; }, play: function (c, u) { c.hit(c.target, u ? 40 : 30); } },
		supernova: { name: 'Supernova', type: 'attack', rarity: 'rare', cost: 3, text: function (u) { return 'Deal ' + (u ? 22 : 16) + ' damage to ALL enemies. Apply 2 Exposed to ALL.'; }, play: function (c, u) { c.hitAll(u ? 22 : 16); c.statusAll('exposed', 2); } },

		// Curses: unplayable clutter.
		static: { name: 'Static', type: 'curse', rarity: 'curse', cost: null, text: function () { return 'Unplayable.'; } },
		breach: { name: 'Hull Breach', type: 'curse', rarity: 'curse', cost: null, text: function () { return 'Unplayable. At the end of your turn, if this is in your hand, lose 2 hull.'; } }
	};

	var STARTER = ['laser', 'laser', 'laser', 'laser', 'laser', 'deflector', 'deflector', 'deflector', 'deflector', 'overload'];

	// ── Statuses ──────────────────────────────────────────────────────
	var STATUS = {
		exposed: { name: 'Exposed', desc: 'Takes 50% more attack damage.', tone: 'bad', decays: true },
		jammed: { name: 'Jammed', desc: 'Deals 25% less attack damage.', tone: 'bad', decays: true },
		burn: { name: 'Burn', desc: 'Loses that much hull at the start of its turn, then Burn drops by 1.', tone: 'bad' },
		regen: { name: 'Regen', desc: 'Repairs that much hull at the end of its turn, then Regen drops by 1.', tone: 'good' },
		charge: { name: 'Charge', desc: 'Attacks deal this much extra damage.', tone: 'good' },
		charged: { name: 'Overclocked', desc: 'Gains this much extra Energy next turn.', tone: 'good' },
		reflect: { name: 'Reflect', desc: 'Deals this much damage back to each attacker this turn.', tone: 'good' },
		retain: { name: 'Fortified', desc: 'Shield carries over to next turn.', tone: 'good' },
		drained: { name: 'Drained', desc: 'Gains 1 less Energy next turn.', tone: 'bad' }
	};

	// ── Enemies ───────────────────────────────────────────────────────
	// Intents are { name, actions: [...] }; actions: attack{dmg,times} shield{n} status{status,n,who:'player'|'self'} charge{n} heal{n} summon{id} drain
	function A(dmg, times) {
		return { type: 'attack', dmg: dmg, times: times || 1 };
	}
	function SH(n) {
		return { type: 'shield', n: n };
	}
	function ST(status, n, who) {
		return { type: 'status', status: status, n: n, who: who || 'player' };
	}
	function pick(rng, list) {
		return list[Math.floor(rng() * list.length)];
	}

	var ENEMIES = {
		drone: { name: 'Scrap Drone', hp: [18, 22], art: 'drone', ai: function (e, t, rng) { return t % 3 === 2 ? { name: 'Patch up', actions: [SH(6), A(3)] } : { name: 'Cutter', actions: [A(6)] }; } },
		skiff: { name: 'Pirate Skiff', hp: [26, 31], art: 'skiff', ai: function (e, t, rng) { return [{ name: 'Broadside', actions: [A(8)] }, { name: 'Strafe', actions: [A(4, 2)] }, { name: 'Rev engines', actions: [{ type: 'charge', n: 2 }, SH(4)] }][t % 3]; } },
		mite: { name: 'Void Mite', hp: [11, 14], art: 'mite', ai: function (e, t, rng) { return rng() < 0.6 ? { name: 'Bite', actions: [A(5)] } : { name: 'Static', actions: [A(3), ST('jammed', 1)] }; } },
		corsair: { name: 'Corsair Captain', hp: [54, 58], art: 'corsair', elite: true, ai: function (e, t) { return [{ name: 'Target lock', actions: [ST('exposed', 1), SH(8)] }, { name: 'Broadside', actions: [A(4, 3)] }, { name: 'Heavy cannon', actions: [A(12)] }][t % 3]; } },
		warden: { name: 'Warden Mk II', hp: [40, 44], art: 'warden', ai: function (e, t) { return [{ name: 'Barrier', actions: [SH(10), A(5)] }, { name: 'Lance', actions: [A(12)] }, { name: 'Mark', actions: [A(6), ST('exposed', 1)] }][t % 3]; } },
		wisp: { name: 'Ion Wisp', hp: [22, 26], art: 'wisp', ai: function (e, t, rng) { return t % 2 ? { name: 'Arc', actions: [A(8)] } : { name: 'Interference', actions: [A(4), ST('jammed', 2)] }; } },
		leech: { name: 'Leech Pod', hp: [32, 36], art: 'leech', ai: function (e, t) { return [{ name: 'Feed', actions: [A(6), { type: 'heal', n: 6 }] }, { name: 'Spore', actions: [ST('burn', 4)] }][t % 2]; } },
		frigate: { name: 'Siege Frigate', hp: [92, 98], art: 'frigate', elite: true, ai: function (e, t) { return [{ name: 'Charging cannon…', actions: [SH(12)] }, { name: 'Charging cannon…', actions: [SH(12), { type: 'charge', n: 2 }] }, { name: 'SIEGE SHOT', actions: [A(26)] }, { name: 'Point defense', actions: [A(5, 2)] }][t % 4]; } },
		seraph: { name: 'Null Seraph', hp: [52, 58], art: 'seraph', ai: function (e, t) { return [{ name: 'Wings of glass', actions: [A(5, 3)] }, { name: 'Halo', actions: [SH(14), { type: 'charge', n: 1 }] }, { name: 'Unmake', actions: [A(10), ST('exposed', 1)] }][t % 3]; } },
		hunter: { name: 'Shade Hunter', hp: [44, 48], art: 'hunter', ai: function (e, t, rng) { return pick(rng, [{ name: 'Ambush', actions: [A(14)] }, { name: 'Hamstring', actions: [A(7), ST('jammed', 2)] }, { name: 'Fade', actions: [SH(12)] }]); } },
		carrier: { name: 'Hive Carrier', hp: [70, 76], art: 'carrier', elite: true, ai: function (e, t) { return t % 3 === 0 ? { name: 'Launch mites', actions: [{ type: 'summon', id: 'mite' }, SH(8)] } : { name: 'Ram', actions: [A(11)] }; } },

		// Bosses
		foundry: { name: 'The Foundry Warden', hp: [120, 120], art: 'foundry', boss: true, ai: function (e, t) { return [{ name: 'Heat up', actions: [{ type: 'charge', n: 2 }, SH(10)] }, { name: 'Hammerfall', actions: [A(13)] }, { name: 'Spark shower', actions: [A(4, 2), ST('burn', 3)] }, { name: 'Cool down', actions: [SH(8), A(6)] }][t % 4]; } },
		mother: { name: 'Mother of Wisps', hp: [150, 150], art: 'mother', boss: true, ai: function (e, t) { return [{ name: 'Brood', actions: [{ type: 'summon', id: 'wispling', max: 2 }, SH(10)] }, { name: 'Siphon', actions: [A(8), { type: 'drain' }] }, { name: 'Storm', actions: [A(3, 4)] }, { name: 'Rest', actions: [SH(12), { type: 'heal', n: 5 }] }, { name: 'Overcharge', actions: [{ type: 'charge', n: 2 }, A(9)] }][t % 5]; } },
		wispling: { name: 'Wispling', hp: [13, 16], art: 'wisp', ai: function (e, t) { return t % 2 ? { name: 'Arc', actions: [A(6)] } : { name: 'Flicker', actions: [A(3), ST('jammed', 1)] }; } },
		eclipse: {
			name: 'The Eclipse',
			hp: [220, 220],
			art: 'eclipse',
			boss: true,
			ai: function (e, t) {
				var enraged = e.hp <= e.maxHp / 2;
				var list = enraged
					? [{ name: 'Corona', actions: [A(6, 3)] }, { name: 'Shroud', actions: [SH(20), { type: 'charge', n: 1 }] }, { name: 'Totality', actions: [A(26)] }, { name: 'Afterglow', actions: [A(5), ST('jammed', 2)] }]
					: [{ name: 'Penumbra', actions: [A(10), ST('jammed', 1)] }, { name: 'Shroud', actions: [SH(18)] }, { name: 'Flare', actions: [A(5, 2), ST('exposed', 1)] }, { name: 'Gather light…', actions: [{ type: 'charge', n: 1 }, SH(10)] }];
				return list[t % list.length];
			}
		}
	};

	var ENCOUNTERS = {
		1: { normal: [['drone', 'drone'], ['skiff'], ['mite', 'mite', 'mite'], ['skiff', 'mite'], ['drone', 'mite', 'mite']], elite: [['corsair'], ['drone', 'skiff', 'drone']], boss: ['foundry'] },
		2: { normal: [['warden'], ['wisp', 'wisp'], ['leech', 'mite'], ['warden', 'drone'], ['leech', 'wisp']], elite: [['frigate'], ['carrier']], boss: ['mother'] },
		3: { normal: [['seraph'], ['hunter', 'mite'], ['seraph', 'wisp'], ['hunter', 'leech'], ['warden', 'hunter']], elite: [['carrier', 'mite'], ['frigate', 'wisp']], boss: ['eclipse'] }
	};

	// ── Modules (relics) ─────────────────────────────────────────────
	var MODULES = {
		capacitor: { name: 'Spare Capacitor', icon: '⚡', rarity: 'common', text: 'Gain 1 extra Energy on the first turn of each combat.' },
		plating: { name: 'Reactive Plating', icon: '⛨', rarity: 'common', text: 'Start each combat with 8 Shield.' },
		salvager: { name: 'Salvage Drone', icon: '⚙', rarity: 'common', text: 'Gain 10 extra credits after each combat.' },
		medbay: { name: 'Field Repair Bay', icon: '✚', rarity: 'common', text: 'Repair 4 hull after each combat.' },
		targeting: { name: 'Targeting Computer', icon: '◎', rarity: 'common', text: 'Your first Attack each combat deals double damage.' },
		dampers: { name: 'Ion Dampers', icon: '≋', rarity: 'common', text: 'Enemies start each combat with 1 Jammed.' },
		hullplus: { name: 'Hull Reinforcement', icon: '▣', rarity: 'common', text: 'Gain 10 max hull (and repair 10).', onGain: function (run) { run.maxHull += 10; run.hull += 10; } },
		loader: { name: 'Quick Loader', icon: '➹', rarity: 'uncommon', text: 'Draw 2 extra cards on the first turn of each combat.' },
		coolant: { name: 'Coolant Loop', icon: '❄', rarity: 'uncommon', text: 'Up to 6 Shield carries over between turns.' },
		lucky: { name: 'Lucky Star', icon: '✦', rarity: 'uncommon', text: 'Card rewards offer 4 choices.' },
		bounty: { name: 'Bounty Scanner', icon: '$', rarity: 'uncommon', text: 'Elites and bosses drop 30 extra credits.' },
		mines: { name: 'Shock Mines', icon: '✹', rarity: 'uncommon', text: 'Whenever you lose hull to an attack, deal 3 damage to the attacker.' },
		echo: { name: 'Echo Chamber', icon: '♾', rarity: 'rare', text: 'The first card you play each combat is played twice.' },
		core: { name: 'Unstable Core', icon: '☢', rarity: 'rare', text: 'Gain 1 extra Energy every turn. Lose 1 hull at the start of each turn.' },
		blackbox: { name: 'Black Box', icon: '◼', rarity: 'rare', text: 'The first time your hull would hit 0, survive with 25% hull instead.' },
		fabricator: { name: 'Nanofabricator', icon: '⬢', rarity: 'rare', text: 'After each elite or boss, upgrade a random card.' }
	};

	// ── Events ────────────────────────────────────────────────────────
	// Each option: { label, detail, available(run)?, apply(run, api) -> result text }
	var EVENTS = [
		{
			id: 'derelict',
			title: 'Derelict Freighter',
			text: 'A freighter drifts dark, cargo bay torn open. Something still hums inside.',
			options: [
				{ label: 'Salvage the hold', detail: 'Gain 45 credits. Lose 7 hull.', apply: function (r, a) { r.credits += 45; a.damage(7); return 'You haul out crates of parts. A conduit bursts as you leave.'; } },
				{ label: 'Download the flight logs', detail: 'Upgrade a random card.', apply: function (r, a) { var n = a.upgradeRandom(); return n ? 'Old combat routines: ' + n + ' upgraded.' : 'Nothing left to learn.'; } },
				{ label: 'Leave it be', detail: '', apply: function () { return 'Some ghosts are best left alone.'; } }
			]
		},
		{
			id: 'merchant',
			title: 'Wandering Trade AI',
			text: '"Greetings, courier. I deal in rare things. My prices are… unusual."',
			options: [
				{ label: 'Trade hull plating', detail: 'Lose 6 max hull. Gain a rare card.', apply: function (r, a) { r.maxHull -= 6; r.hull = Math.min(r.hull, r.maxHull); var n = a.gainCard('rare'); return 'It welds your plating into its own frame. You receive ' + n + '.'; } },
				{ label: 'Buy a module (70 credits)', detail: 'Gain a random module.', available: function (r) { return r.credits >= 70; }, apply: function (r, a) { r.credits -= 70; return 'Installed: ' + a.gainModule() + '.'; } },
				{ label: 'Decline', detail: '', apply: function () { return '"A pity. Safe travels."'; } }
			]
		},
		{
			id: 'storm',
			title: 'Nebula Storm',
			text: 'A charged storm front blocks the lane. Lightning paints the hull.',
			options: [
				{ label: 'Push through', detail: 'Lose 9 hull. Gain a random module.', apply: function (r, a) { a.damage(9); return 'Scorched but through — and you snagged ' + a.gainModule() + ' from the wreck of an unluckier ship.'; } },
				{ label: 'Ride the lightning', detail: 'Upgrade 2 random cards. Add a Static curse.', apply: function (r, a) { a.upgradeRandom(); a.upgradeRandom(); a.addCard('static'); return 'Your systems sing with new tricks — and a persistent crackle.'; } },
				{ label: 'Wait it out', detail: 'Lose 25 credits.', apply: function (r) { r.credits = Math.max(0, r.credits - 25); return 'Docking fees at the nearest buoy add up.'; } }
			]
		},
		{
			id: 'beacon',
			title: 'Ancient Beacon',
			text: 'A beacon older than any charted civilisation pulses in a slow, patient rhythm.',
			options: [
				{ label: 'Touch the signal', detail: 'Fully repair hull — or add a Hull Breach curse.', apply: function (r, a, rng) { if (rng() < 0.6) { r.hull = r.maxHull; return 'Warmth floods the ship. Every seam seals.'; } a.addCard('breach'); return 'The signal turns sharp. A seam splits open and will not close.'; } },
				{ label: 'Record and leave', detail: 'Gain 20 credits.', apply: function (r) { r.credits += 20; return 'Collectors will pay for this.'; } }
			]
		},
		{
			id: 'smugglers',
			title: "Smugglers' Den",
			text: 'Neon, noise and a table where credits change hands fast.',
			options: [
				{ label: 'Gamble 30 credits', detail: '50%: win 60.', available: function (r) { return r.credits >= 30; }, apply: function (r, a, rng) { if (rng() < 0.5) { r.credits += 30; return 'The dice love you tonight. +60.'; } r.credits -= 30; return 'The house wins. -30.'; } },
				{ label: 'Hire a mechanic (40 credits)', detail: 'Remove a card from your deck.', available: function (r) { return r.credits >= 40 && r.deck.length > 1; }, apply: function (r, a) { r.credits -= 40; a.chooseRemove(); return 'The mechanic strips out dead weight.'; } },
				{ label: 'Leave', detail: '', apply: function () { return 'You keep your credits — and your fingers.'; } }
			]
		},
		{
			id: 'drydock',
			title: 'Abandoned Drydock',
			text: 'The tools still work. You have time for one job.',
			options: [
				{ label: 'Refit a system', detail: 'Upgrade a card of your choice.', apply: function (r, a) { a.chooseUpgrade(); return 'Fine work.'; } },
				{ label: 'Patch the hull', detail: 'Repair 30% of max hull.', apply: function (r, a) { a.heal(Math.round(r.maxHull * 0.3)); return 'Good as new. Nearly.'; } }
			]
		},
		{
			id: 'whisper',
			title: 'Void Whisper',
			text: 'Between stars, a voice offers you a weapon that should not exist.',
			options: [
				{ label: 'Accept', detail: 'Gain Void Lance. Add a Static curse.', apply: function (r, a) { a.addCard('voidlance'); a.addCard('static'); return 'Something heavy settles into your arsenal. Something else follows it in.'; } },
				{ label: 'Refuse', detail: '', apply: function () { return 'The voice laughs, then is gone.'; } }
			]
		},
		{
			id: 'convoy',
			title: 'Refugee Convoy',
			text: 'Three battered transports beg for supplies. They have little to offer.',
			options: [
				{ label: 'Share supplies', detail: 'Lose 8 hull. Upgrade 2 random cards.', apply: function (r, a) { a.damage(8); a.upgradeRandom(); a.upgradeRandom(); return 'Their engineers repay you with clever tweaks.'; } },
				{ label: 'Sell them parts', detail: 'Gain 35 credits.', apply: function (r) { r.credits += 35; return 'Business is business.'; } }
			]
		}
	];

	SW.CARDS = CARDS;
	SW.STARTER = STARTER;
	SW.STATUS = STATUS;
	SW.ENEMIES = ENEMIES;
	SW.ENCOUNTERS = ENCOUNTERS;
	SW.MODULES = MODULES;
	SW.EVENTS = EVENTS;
})((window.Starward = window.Starward || {}));
