/*
  The main stage world in front of the tunnel (all procedural, built once per tier).
  The tunnel mouth is the hole in the middle of the LED wall, so the camera can fly from the crowd
  straight into the tunnel. Everything moves in shaders (time / beat uniforms); the CPU only writes
  a handful of uniforms per frame.
*/

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { TierSettings } from "@/lib/quality";
import type { QuarryAssets, RockAsset } from "./quarry";
import {
  MOUTH_R,
  WALL_Z,
  confettiFragment,
  confettiVertex,
  crowdFragment,
  crowdVertex,
  floorFragment,
  hazeFragment,
  hazeVertex,
  lensFragment,
  lensVertex,
  phoneFragment,
  phoneVertex,
  quarryFragment,
  rayFragment,
  rayVertex,
  rigFragment,
  rigVertex,
  rockFragment,
  rockVertex,
  skyFragment,
  starFragment,
  starVertex,
  wallFragment,
  wallVertex,
  worldVertex,
} from "./stageShaders";

type Uniforms = Record<string, THREE.IUniform<any>>;

const FLOOR_Y = -6.5;
const DECK_TOP = -4.2;
const TRUSS_Y = 15.5;
const TRUSS_Z = 9.5;

/* Where the scanned walls stand: [model, x, z, yaw, scale]. Both scans face +z with their base at y = 0.
   The big Namaqualand cliff closes the pit behind the stage; rock faces flank the crowd. */
const ROCKS: [keyof QuarryAssets, number, number, number, number][] = [
  ["cliff", 0, -28, 0.0, 5.0],
  ["face", -35, 1, 0.55, 7.0],
  ["face", 35, -1, -0.6, 7.2],
  ["face", -52, 26, 1.35, 6.4],
  ["face", 54, 24, -1.4, 6.6],
];

