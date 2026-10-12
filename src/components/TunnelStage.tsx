"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { useAudioState } from "@/lib/audio";
import { afterLoadIdle } from "@/lib/defer";
import { useReducedMotion } from "@/lib/motion";
import { detectTier, type Tier } from "@/lib/quality";
import Poster from "./Poster";
import type { TunnelProps } from "./three/Tunnel";

/*
  The 3D tunnel starts only after the page is interactive: window 'load' -> idle callback -> GPU probe ->
  import the 3D chunk. Software renderers (and no WebGL2) never download it; the poster stays.
  The poster is server-rendered and always underneath, so the hero paints without any JavaScript.
*/

type Loaded = { tier: Tier; Tunnel: ComponentType<TunnelProps> };

export default function TunnelStage() {
  const reduced = useReducedMotion();
  const audio = useAudioState();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    let alive = true;
    const cancel = afterLoadIdle(() => {
      const detected = detectTier();
      if (!detected) return; // no WebGL2 or a software renderer: keep the poster
      import("./three/Tunnel")
        .then((m) => {
          if (alive) setLoaded({ tier: detected.tier, Tunnel: m.default });
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
      cancel();
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const onLost = useCallback(() => setLost(true), []);

  const listening = audio.playing || audio.mic;
  const running = onScreen && tabVisible && (!reduced || listening);
  const Tunnel = loaded?.Tunnel;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* The poster is always underneath: it is the loading state and the no-WebGL / software-renderer fallback. */}
      <Poster />
      {loaded && Tunnel && !lost && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Tunnel
            tier={loaded.tier}
            reduced={reduced}
            running={running}
            audio={listening}
            onReady={onReady}
            onLost={onLost}
          />
        </div>
      )}
    </div>
  );
}
