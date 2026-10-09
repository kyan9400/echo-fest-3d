"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAudioState } from "@/lib/audio";
import { useReducedMotion } from "@/lib/motion";
import { detectTier, type Tier } from "@/lib/quality";
import Poster from "./Poster";

const Tunnel = dynamic(() => import("./three/Tunnel"), { ssr: false });

// Tier is detected once per page view, on the client, before the Canvas exists.
let cached: { tier: Tier; gpu: string } | null | undefined;
const noop = () => () => {};
function useTier() {
  return useSyncExternalStore(
    noop,
    () => {
      if (cached === undefined) cached = detectTier();
      return cached;
    },
    () => undefined,
  );
}

export default function TunnelStage() {
  const detected = useTier();
  const reduced = useReducedMotion();
  const audio = useAudioState();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);

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

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* The poster is always underneath: it is the loading state and the no-WebGL fallback. */}
      <Poster />
      {detected && !lost && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Tunnel tier={detected.tier} reduced={reduced} running={running} onReady={onReady} onLost={onLost} />
        </div>
      )}
    </div>
  );
}
