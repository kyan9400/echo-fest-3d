/*
  EchoEngine — everything the tunnel needs, outside React.
  Built once per quality tier; update() runs every drawn frame and allocates nothing.
*/

import * as THREE from "three";
import { getBands } from "@/lib/audio";
import type { TierSettings } from "@/lib/quality";
import {
  BANDS,
  HISTORY,
  TUNNEL_LENGTH,
  TUNNEL_RADIUS,
  sparkFragment,
  sparkVertex,
  tunnelFragment,
  tunnelVertex,
} from "./shaders";

export const PALETTE = {
  acid: "#c8ff3d",
  coral: "#ff5c86",
  cyan: "#45e6ff",
  night: "#0b0614",
  plum: "#241338",
};

// JS twin of the GLSL bend() so the gates sit inside the walls
function bendX(z: number, t: number) {
  const d = Math.min(1, Math.max(0, -z / TUNNEL_LENGTH));
  return Math.sin(z * 0.045 + t * 0.35) * Math.pow(d, 1.5) * 15;
}
function bendY(z: number, t: number) {
  const d = Math.min(1, Math.max(0, -z / TUNNEL_LENGTH));
  return Math.cos(z * 0.032 + t * 0.27) * 0.8 * Math.pow(d, 1.5) * 15;
}

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

export class EchoEngine {
  readonly group = new THREE.Group();
  private readonly settings: TierSettings;
  private readonly historyData = new Uint8Array(BANDS * HISTORY);
  private readonly historyTex: THREE.DataTexture;
  private readonly uniforms;
  private readonly gates: THREE.InstancedMesh;
  private readonly disposables: { dispose: () => void }[] = [];

  // per-frame scratch, allocated once
  private readonly bands = new Uint8Array(BANDS);
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly gateColors = [
    new THREE.Color(PALETTE.acid),
    new THREE.Color(PALETTE.coral),
    new THREE.Color(PALETTE.cyan),
  ];
  private readonly look = new THREE.Vector3();
  private readonly pointer = { x: 0, y: 0 };
  private readonly cam = { x: 0, y: 0 };
  private head = 0;
  private acc = 0;
  private clock = 0; // motion time (frozen when reduced)
  private idleClock = 0;
  private travel = 0;
  private bass = 0;
  private bassSlow = 0;
  private roll = 0;

  constructor(settings: TierSettings) {
    this.settings = settings;

    this.historyTex = new THREE.DataTexture(this.historyData, BANDS, HISTORY, THREE.RedFormat, THREE.UnsignedByteType);
    this.historyTex.magFilter = THREE.LinearFilter;
    this.historyTex.minFilter = THREE.LinearFilter;
    this.historyTex.wrapT = THREE.RepeatWrapping;
    // fill the whole history so the very first (maybe only) frame looks finished
    idleBands(0.8, this.bands);
    for (let r = 0; r < HISTORY; r++) this.historyData.set(this.bands, r * BANDS);
    this.historyTex.needsUpdate = true;

    this.uniforms = {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uBass: { value: 0 },
      uHead: { value: 0.5 / HISTORY },
      uHistory: { value: this.historyTex },
      uPixelRatio: { value: 1 },
      uAcid: { value: new THREE.Color(PALETTE.acid) },
      uCoral: { value: new THREE.Color(PALETTE.coral) },
      uCyan: { value: new THREE.Color(PALETTE.cyan) },
      uNight: { value: new THREE.Color(PALETTE.night) },
      uPlum: { value: new THREE.Color(PALETTE.plum) },
    };

    // 1. the tunnel wall
    const tunnelGeo = new THREE.CylinderGeometry(
      TUNNEL_RADIUS,
      TUNNEL_RADIUS,
      TUNNEL_LENGTH + 8,
      settings.radial,
      settings.length,
      true,
    );
    tunnelGeo.rotateX(-Math.PI / 2); // axis along -z, away from the camera
    tunnelGeo.translate(0, 0, -(TUNNEL_LENGTH + 8) / 2 + 6);
    const tunnelMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: tunnelVertex,
      fragmentShader: tunnelFragment,
      side: THREE.BackSide,
    });
    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.frustumCulled = false;

    // 2. instanced light gates
    const gateGeo = new THREE.TorusGeometry(TUNNEL_RADIUS * 0.86, 0.035, 6, 120);
    const gateMat = new THREE.MeshBasicMaterial({ toneMapped: false, fog: true });
    this.gates = new THREE.InstancedMesh(gateGeo, gateMat, settings.gates);
    this.gates.frustumCulled = false;
    this.color.setRGB(0, 0, 0);
    for (let i = 0; i < settings.gates; i++) this.gates.setColorAt(i, this.color); // colour buffer before compile

    // 3. sparks, moved entirely in the vertex shader
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

    this.group.add(tunnel, this.gates, sparks);
    this.disposables.push(tunnelGeo, tunnelMat, gateGeo, gateMat, sparkGeo, sparkMat, this.historyTex);
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  private pushRow() {
    this.head = (this.head + 1) % HISTORY;
    this.historyData.set(this.bands, this.head * BANDS);
  }

  update(rawDelta: number, camera: THREE.Camera, dpr: number, reduced: boolean) {
    const delta = Math.min(rawDelta, 0.05);
    const moving = !reduced;
    const u = this.uniforms;

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

    // 4. flight (only with motion)
    if (moving) {
      this.clock += delta;
      this.travel += delta * (7 + this.bass * 9);
    }
    u.uTime.value = this.clock;
    u.uTravel.value = this.travel;
    u.uPixelRatio.value = dpr;

    // 5. gates follow the walls and pulse with the history row at their depth
    const mesh = this.gates;
    const n = this.settings.gates;
    const spacing = TUNNEL_LENGTH / n;
    for (let i = 0; i < n; i++) {
      const z = -((((i * spacing - this.travel) % TUNNEL_LENGTH) + TUNNEL_LENGTH) % TUNNEL_LENGTH) - 1.5;
      const d = -z / TUNNEL_LENGTH;
      const row = (this.head - Math.round(d * (HISTORY - 1)) + HISTORY * 2) % HISTORY;
      let amp = 0;
      for (let b = 0; b < 16; b += 2) amp += this.historyData[row * BANDS + b];
      amp /= 8 * 255;
      this.dummy.position.set(bendX(z, this.clock), bendY(z, this.clock), z);
      this.dummy.rotation.set(0, 0, i * 0.4 + this.clock * 0.2);
      const sc = 1 - amp * 0.22;
      this.dummy.scale.set(sc, sc, 1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
      const near = Math.min(1, (-z - 1.5) / 6); // fade the gate that passes the camera
      this.color.copy(this.gateColors[i % 3]).multiplyScalar((0.25 + amp * amp * 3.2) * near);
      mesh.setColorAt(i, this.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 6. camera: damped pointer sway, looks down the bend, rolls a touch on kicks
    if (moving) {
      const k = Math.min(1, delta * 2.2);
      this.cam.x += (this.pointer.x * 0.9 - this.cam.x) * k;
      this.cam.y += (-this.pointer.y * 0.55 - this.cam.y) * k;
      this.roll += (kick * 0.6 - this.roll) * Math.min(1, delta * 6);
    }
    camera.position.set(this.cam.x, this.cam.y, 0);
    this.look.set(bendX(-26, this.clock) * 0.8, bendY(-26, this.clock) * 0.8, -26);
    camera.lookAt(this.look);
    camera.rotateZ(Math.sin(this.clock * 0.3) * 0.04 + this.roll * 0.12);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.gates.dispose();
  }
}
