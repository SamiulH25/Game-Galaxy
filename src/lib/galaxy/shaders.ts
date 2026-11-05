/**
 * GLSL for the galaxy. Noise is the classic 3D simplex noise by Ian McEwan / Stefan Gustavson
 * (webgl-noise, MIT licence).
 */

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
	const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
	vec3 i = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx);
	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);
	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + C.yyy;
	vec3 x3 = x0 - D.yyy;
	i = mod289(i);
	vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
	float n_ = 0.142857142857;
	vec3 ns = n_ * D.wyz - D.xzx;
	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_);
	vec4 x = x_ * ns.x + ns.yyyy;
	vec4 y = y_ * ns.x + ns.yyyy;
	vec4 h = 1.0 - abs(x) - abs(y);
	vec4 b0 = vec4(x.xy, y.xy);
	vec4 b1 = vec4(x.zw, y.zw);
	vec4 s0 = floor(b0) * 2.0 + 1.0;
	vec4 s1 = floor(b1) * 2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));
	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
	vec3 p0 = vec3(a0.xy, h.x);
	vec3 p1 = vec3(a0.zw, h.y);
	vec3 p2 = vec3(a1.xy, h.z);
	vec3 p3 = vec3(a1.zw, h.w);
	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
	p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
	vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
	m = m * m;
	return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
	float sum = 0.0;
	float amp = 0.5;
	for (int i = 0; i < 5; i++) {
		sum += amp * snoise(p);
		p = p * 2.03 + vec3(17.1, 9.2, 3.7);
		amp *= 0.5;
	}
	return sum;
}

