/*
  GLSL for the main stage world in front of the tunnel: LED wall, rig, beams, lasers, crowd, phones,
  confetti, haze, quarry and sky. Everything is cheap math or one lookup in a small tiling noise texture
  (no inline multi-octave noise), so all programs compile fast on ANGLE/D3D11.
*/

export const WALL_Z = 6.4; // LED wall plane; the tunnel mouth sits in a hole in its centre
export const MOUTH_R = 3.5;

const common = /* glsl */ `
  uniform float uTime;
  uniform float uBeat;      // 0..1 envelope, 1 on each kick
  uniform float uBeatPhase; // 0..1 inside the current beat
  uniform float uBeatClock; // beats since start
  uniform float uIntro;
  uniform float uPixelRatio;
  uniform vec3 uAcid;
  uniform vec3 uCoral;
  uniform vec3 uCyan;
  uniform vec3 uNight;
  uniform vec3 uPlum;
  // acid -> coral -> cyan -> acid
  vec3 stageHue(float k) {
    k = mod(k, 3.0);
    return k < 1.0 ? mix(uAcid, uCoral, k) : (k < 2.0 ? mix(uCoral, uCyan, k - 1.0) : mix(uCyan, uAcid, k - 2.0));
  }
`;

const tail = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/* ---------------- LED wall ---------------- */

export const wallVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const wallFragment = /* glsl */ `
  ${common}
  uniform sampler2D uHistory;
  uniform float uHead;
  uniform float uFly;
  varying vec2 vP;
  void main() {
    vec2 p = vP;
    float r = length(p);
    float ang = atan(p.y, p.x);

    // echo wavefronts leaving the tunnel mouth, one every two beats; the colour moves on with each one
    float wv = uBeatClock * 0.5 - (r - ${MOUTH_R.toFixed(1)}) * 0.24;
    float w = fract(wv);
    float rings = exp(-w * 34.0) * 1.3 * (1.0 - smoothstep(0.97, 1.0, w)) + exp(-fract(wv * 3.0) * 40.0) * 0.25;
    vec3 hue = stageHue(floor(wv) * 1.0);
    float reach = 1.0 - smoothstep(7.0, 19.0, r);
    vec3 col = hue * rings * reach * (0.5 + uBeat * 0.7);
    // dim plum base so the wall reads as a lit screen, darker towards the edges
    col += uPlum * 0.35 * (1.0 - smoothstep(4.0, 20.0, r));

    // fine rotating spokes
    float spokes = pow(abs(cos(ang * 12.0 + uTime * 0.25)), 60.0);
    col += mix(uCoral, uCyan, 0.5 + 0.5 * sin(ang * 3.0)) * spokes * 0.22 * reach;

    // spectrum bars on the wings (newest row of the shared audio history)
    float bx = abs(p.x);
    float bi = floor(bx / 0.9);
    float amp = texture2D(uHistory, vec2(0.02 + clamp((bi - 8.0) / 14.0, 0.0, 1.0) * 0.9, uHead)).r;
    float barTop = -4.2 + amp * 15.0;
    float bars = step(p.y, barTop) * step(0.18, fract(bx / 0.9)) * smoothstep(8.5, 10.5, bx);
    vec3 barCol = mix(uAcid, uCoral, clamp((p.y + 4.2) / 14.0, 0.0, 1.0));
    col += barCol * bars * (0.45 + uBeat * 0.35);
    // peak caps
    col += vec3(1.0) * bars * (1.0 - smoothstep(0.0, 0.25, barTop - p.y)) * 0.6;

    // hot rim around the mouth
    float rim = exp(-max(r - ${MOUTH_R.toFixed(1)}, 0.0) * 0.8);
    col += mix(uCoral, uAcid, uBeat) * rim * (0.5 + uBeat * 0.9);

    // later chapters: the wall strobes white on the beat
    col += vec3(0.9, 0.85, 1.0) * uBeat * uFly * 0.5 * reach;

    // LED pixels and cabinet seams, both faded with distance so they never shimmer
    vec2 cell = p * 9.0;
    vec2 f = abs(fract(cell) - 0.5);
    float fw = fwidth(cell.x);
    float dots = mix(1.0 - smoothstep(0.38, 0.5, max(f.x, f.y)) * 0.55, 0.75, clamp(fw * 1.2, 0.0, 1.0));
    vec2 cab = abs(fract(p / 2.0) - 0.5) * 2.0;
    float seam = smoothstep(0.97, 0.99, max(cab.x, cab.y)) * (1.0 - clamp(fwidth(p.x) * 4.0, 0.0, 1.0));
    col *= dots * (1.0 - seam * 0.85);
    col = col * uIntro + vec3(0.016, 0.011, 0.026);
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

/* ---------------- rig / deck / speakers: dark metal lit from behind ---------------- */

export const rigVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vC;
  void main() {
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vW = w.xyz;
    #ifdef USE_INSTANCING_COLOR
      vC = instanceColor;
    #else
      vC = vec3(0.02);
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const rigFragment = /* glsl */ `
  ${common}
  varying vec3 vN;
  varying vec3 vW;
  varying vec3 vC;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    float rim = pow(1.0 - abs(dot(N, V)), 2.5);
    float back = max(-N.z, 0.0);
    float top = max(N.y, 0.0);
    vec3 glow = mix(uCoral, uCyan, 0.5 + 0.5 * sin(vW.x * 0.12 + uTime * 0.4));
    vec3 col = vC + glow * (rim * 0.55 + back * 0.2 + top * 0.06) * (0.45 + uBeat * 0.5) * uIntro;
    vec3 R = reflect(-V, N);
    col += vec3(0.7, 0.62, 0.8) * pow(max(dot(R, normalize(vec3(0.0, 0.6, -1.0))), 0.0), 20.0) * 0.35 * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

