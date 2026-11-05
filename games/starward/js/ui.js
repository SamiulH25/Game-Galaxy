/* Starward — screens, combat UI, modals, persistence. */
(function (SW) {
	'use strict';

	var C = SW.CARDS,
		M = SW.MODULES,
		ST = SW.STATUS;
	var $ = function (id) {
		return document.getElementById(id);
	};
	var esc = function (s) {
		return String(s).replace(/[&<>"]/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
		});
	};

	var save = { v: 1, meta: { best: 0, wins: 0, runs: 0, threat: 0, ach: {} }, run: null };
	var settings = { muted: false, reducedMotion: false };
	var run = null;
	var combat = null;
	var combatSnapshot = null;
	var selected = -1;
	var targetIdx = 0;
	var busy = false;
	var pickThreat = 0;
	var saveTimer = 0;

	// ── Icons & art ───────────────────────────────────────────────────

	var ICON = {
		attack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
		skill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s8-3.5 8-10V5l-8-3-8 3v6c0 6.5 8 10 8 10z"/></svg>',
		power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.6 6.6L21 9.5l-5 4.4 1.5 6.6L12 17l-5.5 3.5L8 13.9 3 9.5l6.4-.9z"/></svg>',
		curse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l-2 6 4 3-3 9M6 6l3 3M18 8l-4 2"/></svg>',
		sword: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>',
		shield: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/></svg>',
		spark: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z"/></svg>'
	};

	var NODE_ICON = {
		battle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19M4 9l5-5M15 4l5 5"/></svg>',
		elite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 9l4 3 4-7 4 7 4-3-2 10H6z"/><circle cx="12" cy="14" r="1.5" fill="currentColor"/></svg>',
		event: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18h.01"/></svg>',
		shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5V8M12 16v1.5"/></svg>',
		repair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="5"/></svg>',
		boss: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="12" r="9"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M4.2 19.8 7 17M17 7l2.8-2.8"/></svg>'
	};

	var SHIP =
		'<svg class="ship" viewBox="0 0 120 70"><defs><linearGradient id="hullg" x1="0" x2="1"><stop offset="0" stop-color="#6b4a3a"/><stop offset="1" stop-color="#e9c9a8"/></linearGradient><radialGradient id="eng"><stop offset="0" stop-color="#fff2c4"/><stop offset="1" stop-color="#ff7a2d" stop-opacity="0"/></radialGradient></defs><ellipse cx="14" cy="35" rx="16" ry="8" fill="url(#eng)"/><path d="M18 35 L40 22 L92 28 L114 35 L92 42 L40 48 Z" fill="url(#hullg)" stroke="#ffcf9e" stroke-width="1.5"/><path d="M48 24 L64 8 L72 26 Z M48 46 L64 62 L72 44 Z" fill="#8b5a3f" stroke="#ffcf9e" stroke-width="1.2"/><path d="M84 31 L100 35 L84 39 Z" fill="#7ac4ff"/></svg>';

	function enemyArt(art, boss) {
		var hue = { drone: 25, skiff: 10, mite: 280, corsair: 0, warden: 200, wisp: 190, leech: 110, frigate: 30, seraph: 260, hunter: 300, carrier: 45, foundry: 20, mother: 185, eclipse: 270 }[art] || 0;
		var g = '<defs><radialGradient id="g' + art + '" cx="40%" cy="35%"><stop offset="0" stop-color="hsl(' + hue + ',80%,78%)"/><stop offset="1" stop-color="hsl(' + hue + ',70%,28%)"/></radialGradient></defs>';
		var f = 'url(#g' + art + ')';
		var st = 'stroke="hsl(' + hue + ',90%,75%)" stroke-width="1.5"';
		var body = {
			drone: '<circle cx="50" cy="40" r="16" fill="' + f + '" ' + st + '/><path d="M20 40h14M66 40h14M50 10v14M50 56v14" stroke="hsl(25,90%,70%)" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="40" r="5" fill="#fff3d0"/>',
			skiff: '<path d="M10 40 L60 18 L92 40 L60 62 Z" fill="' + f + '" ' + st + '/><path d="M40 40 L70 30 L70 50 Z" fill="#ffd9c4" opacity=".6"/>',
			mite: '<ellipse cx="50" cy="44" rx="18" ry="14" fill="' + f + '" ' + st + '/><path d="M34 36 L22 22 M66 36 L78 22 M36 54 L24 66 M64 54 L76 66" stroke="hsl(280,80%,75%)" stroke-width="3" stroke-linecap="round"/><circle cx="44" cy="42" r="3" fill="#ffe"/><circle cx="56" cy="42" r="3" fill="#ffe"/>',
			corsair: '<path d="M6 42 L36 20 L84 24 L98 42 L84 60 L36 64 Z" fill="' + f + '" ' + st + '/><path d="M40 20 L52 4 L60 22 Z M40 64 L52 80 L60 62 Z" fill="hsl(0,60%,40%)" ' + st + '/><circle cx="76" cy="42" r="5" fill="#ffdcd0"/>',
			warden: '<path d="M50 6 L84 20 V44 C84 64 50 78 50 78 C50 78 16 64 16 44 V20 Z" fill="' + f + '" ' + st + '/><circle cx="50" cy="38" r="9" fill="#d6f0ff"/>',
			wisp: '<circle cx="50" cy="40" r="22" fill="hsl(190,90%,60%)" opacity=".25"/><circle cx="50" cy="40" r="13" fill="' + f + '"/><path d="M50 18 C 60 30, 40 30, 50 10 M30 50 C 40 44, 34 60, 22 60 M70 50 C 60 44, 66 60, 78 60" stroke="hsl(190,90%,75%)" stroke-width="2" fill="none"/>',
			leech: '<ellipse cx="50" cy="42" rx="20" ry="26" fill="' + f + '" ' + st + '/><path d="M40 20 C 44 30, 56 30, 60 20" stroke="#dfffd0" stroke-width="3" fill="none"/><circle cx="50" cy="48" r="6" fill="#20380f"/>',
			frigate: '<path d="M2 40 L20 28 L90 30 L100 40 L90 50 L20 52 Z" fill="' + f + '" ' + st + '/><rect x="34" y="18" width="30" height="10" rx="3" fill="hsl(30,50%,40%)"/><rect x="34" y="52" width="30" height="10" rx="3" fill="hsl(30,50%,40%)"/><path d="M90 40 H110" stroke="#ffd0a0" stroke-width="4"/>',
			seraph: '<path d="M50 20 L58 40 L50 70 L42 40 Z" fill="' + f + '" ' + st + '/><path d="M44 36 C 20 10, 6 30, 12 50 C 24 40, 34 42, 44 46 M56 36 C 80 10, 94 30, 88 50 C 76 40, 66 42, 56 46" fill="hsl(260,70%,70%)" opacity=".55" ' + st + '/><circle cx="50" cy="16" r="9" fill="none" stroke="hsl(50,100%,80%)" stroke-width="2"/>',
			hunter: '<path d="M8 50 L50 20 L92 50 L50 40 Z" fill="' + f + '" ' + st + '/><circle cx="50" cy="34" r="3" fill="#ffd0ff"/>',
			carrier: '<rect x="10" y="22" width="80" height="40" rx="12" fill="' + f + '" ' + st + '/><rect x="18" y="32" width="12" height="20" rx="3" fill="#2a1d05"/><rect x="36" y="32" width="12" height="20" rx="3" fill="#2a1d05"/><rect x="54" y="32" width="12" height="20" rx="3" fill="#2a1d05"/><rect x="72" y="32" width="10" height="20" rx="3" fill="#2a1d05"/>',
			foundry: '<rect x="26" y="26" width="48" height="44" rx="8" fill="' + f + '" ' + st + '/><rect x="38" y="6" width="24" height="20" rx="4" fill="hsl(20,60%,35%)" ' + st + '/><circle cx="44" cy="16" r="3" fill="#ffd27a"/><circle cx="56" cy="16" r="3" fill="#ffd27a"/><path d="M74 36 L94 30 L98 44 L78 48 Z" fill="hsl(20,40%,30%)" ' + st + '/><path d="M26 40 L8 60" stroke="hsl(20,80%,60%)" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="48" r="8" fill="#ff8a3d"/>',
			mother: '<circle cx="50" cy="40" r="34" fill="hsl(185,90%,60%)" opacity=".18"/><circle cx="50" cy="40" r="22" fill="' + f + '" ' + st + '/><path d="M30 58 C 26 70, 16 74, 10 78 M50 62 C 50 72, 46 78, 46 84 M70 58 C 74 70, 84 74, 90 78" stroke="hsl(185,90%,70%)" stroke-width="3" fill="none"/><circle cx="50" cy="38" r="7" fill="#eaffff"/>',
			eclipse: '<circle cx="50" cy="40" r="36" fill="none" stroke="hsl(40,100%,70%)" stroke-width="3" opacity=".7"/><circle cx="50" cy="40" r="44" fill="none" stroke="hsl(20,100%,60%)" stroke-width="1.5" stroke-dasharray="4 6" opacity=".6"/><circle cx="50" cy="40" r="30" fill="#05030a" stroke="hsl(270,80%,70%)" stroke-width="2"/><circle cx="62" cy="30" r="4" fill="hsl(270,90%,80%)"/>'
		}[art];
		return '<svg viewBox="0 -6 100 92">' + g + (body || '') + '</svg>';
	}

	// ── Persistence ───────────────────────────────────────────────────

	function persist() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(function () {
			var data = JSON.parse(JSON.stringify({ v: 1, meta: save.meta, run: null }));
			// Never persist mid-combat state: a reload restarts the (seeded) fight from its start.
			data.run = combat ? JSON.parse(combatSnapshot) : run ? JSON.parse(JSON.stringify(run)) : null;
			Galaxy.save(data).catch(function (e) {
				console.warn(e);
			});
		}, 250);
	}

	function unlock(id) {
		if (save.meta.ach[id]) return;
		save.meta.ach[id] = 1;
		Galaxy.unlock(id).catch(function (e) {
			console.warn(e);
		});
	}

	// ── Audio ─────────────────────────────────────────────────────────

	var audio = null;
	function tone(freq, dur, type, gain, delay, slide) {
		if (settings.muted) return;
		try {
			audio = audio || new (window.AudioContext || window.webkitAudioContext)();
			var t = audio.currentTime + (delay || 0);
			var o = audio.createOscillator(),
				g = audio.createGain();
			o.type = type || 'sine';
			o.frequency.setValueAtTime(freq, t);
			if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(gain || 0.07, t + 0.01);
			g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			o.connect(g).connect(audio.destination);
			o.start(t);
			o.stop(t + dur + 0.02);
		} catch (e) {
			/* no audio */
		}
	}
	var sfx = {
		card: function () {
			tone(620, 0.06, 'triangle', 0.05);
		},
		hit: function () {
			tone(180, 0.18, 'sawtooth', 0.05, 0, 70);
		},
		shield: function () {
			tone(420, 0.15, 'sine', 0.05, 0, 760);
		},
		win: function () {
			[392, 523, 659, 784].forEach(function (f, i) {
				tone(f, 0.4, 'triangle', 0.06, i * 0.08);
			});
		},
		lose: function () {
			[330, 262, 196].forEach(function (f, i) {
				tone(f, 0.5, 'sawtooth', 0.05, i * 0.15);
			});
		},
		coin: function () {
			tone(1200, 0.12, 'square', 0.03);
			tone(1600, 0.12, 'square', 0.03, 0.06);
		},
		deny: function () {
			tone(150, 0.1, 'square', 0.03);
		}
	};

	// ── Screens ───────────────────────────────────────────────────────

	function show(id) {
		['screen-title', 'screen-map', 'screen-combat'].forEach(function (s) {
			$(s).classList.toggle('hidden', s !== id);
		});
	}

	function renderTitle() {
		show('screen-title');
		$('btn-continue').classList.toggle('hidden', !save.run);
		var tp = $('threat-pick');
		tp.innerHTML = '';
		for (var t = 0; t <= 5; t++) {
			(function (t) {
				var b = document.createElement('button');
				b.type = 'button';
				b.textContent = t === 0 ? 'Threat 0' : String(t);
				b.setAttribute('role', 'radio');
				b.setAttribute('aria-checked', String(pickThreat === t));
				b.disabled = t > save.meta.threat;
				b.title = ['Standard run', '+10% enemy hull', '+1 enemy damage', 'Start with a Static curse', 'Repair docks heal 20%', 'Bosses +20% hull'][t] + (t > save.meta.threat ? ' (win at Threat ' + (t - 1) + ' to unlock)' : '');
				b.addEventListener('click', function () {
					pickThreat = t;
					renderTitle();
				});
				tp.appendChild(b);
			})(t);
		}
		var m = save.meta;
		$('title-meta').textContent = 'Runs ' + m.runs + ' · Wins ' + m.wins + ' · Best score ' + m.best;
	}

	function startNewRun() {
		run = SW.newRun(Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pickThreat);
		save.meta.runs++;
		save.run = run;
		persist();
		renderMap();
	}

	function continueRun() {
		run = save.run;
		if (!run) return renderTitle();
		if (run.pending) handlePending();
		else renderMap();
	}

	// ── Run bar ───────────────────────────────────────────────────────

	function renderRunbar() {
		var html =
			'<div class="rb-hull"><span class="rb-text">Hull ' + run.hull + '/' + run.maxHull + '</span><div class="bar"><span style="width:' + Math.max(0, (run.hull / run.maxHull) * 100) + '%"></span></div></div>' +
			'<span class="rb-text rb-credits">◈ ' + run.credits + '</span>' +
			'<span class="rb-sector">Sector ' + run.sector + '/3' + (run.threat ? ' · Threat ' + run.threat : '') + '</span>' +
			'<div class="rb-mods">' +
			run.modules
				.map(function (id) {
					return '<span class="mod" title="' + esc(M[id].name + ' — ' + M[id].text) + '">' + M[id].icon + '</span>';
				})
				.join('') +
			'</div>' +
			'<div class="rb-actions"><button class="btn small" type="button" data-act="deck">Deck ' + run.deck.length + '</button><button class="btn small" type="button" data-act="menu">Menu</button></div>';
		document.querySelectorAll('[data-runbar]').forEach(function (el) {
			el.innerHTML = html;
		});
	}

	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-act]');
		if (!b) return;
		if (b.dataset.act === 'deck') showDeck(run.deck, null, 'Your deck');
		if (b.dataset.act === 'menu') {
			// Leaving mid-fight rewinds to the moment the fight began.
			if (combat) {
				run = JSON.parse(combatSnapshot);
				save.run = run;
				combat = null;
				combatSnapshot = null;
			}
			persist();
			closeModal();
			renderTitle();
		}
	});

	// ── Map ───────────────────────────────────────────────────────────

	function renderMap() {
		show('screen-map');
		renderRunbar();
		var map = $('map');
		var rows = run.map.rows;
		var rowH = 86;
		var height = (rows.length + 1) * rowH + 120;
		map.style.height = height + 'px';
		var reach = SW.reachable(run);
		var visited = run.visited || [];
		var yOf = function (row) {
			return height - 70 - row * rowH;
		};
		var all = [];
		rows.forEach(function (r) {
			all = all.concat(r);
		});
		all.push(run.map.boss);
		var lines = '';
		all.forEach(function (n) {
			n.next.forEach(function (id) {
				var m = SW.findNode(run, id);
				var on = visited.indexOf(n.id) !== -1 && (visited.indexOf(id) !== -1 || reach.indexOf(id) !== -1);
				lines += '<line x1="' + n.x * 100 + '%" y1="' + yOf(n.row) + '" x2="' + m.x * 100 + '%" y2="' + yOf(m.row) + '" stroke="' + (on ? 'rgba(255,196,107,0.6)' : 'rgba(255,255,255,0.12)') + '" stroke-width="' + (on ? 3 : 2) + '" stroke-dasharray="' + (on ? '' : '4 6') + '"/>';
			});
		});
		var html = '<svg>' + lines + '</svg>';
		all.forEach(function (n) {
			var cls = 'node t-' + n.type;
			if (reach.indexOf(n.id) !== -1) cls += ' reachable';
			if (visited.indexOf(n.id) !== -1) cls += ' visited';
			if (run.at === n.id) cls += ' current';
			var label = { battle: 'Battle', elite: 'Elite', event: 'Unknown signal', shop: 'Trader', repair: 'Repair dock', boss: 'Boss' }[n.type];
			html += '<button type="button" class="' + cls + '" style="left:' + n.x * 100 + '%;top:' + yOf(n.row) + 'px" data-node="' + n.id + '" aria-label="' + label + '" title="' + label + '"' + (reach.indexOf(n.id) === -1 ? ' tabindex="-1"' : '') + '>' + NODE_ICON[n.type] + '</button>';
		});
		map.innerHTML = html;
		$('map-scroll').querySelector('.map-legend') ||
			$('map-scroll').insertAdjacentHTML(
				'beforeend',
				'<div class="map-legend">' +
					['battle', 'elite', 'event', 'shop', 'repair', 'boss']
						.map(function (t) {
							return '<span>' + NODE_ICON[t] + { battle: 'Battle', elite: 'Elite', event: 'Unknown', shop: 'Trader', repair: 'Repair', boss: 'Boss' }[t] + '</span>';
						})
						.join('') +
					'</div>'
			);
		// Scroll the next choices into view.
		var target = map.querySelector('.reachable') || map.querySelector('.current');
		if (target) setTimeout(function () {
			target.scrollIntoView({ block: 'center', behavior: settings.reducedMotion ? 'auto' : 'smooth' });
		}, 30);
	}

	$('map').addEventListener('click', function (e) {
		var b = e.target.closest('.node.reachable');
		if (!b) return;
		run.visited = run.visited || [];
		run.visited.push(b.dataset.node);
		SW.enterNode(run, b.dataset.node);
		persist();
		handlePending();
	});

	function handlePending() {
		var p = run.pending;
		if (!p) return renderMap();
		if (p.kind === 'combat') return startCombat(p);
		if (p.kind === 'reward') return showReward();
		if (p.kind === 'event') return showEvent();
		if (p.kind === 'shop') return showShop();
		if (p.kind === 'repair') return showRepair();
		if (p.kind === 'sector') return showSectorClear();
		renderMap();
	}

	function finishNode() {
		run.pending = null;
		closeModal();
		persist();
		renderMap();
	}

	// ── Combat ────────────────────────────────────────────────────────

	function startCombat(p) {
		combatSnapshot = JSON.stringify(run);
		combat = new SW.Combat(run, p.node, p.type);
		combat.fx = [];
		selected = -1;
		show('screen-combat');
		renderRunbar();
		renderCombat();
	}

	function intentHtml(e) {
		if (!e.intent) return '';
		var parts = [];
		e.intent.actions.forEach(function (a) {
			if (a.type === 'attack') parts.push('<span class="atk">' + ICON.sword + ' ' + combat.enemyHitValue(e, a.dmg) + (a.times > 1 ? '×' + a.times : '') + '</span>');
			else if (a.type === 'shield') parts.push('<span class="def">' + ICON.shield + ' ' + a.n + '</span>');
			else parts.push('<span class="other">' + ICON.spark + '</span>');
		});
		return '<div class="intent" title="' + esc(e.intent.name) + '">' + parts.join('') + '</div><div class="intent-name">' + esc(e.intent.name) + '</div>';
	}

	function statusHtml(status) {
		return Object.keys(status)
			.filter(function (k) {
				return status[k] && ST[k];
			})
			.map(function (k) {
				return '<span class="st ' + ST[k].tone + '" title="' + esc(ST[k].name + ': ' + ST[k].desc) + '">' + ST[k].name + ' ' + status[k] + '</span>';
			})
			.join('');
	}

	function cardHtml(card, opts) {
		opts = opts || {};
		var def = C[card.id];
		var cost = def.cost === null ? '' : '<span class="cost">' + def.cost + '</span>';
		var cls = 'card type-' + def.type + (card.up ? ' up' : '') + (opts.big ? ' big' : '') + (opts.cls ? ' ' + opts.cls : '');
		var up = opts.preview ? true : card.up;
		return (
			'<button type="button" class="' + cls + '"' + (opts.attrs || '') + ' aria-label="' + esc(SW.cardName({ id: card.id, up: up }) + '. ' + (def.cost === null ? 'Unplayable' : 'Cost ' + def.cost) + '. ' + def.text(up)) + '">' +
			cost +
			'<span class="name">' + esc(def.name + (up ? '+' : '')) + '</span>' +
			'<span class="art">' + ICON[def.type] + '</span>' +
			'<span class="ctype">' + def.type + '</span>' +
			'<span class="text">' + esc(def.text(up)) + '</span></button>'
		);
	}

	function renderCombat() {
		if (!combat) return;
		var c = combat;
		var alive = c.alive();
		var needTarget = selected >= 0 && C[c.hand[selected].id].target === 'enemy';
		$('enemies').innerHTML = c.enemies
			.map(function (e) {
				var cls = 'enemy' + (e.dead ? ' dead' : '') + (e.boss ? ' boss' : '') + (needTarget && !e.dead ? ' targetable' : '') + (needTarget && alive[targetIdx] === e ? ' targeted' : '');
				return (
					'<div class="' + cls + '" data-uid="' + e.uid + '" role="button" tabindex="' + (needTarget && !e.dead ? 0 : -1) + '" aria-label="' + esc(e.name + ', ' + e.hp + ' of ' + e.maxHp + ' hull' + (e.shield ? ', ' + e.shield + ' shield' : '')) + '">' +
					intentHtml(e) +
					'<div class="art">' + enemyArt(e.art, e.boss) + '</div>' +
					'<div class="enemy-name">' + esc(e.name) + '</div>' +
					'<div class="hp"><div class="bar"><span style="width:' + (e.hp / e.maxHp) * 100 + '%"></span></div><div class="hp-row"><span>' + e.hp + '/' + e.maxHp + '</span>' + (e.shield ? '<span class="shield-tag">⛨ ' + e.shield + '</span>' : '') + '</div></div>' +
					'<div class="statuses">' + statusHtml(e.status) + '</div></div>'
				);
			})
			.join('');
		var p = c.player;
		var powers = Object.keys(p.powers)
			.map(function (k) {
				return '<span class="st good" title="' + esc(C[k] ? C[k].name + ': ' + C[k].text(false) : k) + '">' + (C[k] ? C[k].name : k) + ' ' + p.powers[k] + '</span>';
			})
			.join('');
		$('player').innerHTML =
			SHIP +
			'<div class="player-info"><div class="player-hull">Hull ' + run.hull + '/' + run.maxHull + (p.shield ? ' <span class="player-shield">⛨ ' + p.shield + '</span>' : '') + '</div><div class="bar"><span style="width:' + Math.max(0, (run.hull / run.maxHull) * 100) + '%"></span></div><div class="statuses" style="justify-content:flex-start">' + statusHtml(p.status) + powers + '</div></div>';
		$('energy').textContent = p.energy;
		$('energy').classList.toggle('empty', p.energy === 0);
		$('energy').setAttribute('aria-label', p.energy + ' energy');
		$('pile-draw').textContent = c.draw.length;
		$('pile-discard').textContent = c.discard.length;
		$('hand').innerHTML = c.hand
			.map(function (card, i) {
				var playable = c.canPlay(card);
				return cardHtml(card, { cls: (playable ? '' : 'unplayable') + (i === selected ? ' selected' : ''), attrs: ' data-i="' + i + '"' });
			})
			.join('');
		$('btn-end').disabled = busy || !!c.over;
		$('prompt').classList.toggle('hidden', !needTarget);
		$('prompt').textContent = 'Choose a target';
		renderRunbar();
	}

	$('hand').addEventListener('click', function (e) {
		var b = e.target.closest('.card');
		if (!b || busy || !combat) return;
		chooseCard(Number(b.dataset.i));
	});

	function chooseCard(i) {
		var c = combat;
		var card = c.hand[i];
		if (!card) return;
		if (!c.canPlay(card)) {
			sfx.deny();
			return;
		}
		if (selected === i) {
			selected = -1;
			return renderCombat();
		}
		var def = C[card.id];
		if (def.target === 'enemy' && c.alive().length > 1) {
			selected = i;
			targetIdx = 0;
			return renderCombat();
		}
		playCard(i, c.alive()[0] && c.alive()[0].uid);
	}

	$('enemies').addEventListener('click', function (e) {
		var el = e.target.closest('.enemy');
		if (!el || selected < 0 || busy) return;
		playCard(selected, Number(el.dataset.uid));
	});

	function playCard(i, uid) {
		var c = combat;
		c.fx = [];
		if (!c.play(i, uid)) return;
		selected = -1;
		sfx.card();
		renderCombat();
		animateFx(c.fx, 0, afterAction);
	}

	function endTurn() {
		if (busy || !combat || combat.over) return;
		selected = -1;
		busy = true;
		combat.fx = [];
		combat.endTurn();
		renderCombat();
		animateFx(combat.fx, settings.reducedMotion ? 0 : 140, function () {
			busy = false;
			renderCombat();
			afterAction();
		});
	}
	$('btn-end').addEventListener('click', endTurn);

	function afterAction() {
		var c = combat;
		if (!c || !c.over) return;
		if (c.over === 'lose') {
			sfx.lose();
			combat = null;
			return setTimeout(function () {
				runEnd(false);
			}, 700);
		}
		sfx.win();
		var type = c.type;
		var bossId = type === 'boss' ? c.enemies[0].id : null;
		unlock('first-flight');
		if (type === 'elite') run.stats.elites++;
		if (type === 'boss') {
			run.stats.bosses++;
			if (bossId === 'foundry') unlock('sector-1');
			if (bossId === 'mother') unlock('sector-2');
			if (run.hull >= c.startHull) unlock('untouched');
		}
		if (run.stats.maxHit >= 40) unlock('big-hit');
		if (run.stats.maxTurnCards >= 8) unlock('barrage');
		if (SW.has(run, 'medbay')) run.hull = Math.min(run.maxHull, run.hull + 4);
		var rng = SW.rngFor(run, 'post' + c.nodeId);
		if (SW.has(run, 'fabricator') && type !== 'battle') SW.upgradeRandom(run, rng);
		var reward = SW.makeReward(run, c.nodeId, type);
		if (type === 'elite') {
			var got = SW.gainModule(run, rng);
			reward.modules = got ? [got] : [];
			reward.takenModule = true;
		}
		run.credits += reward.credits;
		combat = null;
		combatSnapshot = null;
		run.pending = { kind: 'reward', node: c.nodeId, reward: reward, boss: bossId };
		persist();
		setTimeout(showReward, settings.reducedMotion ? 150 : 600);
	}

	function animateFx(list, gap, done) {
		if (!list.length) return done && done();
		var i = 0;
		var step = function () {
			if (i >= list.length) return done && done();
			showFx(list[i++]);
			if (gap) setTimeout(step, gap);
			else step();
		};
		step();
	}

	function fxAnchor(target) {
		var el = target === 'player' ? $('player') : target === 'all' ? $('enemies') : document.querySelector('.enemy[data-uid="' + target + '"]');
		return el;
	}

	function float(el, text, cls) {
		if (!el) return;
		var r = el.getBoundingClientRect();
		var f = document.createElement('div');
		f.className = 'float ' + cls;
		f.textContent = text;
		f.style.left = r.left + r.width / 2 + (Math.random() * 30 - 15) + 'px';
		f.style.top = r.top + r.height * 0.4 + 'px';
		$('fx').appendChild(f);
		setTimeout(function () {
			f.remove();
		}, 950);
	}

	function showFx(fx) {
		var el = fxAnchor(fx.target);
		if (fx.type === 'hit') {
			if (fx.amount > 0) {
				float(el, '-' + fx.amount, 'dmg');
				sfx.hit();
				if (el && !settings.reducedMotion) {
					el.classList.remove('shake');
					void el.offsetWidth;
					el.classList.add('shake');
				}
			}
			if (fx.blocked > 0) float(el, '⛨ ' + fx.blocked, 'blk');
		} else if (fx.type === 'shield') {
			float(el, '+' + fx.n + ' ⛨', 'blk');
			sfx.shield();
		} else if (fx.type === 'heal' && fx.n > 0) float(el, '+' + fx.n, 'heal');
		else if (fx.type === 'status' && ST[fx.status]) float(el, ST[fx.status].name + ' ' + fx.n, 'txt');
		else if (fx.type === 'text') float(el, fx.text, 'txt');
		else if (fx.type === 'death') {
			var d = fxAnchor(fx.target);
			if (d) d.classList.add('dead');
		}
	}

	// ── Modals ────────────────────────────────────────────────────────

	function openModal(html, label) {
		$('modal-body').innerHTML = html;
		$('modal').setAttribute('aria-label', label || 'Dialog');
		$('modal').classList.remove('hidden');
		var f = $('modal-body').querySelector('button:not(:disabled)');
		if (f) f.focus();
	}
	function closeModal() {
		$('modal').classList.add('hidden');
		$('modal-body').innerHTML = '';
	}

	function modHtml(id, extra) {
		return '<button type="button" class="mod-card" data-mod="' + id + '"><span class="mod">' + M[id].icon + '</span><span><b>' + esc(M[id].name) + '</b><span>' + esc(M[id].text) + '</span>' + (extra || '') + '</span></button>';
	}

	function showReward() {
		show('screen-map');
		renderMap();
		var p = run.pending;
		var r = p.reward;
		var html = '<p class="eyebrow">' + (r.type === 'boss' ? 'Boss defeated' : 'Victory') + '</p><h2>Salvage</h2><p class="sub">+' + r.credits + ' credits collected.</p>';
		if (r.type === 'elite' && r.modules.length) html += '<p class="sub">Module recovered:</p><div class="row">' + modHtml(r.modules[0]) + '</div>';
		if (r.type === 'boss' && !r.takenModule && r.modules.length) html += '<p class="sub">Choose a module:</p><div class="row" id="rw-mods">' + r.modules.map(function (m) { return modHtml(m); }).join('') + '</div>';
		if (!r.takenCard) html += '<p class="sub">Add a card to your deck:</p><div class="row" id="rw-cards">' + r.cards.map(function (id, i) { return cardHtml({ id: id, up: false }, { big: true, attrs: ' data-rc="' + i + '"' }); }).join('') + '</div>';
		html += '<div class="actions"><button class="btn primary" id="rw-done" type="button">' + (r.takenCard ? 'Continue' : 'Skip card') + '</button></div>';
		openModal(html, 'Salvage');
		var cards = $('rw-cards');
		if (cards)
			cards.addEventListener('click', function (e) {
				var b = e.target.closest('[data-rc]');
				if (!b) return;
				SW.addCard(run, r.cards[Number(b.dataset.rc)]);
				r.takenCard = true;
				sfx.card();
				persist();
				showReward();
			});
		var mods = $('rw-mods');
		if (mods)
			mods.addEventListener('click', function (e) {
				var b = e.target.closest('[data-mod]');
				if (!b) return;
				run.modules.push(b.dataset.mod);
				if (M[b.dataset.mod].onGain) M[b.dataset.mod].onGain(run);
				r.takenModule = true;
				if (run.modules.length >= 6) unlock('collector');
				persist();
				showReward();
			});
		$('rw-done').addEventListener('click', function () {
			if (run.credits >= 300) unlock('rich');
			if (run.modules.length >= 6) unlock('collector');
			if (p.boss) {
				if (run.sector >= 3) {
					closeModal();
					return runEnd(true);
				}
				run.pending = { kind: 'sector' };
				persist();
				return showSectorClear();
			}
			finishNode();
		});
	}

	function showSectorClear() {
		var heal = Math.round(run.maxHull * 0.3);
		openModal(
			'<p class="eyebrow">Sector ' + run.sector + ' cleared</p><h2>Jump to Sector ' + (run.sector + 1) + '</h2><p class="sub">The crew patches the hull during the jump (+' + heal + ' hull). The next sector is more dangerous.</p><div class="actions"><button class="btn primary" id="btn-jump" type="button">Engage jump drive</button></div>',
			'Sector cleared'
		);
		$('btn-jump').addEventListener('click', function () {
			run.hull = Math.min(run.maxHull, run.hull + heal);
			run.sector++;
			run.map = SW.genMap(run);
			run.at = null;
			run.row = -1;
			run.visited = [];
			finishNode();
		});
	}

	function eventApi(rng) {
		return {
			damage: function (n) {
				run.hull -= n;
				if (run.hull <= 0) {
					if (SW.has(run, 'blackbox') && !run.blackboxUsed) {
						run.blackboxUsed = true;
						run.hull = Math.ceil(run.maxHull * 0.25);
					} else run.hull = 0;
				}
			},
			heal: function (n) {
				run.hull = Math.min(run.maxHull, run.hull + n);
			},
			upgradeRandom: function () {
				return SW.upgradeRandom(run, rng);
			},
			gainCard: function (rarity) {
				var id = SW.randomCard(rng, rarity);
				SW.addCard(run, id);
				return C[id].name;
			},
			gainModule: function () {
				var id = SW.gainModule(run, rng);
				return id ? M[id].name : 'nothing';
			},
			addCard: function (id) {
				SW.addCard(run, id);
			},
			chooseUpgrade: function () {
				this.followUp = 'upgrade';
			},
			chooseRemove: function () {
				this.followUp = 'remove';
			}
		};
	}

	function showEvent() {
		show('screen-map');
		renderMap();
		var p = run.pending;
		var ev = SW.EVENTS.find(function (x) {
			return x.id === p.event;
		});
		if (p.result) {
			openModal('<p class="eyebrow">Unknown signal</p><h2>' + esc(ev.title) + '</h2><p>' + esc(p.result) + '</p><div class="actions"><button class="btn primary" id="ev-done" type="button">Continue</button></div>', ev.title);
			$('ev-done').addEventListener('click', function () {
				if (run.hull <= 0) return runEnd(false);
				finishNode();
			});
			return;
		}
		var html = '<p class="eyebrow">Unknown signal</p><h2>' + esc(ev.title) + '</h2><p class="sub">' + esc(ev.text) + '</p><div class="options">';
		ev.options.forEach(function (o, i) {
			var ok = !o.available || o.available(run);
			html += '<button type="button" class="option" data-opt="' + i + '"' + (ok ? '' : ' disabled') + '><b>' + esc(o.label) + '</b>' + (o.detail ? '<small>' + esc(o.detail) + '</small>' : '') + '</button>';
		});
		openModal(html + '</div>', ev.title);
		$('modal-body').querySelector('.options').addEventListener('click', function (e) {
			var b = e.target.closest('[data-opt]');
			if (!b || b.disabled) return;
			var rng = SW.rngFor(run, 'eventroll' + p.node);
			var api = eventApi(rng);
			var text = ev.options[Number(b.dataset.opt)].apply(run, api, rng);
			p.result = text;
			persist();
			if (api.followUp === 'upgrade')
				return showDeck(run.deck.filter(SW.canUpgrade), function (card) {
					card.up = true;
					persist();
					showEvent();
				}, 'Choose a card to upgrade', true);
			if (api.followUp === 'remove')
				return showDeck(run.deck, function (card) {
					run.deck.splice(run.deck.indexOf(card), 1);
					persist();
					showEvent();
				}, 'Choose a card to remove');
			showEvent();
		});
	}

	function showShop() {
		show('screen-map');
		renderMap();
		var shop = run.pending.shop;
		var html = '<p class="eyebrow">Trader</p><h2>Black-market bazaar</h2><p class="sub">You have <b class="rb-credits">◈ ' + run.credits + '</b></p><div class="row" id="shop-cards">';
		shop.cards.forEach(function (it, i) {
			html += '<div class="choice' + (it.sold ? ' sold' : '') + '">' + cardHtml({ id: it.id, up: false }, { big: true, attrs: ' data-buy="' + i + '"' }) + '<span class="price' + (run.credits < it.price ? ' cant' : '') + '">◈ ' + it.price + '</span></div>';
		});
		html += '</div><div class="row" id="shop-mods">';
		shop.mods.forEach(function (it, i) {
			html += '<div class="choice' + (it.sold ? ' sold' : '') + '">' + modHtml(it.id).replace('data-mod=', 'data-buymod="' + i + '" data-mod=') + '<span class="price' + (run.credits < it.price ? ' cant' : '') + '">◈ ' + it.price + '</span></div>';
		});
		var rp = SW.removalPrice(run);
		html += '</div><div class="actions"><button class="btn" id="shop-remove" type="button"' + (shop.removalUsed || run.credits < rp ? ' disabled' : '') + '>Remove a card (◈ ' + rp + ')</button><button class="btn primary" id="shop-leave" type="button">Leave</button></div>';
		openModal(html, 'Trader');
		$('shop-cards').addEventListener('click', function (e) {
			var b = e.target.closest('[data-buy]');
			if (!b) return;
			var it = shop.cards[Number(b.dataset.buy)];
			if (it.sold || run.credits < it.price) return sfx.deny();
			run.credits -= it.price;
			it.sold = true;
			SW.addCard(run, it.id);
			sfx.coin();
			persist();
			renderRunbar();
			showShop();
		});
		$('shop-mods').addEventListener('click', function (e) {
			var b = e.target.closest('[data-buymod]');
			if (!b) return;
			var it = shop.mods[Number(b.dataset.buymod)];
			if (it.sold || run.credits < it.price) return sfx.deny();
			run.credits -= it.price;
			it.sold = true;
			run.modules.push(it.id);
			if (M[it.id].onGain) M[it.id].onGain(run);
			if (run.modules.length >= 6) unlock('collector');
			sfx.coin();
			persist();
			renderRunbar();
			showShop();
		});
		$('shop-remove').addEventListener('click', function () {
			showDeck(run.deck, function (card) {
				run.credits -= SW.removalPrice(run);
				run.removals++;
				shop.removalUsed = true;
				run.deck.splice(run.deck.indexOf(card), 1);
				persist();
				showShop();
			}, 'Choose a card to remove', false, showShop);
		});
		$('shop-leave').addEventListener('click', finishNode);
	}

	function showRepair() {
		show('screen-map');
		renderMap();
		var pct = run.threat >= 4 ? 0.2 : 0.3;
		var heal = Math.round(run.maxHull * pct);
		openModal(
			'<p class="eyebrow">Repair dock</p><h2>Make port</h2><p class="sub">There is time for one job before you push on.</p><div class="options"><button class="option" type="button" id="rp-heal"><b>Repair the hull</b><small>Restore ' + heal + ' hull (' + run.hull + '/' + run.maxHull + ').</small></button><button class="option" type="button" id="rp-up"' + (run.deck.some(SW.canUpgrade) ? '' : ' disabled') + '><b>Refit a system</b><small>Upgrade a card of your choice.</small></button></div>',
			'Repair dock'
		);
		$('rp-heal').addEventListener('click', function () {
			run.hull = Math.min(run.maxHull, run.hull + heal);
			sfx.shield();
			finishNode();
		});
		$('rp-up').addEventListener('click', function () {
			showDeck(run.deck.filter(SW.canUpgrade), function (card) {
				card.up = true;
				finishNode();
			}, 'Choose a card to upgrade', true, showRepair);
		});
	}

	function showDeck(cards, onPick, title, previewUpgrade, onBack) {
		var sorted = cards.slice().sort(function (a, b) {
			return a.id.localeCompare(b.id);
		});
		var html = '<h2>' + esc(title) + '</h2><p class="sub">' + cards.length + ' cards' + (previewUpgrade ? ' — showing upgraded versions' : '') + '</p><div class="deck-grid">';
		sorted.forEach(function (card, i) {
			html += cardHtml(card, { big: false, preview: previewUpgrade, attrs: ' data-pick="' + i + '"' + (onPick ? '' : ' tabindex="-1"') });
		});
		html += '</div><div class="actions"><button class="btn" id="deck-close" type="button">' + (onPick ? 'Cancel' : 'Close') + '</button></div>';
		openModal(html, title);
		if (onPick)
			$('modal-body').querySelector('.deck-grid').addEventListener('click', function (e) {
				var b = e.target.closest('[data-pick]');
				if (!b) return;
				onPick(sorted[Number(b.dataset.pick)]);
			});
		$('deck-close').addEventListener('click', function () {
			if (onBack) return onBack();
			closeModal();
			if (run && run.pending && !combat) handlePending();
		});
	}

	function runEnd(won) {
		var s = SW.score(run, won);
		var m = save.meta;
		var best = s > m.best;
		if (best) m.best = s;
		if (won) {
			m.wins++;
			unlock('victory');
			if (run.threat >= 3) unlock('threat-3');
			if (run.threat >= 5) unlock('threat-5');
			if (run.deck.length <= 15) unlock('lean-deck');
			if (run.threat >= m.threat && m.threat < 5) m.threat = run.threat + 1;
		}
		Galaxy.submitScore(s).catch(function (e) {
			console.warn(e);
		});
		var stats = run.stats;
		var finished = run;
		save.run = null;
		run = null;
		combat = null;
		persist();
		show('screen-title');
		openModal(
			'<p class="eyebrow">' + (won ? 'The beacon is delivered' : 'Hull breached') + '</p><h2>' + (won ? 'Victory' : 'Run over') + '</h2>' +
				'<dl class="stats-list"><dt>Sector reached</dt><dd>' + finished.sector + '/3</dd><dt>Nodes visited</dt><dd>' + stats.floors + '</dd><dt>Elites defeated</dt><dd>' + stats.elites + '</dd><dt>Bosses defeated</dt><dd>' + stats.bosses + '</dd><dt>Biggest hit</dt><dd>' + stats.maxHit + '</dd><dt>Threat</dt><dd>' + finished.threat + '</dd><dt>Score</dt><dd>' + s + (best ? ' ★ best' : '') + '</dd></dl>' +
				(won && finished.threat + 1 <= 5 && m.threat === finished.threat + 1 ? '<p class="sub">Threat ' + (finished.threat + 1) + ' unlocked.</p>' : '') +
				'<div class="actions"><button class="btn primary" id="end-ok" type="button">Back to hangar</button></div>',
			won ? 'Victory' : 'Run over'
		);
		$('end-ok').addEventListener('click', function () {
			closeModal();
			pickThreat = Math.min(save.meta.threat, pickThreat);
			renderTitle();
		});
	}

	// ── Keyboard ──────────────────────────────────────────────────────

	window.addEventListener('keydown', function (e) {
		if (!$('modal').classList.contains('hidden')) {
			if (e.key === 'Escape') {
				var close = $('deck-close');
				if (close) close.click();
			}
			return;
		}
		if (!combat || busy) return;
		if (/^[0-9]$/.test(e.key)) {
			var i = e.key === '0' ? 9 : Number(e.key) - 1;
			if (i < combat.hand.length) chooseCard(i);
		} else if (e.key === 'e' || e.key === 'E') endTurn();
		else if (e.key === 'Escape' && selected >= 0) {
			selected = -1;
			renderCombat();
		} else if (selected >= 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			var n = combat.alive().length;
			targetIdx = (targetIdx + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
			renderCombat();
		} else if (selected >= 0 && e.key === 'Enter') {
			playCard(selected, combat.alive()[targetIdx].uid);
		}
	});

	// ── Boot ──────────────────────────────────────────────────────────

	$('btn-new').addEventListener('click', function () {
		if (save.run && !confirmAbandon()) return;
		startNewRun();
	});
	$('btn-continue').addEventListener('click', continueRun);

	function confirmAbandon() {
		// Opaque-origin games can't use window.confirm; ask in-page instead.
		openModal('<h2>Abandon your current run?</h2><p class="sub">It will count as a loss.</p><div class="actions"><button class="btn" id="ab-no" type="button">Keep it</button><button class="btn primary" id="ab-yes" type="button">Start fresh</button></div>', 'Abandon run');
		$('ab-no').addEventListener('click', closeModal);
		$('ab-yes').addEventListener('click', function () {
			closeModal();
			run = save.run;
			var s = SW.score(run, false);
			if (s > save.meta.best) save.meta.best = s;
			Galaxy.submitScore(s).catch(function () {});
			save.run = null;
			startNewRun();
		});
		return false;
	}

	Galaxy.on('settings', function (s) {
		settings = s;
		document.body.classList.toggle('reduced', !!s.reducedMotion);
	});

	renderTitle();
	Galaxy.ready()
		.then(function (info) {
			settings = info.settings || settings;
			document.body.classList.toggle('reduced', !!settings.reducedMotion);
			$('greeting').textContent = info.player.guest ? 'Ember Verge courier service' : 'Welcome back, Captain ' + info.player.name;
			return Galaxy.load();
		})
		.then(function (data) {
			if (data && data.v === 1) {
				save.meta = Object.assign(save.meta, data.meta || {});
				save.run = data.run || null;
			}
			pickThreat = Math.min(save.meta.threat, pickThreat);
			renderTitle();
		})
		.catch(function (e) {
			console.warn(e);
		});

	window.Starward.debug = {
		run: function () {
			return run;
		},
		combat: function () {
			return combat;
		},
		save: function () {
			return save;
		},
		endTurn: endTurn,
		playCard: playCard
	};
})(window.Starward);
