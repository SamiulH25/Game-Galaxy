import * as THREE from 'three';

function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function createGlowTexture(boost = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, `rgba(255,255,255,${1 * boost})`);
  g.addColorStop(0.08, `rgba(255,255,255,${0.9 * boost})`);
  g.addColorStop(0.2, `rgba(255,255,255,${0.5 * boost})`);
  g.addColorStop(0.4, `rgba(255,255,255,${0.2 * boost})`);
  g.addColorStop(0.7, `rgba(255,255,255,${0.05 * boost})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function createPlanetTexture(baseColor: THREE.Color, seed: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  let s = seed;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };

  const { h, sat, lit } = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
  const [r0, g0, b0] = hslToRgb(h, sat, lit);
  ctx.fillStyle = `rgb(${r0},${g0},${b0})`;
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let n = 0, amp = 1, freq = 1;
      for (let oct = 0; oct < 5; oct++) {
        const sx = Math.floor(x / (32 / freq));
        const sy = Math.floor(y / (32 / freq));
        const h2 = Math.sin(sx * 12.9898 + sy * 78.233 + seed * 43758.5453) * 43758.5453;
        n += (h2 - Math.floor(h2)) * amp;
        amp *= 0.5; freq *= 2.2;
      }
      n = n / 3.1;
      const lat = Math.sin((y / size) * Math.PI);
      const band = Math.sin(y / size * Math.PI * 6 + seed) * 0.15;
      n = n * 0.65 + (lat * 0.2 + band);
      const variation = n - 0.5;
      const newH = (h + variation * 0.12 + 1) % 1;
      const newS = Math.max(0, Math.min(1, sat + variation * 0.15));
      const newL = Math.max(0.1, Math.min(0.85, lit + variation * 0.35));
      const [nr, ng, nb] = hslToRgb(newH, newS, newL);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const craterCount = 8 + Math.floor(rand() * 12);
  for (let f = 0; f < craterCount; f++) {
    const fx = rand() * size, fy = rand() * size, fr = 10 + rand() * 40, depth = 0.15 + rand() * 0.25;
    // Bright rim highlight
    const rim = ctx.createRadialGradient(fx, fy, fr * 0.65, fx, fy, fr);
    rim.addColorStop(0, `rgba(255,255,255,${depth * 0.5})`);
    rim.addColorStop(0.3, `rgba(255,255,255,${depth * 0.2})`);
    rim.addColorStop(0.7, `rgba(255,255,255,${depth * 0.05})`);
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim; ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    // Dark crater floor
    const inner = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 0.55);
    inner.addColorStop(0, `rgba(0,0,0,${depth * 1.1})`);
    inner.addColorStop(0.5, `rgba(0,0,0,${depth * 0.4})`);
    inner.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = inner; ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  }

  const spotCount = 15 + Math.floor(rand() * 20);
  for (let f = 0; f < spotCount; f++) {
    const fx = rand() * size, fy = rand() * size, fr = 5 + rand() * 18, alpha = 0.06 + rand() * 0.18;
    const bright = rand() > 0.4;
    const spot = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    spot.addColorStop(0, bright ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
    spot.addColorStop(0.6, bright ? `rgba(255,255,255,${alpha * 0.3})` : `rgba(0,0,0,${alpha * 0.3})`);
    spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot; ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  }

  // Stronger limb darkening for depth
  const edge = ctx.createRadialGradient(size/2, size/2, size * 0.2, size/2, size/2, size * 0.52);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(0.5, 'rgba(0,0,0,0.08)');
  edge.addColorStop(0.75, 'rgba(0,0,0,0.22)');
  edge.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function rgbToHsl(r: number, g: number, b: number) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, sat = 0, lit = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = lit > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, sat, lit };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1/3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1/3) * 255].map(v => Math.round(v)) as [number, number, number];
}

function createLabelTexture(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 52px DM Sans, system-ui, sans-serif';

  // Deep shadow for separation
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = 32;
  ctx.fillStyle = '#b0b4c8';
  ctx.fillText(text, 512, 64);

  // Thick dark stroke for outline
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(5,5,20,0.9)';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 512, 64);

  // Mid glow layer
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#c8cce0';
  ctx.fillText(text, 512, 64);

  // Crisp bright text
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eef0f8';
  ctx.fillText(text, 512, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export interface SceneCallbacks {
  onPlanetClick: (game: any) => void;
}

export class GalaxyScene {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private container!: HTMLElement;
  private animId = 0;
  private planets: any[] = [];
  private planetMeshes: THREE.Mesh[] = [];
  private characteristicObjects: THREE.Object3D[] = [];
  private rings: THREE.Object3D[] = [];
  private farStars!: THREE.Points;
  private midStars!: THREE.Points;
  private nearStars!: THREE.Points;
  private nebulaClouds!: THREE.Points;
  private galaxySprites: THREE.Sprite[] = [];
  private sunGroup!: THREE.Group;
  private sunMesh!: THREE.Mesh;
  private innerGlow!: THREE.Sprite;
  private outerGlow!: THREE.Sprite;
  private sunMaterial!: THREE.MeshStandardMaterial;
  private sunLight!: THREE.PointLight;
  private fillLight!: THREE.PointLight;
  private hemiLight!: THREE.HemisphereLight;
  private ambientLight!: THREE.AmbientLight;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private hoveredMesh: THREE.Mesh | null = null;
  private cameraAngle = 0;
  private time = 0;
  private resizeRaf: number | null = null;
  private callbacks: SceneCallbacks;
  private starDotTexture: THREE.Texture;
  private glowTexture: THREE.Texture;
  private running = false;
  private currentStarColor = new THREE.Color(0xffcc44);
  private cameraDistance = 26;
  private cameraTargetDistance = 26;
  private cameraSpeed = 0.0006;
  private transition: {
    progress: number;
    oldPlanets: { mesh: THREE.Mesh; label: THREE.Sprite | null }[];
    oldChars: THREE.Object3D[];
    oldRings: THREE.Object3D[];
    startStarColor: THREE.Color;
    startGlowColor: THREE.Color;
    startEmissive: THREE.Color;
    startAmbient: THREE.Color;
    endStarColor: THREE.Color;
    endGlowColor: THREE.Color;
    endEmissive: THREE.Color;
    endAmbient: THREE.Color;
    newPlanets: { mesh: THREE.Mesh; label: THREE.Sprite | null }[];
  } | null = null;

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.starDotTexture = createStarTexture();
    this.glowTexture = createGlowTexture(1.0);
    this.init();
  }

  private init() {
    const { clientWidth: w, clientHeight: h } = this.container;
    const viewW = w || window.innerWidth;
    const viewH = h || window.innerHeight;

    this.scene = new THREE.Scene();
    // JWST-inspired cosmic background — deep, rich infrared tones
    this.scene.background = this.createCosmicBackground();

    this.camera = new THREE.PerspectiveCamera(55, viewW / viewH, 0.1, 1000);
    this.camera.position.set(0, 14, 26);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(viewW, viewH);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.75; // deeper, richer shadows
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Enable shadow maps
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Lights — dramatic contrast
    this.ambientLight = new THREE.AmbientLight(0x181830, 0.2);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x4466aa, 0x110818, 0.3);
    this.scene.add(this.hemiLight);

    // Main sun light — brighter, casts shadows
    this.sunLight = new THREE.PointLight(0xffcc66, 10.0, 150, 1.2);
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Fill light from below — cooler, dimmer for drama
    this.fillLight = new THREE.PointLight(0x3344aa, 0.4, 80);
    this.fillLight.position.set(0, -8, 0);
    this.scene.add(this.fillLight);

    // Starfield
    this.farStars = this.createStarLayer(3000, 80, 200, 0.4, 0.7);
    this.midStars = this.createStarLayer(2000, 40, 90, 0.6, 0.85);
    this.nearStars = this.createStarLayer(500, 25, 50, 0.8, 1.0);
    this.scene.add(this.farStars);
    this.scene.add(this.midStars);
    this.scene.add(this.nearStars);

    // JWST-style nebula clouds and distant galaxies
    this.nebulaClouds = this.createNebulaClouds();
    this.scene.add(this.nebulaClouds);
    this.galaxySprites = this.createGalaxySprites();
    for (const gs of this.galaxySprites) this.scene.add(gs);

    // Sun — dramatically brighter
    this.sunGroup = new THREE.Group();
    this.scene.add(this.sunGroup);

    const sunGeo = new THREE.SphereGeometry(2.0, 64, 64);
    this.sunMaterial = new THREE.MeshStandardMaterial({
      map: createPlanetTexture(new THREE.Color(0xffaa44), 9999),
      color: 0xffcc66, emissive: 0xff8800, emissiveIntensity: 4.0,
      roughness: 0.05, metalness: 0,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, this.sunMaterial);
    this.sunMesh.castShadow = false;
    this.sunGroup.add(this.sunMesh);

    // Inner glow — tighter, brighter
    this.innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(1.5), color: 0xffdd77, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 1.0,
    }));
    this.innerGlow.scale.set(7, 7, 1);
    this.sunGroup.add(this.innerGlow);

    // Outer glow — larger, softer
    this.outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(1.0), color: 0xff6600, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35,
    }));
    this.outerGlow.scale.set(22, 22, 1);
    this.sunGroup.add(this.outerGlow);

    // Click/hover
    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);

    // Resize
    window.addEventListener('resize', this.scheduleResize);

    this.running = true;
    this.animate();
  }

  private createStarLayer(count: number, rMin: number, rMax: number, size: number, opacity: number) {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = rMin + Math.random() * (rMax - rMin);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = radius * Math.cos(phi);
      const b = 0.4 + Math.random() * 0.6;
      const t = Math.random();
      // JWST-inspired infrared palette: more warm/cool color variety
      if (t < 0.08) { colors[i*3]=b; colors[i*3+1]=0.65*b; colors[i*3+2]=0.3*b; }       // deep orange
      else if (t < 0.16) { colors[i*3]=b; colors[i*3+1]=0.75*b; colors[i*3+2]=0.55*b; }  // warm gold
      else if (t < 0.24) { colors[i*3]=0.45*b; colors[i*3+1]=0.55*b; colors[i*3+2]=b; }  // cool blue
      else if (t < 0.30) { colors[i*3]=0.7*b; colors[i*3+1]=0.4*b; colors[i*3+2]=0.8*b; } // violet
      else if (t < 0.35) { colors[i*3]=0.3*b; colors[i*3+1]=0.7*b; colors[i*3+2]=0.7*b; } // teal
      else if (t < 0.40) { colors[i*3]=b; colors[i*3+1]=0.3*b; colors[i*3+2]=0.2*b; }     // crimson
      else { colors[i*3]=b; colors[i*3+1]=b; colors[i*3+2]=b; }                           // white
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      map: this.starDotTexture, size, vertexColors: true, transparent: true,
      opacity, sizeAttenuation: true, depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }

  /** JWST-inspired cosmic background: subtle nebula gradients instead of flat black */
  private createCosmicBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Deep cosmic base
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#020108');
    bg.addColorStop(0.25, '#04020a');
    bg.addColorStop(0.5, '#06030c');
    bg.addColorStop(0.75, '#04020a');
    bg.addColorStop(1, '#020108');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Nebula clouds — faint, large-scale color patches like JWST deep field
    const nebulaSpots = [
      { x: 0.15, y: 0.3, r: 0.35, r2: 0.5, c1: '#1a0a2e', c2: '#0d0518' },
      { x: 0.8, y: 0.25, r: 0.25, r2: 0.4, c1: '#0a1a2e', c2: '#040812' },
      { x: 0.5, y: 0.6, r: 0.3, r2: 0.45, c1: '#1a0e08', c2: '#0a0604' },
      { x: 0.3, y: 0.75, r: 0.2, r2: 0.35, c1: '#0e1a12', c2: '#060a08' },
      { x: 0.7, y: 0.7, r: 0.28, r2: 0.4, c1: '#1a081a', c2: '#0a040a' },
    ];

    for (const n of nebulaSpots) {
      const g = ctx.createRadialGradient(
        canvas.width * n.x, canvas.height * n.y, 0,
        canvas.width * n.x, canvas.height * n.y, canvas.width * n.r2,
      );
      g.addColorStop(0, n.c1);
      g.addColorStop(0.5, n.c2);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Tiny noise overlay for cosmic dust
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const a = 0.02 + Math.random() * 0.06;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Faint nebula particle clouds that float behind everything */
  private createNebulaClouds(): THREE.Points {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 30 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5; // flatten vertically
      positions[i*3+2] = radius * Math.cos(phi);
      const t = Math.random();
      if (t < 0.25) {
        const b = 0.08 + Math.random() * 0.12;
        colors[i*3] = 0.6*b; colors[i*3+1] = 0.2*b; colors[i*3+2] = 0.7*b; // violet
      } else if (t < 0.5) {
        const b = 0.06 + Math.random() * 0.1;
        colors[i*3] = 0.2*b; colors[i*3+1] = 0.5*b; colors[i*3+2] = 0.6*b; // teal
      } else if (t < 0.75) {
        const b = 0.06 + Math.random() * 0.1;
        colors[i*3] = 0.7*b; colors[i*3+1] = 0.3*b; colors[i*3+2] = 0.15*b; // orange
      } else {
        const b = 0.04 + Math.random() * 0.06;
        colors[i*3] = b; colors[i*3+1] = b; colors[i*3+2] = b; // grey
      }
      sizes[i] = 0.8 + Math.random() * 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.PointsMaterial({
      map: this.glowTexture,
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  /** Distant galaxy sprites scattered in the background */
  private createGalaxySprites(): THREE.Sprite[] {
    const sprites: THREE.Sprite[] = [];
    const galaxyPositions = [
      { x: -80, y: 25, z: -60, color: '#e8c888', size: 6, tilt: 0.3 },
      { x: 90, y: -20, z: -70, color: '#88aae8', size: 5, tilt: -0.2 },
      { x: -60, y: -35, z: -90, color: '#e888aa', size: 4, tilt: 0.5 },
      { x: 70, y: 30, z: -80, color: '#aae8aa', size: 3.5, tilt: -0.4 },
      { x: -100, y: 10, z: -50, color: '#ccaacc', size: 5.5, tilt: 0.1 },
    ];
    for (const g of galaxyPositions) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Elliptical glow
      const c = new THREE.Color(g.color);
      const gx = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gx.addColorStop(0, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.25)`);
      gx.addColorStop(0.2, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.1)`);
      gx.addColorStop(0.5, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.03)`);
      gx.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gx;
      ctx.beginPath();
      ctx.ellipse(64, 64, 60, 20, g.tilt, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      const core = ctx.createRadialGradient(64, 64, 0, 64, 64, 12);
      core.addColorStop(0, `rgba(255,255,255,0.5)`);
      core.addColorStop(0.5, `rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},0.2)`);
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.ellipse(64, 64, 12, 5, g.tilt, 0, Math.PI * 2);
      ctx.fill();

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
        opacity: 0.3 + Math.random() * 0.2,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(g.x, g.y, g.z);
      sprite.scale.set(g.size * 2, g.size * 0.8, 1);
      sprites.push(sprite);
    }
    return sprites;
  }

  updateStar(starProps: any) {
    if (!starProps) return;
    const sc = new THREE.Color(starProps.starColor || '#ffcc44');
    this.currentStarColor.copy(sc);
    const ec = new THREE.Color(starProps.starEmissive || starProps.starColor);
    const gc = new THREE.Color(starProps.glowColor || starProps.starColor);
    const sz = starProps.starSize || 2.0;

    this.sunMesh.scale.setScalar(sz / 2);
    this.sunMaterial.color.copy(sc);
    this.sunMaterial.emissive.copy(ec);
    this.sunMaterial.emissiveIntensity = 4.0;
    this.sunMaterial.map = createPlanetTexture(sc, 9999);
    this.sunMaterial.needsUpdate = true;

    this.innerGlow.material.color.copy(gc);
    this.innerGlow.scale.setScalar(sz * 3.5);

    this.outerGlow.material.color.copy(ec);
    this.outerGlow.scale.setScalar(sz * 11);

    this.sunLight.color.copy(gc);
    this.sunLight.intensity = 6.0 + (starProps.glowIntensity || 0.8) * 3;

    this.hemiLight.color.copy(gc).multiplyScalar(0.35);
    this.hemiLight.groundColor.set(starProps.ambientColor || '#221122');
    this.ambientLight.color.copy(new THREE.Color(starProps.ambientColor || '#222244'));
  }

  /** Apply user settings to the scene reactively */
  applySettings(s: Record<string, any>) {
    // Camera speed
    if (typeof s.cameraRotSpeed === 'number') {
      this.cameraSpeed = s.cameraRotSpeed * 0.0006;
    }

    // Star brightness (opacity multiplier on star layers)
    if (typeof s.starBrightness === 'number') {
      const b = Math.max(0, Math.min(1.5, s.starBrightness));
      (this.farStars.material as THREE.PointsMaterial).opacity = 0.7 * b;
      (this.midStars.material as THREE.PointsMaterial).opacity = 0.85 * b;
      (this.nearStars.material as THREE.PointsMaterial).opacity = 1.0 * b;
    }

    // Nebula clouds visibility
    if (typeof s.nebulaClouds === 'boolean') {
      this.nebulaClouds.visible = s.nebulaClouds;
    }

    // Star density (adjust opacity to simulate density levels)
    if (typeof s.starDensity === 'string') {
      const densityMap: Record<string, number> = { low: 0.3, medium: 0.65, high: 1.0 };
      const multiplier = densityMap[s.starDensity] ?? 0.65;
      (this.farStars.material as THREE.PointsMaterial).opacity = 0.7 * multiplier;
      (this.midStars.material as THREE.PointsMaterial).opacity = 0.85 * multiplier;
      (this.nearStars.material as THREE.PointsMaterial).opacity = 1.0 * multiplier;
    }

    // Galaxy sprites visibility
    if (typeof s.galaxySprites === 'boolean') {
      for (const gs of this.galaxySprites) gs.visible = s.galaxySprites;
    }

    // Orbit rings visibility
    if (typeof s.orbitRings === 'boolean') {
      for (const r of this.rings) r.visible = s.orbitRings;
    }

    // Planet glow visibility — toggles inner/outer glow on each planet
    if (typeof s.planetGlow === 'boolean') {
      for (const p of this.planets) {
        p.mesh.children.forEach((child: THREE.Object3D) => {
          if (child instanceof THREE.Sprite) {
            child.visible = s.planetGlow;
          }
        });
      }
    }
  }

  async loadAndRender(systemId: string | null, games: any[], systems: any[]) {
    // === CLEAN UP ORPHANED OBJECTS FROM PREVIOUS TRANSITION (prevents leak on rapid switch) ===
    if (this.transition) {
      for (const op of this.transition.oldPlanets) {
        this.scene.remove(op.mesh);
        this.disposeObject(op.mesh);
        if (op.label) { this.scene.remove(op.label); this.disposeObject(op.label); }
      }
      for (const oc of this.transition.oldChars) { this.scene.remove(oc); this.disposeObject(oc); }
      for (const or of this.transition.oldRings) { this.scene.remove(or); this.disposeObject(or); }
      this.transition = null;
    }

    // === CAPTURE OLD STATE FOR SMOOTH TRANSITION ===
    const oldPlanets = this.planets.map(p => ({ mesh: p.mesh, label: p.label as THREE.Sprite | null }));
    const oldChars = [...this.characteristicObjects];
    const oldRings = [...this.rings];
    const hadOldContent = oldPlanets.length > 0 || oldRings.length > 0;

    const oldStarColor = this.currentStarColor.clone();
    const oldGlowColor = (this.innerGlow.material as THREE.SpriteMaterial).color.clone();
    const oldEmissive = this.sunMaterial.emissive.clone();
    const oldAmbient = this.ambientLight.color.clone();

    // Clear tracking (objects stay in scene for outro animation)
    this.planets = [];
    this.planetMeshes = [];
    this.characteristicObjects = [];
    this.rings = [];
    this.hoveredMesh = null;

    const sys = systems.find((s: any) => s.id === systemId);
    const newStarColor = sys?.star?.starColor ? new THREE.Color(sys.star.starColor) : new THREE.Color('#ffcc44');
    const newGlowColor = sys?.star?.glowColor ? new THREE.Color(sys.star.glowColor) : new THREE.Color('#ffaa22');
    const newEmissive = sys?.star?.starEmissive ? new THREE.Color(sys.star.starEmissive) : new THREE.Color('#ff8800');
    const newAmbient = sys?.star?.ambientColor ? new THREE.Color(sys.star.ambientColor) : new THREE.Color('#1a1a30');

    // Apply new star (will be animated during transition if needed)
    if (sys?.star) this.updateStar(sys.star);

    // Build new planets
    const filtered = systemId ? games.filter((g: any) => g.solarSystemId === systemId) : games;
    if (filtered.length === 0) {
      // Clean up old, nothing new to show
      for (const p of oldPlanets) { this.scene.remove(p.mesh); if (p.label) this.scene.remove(p.label); }
      for (const obj of oldChars) { this.scene.remove(obj); if (obj instanceof THREE.Sprite && (obj.material as THREE.SpriteMaterial).map) (obj.material as THREE.SpriteMaterial).map!.dispose(); }
      for (const r of oldRings) this.scene.remove(r);
      this.currentStarColor.copy(newStarColor);
      return;
    }

    const glowTex = this.glowTexture;

    filtered.forEach((game: any, index: number) => {
      const radius = game.orbitRadius || (4 + index * 2.8);
      const size = game.planetSize || 0.8;
      const color = new THREE.Color(game.planetColor || '#4488ff');
      const speed = game.orbitSpeed || (0.3 + Math.random() * 0.3);

      // Orbit ring
      const ring = this.createOrbitRing(radius, newStarColor);
      this.scene.add(ring);
      this.rings.push(ring);

      // Planet mesh — receives shadows
      const geo = new THREE.SphereGeometry(size, 64, 64);
      const mat = new THREE.MeshStandardMaterial({
        map: createPlanetTexture(color, index * 1337 + 42),
        roughness: 0.6, metalness: 0.2,
        emissive: color, emissiveIntensity: 0.06,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(radius, 0, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.planetMeshes.push(mesh);

      // Planet glow sprite — two layers for depth
      const innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.22,
      }));
      innerGlow.scale.set(size * 4.5, size * 4.5, 1);
      mesh.add(innerGlow);

      const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: color.clone().multiplyScalar(0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.08,
      }));
      outerGlow.scale.set(size * 7, size * 7, 1);
      mesh.add(outerGlow);

      // Auto-atmosphere for all planets
      const atmoGeo = new THREE.SphereGeometry(size * 1.12, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: color.clone().lerp(new THREE.Color(0xffffff), 0.3),
        transparent: true, opacity: 0.08,
        side: THREE.BackSide, depthWrite: false,
      });
      const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      mesh.add(atmoMesh);
      this.characteristicObjects.push(atmoMesh);

      // Characteristics
      const chars = game.characteristics;
      if (chars) {
        if (chars.type === 'rings') {
          const rg = this.createPlanetRings(size, chars);
          mesh.add(rg);
          this.characteristicObjects.push(rg);
        } else if (chars.type === 'moons') {
          const moonCount = chars.moonCount || 1;
          for (let mi = 0; mi < moonCount; mi++) {
            const { group, moonMesh, orbR, angle: mA, speed: mS } = this.createMoon(size, chars, mi, moonCount);
            mesh.add(group);
            this.characteristicObjects.push(group);
            if (!mesh.userData.moons) mesh.userData.moons = [];
            mesh.userData.moons.push({ mesh: moonMesh, orbR, angle: mA, speed: mS });
          }
        } else if (chars.type === 'atmosphere') {
          const atmo = this.createAtmosphere(size, chars);
          mesh.add(atmo);
          this.characteristicObjects.push(atmo);
        } else if (chars.type === 'asteroidBelt') {
          const belt = this.createAsteroidBelt(size, chars);
          mesh.add(belt);
          this.characteristicObjects.push(belt);
        }
      }

      // Label — added to scene (not mesh child) so hover scale doesn't distort it
      const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: createLabelTexture(game.planetName || game.title),
        transparent: true, depthWrite: false,
      }));
      label.position.set(radius, -size - 1.6, 0);
      label.scale.set(5.0, 0.625, 1);
      this.scene.add(label);
      this.characteristicObjects.push(label);

      this.planets.push({ mesh, game, angle: (index / filtered.length) * Math.PI * 2, radius, speed, label });
    });

    // === START SMOOTH TRANSITION ===
    if (hadOldContent) {
      // Hide new planets (they'll grow in during intro)
      for (const p of this.planets) {
        p.mesh.scale.setScalar(0.001);
        if (p.label) p.label.scale.set(0.005, 0.000625, 0.001);
      }
      // Hide new orbit rings
      for (const r of this.rings) r.visible = false;

      // Revert star to old colors — we'll animate to new colors
      this.currentStarColor.copy(oldStarColor);
      this.sunMaterial.color.copy(oldStarColor);
      this.sunMaterial.emissive.copy(oldEmissive);
      (this.innerGlow.material as THREE.SpriteMaterial).color.copy(oldGlowColor);
      (this.outerGlow.material as THREE.SpriteMaterial).color.copy(oldEmissive);
      this.ambientLight.color.copy(oldAmbient);

      // Camera zoom in for cinematic effect
      this.cameraTargetDistance = 16;

      this.transition = {
        progress: 0,
        oldPlanets, oldChars, oldRings,
        startStarColor: oldStarColor, endStarColor: newStarColor,
        startGlowColor: oldGlowColor, endGlowColor: newGlowColor,
        startEmissive: oldEmissive, endEmissive: newEmissive,
        startAmbient: oldAmbient, endAmbient: newAmbient,
        newPlanets: this.planets.map(p => ({ mesh: p.mesh, label: p.label as THREE.Sprite | null })),
      };
    } else {
      // No old content — clean up empty old arrays and show new immediately
      for (const obj of oldChars) { this.scene.remove(obj); this.disposeObject(obj); }
      for (const r of oldRings) { this.scene.remove(r); this.disposeObject(r); }
    }
  }

  private createOrbitRing(radius: number, starColor?: THREE.Color) {
    const segments = 192;
    const pts: THREE.Vector3[] = [];
    const colors: Float32Array = new Float32Array((segments + 1) * 3);
    const baseColor = starColor ? starColor.clone() : new THREE.Color(0x445577);
    const dimColor = baseColor.clone().multiplyScalar(0.3);

    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      const t = Math.abs(Math.sin(a * 0.5));
      const c = dimColor.clone().lerp(baseColor, t * 0.6 + 0.15);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.25, linewidth: 1 });
    const line = new THREE.Line(geo, mat);

    // Outer glow ring (larger, softer, additive)
    const glowPts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      glowPts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const glowGeo = new THREE.BufferGeometry().setFromPoints(glowPts);
    const glowMat = new THREE.LineBasicMaterial({
      color: starColor || 0x445577, transparent: true, opacity: 0.06,
    });
    const glowLine = new THREE.Line(glowGeo, glowMat);
    glowLine.scale.set(1.008, 1, 1.008);

    const group = new THREE.Group();
    group.add(line);
    group.add(glowLine);
    return group;
  }

  private createPlanetRings(size: number, chars: any) {
    const group = new THREE.Group();
    const rc = new THREE.Color(chars.ringColor || '#ffffff');
    const innerBase = size * 1.4;
    const bandWidth = (chars.ringWidth || 0.5) * size * 0.6;
    const count = chars.ringCount || 2;
    for (let i = 0; i < count; i++) {
      const innerR = innerBase + i * bandWidth * 1.2;
      const outerR = innerR + bandWidth;
      const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
      const t = i / Math.max(count - 1, 1);
      const bandColor = rc.clone().lerp(new THREE.Color(0xffffff), t * 0.2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: bandColor, transparent: true,
        opacity: (chars.ringOpacity || 0.4) * (1 - t * 0.3),
        side: THREE.DoubleSide, depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI * 0.45;
      ringMesh.rotation.z = Math.PI * 0.05 * (i + 1);
      group.add(ringMesh);
    }
    // Ring glow halo
    const glowGeo = new THREE.RingGeometry(innerBase - 0.05, innerBase + bandWidth * count * 1.2 + 0.1, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: rc, transparent: true, opacity: 0.06,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const glowRing = new THREE.Mesh(glowGeo, glowMat);
    glowRing.rotation.x = Math.PI * 0.45;
    group.add(glowRing);
    return group;
  }

  private createMoon(size: number, chars: any, index: number, total: number) {
    const group = new THREE.Group();
    const mc = new THREE.Color(chars.moonColor || '#cccccc');
    const orbR = chars.moonOrbitRadius || size * 2.5;
    const sz = chars.moonSize || 0.15;
    const geo = new THREE.SphereGeometry(sz, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: mc, roughness: 0.65, metalness: 0.15,
      emissive: mc, emissiveIntensity: 0.08,
    });
    const moonMesh = new THREE.Mesh(geo, mat);
    const angle = (index / total) * Math.PI * 2;
    moonMesh.position.set(Math.cos(angle) * orbR, 0.2, Math.sin(angle) * orbR);
    group.add(moonMesh);

    // Moon glow
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color: mc, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.1,
    }));
    moonGlow.scale.set(sz * 4, sz * 4, 1);
    moonMesh.add(moonGlow);

    return { group, moonMesh, orbR, angle, speed: 0.8 + index * 0.3 };
  }

  private createAtmosphere(size: number, chars: any) {
    const group = new THREE.Group();
    const ac = new THREE.Color(chars.atmoColor || '#ffffff');

    // Inner atmosphere shell
    const innerGeo = new THREE.SphereGeometry(size * 1.18, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: ac, transparent: true, opacity: (chars.atmoIntensity || 0.3) * 0.35,
      side: THREE.BackSide, depthWrite: false,
    });
    group.add(new THREE.Mesh(innerGeo, innerMat));

    // Outer haze shell
    const outerGeo = new THREE.SphereGeometry(size * 1.35, 32, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: ac.clone().lerp(new THREE.Color(0xffffff), 0.4),
      transparent: true, opacity: (chars.atmoIntensity || 0.3) * 0.12,
      side: THREE.BackSide, depthWrite: false,
    });
    group.add(new THREE.Mesh(outerGeo, outerMat));

    // Rim glow sprite
    const rimGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTexture, color: ac, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.15,
    }));
    rimGlow.scale.set(size * 5, size * 5, 1);
    group.add(rimGlow);

    return group;
  }

  private createAsteroidBelt(size: number, chars: any) {
    const group = new THREE.Group();
    const bc = new THREE.Color(chars.beltColor || '#888888');
    const count = chars.beltCount || 30;
    const width = (chars.beltWidth || 0.5) * size;
    const baseRadius = size * 1.8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const r = baseRadius + (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * 0.3;
      const sz = 0.03 + Math.random() * 0.06;
      const geo = new THREE.BoxGeometry(sz, sz * 0.6, sz);
      const mat = new THREE.MeshStandardMaterial({ color: bc, roughness: 0.9, metalness: 0.1 });
      const asteroid = new THREE.Mesh(geo, mat);
      asteroid.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(asteroid);
    }
    return group;
  }

  private onClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planetMeshes);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const planet = this.planets.find((p: any) => p.mesh === hit);
      if (planet) this.callbacks.onPlanetClick(planet.game);
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planetMeshes);

    if (this.hoveredMesh) {
      (this.hoveredMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.06;
      this.hoveredMesh.scale.set(1, 1, 1);
      this.hoveredMesh = null;
    }
    this.renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';
    if (intersects.length > 0) {
      const m = intersects[0].object as THREE.Mesh;
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
      m.scale.set(1.15, 1.15, 1.15);
      this.hoveredMesh = m;
    }
  };

  private animate = () => {
    if (!this.running) return;
    this.animId = requestAnimationFrame(this.animate);
    this.time += 0.004;

    for (const p of this.planets) {
      if (p.mesh === this.hoveredMesh) {
        // Pause orbit, still rotate for subtle alive feel
        p.mesh.rotation.y += 0.008;
        continue;
      }
      p.angle += p.speed * 0.006;
      const px = Math.cos(p.angle) * p.radius;
      const pz = Math.sin(p.angle) * p.radius;
      p.mesh.position.x = px;
      p.mesh.position.z = pz;
      p.mesh.rotation.y += 0.008;
      // Label follows planet position (scene child, not mesh child)
      if (p.label) {
        p.label.position.x = px;
        p.label.position.z = pz;
        p.label.position.y = -p.game.planetSize - 1.6;
      }
      if (p.mesh.userData.moons) {
        for (const moon of p.mesh.userData.moons) {
          moon.angle += moon.speed * 0.015;
          moon.mesh.position.x = Math.cos(moon.angle) * moon.orbR;
          moon.mesh.position.z = Math.sin(moon.angle) * moon.orbR;
        }
      }
    }

    // === TRANSITION: animate system switch ===
    if (this.transition) {
      this.transition.progress += 0.012;
      const t = Math.min(this.transition.progress, 1);
      const tr = this.transition;

      // Phase 1 — old planets shrink out (0→0.35)
      const outroT = Math.min(t / 0.35, 1);
      const outroScale = Math.max(1 - this.easeInOutCubic(outroT), 0.001);
      for (const op of tr.oldPlanets) {
        if (op.mesh.parent) op.mesh.scale.setScalar(outroScale);
        if (op.label?.parent) op.label.scale.set(5.0 * outroScale, 0.625 * outroScale, outroScale);
      }
      for (const oc of tr.oldChars) { if (oc.parent) oc.scale.setScalar(outroScale); }
      for (const or of tr.oldRings) { if (or.parent) or.scale.setScalar(outroScale); }

      // Phase 2 — star color morphs (0.2→0.6)
      const starT = this.easeInOutCubic(Math.min(Math.max((t - 0.2) / 0.4, 0), 1));
      const interpColor = tr.startStarColor.clone().lerp(tr.endStarColor, starT);
      const interpGlow = tr.startGlowColor.clone().lerp(tr.endGlowColor, starT);
      const interpEmissive = tr.startEmissive.clone().lerp(tr.endEmissive, starT);
      const interpAmbient = tr.startAmbient.clone().lerp(tr.endAmbient, starT);

      this.currentStarColor.copy(interpColor);
      this.sunMaterial.color.copy(interpColor);
      this.sunMaterial.emissive.copy(interpEmissive);
      (this.innerGlow.material as THREE.SpriteMaterial).color.copy(interpGlow);
      (this.outerGlow.material as THREE.SpriteMaterial).color.copy(interpEmissive);
      this.ambientLight.color.copy(interpAmbient);

      // Phase 3 — new planets grow in (0.5→1.0)
      const introT = this.easeInOutCubic(Math.min(Math.max((t - 0.5) / 0.5, 0), 1));
      for (const np of tr.newPlanets) {
        np.mesh.scale.setScalar(Math.max(introT, 0.001));
        if (np.label) {
          const s = Math.max(introT, 0.001);
          np.label.scale.set(5.0 * s, 0.625 * s, s);
        }
      }
      for (const r of this.rings) { r.visible = true; r.scale.setScalar(Math.max(introT, 0.001)); }

      // Camera zoom: in early, back out late
      if (t > 0.55) this.cameraTargetDistance = 26;

      // Cleanup
      if (t >= 1) {
        for (const op of tr.oldPlanets) {
          this.scene.remove(op.mesh);
          this.disposeObject(op.mesh);
          if (op.label) {
            this.scene.remove(op.label);
            this.disposeObject(op.label);
          }
        }
        for (const oc of tr.oldChars) {
          this.scene.remove(oc);
          this.disposeObject(oc);
        }
        for (const or of tr.oldRings) {
          this.scene.remove(or);
          this.disposeObject(or);
        }
        for (const np of tr.newPlanets) { np.mesh.scale.setScalar(1); if (np.label) np.label.scale.set(5.0, 0.625, 1); }
        for (const r of this.rings) r.scale.setScalar(1);
        this.transition = null;
      }
    }

    this.farStars.rotation.y += 0.00005;
    this.midStars.rotation.y += 0.0001;
    this.nearStars.rotation.y += 0.0002;
    this.nebulaClouds.rotation.y += 0.00003;
    this.nebulaClouds.rotation.x += 0.00001;
    this.sunMesh.rotation.y += 0.0015;

    // Orbit ring subtle pulse
    const ringPulse = 0.22 + Math.sin(this.time * 1.8) * 0.04;
    for (const ring of this.rings) {
      const line = ring.children[0] as THREE.Line;
      if (line && line.material) (line.material as THREE.LineBasicMaterial).opacity = ringPulse;
    }

    // Stronger glow pulse
    const pulse = 0.35 + Math.sin(this.time * 2.5) * 0.08;
    this.outerGlow.material.opacity = pulse;

    // Smooth camera distance (for transition zoom)
    this.cameraDistance += (this.cameraTargetDistance - this.cameraDistance) * 0.04;
    this.cameraAngle += this.cameraSpeed;
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance;
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance;
    this.camera.position.y = 12 + Math.sin(this.time * 0.15) * 2.5;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  };

  private scheduleResize = () => {
    if (this.resizeRaf) return;
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = null;
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  };

  /**
   * Dispose all GPU resources (geometry, material) recursively from an object and its children.
   * Disposes per-instance textures (like planet map textures) but skips shared textures
   * (starDotTexture, glowTexture) that are owned by the class and disposed in destroy().
   */
  private disposeObject(obj: THREE.Object3D) {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          // Dispose per-instance map textures (planet textures) but skip shared textures
          const texMat = mat as unknown as { map?: THREE.Texture };
          if (texMat.map && texMat.map !== this.starDotTexture && texMat.map !== this.glowTexture) {
            texMat.map.dispose();
          }
          mat.dispose();
        }
      }
    }
    // Recurse into children
    for (const child of obj.children) {
      this.disposeObject(child);
    }
  }

  /**
   * Remove all children from the scene and dispose their resources.
   */
  private clearScene() {
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      this.disposeObject(child);
    }
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.scheduleResize);
    this.renderer.domElement.removeEventListener('click', this.onClick);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    // Dispose all scene objects (geometries, materials, textures)
    this.clearScene();
    // Dispose shared textures created in constructor
    this.starDotTexture.dispose();
    this.glowTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
