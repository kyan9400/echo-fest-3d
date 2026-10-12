/*
  Quality tier, decided BEFORE the 3D canvas exists (and before the 3D chunk is even downloaded).
  - Reads the real GPU name from a tiny throwaway WebGL2 context (WEBGL_debug_renderer_info), then loses it
    with WEBGL_lose_context. No three.js needed.
  - Software renderers (SwiftShader, llvmpipe, softpipe, Microsoft Basic Render, Mesa offscreen, or a context
    that only exists with a "major performance caveat") get NO 3D: the designed poster stays.
  - Integrated laptop / phone GPUs and touch devices -> at most medium.
  - ?quality=low|medium|high in the URL always wins and forces the 3D on (as long as WebGL2 exists at all).
  Returns null when the page should show the poster instead.
*/

export type Tier = "high" | "medium" | "low";

export type TierSettings = {
  dprCap: number;
  radial: number;
  length: number;
  gates: number;
  sparks: number;
  /** halo sprites on (the glow that replaced post-processing bloom) */
  bloom: boolean;
  /** halo strength: high 1, medium half */
  halo: number;
  /** aluminium housings behind the LED gates */
  housing: boolean;
  /** value-noise octaves in the rock shader */
  rockOctaves: number;
  /** LED torus [tube, ring] segments */
  tube: [number, number];
  antialias: boolean;
};

export const TIERS: Record<Tier, TierSettings> = {
  high: { dprCap: 2, radial: 96, length: 160, gates: 48, sparks: 1800, bloom: true, halo: 1, housing: true, rockOctaves: 3, tube: [12, 160], antialias: true },
  medium: { dprCap: 1.5, radial: 64, length: 120, gates: 36, sparks: 900, bloom: true, halo: 0.5, housing: true, rockOctaves: 2, tube: [12, 160], antialias: true },
  low: { dprCap: 1, radial: 40, length: 80, gates: 24, sparks: 300, bloom: false, halo: 0, housing: false, rockOctaves: 1, tube: [8, 96], antialias: false },
};

function isTier(value: string | null): value is Tier {
  return value === "high" || value === "medium" || value === "low";
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

function gpuName(gl: WebGL2RenderingContext): string {
  const name = String(gl.getParameter(gl.RENDERER) || "");
  // Chromium/WebKit report a generic name; the real one comes from the debug extension.
  // Firefox already puts it in RENDERER (and warns when the extension is requested).
  if (!/^webkit/i.test(name)) return name;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || name) : name;
}

function probe(caveat: boolean): { gpu: string } | null {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", {
      failIfMajorPerformanceCaveat: caveat,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const gpu = gpuName(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { gpu };
}

/** Cheap GPU probe: `software` is true for CPU rasterisers, `gpu` is null when WebGL2 is missing. */
export function probeGpu(): { gpu: string | null; software: boolean } {
  const fast = probe(true);
  if (fast) return { gpu: fast.gpu, software: SOFTWARE.test(fast.gpu) };
  // only a slow (caveat) context, or no WebGL2 at all
  const slow = probe(false);
  return { gpu: slow ? slow.gpu : null, software: !!slow };
}

export function detectTier(): { tier: Tier; gpu: string } | null {
  const { gpu, software } = probeGpu();
  if (gpu === null) return null;

  const forced = new URLSearchParams(window.location.search).get("quality");
  if (isTier(forced)) return { tier: forced, gpu };
  if (software) return null;

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const touch = window.matchMedia("(pointer: coarse)").matches;

  let tier: Tier = "high";
  if (nav.connection?.saveData || cores <= 2 || memory <= 2) tier = "low";
  else if (/intel|uhd|iris|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics/i.test(gpu)) tier = "medium";
  else if (touch || cores <= 4) tier = "medium";

  return { tier, gpu };
}
