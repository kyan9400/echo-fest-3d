# Echo Fest — audio-reactive 3D festival site

A one-page site for **Echo Fest**, a fictional three-night music festival in a granite quarry. The hero is a tunnel of
light that listens: press **Play the demo set** and a synth set generated live in the browser drives the walls; switch
on **Use my microphone** and the tunnel reacts to the room you're in.

Concept project — fictional brand.

**Live:** <!-- LIVE_URL -->

## Tech stack

- Next.js 16 (App Router, TypeScript strict, `src/` dir) · React 19
- three.js 0.186 · @react-three/fiber 9 · @react-three/drei 10 (PerformanceMonitor) · @react-three/postprocessing 3 (bloom, high tier only)
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
- **Sparks** are a `Points` field animated entirely in the vertex shader (no CPU work per particle).
- **Audio.** A 124 BPM generative set — kick, clap, hats, resonant saw bass, detuned pad and an arp through a feedback
  delay — scheduled with a look-ahead clock. The microphone feeds only the analyser, never the speakers.
- **Performance.** Quality tier chosen before the canvas exists (GPU name via `WEBGL_debug_renderer_info`, touch,
  cores; `?quality=low|medium|high` overrides), `frameloop="demand"` with the loop running only while the hero is
  visible and something animates, adaptive DPR through drei `PerformanceMonitor`, shaders pre-compiled with
  `gl.compileAsync` behind a poster, zero allocations per frame, no `backdrop-filter` over the canvas.
- **Motion.** `prefers-reduced-motion` is respected by default (still frame, no flight or camera sway) with a
  "Turn on full motion" toggle remembered in `localStorage`; `?motion=full|reduced` overrides. Audio still makes the
  walls respond, the camera stays put.
- **No WebGL / context lost** → a designed SVG poster of the tunnel; the page and the audio stay fully usable.

## Run it

```bash
npm install
npm run dev     # local development
npm run build   # production build
npm run lint
```

If the build runs out of memory on Windows: `set NODE_OPTIONS=--max-old-space-size=3072` (PowerShell:
`$env:NODE_OPTIONS="--max-old-space-size=3072"`).

## Project layout

```
src/app/            layout, page, 404, OG image, favicon, robots, sitemap, global styles (design tokens)
src/components/     page UI (audio controls, lineup tabs, motion toggle, poster, reveal)
src/components/three/  Tunnel (Canvas), engine (scene + per-frame update), shaders, bloom effects
src/lib/            audio engine, quality tiers, motion preference, site copy
SPEC.md             design spec: concept, sections, design system, copy, budgets
```

## Credits

Fonts: Unbounded and Manrope (SIL OFL 1.1). Libraries: see [CREDITS.md](CREDITS.md). All 3D, imagery and audio are
made in code for this project.

© 2026 Alhassan Alfarran — see [LICENSE](LICENSE).
