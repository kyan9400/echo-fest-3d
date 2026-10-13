/*
  EchoEngine — everything the tunnel needs, outside React.
  Built once per quality tier; update() runs every drawn frame and allocates nothing.
  update() returns true while something still eases (intro, scroll), so on-demand mode asks for another frame.
*/

import * as THREE from "three";
import { getBands } from "@/lib/audio";
import { yieldToMain } from "@/lib/defer";
import type { TierSettings } from "@/lib/quality";
import {
  BANDS,
  HISTORY,
  TUNNEL_LENGTH,
  TUNNEL_RADIUS,
  haloFragment,
  haloVertex,
  ledFragment,
  ledVertex,
  portalFragment,
  portalVertex,
  sparkFragment,
  sparkVertex,
  tunnelFragment,
  tunnelVertex,
} from "./shaders";
import { StageWorld, makeNoiseTexture } from "./stage";
import { WALL_Z } from "./stageShaders";

export const PALETTE = {
  acid: "#c8ff3d",
  coral: "#ff5c86",
  cyan: "#45e6ff",
  night: "#0b0614",
  dusk: "#150c24",
  plum: "#241338",
  haze: "#b9a8d9",
};

// ACES darkens and desaturates a little, so the neon colours get a small linear pre-boost
const BOOST = 1.15;
const GATE_R = TUNNEL_RADIUS * 0.86;
const PORTAL_Z = -TUNNEL_LENGTH * 0.97;
const MAX_PUSH = 26; // how far the camera dollies in during the build-up
const BASE_FOV = 72;
const INTRO_TIME = 1.4;
const HERO_Z = 40; // first frame: in the crowd, 33 m from the LED wall
const HERO_Y = -2.2;
const BPM_HZ = 124 / 60;

