# Echo Fest — site spec

Concept project — fictional brand. Owner: Alhassan Alfarran.

## 1. Concept

**Echo Fest** is a fictional three-day electronic and alternative music festival held in a disused quarry valley
("Halvard Quarry") from 21–23 August 2027. The idea behind the brand: *the valley answers back*. Every sound you make
comes back to you — so the site's hero is a tunnel of light that literally listens. Press play and a synth set built
in the browser drives the tunnel; switch the microphone on and the tunnel reacts to your room.

Tone of voice: warm, nocturnal, a bit cheeky, short sentences. No hype clichés ("epic", "unforgettable").

## 2. Audience

- 19–35-year-olds who already go to one or two festivals a year and pick by lineup and atmosphere.
- They browse on phones (70%+), often on the move, often with low-power mode on.
- Secondary: studio clients looking at the portfolio — they should feel the craft in the first five seconds.

## 3. Sections (in order)

1. **Hero** — full-height audio-reactive 3D tunnel, festival name, dates/place, "Play the demo set" + "Use my microphone"
   + "Get tickets".
2. **About** ("The valley answers back") — what Echo Fest is, four stats.
3. **Lineup** — three day tabs (Fri / Sat / Sun), headliners large, the rest in a dense type wall.
4. **Stages** — four stages as an editorial list, each with a character and a colour.
5. **Past editions** — a fictional four-step timeline (social proof without fake quotes or real brands).
6. **Tickets** — three tiers, prices, what's included; concept notice on reserve.
7. **Plan your trip** — getting there, camping, accessibility, sound & safety.
8. **FAQ** — six questions in native disclosure widgets.
9. **Final CTA** — "See you in the quarry", tickets + demo set.
10. **Footer** — newsletter-free; credits line, "Concept project — fictional brand.", "© 2026 Alhassan Alfarran",
   link to the designer's portfolio.

## 4. Signature 3D moment — the Echo Tunnel

**Technique (all code, zero assets):**

- An open cylinder (`CylinderGeometry`, rendered `BackSide`) with a custom `ShaderMaterial`. The vertex shader pushes the
  wall in and out by a 64-bin frequency spectrum stored in a `DataTexture` (R8, 64×1) that is re-uploaded each frame from
  a reused `Uint8Array` — mapped around the circumference so bass bulges the bottom and treble ripples the top.
  The fragment shader draws a scrolling neon grid (rings + longitudinal ribs) with distance fog, a lime→coral→cyan
  gradient along depth and a hot "beat flash" uniform driven by bass energy.
- 48 instanced torus "light gates" (`InstancedMesh`) travelling towards the camera; each gate's scale and brightness
  follow one spectrum bin. Matrices are written into reused `Object3D`/`Color` objects — no allocations in `useFrame`.
- A `Points` field of drifting sparks (count by tier) moving through the tunnel in the vertex shader (time uniform only;
  no CPU work per particle).
- The camera sways gently with the pointer (damped) and rolls slightly on bass hits.
- **Lighting and material (upgrade):** analytic wall normals (four extra history samples per vertex), value-noise
  granite with panel seams (every 6th rib / 4th ring), a travelling stage light (half-Lambert + Blinn-Phong, specular
  scaled by the audio bulge), a fresnel rim, a wet floor band and gate light spill on the rock. ACES tone mapping
  (exposure 1.05) with a x1.15 linear pre-boost on the neon colours.
- **Gates as fixtures:** smooth LED tori (12x160 segments; 8x96 on low) with an HDR core, aluminium housings
  (rounded-rect sweep, `MeshStandardMaterial` + a one-time PMREM of a code-made studio) on high/medium, and additive
  halo sprites instead of post-processing bloom. Housings and halos share the LED instance-matrix buffer.
- **The quarry exit:** an additive portal disc (white core -> coral) with a thin cyan ring at the far end; the poster has
  the same warm core so the crossfade is seamless.
- **Intro "lights on":** `uIntro` 0 -> 1 over 1.4 s after the canvas is ready; grid, gates and halos light up from the
  camera into the depth.
- **The drop (signature scroll moment):** the hero is a sticky scroll track (220svh, 170svh below md, motion only).
  p 0.15-0.65 build-up: speed x1 -> x5, dolly zoom (camera pushes 26 units while the fov widens so the portal holds its
  size), gates brighten, hero copy lifts and fades. p 0.65-0.72 the drop: white shockwave down the walls, gates flash,
  camera rolls 6°; with the demo set playing, a riser cut and a bar of doubled kicks. p 0.72-1 the walls open (x3.5,
  fading out), gates scatter outward and the portal grows into the coral glow that the About section continues.
  Reduced motion: no tall track, the 3D shows a still frame of the p = 0.4 composition.
