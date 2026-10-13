"use client";
// a client component so the server payload only references it (the SVG is not serialised twice)

// Still poster of the main stage: shown while the 3D loads, and instead of it when WebGL is unavailable.
// Pure SVG, drawn in code. Same composition as the 3D hero: the LED wall with the glowing tunnel mouth
// and its three rings, truss and roof, beams and laser fans, and the crowd with phone lights.
// The scene is drawn once (world 1600 x 1460) and shown through two viewBoxes: landscape frames the stage
// right of the headline, portrait puts the tunnel mouth above it (like the camera does).

const ACID = "#c8ff3d";
const CORAL = "#ff5c86";
const CYAN = "#45e6ff";
const HUES = [ACID, CORAL, CYAN];
const MX = 1000; // tunnel mouth centre
const MY = 520;
const WALL = { x0: 470, x1: 1530, y0: 120, y1: 770 };
const TRUSS_Y = 84;
const DECK_Y = 770;

// rounded numbers keep the server and client markup identical
const f = (n: number) => Math.round(n * 10) / 10;

/** Small deterministic PRNG so the crowd looks the same on server and client. */
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

function buildScene() {
  const rand = rng(2027);

  // crowd: rows of head-and-shoulder silhouettes, bigger towards the viewer; 30% with an arm up.
  // Each row is one skyline path closed to the bottom, drawn back to front (integers keep it small).
  const crowd: { d: string; arms: string; w: number }[] = [];
  let glows = ""; // phone glows as one path of circles
  let screens = ""; // phone screens (white) and a few cyan ones
  let screensCyan = "";
  const n = Math.round;
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const y = 805 + Math.pow(t, 1.6) * 560;
    const s = 0.55 + t * 2.6; // figure scale
    const step = 24 * Math.max(s, 1.5); // far rows: fewer, wider-spaced figures (they read as a band anyway)
    const hr = 4.8 * s; // head radius
    let d = `M-40 1460L-40 ${n(y + 12 * s)}`;
    let arms = "";
    for (let x = -20 + rand() * step; x < 1640; x += step * (0.8 + rand() * 0.6)) {
      const yy = y + (rand() - 0.5) * 10 * s;
      const w = 10 * s;
      const h = 12 * s;
      d += `L${n(x - w)} ${n(yy + h)}Q${n(x - w)} ${n(yy)} ${n(x - hr)} ${n(yy)}a${n(hr)} ${n(hr * 1.15)} 0 1 1 ${n(hr * 2)} 0Q${n(x + w)} ${n(yy)} ${n(x + w)} ${n(yy + h)}`;
      if (rand() < 0.3) {
        const side = rand() < 0.5 ? -1 : 1;
        const hx = x + side * (w + 5 * s);
        const hy = yy - 26 * s;
        arms += `M${n(x + side * w * 0.7)} ${n(yy + 3 * s)}L${n(hx)} ${n(hy)}`;
        if (rand() < 0.55) {
          const py = hy - 2 * s;
          const gr = n(14 * s);
          glows += `M${n(hx - gr)} ${n(py)}a${gr} ${gr} 0 1 0 ${gr * 2} 0a${gr} ${gr} 0 1 0 ${-gr * 2} 0`;
          const sw = Math.max(2, n(3.2 * s));
          const sh = Math.max(3, n(5.2 * s));
          const scr = `M${n(hx - sw / 2)} ${n(py - sh / 2)}h${sw}v${sh}h${-sw}z`;
          if (rand() < 0.75) screens += scr;
          else screensCyan += scr;
        }
      }
    }
    crowd.push({ d: `${d}L1640 ${n(y + 12 * s)}L1640 1460Z`, arms, w: f(2.2 * s) });
  }

  // spectrum bars on the wings
  const bars: { x: number; h: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const h = 40 + Math.abs(Math.sin(i * 1.7 + 0.6)) * 220 * (1 - i / 14);
    bars.push({ x: f(i * 20), h: f(h) });
  }

  // stars over the quarry rim
  let stars = "";
  for (let i = 0; i < 40; i++) {
    const r = 1 + Math.round(rand());
    stars += `M${Math.round(rand() * 1600)} ${Math.round(rand() * 260)}h${r}v${r}h${-r}z`;
  }

  return { crowd, glows, screens, screensCyan, bars, stars };
}

const SCENE = buildScene();

/**
 * `id` keeps the gradient ids unique when the poster is used twice on a page.
 * `lite` drops the crowd (the faint CTA backdrop does not need it, and it is most of the markup).
 */