float ridged(vec3 p) {
	float sum = 0.0;
	float amp = 0.5;
	for (int i = 0; i < 4; i++) {
		sum += amp * (1.0 - abs(snoise(p)));
		p *= 2.1;
		amp *= 0.5;
	}
	return sum;
}
`;

// ── Planet surface ──────────────────────────────────────────────────

export const PLANET_VERTEX = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
	vObj = position;
	vec4 world = modelMatrix * vec4(position, 1.0);
	vPosW = world.xyz;
	vNormalW = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const PLANET_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uAtmo;
uniform float uHasAtmo;
uniform float uSeed;
uniform int uKind; // 0 terran, 1 rocky, 2 gas, 3 ice, 4 lava, 5 ocean
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform float uTime;
uniform float uHighlight;
uniform float uDim;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;

${NOISE}

void main() {
	vec3 p = normalize(vObj);
	vec3 sp = p + vec3(uSeed * 31.0, uSeed * 17.0, uSeed * 7.0);
	vec3 albedo;
	vec3 emissive = vec3(0.0);
	float spec = 0.0;

	if (uKind == 0) { // terran: oceans, land, ice caps
		float h = fbm(sp * 1.8);
		float land = smoothstep(-0.02, 0.06, h);
		vec3 ocean = mix(uAccent * 0.45, uAccent, smoothstep(-0.5, 0.0, h));
		vec3 ground = mix(uColor, uColor * 1.35 + vec3(0.05, 0.03, 0.0), fbm(sp * 6.0) * 0.5 + 0.5);
		albedo = mix(ocean, ground, land);
		spec = (1.0 - land) * 0.6;
		float cap = smoothstep(0.78, 0.9, abs(p.y) + fbm(sp * 4.0) * 0.08);
		albedo = mix(albedo, vec3(0.92, 0.95, 1.0), cap);
	} else if (uKind == 1) { // rocky: craggy, cratered
		float h = fbm(sp * 2.4);
		float r = ridged(sp * 3.5);
		albedo = mix(uColor * 0.6, uColor * 1.25, h * 0.5 + 0.5);
		albedo = mix(albedo, uAccent * 0.8, smoothstep(0.55, 0.85, r) * 0.6);
	} else if (uKind == 2) { // gas giant: turbulent bands
		float warp = fbm(sp * vec3(1.2, 3.0, 1.2) + vec3(0.0, 0.0, uTime * 0.01));
		float bands = sin(p.y * 13.0 + warp * 3.2 + uSeed * 6.0);
		albedo = mix(uColor, uAccent, bands * 0.5 + 0.5);
		albedo *= 0.85 + 0.3 * fbm(sp * vec3(2.0, 10.0, 2.0));
		float storm = smoothstep(0.86, 0.92, 1.0 - length(p - normalize(vec3(0.6, -0.25, 0.75))));
		albedo = mix(albedo, uAccent * 1.3, storm);
	} else if (uKind == 3) { // ice: pale with cracks
		float c = ridged(sp * 3.0);
		albedo = mix(uColor, vec3(0.95, 0.98, 1.0), fbm(sp * 2.0) * 0.4 + 0.4);
		albedo = mix(albedo, uAccent * 0.7, smoothstep(0.82, 0.95, c));
		spec = 0.35;
	} else if (uKind == 4) { // lava: dark crust, glowing veins
		float c = ridged(sp * 2.6 + vec3(0.0, uTime * 0.004, 0.0));
		albedo = uColor * (0.7 + 0.5 * fbm(sp * 5.0));
		float vein = smoothstep(0.78, 0.93, c);
		emissive = uAccent * vein * (1.6 + 0.4 * sin(uTime * 1.3 + c * 20.0));
	} else { // ocean world: deep water, scattered islands
		float h = fbm(sp * 2.2);
		float isle = smoothstep(0.28, 0.34, h);
		albedo = mix(uColor * (0.7 + 0.4 * (h + 0.5)), uAccent, isle);
		spec = (1.0 - isle) * 0.8;
	}

	vec3 N = normalize(vNormalW);
	vec3 L = normalize(uLightPos - vPosW);
	vec3 V = normalize(cameraPosition - vPosW);
	float ndl = dot(N, L);
	float diffuse = smoothstep(-0.12, 0.6, ndl);
	vec3 H = normalize(L + V);
	float specular = spec * pow(max(dot(N, H), 0.0), 48.0) * step(0.0, ndl);
	float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

	vec3 color = albedo * (uLightColor * diffuse * 1.15 + vec3(0.025, 0.03, 0.05));
	color += uLightColor * specular * 0.6;
	color += emissive;
	color += uAtmo * uHasAtmo * fres * (0.25 + diffuse) * 0.9;
	color += vec3(0.55, 0.75, 1.0) * fres * uHighlight * 0.9;
	color *= uDim;

	gl_FragColor = vec4(color, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

// ── Atmosphere shell (rendered on a slightly larger back-faced sphere) ──

export const ATMO_VERTEX = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
	vec4 world = modelMatrix * vec4(position, 1.0);
	vPosW = world.xyz;
	vNormalW = normalize(mat3(modelMatrix) * normal);
	gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const ATMO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLightPos;
uniform float uStrength;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
	vec3 N = normalize(vNormalW);
	vec3 V = normalize(cameraPosition - vPosW);
	vec3 L = normalize(uLightPos - vPosW);
	// Back faces: -N·V is 0 at the shell's outer edge and grows toward the planet's silhouette.
	float rim = pow(clamp(-dot(N, V), 0.0, 1.0), 1.6);
	float lit = smoothstep(-0.3, 0.6, dot(N, L));
	float a = rim * (0.12 + lit) * uStrength;
	gl_FragColor = vec4(uColor * a, a);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

// ── Star surface ────────────────────────────────────────────────────

export const STAR_VERTEX = PLANET_VERTEX;

export const STAR_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uSeed;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
${NOISE}
void main() {
	vec3 p = normalize(vObj) * 2.2 + vec3(uSeed * 10.0);
	float n = fbm(p + vec3(0.0, uTime * 0.03, uTime * 0.02));
	float cells = ridged(p * 2.0 - vec3(uTime * 0.02));
	vec3 V = normalize(cameraPosition - vPosW);
	float limb = pow(max(dot(normalize(vNormalW), V), 0.0), 0.45);
	vec3 hot = mix(uColor, vec3(1.0), 0.35);
	vec3 color = mix(uColor * 0.9, hot, smoothstep(-0.3, 0.6, n)) * (0.85 + cells * 0.35);
	color *= 0.55 + 0.75 * limb;
	gl_FragColor = vec4(color * 1.7, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

// ── Billboard glow (corona / galaxy core) ───────────────────────────

export const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
	vec2 scale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
	mv.xy += position.xy * scale;
	gl_Position = projectionMatrix * mv;
}
`;