/* ---------------- crowd: thousands of instanced silhouettes that jump on the beat ---------------- */

export const crowdVertex = /* glsl */ `
  ${common}
  attribute vec4 aCrowd; // phase, energy, arms up (0/1), height
  attribute float aPart; // 0 body, 1 arm
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 pos = position;
    // arms down fold into the shoulder (zero-area triangles)
    if (aPart > 0.5) pos = mix(vec3(sign(pos.x) * 0.2, 1.35, pos.z), pos, aCrowd.z);
    pos.y *= aCrowd.w;
    vec4 w = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    float hop = max(0.0, sin((uBeatPhase + aCrowd.x * 0.18) * 6.2831853));
    w.y += hop * hop * 0.22 * aCrowd.y;
    w.x += aPart * sin(uTime * 2.2 + aCrowd.x * 6.28) * 0.12 * max(pos.y - 1.3, 0.0);
    vN = normalize(mat3(instanceMatrix) * normal);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const crowdFragment = /* glsl */ `
  ${common}
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(vec3(0.0, 4.0, ${WALL_Z.toFixed(1)}) - vW);
    float facing = max(dot(N, L), 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    float d = length(vW.xz - vec2(0.0, ${WALL_Z.toFixed(1)}));
    float fall = 1.0 / (1.0 + d * d * 0.0025);
    vec3 glow = stageHue(vW.x * 0.03 + uBeatClock / 16.0);
    float top = max(N.y, 0.0);
    float light = rim * (0.45 + 0.55 * facing) * 1.3 + facing * 0.35 + top * 0.12;
    vec3 col = vec3(0.008, 0.006, 0.014) + glow * light * fall * (0.55 + uBeat * 0.6) * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

/* ---------------- light rays: moving-head beams and lasers (camera-facing quads) ---------------- */

export const rayVertex = /* glsl */ `
  ${common}
  attribute vec4 aRayA; // origin xyz, phase
  attribute vec4 aRayB; // yaw base, yaw swing, pitch base, length
  attribute vec4 aRayC; // colour index, end width, speed, kind (0 up beam, 1 down beam, 2 laser)
  varying vec2 vUv;
  varying vec3 vW;
  varying vec3 vCol;
  varying float vKind;
  varying float vView;
  varying float vNear;
  void main() {
    float t = uTime * aRayC.z + aRayA.w * 6.2831853;
    float yaw = aRayB.x + sin(t) * aRayB.y;
    float pitch = aRayB.z + sin(t * 1.31 + aRayA.w * 3.0) * (aRayC.w > 1.5 ? 0.12 : 0.22);
    vec3 d = vec3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch));
    float s = position.y + 0.5;
    vec3 c = aRayA.xyz + d * aRayB.w * s;
    vec3 toCam = normalize(cameraPosition - c);
    vec3 side = normalize(cross(d, toCam));
    float wStart = aRayC.w > 1.5 ? 0.18 : 0.25;
    float width = mix(wStart, aRayC.y, s);
    vec3 wp = c + side * position.x * width;
    vUv = vec2(position.x * 2.0, s);
    vW = wp;
    vView = abs(dot(d, toCam));
    vNear = smoothstep(1.5, 7.0, length(cameraPosition - wp));
    vKind = aRayC.w;
    vCol = stageHue(aRayC.x + floor(uBeatClock / 16.0) * (aRayC.w > 1.5 ? 1.0 : 0.5));
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

export const rayFragment = /* glsl */ `
  ${common}
  uniform sampler2D uNoise;
  uniform vec3 uRayGain; // up beams, down beams, lasers
  varying vec2 vUv;
  varying vec3 vW;
  varying vec3 vCol;
  varying float vKind;
  varying float vView;
  varying float vNear;
  void main() {
    float x = vUv.x;
    vec3 col;
    if (vKind > 1.5) {
      float core = exp(-x * x * 70.0);
      float glow = exp(-x * x * 5.0) * 0.18;
      float along = pow(1.0 - vUv.y, 0.7);
      col = (vCol * (core * 1.6 + glow) + vec3(core * 0.6)) * along * uRayGain.z;
    } else {
      // haze: two drifting lookups of the tiling noise texture give the beam its smoky body
      float h1 = texture2D(uNoise, vW.xy * 0.035 + vec2(uTime * 0.012, -uTime * 0.02)).r;
      float h2 = texture2D(uNoise, vW.zy * 0.05 + vec2(-uTime * 0.01, uTime * 0.015) + 0.37).r;
      float haze = 0.3 + 1.5 * h1 * h2;
      float edge = exp(-x * x * 3.2);
      float along = pow(1.0 - vUv.y, 1.5) * smoothstep(0.0, 0.03, vUv.y);
      float gain = vKind > 0.5 ? uRayGain.y : uRayGain.x;
      col = vCol * edge * along * haze * (0.22 + vView * 0.5) * gain;
      col += vec3(1.0) * exp(-vUv.y * 40.0) * edge * 0.6 * gain; // hot spot at the lens
    }
    col *= uIntro * vNear;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

/* ---------------- points: phones, confetti, lens flares, stars ---------------- */

export const phoneVertex = /* glsl */ `
  ${common}
  attribute vec4 aPhone; // x, y, z, seed
  varying float vFlash;
  varying float vSeed;
  void main() {
    vec3 p = aPhone.xyz;
    float hop = max(0.0, sin((uBeatPhase + fract(aPhone.w * 7.0) * 0.18) * 6.2831853));
    p.y += hop * hop * 0.2;
    p.x += sin(uTime * 1.4 + aPhone.w * 20.0) * 0.1;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float f = fract(uTime * 0.11 + aPhone.w * 13.7);
    vFlash = smoothstep(0.975, 0.985, f) * (1.0 - smoothstep(0.99, 1.0, f));
    vSeed = aPhone.w;
    gl_PointSize = uPixelRatio * (14.0 + vFlash * 50.0) / max(1.0, -mv.z) * 9.0;
  }
`;

export const phoneFragment = /* glsl */ `
  ${common}
  varying float vFlash;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = 1.0 - smoothstep(0.07, 0.15, d);
    float glow = exp(-d * d * 24.0) * 0.45;
    vec3 screen = mix(vec3(0.75, 0.88, 1.0), vec3(1.0, 0.86, 0.7), step(0.6, vSeed));
    vec3 col = screen * (core + glow) * 2.0 + vec3(1.0) * vFlash * exp(-d * d * 18.0) * 3.0;
    gl_FragColor = vec4(col * uIntro, 1.0);
    ${tail}
  }
`;

export const confettiVertex = /* glsl */ `
  ${common}
  attribute vec4 aSeed; // x, z, phase, size
  varying float vAngle;
  varying float vFlip;
  varying float vHue;
  void main() {
    float fallT = fract(aSeed.z + uTime * 0.035 * (0.6 + aSeed.w));
    vec3 p = vec3(aSeed.x + sin(uTime * 1.1 + aSeed.z * 20.0) * 0.8, 17.0 - fallT * 24.0, aSeed.y);
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAngle = uTime * (1.5 + aSeed.w * 3.0) + aSeed.z * 10.0;
    vFlip = abs(cos(uTime * (2.0 + aSeed.w * 2.0) + aSeed.z * 31.0));
    vHue = fract(aSeed.z * 7.31);
    gl_PointSize = uPixelRatio * (5.0 + aSeed.w * 5.0) * 10.0 / max(1.0, -mv.z);
  }
`;

export const confettiFragment = /* glsl */ `
  ${common}
  varying float vAngle;
  varying float vFlip;
  varying float vHue;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float cs = cos(vAngle);
    float sn = sin(vAngle);
    c = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
    if (abs(c.x) > 0.42 || abs(c.y) > 0.06 + 0.16 * vFlip) discard;
    vec3 col = vHue < 0.25 ? vec3(1.0) : stageHue(vHue * 3.0);
    col *= (0.35 + vFlip * 0.9) * (0.8 + uBeat * 0.4);
    gl_FragColor = vec4(col * uIntro, 1.0);
    ${tail}
  }
`;

export const lensVertex = /* glsl */ `
  ${common}
  attribute vec4 aLens; // x, y, z, seed
  uniform float uLensGain;
  varying float vSeed;
  void main() {
    vec4 mv = viewMatrix * vec4(aLens.xyz, 1.0);
    gl_Position = projectionMatrix * mv;
    vSeed = aLens.w;
    gl_PointSize = uPixelRatio * 900.0 / max(1.0, -mv.z) * (0.7 + uBeat * 0.5) * uLensGain;
  }
`;

export const lensFragment = /* glsl */ `
  ${common}
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float star = exp(-abs(c.x) * 60.0) * exp(-abs(c.y) * 7.0) + exp(-abs(c.y) * 60.0) * exp(-abs(c.x) * 7.0);
    float core = exp(-d * d * 400.0);
    vec3 col = (vec3(1.0, 0.95, 0.98) * (core * 2.5 + star * 0.5) + stageHue(vSeed * 3.0) * exp(-d * d * 60.0) * 0.4);
    gl_FragColor = vec4(col * uIntro, 1.0);
    ${tail}
  }
`;

export const starVertex = /* glsl */ `
  ${common}
  attribute vec4 aStar;
  varying float vTw;
  void main() {
    vec4 mv = viewMatrix * vec4(aStar.xyz, 1.0);
    gl_Position = projectionMatrix * mv;
    vTw = 0.55 + 0.45 * sin(uTime * (0.8 + aStar.w * 2.0) + aStar.w * 40.0);
    gl_PointSize = uPixelRatio * (1.2 + aStar.w * 1.6);
  }
`;

export const starFragment = /* glsl */ `
  varying float vTw;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = 1.0 - smoothstep(0.1, 0.5, length(c));
    gl_FragColor = vec4(vec3(0.85, 0.82, 1.0) * a * vTw * 0.8, 1.0);
    ${tail}
  }
`;

/* ---------------- haze sheets (additive, noise-textured) ---------------- */

export const hazeVertex = /* glsl */ `
  attribute float aLayer;
  varying vec2 vUv;
  varying float vLayer;
  void main() {
    vUv = uv;
    vLayer = aLayer;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const hazeFragment = /* glsl */ `
  ${common}
  uniform sampler2D uNoise;
  varying vec2 vUv;
  varying float vLayer;
  void main() {
    float n1 = texture2D(uNoise, vUv * vec2(2.2, 0.9) + vec2(uTime * 0.008 * (1.0 + vLayer), uTime * 0.003)).r;
    float n2 = texture2D(uNoise, vUv * vec2(1.3, 0.7) - vec2(uTime * 0.005, 0.0) + 0.41).r;
    float n = n1 * n2 * 2.0;
    float shape = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y))
      * smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));
    vec3 tint = mix(uCoral, uCyan, smoothstep(0.2, 0.8, vUv.x + sin(uTime * 0.1) * 0.2));
    tint = mix(tint, uPlum * 2.0, 0.35);
    vec3 col = tint * n * n * shape * (0.16 - vLayer * 0.06) * (0.8 + uBeat * 0.4) * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

