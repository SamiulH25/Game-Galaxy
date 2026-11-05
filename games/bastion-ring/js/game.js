/* Bastion Ring — rendering, input, UI, progression. */
(function (BR) {
	'use strict';

	var COLS = BR.COLS,
		ROWS = BR.ROWS,
		TW = BR.TOWERS,
		EN = BR.ENEMIES;
	var ORDER = ['pulse', 'cannon', 'frost', 'tesla', 'lance', 'beacon'];
	var $ = function (id) {
		return document.getElementById(id);
	};
	var canvas = $('board');
	var ctx = canvas.getContext('2d');

	var meta = { maps: {}, ach: {}, best: 0 };
	var resume = null;
	var settings = { muted: false, reducedMotion: false };
	var sim = null;
	var view = { w: 1, h: 1, dpr: 1, s: 40, ox: 0, oy: 0, rot: false };
	var placing = null;
	var selected = null;
	var hoverTile = null;
	var speed = 1;
	var paused = false;
	var autoStart = false;
	var autoTimer = 0;
	var stars = [];
	var lastT = 0;
	var acc = 0;
	var banner = null;
	var saveTimer = 0;

	// ── Persistence ───────────────────────────────────────────────────

	function persist(now) {
		clearTimeout(saveTimer);
		var go = function () {
			var current = sim && !sim.over && !sim.running ? sim.snapshot() : resume;
			Galaxy.save({ v: 1, meta: meta, current: current }).catch(function (e) {
				console.warn(e);
			});
		};
		if (now) go();
		else saveTimer = setTimeout(go, 400);
	}
	function unlock(id) {
		if (meta.ach[id]) return;
		meta.ach[id] = 1;
		Galaxy.unlock(id).catch(function (e) {
			console.warn(e);
		});
	}
	function mapMeta(id) {
		return meta.maps[id] || (meta.maps[id] = { stars: 0, endless: 0 });
	}
	function mapUnlocked(i) {
		return i === 0 || mapMeta(BR.MAPS[i - 1].id).stars > 0;
	}

	// ── Audio ─────────────────────────────────────────────────────────

	var audio = null;
	var lastSound = {};
	function tone(f, d, type, g, delay, slide, key) {
		if (settings.muted) return;
		var now = performance.now();
		if (key && lastSound[key] && now - lastSound[key] < 60) return;
		if (key) lastSound[key] = now;
		try {
			audio = audio || new (window.AudioContext || window.webkitAudioContext)();
			var t = audio.currentTime + (delay || 0);
			var o = audio.createOscillator(),
				gg = audio.createGain();
			o.type = type || 'sine';
			o.frequency.setValueAtTime(f, t);
			if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
			gg.gain.setValueAtTime(0.0001, t);
			gg.gain.exponentialRampToValueAtTime(g || 0.05, t + 0.01);
			gg.gain.exponentialRampToValueAtTime(0.0001, t + d);
			o.connect(gg).connect(audio.destination);
			o.start(t);
			o.stop(t + d + 0.02);
		} catch (e) {
			/* no audio */
		}
	}
	var sfx = {
		build: function () {
			tone(440, 0.12, 'triangle', 0.06, 0, 880);
		},
		upgrade: function () {
			tone(660, 0.18, 'triangle', 0.06, 0, 1320);
		},
		sell: function () {
			tone(700, 0.12, 'square', 0.03, 0, 300);
		},
		leak: function () {
			tone(160, 0.3, 'sawtooth', 0.07, 0, 80, 'leak');
		},
		wave: function () {
			tone(300, 0.3, 'sawtooth', 0.04, 0, 600);
		},
		clear: function () {
			[523, 659, 784].forEach(function (f, i) {
				tone(f, 0.3, 'triangle', 0.05, i * 0.07);
			});
		},
		pop: function () {
			tone(900 + Math.random() * 300, 0.05, 'square', 0.015, 0, 0, 'pop');
		},
		deny: function () {
			tone(140, 0.1, 'square', 0.03);
		}
	};

	// ── Layout ────────────────────────────────────────────────────────

	function resize() {
		var r = canvas.getBoundingClientRect();
		view.dpr = Math.min(window.devicePixelRatio || 1, 2);
		view.w = r.width;
		view.h = r.height;
		canvas.width = Math.round(r.width * view.dpr);
		canvas.height = Math.round(r.height * view.dpr);
		view.rot = view.h > view.w * 1.15;
		var cols = view.rot ? ROWS : COLS,
			rows = view.rot ? COLS : ROWS;
		view.s = Math.floor(Math.min((view.w - 16) / cols, (view.h - 16) / rows));
		view.ox = Math.round((view.w - cols * view.s) / 2);
		view.oy = Math.round((view.h - rows * view.s) / 2);
		stars = [];
		for (var i = 0; i < 160; i++) stars.push([Math.random() * view.w, Math.random() * view.h, Math.random() * 1.3 + 0.2, Math.random()]);
		sky = null;
	}

	/** World (tile units) → canvas transform, rotated 90° on tall screens. */
	function worldTransform() {
		var s = view.s,
			d = view.dpr;
		if (view.rot) ctx.setTransform(0, s * d, -s * d, 0, (view.ox + ROWS * s) * d, view.oy * d);
		else ctx.setTransform(s * d, 0, 0, s * d, view.ox * d, view.oy * d);
	}
	function screenToTile(px, py) {
		var u = (px - view.ox) / view.s,
			v = (py - view.oy) / view.s;
		var x = view.rot ? v : u,
			y = view.rot ? ROWS - u : v;
		return [Math.floor(x), Math.floor(y)];
	}

	// ── Game flow ─────────────────────────────────────────────────────

	function startMap(index, endless) {
		sim = new BR.Sim(index, { endless: endless });
		resume = null;
		enterPlay();
		showBanner(BR.MAPS[index].name, endless ? 'Endless — how long can the ring hold?' : 'Hold for 25 waves. Build towers, then start the first wave.');
	}

	function resumeMap() {
		if (!resume) return;
		sim = BR.Sim.restore(resume);
		resume = null;
		enterPlay();
		showBanner(BR.MAPS[sim.mapIndex].name, 'Resumed before wave ' + (sim.wave + 1) + '.');
	}

	function enterPlay() {
		placing = null;
		selected = null;
		speed = 1;
		paused = false;
		$('screen-maps').classList.add('hidden');
		$('screen-play').classList.remove('hidden');
		$('end').classList.add('hidden');
		resize();
		renderShop();
		renderPanel();
		renderTop();
	}

	function showMaps() {
		sim = null;
		clearTimeout(autoTimer);
		$('screen-play').classList.add('hidden');
		$('end').classList.add('hidden');
		$('screen-maps').classList.remove('hidden');
		var root = $('maps');
		root.innerHTML = '';
		BR.MAPS.forEach(function (m, i) {
			var mm = mapMeta(m.id);
			var open = mapUnlocked(i);
			var el = document.createElement('div');
			el.className = 'map-card' + (open ? '' : ' locked');
			var st = '';
			for (var k = 0; k < 3; k++) st += k < mm.stars ? '★' : '<i>★</i>';
			el.innerHTML =
				'<canvas width="320" height="200" aria-hidden="true"></canvas><div class="map-info"><h3>' + (i + 1) + '. ' + m.name + '</h3><p>' + (open ? m.blurb : 'Clear ' + BR.MAPS[i - 1].name + ' to unlock.') + '</p><div class="map-meta"><span class="stars">' + st + '</span>' + (mm.endless ? '<span>Endless best: wave ' + mm.endless + '</span>' : '') + '</div><div class="map-actions"></div></div>';
			var actions = el.querySelector('.map-actions');
			var play = document.createElement('button');
			play.className = 'btn primary small';
			play.type = 'button';
			play.textContent = mm.stars ? 'Replay' : 'Defend';
			play.disabled = !open;
			play.onclick = function () {
				startMap(i, false);
			};
			actions.appendChild(play);
			if (mm.stars) {
				var end = document.createElement('button');
				end.className = 'btn small';
				end.type = 'button';
				end.textContent = 'Endless';
				end.onclick = function () {
					startMap(i, true);
				};
				actions.appendChild(end);
			}
			root.appendChild(el);
			drawMiniMap(el.querySelector('canvas'), i);
		});
		$('btn-resume').classList.toggle('hidden', !resume);
		if (resume) $('btn-resume').textContent = 'Resume ' + BR.MAPS[resume.mapIndex].name + ' — wave ' + (resume.wave + 1);
		var total = BR.MAPS.reduce(function (n, m) {
			return n + mapMeta(m.id).stars;
		}, 0);
		$('maps-meta').textContent = '★ ' + total + '/' + BR.MAPS.length * 3 + ' · Best score ' + (meta.best || 0);
	}

	function drawMiniMap(c, index) {
		var g = c.getContext('2d');
		var pd = BR.buildPathData(BR.MAPS[index]);
		var s = c.width / COLS;
		g.fillStyle = '#0a0f1f';
		g.fillRect(0, 0, c.width, c.height);
		for (var y = 0; y < ROWS; y++)
			for (var x = 0; x < COLS; x++) {
				g.fillStyle = pd.pathTiles[x + ',' + y] ? '#3a2a1a' : 'rgba(255,255,255,0.03)';
				g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
			}
		pd.lanes.forEach(function (lane) {
			g.strokeStyle = '#ff9a4d';
			g.lineWidth = 3;
			g.beginPath();
			lane.pts.forEach(function (p, i) {
				if (i) g.lineTo(p[0] * s, p[1] * s);
				else g.moveTo(p[0] * s, p[1] * s);
			});
			g.stroke();
			var core = lane.pts[lane.pts.length - 1];
			g.fillStyle = '#7cd4ff';
			g.beginPath();
			g.arc(Math.min(c.width - 6, Math.max(6, core[0] * s)), Math.min(c.height - 6, Math.max(6, core[1] * s)), 6, 0, Math.PI * 2);
			g.fill();
		});
	}

	function startWave() {
		if (!sim || sim.over) return;
		if (sim.running && sim.spawnQueue.length) return;
		clearTimeout(autoTimer);
		var bonus = sim.startWave();
		sfx.wave();
		if (bonus) showBanner('Early call', '+' + bonus + ' credits');
		renderTop();
	}

	function handleEvents() {
		var ev = sim.events;
		sim.events = [];
		ev.forEach(function (e) {
			if (e.type === 'leak') {
				sfx.leak();
				flashCore = 0.6;
			} else if (e.type === 'waveclear') {
				sfx.clear();
				unlock('first-wave');
				if (sim.wave >= 40 && sim.endless) unlock('endless-40');
				if (!sim.over) {
					showBanner('Wave ' + e.wave + ' cleared', '+' + e.bonus + ' credits');
					persist();
					if (autoStart) autoTimer = setTimeout(startWave, 4000);
				}
			} else if (e.type === 'bosskill') unlock('boss-slayer');
		});
		if (sim.stats.spent >= 5000) unlock('big-spender');
		if (sim.stats.maxChain >= 7) unlock('chain-reaction');
		if (sim.over && !$('end').dataset.shown) finish();
	}

	function finish() {
		$('end').dataset.shown = '1';
		var m = BR.MAPS[sim.mapIndex];
		var mm = mapMeta(m.id);
		var won = sim.over === 'win';
		var starsWon = won ? (sim.lives >= 18 ? 3 : sim.lives >= 10 ? 2 : 1) : 0;
		if (won) {
			mm.stars = Math.max(mm.stars, starsWon);
			unlock('map-' + m.id);
			if (sim.lives === 20) unlock('flawless');
			if (sim.towers.length <= 6) unlock('minimalist');
			var total = BR.MAPS.reduce(function (n, x) {
				return n + mapMeta(x.id).stars;
			}, 0);
			if (total === BR.MAPS.length * 3) unlock('all-stars');
		}
		if (sim.endless) mm.endless = Math.max(mm.endless, sim.wave);
		var score = sim.stats.score;
		var best = score > (meta.best || 0);
		if (best) meta.best = score;
		Galaxy.submitScore(score).catch(function (e) {
			console.warn(e);
		});
		resume = null;
		persist(true);
		var st = '';
		for (var k = 0; k < 3; k++) st += k < starsWon ? '★' : '<i>★</i>';
		$('end-title').textContent = won ? 'The ring holds' : sim.endless ? 'Overrun at wave ' + sim.wave : 'The core has fallen';
		$('end-eyebrow').textContent = m.name + (sim.endless ? ' · Endless' : '');
		$('end-stars').innerHTML = won ? st : '';
		$('end-stats').innerHTML = '<dt>Waves</dt><dd>' + sim.wave + '</dd><dt>Lives left</dt><dd>' + sim.lives + '/20</dd><dt>Enemies destroyed</dt><dd>' + sim.stats.kills + '</dd><dt>Score</dt><dd>' + score + (best ? ' ★ best' : '') + '</dd>';
		setTimeout(function () {
			$('end').classList.remove('hidden');
			$('btn-end-maps').focus();
		}, 600);
	}

	// ── UI panels ─────────────────────────────────────────────────────

	function renderTop() {
		if (!sim) return;
		$('stat-wave').textContent = 'Wave ' + sim.wave + (sim.endless ? '' : '/' + BR.CAMPAIGN_WAVES);
		$('stat-lives').textContent = '♥ ' + sim.lives;
		$('stat-credits').textContent = '◈ ' + sim.credits;
		document.querySelectorAll('[data-speed]').forEach(function (b) {
			b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed && !paused));
		});
		$('btn-pause').setAttribute('aria-pressed', String(paused));
		var canCall = !sim.over && !(sim.running && sim.spawnQueue.length);
		var next = sim.wave + 1;
		$('btn-wave').disabled = !canCall || (!sim.endless && next > BR.CAMPAIGN_WAVES);
		$('btn-wave').textContent = sim.running ? 'Call wave ' + next + ' early' : 'Start wave ' + next;
		var prev = BR.previewTypes(sim.map, next);
		$('wave-preview').innerHTML = Object.keys(prev)
			.map(function (k) {
				return '<span class="pv" title="' + EN[k].name + '"><i style="background:' + EN[k].color + '"></i>' + prev[k] + ' ' + EN[k].name + (EN[k].fly ? ' (air)' : '') + '</span>';
			})
			.join('');
		$('btn-auto').setAttribute('aria-pressed', String(autoStart));
		var cost;
		document.querySelectorAll('.shop-btn').forEach(function (b) {
			cost = TW[b.dataset.type].cost[0];
			b.disabled = sim.credits < cost;
			b.setAttribute('aria-pressed', String(placing === b.dataset.type));
		});
	}

	function renderShop() {
		$('shop').innerHTML = ORDER.map(function (k, i) {
			var t = TW[k];
			return '<button type="button" class="shop-btn" data-type="' + k + '" title="' + t.desc + '"><span class="ic" style="--c:' + t.color + '"></span><span class="nm">' + t.name + '</span><span class="cost">◈ ' + t.cost[0] + '</span><span class="key">' + (i + 1) + '</span></button>';
		}).join('');
	}

	function fmt(n) {
		return Math.round(n * 10) / 10;
	}

	function renderPanel() {
		var p = $('panel');
		if (!sim || !selected || sim.towers.indexOf(selected) === -1) {
			selected = null;
			p.innerHTML = placing ? '<p class="hint"><b>' + TW[placing].name + '</b> — ' + TW[placing].desc + ' Tap a free tile to build. Esc cancels.</p>' : '<p class="hint">Pick a tower, then tap a free tile. Tap a tower to upgrade or sell it.</p>';
			return;
		}
		var t = selected;
		var def = TW[t.type];
		var s = sim.stats_(t);
		var lines = [];
		if (!def.support) lines.push('Damage ' + fmt(s.dmg) + (def.rate ? ' · ' + fmt(s.rate) + '/s' : ''));
		lines.push('Range ' + fmt(s.range));
		if (s.slow) lines.push('Slow ' + Math.round(s.slow * 100) + '%');
		if (s.chain) lines.push('Chains ' + s.chain);
		if (s.splash) lines.push('Splash ' + fmt(s.splash));
		if (def.support) lines.push('Boosts damage +' + Math.round(s.aura * 100) + '%' + (s.rateAura ? ', rate +' + Math.round(s.rateAura * 100) + '%' : '') + (s.rangeAura ? ', range +' + s.rangeAura : ''));
		var html = '<div class="sel-head"><span class="ic" style="--c:' + def.color + '"></span><div><b>' + (t.spec ? def.specs[t.spec].name : def.name) + '</b><small>Level ' + t.level + (t.spec ? ' · specialised' : '') + ' · ' + t.kills + ' kills</small></div></div><p class="sel-stats">' + lines.join(' · ') + '</p><div class="sel-actions">';
		var up = sim.upgradeCost(t);
		if (up !== null) html += '<button class="btn small primary" type="button" id="btn-up"' + (sim.credits < up ? ' disabled' : '') + '>Upgrade ◈ ' + up + '</button>';
		if (t.level === 3 && !t.spec) {
			Object.keys(def.specs).forEach(function (k) {
				var sp = def.specs[k];
				html += '<button class="btn small spec" type="button" data-spec="' + k + '"' + (sim.credits < sp.cost ? ' disabled' : '') + ' title="' + sp.desc + '"><b>' + sp.name + '</b> ◈ ' + sp.cost + '<small>' + sp.desc + '</small></button>';
			});
		}
		if (!def.support && !def.pulse) html += '<button class="btn small" type="button" id="btn-mode">Target: ' + t.mode + '</button>';
		html += '<button class="btn small" type="button" id="btn-sell">Sell ◈ ' + Math.floor(t.spent * (sim.running ? 0.6 : 0.75)) + '</button></div>';
		p.innerHTML = html;
		var b;
		if ((b = $('btn-up')))
			b.onclick = function () {
				if (sim.upgrade(t)) {
					sfx.upgrade();
					renderPanel();
					renderTop();
				}
			};
		p.querySelectorAll('[data-spec]').forEach(function (btn) {
			btn.onclick = function () {
				if (sim.specialize(t, btn.dataset.spec)) {
					sfx.upgrade();
					unlock('specialist');
					renderPanel();
					renderTop();
				}
			};
		});
		if ((b = $('btn-mode')))
			b.onclick = function () {
				var modes = ['first', 'last', 'strong', 'close'];
				t.mode = modes[(modes.indexOf(t.mode) + 1) % modes.length];
				renderPanel();
			};
		$('btn-sell').onclick = function () {
			sim.sell(t);
			sfx.sell();
			selected = null;
			renderPanel();
			renderTop();
		};
	}

	function showBanner(title, sub) {
		banner = { title: title, sub: sub, t: 0 };
		$('banner').innerHTML = '<b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
		$('banner').classList.remove('hidden');
		clearTimeout(showBanner.timer);
		showBanner.timer = setTimeout(function () {
			$('banner').classList.add('hidden');
		}, 2600);
	}

	// ── Drawing ───────────────────────────────────────────────────────

	var sky = null;
	var flashCore = 0;
	function paintSky() {
		sky = document.createElement('canvas');
		sky.width = canvas.width;
		sky.height = canvas.height;
		var g = sky.getContext('2d');
		g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
		var gr = g.createRadialGradient(view.w * 0.5, view.h * 0.4, 0, view.w * 0.5, view.h * 0.5, Math.max(view.w, view.h) * 0.8);
		gr.addColorStop(0, '#1a1230');
		gr.addColorStop(1, '#05040c');
		g.fillStyle = gr;
		g.fillRect(0, 0, view.w, view.h);
		stars.forEach(function (s) {
			g.globalAlpha = 0.3 + s[3] * 0.6;
			g.fillStyle = '#fff';
			g.fillRect(s[0], s[1], s[2], s[2]);
		});
	}

	function drawTower(t, x, y, alpha, time) {
		var def = TW[t.type];
		var c = ctx;
		c.save();
		c.globalAlpha = alpha === undefined ? 1 : alpha;
		c.translate(x + 0.5, y + 0.5);
		// Base
		c.fillStyle = '#1b1f33';
		c.strokeStyle = 'rgba(255,255,255,0.18)';
		c.lineWidth = 0.04;
		c.beginPath();
		c.arc(0, 0, 0.38, 0, Math.PI * 2);
		c.fill();
		c.stroke();
		c.shadowColor = def.color;
		c.shadowBlur = 8;
		c.fillStyle = def.color;
		c.strokeStyle = def.color;
		var a = t.angle || -Math.PI / 2;
		if (t.type === 'pulse') {
			c.rotate(a);
			c.fillRect(0, -0.12, 0.34, 0.08);
			c.fillRect(0, 0.04, 0.34, 0.08);
			c.beginPath();
			c.arc(0, 0, 0.16, 0, Math.PI * 2);
			c.fill();
		} else if (t.type === 'cannon') {
			c.rotate(a);
			c.fillRect(0, -0.09, 0.4, 0.18);
			c.beginPath();
			c.arc(0, 0, 0.21, 0, Math.PI * 2);
			c.fill();
		} else if (t.type === 'frost') {
			c.lineWidth = 0.07;
			var spin = settings.reducedMotion ? 0 : time * 1.5;
			for (var i = 0; i < 3; i++) {
				c.beginPath();
				c.arc(0, 0, 0.12 + i * 0.08, spin + i, spin + i + Math.PI * 1.3);
				c.stroke();
			}
		} else if (t.type === 'tesla') {
			c.fillRect(-0.05, -0.05, 0.1, 0.28);
			c.beginPath();
			c.arc(0, -0.1, 0.17, 0, Math.PI * 2);
			c.fill();
		} else if (t.type === 'lance') {
			c.rotate(a);
			c.fillRect(-0.1, -0.06, 0.56, 0.12);
			c.beginPath();
			c.moveTo(-0.2, -0.18);
			c.lineTo(0.12, 0);
			c.lineTo(-0.2, 0.18);
			c.closePath();
			c.fill();
		} else if (t.type === 'beacon') {
			c.beginPath();
			c.moveTo(0, -0.24);
			c.lineTo(0.18, 0);
			c.lineTo(0, 0.24);
			c.lineTo(-0.18, 0);
			c.closePath();
			c.fill();
		}
		c.restore();
		// Level pips & spec
		c.save();
		c.translate(x + 0.5, y + 0.5);
		for (var p = 0; p < Math.min(3, t.level); p++) {
			c.fillStyle = '#ffe36b';
			c.fillRect(-0.2 + p * 0.15, 0.3, 0.1, 0.06);
		}
		if (t.spec) {
			c.fillStyle = '#ffffff';
			c.beginPath();
			for (var q = 0; q < 10; q++) {
				var rr = q % 2 ? 0.05 : 0.11;
				var aa = (q / 10) * Math.PI * 2 - Math.PI / 2;
				c.lineTo(0.3 + Math.cos(aa) * rr, -0.28 + Math.sin(aa) * rr);
			}
			c.closePath();
			c.fill();
		}
		c.restore();
	}

	function drawEnemy(e, time) {
		var def = EN[e.type];
		var c = ctx;
		var r = def.size;
		c.save();
		c.translate(e.x, e.y);
		c.shadowColor = def.color;
		c.shadowBlur = 10;
		c.fillStyle = e.stun > 0 ? '#ffe9a0' : def.color;
		if (def.fly) {
			c.beginPath();
			c.moveTo(0, -r);
			c.lineTo(r, r * 0.7);
			c.lineTo(0, r * 0.3);
			c.lineTo(-r, r * 0.7);
			c.closePath();
			c.fill();
		} else if (def.boss) {
			c.beginPath();
			for (var i = 0; i < 8; i++) {
				var a = (i / 8) * Math.PI * 2 + (settings.reducedMotion ? 0 : time * 0.6);
				c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			c.closePath();
			c.fill();
			c.shadowBlur = 0;
			c.fillStyle = '#2a0610';
			c.beginPath();
			c.arc(0, 0, r * 0.4, 0, Math.PI * 2);
			c.fill();
		} else if (e.type === 'brute') {
			c.fillRect(-r, -r, r * 2, r * 2);
		} else if (e.type === 'swarm') {
			c.beginPath();
			c.arc(0, 0, r, 0, Math.PI * 2);
			c.fill();
		} else if (e.type === 'splitter') {
			c.beginPath();
			c.arc(-r * 0.4, 0, r * 0.6, 0, Math.PI * 2);
			c.arc(r * 0.4, 0, r * 0.6, 0, Math.PI * 2);
			c.fill();
		} else {
			c.beginPath();
			c.arc(0, 0, r, 0, Math.PI * 2);
			c.fill();
		}
		c.shadowBlur = 0;
		if (e.slowT > 0) {
			c.strokeStyle = '#9feaff';
			c.lineWidth = 0.05;
			c.beginPath();
			c.arc(0, 0, r + 0.06, 0, Math.PI * 2);
			c.stroke();
		}
		// Health / shield bars
		var w = Math.max(0.4, r * 2.2);
		if (e.hp < e.maxHp || e.maxShield) {
			c.fillStyle = 'rgba(0,0,0,0.6)';
			c.fillRect(-w / 2, -r - 0.18, w, 0.07);
			c.fillStyle = '#ff5b6b';
			c.fillRect(-w / 2, -r - 0.18, w * Math.max(0, e.hp / e.maxHp), 0.07);
			if (e.maxShield) {
				c.fillStyle = '#6bb8ff';
				c.fillRect(-w / 2, -r - 0.26, w * (e.shield / e.maxShield), 0.06);
			}
		}
		c.restore();
	}

	function draw(time) {
		var c = ctx;
		c.setTransform(1, 0, 0, 1, 0, 0);
		if (!sky || sky.width !== canvas.width || sky.height !== canvas.height) paintSky();
		c.drawImage(sky, 0, 0);
		if (!sim) return;
		worldTransform();
		// Board
		c.fillStyle = 'rgba(14,16,34,0.85)';
		c.fillRect(-0.15, -0.15, COLS + 0.3, ROWS + 0.3);
		for (var y = 0; y < ROWS; y++)
			for (var x = 0; x < COLS; x++) {
				if (sim.pathTiles[x + ',' + y]) {
					c.fillStyle = '#2a2032';
					c.fillRect(x, y, 1, 1);
				} else {
					c.fillStyle = 'rgba(255,255,255,0.035)';
					c.fillRect(x + 0.06, y + 0.06, 0.88, 0.88);
				}
			}
		// Lanes with flowing chevrons
		sim.lanes.forEach(function (lane) {
			c.strokeStyle = 'rgba(255,154,77,0.28)';
			c.lineWidth = 0.5;
			c.lineJoin = 'round';
			c.beginPath();
			lane.pts.forEach(function (p, i) {
				if (i) c.lineTo(p[0], p[1]);
				else c.moveTo(p[0], p[1]);
			});
			c.stroke();
			c.strokeStyle = 'rgba(255,190,120,0.75)';
			c.lineWidth = 0.05;
			c.setLineDash([0.18, 0.5]);
			c.lineDashOffset = settings.reducedMotion ? 0 : -time * 0.8;
			c.stroke();
			c.setLineDash([]);
		});
		// Core
		var last = sim.lanes[0].pts[sim.lanes[0].pts.length - 1];
		var cx = Math.min(COLS - 0.4, Math.max(0.4, last[0])),
			cy = Math.min(ROWS - 0.4, Math.max(0.4, last[1]));
		var pulse = settings.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(time * 3);
		var g = c.createRadialGradient(cx, cy, 0, cx, cy, 0.9);
		g.addColorStop(0, flashCore > 0 ? '#ff6b6b' : '#e8f8ff');
		g.addColorStop(0.35, flashCore > 0 ? 'rgba(255,90,90,0.8)' : 'rgba(124,212,255,0.8)');
		g.addColorStop(1, 'rgba(124,212,255,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(cx, cy, 0.9 * pulse, 0, Math.PI * 2);
		c.fill();

		// Range preview
		var showRange = null;
		if (selected) showRange = [selected.x, selected.y, sim.stats_(selected).range, TW[selected.type].color];
		if (placing && hoverTile) showRange = [hoverTile[0], hoverTile[1], TW[placing].range[0], sim.canBuild(hoverTile[0], hoverTile[1]) ? TW[placing].color : '#ff5b6b'];
		if (showRange) {
			c.fillStyle = showRange[3];
			c.globalAlpha = 0.1;
			c.beginPath();
			c.arc(showRange[0] + 0.5, showRange[1] + 0.5, showRange[2], 0, Math.PI * 2);
			c.fill();
			c.globalAlpha = 0.6;
			c.strokeStyle = showRange[3];
			c.lineWidth = 0.04;
			c.stroke();
			c.globalAlpha = 1;
		}

		sim.towers.forEach(function (t) {
			drawTower(t, t.x, t.y, 1, time);
			if (t === selected) {
				c.strokeStyle = '#ffffff';
				c.lineWidth = 0.05;
				c.strokeRect(t.x + 0.05, t.y + 0.05, 0.9, 0.9);
			}
		});
		if (placing && hoverTile && sim.canBuild(hoverTile[0], hoverTile[1])) drawTower({ type: placing, level: 1 }, hoverTile[0], hoverTile[1], 0.55, time);
		if (hoverTile && placing && !sim.canBuild(hoverTile[0], hoverTile[1])) {
			c.strokeStyle = '#ff5b6b';
			c.lineWidth = 0.05;
			c.strokeRect(hoverTile[0] + 0.05, hoverTile[1] + 0.05, 0.9, 0.9);
		}

		sim.enemies.forEach(function (e) {
			drawEnemy(e, time);
		});
		sim.projectiles.forEach(function (p) {
			if (p.kind === 'bolt') {
				c.fillStyle = p.color;
				c.shadowColor = p.color;
				c.shadowBlur = 8;
				c.beginPath();
				c.arc(p.x, p.y, 0.07, 0, Math.PI * 2);
				c.fill();
				c.shadowBlur = 0;
			} else {
				var f = p.t / p.dur;
				var lift = Math.sin(f * Math.PI) * 0.5;
				c.fillStyle = 'rgba(0,0,0,0.35)';
				c.beginPath();
				c.arc(p.x, p.y, 0.08, 0, Math.PI * 2);
				c.fill();
				c.fillStyle = '#ffb36b';
				c.beginPath();
				c.arc(p.x, p.y - lift, 0.1, 0, Math.PI * 2);
				c.fill();
			}
		});
		sim.effects.forEach(function (fx) {
			var k = fx.t / 0.45;
			c.globalAlpha = 1 - k;
			if (fx.type === 'arc') {
				c.strokeStyle = fx.color;
				c.lineWidth = 0.06;
				c.shadowColor = fx.color;
				c.shadowBlur = 10;
				c.beginPath();
				fx.pts.forEach(function (p, i) {
					var jx = i && !settings.reducedMotion ? (Math.random() - 0.5) * 0.12 : 0;
					if (i) c.lineTo(p[0] + jx, p[1] + jx);
					else c.moveTo(p[0], p[1]);
				});
				c.stroke();
				c.shadowBlur = 0;
			} else if (fx.type === 'beam') {
				c.strokeStyle = fx.color;
				c.lineWidth = 0.12 * (1 - k) + 0.02;
				c.beginPath();
				c.moveTo(fx.x, fx.y);
				c.lineTo(fx.x2, fx.y2);
				c.stroke();
			} else if (fx.type === 'ring') {
				c.strokeStyle = fx.color;
				c.lineWidth = 0.05;
				c.beginPath();
				c.arc(fx.x, fx.y, fx.r * Math.min(1, k * 2), 0, Math.PI * 2);
				c.stroke();
			} else if (fx.type === 'blast') {
				c.fillStyle = '#ffb36b';
				c.globalAlpha = (1 - k) * 0.5;
				c.beginPath();
				c.arc(fx.x, fx.y, fx.r * (0.4 + k * 0.6), 0, Math.PI * 2);
				c.fill();
			} else if (fx.type === 'pop') {
				c.strokeStyle = fx.color;
				c.lineWidth = 0.05;
				c.beginPath();
				c.arc(fx.x, fx.y, fx.size + k * 0.4, 0, Math.PI * 2);
				c.stroke();
			}
			c.globalAlpha = 1;
		});
	}

	function frame(now) {
		requestAnimationFrame(frame);
		var dt = Math.min(0.1, (now - lastT) / 1000 || 0);
		lastT = now;
		if (sim && !paused && !sim.over) {
			acc += dt * speed;
			var steps = 0;
			var killsBefore = sim.stats.kills;
			while (acc >= 1 / 60 && steps < 12) {
				sim.step(1 / 60);
				acc -= 1 / 60;
				steps++;
			}
			if (steps >= 12) acc = 0;
			if (sim.stats.kills > killsBefore) sfx.pop();
			handleEvents();
			if (steps) renderTop();
			if (selected && steps && Math.random() < 0.1) renderPanel();
		}
		if (flashCore > 0) flashCore -= dt;
		var idle = !sim || $('screen-play').classList.contains('hidden');
		if (!idle) draw(now / 1000);
	}

	// ── Input ─────────────────────────────────────────────────────────

	function local(e) {
		var r = canvas.getBoundingClientRect();
		return screenToTile(e.clientX - r.left, e.clientY - r.top);
	}

	canvas.addEventListener('pointermove', function (e) {
		if (!sim) return;
		hoverTile = local(e);
	});
	canvas.addEventListener('pointerleave', function () {
		hoverTile = null;
	});
	canvas.addEventListener('pointerup', function (e) {
		if (!sim || sim.over) return;
		var t = local(e);
		hoverTile = t;
		var tower = sim.towerAt(t[0], t[1]);
		if (placing) {
			if (tower) {
				placing = null;
				selected = tower;
			} else if (sim.build(placing, t[0], t[1])) {
				sfx.build();
				if (!e.shiftKey || sim.credits < TW[placing].cost[0]) placing = null;
			} else {
				sfx.deny();
				if (e.pointerType !== 'mouse') placing = null;
			}
		} else {
			selected = tower;
		}
		renderPanel();
		renderTop();
	});

	$('shop').addEventListener('click', function (e) {
		var b = e.target.closest('.shop-btn');
		if (!b || b.disabled) return;
		placing = placing === b.dataset.type ? null : b.dataset.type;
		selected = null;
		renderPanel();
		renderTop();
	});
	document.querySelectorAll('[data-speed]').forEach(function (b) {
		b.addEventListener('click', function () {
			speed = Number(b.dataset.speed);
			paused = false;
			renderTop();
		});
	});
	$('btn-pause').addEventListener('click', function () {
		paused = !paused;
		renderTop();
	});
	$('btn-auto').addEventListener('click', function () {
		autoStart = !autoStart;
		renderTop();
	});
	$('btn-wave').addEventListener('click', startWave);
	$('btn-quit').addEventListener('click', function () {
		if (sim && !sim.over) {
			if (sim.running) {
				// Quitting mid-wave counts the run as finished.
				sim.over = 'lose';
				finish();
				return;
			}
			resume = sim.snapshot();
			persist(true);
		}
		showMaps();
	});
	$('btn-end-maps').addEventListener('click', function () {
		delete $('end').dataset.shown;
		showMaps();
	});
	$('btn-end-again').addEventListener('click', function () {
		delete $('end').dataset.shown;
		startMap(sim.mapIndex, sim.endless);
	});
	$('btn-resume').addEventListener('click', resumeMap);

	window.addEventListener('keydown', function (e) {
		if (!sim || $('screen-play').classList.contains('hidden')) return;
		var n = Number(e.key);
		if (n >= 1 && n <= 6) {
			var type = ORDER[n - 1];
			if (sim.credits >= TW[type].cost[0]) {
				placing = placing === type ? null : type;
				selected = null;
			}
		} else if (e.key === 'Escape') {
			placing = null;
			selected = null;
		} else if (e.key === ' ') {
			e.preventDefault();
			paused = !paused;
		} else if (e.key === 'Enter' || e.key === 'n' || e.key === 'N') startWave();
		else if (e.key === 'u' && selected && sim.upgrade(selected)) sfx.upgrade();
		else if ((e.key === 'Delete' || e.key === 's') && selected) {
			sim.sell(selected);
			sfx.sell();
			selected = null;
		} else if (e.key === 'f') speed = speed === 3 ? 1 : speed + 1;
		else return;
		renderPanel();
		renderTop();
	});
	window.addEventListener('resize', resize);

	Galaxy.on('pause', function () {
		paused = true;
		renderTop();
	});
	Galaxy.on('settings', function (s) {
		settings = s;
	});

	resize();
	showMaps();
	requestAnimationFrame(frame);
	Galaxy.ready()
		.then(function (info) {
			settings = info.settings || settings;
			$('greeting').textContent = info.player.guest ? 'Ember Verge defence command' : 'Commander ' + info.player.name;
			return Galaxy.load();
		})
		.then(function (data) {
			if (data && data.v === 1) {
				meta = Object.assign(meta, data.meta || {});
				resume = data.current || null;
			}
			showMaps();
		})
		.catch(function (e) {
			console.warn(e);
		});

	window.BastionRing.debug = {
		sim: function () {
			return sim;
		},
		start: startMap,
		wave: startWave,
		setSpeed: function (s) {
			speed = s;
		},
		meta: function () {
			return meta;
		}
	};
})(window.BastionRing);