/** Small deterministic PRNG so the crowd looks the same on every visit. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 128x128 tiling value-noise fbm (4 octaves) baked once on the CPU; shaders only sample it. */
export function makeNoiseTexture(size = 128): THREE.DataTexture {
  const rand = rng(7);
  const data = new Uint8Array(size * size);
  const acc = new Float32Array(size * size);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < 4; o++) {
    const cells = 4 << o;
    const lat = new Float32Array(cells * cells);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * cells;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      const y1 = (y0 + 1) % cells;
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const x1 = (x0 + 1) % cells;
        const a = lat[y0 * cells + x0] + (lat[y0 * cells + x1] - lat[y0 * cells + x0]) * sx;
        const b = lat[y1 * cells + x0] + (lat[y1 * cells + x1] - lat[y1 * cells + x0]) * sx;
        acc[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < acc.length; i++) data[i] = Math.round((acc[i] / total) * 255);
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class StageWorld {
  readonly group = new THREE.Group();
  ringFrame!: THREE.InstancedMesh;
  private readonly settings: TierSettings;
  private readonly uniforms: Uniforms;
  private readonly disposables: { dispose: () => void }[] = [];
  private readonly rand = rng(2027);
  private rockTextures: THREE.Texture[] = [];

  constructor(settings: TierSettings, uniforms: Uniforms) {
    this.settings = settings;
    this.uniforms = uniforms;
  }

  private mat(vertexShader: string, fragmentShader: string, extra: Partial<THREE.ShaderMaterialParameters> = {}) {
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader, ...extra });
    this.disposables.push(m);
    return m;
  }

  private additive(vertexShader: string, fragmentShader: string, extra: Partial<THREE.ShaderMaterialParameters> = {}) {
    return this.mat(vertexShader, fragmentShader, {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      ...extra,
    });
  }

  private add(obj: THREE.Object3D, geo: THREE.BufferGeometry, order = 0) {
    obj.frustumCulled = false;
    obj.renderOrder = order;
    this.group.add(obj);
    this.disposables.push(geo);
  }

  /** sky dome, quarry walls, floor */
  buildWorld() {
    const skyGeo = new THREE.SphereGeometry(140, 24, 12);
    const sky = new THREE.Mesh(skyGeo, this.mat(worldVertex, skyFragment, { side: THREE.BackSide, depthWrite: false }));
    this.add(sky, skyGeo, -2);

    const quarryGeo = new THREE.CylinderGeometry(78, 78, 60, 72, 1, true, Math.PI * 0.45, Math.PI * 1.1);
    quarryGeo.translate(0, FLOOR_Y + 30, 10);
    const quarry = new THREE.Mesh(quarryGeo, this.mat(worldVertex, quarryFragment, { side: THREE.BackSide }));
    this.add(quarry, quarryGeo);

    const floorGeo = new THREE.PlaneGeometry(170, 110);
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, FLOOR_Y, 10);
    this.add(new THREE.Mesh(floorGeo, this.mat(worldVertex, floorFragment)), floorGeo);

    const n = this.settings.crowd < 1000 ? 160 : 420;
    const stars = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.15 + this.rand() * 0.7);
      const e = 0.18 + this.rand() * 1.1;
      stars[i * 4] = Math.cos(a) * Math.cos(e) * 130;
      stars[i * 4 + 1] = Math.sin(e) * 130;
      stars[i * 4 + 2] = -Math.sin(a) * Math.cos(e) * 130 + 20;
      stars[i * 4 + 3] = this.rand();
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("aStar", new THREE.BufferAttribute(stars, 4));
    starGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.add(new THREE.Points(starGeo, this.additive(starVertex, starFragment)), starGeo, -1);
  }

  /** the scanned cliffs around the pit (shared geometry + one material per scan, a mesh per placement) */
  addQuarry(q: QuarryAssets) {
    const mats = new Map<RockAsset, THREE.ShaderMaterial>();
    for (const [key, x, z, yaw, sc] of ROCKS) {
      const asset = q[key];
      let mat = mats.get(asset);
      if (!mat) {
        mat = new THREE.ShaderMaterial({
          uniforms: { ...this.uniforms, uMap: { value: asset.map }, uNormalMap: { value: asset.normalMap } },
          vertexShader: rockVertex,
          fragmentShader: rockFragment,
          side: THREE.DoubleSide,
        });
        mats.set(asset, mat);
        this.disposables.push(mat, asset.geometry, asset.map, asset.normalMap);
      }
      const mesh = new THREE.Mesh(asset.geometry, mat);
      mesh.position.set(x, FLOOR_Y - 0.4, z);
      mesh.rotation.y = yaw;
      mesh.scale.setScalar(sc);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group.add(mesh);
    }
    this.rockTextures = [q.cliff.map, q.cliff.normalMap, q.face.map, q.face.normalMap];
  }

  /** upload the scan textures before the warm-up compile, so the first revealed frame does not stall */
  prepare(gl: THREE.WebGLRenderer) {
    this.rockTextures.forEach((t) => gl.initTexture(t));
  }

  /** LED wall with the tunnel mouth, ring frame, deck, rig and speakers */
  buildStage(ledVertex: string, ledFragment: string) {
    const shape = new THREE.Shape();
    shape.moveTo(-20, DECK_TOP);
    shape.lineTo(20, DECK_TOP);
    shape.lineTo(20, 14.2);
    shape.lineTo(-20, 14.2);
    shape.lineTo(-20, DECK_TOP);
    const hole = new THREE.Path();
    hole.absarc(0, 0, MOUTH_R, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const wallGeo = new THREE.ShapeGeometry(shape, 48);
    const wall = new THREE.Mesh(wallGeo, this.mat(wallVertex, wallFragment));
    wall.position.z = WALL_Z;
    this.add(wall, wallGeo);

    // three LED rings around the mouth (same shader as the tunnel gates)
    const ringGeo = new THREE.TorusGeometry(MOUTH_R + 0.05, 0.14, 10, 128);
    const ringMat = this.mat(ledVertex, ledFragment);
    this.ringFrame = new THREE.InstancedMesh(ringGeo, ringMat, 3);
    const dummy = new THREE.Object3D();
    const black = new THREE.Color(0, 0, 0);
    [1, 1.16, 1.36].forEach((s, i) => {
      dummy.position.set(0, 0, WALL_Z + 0.25 - i * 0.05);
      dummy.scale.set(s, s, s * 0.7);
      dummy.updateMatrix();
      this.ringFrame.setMatrixAt(i, dummy.matrix);
      this.ringFrame.setColorAt(i, black);
    });
    this.add(this.ringFrame, ringGeo, 1);

    // dark structure: one instanced box mesh
    const boxes: number[][] = []; // x y z sx sy sz rx ry rz shade
    const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, shade = 0.02, rx = 0, ry = 0, rz = 0) =>
      boxes.push([x, y, z, sx, sy, sz, rx, ry, rz, shade]);

    box(0, DECK_TOP - 1.15, WALL_Z + 3.4, 50, 2.3, 7, 0.012); // deck
    box(0, FLOOR_Y + 0.55, 15.2, 54, 1.1, 0.15, 0.03); // crowd barrier
    box(0, 17.4, 8.2, 52, 0.7, 9, 0.01); // roof
    for (const sx of [-1, 1]) {
      box(sx * 21.6, 6.0, WALL_Z - 0.2, 3.2, 21.5, 2, 0.01); // wings
      // hanging line arrays (J-curve)
      for (let k = 0; k < 9; k++) box(sx * 17.6, 12.4 - k * 0.5, 10.6 + k * k * 0.012, 1.7, 0.46, 1.1, 0.016, -k * 0.035);
      // sub stacks on the floor in front of the deck
      box(sx * 12, FLOOR_Y + 0.6, 14, 2.4, 1.2, 1.2, 0.014);
      box(sx * 12, FLOOR_Y + 1.8, 14, 2.4, 1.2, 1.2, 0.014);
    }

    // truss: chords + zigzag diagonals, front truss across and two towers
    const T = 0.7;
    const h = T / 2;
    const tube = 0.06;
    const metal = 0.05;
    const span = 46;
    for (const dy of [-h, h]) for (const dz of [-h, h]) box(0, TRUSS_Y + dy, TRUSS_Z + dz, span, tube, tube, metal);
    const bays = Math.floor(span / T);
    const diag = Math.SQRT2 * T;
    for (let i = 0; i < bays; i++) {
      const x = -span / 2 + (i + 0.5) * T;
      const sgn = i % 2 ? 1 : -1;
      box(x, TRUSS_Y, TRUSS_Z + h, diag, tube, tube, metal, 0, 0, (sgn * Math.PI) / 4); // front face
      box(x, TRUSS_Y - h, TRUSS_Z, diag, tube, tube, metal, 0, (sgn * Math.PI) / 4, 0); // bottom face
    }
    const towerH = TRUSS_Y - FLOOR_Y;
    const towerBays = Math.floor(towerH / T);
    for (const sx of [-1, 1]) {
      const cx = sx * 23.6;
      for (const dx of [-h, h])
        for (const dz of [-h, h]) box(cx + dx, FLOOR_Y + towerH / 2, TRUSS_Z + dz, tube, towerH, tube, metal);
      for (let i = 0; i < towerBays; i++) {
        const y = FLOOR_Y + (i + 0.5) * T;
        const sgn = i % 2 ? 1 : -1;
        box(cx, y, TRUSS_Z + h, diag, tube, tube, metal, 0, 0, (sgn * Math.PI) / 4);
        box(cx - sx * h, y, TRUSS_Z, tube, diag, tube, metal, (sgn * Math.PI) / 4, 0, 0);
      }
    }
    // moving-head fixtures under the truss
    for (let i = 0; i < 10; i++) box(-19.8 + i * 4.4, TRUSS_Y - 0.75, TRUSS_Z, 0.45, 0.55, 0.45, 0.03);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const rig = new THREE.InstancedMesh(boxGeo, this.mat(rigVertex, rigFragment), boxes.length);
    const e = new THREE.Euler();
    const c = new THREE.Color();
    boxes.forEach((b, i) => {
      dummy.position.set(b[0], b[1], b[2]);
      dummy.scale.set(b[3], b[4], b[5]);
      e.set(b[6], b[7], b[8]);
      dummy.rotation.copy(e);
      dummy.updateMatrix();
      rig.setMatrixAt(i, dummy.matrix);
      c.setRGB(b[9], b[9] * 0.85, b[9] * 1.3);
      rig.setColorAt(i, c);
    });
    this.add(rig, boxGeo);
  }

  /** thousands of fans, a share of them with arms (and phones) up */
  buildCrowd() {
    const n = this.settings.crowd;
    const parts: THREE.BufferGeometry[] = [];
    const part = (g: THREE.BufferGeometry, arm: number) => {
      const ng = g.index ? g.toNonIndexed() : g;
      if (ng !== g) g.dispose();
      ng.deleteAttribute("uv");
      ng.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count).fill(arm), 1));
      parts.push(ng);
    };
    part(new THREE.CylinderGeometry(0.2, 0.13, 0.8, 6).translate(0, 0.4, 0), 0); // legs
    part(new THREE.CylinderGeometry(0.25, 0.19, 0.65, 7).translate(0, 1.12, 0), 0); // torso
    part(new THREE.SphereGeometry(0.13, 7, 5).translate(0, 1.6, 0), 0); // head
    for (const s of [-1, 1]) {
      const arm = new THREE.CylinderGeometry(0.045, 0.05, 0.72, 4);
      arm.translate(0, 0.36, 0);
      arm.rotateZ(-s * 0.32);
      arm.translate(s * 0.22, 1.38, 0);
      part(arm, 1);
    }
    const geo = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());

    const crowd = new THREE.InstancedMesh(geo, this.mat(crowdVertex, crowdFragment), n);
    const attr = new Float32Array(n * 4);
    const phones: number[] = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const x = (this.rand() - 0.5) * 60;
      const z = 15.8 + Math.pow(this.rand(), 0.85) * 22.5;
      const s = 0.92 + this.rand() * 0.16;
      dummy.position.set(x, FLOOR_Y, z);
      dummy.rotation.set(0, (this.rand() - 0.5) * 0.8, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
      const arms = this.rand() < 0.3 ? 1 : 0;
      const phase = this.rand();
      attr.set([phase, 0.4 + this.rand() * 0.8, arms, 0.94 + this.rand() * 0.12], i * 4);
      if (arms && phones.length / 4 < this.settings.phones)
        phones.push(x + (this.rand() < 0.5 ? -0.42 : 0.42) * s, FLOOR_Y + 2.1 * s, z, phase);
    }
    geo.setAttribute("aCrowd", new THREE.InstancedBufferAttribute(attr, 4));
    this.add(crowd, geo);

    const pn = phones.length / 4;
    const phoneGeo = new THREE.BufferGeometry();
    phoneGeo.setAttribute("aPhone", new THREE.BufferAttribute(new Float32Array(phones), 4));
    phoneGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pn * 3), 3));
    this.add(new THREE.Points(phoneGeo, this.additive(phoneVertex, phoneFragment)), phoneGeo, 3);
  }

  /** moving-head beams, lasers, lens flares, haze, confetti */
  buildLights() {
    const s = this.settings;
    const rays: number[][] = []; // 12 floats each
    const lenses: number[] = [];
    // up beams: a fan rising from behind the LED wall into the sky
    for (let i = 0; i < s.upBeams; i++) {
      const t = s.upBeams > 1 ? i / (s.upBeams - 1) : 0.5;
      const x = -18 + t * 36;
      rays.push([x, 14.3, WALL_Z - 0.3, this.rand(), (t - 0.5) * 0.9, 0.35, 1.2, 60, i % 3, 7, 0.35, 0]);
      lenses.push(x, 14.3, WALL_Z - 0.2, this.rand());
    }
    // down beams from the front truss onto the crowd
    for (let i = 0; i < s.downBeams; i++) {
      const t = s.downBeams > 1 ? i / (s.downBeams - 1) : 0.5;
      const x = -19.8 + Math.round(t * 9) * 4.4;
      rays.push([x, TRUSS_Y - 1.0, TRUSS_Z, this.rand(), -x * 0.012, 0.45, -0.5, 40, (i + 1) % 3, 4.5, 0.5, 1]);
      lenses.push(x, TRUSS_Y - 1.05, TRUSS_Z + 0.3, this.rand());
    }
    // laser fans from the deck lip, sweeping over the crowd
    for (let f = 0; f < s.laserFans; f++) {
      const t = s.laserFans > 1 ? f / (s.laserFans - 1) : 0.5;
      const x = -14 + t * 28;
      const phase = this.rand();
      for (let k = 0; k < s.laserRays; k++) {
        const spread = (k - (s.laserRays - 1) / 2) * 0.13;
        rays.push([x, DECK_TOP + 0.4, WALL_Z + 6.8, phase, -x * 0.015 + spread, 0.5, 0.06 + this.rand() * 0.06, 90, f % 3, 0.18, 0.9, 2]);
      }
    }
    const nr = rays.length;
    const base = new THREE.PlaneGeometry(1, 1, 1, 6);
    const rayGeo = new THREE.InstancedBufferGeometry();
    rayGeo.index = base.index;
    rayGeo.setAttribute("position", base.attributes.position);
    const a = new Float32Array(nr * 4);
    const b = new Float32Array(nr * 4);
    const c = new Float32Array(nr * 4);
    rays.forEach((r, i) => {
      a.set(r.slice(0, 4), i * 4);
      b.set(r.slice(4, 8), i * 4);
      c.set(r.slice(8, 12), i * 4);
    });
    rayGeo.setAttribute("aRayA", new THREE.InstancedBufferAttribute(a, 4));
    rayGeo.setAttribute("aRayB", new THREE.InstancedBufferAttribute(b, 4));
    rayGeo.setAttribute("aRayC", new THREE.InstancedBufferAttribute(c, 4));
    rayGeo.instanceCount = nr;
    this.disposables.push(base);
    this.add(new THREE.Mesh(rayGeo, this.additive(rayVertex, rayFragment, { side: THREE.DoubleSide })), rayGeo, 4);

    const lensGeo = new THREE.BufferGeometry();
    lensGeo.setAttribute("aLens", new THREE.BufferAttribute(new Float32Array(lenses), 4));
    lensGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((lenses.length / 4) * 3), 3));
    this.add(new THREE.Points(lensGeo, this.additive(lensVertex, lensFragment)), lensGeo, 5);

    if (s.haze) {
      const sheets: THREE.BufferGeometry[] = [];
      const sheet = (w: number, hgt: number, y: number, z: number, layer: number) => {
        const g = new THREE.PlaneGeometry(w, hgt).translate(0, y, z);
        g.deleteAttribute("normal");
        g.setAttribute("aLayer", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(layer), 1));
        sheets.push(g);
      };
      sheet(80, 30, 5, 12, 0);
      sheet(90, 16, -1, 24, 1);
      const hazeGeo = mergeGeometries(sheets)!;
      sheets.forEach((g) => g.dispose());
      this.add(new THREE.Mesh(hazeGeo, this.additive(hazeVertex, hazeFragment)), hazeGeo, 2);
    }

    const nc = s.confetti;
    const seeds = new Float32Array(nc * 4);
    for (let i = 0; i < nc; i++) {
      seeds.set([(this.rand() - 0.5) * 50, 13 + this.rand() * 24, this.rand(), this.rand()], i * 4);
    }
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    cGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nc * 3), 3));
    this.add(new THREE.Points(cGeo, this.mat(confettiVertex, confettiFragment)), cGeo, 1);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.ringFrame?.dispose();
  }
}
