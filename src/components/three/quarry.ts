/*
  Real quarry walls: photogrammetry scans of real cliffs from Poly Haven (CC0), namaqualand_cliff_02 and
  rock_face_01, simplified and meshopt-compressed (local decoder, no CDN) with 1k WebP textures.
  Served from /public and loaded with the 3D chunk; the reveal waits for them. If they fail to load,
  the procedural quarry backdrop is still there and the stage simply has no scanned walls.
*/

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type RockAsset = { geometry: THREE.BufferGeometry; map: THREE.Texture; normalMap: THREE.Texture };
export type QuarryAssets = { cliff: RockAsset; face: RockAsset };

/** meshopt / KHR_mesh_quantization stores normalized integers; expand to floats so the node transform can be baked in */
function dequantize(geo: THREE.BufferGeometry) {
  for (const name of ["position", "normal", "uv"]) {
    const src = geo.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!src || src.array instanceof Float32Array) continue;
    const out = new Float32Array(src.count * src.itemSize);
    for (let i = 0; i < src.count; i++) for (let k = 0; k < src.itemSize; k++) out[i * src.itemSize + k] = src.getComponent(i, k);
    geo.setAttribute(name, new THREE.BufferAttribute(out, src.itemSize));
  }
  return geo;
}

function firstMesh(root: THREE.Object3D): RockAsset | null {
  let found: RockAsset | null = null;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (found || !m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    if (!mat.map || !mat.normalMap) return;
    m.updateWorldMatrix(true, false);
    const geometry = dequantize(m.geometry.clone()).applyMatrix4(m.matrixWorld);
    found = { geometry, map: mat.map, normalMap: mat.normalMap };
  });
  return found;
}

export async function loadQuarry(): Promise<QuarryAssets | null> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  try {
    const [a, b] = await Promise.all([
      loader.loadAsync(`${BASE}/models/namaqualand_cliff_02.glb`),
      loader.loadAsync(`${BASE}/models/rock_face_01.glb`),
    ]);
    const cliff = firstMesh(a.scene);
    const face = firstMesh(b.scene);
    if (!cliff || !face) return null;
    // both scans are slopes leaning back ~36-42 degrees; stand them up into quarry walls (a slight lean stays)
    cliff.geometry.rotateX(0.5);
    face.geometry.rotateX(0.6);
    for (const r of [cliff, face]) {
      r.map.colorSpace = THREE.SRGBColorSpace;
      r.map.anisotropy = 4;
      r.normalMap.anisotropy = 4;
    }
    return { cliff, face };
  } catch {
    return null;
  }
}
