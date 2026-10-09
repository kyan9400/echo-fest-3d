/*
  Quality tier, decided BEFORE the 3D canvas exists.
  - Reads the real GPU name from a throwaway WebGL2 context.
  - Software renderers -> low. Integrated laptop / phone GPUs and touch devices -> at most medium.
  - ?quality=low|medium|high in the URL always wins.
  Returns null when WebGL2 is not available, so the page shows the poster instead.
*/

export type Tier = "high" | "medium" | "low";

export type TierSettings = {
  dprCap: number;
  radial: number;
  length: number;
  gates: number;
  sparks: number;
  bloom: boolean;
  antialias: boolean;
};

export const TIERS: Record<Tier, TierSettings> = {
  high: { dprCap: 2, radial: 96, length: 160, gates: 48, sparks: 1800, bloom: true, antialias: false },
  medium: { dprCap: 1.5, radial: 64, length: 120, gates: 36, sparks: 900, bloom: false, antialias: true },
  low: { dprCap: 1, radial: 40, length: 80, gates: 24, sparks: 300, bloom: false, antialias: false },
};

function isTier(value: string | null): value is Tier {
  return value === "high" || value === "medium" || value === "low";
}

function gpuName(gl: WebGL2RenderingContext): string {
  const name = String(gl.getParameter(gl.RENDERER) || "");
  // Chromium/WebKit report a generic name; the real one comes from the debug extension.
  // Firefox already puts it in RENDERER (and warns when the extension is requested).
  if (!/^webkit/i.test(name)) return name;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || name) : name;
}

export function detectTier(): { tier: Tier; gpu: string } | null {
  const canvas = document.createElement("canvas");
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", { powerPreference: "high-performance" });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const gpu = gpuName(gl);
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  const forced = new URLSearchParams(window.location.search).get("quality");
  if (isTier(forced)) return { tier: forced, gpu };

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory || 4;
  const touch = window.matchMedia("(pointer: coarse)").matches;

  let tier: Tier = "high";
  if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) tier = "low";
  else if (nav.connection?.saveData || cores <= 2 || memory <= 2) tier = "low";
  else if (/intel|uhd|iris|mali|adreno|powervr|apple gpu|radeon\(tm\) graphics|radeon graphics/i.test(gpu)) tier = "medium";
  else if (touch || cores <= 4) tier = "medium";

  return { tier, gpu };
}
