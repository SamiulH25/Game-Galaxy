/* Slingshot — rendering, input, campaign and survey flow. */
(function (SL) {
	'use strict';

	var W = SL.W,
		H = SL.H;
	var CH = SL.CHAPTERS;
	var PER = SL.LEVELS_PER_CHAPTER;
	var TOTAL_STARS = CH.length * PER * 3;
	var TIPS = {
		'0:0': 'Drag anywhere and pull back to aim, then let go. The dotted line shows the first part of the flight.',
		'0:1': 'Collect all three shards (◆) and reach the relay within par shots for three stars.',
		'0:3': 'Fine-tune with ⟲ ⟳ and − +, or the arrow keys. Your last shot stays on screen as a ghost.',
		'1:0': 'Planets pull. Aim past them and let gravity bend you home.',
		'1:5': 'Black holes pull hard and swallow anything that gets close.',
		'2:0': 'Moons move once you launch — the preview shows where they will be.',
		'3:0': 'Wormholes connect in pairs: in one, out the other at the same speed.',
		'3:1': 'Repulsors push instead of pull.'
	};

	var $ = function (id) {
		return document.getElementById(id);
	};
	var canvas = $('field');
	var ctx = canvas.getContext('2d');

	var save = { v: 1, levels: {}, best: 0, aces: 0, ach: {}, last: null };
	var settings = { muted: false, reducedMotion: false };
	var view = { w: 1, h: 1, dpr: 1, s: 1, ox: 0, oy: 0, rot: false };
	var stars = [];
	var mode = 'title'; // title | chapters | play
	var S = null; // play session
	var rafId = 0;
	var lastT = 0;
	var particles = [];
	var paused = false;
	var saveTimer = 0;

	// ── Persistence ───────────────────────────────────────────────────

	function bits(n) {
		return (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);
	}
	function lvl(ch, li) {
		return save.levels[ch + ':' + li] || 0;
	}
	function clearedIn(ch) {
		var n = 0;
		for (var i = 0; i < PER; i++) if (lvl(ch, i) & 1) n++;
		return n;
	}
	function totalStars() {
		var n = 0;
		for (var k in save.levels) n += bits(save.levels[k]);
		return n;
	}
	function chapterOpen(ch) {
		return ch === 0 || clearedIn(ch - 1) >= 5;
	}
	function levelOpen(ch, li) {
		return chapterOpen(ch) && li < clearedIn(ch) + 2;
	}
	function persist() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(function () {
			Galaxy.save(save).catch(function (e) {
				console.warn(e);
			});
		}, 300);
	}
	function unlock(id) {
		if (save.ach[id]) return;
		save.ach[id] = 1;
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
			var o = audio.createOscillator();
			var g = audio.createGain();
			o.type = type || 'sine';
			o.frequency.setValueAtTime(freq, t);
			if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.01);
			g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			o.connect(g).connect(audio.destination);
			o.start(t);
			o.stop(t + dur + 0.02);
		} catch (e) {
			/* no audio */
		}
	}
	var sfx = {
		launch: function () {
			tone(180, 0.35, 'sawtooth', 0.05, 0, 620);
		},
		shard: function (n) {
			tone(880 + n * 220, 0.25, 'sine', 0.07);
		},
		crash: function () {
			tone(140, 0.5, 'sawtooth', 0.06, 0, 40);
		},
		win: function () {
			[523, 784, 1046, 1318].forEach(function (f, i) {
				tone(f, 0.5, 'sine', 0.07, i * 0.08);
			});
		},
		warp: function () {
			tone(300, 0.3, 'triangle', 0.05, 0, 1400);
		}
	};

	// ── View ──────────────────────────────────────────────────────────

	function resize() {
		view.dpr = Math.min(window.devicePixelRatio || 1, 2);
		view.w = window.innerWidth;
		view.h = window.innerHeight;
		canvas.width = Math.round(view.w * view.dpr);
		canvas.height = Math.round(view.h * view.dpr);
		view.rot = view.h > view.w * 1.1;
		var topPad = 64,
			botPad = 78,
			side = 12;
		var availW = view.w - side * 2,
			availH = view.h - topPad - botPad;
		var ww = view.rot ? H : W,
			wh = view.rot ? W : H;
		view.s = Math.min(availW / ww, availH / wh);
		view.ox = (view.w - ww * view.s) / 2;
		view.oy = topPad + (availH - wh * view.s) / 2;
		stars = [];
		sky = null;
		var n = Math.round((view.w * view.h) / 2600);
		for (var i = 0; i < n; i++) stars.push([Math.random() * view.w, Math.random() * view.h, Math.random() * 1.4 + 0.2, Math.random()]);
		draw(performance.now() / 1000);
	}

	function worldTransform() {
		var s = view.s,
			d = view.dpr;
		if (view.rot) ctx.setTransform(0, s * d, -s * d, 0, (view.ox + H * s) * d, view.oy * d);
		else ctx.setTransform(s * d, 0, 0, s * d, view.ox * d, view.oy * d);
	}

	function screenToWorld(px, py) {
		var u = (px - view.ox) / view.s,
			v = (py - view.oy) / view.s;
		return view.rot ? [v, H - u] : [u, v];
	}
	function screenVecToWorld(dx, dy) {
		return view.rot ? [dy, -dx] : [dx, dy];
	}

	// ── Session ───────────────────────────────────────────────────────

	function startCampaign(ch, li) {
		var level = SL.campaignLevel(ch, li);
		S = newSession(level, { kind: 'campaign', ch: ch, li: li });
		save.last = { ch: ch, li: li };
		persist();
		enterPlay();
		var tip = TIPS[ch + ':' + li];
		$('hint').textContent = tip || '';
	}

	function startSurvey() {
		var run = { seed: String(Date.now()), depth: 0, probes: 5, score: 0 };
		$('hint').textContent = 'Survey: 5 probes. Each miss costs one; a first-shot relay earns one back.';
		loadSurveyLevel(run);
	}

	function loadSurveyLevel(run) {
		$('hud-sub').textContent = 'Plotting course…';
		setTimeout(function () {
			var level = SL.surveyLevel(run.seed, run.depth);
			S = newSession(level, { kind: 'survey', run: run });
			enterPlay();
			// Warm up the next level so the hand-off is instant.
			setTimeout(function () {
				if (S && S.ref.run === run) SL.surveyLevel(run.seed, run.depth + 1);
			}, 600);
		}, 30);
	}

	function newSession(level, ref) {
		var direct = Math.atan2(level.target.y - level.pad.y, level.target.x - level.pad.x);
		return {
			level: level,
			ref: ref,
			angle: direct,
			power: 0.42,
			state: 'aim',
			shots: 0,
			shards: {},
			flight: null,
			ghost: null,
			preview: null,
			previewKey: '',
			drag: null,
			fast: false,
			done: false
		};
	}

	function enterPlay() {
		mode = 'play';
		$('screen-title').classList.add('hidden');
		$('screen-chapters').classList.add('hidden');
		$('result').classList.add('hidden');
		$('hud').classList.remove('hidden');
		particles = [];
		updateHud();
		startLoop();
	}

	function speedOf(power) {
		return SL.SPEED_MIN + power * (SL.SPEED_MAX - SL.SPEED_MIN);
	}

	// Hints fade on their own so they never hide part of the field for long.
	var hintTimer = 0;
	new MutationObserver(function () {
		clearTimeout(hintTimer);
		if ($('hint').textContent)
			hintTimer = setTimeout(function () {
				$('hint').textContent = '';
			}, 7000);
	}).observe($('hint'), { childList: true, characterData: true, subtree: true });

	function updateHud() {
		if (!S) return;
		var r = S.ref;
		if (r.kind === 'campaign') {
			$('hud-level').textContent = CH[r.ch].name + ' ' + (r.li + 1);
			$('hud-sub').textContent = 'Chapter ' + (r.ch + 1) + ' · par ' + S.level.par + ' shot' + (S.level.par === 1 ? '' : 's');
			$('stat-shots').textContent = 'Shots ' + S.shots;
		} else {
			$('hud-level').textContent = 'Survey · depth ' + (r.run.depth + 1);
			$('hud-sub').textContent = 'Score ' + r.run.score;
			$('stat-shots').textContent = 'Probes ' + r.run.probes;
		}
		$('stat-shards').textContent = '◆ ' + Object.keys(S.shards).length + '/3';
		$('power-bar').style.width = Math.round(S.power * 100) + '%';
		$('aim-controls').style.visibility = S.state === 'aim' ? 'visible' : 'hidden';
	}

	function launch() {
		if (!S || S.state !== 'aim' || S.done) return;
		S.shots++;
		var res = SL.simulate(S.level, S.angle, speedOf(S.power), { record: true });
		S.flight = { res: res, t: 0, collected: {}, warped: false };
		S.state = 'flight';
		$('hint').textContent = '';
		sfx.launch();
		updateHud();
	}

	function finishFlight() {
		var f = S.flight;
		var res = f.res;
		// The simulation is the source of truth for shards (playback samples only every other step).
		res.shards.forEach(function (i) {
			S.shards[i] = 1;
		});
		updateHud();
		S.ghost = res.path;
		S.flight = null;
		if (res.outcome === 'target') return succeed(res);
		var end = res.end;
		if (res.outcome === 'crash') {
			sfx.crash();
			burst(end[0], end[1], '#ffb27a', 36);
		}
		if (S.ref.kind === 'survey') {
			var run = S.ref.run;
			run.probes--;
			if (run.probes <= 0) return endSurvey();
		}
		S.state = 'aim';
		$('hint').textContent = res.outcome === 'crash' ? 'Impact. Adjust and try again.' : res.outcome === 'lost' ? 'Probe lost to deep space.' : 'Probe stuck in orbit.';
		updateHud();
	}

	function succeed(res) {
		S.state = 'done';
		S.done = true;
		sfx.win();
		burst(S.level.target.x, S.level.target.y, '#7cd4ff', 60);
		unlock('first-contact');
		if (res.closest < 6) unlock('close-call');
		if (res.wormholed) unlock('wormhole');
		var shardsGot = Object.keys(S.shards).length;
		if (shardsGot === 3) unlock('full-haul');

		if (S.ref.kind === 'campaign') {
			var r = S.ref;
			var got = 1 | (shardsGot === 3 ? 2 : 0) | (S.shots <= S.level.par ? 4 : 0);
			var before = totalStars();
			var key = r.ch + ':' + r.li;
			save.levels[key] = (save.levels[key] || 0) | got;
			if (S.shots === 1) {
				save.aces = (save.aces || 0) + 1;
				if (save.aces >= 5) unlock('ace');
			}
			for (var c = 0; c < CH.length; c++) if (clearedIn(c) === PER) unlock('chapter-' + (c + 1));
			if (totalStars() === TOTAL_STARS) unlock('all-stars');
			persist();
			showResult({
				eyebrow: 'Relay reached',
				title: CH[r.ch].name + ' ' + (r.li + 1),
				stars: got,
				rows: [
					[true, 'Relay reached'],
					[shardsGot === 3, 'Shards — ' + shardsGot + '/3 collected'],
					[S.shots <= S.level.par, 'Shots — ' + S.shots + ' (par ' + S.level.par + ')']
				],
				a: ['Retry', function () {
					startCampaign(r.ch, r.li);
				}],
				b: nextCampaign(r)
			});
			if (totalStars() > before) updateTitle();
		} else {
			var run = S.ref.run;
			var gained = 100 + shardsGot * 50 + (S.shots === 1 ? 100 : 0);
			run.score += gained;
			if (S.shots === 1 && run.probes < 5) run.probes++;
			run.depth++;
			if (run.depth >= 10) unlock('survey-10');
			if (run.depth >= 25) unlock('survey-25');
			updateHud();
			var msg = '+' + gained + (S.shots === 1 ? ' · first-shot bonus' : '');
			$('hint').textContent = msg;
			setTimeout(function () {
				if (S && S.ref.run === run) loadSurveyLevel(run);
			}, settings.reducedMotion ? 400 : 1300);
		}
	}

	function nextCampaign(r) {
		var next = null;
		if (r.li + 1 < PER && levelOpen(r.ch, r.li + 1)) next = { ch: r.ch, li: r.li + 1 };
		else if (r.ch + 1 < CH.length && chapterOpen(r.ch + 1)) next = { ch: r.ch + 1, li: 0 };
		if (!next) return ['Levels', showChapters];
		return [
			'Next',
			function () {
				startCampaign(next.ch, next.li);
			}
		];
	}

	function endSurvey() {
		var run = S.ref.run;
		S.state = 'done';
		S.done = true;
		var best = run.score > (save.best || 0);
		if (best) save.best = run.score;
		persist();
		Galaxy.submitScore(run.score).catch(function (e) {
			console.warn(e);
		});
		showResult({
			eyebrow: 'Survey complete',
			title: run.score + ' points',
			stars: 0,
			rows: [
				[true, 'Depth reached — ' + run.depth],
				[best, best ? 'New personal best!' : 'Best — ' + save.best]
			],
			a: ['Menu', showTitle],
			b: ['Fly again', startSurvey]
		});
		updateTitle();
	}

	function showResult(o) {
		$('result-eyebrow').textContent = o.eyebrow;
		$('result-title').textContent = o.title;
		var st = '';
		if (o.stars) for (var i = 0; i < 3; i++) st += i < bits(o.stars) ? '★' : '<i>★</i>';
		$('result-stars').innerHTML = st;
		$('result-criteria').innerHTML = o.rows
			.map(function (r) {
				return '<li class="' + (r[0] ? 'got' : '') + '"><b>' + (r[0] ? '★' : '○') + '</b><span>' + r[1] + '</span></li>';
			})
			.join('');
		$('btn-result-a').textContent = o.a[0];
		$('btn-result-b').textContent = o.b[0];
		$('btn-result-a').onclick = o.a[1];
		$('btn-result-b').onclick = o.b[1];
		setTimeout(
			function () {
				$('result').classList.remove('hidden');
				$('btn-result-b').focus();
			},
			settings.reducedMotion ? 200 : 900
		);
	}

	// ── Menus ─────────────────────────────────────────────────────────

	function updateTitle() {
		$('title-stars').textContent = totalStars();
		$('title-best').textContent = save.best || 0;
	}
	function showTitle() {
		mode = 'title';
		S = null;
		$('hud').classList.add('hidden');
		$('result').classList.add('hidden');
		$('screen-chapters').classList.add('hidden');
		$('screen-title').classList.remove('hidden');
		updateTitle();
		startLoop();
	}
	function showChapters() {
		mode = 'chapters';
		S = null;
		$('hud').classList.add('hidden');
		$('result').classList.add('hidden');
		$('screen-title').classList.add('hidden');
		$('screen-chapters').classList.remove('hidden');
		$('chapters-stars').textContent = totalStars();
		var root = $('chapters');
		root.innerHTML = '';
		CH.forEach(function (c, ch) {
			var open = chapterOpen(ch);
			var sum = 0;
			for (var i = 0; i < PER; i++) sum += bits(lvl(ch, i));
			var el = document.createElement('section');
			el.className = 'chapter' + (open ? '' : ' locked');
			el.innerHTML = '<h3><span>' + (ch + 1) + '. ' + c.name + '</span><span class="gold">★ ' + sum + '/' + PER * 3 + '</span></h3><p>' + (open ? c.blurb : 'Clear 5 levels of ' + CH[ch - 1].name + ' to unlock.') + '</p>';
			var grid = document.createElement('div');
			grid.className = 'levels';
			for (var li = 0; li < PER; li++)
				(function (li) {
					var b = lvl(ch, li);
					var t = document.createElement('button');
					t.type = 'button';
					t.className = 'tile' + (b & 1 ? ' done' : '');
					t.disabled = !levelOpen(ch, li);
					var s = '';
					for (var k = 0; k < 3; k++) s += k < bits(b) ? '★' : '<i>★</i>';
					t.innerHTML = (t.disabled ? '·' : li + 1) + (b & 1 ? '<small>' + s + '</small>' : '');
					t.setAttribute('aria-label', 'Level ' + (li + 1) + (t.disabled ? ', locked' : ', ' + bits(b) + ' stars'));
					t.addEventListener('click', function () {
						startCampaign(ch, li);
					});
					grid.appendChild(t);
				})(li);
			el.appendChild(grid);
			root.appendChild(el);
		});
	}

	// ── Drawing ───────────────────────────────────────────────────────

	function hsl(h, s, l, a) {
		return 'hsla(' + h + ',' + s + '%,' + l + '%,' + (a === undefined ? 1 : a) + ')';
	}

	// The sky is painted once per resize; a few bright stars twinkle on top.
	var sky = null;
	function paintSky() {
		sky = document.createElement('canvas');
		sky.width = canvas.width;
		sky.height = canvas.height;
		var c = sky.getContext('2d');
		c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
		var g = c.createRadialGradient(view.w * 0.7, view.h * 0.2, 0, view.w * 0.5, view.h * 0.5, Math.max(view.w, view.h));
		g.addColorStop(0, '#0c2246');
		g.addColorStop(0.5, '#050f24');
		g.addColorStop(1, '#020610');
		c.fillStyle = g;
		c.fillRect(0, 0, view.w, view.h);
		for (var i = 0; i < stars.length; i++) {
			var s = stars[i];
			c.globalAlpha = 0.3 + s[3] * 0.5;
			c.fillStyle = s[3] > 0.8 ? '#bfe6ff' : '#ffffff';
			c.fillRect(s[0], s[1], s[2], s[2]);
		}
	}

	function drawBackground(t) {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		if (!sky || sky.width !== canvas.width || sky.height !== canvas.height) paintSky();
		ctx.drawImage(sky, 0, 0);
		if (settings.reducedMotion) return;
		ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
		ctx.fillStyle = '#ffffff';
		for (var i = 0; i < stars.length; i += 9) {
			var s = stars[i];
			ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * (0.6 + s[3]) + s[3] * 20);
			ctx.fillRect(s[0] - 0.5, s[1] - 0.5, s[2] + 1, s[2] + 1);
		}
		ctx.globalAlpha = 1;
	}

	function drawPlanet(b, t) {
		var hue = b.hue || 200;
		// Gravity well rings
		ctx.strokeStyle = hsl(hue, 70, 70, 0.07);
		ctx.lineWidth = 1;
		for (var k = 1; k <= 3; k++) {
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.r * (1 + k * 0.9), 0, Math.PI * 2);
			ctx.stroke();
		}
		var halo = ctx.createRadialGradient(b.x, b.y, b.r * 0.8, b.x, b.y, b.r * 1.5);
		halo.addColorStop(0, hsl(hue, 80, 65, 0.35));
		halo.addColorStop(1, hsl(hue, 80, 65, 0));
		ctx.fillStyle = halo;
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r * 1.5, 0, Math.PI * 2);
		ctx.fill();
		var g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
		g.addColorStop(0, hsl(hue, 60, 75));
		g.addColorStop(0.6, hsl(hue, 55, 45));
		g.addColorStop(1, hsl(hue, 60, 18));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		ctx.fill();
		if (b.bands) {
			ctx.save();
			ctx.clip();
			ctx.strokeStyle = hsl(hue + 30, 50, 80, 0.18);
			ctx.lineWidth = b.r * 0.16;
			for (var i = -2; i <= 2; i++) {
				ctx.beginPath();
				ctx.ellipse(b.x, b.y + i * b.r * 0.38, b.r * 1.2, b.r * 0.12, 0, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.restore();
		}
	}

	function drawMoon(b) {
		var g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 1, b.x, b.y, b.r);
		g.addColorStop(0, '#e8edf5');
		g.addColorStop(1, '#5b6478');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		ctx.fill();
	}

	function drawHole(b, t) {
		var a = settings.reducedMotion ? 0 : t * 1.4;
		for (var i = 0; i < 3; i++) {
			ctx.strokeStyle = i === 0 ? 'rgba(255,170,90,0.75)' : i === 1 ? 'rgba(255,120,200,0.45)' : 'rgba(140,160,255,0.3)';
			ctx.lineWidth = 6 - i * 1.5;
			ctx.beginPath();
			ctx.ellipse(b.x, b.y, b.r * (2.4 + i * 0.9), b.r * (0.9 + i * 0.35), a * (i % 2 ? -0.6 : 1) + i, 0, Math.PI * 2);
			ctx.stroke();
		}
		var g = ctx.createRadialGradient(b.x, b.y, b.r * 0.6, b.x, b.y, b.r * 3);
		g.addColorStop(0, 'rgba(0,0,0,1)');
		g.addColorStop(0.35, 'rgba(10,0,20,0.8)');
		g.addColorStop(1, 'rgba(10,0,20,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#000';
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		ctx.fill();
	}

	function drawRepulsor(b, t) {
		var p = settings.reducedMotion ? 0.5 : (t * 0.8) % 1;
		for (var i = 0; i < 3; i++) {
			var k = (p + i / 3) % 1;
			ctx.strokeStyle = 'rgba(160,255,230,' + (0.5 * (1 - k)) + ')';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.r + k * 70, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.fillStyle = '#bffff0';
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#0a3a3a';
		ctx.beginPath();
		ctx.arc(b.x, b.y, b.r * 0.55, 0, Math.PI * 2);
		ctx.fill();
	}

	function drawRock(b) {
		var seed = b.body.seed || 0.5;
		ctx.fillStyle = '#4d5363';
		ctx.strokeStyle = '#8890a3';
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (var i = 0; i < 7; i++) {
			var a = (i / 7) * Math.PI * 2;
			var rr = b.r * (0.75 + 0.35 * Math.abs(Math.sin(seed * 50 + i * 2.3)));
			var px = b.x + Math.cos(a) * rr,
				py = b.y + Math.sin(a) * rr;
			if (i) ctx.lineTo(px, py);
			else ctx.moveTo(px, py);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}

	function drawWormholes(t) {
		var wh = S.level.wormholes || [];
		var colors = ['#c08bff', '#ffb36b'];
		for (var w = 0; w < wh.length; w++) {
			for (var e = 0; e < 2; e++) {
				var p = wh[w][e];
				var a = settings.reducedMotion ? 0 : t * (e ? -2 : 2);
				for (var i = 0; i < 4; i++) {
					ctx.strokeStyle = colors[e];
					ctx.globalAlpha = 0.25 + i * 0.15;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.r * (1 - i * 0.2), a + i, a + i + Math.PI * 1.3);
					ctx.stroke();
				}
				ctx.globalAlpha = 1;
				var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
				g.addColorStop(0, colors[e]);
				g.addColorStop(1, 'rgba(0,0,0,0)');
				ctx.globalAlpha = 0.4;
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
			}
		}
	}

	function drawTarget(t) {
		var tg = S.level.target;
		var a = settings.reducedMotion ? 0 : t;
		var g = ctx.createRadialGradient(tg.x, tg.y, 0, tg.x, tg.y, SL.TARGET_R * 1.8);
		g.addColorStop(0, 'rgba(124,212,255,0.35)');
		g.addColorStop(1, 'rgba(124,212,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(tg.x, tg.y, SL.TARGET_R * 1.8, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = '#7cd4ff';
		ctx.lineWidth = 3;
		for (var i = 0; i < 4; i++) {
			ctx.beginPath();
			ctx.arc(tg.x, tg.y, SL.TARGET_R, a + (i * Math.PI) / 2, a + (i * Math.PI) / 2 + 1.1);
			ctx.stroke();
		}
		ctx.lineWidth = 1.5;
		ctx.strokeStyle = 'rgba(200,240,255,0.6)';
		ctx.beginPath();
		ctx.arc(tg.x, tg.y, SL.TARGET_R * 0.55, -a * 1.5, -a * 1.5 + Math.PI * 1.4);
		ctx.stroke();
		ctx.fillStyle = '#e8f8ff';
		ctx.beginPath();
		ctx.arc(tg.x, tg.y, 4, 0, Math.PI * 2);
		ctx.fill();
	}

	function drawShards(t) {
		var sh = S.level.shards;
		for (var i = 0; i < sh.length; i++) {
			var got = S.shards[i] || (S.flight && S.flight.collected[i]);
			var p = sh[i];
			var bob = settings.reducedMotion ? 0 : Math.sin(t * 2 + i) * 2;
			ctx.save();
			ctx.translate(p.x, p.y + bob);
			ctx.rotate(Math.PI / 4);
			if (got) {
				ctx.strokeStyle = 'rgba(255,211,107,0.35)';
				ctx.lineWidth = 1.5;
				ctx.strokeRect(-6, -6, 12, 12);
			} else {
				ctx.shadowColor = '#ffd36b';
				ctx.shadowBlur = 14;
				ctx.fillStyle = '#ffd36b';
				ctx.fillRect(-7, -7, 14, 14);
				ctx.shadowBlur = 0;
				ctx.fillStyle = '#fff6d6';
				ctx.fillRect(-3, -3, 6, 6);
			}
			ctx.restore();
		}
	}

	function drawPad() {
		var p = S.level.pad;
		ctx.fillStyle = '#16314f';
		ctx.strokeStyle = '#7cd4ff';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = '#7cd4ff';
		ctx.beginPath();
		ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
		ctx.fill();
	}

	function drawPath(path, style, width, dash, upto) {
		if (!path) return;
		ctx.strokeStyle = style;
		ctx.lineWidth = width;
		ctx.setLineDash(dash || []);
		ctx.beginPath();
		var pen = false;
		var n = upto === undefined ? path.length : Math.min(path.length, upto);
		for (var i = 0; i < n; i++) {
			var p = path[i];
			if (!p) {
				pen = false;
				continue;
			}
			if (pen) ctx.lineTo(p[0], p[1]);
			else ctx.moveTo(p[0], p[1]);
			pen = true;
		}
		ctx.stroke();
		ctx.setLineDash([]);
	}

	function drawAim() {
		var p = S.level.pad;
		var len = 30 + S.power * 70;
		var ex = p.x + Math.cos(S.angle) * len,
			ey = p.y + Math.sin(S.angle) * len;
		ctx.strokeStyle = 'rgba(124,212,255,0.9)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(p.x, p.y);
		ctx.lineTo(ex, ey);
		ctx.stroke();
		var ah = 10,
			aa = S.angle;
		ctx.fillStyle = '#7cd4ff';
		ctx.beginPath();
		ctx.moveTo(ex + Math.cos(aa) * ah, ey + Math.sin(aa) * ah);
		ctx.lineTo(ex + Math.cos(aa + 2.5) * ah, ey + Math.sin(aa + 2.5) * ah);
		ctx.lineTo(ex + Math.cos(aa - 2.5) * ah, ey + Math.sin(aa - 2.5) * ah);
		ctx.closePath();
		ctx.fill();

		var key = S.angle.toFixed(5) + ':' + S.power.toFixed(4);
		if (key !== S.previewKey) {
			S.previewKey = key;
			S.preview = SL.simulate(S.level, S.angle, speedOf(S.power), { record: true, maxT: S.level.preview });
		}
		var path = S.preview.path;
		for (var i = 2; i < path.length; i += 3) {
			var q = path[i];
			if (!q) continue;
			ctx.globalAlpha = Math.max(0, 1 - i / path.length) * 0.9;
			ctx.fillStyle = '#d6f2ff';
			ctx.beginPath();
			ctx.arc(q[0], q[1], 2.2, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	function burst(x, y, color, n) {
		if (settings.reducedMotion) return;
		for (var i = 0; i < n; i++) {
			var a = Math.random() * Math.PI * 2,
				sp = 30 + Math.random() * 160;
			particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.7, age: 0, color: color });
		}
	}

	function draw(t) {
		drawBackground(t);
		if (!S) return;
		worldTransform();
		// Field frame
		ctx.strokeStyle = 'rgba(124,212,255,0.12)';
		ctx.lineWidth = 1.5 / view.s;
		ctx.strokeRect(0, 0, W, H);

		var bt = S.flight ? S.flight.t : 0;
		var bodies = SL.bodiesAt(S.level, bt);
		// Moon orbit guides
		S.level.bodies.forEach(function (b) {
			if (!b.orbit) return;
			var p = S.level.bodies[b.orbit.parent];
			ctx.strokeStyle = 'rgba(200,220,255,0.12)';
			ctx.setLineDash([4, 6]);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.arc(p.x, p.y, b.orbit.r, 0, Math.PI * 2);
			ctx.stroke();
			ctx.setLineDash([]);
		});
		drawWormholes(t);
		drawTarget(t);
		for (var i = 0; i < bodies.length; i++) {
			var b = bodies[i];
			if (b.kind === 'planet') drawPlanet(Object.assign({}, b.body, { x: b.x, y: b.y }), t);
			else if (b.kind === 'moon') drawMoon(b);
			else if (b.kind === 'hole') drawHole(b, t);
			else if (b.kind === 'repulsor') drawRepulsor(b, t);
			else if (b.kind === 'rock') drawRock(b);
		}
		drawShards(t);
		drawPad();
		drawPath(S.ghost, 'rgba(180,220,255,0.22)', 1.5, [5, 6]);

		if (S.state === 'aim') drawAim();
		if (S.flight) {
			var f = S.flight;
			var idx = Math.floor(f.t * 60);
			drawPath(f.res.path, 'rgba(124,212,255,0.75)', 2, null, idx + 1);
			var head = null;
			for (var k = Math.min(idx, f.res.path.length - 1); k >= 0 && !head; k--) head = f.res.path[k];
			if (head) {
				var g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 14);
				g.addColorStop(0, '#ffffff');
				g.addColorStop(0.3, 'rgba(124,212,255,0.9)');
				g.addColorStop(1, 'rgba(124,212,255,0)');
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(head[0], head[1], 14, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		if (particles.length) {
			ctx.globalCompositeOperation = 'lighter';
			for (var j = particles.length - 1; j >= 0; j--) {
				var pt = particles[j];
				ctx.globalAlpha = Math.max(0, 1 - pt.age / pt.life);
				ctx.fillStyle = pt.color;
				ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
			}
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
		}
	}

	var lastDraw = 0;
	function tick(now) {
		rafId = requestAnimationFrame(tick);
		// Menus and the result card don't need 60 fps.
		var idle = mode !== 'play' || !$('result').classList.contains('hidden');
		if (idle && now - lastDraw < 250) return;
		lastDraw = now;
		var dt = Math.min(0.05, (now - lastT) / 1000);
		lastT = now;
		if (paused) return;
		var t = now / 1000;
		if (S && S.flight) {
			var f = S.flight;
			f.t += dt * (S.fast ? 3 : 1);
			// Shards and warps as the probe passes them.
			var idx = Math.min(f.res.path.length - 1, Math.floor(f.t * 60));
			var head = f.res.path[idx];
			if (head) {
				S.level.shards.forEach(function (sh, i) {
					if (!f.collected[i] && !S.shards[i] && Math.hypot(sh.x - head[0], sh.y - head[1]) < SL.SHARD_R + 6 && f.res.shards.indexOf(i) !== -1) {
						f.collected[i] = 1;
						S.shards[i] = 1;
						sfx.shard(Object.keys(S.shards).length);
						burst(sh.x, sh.y, '#ffd36b', 16);
						updateHud();
					}
				});
			}
			if (!f.warped && f.res.wormholed) {
				for (var q = 0; q <= idx; q++)
					if (f.res.path[q] === null) {
						f.warped = true;
						sfx.warp();
						break;
					}
			}
			if (f.t >= f.res.t) finishFlight();
		}
		for (var i = particles.length - 1; i >= 0; i--) {
			var p = particles[i];
			p.age += dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= 0.97;
			p.vy *= 0.97;
			if (p.age > p.life) particles.splice(i, 1);
		}
		draw(t);
	}

	function startLoop() {
		if (rafId) return;
		lastT = performance.now();
		rafId = requestAnimationFrame(tick);
	}

	// ── Input ─────────────────────────────────────────────────────────

	canvas.addEventListener('pointerdown', function (e) {
		if (mode !== 'play' || !S) return;
		if (S.state === 'flight') {
			S.fast = true;
			return;
		}
		if (S.state !== 'aim') return;
		canvas.setPointerCapture(e.pointerId);
		S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
	});
	canvas.addEventListener('pointermove', function (e) {
		if (!S || !S.drag || S.drag.id !== e.pointerId) return;
		var dx = S.drag.x - e.clientX,
			dy = S.drag.y - e.clientY;
		var len = Math.hypot(dx, dy);
		if (len < 6 && !S.drag.moved) return;
		S.drag.moved = true;
		var v = screenVecToWorld(dx, dy);
		S.angle = Math.atan2(v[1], v[0]);
		S.power = Math.max(0, Math.min(1, len / (Math.min(view.w, view.h) * 0.42)));
		updateHud();
	});
	function release(e) {
		if (S) S.fast = false;
		if (!S || !S.drag || S.drag.id !== e.pointerId) return;
		var moved = S.drag.moved;
		S.drag = null;
		if (moved && S.power > 0.04) launch();
	}
	canvas.addEventListener('pointerup', release);
	canvas.addEventListener('pointercancel', function (e) {
		if (S) {
			S.drag = null;
			S.fast = false;
		}
	});

	document.querySelectorAll('[data-nudge]').forEach(function (b) {
		var hold = 0;
		var fire = function () {
			var parts = b.dataset.nudge.split(':');
			nudge(parts[0], Number(parts[1]), 1);
		};
		b.addEventListener('pointerdown', function (e) {
			e.preventDefault();
			fire();
			hold = setInterval(fire, 90);
		});
		['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
			b.addEventListener(ev, function () {
				clearInterval(hold);
			});
		});
		b.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				fire();
			}
		});
	});

	function nudge(what, dir, mult) {
		if (!S || S.state !== 'aim') return;
		if (what === 'angle') S.angle += dir * mult * (Math.PI / 720);
		else S.power = Math.max(0, Math.min(1, S.power + dir * mult * 0.005));
		updateHud();
	}

	window.addEventListener('keydown', function (e) {
		if (!$('result').classList.contains('hidden')) {
			if (e.key === 'Enter') $('btn-result-b').click();
			return;
		}
		if (mode !== 'play' || !S) return;
		var mult = e.shiftKey ? 6 : 1;
		if (e.key === 'ArrowLeft') nudge('angle', view.rot ? 1 : -1, mult);
		else if (e.key === 'ArrowRight') nudge('angle', view.rot ? -1 : 1, mult);
		else if (e.key === 'ArrowUp') nudge('power', 1, mult);
		else if (e.key === 'ArrowDown') nudge('power', -1, mult);
		else if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			if (S.state === 'aim') launch();
			else S.fast = true;
			return;
		} else if (e.key === 'Escape') return leave();
		else return;
		e.preventDefault();
	});
	window.addEventListener('keyup', function (e) {
		if (S && (e.key === ' ' || e.key === 'Enter')) S.fast = false;
	});

	function leave() {
		if (S && S.ref.kind === 'survey' && !S.done) {
			endSurvey();
			return;
		}
		if (S && S.ref.kind === 'campaign') showChapters();
		else showTitle();
	}

	$('btn-launch').addEventListener('click', launch);
	$('btn-menu').addEventListener('click', leave);
	$('btn-campaign').addEventListener('click', showChapters);
	$('btn-survey').addEventListener('click', startSurvey);
	$('btn-chapters-back').addEventListener('click', showTitle);
	window.addEventListener('resize', resize);

	Galaxy.on('pause', function () {
		paused = true;
	});
	Galaxy.on('resume', function () {
		paused = false;
		lastT = performance.now();
	});
	Galaxy.on('settings', function (s) {
		settings = s;
	});

	resize();
	showTitle();
	Galaxy.ready()
		.then(function (info) {
			settings = info.settings || settings;
			$('greeting').textContent = info.player.guest ? 'Aurora Drift survey corps' : 'Welcome back, ' + info.player.name;
			return Galaxy.load();
		})
		.then(function (data) {
			if (data && data.v === 1) {
				save.levels = data.levels || {};
				save.best = data.best || 0;
				save.aces = data.aces || 0;
				save.ach = data.ach || {};
				save.last = data.last || null;
			}
			updateTitle();
		})
		.catch(function (e) {
			console.warn(e);
		});

	window.Slingshot.debug = {
		session: function () {
			return S;
		},
		startCampaign: startCampaign,
		launch: launch,
		save: function () {
			return save;
		}
	};
})(window.Slingshot);