- **Audio:** WebAudio graph built after a click. A generative 124 BPM demo set (kick = sine pitch drop, hats = filtered
  noise, bass = sawtooth through a resonant low-pass, pad = detuned triangles) scheduled with a 100 ms look-ahead
  scheduler. All voices → master gain → `AnalyserNode` (fftSize 128) → speakers. The microphone (optional,
  `getUserMedia` after a click) connects only to the analyser, never to the speakers (no feedback). With no audio running
  the tunnel uses a procedural "idle breath" spectrum so it is never dead.

**Quality tiers** (decided before the Canvas is created; GPU name via `WEBGL_debug_renderer_info`; `?quality=` overrides):

| tier | DPR cap | tunnel segments | gates | sparks | bloom | antialias |
|---|---|---|---|---|---|---|
| high | 2 | 96×160 | 48 | 1800 | halo sprites + housings, 3 rock octaves | yes (MSAA) |
| medium | 1.5 | 64×120 | 36 | 900 | halo sprites at half strength + housings, 2 octaves | yes |
| low | 1 | 40×80 | 24 | 300 | none (soft grid glow only), 1 octave | no |

Software renderers (SwiftShader, llvmpipe, softpipe, Microsoft Basic Render, Mesa offscreen, or a context that needs
`failIfMajorPerformanceCaveat: false`) → no 3D at all, the poster stays (`?quality=` still forces the tunnel on); Intel/AMD integrated, Mali, Adreno, PowerVR → at most medium; touch devices → at most medium.
drei `<PerformanceMonitor>` lowers DPR on decline and switches the halo sprites off.

**Render loop:** `frameloop="demand"` by default. The loop runs continuously only while the hero is on screen, the tab is
visible and (motion is allowed OR audio is playing). On medium/low tiers without audio it runs at 30 fps on demand.
Otherwise one frame is rendered and the GPU idles; scroll, the intro and easing request frames only while they move.

**Reduced motion:** respected by default (`prefers-reduced-motion`), with a "Turn on full motion" toggle remembered in
`localStorage` (`?motion=full|reduced` overrides). Reduced = no forward flight, no camera sway or roll, no sparks drift;
the tunnel renders as a still frame. If the visitor starts audio, the wall and gates still respond to the sound
(user-initiated), but the camera stays put.

**No WebGL / software renderer / context lost:** a designed CSS/SVG poster (concentric neon rings, vanishing point) replaces the canvas; all
content and buttons stay usable (audio still plays).

**Warm-up:** the 3D chunk is imported only after window `load` + `requestIdleCallback` (2.5 s timeout). Geometry is built
in short steps that yield to the main thread, shaders are compiled with `gl.compileAsync(scene, camera)` behind the
poster, and the canvas fades in (opacity only) after the first frame.

## 5. Design system

