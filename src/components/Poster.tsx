// Still poster of the tunnel: shown while the 3D loads, and instead of it when WebGL is unavailable.
// Pure SVG, drawn in code.

const RINGS = 22;
const COLORS = ["#c8ff3d", "#ff5c86", "#45e6ff"];

/** `id` keeps the gradient ids unique when the poster is used twice on a page. */
export default function Poster({ id = "poster" }: { id?: string }) {
  const rings = Array.from({ length: RINGS }, (_, i) => {
    const t = i / (RINGS - 1); // 0 = near, 1 = far
    const depth = Math.pow(1 - t, 2.2);
    return {
      cx: 600 + Math.sin(t * 2.4) * 90 * t,
      cy: 380 - Math.cos(t * 1.8) * 40 * t,
      rx: 40 + depth * 900,
      ry: 30 + depth * 620,
      color: COLORS[i % 3],
      opacity: 0.15 + (1 - t) * 0.6,
      width: 1 + (1 - t) * 3,
    };
  });

  return (
    <div className="absolute inset-0 bg-night">
      <svg
        className="h-full w-full"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
        focusable="false"
      >
        <defs>
          <radialGradient id={`${id}-glow`} cx="52%" cy="48%" r="60%">
            <stop offset="0" stopColor="#ff5c86" stopOpacity="0.35" />
            <stop offset="0.35" stopColor="#241338" stopOpacity="0.6" />
            <stop offset="1" stopColor="#0b0614" stopOpacity="1" />
          </radialGradient>
          {/* warm core of the quarry exit, matching the 3D portal */}
          <radialGradient id={`${id}-core`}>
            <stop offset="0" stopColor="#fff4f0" stopOpacity="0.95" />
            <stop offset="0.12" stopColor="#ffb3c6" stopOpacity="0.75" />
            <stop offset="0.38" stopColor="#ff5c86" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ff5c86" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="760" fill={`url(#${id}-glow)`} />
        {Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return (
            <line
              key={`rib-${i}`}
              x1={660}
              y1={340}
              x2={600 + Math.cos(a) * 1400}
              y2={380 + Math.sin(a) * 1000}
              stroke="#b9a8d9"
              strokeOpacity="0.12"
              strokeWidth="1"
            />
          );
        })}
        <circle cx="660" cy="372" r="150" fill={`url(#${id}-core)`} />
        <circle cx="660" cy="372" r="52" fill="none" stroke="#45e6ff" strokeOpacity="0.55" strokeWidth="1.5" />
        {rings.map((r, i) => (
          <ellipse
            key={i}
            cx={r.cx}
            cy={r.cy}
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke={r.color}
            strokeOpacity={r.opacity}
            strokeWidth={r.width}
          />
        ))}
      </svg>
    </div>
  );
}
