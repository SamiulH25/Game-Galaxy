import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { Catalog, PlanetKind } from '$lib/types';
import { hashString, mulberry32 } from '$lib/random';
import { layoutGalaxy, orbitPosition, type GalaxyLayout, type PlanetLayout, type SystemLayout } from './layout';
import * as S from './shaders';

export type View = { kind: 'galaxy' } | { kind: 'system'; systemId: string } | { kind: 'planet'; gameId: string };
export type PickTarget = { kind: 'system'; id: string } | { kind: 'planet'; id: string } | { kind: 'empty' };

export interface SceneOptions {
	reducedMotion: boolean;
	quality: 'high' | 'low';
	onPick: (target: PickTarget) => void;
	onHover?: (target: PickTarget | null) => void;
}

const KIND_INDEX: Record<PlanetKind, number> = { terran: 0, rocky: 1, gas: 2, ice: 3, lava: 4, ocean: 5 };

interface Frame {
	pos: THREE.Vector3;
	target: THREE.Vector3;
}

interface PlanetNode {
	layout: PlanetLayout;
	system: SystemNode;
	pivot: THREE.Group;
	body: THREE.Mesh;
	material: THREE.ShaderMaterial;
	ringMaterial: THREE.ShaderMaterial | null;
	moons: { mesh: THREE.Mesh; distance: number; speed: number; phase: number; tilt: number }[];
	orbit: THREE.LineLoop;
	orbitMaterial: THREE.LineBasicMaterial;
	label: HTMLButtonElement;
	world: THREE.Vector3;
	highlight: number;
	highlightTarget: number;
}

interface SystemNode {
	layout: SystemLayout;
	group: THREE.Group;
	starMaterial: THREE.ShaderMaterial;
	glowMaterial: THREE.ShaderMaterial;
	pick: THREE.Mesh;
	planets: PlanetNode[];
	label: HTMLButtonElement;
	world: THREE.Vector3;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The 3D galaxy. Owns a WebGL canvas inside `container` and positions HTML label buttons inside `labels`.
 * The UI drives it with setView(); it reports clicks through onPick().
 */
export class GalaxyScene {
	private renderer: THREE.WebGLRenderer;
	private composer: EffectComposer | null = null;
	private bloom: UnrealBloomPass | null = null;
	private scene = new THREE.Scene();
	private camera: THREE.PerspectiveCamera;
	private controls: OrbitControls;
	private layout: GalaxyLayout;
	private systems: SystemNode[] = [];
	private planets = new Map<string, PlanetNode>();
	private pickables: THREE.Object3D[] = [];
	private animated: THREE.ShaderMaterial[] = [];
	private pointsMaterials: THREE.ShaderMaterial[] = [];
	private raycaster = new THREE.Raycaster();
	private pointer = new THREE.Vector2();

	private view: View = { kind: 'galaxy' };
	private flight: { from: Frame; to: () => Frame; t: number; duration: number } | null = null;
	private follow: PlanetNode | null = null;
	private followLast = new THREE.Vector3();
	private insets = { right: 0, bottom: 0 };
	private width = 1;
	private height = 1;
	private simTime = 0;
	private clockTime = 0;
	private last = performance.now();
	private frameHandle = 0;
	private destroyed = false;
	private hovered: PickTarget | null = null;
	private down: { x: number; y: number; t: number } | null = null;
	private resizeObserver: ResizeObserver;
	private tmp = new THREE.Vector3();

	constructor(
		private container: HTMLElement,
		private labelLayer: HTMLElement,
		catalog: Catalog,
		private opts: SceneOptions
	) {
		this.renderer = new THREE.WebGLRenderer({ antialias: opts.quality === 'high', powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.quality === 'high' ? 2 : 1.25));
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.domElement.className = 'galaxy-canvas';
		container.appendChild(this.renderer.domElement);

		this.layout = layoutGalaxy(catalog);
		this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 6000);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.enablePan = false;
		this.controls.rotateSpeed = 0.55;
		this.controls.zoomSpeed = 0.8;
		this.controls.maxPolarAngle = Math.PI * 0.82;
		this.controls.autoRotateSpeed = 0.25;