**Palette** (dark only — it's a night festival; contrast checked against `--night`):

| token | hex | use | contrast on #0B0614 |
|---|---|---|---|
| night | #0B0614 | page background | — |
| dusk | #150C24 | panels | — |
| plum | #241338 | borders, raised surfaces | — |
| ink | #F5F0FF | body text | 18.4:1 |
| haze | #B9A8D9 | secondary text | 8.9:1 |
| acid | #C8FF3D | primary accent, CTA bg (text on it = night) | 16.6:1 |
| coral | #FF5C86 | second accent | 6.6:1 |
| cyan | #45E6FF | third accent, focus ring | 12.6:1 |

**Fonts** (Google Fonts, OFL, via `next/font/google`): **Unbounded** (display, 500–900, wide geometric — the poster
voice) + **Manrope** (body, 400–700). Mono feel for times via Manrope tabular numerals.

**Type scale:** 0.875 / 1 / 1.125 / 1.375 / 1.75 rem, display `clamp(2.5rem, 7vw, 5.5rem)` / 0.92 for every H2, mega
`clamp(3rem, 15vw, 10.5rem)` / 0.86 / -0.035em for the H1. Each section eyebrow carries an index ("01"–"07").

**2D motion:** echo trail (two outlined H1 copies slide out once), intro lift (eyebrow, lede, buttons, transform only,
never from opacity 0), split-word H2 reveals, scroll progress bar (CSS scroll timeline with a JS fallback), section dots
(lg+), magnetic buttons and a dot + ring cursor (fine pointers, motion allowed; the native cursor always stays).
Acid is the only UI accent; coral and cyan are content colours (3D, stage coding, type wall).

**Spacing scale** (4-based): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px — Tailwind's default 0.25rem scale; section padding
`py-24 md:py-32`, gutters `px-4 sm:px-6 lg:px-10`.

**Shape:** sharp corners on panels, fully round pill buttons, 1px plum borders, thick acid underlines on hover.
Ticket cards are cut like ticket stubs (CSS radial-gradient notches).

## 6. Final copy

### Hero
- Eyebrow: "21—23 August 2027 · Halvard Quarry"
- H1: "Echo Fest"
- Lede: "Three nights in a quarry that sings back. Press play and the tunnel listens."
- Buttons: "Play the demo set" / "Stop the set" · "Use my microphone" / "Mic is on" · "Get tickets"
- Small print under buttons: "The demo set is synthesised live in your browser. The microphone never leaves your device."

### About — "The valley answers back"
"Halvard Quarry is a bowl of granite forty metres deep. Shout into it and it shouts back a quarter-second later. In 2019
a handful of us carried a sound system down the old haul road to see what a kick drum would do in there. It did a lot.

Echo Fest is what that night grew into: 62 acts across four stages, built into the terraces of the quarry, lit from
inside the rock and kept small on purpose. No VIP decks, no sponsor towers — just very good sound in a very strange place."

Stats: "3 nights" · "4 stages" · "62 acts" · "9,000 people, max"

### Lineup
H2: "Lineup" — sub: "Announced in full. Set times land in July."
- **Friday 21** — headliners: Velvet Static, Mira Kova · also: Hollow Cartography, Tessellate, DJ Paperweight,
  Saint Lumen, Orchid Engine, Low Tide Choir, Kasimir & The Night Bus, Reverb Unit 9, Fen, Glass Harbour, Nadia Oruç,
  Brightline, Moss Theory, Tandem Ghost, Lake Static, Anouk V, Kilns, Pale Signal
- **Saturday 22** — headliners: The Quarry Lights, Ozu Ozu · also: Sable & Ash, Moonfeeder, Cartwheel Sound System,
  Juno Halvard, Oak & Ion, Night Index, Sundial Kids, Petra Weiss, Marrow, Telefon Lake, Ilse, Hum Collective,
  Rosa Nightjar, Copper Fields, Breakwater, Lumen Twins, Nova Brandt, Wren
- **Sunday 23** — headliners: Ana Silvermoon, Tidal Archive · also: Second Sun, Hearth, Halcyon Drive, Ferro, Little
  Cascade, Pilar Montes, Echo Chamber Orchestra, Slow Bloom, Kite Theory, Morning Static, Dune Choir, Ottoline,
  Field Notes, Quiet Riot Club, Ember Lane, Yuki Sorrel, Coastline, Halo Rider

### Hero meta rail (lg+)
"N 61°12′ / Halvard Quarry" · "124 BPM" · "62 acts · 4 stages" · "Signal · live / idle" (12-bar meter)

### Stages
H2: "Four stages, one rock"
1. **The Bowl** (acid) — "The quarry floor. A 360° rig pointed straight up the walls, so the echo becomes part of the mix.
   Headliners after dark."
2. **Terrace** (coral) — "Cut into the second ledge with a view over the whole valley. Live bands, sunset sets and a
   very long bar."
3. **The Shaft** (cyan) — "An old drainage tunnel, 120 metres of concrete and a sound system that will rearrange your
   ribs. Open 22:00 till sunrise."
4. **Moss Room** (haze) — "A quiet tent in the pines. Ambient, listening sessions, sound baths and the best coffee on site."

### Past editions
Eyebrow "Past editions" — H2: "How it got this loud"
- 2019 — "140 people, one borrowed rig, one very loud night."
- 2021 — "The Shaft opens. Someone cries during the sunrise set."
- 2024 — "Rewilding fund plants its 10,000th pine."
- 2026 — "9,000 tickets, gone in 41 minutes."
- Small print: "Concept project — fictional history."

### Tickets
Eyebrow: "Three ways in" — H2: "Tickets" — sub: "Prices include booking fees. Every ticket funds the quarry's rewilding fund."
1. **Weekend** — €189 — "All three nights, all four stages." — includes: Fri–Sun entry · Free shuttle from Halvard
   station · Refillable cup
2. **Weekend + Camping** — €239 — badge "Most picked" — "Wake up in the pines." — includes: Everything in Weekend ·
   Pitch in the Pine Field · Hot showers, charging tent
3. **Day ticket** — €79 — "Pick one night." — includes: Entry on one day · All four stages · Re-entry until 23:00
- Button: "Reserve" → inline notice: "Echo Fest is a concept project — tickets aren't on sale. Thanks for wanting to come."

### Plan your trip
H2: "Plan your trip"
- **Getting there** — "Trains run to Halvard station every 30 minutes. Our electric shuttle loops from the station to the
  gate from 12:00 till 04:00, free with every ticket."
- **Camping** — "The Pine Field opens Thursday at 16:00. Quiet zone after 01:00, family zone by the lake, lockers and
  charging in the barn."
- **Access** — "Step-free routes to every stage, viewing platforms at The Bowl and Terrace, a quiet room, and free
  carer tickets. Email us and we'll plan it with you."
- **Sound & safety** — "Free earplugs at every bar, sound levels kept under 100 dB at the front, welfare team on site
  around the clock."

### FAQ
H2: "Questions"
1. "Is there an age limit?" — "18+ for the late stages after 22:00. Under-16s are welcome on Terrace and Moss Room until
   21:00 with an adult."
2. "Can I bring my own food?" — "Yes. Food for your own use is fine anywhere; glass and camping stoves outside the
   Pine Field are not."
3. "Is it cashless?" — "Card and phone payments everywhere, and a cash top-up desk at the gate if you prefer."
4. "What happens if it rains?" — "The quarry drains fast and every stage is covered. Bring boots anyway — the haul road
   gets muddy."
5. "Can I re-enter?" — "Weekend holders can come and go freely. Day tickets allow re-entry until 23:00."
6. "Is the tunnel on this page really listening?" — "Only if you ask it to. The demo set is generated in your browser,
   and the microphone feed is analysed on your device and never recorded or sent anywhere."

### Final CTA
- H2: "See you in the quarry" — sub: "21—23 August 2027 · Halvard Quarry"
- Buttons: "Get tickets" (→ #tickets) · "Play the demo set" (starts the set, then back to the tunnel)

### Footer
- "Echo Fest · Halvard Quarry · 21—23 August 2027"
- "Concept project — fictional brand."
- "Design & code: Alhassan Alfarran" → https://alhassan-portfolio-sigma.vercel.app
- "© 2026 Alhassan Alfarran"
- Motion toggle: "Turn on full motion" / "Reduce motion"

### 404
- H1: "Nothing echoes here" — "This page wandered off into the quarry. Head back to the main stage." — "Back to Echo Fest"

## 7. Assets & licenses

| asset | source | license |
|---|---|---|
| Tunnel, gates, housings, halos, portal, sparks, env studio | code (three.js geometry + GLSL) | own |
| Demo audio set | code (WebAudio oscillators + noise) | own |
| No-WebGL poster | CSS gradients + inline SVG | own |
| Favicon (`app/icon.svg`) | hand-written SVG | own |
| OG / Twitter image | screenshot of the live site (`app/opengraph-image.png`, `app/twitter-image.png`) | own |
| Unbounded, Manrope | Google Fonts via next/font | SIL OFL 1.1 |

Zero external images, models, textures or audio files.

## 8. Performance budget

- First-load JS for `/` < 250 KB gzip, excluding the lazy 3D chunk (target ≈ 130–160 KB: Next + React + page).
- No GSAP/Lenis on this site: reveals use CSS + one IntersectionObserver; native scroll (no smoothing layer at all).
- Lazy 3D chunk (three + r3f + the drei helper) loaded with a plain `import()` after window `load` + idle, and never on
  software renderers. No post-processing at all (glow = additive halo sprites), so the high tier can use MSAA.
- LCP element = hero H1 / lede text (server-rendered, no JS reveal, font `display: swap`), never the canvas.
- GPU: draw calls high ≤ 7 (wall, LED, housing, halos, sparks, portal), medium ≤ 6, low ≤ 4. No extra passes.
- Per frame: 1 texture upload of 64 bytes, zero allocations.
- PageSpeed mobile ≥ 95 performance, 100 accessibility / best practices / SEO; LCP < 2.5 s; CLS 0.
- Structured data: a `WebSite` node (the festival is fictional, so no `MusicEvent`). Security headers in `next.config.ts`.