// JS twin of the GLSL bend() so the gates sit inside the walls
function bendX(z: number, t: number) {
  const d = Math.min(1, Math.max(0, -z / TUNNEL_LENGTH));
  return Math.sin(z * 0.045 + t * 0.35) * Math.pow(d, 1.5) * 15;
}
function bendY(z: number, t: number) {
  const d = Math.min(1, Math.max(0, -z / TUNNEL_LENGTH));
  return Math.cos(z * 0.032 + t * 0.27) * 0.8 * Math.pow(d, 1.5) * 15;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// procedural "breathing" spectrum used when no audio is running
function idleBands(t: number, out: Uint8Array) {
  const beat = Math.exp(-((t * 2.066) % 1) * 5);
  for (let i = 0; i < BANDS; i++) {
    const f = i / BANDS;
    const v =
      60 +
      45 * Math.sin(t * 1.6 - i * 0.21) * (1 - f) +
      28 * Math.sin(t * 0.55 + i * 0.47) +
      (i < 10 ? beat * 110 * (1 - i / 10) : 0);
    out[i] = Math.max(0, Math.min(255, v * (1 - f * 0.45)));
  }
}

// Aluminium channel: a rounded-rect profile (0.06 radial x 0.12 deep) swept around the ring.
function housingGeometry(radius: number, segments: number) {
  const hw = 0.03; // half radial width
  const hd = 0.06; // half depth along the tunnel
  const cr = 0.015; // corner radius
  const arc = 4;
  const prof: number[] = []; // r, z, nr, nz
  const corners = [
    [hw - cr, hd - cr, 0],
    [-hw + cr, hd - cr, Math.PI / 2],
    [-hw + cr, -hd + cr, Math.PI],
    [hw - cr, -hd + cr, (Math.PI * 3) / 2],
  ];
  for (const [cx, cz, a0] of corners) {
    for (let k = 0; k <= arc; k++) {
      const a = a0 + (k / arc) * (Math.PI / 2);
      prof.push(cx + Math.cos(a) * cr, cz + Math.sin(a) * cr, Math.cos(a), Math.sin(a));
    }
  }
  const np = prof.length / 4;
  const pos = new Float32Array((segments + 1) * np * 3);
  const nor = new Float32Array((segments + 1) * np * 3);
  for (let s = 0; s <= segments; s++) {
    const t = (s / segments) * Math.PI * 2;
    const c = Math.cos(t);
    const sn = Math.sin(t);
    for (let i = 0; i < np; i++) {
      const r = radius + prof[i * 4];
      const o = (s * np + i) * 3;
      pos[o] = c * r;
      pos[o + 1] = sn * r;
      pos[o + 2] = prof[i * 4 + 1];
      nor[o] = c * prof[i * 4 + 2];
      nor[o + 1] = sn * prof[i * 4 + 2];
      nor[o + 2] = prof[i * 4 + 3];
    }
  }
  const idx: number[] = [];
  for (let s = 0; s < segments; s++) {
    for (let i = 0; i < np; i++) {
      const a = s * np + i;
      const b = s * np + ((i + 1) % np);
      const c2 = a + np;
      const d = b + np;
      idx.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

export class EchoEngine {
  readonly group = new THREE.Group();
  private readonly settings: TierSettings;
  private readonly historyData = new Uint8Array(BANDS * HISTORY);
  private readonly historyTex: THREE.DataTexture;
  private readonly uniforms;
  private gates!: THREE.InstancedMesh;
  private halos: THREE.InstancedMesh | null = null;
  private housing: THREE.InstancedMesh | null = null;
  private housingMat: THREE.MeshStandardMaterial | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private portal!: THREE.Mesh;
  private stage!: StageWorld;
  private readonly noiseTex: THREE.DataTexture;
  private readonly disposables: { dispose: () => void }[] = [];

  // per-frame scratch, allocated once
  private readonly bands = new Uint8Array(BANDS);
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly white = new THREE.Color(1.6, 1.6, 1.6);
  private readonly gateColors = [
    new THREE.Color(PALETTE.acid).multiplyScalar(BOOST),
    new THREE.Color(PALETTE.coral).multiplyScalar(BOOST),
    new THREE.Color(PALETTE.cyan).multiplyScalar(BOOST),
  ];
  private readonly look = new THREE.Vector3();
  private readonly lightPos = new THREE.Vector3();
  private readonly pointer = { x: 0, y: 0 };
  private readonly cam = { x: 0, y: 0 };
  private head = 0;
  private acc = 0;
  private clock = 0; // motion time (frozen when reduced)
  private idleClock = 0;
  private beatClock = 0;
  private travel = 0;
  private bass = 0;
  private bassSlow = 0;
  private roll = 0;
  private scrollTarget = 0;
  private drop = 0;
  private intro = 0;
  private introOn = false;
  private glow = true;

  /** Builds the engine in short steps, yielding to the main thread between the heavy ones. */
  static async create(settings: TierSettings): Promise<EchoEngine> {
    const engine = new EchoEngine(settings);
    await yieldToMain();
    engine.buildTunnel();
    await yieldToMain();
    engine.buildGates();
    await yieldToMain();
    engine.buildSparks();
    engine.buildPortal();
    // the stage world in front of the tunnel mouth
    const stage = new StageWorld(settings, engine.uniforms);
    engine.stage = stage;
    await yieldToMain();
    stage.buildWorld();
    stage.buildStage(ledVertex, ledFragment);
    await yieldToMain();
    stage.buildCrowd();
    await yieldToMain();
    stage.buildLights();
    engine.group.add(stage.group);
    return engine;
  }

  private constructor(settings: TierSettings) {
    this.settings = settings;

    this.historyTex = new THREE.DataTexture(this.historyData, BANDS, HISTORY, THREE.RedFormat, THREE.UnsignedByteType);
    this.historyTex.magFilter = THREE.LinearFilter;
    this.historyTex.minFilter = THREE.LinearFilter;
    this.historyTex.wrapT = THREE.RepeatWrapping;
    // fill the whole history so the very first (maybe only) frame looks finished
    idleBands(0.8, this.bands);
    for (let r = 0; r < HISTORY; r++) this.historyData.set(this.bands, r * BANDS);
    this.historyTex.needsUpdate = true;

    this.noiseTex = makeNoiseTexture();
    this.disposables.push(this.noiseTex);

    const neon = (hex: string) => new THREE.Color(hex).multiplyScalar(BOOST);
    this.uniforms = {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uBass: { value: 0 },
      uHead: { value: 0.5 / HISTORY },
      uHistory: { value: this.historyTex },
      uPixelRatio: { value: 1 },
      uAcid: { value: neon(PALETTE.acid) },
      uCoral: { value: neon(PALETTE.coral) },
      uCyan: { value: neon(PALETTE.cyan) },
      uNight: { value: new THREE.Color(PALETTE.night) },
      uPlum: { value: new THREE.Color(PALETTE.plum) },
      uDusk: { value: new THREE.Color(PALETTE.dusk) },
      uHaze: { value: new THREE.Color(PALETTE.haze) },
      uLightView: { value: new THREE.Vector3() },
      uLightGain: { value: 0 },
      uGateSpacing: { value: TUNNEL_LENGTH / settings.gates },
      uGateOffset: { value: 0 },
      uGateGain: { value: 1 },
      uCamZ: { value: 0 },
      uIntro: { value: 0 },
      uShock: { value: 0 },
      uShockAmt: { value: 0 },
      uOpen: { value: 0 },
      uHaloGain: { value: settings.halo },
      uHaloRadius: { value: GATE_R },
      uPortalCore: { value: 1 },
      // stage world
      uBeat: { value: 0 },
      uBeatPhase: { value: 0 },
      uBeatClock: { value: 0 },
      uNoise: { value: this.noiseTex },
      uFly: { value: 0 },
      uRayGain: { value: new THREE.Vector3(1, 1, 1) },
      uLensGain: { value: 1 },
    };
    this.disposables.push(this.historyTex);
  }

  // 1. the tunnel wall: displaced, lit granite with a neon grid
  private buildTunnel() {
    const settings = this.settings;
    const tunnelGeo = new THREE.CylinderGeometry(
      TUNNEL_RADIUS,
      TUNNEL_RADIUS,
      TUNNEL_LENGTH + 2 + WALL_Z,
      settings.radial,
      settings.length,
      true,
    );
    tunnelGeo.rotateX(-Math.PI / 2); // axis along -z, away from the camera
    // the front edge sits exactly in the LED wall plane, so there is no gap between the mouth and the rock
    tunnelGeo.translate(0, 0, -(TUNNEL_LENGTH + 2 + WALL_Z) / 2 + WALL_Z);
    const tunnelMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: tunnelVertex,
      fragmentShader: tunnelFragment,
      defines: { ROCK_OCTAVES: settings.rockOctaves },
      side: THREE.BackSide,
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.frustumCulled = false;
    this.group.add(tunnel);
    this.disposables.push(tunnelGeo, tunnelMat);
  }

  // 2. instanced LED gates + aluminium housings + halo sprites, all sharing one matrix buffer
  private buildGates() {
    const settings = this.settings;
    const [tubeSeg, ringSeg] = settings.tube;
    const gateGeo = new THREE.TorusGeometry(GATE_R, 0.045, tubeSeg, ringSeg);
    const gateMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: ledVertex,
      fragmentShader: ledFragment,
    });
    this.gates = new THREE.InstancedMesh(gateGeo, gateMat, settings.gates);
    this.gates.frustumCulled = false;
    this.color.setRGB(0, 0, 0);
    for (let i = 0; i < settings.gates; i++) this.gates.setColorAt(i, this.color); // colour buffer before compile
    this.group.add(this.gates);
    this.disposables.push(gateGeo, gateMat);

    if (settings.housing) {
      const geo = housingGeometry(GATE_R + 0.09, 128);
      this.housingMat = new THREE.MeshStandardMaterial({ color: "#9a93a8", metalness: 0.9, roughness: 0.32 });
      this.housing = new THREE.InstancedMesh(geo, this.housingMat, settings.gates);
      this.housing.instanceMatrix = this.gates.instanceMatrix; // same fixtures, same matrices
      this.housing.frustumCulled = false;
      this.group.add(this.housing);
      this.disposables.push(geo, this.housingMat);
    }

    if (settings.halo > 0) {
      const geo = new THREE.RingGeometry(GATE_R - 1, GATE_R + 1, 96, 1);
      const mat = new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: haloVertex,
        fragmentShader: haloFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.halos = new THREE.InstancedMesh(geo, mat, settings.gates);
      this.halos.instanceMatrix = this.gates.instanceMatrix;
      this.halos.instanceColor = this.gates.instanceColor;
      this.halos.frustumCulled = false;
      this.halos.renderOrder = 2;
      this.group.add(this.halos);
      this.disposables.push(geo, mat);
    }
  }

  // 3. sparks, moved entirely in the vertex shader
  private buildSparks() {
    const settings = this.settings;
    const sparkGeo = new THREE.BufferGeometry();
    const n = settings.sparks;
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      seeds[i * 4] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 1] = 0.4 + Math.random() * (TUNNEL_RADIUS * 0.78);
      seeds[i * 4 + 2] = Math.random();
      seeds[i * 4 + 3] = Math.random();
    }
    sparkGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    sparkGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -TUNNEL_LENGTH / 2), TUNNEL_LENGTH);
    const sparkMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.frustumCulled = false;

    this.group.add(sparks);
    this.disposables.push(sparkGeo, sparkMat);
  }

  // 4. the quarry exit: a soft additive disc with a thin cyan ring, drawn last
  private buildPortal() {
    const geo = new THREE.PlaneGeometry(14, 14);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: portalVertex,
      fragmentShader: portalFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.portal = new THREE.Mesh(geo, mat);
    this.portal.frustumCulled = false;
    this.portal.renderOrder = 5;
    this.portal.position.set(0, 0, PORTAL_Z);
    this.group.add(this.portal);
    this.disposables.push(geo, mat);
  }

  /** One-time PMREM of a tiny code-made "studio" (three coloured ring lights in a dim plum box). */
  prepare(gl: THREE.WebGLRenderer) {
    if (!this.housingMat || this.envTarget) return;
    const scene = new THREE.Scene();
    const owned: { dispose: () => void }[] = [];
    const boxGeo = new THREE.BoxGeometry(12, 12, 12);
    const boxMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.plum).multiplyScalar(0.6), side: THREE.BackSide });
    scene.add(new THREE.Mesh(boxGeo, boxMat));
    owned.push(boxGeo, boxMat);
    const ringGeo = new THREE.TorusGeometry(1.6, 0.18, 8, 48);
    owned.push(ringGeo);
    [PALETTE.acid, PALETTE.coral, PALETTE.cyan].forEach((hex, i) => {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(5) });
      const ring = new THREE.Mesh(ringGeo, mat);
      const a = (i / 3) * Math.PI * 2;
      ring.position.set(Math.cos(a) * 4, Math.sin(a) * 4, -2 + i * 2);
      ring.lookAt(0, 0, 0);
      scene.add(ring);
      owned.push(mat);
    });
    const pmrem = new THREE.PMREMGenerator(gl);
    this.envTarget = pmrem.fromScene(scene, 0.03);
    pmrem.dispose();
    owned.forEach((o) => o.dispose());
    this.housingMat.envMap = this.envTarget.texture;
    this.housingMat.needsUpdate = true;
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  /** Hero scroll progress 0..1 (the drop). */
  setScroll(p: number) {
    this.scrollTarget = p;
  }

  /** Halo sprites on/off (PerformanceMonitor switches them off on decline). */
  setGlow(on: boolean) {
    this.glow = on;
    if (this.halos) this.halos.visible = on;
  }

  /** "Lights on": 0 -> 1 over 1.4 s, or at once with reduced motion. */
  startIntro(instant: boolean) {
    this.introOn = true;
    if (instant) this.intro = 1;
  }

  private pushRow() {
    this.head = (this.head + 1) % HISTORY;
    this.historyData.set(this.bands, this.head * BANDS);
  }

  update(rawDelta: number, camera: THREE.Camera, dpr: number, reduced: boolean): boolean {
    const delta = Math.min(rawDelta, 0.05);
    const moving = !reduced;
    const u = this.uniforms;
    let again = false;

    // 0. intro + scroll easing
    if (this.introOn && this.intro < 1) {
      this.intro = reduced ? 1 : Math.min(1, this.intro + delta / INTRO_TIME);
      again = this.intro < 1;
    }
    u.uIntro.value = this.intro * this.intro * (3 - 2 * this.intro);
    if (reduced) {
      this.drop = 0; // still frame of the main stage
    } else {
      const diff = this.scrollTarget - this.drop;
      this.drop = Math.abs(diff) < 0.0005 ? this.scrollTarget : this.drop + diff * Math.min(1, delta * 8);
      if (this.drop !== this.scrollTarget) again = true;
    }
    const p = this.drop;
    const fly = smooth(0.08, 0.45, p); // crowd -> through the LED wall into the tunnel mouth
    const build = smooth(0.45, 0.65, p); // inside the tunnel: speed-up + dolly zoom
    const shock = clamp01((p - 0.65) / 0.07);
    const flash = shock > 0 && shock < 1 ? Math.sin(Math.PI * shock) : 0;
    const open = smooth(0.72, 1, p);
    u.uShock.value = shock;
    u.uShockAmt.value = flash;
    u.uOpen.value = open;

    // 1. spectrum: real audio, or the idle breath (frozen when motion is reduced)
    const live = getBands(this.bands);
    if (!live) {
      if (moving) this.idleClock += delta;
      idleBands(0.8 + this.idleClock, this.bands);
    }

    // 2. echo history: a new row every 1/45 s, so sound travels down the walls
    if (live || moving) {
      this.acc += delta;
      let rows = 0;
      while (this.acc > 1 / 45 && rows < 4) {
        this.acc -= 1 / 45;
        this.pushRow();
        rows++;
      }
      if (rows) {
        this.historyTex.needsUpdate = true;
        u.uHead.value = (this.head + 0.5) / HISTORY;
      }
    }

    // 3. bass energy + transient
    let low = 0;
    for (let i = 0; i < 6; i++) low += this.bands[i];
    low /= 6 * 255;
    this.bass += (low - this.bass) * Math.min(1, delta * 18);
    this.bassSlow += (low - this.bassSlow) * Math.min(1, delta * 2.5);
    const kick = Math.max(0, this.bass - this.bassSlow);
    u.uBass.value = Math.min(1, kick * 4 + (live ? this.bass * 0.25 : 0));

    // fake 124 bpm beat clock for the stage (no microphone needed); live audio adds its own kicks
    if (moving) this.beatClock += delta;
    const beats = (0.05 + this.beatClock) * BPM_HZ;
    const beatPhase = beats % 1;
    const env = Math.exp(-beatPhase * 5);
    const beat = live ? Math.min(1, Math.max(kick * 4, env * 0.5)) : env;
    const bar = Math.floor(beats / 4);
    u.uBeat.value = beat;
    u.uBeatPhase.value = beatPhase;
    u.uBeatClock.value = beats;
    u.uFly.value = fly;
    const lasersOn = bar % 4 === 3 ? 0.12 : 1; // a bar of rest every four
    u.uRayGain.value.set(0.9 + fly * 0.5, 0.7 + beat * 0.5, (0.5 + beat * 0.5) * (0.8 + fly * 0.8) * lasersOn);

    // 4. flight (only with motion); the build-up ramps the speed x1 -> x5
    if (moving) {
      this.clock += delta;
      this.travel += delta * (7 + this.bass * 9) * (1 + build * 4);
    }
    u.uTime.value = this.clock;
    u.uTravel.value = this.travel;
    u.uPixelRatio.value = dpr;

    // 5. camera path: crowd -> LED wall -> tunnel; inside, a dolly zoom (push in, fov widens, portal holds its size)
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = persp.isPerspectiveCamera ? persp.aspect : 1.6;
    const wide = smooth(0.8, 1.4, aspect); // 0 = phone portrait, 1 = desktop
    const heroFov = 66 - 20 * wide;
    const heroHalfH = Math.tan((heroFov / 2) * THREE.MathUtils.DEG2RAD) * (HERO_Z - WALL_Z);
    // desktop: the stage sits right of the headline; phone: the tunnel mouth sits above it
    const heroLookX = -0.34 * heroHalfH * aspect * wide;
    const heroLookY = (1 - wide) * -0.4 * heroHalfH + wide * 2.6;
    const push = build * MAX_PUSH;
    const camZ = HERO_Z + (-push - HERO_Z) * fly;
    const portalDist = -PORTAL_Z;
    const half = Math.atan((Math.tan((BASE_FOV / 2) * THREE.MathUtils.DEG2RAD) * portalDist) / (portalDist - push));
    this.stage.group.visible = camZ > WALL_Z - 4;
    if (persp.isPerspectiveCamera) {
      const tunnelFov = half * 2 * THREE.MathUtils.RAD2DEG;
      const fov = heroFov + (tunnelFov - heroFov) * smooth(0.3, 1, fly);
      if (Math.abs(persp.fov - fov) > 0.01) {
        persp.fov = fov;
        persp.updateProjectionMatrix();
      }
    }
    u.uCamZ.value = camZ;

    // 6. gates follow the walls and pulse with the history row at their depth
    const mesh = this.gates;
    const n = this.settings.gates;
    const spacing = TUNNEL_LENGTH / n;
    const gain = 1 + build * 1.6;
    u.uGateGain.value = gain + flash * 2;
    u.uGateOffset.value = this.travel % (spacing * 3); // keeps the i % 3 colour order in the shader
    for (let i = 0; i < n; i++) {
      const z = -((((i * spacing - this.travel) % TUNNEL_LENGTH) + TUNNEL_LENGTH) % TUNNEL_LENGTH) - 1.5;
      const d = -z / TUNNEL_LENGTH;
      const row = (this.head - Math.round(d * (HISTORY - 1)) + HISTORY * 2) % HISTORY;
      let amp = 0;
      for (let b = 0; b < 16; b += 2) amp += this.historyData[row * BANDS + b];
      amp /= 8 * 255;
      this.dummy.position.set(bendX(z, this.clock), bendY(z, this.clock), z);
      this.dummy.rotation.set(0, 0, i * 0.4 + this.clock * 0.2);
      const sc = (1 - amp * 0.22) * (1 + open * 2.5); // the walls open: gates scatter outward
      this.dummy.scale.set(sc, sc, 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
      const near = clamp01((camZ - z - 1.5) / 6); // fade the gate that passes the camera
      this.color
        .copy(this.gateColors[i % 3])
        .multiplyScalar((0.25 + amp * amp * 3.2) * near * gain * (1 - open * 0.7))
        .lerp(this.white, flash * near);
      mesh.setColorAt(i, this.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (this.halos) this.halos.visible = this.glow;

    // 6b. LED rings around the mouth chase on the beat
    const ring = this.stage.ringFrame;
    for (let i = 0; i < 3; i++) {
      const lag = (beatPhase * 3 + 3 - i) % 3;
      this.color.copy(this.gateColors[(i + bar) % 3]).multiplyScalar(0.18 + Math.exp(-lag * 2.5) * 0.9 * (0.4 + beat * 0.6));
      ring.setColorAt(i, this.color);
    }
    if (ring.instanceColor) ring.instanceColor.needsUpdate = true;

    // 7. the portal sits on the bend, pulses with the bass and grows into a full-screen glow
    this.portal.position.set(bendX(PORTAL_Z, this.clock), bendY(PORTAL_Z, this.clock), PORTAL_Z);
    const ps = 1 + open * 18;
    this.portal.scale.set(ps, ps, 1);
    u.uPortalCore.value = 1 - open * 0.8;

    // 8. camera: damped pointer sway, looks down the bend, rolls on kicks and 6 degrees on the drop
    if (moving) {
      const k = Math.min(1, delta * 2.2);
      this.cam.x += (this.pointer.x * 0.9 - this.cam.x) * k;
      this.cam.y += (-this.pointer.y * 0.55 - this.cam.y) * k;
      this.roll += (kick * 0.6 - this.roll) * Math.min(1, delta * 6);
    }
    const sway = 1 + (1 - fly) * 1.2;
    camera.position.set(
      this.cam.x * sway + bendX(camZ, this.clock),
      HERO_Y * (1 - fly) + this.cam.y * sway * 0.6 + bendY(camZ, this.clock),
      camZ,
    );
    const lz = camZ - 26;
    const aim = smooth(0, 0.7, fly);
    this.look.set(
      heroLookX + this.cam.x * 0.4 + (bendX(lz, this.clock) * 0.8 - heroLookX - this.cam.x * 0.4) * aim,
      heroLookY + (bendY(lz, this.clock) * 0.8 - heroLookY) * aim,
      WALL_Z + (lz - WALL_Z) * aim,
    );
    camera.lookAt(this.look);
    camera.rotateZ(Math.sin(this.clock * 0.3) * 0.04 + this.roll * 0.12 + smooth(0.65, 0.72, p) * 0.105);
    camera.updateMatrixWorld();

    // 9. stage light travelling down the tunnel (view space for the wall shader)
    // it starts ahead of the camera (so a still frame is lit), drifts away, fades out and comes round again
    const lightDist = 8 + ((20 + this.travel * 0.6) % (TUNNEL_LENGTH * 0.75));
    const lightZ = Math.min(camZ, 0) - lightDist;
    this.lightPos.set(bendX(lightZ, this.clock), bendY(lightZ, this.clock), lightZ).applyMatrix4(camera.matrixWorldInverse);
    u.uLightView.value.copy(this.lightPos);
    u.uLightGain.value =
      smooth(8, 16, lightDist) * (1 - smooth(TUNNEL_LENGTH * 0.55, TUNNEL_LENGTH * 0.83, lightDist)) * 2.2;

    return again;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.envTarget?.dispose();
    this.stage?.dispose();
    this.halos?.dispose();
    this.housing?.dispose();
    this.gates?.dispose();
  }
}