export default function Poster({ id = "poster", lite = false }: { id?: string; lite?: boolean }) {
  const g = (n: string) => `${id}-${n}`;
  const url = (n: string) => `url(#${g(n)})`;
  const { crowd, glows, screens, screensCyan, bars, stars } = SCENE;

  // up beams: a fan rising from behind the top of the wall
  const upBeams = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const x = 560 + t * 880;
    const a = (t - 0.5) * 0.9 - Math.PI / 2;
    const len = 900;
    const spread = 0.05;
    return {
      d: `M${f(x)} ${WALL.y0}L${f(x + Math.cos(a - spread) * len)} ${f(WALL.y0 + Math.sin(a - spread) * len)}L${f(x + Math.cos(a + spread) * len)} ${f(WALL.y0 + Math.sin(a + spread) * len)}Z`,
      c: HUES[i % 3],
    };
  });
  // down beams from the moving heads on the front truss onto the crowd
  const downBeams = Array.from({ length: 8 }, (_, i) => {
    const x = 380 + i * 177;
    const tx = x + (1000 - x) * -0.35 + (i % 2 ? 60 : -60);
    return {
      x,
      d: `M${f(x - 5)} ${TRUSS_Y + 26}L${f(tx - 70)} 1180L${f(tx + 70)} 1180L${f(x + 5)} ${TRUSS_Y + 26}Z`,
      c: HUES[(i + 1) % 3],
    };
  });
  // laser fans from the deck lip, sweeping over the crowd
  const lasers: { d: string; c: string }[] = [];
  [640, 820, 1000, 1180, 1360].forEach((x, k) => {
    for (let j = 0; j < 7; j++) {
      const spread = (j - 3) * 0.16 + (x - 1000) * 0.0011 + (k % 2 ? 0.12 : -0.12);
      const a = Math.PI / 2 - spread * 2.2; // 0 = right, pi/2 = straight at the viewer (down on screen)
      lasers.push({
        d: `M${x} ${DECK_Y + 6}L${f(x + Math.cos(a) * 1800)} ${f(DECK_Y + 6 + Math.sin(a) * 160)}`,
        c: HUES[k % 3],
      });
    }
  });
  // echo wavefronts leaving the mouth
  const waves = Array.from({ length: 9 }, (_, i) => ({ r: 150 + i * 52, c: HUES[i % 3], o: f(0.55 - i * 0.05) }));
  // rings inside the tunnel, drifting a little off-centre with depth (the tunnel bends)
  const tunnel = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const r = 86 * Math.pow(1 - t, 1.7) + 6;
    return { cx: f(MX + t * 14), cy: f(MY - t * 8), r: f(r), c: HUES[i % 3], o: f(0.85 - t * 0.5), w: f(3 - t * 2.2) };
  });

  return (
    <div className="absolute inset-0 overflow-hidden bg-night">
      {/* the scene, defined once; not display:none so its gradients still resolve */}
      <svg width="0" height="0" className="absolute" focusable="false" aria-hidden="true">
        <defs>
          <radialGradient id={g("sky")} cx="62%" cy="38%" r="70%">
            <stop offset="0" stopColor="#3a1a4a" />
            <stop offset="0.45" stopColor="#1a0d2b" />
            <stop offset="1" stopColor="#0b0614" />
          </radialGradient>
          <radialGradient id={g("wall")} cx={MX} cy={MY} r="620" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3a1d52" />
            <stop offset="0.55" stopColor="#1d1030" />
            <stop offset="1" stopColor="#0f0819" />
          </radialGradient>
          <radialGradient id={g("rim")} cx={MX} cy={MY} r="240" gradientUnits="userSpaceOnUse">
            <stop offset="0.36" stopColor={CORAL} stopOpacity="0.9" />
            <stop offset="0.5" stopColor={CORAL} stopOpacity="0.35" />
            <stop offset="1" stopColor={CORAL} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={g("core")} cx={MX + 10} cy={MY - 6} r="92" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff4f0" />
            <stop offset="0.12" stopColor="#ffd0dc" />
            <stop offset="0.4" stopColor="#c45a9a" />
            <stop offset="0.75" stopColor="#3a1d52" />
            <stop offset="1" stopColor="#1a0d2b" />
          </radialGradient>
          <radialGradient id={g("haze")} cx="62%" cy="58%" r="55%">
            <stop offset="0" stopColor={CORAL} stopOpacity="0.22" />
            <stop offset="0.6" stopColor="#7a3a8a" stopOpacity="0.08" />
            <stop offset="1" stopColor="#0b0614" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g("up")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={g("down")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={g("upMask")} maskUnits="userSpaceOnUse" x="0" y="-800" width="1600" height="940">
            <rect x="0" y="-800" width="1600" height="940" fill={url("up")} />
          </mask>
          <mask id={g("downMask")} maskUnits="userSpaceOnUse" x="0" y={TRUSS_Y} width="1600" height="1100">
            <rect x="0" y={TRUSS_Y} width="1600" height="1100" fill={url("down")} />
          </mask>
          <linearGradient id={g("bar")} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={ACID} />
            <stop offset="1" stopColor={CORAL} />
          </linearGradient>
          <linearGradient id={g("crowd")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c0f2a" />
            <stop offset="0.3" stopColor="#0c0614" />
            <stop offset="1" stopColor="#050308" />
          </linearGradient>
          <pattern id={g("led")} width="7" height="7" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="#0b0614" fillOpacity="0.28" />
            <rect x="1" y="1" width="5" height="5" fill="#fff" fillOpacity="0.035" />
          </pattern>
          <pattern id={g("cab")} width="88" height="88" patternUnits="userSpaceOnUse" x={WALL.x0} y={WALL.y0}>
            <path d="M0 0H88M0 0V88" stroke="#0b0614" strokeWidth="2" strokeOpacity="0.7" />
          </pattern>
          <clipPath id={g("wallClip")}>
            <rect x={WALL.x0} y={WALL.y0} width={WALL.x1 - WALL.x0} height={WALL.y1 - WALL.y0} />
          </clipPath>

          <g id={g("scene")}>
            <rect width="1600" height="1460" fill={url("sky")} />
            <path d={stars} fill="#f5f0ff" fillOpacity="0.55" />
            {/* terraced quarry walls with a jagged rim */}
            <path
              d="M0 210L90 196L150 230L240 214L300 250L340 240L380 300L420 330V820H0Z M1600 190L1530 206L1470 186L1420 236L1380 228V820H1600Z"
              fill="#140b20"
            />
            <path
              d="M0 360L120 350L230 380L330 372L420 400 M0 520L150 510L300 540L420 530 M1600 340L1480 356L1400 344 M1600 500L1460 520L1400 512"
              stroke="#2a1a3c"
              strokeWidth="3"
              fill="none"
            />

            {/* up beams rising from behind the wall */}
            <g mask={url("upMask")} style={{ mixBlendMode: "screen" }}>
              {upBeams.map((b, i) => (
                <path key={i} d={b.d} fill={b.c} fillOpacity="0.55" />
              ))}
            </g>

            {/* roof, wings, line arrays */}
            <rect x="300" y="30" width="1400" height="22" fill="#0d0716" />
            <rect x="420" y={WALL.y0 - 10} width="56" height={DECK_Y - WALL.y0 + 10} fill="#0d0716" />
            <rect x="1524" y={WALL.y0 - 10} width="56" height={DECK_Y - WALL.y0 + 10} fill="#0d0716" />

            {/* the LED wall */}
            <g clipPath={url("wallClip")}>
              <rect x={WALL.x0} y={WALL.y0} width={WALL.x1 - WALL.x0} height={WALL.y1 - WALL.y0} fill={url("wall")} />
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1={f(MX + Math.cos(a) * 140)}
                    y1={f(MY + Math.sin(a) * 140)}
                    x2={f(MX + Math.cos(a) * 700)}
                    y2={f(MY + Math.sin(a) * 700)}
                    stroke={i % 2 ? CYAN : CORAL}
                    strokeOpacity="0.16"
                    strokeWidth="2"
                  />
                );
              })}
              {waves.map((w, i) => (
                <circle
                  key={i}
                  cx={MX}
                  cy={MY}
                  r={w.r}
                  fill="none"
                  stroke={w.c}
                  strokeOpacity={w.o}
                  strokeWidth={i === 0 ? 5 : 3}
                />
              ))}
              {[-1, 1].map((sd) =>
                bars.map((b, i) => (
                  <rect
                    key={`${sd}-${i}`}
                    x={sd < 0 ? 520 + b.x : 1466 - b.x}
                    y={DECK_Y - b.h}
                    width="14"
                    height={b.h}
                    fill={url("bar")}
                    fillOpacity="0.55"
                  />
                )),
              )}
              <rect x={WALL.x0} y={WALL.y0} width={WALL.x1 - WALL.x0} height={WALL.y1 - WALL.y0} fill={url("led")} />
              <rect x={WALL.x0} y={WALL.y0} width={WALL.x1 - WALL.x0} height={WALL.y1 - WALL.y0} fill={url("cab")} />
            </g>

            {/* the tunnel mouth: hot rim, three LED rings, the rings inside and the warm core */}
            <circle cx={MX} cy={MY} r="240" fill={url("rim")} />
            <circle cx={MX} cy={MY} r="88" fill={url("core")} />
            {tunnel.map((t, i) => (
              <circle
                key={i}
                cx={t.cx}
                cy={t.cy}
                r={t.r}
                fill="none"
                stroke={t.c}
                strokeOpacity={t.o}
                strokeWidth={t.w}
              />
            ))}
            {[
              [96, ACID],
              [111, CORAL],
              [131, CYAN],
            ].map(([r, c]) => (
              <g key={r}>
                <circle cx={MX} cy={MY} r={r} fill="none" stroke={c as string} strokeOpacity="0.25" strokeWidth="18" />
                <circle cx={MX} cy={MY} r={r} fill="none" stroke={c as string} strokeWidth="6" />
                <circle cx={MX} cy={MY} r={r} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
              </g>
            ))}

            {/* deck, subs, hanging line arrays */}
            <rect x="380" y={DECK_Y} width="1240" height="34" fill="#0a0612" />
            <rect x="560" y={DECK_Y + 34} width="60" height="40" fill="#0d0716" />
            <rect x="1380" y={DECK_Y + 34} width="60" height="40" fill="#0d0716" />
            {Array.from({ length: 8 }, (_, k) => (
              <g key={k} fill="#0d0716">
                <rect x={f(486 - k * 1.5)} y={150 + k * 22} width="40" height="19" />
                <rect x={f(1474 + k * 1.5)} y={150 + k * 22} width="40" height="19" />
              </g>
            ))}

            {/* front truss with towers and moving heads */}
            <g stroke="#3d2c52" strokeWidth="2.5" fill="none">
              <path d={`M310 ${TRUSS_Y}H1690M310 ${TRUSS_Y + 18}H1690`} />
              <path
                d={Array.from(
                  { length: 70 },
                  (_, i) => `${i ? "L" : "M"}${310 + i * 20} ${i % 2 ? TRUSS_Y + 18 : TRUSS_Y}`,
                ).join("")}
                strokeWidth="1.5"
              />
              {[322, 1678].map((x) => (
                <g key={x}>
                  <path d={`M${x - 9} ${TRUSS_Y}V900M${x + 9} ${TRUSS_Y}V900`} />
                  <path
                    d={Array.from(
                      { length: 41 },
                      (_, i) => `${i ? "L" : "M"}${i % 2 ? x + 9 : x - 9} ${TRUSS_Y + i * 20}`,
                    ).join("")}
                    strokeWidth="1.5"
                  />
                </g>
              ))}
            </g>
            {downBeams.map((b) => (
              <rect key={b.x} x={b.x - 8} y={TRUSS_Y + 20} width="16" height="10" rx="2" fill="#1c1228" />
            ))}

            {/* haze and the beams through it */}
            <rect width="1600" height="1460" fill={url("haze")} />
            <g mask={url("downMask")} style={{ mixBlendMode: "screen" }}>
              {downBeams.map((b) => (
                <path key={b.x} d={b.d} fill={b.c} fillOpacity="0.55" />
              ))}
            </g>
            {downBeams.map((b) => (
              <circle key={b.x} cx={b.x} cy={TRUSS_Y + 30} r="5" fill="#fff" fillOpacity="0.9" />
            ))}

            {/* the crowd, rim-lit from the stage, phones up */}
            {!lite &&
              crowd.map((row, i) => (
                <g key={i}>
                  <path d={row.arms} stroke="#0c0614" strokeWidth={row.w} strokeLinecap="round" fill="none" />
                  <path d={row.d} fill={url("crowd")} stroke={CORAL} strokeOpacity="0.5" strokeWidth="1.5" />
                </g>
              ))}
            {/* laser fans over the heads */}
            <g style={{ mixBlendMode: "screen" }} strokeWidth="2.4" strokeOpacity="0.7">
              {lasers.map((l, i) => (
                <path key={i} d={l.d} stroke={l.c} />
              ))}
            </g>
            {!lite && (
              <>
                <path d={glows} fill="#e8e0ff" fillOpacity="0.2" />
                <path d={screens} fill="#f5f0ff" />
                <path d={screensCyan} fill={CYAN} />
              </>
            )}
          </g>
        </defs>
      </svg>

      <svg
        className="poster-wide h-full w-full"
        viewBox="28 50 1440 900"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
        focusable="false"
      >
        <use href={`#${g("scene")}`} />
      </svg>
      <svg
        className="poster-tall h-full w-full"
        viewBox="700 130 600 1298"
        preserveAspectRatio="xMidYMin slice"
        role="presentation"
        focusable="false"
      >
        <use href={`#${g("scene")}`} />
      </svg>
    </div>
  );
}