/* ---------------- floor, quarry walls, sky ---------------- */

export const worldVertex = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const floorFragment = /* glsl */ `
  ${common}
  uniform sampler2D uNoise;
  varying vec3 vW;
  void main() {
    float n = texture2D(uNoise, vW.xz * 0.06).r;
    float near = exp(-max(vW.z - ${WALL_Z.toFixed(1)}, 0.0) * 0.06);
    float streak = exp(-abs(vW.x) * 0.07);
    vec3 glow = stageHue(vW.x * 0.03 + uBeatClock / 16.0);
    vec3 col = vec3(0.01, 0.007, 0.016) * (0.6 + n);
    col += glow * near * (0.25 + streak * 0.5) * (0.6 + n * 0.8) * (0.6 + uBeat * 0.6) * 0.7 * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

export const quarryFragment = /* glsl */ `
  ${common}
  uniform sampler2D uNoise;
  varying vec3 vW;
  void main() {
    float ang = atan(vW.x, vW.z - 10.0);
    float ridge = 24.0 + texture2D(uNoise, vec2(ang * 0.35, 0.13)).r * 14.0 + sin(ang * 3.0) * 3.0;
    if (vW.y > ridge) discard;
    // terraces: cut ledges every 7 m, granite texture from the shared noise
    float ty = vW.y / 7.0;
    float ledge = smoothstep(0.86, 0.94, fract(ty));
    float rock = texture2D(uNoise, vec2(ang * 1.7, vW.y * 0.05)).r;
    float lit = exp(-length(vW - vec3(0.0, 6.0, ${WALL_Z.toFixed(1)})) * 0.028);
    vec3 glow = mix(uPlum * 2.2, uCoral, 0.35 + 0.25 * sin(uTime * 0.3 + ang));
    vec3 col = vec3(0.012, 0.009, 0.02) * (0.6 + rock) + glow * lit * (0.25 + rock * 0.4 + ledge * 0.5) * 0.5;
    col += uAcid * ledge * lit * 0.05;
    col *= 0.6 + 0.4 * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

export const skyFragment = /* glsl */ `
  ${common}
  varying vec3 vW;
  void main() {
    vec3 dir = normalize(vW - vec3(0.0, 0.0, 20.0));
    float toward = max(-dir.z, 0.0);
    float horizon = exp(-max(dir.y, 0.0) * 4.5);
    vec3 col = mix(uNight, uPlum * 1.2, horizon * 0.8);
    col += uCoral * horizon * toward * toward * 0.25 * (0.75 + uBeat * 0.25) * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;

/* ---------------- scanned quarry walls (Poly Haven CC0 cliff scans) ----------------
   Albedo + normal map from the scan; light only from the show: the LED wall wash in front of the stage,
   the up-beam line on top of the wall, laser streaks sweeping across the rock, a plum night fill. */

export const rockVertex = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const rockFragment = /* glsl */ `
  ${common}
  uniform vec3 uRayGain;
  uniform sampler2D uMap;
  uniform sampler2D uNormalMap;
  varying vec3 vW;
  varying vec3 vN;
  varying vec2 vUv;
  // tangent frame from screen-space derivatives (the scans carry no tangents)
  vec3 perturb(vec3 p, vec3 n, vec3 m, vec2 uv) {
    vec3 q0 = dFdx(p);
    vec3 q1 = dFdy(p);
    vec2 st0 = dFdx(uv);
    vec2 st1 = dFdy(uv);
    vec3 q1p = cross(q1, n);
    vec3 q0p = cross(n, q0);
    vec3 T = q1p * st0.x + q0p * st1.x;
    vec3 B = q1p * st0.y + q0p * st1.y;
    float det = max(dot(T, T), dot(B, B));
    float s = det == 0.0 ? 0.0 : inversesqrt(det);
    return normalize(T * (m.x * s) + B * (m.y * s) + n * m.z);
  }
  void main() {
    // keep the tunnel bore behind the LED wall clear (it is seen through the mouth)
    if (vW.z < ${(WALL_Z - 0.5).toFixed(1)} && length(vW.xy) < 6.5) discard;
    vec3 alb = texture2D(uMap, vUv).rgb;
    vec3 n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 N = perturb(vW, n, texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0, vUv);

    // 1. LED wall wash: an area light on the wall face, only for rock in front of it
    vec3 d1 = vec3(clamp(vW.x, -18.0, 18.0), clamp(vW.y, -4.0, 14.0), ${(WALL_Z + 1.0).toFixed(1)}) - vW;
    float r1 = length(d1);
    float front = smoothstep(-1.0, 3.0, vW.z - ${WALL_Z.toFixed(1)});
    vec3 wash = stageHue(uBeatClock / 16.0) * (0.55 + 0.6 * uBeat);
    vec3 col = alb * wash * max(dot(N, d1 / r1), 0.0) * 700.0 / (r1 * r1 + 120.0) * front;

    // 2. the up-beam line on top of the wall: lights the walls behind and beside the stage
    vec3 d2 = vec3(clamp(vW.x, -18.0, 18.0), 14.3, ${(WALL_Z - 0.3).toFixed(1)}) - vW;
    float r2 = length(d2);
    vec3 beam = stageHue(floor(uBeatClock / 16.0) * 0.5 + vW.x * 0.015 + 1.0) * uRayGain.x;
    col += alb * beam * max(dot(N, d2 / r2), 0.0) * 800.0 / (r2 * r2 + 250.0);

    // 3. laser streaks sweeping across the rock from the deck lip
    float ang = atan(vW.x, vW.z - ${(WALL_Z + 6.8).toFixed(1)});
    float sweep = fract(ang * 2.2 + vW.y * 0.035 - uBeatClock * 0.125);
    float streak = exp(-abs(sweep - 0.5) * 70.0) * smoothstep(-5.0, 2.0, vW.y);
    col += stageHue(floor(uBeatClock / 4.0)) * streak * uRayGain.z * (0.3 + alb * 2.0) * 0.7;

    // 4. night fill: plum bounce and a little sky from above, so the strata read between hits
    col += alb * (uPlum * 1.6 + vec3(0.03, 0.028, 0.05));
    // cool moonlight raking across the strata from above left
    col += alb * vec3(0.16, 0.15, 0.26) * max(dot(N, normalize(vec3(-0.35, 0.75, 0.55))), 0.0);

    // distance haze into the night sky
    float dist = length(vW - cameraPosition);
    col = mix(col, uNight, smoothstep(45.0, 150.0, dist) * 0.75);
    col *= 0.5 + 0.5 * uIntro;
    gl_FragColor = vec4(col, 1.0);
    ${tail}
  }
`;
