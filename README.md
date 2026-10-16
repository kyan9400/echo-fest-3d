# Echo Fest — audio-reactive 3D festival site

A one-page site for **Echo Fest**, a fictional three-night music festival in a granite quarry. The hero is a tunnel of
light that listens: press **Play the demo set** and a synth set generated live in the browser drives the walls; switch
on **Use my microphone** and the tunnel reacts to the room you're in.

Concept project — fictional brand.

**Live:** https://echo-fest-3d.vercel.app

## Tech stack

- Next.js 16 (App Router, TypeScript strict, `src/` dir) · React 19
- three.js 0.186 · @react-three/fiber 9 · @react-three/drei 10 (PerformanceMonitor) — no post-processing: glow comes from additive halo sprites
- Tailwind CSS 4 (`@theme` tokens) · Web Audio API
- No GSAP / Lenis on this site: native scroll and one IntersectionObserver keep the first load small.

Exact versions are pinned in `package.json` (see the shared `STACK.md`).

## The signature 3D technique — the Echo Tunnel

- **Spectrum history texture.** Every 1/45 s the 64 log-spaced frequency bands are written as a new row of a 64×64
  `DataTexture` used as a ring buffer. The tunnel's vertex shader reads the row that matches each vertex's depth, so the
  newest sound sits at the camera and older sound travels away down the walls — a literal visual echo.
- **Displaced cylinder wall.** An open `CylinderGeometry` rendered from the inside with a custom `ShaderMaterial`:
  bass pushes the floor, treble ripples the ceiling, a scrolling anti-aliased neon grid (`fwidth`) with a
  lime → coral → cyan depth gradient and distance fog.
- **Bending path.** The tunnel curves away from the camera; the same `bend()` exists in GLSL and JS so the
  48 **instanced light gates** (one draw call) sit exactly inside the walls and pulse with the history row at their depth.
- **Lit granite.** Analytic normals from the history texture (no faceting on any tier), value-noise rock with panel
  seams, a stage light travelling down the tunnel (half-Lambert + Blinn-Phong), a fresnel rim, a wet glossy floor band
  and gate light spilling onto the rock. ACES tone mapping, so HDR cores roll off to white.
- **Fixtures, not lines.** Each gate is a smooth LED tube with an HDR core, an aluminium channel behind it
  (`MeshStandardMaterial` lit by a one-time PMREM of a tiny code-made studio — no HDRI) and an additive halo sprite.
  All three share one instance-matrix buffer.
- **The quarry exit.** A soft additive portal at the far end gives the eye a vanishing point.
- **Real quarry walls.** The pit around the stage is built from photogrammetry scans of real cliffs (Poly Haven, CC0:
  Namaqualand Cliff 02 behind the stage, Rock Face 01 flanking it), stood upright, simplified and meshopt-compressed
  with 1k WebP textures (~1.1 MB together, decoded locally). A custom shader lights the real rock only with the show:
  the LED wall wash, the up-beam line, laser streaks sweeping across the strata on the beat and a plum night fill.
  They load with the 3D chunk and the reveal waits for them; if they fail, the procedural quarry backdrop remains.
- **The drop (scroll moment).** The hero is a sticky scroll track: the flight speeds up x5 while the camera dollies in
  and the fov widens (dolly zoom), a white shockwave races down the tunnel, every gate flashes, the camera rolls, then
  the walls open and the portal grows into the glow that becomes the About section. With the demo set playing, the
  music drops too (riser cut + doubled kick on the next bar).
- **Sparks** are a `Points` field animated entirely in the vertex shader (no CPU work per particle).
- **Audio.** A 124 BPM generative set — kick, clap, hats, resonant saw bass, detuned pad and an arp through a feedback
  delay — scheduled with a look-ahead clock. The microphone feeds only the analyser, never the speakers.
- **Performance.** The 3D chunk is imported only after window `load` + an idle callback, never during hydration.
  Quality tier chosen before the canvas exists (GPU name via `WEBGL_debug_renderer_info` on a throwaway context, touch,
  cores; `?quality=low|medium|high` overrides); software renderers (SwiftShader, llvmpipe, …) get the poster and
  never download three.js, `frameloop="demand"` with the loop running only while the hero is
  visible and something animates (30 fps on medium/low tiers unless audio plays), adaptive DPR through drei `PerformanceMonitor`, shaders pre-compiled with
  `gl.compileAsync` behind a poster, zero allocations per frame, no `backdrop-filter` over the canvas.
- **Motion.** Full motion by default on a first visit. The "Reduce motion" toggle switches to a still frame (no flight
  or camera sway) and is remembered in `localStorage` for later visits; `?motion=full|reduced` overrides. Audio still makes the
  walls respond, the camera stays put.
- **No WebGL / software renderer / context lost** → a designed SVG poster of the tunnel; the page and the audio stay fully usable.

## Run it

```bash
npm install
npm run dev     # local development
npm run build   # production build
npm run build:pages   # static GitHub Pages mirror in out/ (served from /echo-fest-3d)
npm run lint
```

If the build runs out of memory on Windows: `set NODE_OPTIONS=--max-old-space-size=3072` (PowerShell:
`$env:NODE_OPTIONS="--max-old-space-size=3072"`).

## Project layout

```
src/app/            layout, page, 404, OG/Twitter image (site screenshot), favicon, robots, sitemap, global styles (design tokens)
src/components/     page UI (audio controls, lineup tabs, motion toggle, poster, reveal, scroll chrome, pointer fx)
src/components/three/  Tunnel (Canvas), engine (scene + per-frame update + the drop), shaders
src/lib/            audio engine, quality tiers, motion preference, shared scroll listener, site copy
SPEC.md             design spec: concept, sections, design system, copy, budgets
```

## Credits

Fonts: Unbounded and Manrope (SIL OFL 1.1). Libraries and the two CC0 cliff scans from Poly Haven: see
[CREDITS.md](CREDITS.md). Everything else (3D, imagery, audio) is made in code for this project.

© 2026 Alhassan Alfarran — see [LICENSE](LICENSE).
