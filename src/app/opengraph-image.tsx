import { ImageResponse } from "next/og";

export const alt = "Echo Fest 2027 — 21–23 August, Halvard Quarry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#c8ff3d", "#ff5c86", "#45e6ff"];

export default function OpengraphImage() {
  const rings = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const s = Math.pow(1 - t, 2) * 1500 + 60;
    return { s, color: COLORS[i % 3], opacity: 0.2 + (1 - t) * 0.6 };
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "radial-gradient(circle at 68% 45%, #3a1636 0%, #0b0614 60%)",
          color: "#f5f0ff",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {rings.map((r, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 820 - r.s / 2,
              top: 290 - (r.s * 0.7) / 2,
              width: r.s,
              height: r.s * 0.7,
              borderRadius: "50%",
              border: `${Math.max(2, 6 - i * 0.4)}px solid ${r.color}`,
              opacity: r.opacity,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #0b0614 30%, rgba(11,6,20,0.2) 75%)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", position: "relative" }}>
          <div style={{ fontSize: 28, letterSpacing: 6, color: "#c8ff3d", fontWeight: 700 }}>
            21—23 AUGUST 2027 · HALVARD QUARRY
          </div>
          <div style={{ fontSize: 190, fontWeight: 900, lineHeight: 0.9, marginTop: 36, letterSpacing: -6 }}>ECHO</div>
          <div style={{ fontSize: 190, fontWeight: 900, lineHeight: 0.9, color: "#ff5c86", letterSpacing: -6 }}>FEST</div>
          <div style={{ fontSize: 30, marginTop: 40, color: "#b9a8d9" }}>
            Three nights in a quarry that sings back.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
