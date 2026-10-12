/*
  GLSL for the Echo Tunnel. The tunnel bends away from the camera; the same bend is mirrored in JS
  (bendX / bendY in engine.ts) so the light gates follow the walls exactly.
*/

export const TUNNEL_LENGTH = 110;
export const TUNNEL_RADIUS = 4;
export const HISTORY = 64; // rows of spectrum history = how far an echo travels down the tunnel
export const BANDS = 64;

const L = TUNNEL_LENGTH.toFixed(1);
const R = TUNNEL_RADIUS.toFixed(1);

const bend = /* glsl */ `
  uniform float uTime;
  vec2 bend(float z) {
    float d = clamp(-z / ${L}, 0.0, 1.0);
    float k = pow(d, 1.5) * 15.0;
    return vec2(sin(z * 0.045 + uTime * 0.35), cos(z * 0.032 + uTime * 0.27) * 0.8) * k;
  }
`;

// "lights on": light floods from the camera into the depth while uIntro goes 0 -> 1
const introMask = /* glsl */ `
  uniform float uIntro;
  float introMask(float depth) {
    return 1.0 - smoothstep(uIntro * 1.2 - 0.2, uIntro * 1.2, depth);
  }
`;

/* ---------------- wall ---------------- */

export const tunnelVertex = /* glsl */ `
  ${bend}
  uniform sampler2D uHistory;
  uniform float uHead;
  uniform float uOpen;
  varying float vDepth;
  varying float vAmp;
  varying float vSide;
  varying float vZ;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  // displaced wall point for a direction n around the axis at depth z
  vec3 wallPoint(vec2 n, float z, out float amp) {
    float d = clamp(-z / ${L}, 0.0, 1.0);
    // 0 at the floor (bass) -> 1 at the ceiling (treble), mirrored left/right
    float side = acos(clamp(-n.y, -1.0, 1.0)) / 3.14159265;
    // the newest spectrum row is at the camera; older rows lie deeper in the tunnel
    float row = uHead - d * ${((HISTORY - 1) / HISTORY).toFixed(4)};
    amp = texture2D(uHistory, vec2(0.02 + side * 0.9, row)).r;
    float r = ${R} * (1.0 - amp * 0.3 * (0.35 + 0.65 * (1.0 - d))) * (1.0 + uOpen * 2.5);
    return vec3(n * r + bend(z), z);
  }

  void main() {
    vec2 n = normalize(position.xy);
    float z = position.z;
    float amp;
    vec3 p = wallPoint(n, z, amp);

    // analytic normal: neighbours one history texel away around and along the wall
    const float e = 3.14159265 / 64.0;
    float c = cos(e);
    float s = sin(e);
    float dz = ${(TUNNEL_LENGTH / (HISTORY - 1)).toFixed(4)};
    float t;
    vec3 pa = wallPoint(vec2(n.x * c - n.y * s, n.x * s + n.y * c), z, t);
    vec3 pb = wallPoint(vec2(n.x * c + n.y * s, -n.x * s + n.y * c), z, t);
    vec3 pc = wallPoint(n, z - dz, t);
    vec3 pd = wallPoint(n, z + dz, t);
    vec3 N = normalize(cross(pa - pb, pc - pd));
    if (dot(N, vec3(bend(z) - p.xy, 0.0)) < 0.0) N = -N; // face the axis (we look from inside)

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormal = normalize(normalMatrix * N);
    vViewPos = mv.xyz;
    vDepth = clamp(-z / ${L}, 0.0, 1.0);
    vAmp = amp;
    vSide = acos(clamp(-n.y, -1.0, 1.0)) / 3.14159265;
    vZ = z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const tunnelFragment = /* glsl */ `
  #ifndef ROCK_OCTAVES
  #define ROCK_OCTAVES 2
  #endif
  ${introMask}
  uniform float uTravel;
  uniform float uBass;
  uniform vec3 uAcid;
  uniform vec3 uCoral;
  uniform vec3 uCyan;
  uniform vec3 uNight;
  uniform vec3 uPlum;
  uniform vec3 uDusk;
  uniform vec3 uHaze;
  uniform vec3 uLightView;
  uniform float uLightGain;
  uniform float uGateSpacing;
  uniform float uGateOffset;
  uniform float uGateGain;
  uniform float uCamZ;
  uniform float uShock;
  uniform float uShockAmt;
  uniform float uOpen;
  varying float vDepth;
  varying float vAmp;
  varying float vSide;
  varying float vZ;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  // lattice hash wraps every 289 cells, so the rock tiles seamlessly however far we travel
  float hash(vec2 p) {
    p = mod(p, 289.0);
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < ROCK_OCTAVES; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }

  // distance (in cells) to the nearest integer of coord
  float cellDist(float coord) {
    return abs(fract(coord + 0.5) - 0.5);
  }
  float gridLine(float coord, float width) {
    float w = fwidth(coord) * 1.2 + width;
    return 1.0 - smoothstep(width, w, cellDist(coord));
  }
  // wide groove every k cells, plus a 1 px highlight on one lip
  vec2 seam(float coord, float k) {
    float fw = fwidth(coord);
    float sd = (fract(coord / k + 0.5) - 0.5) * k;
    float groove = 1.0 - smoothstep(0.06, 0.06 + fw * 1.5, abs(sd));
    float lip = 1.0 - smoothstep(0.0, fw * 1.2, abs(sd - 0.06 - fw));
    return vec2(groove, lip);
  }

  void main() {
    vec2 g = vec2(vSide * 18.0, (vZ + uTravel) * 0.32);
    float mask = introMask(vDepth);

    vec3 hue = mix(uAcid, uCoral, smoothstep(0.04, 0.42, vDepth));
    hue = mix(hue, uCyan, smoothstep(0.45, 0.85, vDepth));
    hue = mix(hue, uCyan, smoothstep(0.55, 1.0, vSide) * 0.5);

    // granite between the grid lines: plum -> dusk with sparse lighter flecks
    float rock = fbm(g * vec2(0.9, 1.1));
    vec3 base = mix(uPlum * 1.15, uDusk, smoothstep(0.32, 0.72, rock));
    base += uHaze * 0.12 * step(0.9, vnoise(g * 4.3 + 3.7));
    vec2 sr = seam(g.x, 6.0);
    vec2 sg = seam(g.y, 4.0);
    float groove = max(sr.x, sg.x);
    base *= mix(1.0, 0.35, groove);
    base += uHaze * 0.22 * max(sr.y, sg.y);

    // stage light travelling down the tunnel: half-Lambert + Blinn-Phong + fresnel rim
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    vec3 Lv = uLightView - vViewPos;
    float dist = length(Lv);
    vec3 Ld = Lv / dist;
    float att = uLightGain / (1.0 + dist * dist * 0.02);
    vec3 lightCol = mix(vec3(1.0, 0.88, 0.92), hue, 0.35) * 1.6;
    float wrap = dot(N, Ld) * 0.5 + 0.5;
    float wet = 1.0 - smoothstep(0.12, 0.18, vSide); // glossy floor band
    float spec = pow(max(dot(N, normalize(Ld + V)), 0.0), 48.0) * (0.25 + vAmp * 2.2) * (1.0 + wet * 3.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 col = base * (0.3 + vAmp * 1.2 + wrap * wrap * att * lightCol);
    col += lightCol * spec * att;
    col += hue * fres * (0.18 + vAmp * 0.6);

    // neon grid with a soft wide glow on every tier
    float rings = gridLine(g.y, 0.02);
    float ribs = gridLine(g.x, 0.015);
    float grid = max(rings, ribs * 0.55);
    float glow = (exp(-cellDist(g.y) * 12.0) + exp(-cellDist(g.x) * 12.0) * 0.55) * 0.25;
    col += hue * (grid + glow) * (0.55 + vAmp * 2.6) * mask;
    col += hue * vAmp * vAmp * 0.9;
    col += uAcid * uBass * grid * 0.6 * (1.0 - vDepth) * mask;

    // gate light spill: nearest gate plane, its colour picked like the JS (i % 3)
    float zz = -vZ - 1.5;
    float gg = (zz + uGateOffset) / uGateSpacing;
    float k = floor(gg + 0.5);
    float dzz = (gg - k) * uGateSpacing;
    float idx = mod(k, 3.0);
    vec3 gateHue = idx < 0.5 ? uAcid : (idx < 1.5 ? uCoral : uCyan);
    float near = clamp((uCamZ - vZ - 1.5) / 6.0, 0.0, 1.0);
    float spill = exp(-dzz * dzz * 1.6) * (0.35 + vAmp);
    // wet floor: a stretched, mirrored reflection of the same gate
    spill += wet * exp(-(dzz + 0.9) * (dzz + 0.9) * 0.5) * 0.6;
    col += gateHue * spill * uGateGain * near * mask;

    // the drop: a white shockwave racing down the tunnel
    float sz = (vZ + uShock * ${L}) * 0.45;
    col += vec3(1.0) * exp(-sz * sz) * uShockAmt * 1.6;

    float fog = smoothstep(0.25, 0.98, vDepth);
    col = mix(col, uNight, fog);
    col = mix(col, uNight, uOpen * 0.9); // the walls open and fade away
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ---------------- LED gates (instanced) ---------------- */

const gateCommon = /* glsl */ `
  ${introMask}
  varying vec3 vCol;
  varying float vFog;
  varying float vMask;
  void gateVaryings(vec4 world, vec4 mv) {
    #ifdef USE_INSTANCING_COLOR
      vCol = instanceColor;
    #else
      vCol = vec3(1.0);
    #endif
    vMask = introMask(clamp(-world.z / ${L}, 0.0, 1.0));
    vFog = smoothstep(22.0, ${(TUNNEL_LENGTH * 0.92).toFixed(1)}, -mv.z);
  }
`;

export const ledVertex = /* glsl */ `
  ${gateCommon}
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vV = -mv.xyz;
    gateVaryings(world, mv);
    gl_Position = projectionMatrix * mv;
  }
`;

export const ledFragment = /* glsl */ `
  uniform vec3 uNight;
  varying vec3 vCol;
  varying float vFog;
  varying float vMask;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // hot HDR core that rolls off to the instance colour at grazing angles
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
    vec3 core = vCol * 2.2 + vec3(0.15) * dot(vCol, vec3(0.333));
    vec3 col = mix(core, vCol, f) * vMask;
    col = mix(col, uNight, vFog);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ---------------- halo sprites (the bloom replacement) ---------------- */

export const haloVertex = /* glsl */ `
  ${gateCommon}
  varying float vR;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vR = length(position.xy);
    gateVaryings(world, mv);
    gl_Position = projectionMatrix * mv;
  }
`;

export const haloFragment = /* glsl */ `
  uniform float uHaloGain;
  uniform float uHaloRadius;
  varying vec3 vCol;
  varying float vFog;
  varying float vMask;
  varying float vR;
  void main() {
    float d = (vR - uHaloRadius) / 0.42;
    float a = exp(-d * d * 2.2);
    gl_FragColor = vec4(vCol * a * uHaloGain * vMask * (1.0 - vFog), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ---------------- far portal: the quarry exit ---------------- */

export const portalVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const portalFragment = /* glsl */ `
  ${introMask}
  uniform vec3 uCoral;
  uniform vec3 uCyan;
  uniform float uBass;
  uniform float uPortalCore;
  uniform float uOpen;
  varying vec2 vUv;
  void main() {
    float r = length(vUv);
    float pulse = 1.0 + uBass * 0.35;
    // white core -> coral -> night (additive, so "night" is simply nothing)
    vec3 col = vec3(1.0, 0.92, 0.9) * exp(-r * r * 90.0) * 2.4 * uPortalCore * pulse;
    col += uCoral * exp(-r * r * 9.0) * (0.75 + uOpen * 0.5) * pulse;
    col += uCoral * exp(-r * 3.2) * 0.18;
    // thin cyan ring around the opening
    float ring = (r - 0.36) / 0.012;
    col += uCyan * exp(-ring * ring) * 0.8 * (1.0 - uOpen);
    col *= smoothstep(1.0, 0.7, r) * introMask(0.97);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/* ---------------- sparks ---------------- */

export const sparkVertex = /* glsl */ `
  ${bend}
  uniform float uTravel;
  uniform float uPixelRatio;
  attribute vec4 aSeed; // angle, radius, phase, size
  varying float vFade;
  varying float vHue;

  void main() {
    float z = -mod(aSeed.z * ${L} - uTravel * 1.4, ${L});
    float a = aSeed.x + uTime * 0.12 * (aSeed.w > 0.5 ? 1.0 : -1.0);
    vec3 p = vec3(cos(a) * aSeed.y, sin(a) * aSeed.y, z);
    p.xy += bend(z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.0 + aSeed.w * 2.5) * uPixelRatio * 18.0 / max(0.5, -mv.z);
    float d = -z / ${L};
    vFade = smoothstep(0.0, 0.04, d) * (1.0 - smoothstep(0.45, 0.95, d));
    vHue = aSeed.w;
  }
`;

export const sparkFragment = /* glsl */ `
  uniform vec3 uAcid;
  uniform vec3 uCoral;
  uniform vec3 uCyan;
  varying float vFade;
  varying float vHue;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c));
    vec3 col = vHue < 0.33 ? uAcid : (vHue < 0.66 ? uCoral : uCyan);
    gl_FragColor = vec4(col * 1.6, a * vFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