export const GLOW_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
void main() {
	vec2 c = vUv - 0.5;
	float d = length(c) * 2.0;
	float ang = atan(c.y, c.x);
	float rays = 0.85 + 0.15 * sin(ang * 7.0 + uTime * 0.3) * sin(ang * 3.0 - uTime * 0.2);
	float g = exp(-d * 4.2) * 1.2 + exp(-d * 1.6) * 0.35 * rays;
	g *= smoothstep(1.0, 0.7, d);
	gl_FragColor = vec4(uColor * g * uIntensity, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

// ── Planet rings ────────────────────────────────────────────────────

export const RING_VERTEX = /* glsl */ `
varying vec3 vLocal;
varying vec3 vPosW;
void main() {
	vLocal = position;
	vec4 world = modelMatrix * vec4(position, 1.0);
	vPosW = world.xyz;
	gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const RING_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uInner;
uniform float uOuter;
uniform float uSeed;
uniform vec3 uLightPos;
uniform vec3 uPlanetPos;
uniform float uPlanetRadius;
uniform float uDim;
varying vec3 vLocal;
varying vec3 vPosW;
float hash(float n) { return fract(sin(n) * 43758.5453); }
float noise1(float x) { float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main() {
	float r = (length(vLocal.xy) - uInner) / (uOuter - uInner);
	float bands = noise1(r * 38.0 + uSeed * 50.0) * 0.6 + noise1(r * 110.0 + uSeed * 20.0) * 0.4;
	float edge = smoothstep(0.0, 0.06, r) * smoothstep(1.0, 0.9, r);
	float gap = smoothstep(0.02, 0.05, abs(r - 0.62));
	float alpha = edge * gap * (0.25 + bands * 0.6);
	// Planet shadow on the ring.
	vec3 toLight = normalize(uLightPos - vPosW);
	vec3 toPlanet = uPlanetPos - vPosW;
	float along = dot(toPlanet, toLight);
	float perp = length(toPlanet - toLight * along);
	float shadow = along > 0.0 ? smoothstep(uPlanetRadius * 0.9, uPlanetRadius * 1.1, perp) : 1.0;
	vec3 color = uColor * (0.35 + 0.75 * shadow) * (0.75 + bands * 0.5) * uDim;
	gl_FragColor = vec4(color * alpha, alpha);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;

// ── Galaxy disc & background stars (points) ─────────────────────────

export const POINTS_VERTEX = /* glsl */ `
attribute float aSize;
attribute float aTwinkle;
varying vec3 vColor;
varying float vAlpha;
uniform float uTime;
uniform float uPixelRatio;
uniform float uScale;
uniform float uMaxSize;
void main() {
	vColor = color;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aTwinkle * 2.0) + aTwinkle * 40.0);
	float depth = -mv.z;
	// Fade points that sit right in front of the camera so they never become giant blobs.
	vAlpha = tw * smoothstep(3.0, 26.0, depth);
	gl_PointSize = aSize * uPixelRatio * uScale / max(depth, 1.0);
	gl_PointSize = clamp(gl_PointSize, 0.0, uMaxSize * uPixelRatio);
	gl_Position = projectionMatrix * mv;
}
`;

export const POINTS_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
uniform float uOpacity;
void main() {
	vec2 c = gl_PointCoord - 0.5;
	float d = length(c) * 2.0;
	float a = smoothstep(1.0, 0.0, d);
	a = a * a * vAlpha * uOpacity;
	gl_FragColor = vec4(vColor * a, a);
	#include <colorspace_fragment>
}
`;

// ── Nebula sky (back-faced sphere) ──────────────────────────────────

export const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
	vDir = normalize(position);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAGMENT = /* glsl */ `
varying vec3 vDir;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
${NOISE}
void main() {
	vec3 d = normalize(vDir);
	float n1 = fbm(d * 1.6 + vec3(3.1, 1.7, 0.4));
	float n2 = fbm(d * 3.4 - vec3(1.2, 4.5, 2.2));
	float band = exp(-pow(d.y * 2.6 + n1 * 0.6, 2.0));
	vec3 col = vec3(0.004, 0.006, 0.014);
	col += uA * smoothstep(0.05, 0.8, n1) * 0.045 * (0.3 + band);
	col += uB * smoothstep(0.1, 0.85, n2) * 0.05 * band;
	col += uC * pow(max(n1 * n2, 0.0), 1.2) * 0.2 * band;
	gl_FragColor = vec4(col, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}
`;
