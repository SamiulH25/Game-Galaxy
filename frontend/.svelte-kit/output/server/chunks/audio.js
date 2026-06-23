//#region src/lib/audio.ts
/**
* Centralized audio system for Game Galaxy.
* Uses Web Audio API synthesis — no audio files needed.
* Call `initAudio()` on first user interaction, then `play(name)` anywhere.
*/
var ctx = null;
var masterGain = null;
var enabled = true;
/** Initialise audio context (must be called from a user gesture). */
function initAudio() {
	if (ctx) return;
	ctx = new AudioContext();
	masterGain = ctx.createGain();
	masterGain.gain.value = .35;
	masterGain.connect(ctx.destination);
}
/** Set master volume (0–100). Clamped, converted to 0–1 gain. */
function setVolume(percent) {
	const clamped = Math.max(0, Math.min(100, percent));
	if (masterGain) masterGain.gain.value = clamped / 100 * .5;
}
/** Play a named sound effect. Safe to call before initAudio() — no-ops if uninitialised. */
function play(name) {
	if (!enabled || !ctx || !masterGain) return;
	try {
		switch (name) {
			case "click": return click(ctx, masterGain);
			case "hover": return hover(ctx, masterGain);
			case "select": return select(ctx, masterGain);
			case "confirm": return confirm(ctx, masterGain);
			case "cancel": return cancel(ctx, masterGain);
			case "success": return success(ctx, masterGain);
			case "error": return error(ctx, masterGain);
			case "whoosh": return whoosh(ctx, masterGain);
			case "chime": return chime(ctx, masterGain);
			case "pop": return pop(ctx, masterGain);
			case "pageEnter": return pageEnter(ctx, masterGain);
			case "pageLeave": return pageLeave(ctx, masterGain);
			case "doorOpen": return doorOpen(ctx, masterGain);
			case "doorClose": return doorClose(ctx, masterGain);
			case "powerup": return powerup(ctx, masterGain);
			case "notification": return notification(ctx, masterGain);
		}
	} catch {}
}
/** Short soft click. */
function click(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.value = 800;
	g.gain.setValueAtTime(.08, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .04);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .05);
}
/** Subtle hover tick. */
function hover(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.value = 1200;
	g.gain.setValueAtTime(.03, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .02);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .025);
}
/** Positive selection — two-tone rising. */
function select(c, dest) {
	[600, 900].forEach((f, i) => {
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(.07, c.currentTime + i * .06);
		g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .06 + .08);
		o.connect(g).connect(dest);
		o.start(c.currentTime + i * .06);
		o.stop(c.currentTime + i * .06 + .1);
	});
}
/** Confirmation chime — three bright notes. */
function confirm(c, dest) {
	[
		523,
		659,
		784
	].forEach((f, i) => {
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(.1, c.currentTime + i * .1);
		g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .1 + .2);
		o.connect(g).connect(dest);
		o.start(c.currentTime + i * .1);
		o.stop(c.currentTime + i * .1 + .25);
	});
}
/** Cancel / close — descending two-tone. */
function cancel(c, dest) {
	[500, 350].forEach((f, i) => {
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(.06, c.currentTime + i * .08);
		g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .08 + .1);
		o.connect(g).connect(dest);
		o.start(c.currentTime + i * .08);
		o.stop(c.currentTime + i * .08 + .12);
	});
}
/** Success jingle. */
function success(c, dest) {
	[
		523,
		659,
		784,
		1047
	].forEach((f, i) => {
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(.12, c.currentTime + i * .08);
		g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .08 + .25);
		o.connect(g).connect(dest);
		o.start(c.currentTime + i * .08);
		o.stop(c.currentTime + i * .08 + .3);
	});
}
/** Error buzz. */
function error(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sawtooth";
	o.frequency.value = 180;
	g.gain.setValueAtTime(.1, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .25);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .3);
}
/** Whoosh — filtered noise sweep. */
function whoosh(c, dest) {
	const bufferSize = ctx.sampleRate * .3;
	const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
	const src = c.createBufferSource();
	src.buffer = buffer;
	const filter = c.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(200, c.currentTime);
	filter.frequency.exponentialRampToValueAtTime(2e3, c.currentTime + .25);
	const g = c.createGain();
	g.gain.setValueAtTime(.08, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .3);
	src.connect(filter).connect(g).connect(dest);
	src.start();
	src.stop(c.currentTime + .35);
}
/** Gentle chime — for notifications. */
function chime(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.value = 880;
	g.gain.setValueAtTime(.08, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .4);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .45);
}
/** Pop — short bubble. */
function pop(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.setValueAtTime(600, c.currentTime);
	o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + .05);
	g.gain.setValueAtTime(.08, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .06);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .07);
}
/** Page enter — soft rising pad. */
function pageEnter(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.setValueAtTime(220, c.currentTime);
	o.frequency.exponentialRampToValueAtTime(330, c.currentTime + .3);
	g.gain.setValueAtTime(.05, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .5);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .55);
}
/** Page leave — soft descending. */
function pageLeave(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "sine";
	o.frequency.setValueAtTime(330, c.currentTime);
	o.frequency.exponentialRampToValueAtTime(200, c.currentTime + .25);
	g.gain.setValueAtTime(.04, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .35);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .4);
}
/** Door open — resonant sweep. */
function doorOpen(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "triangle";
	o.frequency.setValueAtTime(300, c.currentTime);
	o.frequency.exponentialRampToValueAtTime(600, c.currentTime + .2);
	g.gain.setValueAtTime(.06, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .3);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .35);
}
/** Door close — thud. */
function doorClose(c, dest) {
	const o = c.createOscillator();
	const g = c.createGain();
	o.type = "triangle";
	o.frequency.setValueAtTime(200, c.currentTime);
	o.frequency.exponentialRampToValueAtTime(80, c.currentTime + .12);
	g.gain.setValueAtTime(.1, c.currentTime);
	g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .15);
	o.connect(g).connect(dest);
	o.start();
	o.stop(c.currentTime + .18);
}
/** Power-up arpeggio. */
function powerup(c, dest) {
	[
		440,
		554,
		659,
		880
	].forEach((f, i) => {
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(.08, c.currentTime + i * .05);
		g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .05 + .12);
		o.connect(g).connect(dest);
		o.start(c.currentTime + i * .05);
		o.stop(c.currentTime + i * .05 + .15);
	});
}
/** Notification ping. */
function notification(c, dest) {
	[1e3, 1300].forEach((f, i) => {
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = "sine";
		o.frequency.value = f;
		g.gain.setValueAtTime(.06, c.currentTime + i * .1);
		g.gain.exponentialRampToValueAtTime(.001, c.currentTime + i * .1 + .15);
		o.connect(g).connect(dest);
		o.start(c.currentTime + i * .1);
		o.stop(c.currentTime + i * .1 + .18);
	});
}
//#endregion
export { play as n, setVolume as r, initAudio as t };
