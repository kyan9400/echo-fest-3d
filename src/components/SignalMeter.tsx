"use client";

import { useEffect, useRef } from "react";
import { getBands, useAudioState } from "@/lib/audio";

// Live 12-bar meter for the hero meta rail. Reads the analyser through rAF only while audio plays.
export default function SignalMeter() {
  const { playing, mic } = useAudioState();
  const live = playing || mic;
  const barsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const bars = barsRef.current?.children;
    if (!live || !bars) return;
    const bands = new Uint8Array(64);
    let raf = 0;
    const loop = () => {
      if (getBands(bands)) {
        for (let i = 0; i < bars.length; i++) {
          (bars[i] as HTMLElement).style.transform = `scaleY(${0.12 + (bands[i * 5] / 255) * 0.88})`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      for (let i = 0; i < bars.length; i++) (bars[i] as HTMLElement).style.transform = "";
    };
  }, [live]);

  return (
    <span className="flex items-center gap-3">
      <span>Signal · {live ? "live" : "idle"}</span>
      <span ref={barsRef} className="meter" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </span>
    </span>
  );
}