		this.buildSky();
		this.buildDisc();
		this.buildSystems();

		if (opts.quality === 'high') {
			this.composer = new EffectComposer(this.renderer);
			this.composer.addPass(new RenderPass(this.scene, this.camera));
			this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.78);
			this.composer.addPass(this.bloom);
			this.composer.addPass(new OutputPass());
		}

		const el = this.renderer.domElement;
		el.addEventListener('pointerdown', this.onPointerDown);
		el.addEventListener('pointerup', this.onPointerUp);
		el.addEventListener('pointermove', this.onPointerMove);
		el.addEventListener('pointerleave', this.onPointerLeave);
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(container);
		this.resize();

		// Start far out and drift in (unless motion is reduced).
		const home = this.galaxyFrame();
		if (opts.reducedMotion) this.applyFrame(home);
		else {
			this.applyFrame({ pos: home.pos.clone().multiplyScalar(2.6).add(new THREE.Vector3(0, 80, 0)), target: home.target.clone() });
			this.flyTo(() => home, 3.2);
		}
		this.applyViewState();
		this.frameHandle = requestAnimationFrame(this.tick);
	}

	// ── Public API ────────────────────────────────────────────────────

	setView(view: View, options: { instant?: boolean } = {}): void {
		if (view.kind === 'planet' && !this.planets.has(view.gameId)) view = { kind: 'galaxy' };
		if (view.kind === 'system') {
			const id = view.systemId;
			if (!this.systems.some((s) => s.layout.system.id === id)) view = { kind: 'galaxy' };
		}
		const same = JSON.stringify(view) === JSON.stringify(this.view);
		this.view = view;
		this.applyViewState();
		if (same && !options.instant) return;
		this.follow = null;

		const instant = options.instant || this.opts.reducedMotion;
		if (view.kind === 'galaxy') this.flyTo(() => this.galaxyFrame(), instant ? 0 : 2.0);
		else if (view.kind === 'system') this.flyTo(() => this.systemFrame(this.systemById(view.systemId)!), instant ? 0 : 1.8);
		else {
			const p = this.planets.get(view.gameId)!;
			this.flyTo(() => this.planetFrame(p), instant ? 0 : 1.6, p);
		}
	}

	/** Reserve screen space (px) covered by UI panels so the subject stays centred in the visible area. */
	setInsets(insets: { right: number; bottom: number }): void {
		this.insets = insets;
		this.updateViewOffset();
	}

	setReducedMotion(reduced: boolean): void {
		this.opts.reducedMotion = reduced;
		this.applyViewState();
	}

	/** Highlight a planet (e.g. when its card is hovered in a list). */
	highlight(gameId: string | null): void {
		for (const p of this.planets.values()) p.highlightTarget = p.layout.game.id === gameId ? 1 : 0;
	}

	destroy(): void {
		this.destroyed = true;
		cancelAnimationFrame(this.frameHandle);
		this.resizeObserver.disconnect();
		const el = this.renderer.domElement;
		el.removeEventListener('pointerdown', this.onPointerDown);
		el.removeEventListener('pointerup', this.onPointerUp);
		el.removeEventListener('pointermove', this.onPointerMove);
		el.removeEventListener('pointerleave', this.onPointerLeave);
		this.controls.dispose();
		this.scene.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			mesh.geometry?.dispose();
			const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
			if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
			else mat?.dispose();
		});
		this.composer?.dispose();
		this.renderer.dispose();
		el.remove();
		this.labelLayer.replaceChildren();
	}

	// ── Building ──────────────────────────────────────────────────────

	private buildSky() {
		const sky = new THREE.Mesh(
			new THREE.SphereGeometry(3000, 48, 24),
			new THREE.ShaderMaterial({
				vertexShader: S.SKY_VERTEX,
				fragmentShader: S.SKY_FRAGMENT,
				side: THREE.BackSide,
				depthWrite: false,
				uniforms: {
					uA: { value: new THREE.Color('#3a4cff') },
					uB: { value: new THREE.Color('#b24bff') },
					uC: { value: new THREE.Color('#2fd6c9') }
				}
			})
		);
		sky.renderOrder = -10;
		this.scene.add(sky);

		// Distant background stars.
		const n = this.opts.quality === 'high' ? 6000 : 2500;
		const rand = mulberry32(7);
		const pos = new Float32Array(n * 3);
		const col = new Float32Array(n * 3);
		const size = new Float32Array(n);
		const tw = new Float32Array(n);
		const c = new THREE.Color();
		for (let i = 0; i < n; i++) {
			const u = rand() * 2 - 1;
			const th = rand() * Math.PI * 2;
			const r = 1400 + rand() * 900;
			const s = Math.sqrt(1 - u * u);
			pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3);
			c.setHSL(rand() < 0.7 ? 0.6 : 0.1, 0.5, 0.75 + rand() * 0.25);
			col.set([c.r, c.g, c.b], i * 3);
			size[i] = 1.2 + Math.pow(rand(), 6) * 5;
			tw[i] = rand();
		}
		this.scene.add(this.makePoints(pos, col, size, tw, 1400, 0.9, 6));
	}

	private buildDisc() {
		const R = this.layout.radius;
		const n = this.opts.quality === 'high' ? 70000 : 22000;
		const rand = mulberry32(42);
		const gauss = () => {
			let u = 0;
			for (let i = 0; i < 4; i++) u += rand();
			return (u - 2) / 0.58;
		};
		const pos = new Float32Array(n * 3);
		const col = new Float32Array(n * 3);
		const size = new Float32Array(n);
		const tw = new Float32Array(n);
		const core = new THREE.Color('#ffe2b0');
		const armA = new THREE.Color('#6f93ff');
		const armB = new THREE.Color('#b77dff');
		const hii = new THREE.Color('#ff7ab8');
		const c = new THREE.Color();
		for (let i = 0; i < n; i++) {
			let x: number, y: number, z: number;
			const bulge = rand() < 0.16;
			let t: number;
			if (bulge) {
				const s = R * 0.09;
				x = gauss() * s;
				y = gauss() * s * 0.5;
				z = gauss() * s;
				t = Math.min(1, Math.hypot(x, z) / R);
				c.copy(core).lerp(armA, t * 1.5);
			} else {
				const arm = i % 2;
				const r = R * 0.06 + Math.pow(rand(), 1.15) * R;
				const a = arm * Math.PI + r * 0.035 + 0.5;
				const spread = 2.5 + r * 0.11;
				x = Math.cos(a) * r + gauss() * spread;
				z = Math.sin(a) * r + gauss() * spread;
				t = r / R;
				y = gauss() * (0.6 + 2.2 * (1 - t));
				c.copy(core).lerp(rand() < 0.5 ? armA : armB, Math.min(1, t * 1.6));
				if (rand() < 0.015) c.copy(hii);
			}
			c.multiplyScalar(0.55 + rand() * 0.6);
			pos.set([x, y, z], i * 3);
			col.set([c.r, c.g, c.b], i * 3);
			size[i] = (bulge ? 1.6 : 1.0) * (0.6 + Math.pow(rand(), 3) * 3.2);
			tw[i] = rand();
		}
		this.scene.add(this.makePoints(pos, col, size, tw, 200, 0.85, 9));

		const coreGlow = this.makeGlow(new THREE.Color('#ffcf8a'), R * 0.42, 0.4);
		coreGlow.renderOrder = -5;
		this.scene.add(coreGlow);
	}

	private makePoints(pos: Float32Array, col: Float32Array, size: Float32Array, tw: Float32Array, scale: number, opacity: number, maxSize: number) {
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('color', new THREE.BufferAttribute(col, 3));
		g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
		g.setAttribute('aTwinkle', new THREE.BufferAttribute(tw, 1));
		const m = new THREE.ShaderMaterial({
			vertexShader: S.POINTS_VERTEX,
			fragmentShader: S.POINTS_FRAGMENT,
			vertexColors: true,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			uniforms: {
				uTime: { value: 0 },
				uPixelRatio: { value: this.renderer.getPixelRatio() },
				uScale: { value: scale },
				uMaxSize: { value: maxSize },
				uOpacity: { value: opacity }
			}
		});
		this.pointsMaterials.push(m);
		const points = new THREE.Points(g, m);
		points.frustumCulled = false;
		return points;
	}

	private makeGlow(color: THREE.Color, size: number, intensity: number) {
		const m = new THREE.ShaderMaterial({
			vertexShader: S.GLOW_VERTEX,
			fragmentShader: S.GLOW_FRAGMENT,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			uniforms: { uColor: { value: color }, uIntensity: { value: intensity }, uTime: { value: 0 } }
		});
		this.animated.push(m);
		const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
		mesh.scale.setScalar(size);
		return mesh;
	}

	private buildSystems() {
		const sphere = new THREE.SphereGeometry(1, 96, 64);
		const lowSphere = new THREE.SphereGeometry(1, 32, 20);
		for (const layout of this.layout.systems) {
			const { system } = layout;
			const group = new THREE.Group();
			group.position.set(...layout.position);
			this.scene.add(group);
			const starColor = new THREE.Color(system.star.color);

			const starMaterial = new THREE.ShaderMaterial({
				vertexShader: S.STAR_VERTEX,
				fragmentShader: S.STAR_FRAGMENT,
				uniforms: { uColor: { value: starColor }, uTime: { value: 0 }, uSeed: { value: (hashString(system.id) % 1000) / 1000 } }
			});
			this.animated.push(starMaterial);
			const star = new THREE.Mesh(sphere, starMaterial);
			star.scale.setScalar(layout.starRadius);
			group.add(star);

			const glow = this.makeGlow(starColor.clone(), layout.starRadius * 9, 1.1);
			group.add(glow);

			const pick = new THREE.Mesh(lowSphere, new THREE.MeshBasicMaterial());
			pick.visible = false;
			pick.scale.setScalar(Math.max(5, layout.starRadius * 3));
			pick.userData.target = { kind: 'system', id: system.id } satisfies PickTarget;
			group.add(pick);

			const node: SystemNode = {
				layout,
				group,
				starMaterial,
				glowMaterial: glow.material as THREE.ShaderMaterial,
				pick,
				planets: [],
				world: new THREE.Vector3(...layout.position),
				label: this.makeLabel(
					'system',
					system.name,
					`${layout.planets.length} ${layout.planets.length === 1 ? 'world' : 'worlds'}`,
					system.star.color,
					() => this.opts.onPick({ kind: 'system', id: system.id })
				)
			};
			this.systems.push(node);

			for (const p of layout.planets) this.buildPlanet(node, p, sphere, lowSphere);
		}
	}

	private buildPlanet(system: SystemNode, layout: PlanetLayout, sphere: THREE.SphereGeometry, lowSphere: THREE.SphereGeometry) {
		const g = layout.game;
		const lightPos = system.world.clone();
		const starColor = new THREE.Color(system.layout.system.star.color).lerp(new THREE.Color('#ffffff'), 0.65);

		const pivot = new THREE.Group();
		system.group.add(pivot);

		const material = new THREE.ShaderMaterial({
			vertexShader: S.PLANET_VERTEX,
			fragmentShader: S.PLANET_FRAGMENT,
			uniforms: {
				uColor: { value: new THREE.Color(g.planet.color) },
				uAccent: { value: new THREE.Color(g.planet.accent) },
				uAtmo: { value: new THREE.Color(g.planet.atmosphere ?? '#000000') },
				uHasAtmo: { value: g.planet.atmosphere ? 1 : 0 },
				uSeed: { value: g.planet.seed },
				uKind: { value: KIND_INDEX[g.planet.kind] },
				uLightPos: { value: lightPos },
				uLightColor: { value: starColor },
				uTime: { value: 0 },
				uHighlight: { value: 0 },
				uDim: { value: 1 }
			}
		});
		this.animated.push(material);
		const body = new THREE.Mesh(sphere, material);
		body.scale.setScalar(layout.radius);
		body.rotation.z = layout.axialTilt;
		pivot.add(body);

		const pick = new THREE.Mesh(lowSphere, new THREE.MeshBasicMaterial());
		pick.visible = false;
		pick.scale.setScalar(Math.max(layout.radius * 1.8, 0.9));
		pick.userData.target = { kind: 'planet', id: g.id } satisfies PickTarget;
		pivot.add(pick);
		this.pickables.push(pick);

		if (g.planet.atmosphere) {
			const atmo = new THREE.Mesh(
				sphere,
				new THREE.ShaderMaterial({
					vertexShader: S.ATMO_VERTEX,
					fragmentShader: S.ATMO_FRAGMENT,
					side: THREE.BackSide,
					transparent: true,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
					uniforms: { uColor: { value: new THREE.Color(g.planet.atmosphere) }, uLightPos: { value: lightPos }, uStrength: { value: 1.6 } }
				})
			);
			atmo.scale.setScalar(layout.radius * 1.14);
			pivot.add(atmo);
		}

		let ringMaterial: THREE.ShaderMaterial | null = null;
		if (g.planet.rings) {
			const inner = layout.radius * 1.35;
			const outer = layout.radius * 2.3;
			ringMaterial = new THREE.ShaderMaterial({
				vertexShader: S.RING_VERTEX,
				fragmentShader: S.RING_FRAGMENT,
				side: THREE.DoubleSide,
				transparent: true,
				depthWrite: false,
				uniforms: {
					uColor: { value: new THREE.Color(g.planet.rings.color) },
					uInner: { value: inner },
					uOuter: { value: outer },
					uSeed: { value: g.planet.seed },
					uLightPos: { value: lightPos },
					uPlanetPos: { value: new THREE.Vector3() },
					uPlanetRadius: { value: layout.radius },
					uDim: { value: 1 }
				}
			});
			const ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 160, 1), ringMaterial);
			ring.rotation.x = -Math.PI / 2 + g.planet.rings.tilt;
			ring.rotation.y = g.planet.rings.tilt * 0.4;
			pivot.add(ring);
		}

		const moons: PlanetNode['moons'] = [];
		const rand = mulberry32(hashString(g.id + ':moons'));
		for (let i = 0; i < g.planet.moons; i++) {
			const moonMaterial = new THREE.ShaderMaterial({
				vertexShader: S.PLANET_VERTEX,
				fragmentShader: S.PLANET_FRAGMENT,
				uniforms: {
					uColor: { value: new THREE.Color().setHSL(rand(), 0.08, 0.5 + rand() * 0.2) },
					uAccent: { value: new THREE.Color('#9a9aa6') },
					uAtmo: { value: new THREE.Color('#000000') },
					uHasAtmo: { value: 0 },
					uSeed: { value: rand() },
					uKind: { value: 1 },
					uLightPos: { value: lightPos },
					uLightColor: { value: starColor },
					uTime: { value: 0 },
					uHighlight: { value: 0 },
					uDim: { value: 1 }
				}
			});
			const mesh = new THREE.Mesh(lowSphere, moonMaterial);
			mesh.scale.setScalar(layout.radius * (0.16 + rand() * 0.12));
			pivot.add(mesh);
			moons.push({
				mesh,
				distance: layout.radius * (g.planet.rings ? 2.7 : 1.9) + i * layout.radius * 0.7,
				speed: 0.5 + rand() * 0.6,
				phase: rand() * Math.PI * 2,
				tilt: (rand() - 0.5) * 0.6
			});
		}

		const orbitPoints: THREE.Vector3[] = [];
		for (let i = 0; i < 160; i++) {
			const a = (i / 160) * Math.PI * 2;
			const z = Math.sin(a) * layout.orbitRadius;
			orbitPoints.push(new THREE.Vector3(Math.cos(a) * layout.orbitRadius, z * Math.sin(layout.inclination), z * Math.cos(layout.inclination)));
		}
		const orbitMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(g.planet.color).lerp(new THREE.Color('#ffffff'), 0.6), transparent: true, opacity: 0, depthWrite: false });
		const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPoints), orbitMaterial);
		system.group.add(orbit);

		const node: PlanetNode = {
			layout,
			system,
			pivot,
			body,
			material,
			ringMaterial,
			moons,
			orbit,
			orbitMaterial,
			world: new THREE.Vector3(),
			highlight: 0,
			highlightTarget: 0,
			label: this.makeLabel('planet', g.title, g.planet.name !== g.title ? g.planet.name : g.genres[0] ?? '', g.planet.color, () =>
				this.opts.onPick({ kind: 'planet', id: g.id })
			)
		};
		system.planets.push(node);
		this.planets.set(g.id, node);
	}

	private makeLabel(kind: 'system' | 'planet', title: string, sub: string, color: string, onClick: () => void): HTMLButtonElement {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = `gl-label gl-${kind}`;
		b.style.setProperty('--dot', color);
		b.setAttribute('aria-label', sub ? `${title}, ${sub}` : title);
		const dot = document.createElement('span');
		dot.className = 'gl-dot';
		const text = document.createElement('span');
		text.className = 'gl-text';
		const name = document.createElement('span');
		name.className = 'gl-name';
		name.textContent = title;
		text.append(name);
		if (sub) {
			const s = document.createElement('span');
			s.className = 'gl-sub';
			s.textContent = sub;
			text.append(s);
		}
		b.append(dot, text);
		b.addEventListener('click', (e) => {
			e.stopPropagation();
			onClick();
		});
		b.addEventListener('pointerenter', () => this.setHover(kind === 'planet' ? { kind, id: this.idFor(b) } : null));
		b.addEventListener('pointerleave', () => this.setHover(null));
		this.labelLayer.append(b);
		return b;
	}

	private idFor(label: HTMLButtonElement): string {
		for (const p of this.planets.values()) if (p.label === label) return p.layout.game.id;
		return '';
	}

	// ── Views & camera ────────────────────────────────────────────────

	private systemById(id: string) {
		return this.systems.find((s) => s.layout.system.id === id);
	}

	private currentSystem(): SystemNode | null {
		if (this.view.kind === 'system') return this.systemById(this.view.systemId) ?? null;
		if (this.view.kind === 'planet') return this.planets.get(this.view.gameId)?.system ?? null;
		return null;
	}

	/**
	 * How much further back the camera must sit so a subject framed for a wide, unobstructed
	 * screen still fits the area left visible by panels (and narrow phone screens).
	 */
	private fit(): number {
		const visW = Math.max(1, this.width - this.insets.right);
		const visH = Math.max(1, this.height - this.insets.bottom);
		const byHeight = this.height / visH;
		const byWidth = 1.5 / (visW / visH) / (visH / this.height);
		return Math.max(1, Math.pow(Math.max(byHeight, byWidth), 0.9));
	}

	private galaxyFrame(): Frame {
		const R = this.layout.radius;
		const k = this.fit();
		return { pos: new THREE.Vector3(R * 0.12, R * 0.62, R * 0.82).multiplyScalar(k), target: new THREE.Vector3(0, 0, 0) };
	}

	private systemFrame(s: SystemNode): Frame {
		const ext = Math.max(s.layout.extent, 10) * this.fit();
		const out = new THREE.Vector3(s.world.x, 0, s.world.z);
		if (out.lengthSq() < 1) out.set(0, 0, 1);
		out.normalize();
		const side = new THREE.Vector3(-out.z, 0, out.x);
		// Look back toward the galactic core so it glows behind the system.
		const pos = s.world
			.clone()
			.addScaledVector(out, ext * 1.45)
			.addScaledVector(side, ext * 0.35)
			.add(new THREE.Vector3(0, ext * 0.75, 0));
		return { pos, target: s.world.clone() };
	}

	private planetFrame(p: PlanetNode): Frame {
		const target = p.world.clone();
		const toStar = p.system.world.clone().sub(target).setY(0).normalize();
		const side = new THREE.Vector3(-toStar.z, 0, toStar.x);
		const r = p.layout.radius * (p.layout.game.planet.rings ? 2.3 : 1);
		const d = (r * 4.2 + 1.5) * this.fit();
		const pos = target
			.clone()
			.addScaledVector(toStar, d * 0.75)
			.addScaledVector(side, d * 0.6)
			.add(new THREE.Vector3(0, d * 0.32, 0));
		return { pos, target };
	}

	private applyFrame(f: Frame) {
		this.camera.position.copy(f.pos);
		this.controls.target.copy(f.target);
		this.camera.lookAt(f.target);
	}

	private flyTo(to: () => Frame, duration: number, follow: PlanetNode | null = null) {
		this.follow = follow;
		if (duration <= 0) {
			this.flight = null;
			this.applyFrame(to());
			if (follow) this.followLast.copy(follow.world);
			return;
		}
		this.flight = { from: { pos: this.camera.position.clone(), target: this.controls.target.clone() }, to, t: 0, duration };
	}

	/** Labels, orbit visibility, control limits and auto-rotate for the current view. */
	private applyViewState() {
		const current = this.currentSystem();
		const focused = this.view.kind === 'planet' ? this.view.gameId : null;
		for (const s of this.systems) {
			const showSystemLabel = this.view.kind === 'galaxy';
			this.setLabelVisible(s.label, showSystemLabel);
			for (const p of s.planets) {
				this.setLabelVisible(p.label, s === current);
				p.label.classList.toggle('is-selected', p.layout.game.id === focused);
			}
		}
		const c = this.controls;
		if (this.view.kind === 'galaxy') {
			c.minDistance = 25;
			c.maxDistance = this.layout.radius * 3;
		} else if (current) {
			const ext = Math.max(current.layout.extent, 10);
			c.minDistance = this.view.kind === 'planet' ? 1.2 : ext * 0.35;
			c.maxDistance = ext * 5;
		}
		c.autoRotate = this.view.kind === 'galaxy' && !this.opts.reducedMotion;
	}

	private setLabelVisible(label: HTMLButtonElement, visible: boolean) {
		label.classList.toggle('is-visible', visible);
		label.tabIndex = visible ? 0 : -1;
		label.setAttribute('aria-hidden', visible ? 'false' : 'true');
	}

	private updateViewOffset() {
		const { right, bottom } = this.insets;
		if (right || bottom) this.camera.setViewOffset(this.width, this.height, right / 2, bottom / 2, this.width, this.height);
		else this.camera.clearViewOffset();
	}

	private resize() {
		const w = Math.max(1, this.container.clientWidth);
		const h = Math.max(1, this.container.clientHeight);
		this.width = w;
		this.height = h;
		this.renderer.setSize(w, h);
		this.composer?.setSize(w, h);
		this.bloom?.resolution.set(w, h);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.updateViewOffset();
		const pr = this.renderer.getPixelRatio();
		for (const m of this.pointsMaterials) m.uniforms.uPixelRatio.value = pr * (h / 900);
	}

	// ── Input ─────────────────────────────────────────────────────────

	private onPointerDown = (e: PointerEvent) => {
		this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
		this.flight = null; // grabbing the view cancels a flight
		this.controls.autoRotate = false;
	};

	private onPointerUp = (e: PointerEvent) => {
		const d = this.down;
		this.down = null;
		this.applyViewState();
		if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
		this.opts.onPick(this.pickAt(e.clientX, e.clientY) ?? { kind: 'empty' });
	};

	private onPointerMove = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse' || this.down) return;
		this.setHover(this.pickAt(e.clientX, e.clientY));
	};

	private onPointerLeave = () => this.setHover(null);

	private setHover(target: PickTarget | null) {
		const key = (t: PickTarget | null) => (t && t.kind !== 'empty' ? `${t.kind}:${t.id}` : '');
		if (key(target) === key(this.hovered)) return;
		this.hovered = target;
		this.renderer.domElement.style.cursor = target ? 'pointer' : '';
		for (const p of this.planets.values()) p.highlightTarget = target?.kind === 'planet' && target.id === p.layout.game.id ? 1 : 0;
		this.opts.onHover?.(target);
	}

	private pickAt(clientX: number, clientY: number): PickTarget | null {
		const rect = this.renderer.domElement.getBoundingClientRect();
		this.pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		const targets: THREE.Object3D[] = [];
		const current = this.currentSystem();
		if (this.view.kind === 'galaxy') targets.push(...this.systems.map((s) => s.pick));
		else if (current) targets.push(...current.planets.map((p) => p.pivot.children.find((c) => c.userData.target)!).filter(Boolean));
		const hit = this.raycaster.intersectObjects(targets, false)[0];
		return (hit?.object.userData.target as PickTarget | undefined) ?? null;
	}

	// ── Frame loop ────────────────────────────────────────────────────

	private tick = (now: number) => {
		if (this.destroyed) return;
		this.frameHandle = requestAnimationFrame(this.tick);
		// Simulation steps are clamped (no orbit jumps after a stall); camera flights use wall time
		// so they finish on schedule even on slow devices.
		const wall = Math.min(0.25, Math.max(0, (now - this.last) / 1000));
		const dt = Math.min(0.05, wall);
		this.last = now;
		this.clockTime += dt;
		if (!this.opts.reducedMotion) this.simTime += dt;

		for (const m of this.animated) m.uniforms.uTime.value = this.clockTime;
		for (const m of this.pointsMaterials) m.uniforms.uTime.value = this.opts.reducedMotion ? 0 : this.clockTime;

		const current = this.currentSystem();
		const focusedId = this.view.kind === 'planet' ? this.view.gameId : null;
		for (const s of this.systems) {
			for (const p of s.planets) {
				const [x, y, z] = orbitPosition(p.layout, this.simTime);
				p.pivot.position.set(x, y, z);
				p.body.rotation.y = this.simTime * p.layout.spin;
				p.world.set(x, y, z).add(s.world);
				for (const m of p.moons) {
					const a = m.phase + this.simTime * m.speed;
					m.mesh.position.set(Math.cos(a) * m.distance, Math.sin(a) * m.distance * Math.sin(m.tilt), Math.sin(a) * m.distance * Math.cos(m.tilt));
				}
				if (p.ringMaterial) p.ringMaterial.uniforms.uPlanetPos.value.copy(p.world);
				p.highlight += (p.highlightTarget - p.highlight) * Math.min(1, dt * 10);
				p.material.uniforms.uHighlight.value = p.highlight;
				// Orbits: faint in the current system, brighter for the focused/hovered world, hidden elsewhere.
				const want = s === current ? (p.layout.game.id === focusedId ? 0.5 : 0.14 + p.highlight * 0.3) : 0;
				p.orbitMaterial.opacity += (want - p.orbitMaterial.opacity) * Math.min(1, dt * 6);
				p.orbit.visible = p.orbitMaterial.opacity > 0.005;
			}
		}

		if (this.flight) {
			const f = this.flight;
			f.t = Math.min(1, f.t + wall / f.duration);
			const e = ease(f.t);
			const to = f.to();
			this.camera.position.lerpVectors(f.from.pos, to.pos, e);
			this.controls.target.lerpVectors(f.from.target, to.target, e);
			if (f.t >= 1) {
				this.flight = null;
				if (this.follow) this.followLast.copy(this.follow.world);
			}
		} else if (this.follow) {
			this.tmp.copy(this.follow.world).sub(this.followLast);
			this.camera.position.add(this.tmp);
			this.controls.target.add(this.tmp);
			this.followLast.copy(this.follow.world);
		}
		if (!this.flight) this.controls.update(dt);
		else this.camera.lookAt(this.controls.target);

		if (this.composer) this.composer.render(dt);
		else this.renderer.render(this.scene, this.camera);

		this.positionLabels();
	};

	private positionLabels() {
		const w = this.width;
		const h = this.height;
		const place = (label: HTMLButtonElement, world: THREE.Vector3, offsetY: number) => {
			if (!label.classList.contains('is-visible')) return;
			this.tmp.copy(world).project(this.camera);
			const behind = this.tmp.z > 1 || this.tmp.z < -1;
			const x = (this.tmp.x * 0.5 + 0.5) * w;
			const y = (-this.tmp.y * 0.5 + 0.5) * h;
			const off = behind || x < -100 || x > w + 100 || y < -60 || y > h + 60;
			label.classList.toggle('is-offscreen', off);
			if (!off) label.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + offsetY).toFixed(1)}px, 0)`;
		};
		for (const s of this.systems) {
			place(s.label, s.world, 0);
			for (const p of s.planets) {
				// Push the label below the planet by its on-screen radius.
				const dist = this.camera.position.distanceTo(p.world);
				const px = (p.layout.radius / (dist * Math.tan((this.camera.fov * Math.PI) / 360))) * (h / 2);
				place(p.label, p.world, Math.min(140, px + 10));
			}
		}
	}
}
