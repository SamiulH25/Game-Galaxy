/* Prism Relay — UI, rendering, input and progression. */
(function (PR) {
	'use strict';

	var K = PR.KIND;
	var MIRROR = PR.MIRROR;
	var COLOR_CSS = { 1: '#ff4d6d', 2: '#4dff88', 3: '#ffe14d', 4: '#4da6ff', 5: '#ff5cf4', 6: '#4dfff0', 7: '#ffffff' };
	var COLOR_LETTER = { 1: 'R', 2: 'G', 3: 'Y', 4: 'B', 5: 'M', 6: 'C', 7: 'W' };
	var KIND_ORDER = ['mirror', 'splitter', 'filter1', 'filter2', 'filter4'];
	var KIND_LABEL = { mirror: 'Mirror', splitter: 'Splitter', filter1: 'Red filter', filter2: 'Green filter', filter4: 'Blue filter' };
	var CH = PR.CHAPTERS;
	var PER = PR.LEVELS_PER_CHAPTER;
	var TOTAL_STARS = CH.length * PER * 3;

	var TIPS = {
		'0:0': 'Tap a cell to place a mirror. Tap it again to turn it.',
		'0:1': 'Drag a piece to move it. Drag it off the board (or long-press) to take it back.',
		'0:2': 'Fewer moves and fewer pieces earn more stars.',
		'1:0': 'Two emitters, two receivers. Each receiver shows the colour it wants.',
		'1:3': 'Some receivers need two colours at once — red + blue makes magenta.',
		'2:0': 'Splitters let light through and reflect a copy. Tap to turn them.',
		'3:0': 'White light carries every colour. A filter keeps only its own.',
		'4:0': 'The final chapter mixes everything. Take your time.'
	};

	var $ = function (id) {
		return document.getElementById(id);
	};
	var canvas = $('board');
	var ctx = canvas.getContext('2d');

	var save = { v: 1, levels: {}, daily: {}, ach: {}, last: null };
	var settings = { muted: false, reducedMotion: false };
	var game = null;
	var view = { cell: 40, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
	var pointer = null;
	var hover = -1;
	var particles = [];
	var rafId = 0;
	var saveTimer = 0;

	// ── Persistence & progression ─────────────────────────────────────

	function bits(n) {
		return (n & 1) + ((n >> 1) & 1) + ((n >> 2) & 1);
	}
	function levelBits(ch, li) {
		var e = save.levels[ch + ':' + li];
		return e ? e.s : 0;
	}
	function solvedIn(ch) {
		var n = 0;
		for (var i = 0; i < PER; i++) if (levelBits(ch, i) & 1) n++;
		return n;
	}
	function totalStars() {
		var n = 0;
		for (var k in save.levels) n += bits(save.levels[k].s);
		return n;
	}
	function chapterUnlocked(ch) {
		return ch === 0 || solvedIn(ch - 1) >= 6;
	}
	function levelUnlocked(ch, li) {
		return chapterUnlocked(ch) && li < solvedIn(ch) + 3;
	}
	function dateKey(d) {
		d = d || new Date();
		return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
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
	function tone(freq, dur, type, gain, delay) {
		if (settings.muted) return;
		try {
			audio = audio || new (window.AudioContext || window.webkitAudioContext)();
			var t = audio.currentTime + (delay || 0);
			var o = audio.createOscillator();
			var g = audio.createGain();
			o.type = type || 'sine';
			o.frequency.setValueAtTime(freq, t);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.01);
			g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			o.connect(g).connect(audio.destination);
			o.start(t);
			o.stop(t + dur + 0.02);
		} catch (e) {
			/* audio unavailable */
		}
	}
	var sfx = {
		place: function () {
			tone(520, 0.08, 'triangle', 0.06);
		},
		rotate: function () {
			tone(700, 0.05, 'square', 0.025);
		},
		remove: function () {
			tone(300, 0.08, 'triangle', 0.05);
		},
		lit: function (color) {
			tone({ 1: 523, 2: 659, 3: 587, 4: 784, 5: 698, 6: 880, 7: 1046 }[color] || 600, 0.35, 'sine', 0.07);
		},
		solve: function () {
			[523, 659, 784, 1046].forEach(function (f, i) {
				tone(f, 0.5, 'sine', 0.07, i * 0.09);
			});
		},
		deny: function () {
			tone(160, 0.12, 'sawtooth', 0.03);
		}
	};

	// ── Screens ───────────────────────────────────────────────────────

	function show(id) {
		['screen-title', 'screen-chapters', 'screen-play'].forEach(function (s) {
			$(s).classList.toggle('hidden', s !== id);
		});
		if (id === 'screen-play') {
			resize();
			startLoop();
		} else stopLoop();
	}

	function refreshTitle() {
		$('stars-total').textContent = totalStars();
		$('daily-tag').textContent = save.daily[dateKey()] ? 'solved' : 'new';
		var anySolved = Object.keys(save.levels).length > 0;
		$('btn-continue').textContent = anySolved ? 'Continue' : 'Start';
	}

	function renderChapters() {
		$('chapters-stars').textContent = totalStars() + ' / ' + TOTAL_STARS;
		var root = $('chapters');
		root.innerHTML = '';
		CH.forEach(function (c, ch) {
			var unlocked = chapterUnlocked(ch);
			var el = document.createElement('section');
			el.className = 'chapter' + (unlocked ? '' : ' locked');
			var stars = 0;
			for (var i = 0; i < PER; i++) stars += bits(levelBits(ch, i));
			el.innerHTML =
				'<div class="chapter-head"><h3>' + (ch + 1) + '. ' + c.name + '</h3><span><span class="star-icon">★</span> ' + stars + '/' + PER * 3 + '</span></div>' +
				'<p>' + (unlocked ? c.blurb : 'Solve 6 levels in ' + CH[ch - 1].name + ' to unlock.') + '</p>';
			var grid = document.createElement('div');
			grid.className = 'levels';
			for (var li = 0; li < PER; li++) {
				(function (li) {
					var b = levelBits(ch, li);
					var btn = document.createElement('button');
					btn.type = 'button';
					btn.className = 'level-tile' + (b & 1 ? ' solved' : '');
					var open = levelUnlocked(ch, li);
					btn.disabled = !open;
					btn.setAttribute('aria-label', 'Level ' + (li + 1) + (open ? ', ' + bits(b) + ' stars' : ', locked'));
					btn.innerHTML = (open ? li + 1 : '🔒') + (b & 1 ? '<span class="mini-stars">' + starText(b) + '</span>' : '');
					btn.addEventListener('click', function () {
						startLevel({ ch: ch, li: li });
					});
					grid.appendChild(btn);
				})(li);
			}
			el.appendChild(grid);
			root.appendChild(el);
		});
	}

	function starText(b) {
		var s = '';
		for (var i = 0; i < 3; i++) s += i < bits(b) ? '★' : '<span class="off">★</span>';
		return s;
	}

	function nextOpenLevel() {
		for (var ch = 0; ch < CH.length; ch++) {
			if (!chapterUnlocked(ch)) break;
			for (var li = 0; li < PER; li++) if (!(levelBits(ch, li) & 1) && levelUnlocked(ch, li)) return { ch: ch, li: li };
		}
		return save.last || { ch: 0, li: 0 };
	}

	// ── Play state ────────────────────────────────────────────────────

	function startLevel(ref) {
		var level = ref.daily ? PR.dailyLevel(ref.daily) : PR.campaignLevel(ref.ch, ref.li);
		game = {
			ref: ref,
			level: level,
			placed: {},
			hinted: {},
			inv: Object.assign({}, level.inventory),
			moves: 0,
			history: [],
			selected: null,
			cursor: -1,
			assisted: false,
			result: null,
			solved: false,
			litBefore: {}
		};
		game.selected = firstAvailableKind();
		if (!ref.daily) {
			save.last = { ch: ref.ch, li: ref.li };
			persist();
		}
		$('level-title').textContent = ref.daily ? 'Daily relay' : CH[ref.ch].name + ' ' + (ref.li + 1);
		$('level-sub').textContent = ref.daily ? ref.daily : 'Chapter ' + (ref.ch + 1) + ' · level ' + (ref.li + 1) + ' of ' + PER;
		$('par-moves').textContent = level.parMoves;
		var tip = ref.daily ? null : TIPS[ref.ch + ':' + ref.li];
		$('tip').textContent = tip || '';
		$('tip').classList.toggle('hidden', !tip);
		$('win').classList.add('hidden');
		renderTray();
		show('screen-play');
		update(true);
	}

	function firstAvailableKind() {
		for (var i = 0; i < KIND_ORDER.length; i++) if (game.inv[KIND_ORDER[i]] > 0) return KIND_ORDER[i];
		return null;
	}

	function allPieces() {
		return Object.assign({}, game.level.fixed, game.hinted, game.placed);
	}

	function makePiece(kind) {
		if (kind === 'mirror' || kind === 'splitter') return { type: kind, orient: 0 };
		return { type: 'filter', color: Number(kind.slice(6)) };
	}

	function snapshot() {
		game.history.push({ placed: JSON.stringify(game.placed), inv: JSON.stringify(game.inv) });
		if (game.history.length > 200) game.history.shift();
	}

	function isFixed(i) {
		return !!(game.level.fixed[i] || game.hinted[i]);
	}

	function canPlaceAt(i) {
		return i >= 0 && game.level.cells[i].kind === K.EMPTY && !isFixed(i) && !game.placed[i];
	}

	function act(fn) {
		if (game.solved) return;
		snapshot();
		fn();
		game.moves++;
		$('tip').classList.add('hidden');
		update();
	}

	function tapCell(i) {
		if (i < 0 || game.solved) return;
		var p = game.placed[i];
		if (p) {
			if (p.type === 'filter') return removeAt(i);
			act(function () {
				p.orient ^= 1;
			});
			sfx.rotate();
			return;
		}
		if (!canPlaceAt(i)) {
			if (isFixed(i)) sfx.deny();
			return;
		}
		var kind = game.selected && game.inv[game.selected] > 0 ? game.selected : firstAvailableKind();
		if (!kind) return sfx.deny();
		act(function () {
			game.placed[i] = makePiece(kind);
			game.inv[kind]--;
			if (game.inv[kind] === 0) game.selected = firstAvailableKind() || kind;
		});
		sfx.place();
	}

	function removeAt(i) {
		var p = game.placed[i];
		if (!p || game.solved) return;
		act(function () {
			game.inv[PR.pieceKey(p)]++;
			delete game.placed[i];
		});
		sfx.remove();
	}

	function moveTo(from, to) {
		if (from === to || !game.placed[from]) return;
		if (to < 0) return removeAt(from);
		if (!canPlaceAt(to)) return sfx.deny();
		act(function () {
			game.placed[to] = game.placed[from];
			delete game.placed[from];
		});
		sfx.place();
	}

	function undo() {
		if (!game || game.solved || !game.history.length) return;
		var h = game.history.pop();
		game.placed = JSON.parse(h.placed);
		game.inv = JSON.parse(h.inv);
		update();
	}

	function reset() {
		if (!game || game.solved) return;
		game.placed = {};
		game.inv = Object.assign({}, game.level.inventory);
		Object.keys(game.hinted).forEach(function (k) {
			game.inv[PR.pieceKey(game.hinted[k])]--;
		});
		game.moves = 0;
		game.history = [];
		update();
	}

	function hint() {
		if (!game || game.solved) return;
		var sol = game.level.solution;
		for (var k in sol) {
			var want = sol[k];
			var have = game.placed[k];
			if (game.hinted[k]) continue;
			if (have && PR.pieceKey(have) === PR.pieceKey(want) && (want.type === 'filter' || have.orient === want.orient)) continue;
			// Clear whatever is in the way, then lock in the correct piece.
			snapshot();
			if (have) {
				game.inv[PR.pieceKey(have)]++;
				delete game.placed[k];
			}
			var key = PR.pieceKey(want);
			if (game.inv[key] <= 0) {
				for (var j in game.placed) {
					if (PR.pieceKey(game.placed[j]) === key) {
						delete game.placed[j];
						game.inv[key]++;
						break;
					}
				}
			}
			game.inv[key]--;
			game.hinted[k] = Object.assign({ fixed: true }, want);
			game.assisted = true;
			update();
			return;
		}
	}

	function update(fresh) {
		game.result = PR.trace(game.level, allPieces());
		$('moves').textContent = game.moves;
		$('moves').parentElement.classList.toggle('over', game.moves > game.level.parMoves);
		renderTray();
		// Chime for receivers that just lit up.
		var lit = game.result.lit;
		if (!fresh)
			for (var t in lit)
				if (lit[t] && !game.litBefore[t]) {
					sfx.lit(game.level.cells[t].need);
					burst(Number(t), game.level.cells[t].need, 14);
				}
		game.litBefore = Object.assign({}, lit);
		if (game.result.solved && !fresh) onSolved();
		requestDraw();
	}

	function onSolved() {
		game.solved = true;
		var used = Object.keys(game.placed).length;
		var lean = !game.assisted && used <= game.level.parPieces;
		var sharp = !game.assisted && game.moves <= game.level.parMoves;
		var got = 1 | (lean ? 2 : 0) | (sharp ? 4 : 0);
		sfx.solve();
		for (var t in game.result.lit) burst(Number(t), game.level.cells[t].need, 40);

		var before = totalStars();
		if (game.ref.daily) {
			save.daily[game.ref.daily] = (save.daily[game.ref.daily] || 0) | got;
			unlock('daily-relay');
			if (dailyStreak() >= 3) unlock('streak-3');
		} else {
			var key = game.ref.ch + ':' + game.ref.li;
			var prev = save.levels[key] || { s: 0, best: null };
			save.levels[key] = { s: prev.s | got, best: prev.best === null ? game.moves : Math.min(prev.best, game.moves) };
		}
		unlock('first-light');
		if (!game.assisted && used < game.level.parPieces) unlock('lean');
		for (var c in game.level.cells) if (game.level.cells[c].kind === K.TARGET && game.level.cells[c].need === 7) unlock('white-light');
		for (var ch = 0; ch < CH.length; ch++) if (solvedIn(ch) === PER) unlock('chapter-' + (ch + 1));
		var perfect = 0;
		for (var k in save.levels) if (bits(save.levels[k].s) === 3) perfect++;
		if (perfect >= 10) unlock('perfect-ten');
		var total = totalStars();
		if (total === TOTAL_STARS) unlock('prismatic');
		persist();
		if (total > before) Galaxy.submitScore(total).catch(function (e) {
			console.warn(e);
		});

		setTimeout(function () {
			showWin(got, used);
		}, settings.reducedMotion ? 300 : 1100);
	}

	function dailyStreak() {
		var n = 0;
		var d = new Date();
		while (save.daily[dateKey(d)]) {
			n++;
			d.setDate(d.getDate() - 1);
		}
		return n;
	}

	function showWin(got, used) {
		var stars = '';
		for (var i = 0; i < 3; i++) stars += i < bits(got) ? '★' : '<span class="off">★</span>';
		$('win-stars').innerHTML = stars;
		var L = game.level;
		var rows = [
			[true, 'Relay complete'],
			[!!(got & 2), 'Lean — ' + used + ' piece' + (used === 1 ? '' : 's') + ' (par ' + L.parPieces + ')'],
			[!!(got & 4), 'Sharp — ' + game.moves + ' moves (par ' + L.parMoves + ')']
		];
		if (game.assisted) rows.push([false, 'Hint used — replay without one for more stars']);
		$('win-criteria').innerHTML = rows
			.map(function (r) {
				return '<li class="' + (r[0] ? 'got' : '') + '"><span>' + (r[0] ? '★' : '○') + '</span><span>' + r[1] + '</span></li>';
			})
			.join('');
		var next = nextAfter(game.ref);
		$('btn-win-next').textContent = next ? 'Next' : game.ref.daily ? 'Done' : 'Chapters';
		$('win').classList.remove('hidden');
		$('btn-win-next').focus();
	}

	function nextAfter(ref) {
		if (ref.daily) return null;
		if (ref.li + 1 < PER && levelUnlocked(ref.ch, ref.li + 1)) return { ch: ref.ch, li: ref.li + 1 };
		if (ref.ch + 1 < CH.length && chapterUnlocked(ref.ch + 1)) {
			for (var li = 0; li < PER; li++) if (!(levelBits(ref.ch + 1, li) & 1) && levelUnlocked(ref.ch + 1, li)) return { ch: ref.ch + 1, li: li };
		}
		for (var l2 = 0; l2 < PER; l2++) if (!(levelBits(ref.ch, l2) & 1) && levelUnlocked(ref.ch, l2)) return { ch: ref.ch, li: l2 };
		return null;
	}

	// ── Tray ──────────────────────────────────────────────────────────

	var trayIcons = {};
	function renderTray() {
		var tray = $('tray');
		if (!game) return;
		var kinds = KIND_ORDER.filter(function (k) {
			return game.level.inventory[k] > 0;
		});
		if (tray.dataset.kinds !== kinds.join(',')) {
			tray.innerHTML = '';
			tray.dataset.kinds = kinds.join(',');
			kinds.forEach(function (k, n) {
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'piece-btn';
				b.dataset.kind = k;
				var c = document.createElement('canvas');
				c.width = 80;
				c.height = 80;
				drawPiece(c.getContext('2d'), makePiece(k), 40, 40, 80, {});
				b.appendChild(c);
				b.insertAdjacentHTML('beforeend', '<span class="count"></span><span class="key">' + (n + 1) + '</span>');
				b.addEventListener('click', function () {
					game.selected = k;
					renderTray();
				});
				tray.appendChild(b);
				trayIcons[k] = b;
			});
			if (!kinds.length) tray.innerHTML = '<p class="tip" style="position:static;transform:none">No pieces needed — just look closely.</p>';
		}
		kinds.forEach(function (k) {
			var b = tray.querySelector('[data-kind="' + k + '"]');
			var n = game.inv[k] || 0;
			b.querySelector('.count').textContent = '×' + n;
			b.disabled = n <= 0;
			b.setAttribute('aria-pressed', String(game.selected === k));
			b.setAttribute('aria-label', KIND_LABEL[k] + ', ' + n + ' left');
		});
	}

	// ── Rendering ─────────────────────────────────────────────────────

	function resize() {
		var rect = canvas.getBoundingClientRect();
		view.dpr = Math.min(window.devicePixelRatio || 1, 2);
		view.w = rect.width;
		view.h = rect.height;
		canvas.width = Math.round(rect.width * view.dpr);
		canvas.height = Math.round(rect.height * view.dpr);
		if (game) {
			var L = game.level;
			var m = 14;
			view.cell = Math.max(18, Math.min(76, Math.floor(Math.min((view.w - m * 2) / L.w, (view.h - m * 2) / L.h))));
			view.ox = Math.round((view.w - view.cell * L.w) / 2);
			view.oy = Math.round((view.h - view.cell * L.h) / 2);
		}
		requestDraw();
	}

	function cellCenter(x, y) {
		return [view.ox + (x + 0.5) * view.cell, view.oy + (y + 0.5) * view.cell];
	}

	function cellAt(px, py) {
		var L = game.level;
		var x = Math.floor((px - view.ox) / view.cell);
		var y = Math.floor((py - view.oy) / view.cell);
		if (x < 0 || y < 0 || x >= L.w || y >= L.h) return -1;
		return y * L.w + x;
	}

	function roundRect(c, x, y, w, h, r) {
		c.beginPath();
		c.moveTo(x + r, y);
		c.arcTo(x + w, y, x + w, y + h, r);
		c.arcTo(x + w, y + h, x, y + h, r);
		c.arcTo(x, y + h, x, y, r);
		c.arcTo(x, y, x + w, y, r);
		c.closePath();
	}

	function drawPiece(c, p, cx, cy, s, opts) {
		c.save();
		c.lineCap = 'round';
		if (opts.alpha !== undefined) c.globalAlpha = opts.alpha;
		if (opts.fixed) {
			c.fillStyle = 'rgba(255,255,255,0.05)';
			roundRect(c, cx - s * 0.44, cy - s * 0.44, s * 0.88, s * 0.88, s * 0.14);
			c.fill();
			c.strokeStyle = 'rgba(255,255,255,0.18)';
			c.setLineDash([s * 0.06, s * 0.06]);
			c.lineWidth = 1;
			c.stroke();
			c.setLineDash([]);
		}
		var r = s * 0.34;
		if (p.type === 'mirror' || p.type === 'splitter') {
			// orient 0 = "/" (bottom-left to top-right), 1 = "\\".
			var sx = -1;
			var sy = p.orient === 0 ? 1 : -1;
			var x1 = cx + sx * r,
				y1 = cy + sy * r,
				x2 = cx - sx * r,
				y2 = cy - sy * r;
			var g = c.createLinearGradient(x1, y1, x2, y2);
			if (p.type === 'mirror') {
				g.addColorStop(0, '#9aa3c7');
				g.addColorStop(0.5, '#ffffff');
				g.addColorStop(1, '#9aa3c7');
				c.strokeStyle = 'rgba(200,210,255,0.25)';
				c.lineWidth = s * 0.2;
				c.beginPath();
				c.moveTo(x1, y1);
				c.lineTo(x2, y2);
				c.stroke();
				c.strokeStyle = g;
				c.lineWidth = s * 0.09;
				c.beginPath();
				c.moveTo(x1, y1);
				c.lineTo(x2, y2);
				c.stroke();
			} else {
				c.strokeStyle = 'rgba(200,180,255,0.35)';
				c.lineWidth = s * 0.16;
				c.beginPath();
				c.moveTo(x1, y1);
				c.lineTo(x2, y2);
				c.stroke();
				c.strokeStyle = '#e8dcff';
				c.lineWidth = s * 0.05;
				c.setLineDash([s * 0.08, s * 0.07]);
				c.beginPath();
				c.moveTo(x1, y1);
				c.lineTo(x2, y2);
				c.stroke();
				c.setLineDash([]);
				c.fillStyle = '#f5eeff';
				c.beginPath();
				c.moveTo(cx, cy - s * 0.1);
				c.lineTo(cx + s * 0.1, cy);
				c.lineTo(cx, cy + s * 0.1);
				c.lineTo(cx - s * 0.1, cy);
				c.closePath();
				c.fill();
			}
		} else if (p.type === 'filter') {
			var col = COLOR_CSS[p.color];
			c.fillStyle = col;
			c.globalAlpha *= 0.28;
			roundRect(c, cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, s * 0.1);
			c.fill();
			c.globalAlpha = opts.alpha !== undefined ? opts.alpha : 1;
			c.strokeStyle = col;
			c.lineWidth = Math.max(1.5, s * 0.05);
			c.stroke();
			c.fillStyle = col;
			c.font = '700 ' + Math.round(s * 0.26) + 'px system-ui, sans-serif';
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			c.fillText(COLOR_LETTER[p.color], cx, cy + 1);
		}
		c.restore();
	}

	function drawEmitter(c, cell, cx, cy, s) {
		var col = COLOR_CSS[cell.color];
		c.save();
		var g = c.createRadialGradient(cx, cy, 0, cx, cy, s * 0.6);
		g.addColorStop(0, col);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.globalAlpha = 0.35;
		c.fillStyle = g;
		c.fillRect(cx - s * 0.6, cy - s * 0.6, s * 1.2, s * 1.2);
		c.globalAlpha = 1;
		c.fillStyle = '#1b1438';
		c.strokeStyle = col;
		c.lineWidth = Math.max(2, s * 0.07);
		c.beginPath();
		c.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
		c.fill();
		c.stroke();
		// Nozzle pointing along the beam.
		var a = [0, Math.PI / 2, Math.PI, -Math.PI / 2][cell.dir];
		c.translate(cx, cy);
		c.rotate(a);
		c.fillStyle = col;
		c.fillRect(s * 0.22, -s * 0.09, s * 0.22, s * 0.18);
		c.beginPath();
		c.arc(0, 0, s * 0.12, 0, Math.PI * 2);
		c.fill();
		c.restore();
	}

	function drawTarget(c, cell, cx, cy, s, lit, got, t) {
		var col = COLOR_CSS[cell.need];
		c.save();
		var pulse = lit && !settings.reducedMotion ? 0.85 + 0.15 * Math.sin(t * 4) : 1;
		if (lit) {
			var g = c.createRadialGradient(cx, cy, 0, cx, cy, s * 0.75);
			g.addColorStop(0, col);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			c.globalAlpha = 0.55 * pulse;
			c.fillStyle = g;
			c.fillRect(cx - s * 0.75, cy - s * 0.75, s * 1.5, s * 1.5);
			c.globalAlpha = 1;
		}
		// Crystal (diamond).
		var r = s * 0.32;
		c.beginPath();
		c.moveTo(cx, cy - r);
		c.lineTo(cx + r, cy);
		c.lineTo(cx, cy + r);
		c.lineTo(cx - r, cy);
		c.closePath();
		c.fillStyle = lit ? col : 'rgba(20,14,44,0.95)';
		c.fill();
		c.lineWidth = Math.max(2, s * 0.07);
		c.strokeStyle = col;
		c.globalAlpha = lit ? 1 : 0.85;
		c.stroke();
		c.globalAlpha = 1;
		// Wrong light arriving: show what it's getting.
		if (!lit && got) {
			c.fillStyle = COLOR_CSS[got];
			c.beginPath();
			c.arc(cx, cy, s * 0.09, 0, Math.PI * 2);
			c.fill();
		}
		c.fillStyle = lit ? '#120c26' : col;
		c.font = '800 ' + Math.round(s * 0.2) + 'px system-ui, sans-serif';
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		if (lit || !got) c.fillText(COLOR_LETTER[cell.need], cx, cy + 1);
		c.restore();
	}

	function drawBeams(c, segs, t) {
		var s = view.cell;
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.lineCap = 'round';
		var passes = [
			[s * 0.34, 0.1],
			[s * 0.16, 0.28],
			[s * 0.06, 0.9]
		];
		for (var p = 0; p < passes.length; p++) {
			c.lineWidth = passes[p][0];
			for (var i = 0; i < segs.length; i++) {
				var sg = segs[i];
				var a = cellCenter(sg[0], sg[1]);
				var b = cellCenter(sg[2], sg[3]);
				c.strokeStyle = COLOR_CSS[sg[4]];
				c.globalAlpha = passes[p][1];
				c.beginPath();
				c.moveTo(a[0], a[1]);
				c.lineTo(b[0], b[1]);
				c.stroke();
			}
		}
		if (!settings.reducedMotion) {
			c.lineWidth = s * 0.05;
			c.setLineDash([s * 0.12, s * 0.5]);
			c.lineDashOffset = -t * s * 2.2;
			c.strokeStyle = '#ffffff';
			c.globalAlpha = 0.55;
			for (var j = 0; j < segs.length; j++) {
				var q = segs[j];
				var a2 = cellCenter(q[0], q[1]);
				var b2 = cellCenter(q[2], q[3]);
				c.beginPath();
				c.moveTo(a2[0], a2[1]);
				c.lineTo(b2[0], b2[1]);
				c.stroke();
			}
		}
		c.restore();
	}

	function burst(idx, color, n) {
		if (settings.reducedMotion) return;
		var L = game.level;
		var p = cellCenter(idx % L.w, Math.floor(idx / L.w));
		for (var i = 0; i < n; i++) {
			var a = Math.random() * Math.PI * 2;
			var sp = 40 + Math.random() * 160;
			particles.push({ x: p[0], y: p[1], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6 + Math.random() * 0.6, age: 0, color: COLOR_CSS[color] });
		}
	}

	var lastT = 0;
	var dirty = true;
	function requestDraw() {
		dirty = true;
		if (!rafId && !$('screen-play').classList.contains('hidden')) startLoop();
	}
	function startLoop() {
		if (rafId) return;
		lastT = performance.now();
		rafId = requestAnimationFrame(frame);
	}
	function stopLoop() {
		cancelAnimationFrame(rafId);
		rafId = 0;
	}

	function frame(now) {
		rafId = 0;
		var dt = Math.min(0.05, (now - lastT) / 1000);
		lastT = now;
		// Keep animating for the shimmer and particles, but not behind the win card.
		var modalOpen = !$('win').classList.contains('hidden');
		var animate = (!settings.reducedMotion && !modalOpen) || particles.length;
		if (dirty || animate) draw(now / 1000, dt);
		dirty = false;
		if (animate) rafId = requestAnimationFrame(frame);
	}

	function draw(t, dt) {
		if (!game) return;
		var L = game.level;
		var s = view.cell;
		var c = ctx;
		c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
		c.clearRect(0, 0, view.w, view.h);

		// Board
		c.fillStyle = 'rgba(18, 12, 44, 0.85)';
		roundRect(c, view.ox - 8, view.oy - 8, s * L.w + 16, s * L.h + 16, 16);
		c.fill();
		c.strokeStyle = 'rgba(190,160,255,0.2)';
		c.lineWidth = 1;
		c.stroke();

		var pieces = allPieces();
		for (var y = 0; y < L.h; y++) {
			for (var x = 0; x < L.w; x++) {
				var i = y * L.w + x;
				var cell = L.cells[i];
				var px = view.ox + x * s,
					py = view.oy + y * s;
				if (cell.kind === K.WALL) {
					c.fillStyle = '#05030f';
					roundRect(c, px + 2, py + 2, s - 4, s - 4, s * 0.16);
					c.fill();
					c.strokeStyle = 'rgba(255,255,255,0.06)';
					c.stroke();
				} else {
					c.fillStyle = i === hover && canPlaceAt(i) ? 'rgba(211,139,255,0.12)' : 'rgba(255,255,255,0.028)';
					roundRect(c, px + 2, py + 2, s - 4, s - 4, s * 0.16);
					c.fill();
				}
			}
		}

		drawBeams(c, game.result.segments, t);

		for (var j = 0; j < L.cells.length; j++) {
			var cl = L.cells[j];
			var cc = cellCenter(j % L.w, Math.floor(j / L.w));
			if (cl.kind === K.EMITTER) drawEmitter(c, cl, cc[0], cc[1], s);
			else if (cl.kind === K.TARGET) drawTarget(c, cl, cc[0], cc[1], s, game.result.lit[j], game.result.received[j] || 0, t);
			else if (pieces[j] && !(pointer && pointer.dragging && pointer.cell === j)) drawPiece(c, pieces[j], cc[0], cc[1], s, { fixed: isFixed(j) });
		}

		if (game.cursor >= 0) {
			var cx = view.ox + (game.cursor % L.w) * s,
				cy = view.oy + Math.floor(game.cursor / L.w) * s;
			c.strokeStyle = '#8fb3ff';
			c.lineWidth = 2;
			c.setLineDash([5, 4]);
			roundRect(c, cx + 3, cy + 3, s - 6, s - 6, s * 0.16);
			c.stroke();
			c.setLineDash([]);
		}

		if (pointer && pointer.dragging && game.placed[pointer.cell]) {
			drawPiece(c, game.placed[pointer.cell], pointer.x, pointer.y, s * 1.1, { alpha: 0.85 });
		}

		// Particles
		if (particles.length) {
			c.save();
			c.globalCompositeOperation = 'lighter';
			for (var k = particles.length - 1; k >= 0; k--) {
				var p = particles[k];
				p.age += dt;
				if (p.age >= p.life) {
					particles.splice(k, 1);
					continue;
				}
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.vx *= 0.96;
				p.vy *= 0.96;
				c.globalAlpha = 1 - p.age / p.life;
				c.fillStyle = p.color;
				c.beginPath();
				c.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
				c.fill();
			}
			c.restore();
		}
	}

	// ── Input ─────────────────────────────────────────────────────────

	function local(e) {
		var r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	}

	canvas.addEventListener('pointerdown', function (e) {
		if (!game || game.solved) return;
		var pt = local(e);
		var i = cellAt(pt[0], pt[1]);
		canvas.setPointerCapture(e.pointerId);
		pointer = { id: e.pointerId, sx: pt[0], sy: pt[1], x: pt[0], y: pt[1], cell: i, dragging: false, longTimer: 0, consumed: false };
		if (i >= 0 && game.placed[i]) {
			pointer.longTimer = setTimeout(function () {
				if (pointer && !pointer.dragging) {
					pointer.consumed = true;
					removeAt(i);
				}
			}, 480);
		}
	});

	canvas.addEventListener('pointermove', function (e) {
		var pt = local(e);
		if (!pointer) {
			if (game && e.pointerType === 'mouse') {
				var h = cellAt(pt[0], pt[1]);
				if (h !== hover) {
					hover = h;
					requestDraw();
				}
			}
			return;
		}
		pointer.x = pt[0];
		pointer.y = pt[1];
		if (!pointer.dragging && game.placed[pointer.cell] && Math.hypot(pt[0] - pointer.sx, pt[1] - pointer.sy) > 8) {
			pointer.dragging = true;
			clearTimeout(pointer.longTimer);
		}
		if (pointer.dragging) requestDraw();
	});

	function endPointer(e, cancelled) {
		if (!pointer || pointer.id !== e.pointerId) return;
		var p = pointer;
		pointer = null;
		clearTimeout(p.longTimer);
		if (cancelled || p.consumed) return requestDraw();
		var pt = local(e);
		if (p.dragging) moveTo(p.cell, cellAt(pt[0], pt[1]));
		else tapCell(p.cell);
		requestDraw();
	}
	canvas.addEventListener('pointerup', function (e) {
		endPointer(e, false);
	});
	canvas.addEventListener('pointercancel', function (e) {
		endPointer(e, true);
	});
	canvas.addEventListener('pointerleave', function () {
		hover = -1;
		requestDraw();
	});
	canvas.addEventListener('contextmenu', function (e) {
		e.preventDefault();
		if (!game) return;
		var pt = local(e);
		removeAt(cellAt(pt[0], pt[1]));
	});

	window.addEventListener('keydown', function (e) {
		if (!$('win').classList.contains('hidden')) {
			if (e.key === 'Enter') $('btn-win-next').click();
			return;
		}
		if ($('screen-play').classList.contains('hidden') || !game) {
			if (e.key === 'Escape' && !$('screen-chapters').classList.contains('hidden')) show('screen-title');
			return;
		}
		var L = game.level;
		var move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
		if (move) {
			e.preventDefault();
			if (game.cursor < 0) game.cursor = Math.floor(L.h / 2) * L.w + Math.floor(L.w / 2);
			else {
				var x = Math.max(0, Math.min(L.w - 1, (game.cursor % L.w) + move[0]));
				var y = Math.max(0, Math.min(L.h - 1, Math.floor(game.cursor / L.w) + move[1]));
				game.cursor = y * L.w + x;
			}
			requestDraw();
		} else if ((e.key === 'Enter' || e.key === ' ') && game.cursor >= 0) {
			e.preventDefault();
			tapCell(game.cursor);
		} else if ((e.key === 'Delete' || e.key === 'Backspace') && game.cursor >= 0) removeAt(game.cursor);
		else if (e.key === 'z' || e.key === 'Z') undo();
		else if (e.key === 'r' || e.key === 'R') reset();
		else if (e.key === 'Escape') leavePlay();
		else if (/^[1-5]$/.test(e.key)) {
			var kinds = KIND_ORDER.filter(function (k) {
				return game.level.inventory[k] > 0;
			});
			var k = kinds[Number(e.key) - 1];
			if (k) {
				game.selected = k;
				renderTray();
			}
		}
	});

	function leavePlay() {
		$('win').classList.add('hidden');
		if (game && game.ref.daily) {
			refreshTitle();
			show('screen-title');
		} else {
			renderChapters();
			show('screen-chapters');
		}
	}

	// ── Wiring ────────────────────────────────────────────────────────

	$('btn-continue').addEventListener('click', function () {
		startLevel(nextOpenLevel());
	});
	$('btn-chapters').addEventListener('click', function () {
		renderChapters();
		show('screen-chapters');
	});
	$('btn-daily').addEventListener('click', function () {
		startLevel({ daily: dateKey() });
	});
	$('btn-chapters-back').addEventListener('click', function () {
		refreshTitle();
		show('screen-title');
	});
	$('btn-play-back').addEventListener('click', leavePlay);
	$('btn-undo').addEventListener('click', undo);
	$('btn-reset').addEventListener('click', reset);
	$('btn-hint').addEventListener('click', hint);
	$('btn-win-replay').addEventListener('click', function () {
		startLevel(game.ref);
	});
	$('btn-win-next').addEventListener('click', function () {
		var next = nextAfter(game.ref);
		if (next) startLevel(next);
		else leavePlay();
	});
	window.addEventListener('resize', resize);

	Galaxy.on('settings', function (s) {
		settings = s;
		requestDraw();
	});

	Galaxy.ready()
		.then(function (info) {
			settings = info.settings || settings;
			$('greeting').textContent = info.player.guest ? 'Violet Veil relay station' : 'Welcome back, ' + info.player.name;
			return Galaxy.load();
		})
		.then(function (data) {
			if (data && data.v === 1) {
				save.levels = data.levels || {};
				save.daily = data.daily || {};
				save.ach = data.ach || {};
				save.last = data.last || null;
			}
			refreshTitle();
		})
		.catch(function (e) {
			console.warn(e);
			refreshTitle();
		});
	refreshTitle();

	// Exposed for automated tests.
	window.PrismRelay.debug = {
		state: function () {
			return game;
		},
		start: startLevel,
		tap: tapCell,
		save: function () {
			return save;
		}
	};
})(window.PrismRelay);
