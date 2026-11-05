/* Starter game: shows every part of the Galaxy SDK. Replace freely. */
(function () {
	'use strict';

	var ROUND_SECONDS = 30;
	var canvas = document.getElementById('field');
	var ctx = canvas.getContext('2d');
	var $ = function (id) { return document.getElementById(id); };

	// Progress that survives between sessions (stored by Galaxy).
	var progress = { best: 0, runs: 0 };
	var settings = { muted: false, reducedMotion: false };

	var state = 'menu'; // menu | playing | paused
	var score = 0;
	var timeLeft = ROUND_SECONDS;
	var pulses = [];
	var spawnIn = 0;
	var last = 0;
	var dpr = 1;
	var dirty = true;

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = innerWidth * dpr;
		canvas.height = innerHeight * dpr;
		dirty = true;
	}

	// Tiny Web Audio blip; respects the player's mute setting.
	var audio = null;
	function blip(freq) {
		if (settings.muted) return;
		try {
			audio = audio || new (window.AudioContext || window.webkitAudioContext)();
			var osc = audio.createOscillator();
			var gain = audio.createGain();
			osc.frequency.value = freq;
			gain.gain.setValueAtTime(0.12, audio.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
			osc.connect(gain).connect(audio.destination);
			osc.start();
			osc.stop(audio.currentTime + 0.16);
		} catch (e) {}
	}

	function showOverlay(eyebrow, message, button) {
		$('greeting').textContent = eyebrow;
		$('message').textContent = message;
		$('start').textContent = button;
		$('overlay').classList.remove('hidden');
		$('start').focus();
	}

	function updateHud() {
		$('score').textContent = score;
		$('time').textContent = Math.ceil(timeLeft);
		$('best').textContent = progress.best ? progress.best : '—';
	}

	function start() {
		score = 0;
		timeLeft = ROUND_SECONDS;
		pulses = [];
		spawnIn = 0;
		state = 'playing';
		$('overlay').classList.add('hidden');
		updateHud();
	}

	function pause() {
		if (state !== 'playing') return;
		state = 'paused';
		showOverlay('Paused', 'Take a breath.', 'Resume');
	}

	function finish() {
		state = 'menu';
		pulses = [];
		dirty = true;
		progress.runs += 1;
		var newBest = score > progress.best;
		if (newBest) progress.best = score;
		updateHud();

		// Save progress, post the score and unlock achievements. All return promises;
		// failures (e.g. offline) are reported but never break the game.
		Galaxy.save(progress).catch(console.warn);
		Galaxy.submitScore(score).catch(console.warn);
		Galaxy.unlock('first-run').catch(console.warn);
		if (score >= 25) Galaxy.unlock('pulse-25').catch(console.warn);
		if (score >= 40) Galaxy.unlock('pulse-40').catch(console.warn);

		showOverlay(newBest ? 'New best!' : 'Time', 'You caught ' + score + ' pulses.', 'Play again');
	}

	function spawn() {
		var margin = 60 * dpr;
		pulses.push({
			x: margin + Math.random() * (canvas.width - margin * 2),
			y: margin * 1.6 + Math.random() * (canvas.height - margin * 2.6),
			r: (26 + Math.random() * 14) * dpr,
			life: 1.6,
			age: 0
		});
	}

	function hit(clientX, clientY) {
		if (state !== 'playing') return;
		var x = clientX * dpr;
		var y = clientY * dpr;
		for (var i = pulses.length - 1; i >= 0; i--) {
			var p = pulses[i];
			if (Math.hypot(p.x - x, p.y - y) <= p.r * 1.2) {
				pulses.splice(i, 1);
				score += 1;
				blip(520 + score * 12);
				updateHud();
				return;
			}
		}
	}

	function frame(t) {
		var dt = Math.min(0.05, (t - last) / 1000 || 0);
		last = t;

		if (state === 'playing') {
			timeLeft -= dt;
			spawnIn -= dt;
			if (spawnIn <= 0) {
				spawn();
				spawnIn = Math.max(0.35, 0.8 - (ROUND_SECONDS - timeLeft) * 0.012);
			}
			for (var i = pulses.length - 1; i >= 0; i--) {
				pulses[i].age += dt;
				if (pulses[i].age >= pulses[i].life) pulses.splice(i, 1);
			}
			if (timeLeft <= 0) {
				timeLeft = 0;
				finish();
			}
			updateHud();
		}

		// Nothing moving (menu/pause with an empty field)? Skip the redraw.
		if (state !== 'playing' && !dirty) {
			requestAnimationFrame(frame);
			return;
		}
		dirty = false;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (var j = 0; j < pulses.length; j++) {
			var p = pulses[j];
			var k = p.age / p.life;
			var r = p.r * (settings.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(k * Math.PI));
			var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.8);
			g.addColorStop(0, 'rgba(180, 225, 255,' + (1 - k) + ')');
			g.addColorStop(0.45, 'rgba(124, 196, 255,' + 0.6 * (1 - k) + ')');
			g.addColorStop(1, 'rgba(124, 196, 255, 0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
			ctx.fill();
		}
		requestAnimationFrame(frame);
	}

	// ── Wire up input ─────────────────────────────────────────────
	canvas.addEventListener('pointerdown', function (e) { hit(e.clientX, e.clientY); });
	$('start').addEventListener('click', function () {
		if (state === 'paused') {
			state = 'playing';
			$('overlay').classList.add('hidden');
		} else start();
	});
	window.addEventListener('keydown', function (e) {
		if (e.key === 'p' || e.key === 'Escape') state === 'paused' ? $('start').click() : pause();
	});
	window.addEventListener('resize', resize);

	// The player pauses games when the tab is hidden or a menu opens.
	Galaxy.on('pause', pause);
	Galaxy.on('settings', function (s) { settings = s; });

	// ── Boot ──────────────────────────────────────────────────────
	resize();
	requestAnimationFrame(frame);
	Galaxy.ready()
		.then(function (info) {
			settings = info.settings;
			$('greeting').textContent = info.player.guest ? 'Playing as guest' : 'Welcome back, ' + info.player.name;
			return Galaxy.load();
		})
		.then(function (saved) {
			if (saved && typeof saved === 'object') {
				progress.best = saved.best || 0;
				progress.runs = saved.runs || 0;
			}
			updateHud();
		})
		.catch(console.warn);
})();
