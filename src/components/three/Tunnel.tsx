"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import { yieldToMain } from "@/lib/defer";
import { TIERS, type Tier } from "@/lib/quality";
import { onHeroProgress } from "@/lib/scroll";
import { EchoEngine, PALETTE } from "./engine";
import { TUNNEL_LENGTH } from "./shaders";

type SceneProps = {
  engine: EchoEngine;
  reduced: boolean;
  glow: boolean;
  throttled: boolean;
  onReady: () => void;
};

function EchoScene({ engine, reduced, glow, throttled, onReady }: SceneProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const reducedRef = useRef(reduced);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(() => {
    const onMove = (e: PointerEvent) =>
      engine.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [engine]);

  // the drop: scroll progress goes straight to the engine (no React state) and asks for a frame
  useEffect(
    () =>
      onHeroProgress((p) => {
        engine.setScroll(p);
        invalidate();
      }),
    [engine, invalidate],
  );

  // build the env map, then compile every shader behind the poster before the canvas is revealed
  useEffect(() => {
    let alive = true;
    yieldToMain()
      .then(() => {
        if (!alive) return;
        engine.prepare(gl);
        return gl.compileAsync(scene, camera);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return;
        engine.startIntro(reducedRef.current);
        invalidate();
        requestAnimationFrame(() => {
          if (alive) onReady();
        });
      });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, invalidate, onReady, engine]);

  useEffect(() => {
    engine.setGlow(glow);
    invalidate();
  }, [engine, glow, invalidate]);

  // medium/low ambient loop: 30 fps on demand instead of the full refresh rate
  useEffect(() => {
    if (!throttled) return;
    const id = window.setInterval(() => invalidate(), 1000 / 30);
    return () => window.clearInterval(id);
  }, [throttled, invalidate]);

  // a still frame needs redrawing when the motion setting changes
  useEffect(() => {
    invalidate();
  }, [reduced, invalidate]);

  useFrame((state, delta) => {
    if (engine.update(delta, state.camera, state.viewport.dpr, reduced)) state.invalidate();
  });

  return (
    <>
      <color attach="background" args={[PALETTE.night]} />
      <fog attach="fog" args={[PALETTE.night, 22, TUNNEL_LENGTH * 0.92]} />
      <primitive object={engine.group} />
    </>
  );
}

export type TunnelProps = {
  tier: Tier;
  reduced: boolean;
  running: boolean;
  /** demo set or mic is live */
  audio: boolean;
  onReady: () => void;
  onLost: () => void;
};

export default function Tunnel({ tier, reduced, running, audio, onReady, onLost }: TunnelProps) {
  const settings = TIERS[tier];
  const [cap] = useState(() => Math.min(window.devicePixelRatio || 1, settings.dprCap));
  const [dpr, setDpr] = useState(cap);
  const [glow, setGlow] = useState(settings.bloom);
  const [fellBack, setFellBack] = useState(false);
  const [engine, setEngine] = useState<EchoEngine | null>(null);

  // geometry is built in short steps before the Canvas mounts, so no single task carries all of it
  useEffect(() => {
    let alive = true;
    let built: EchoEngine | null = null;
    EchoEngine.create(TIERS[tier]).then((e) => {
      built = e;
      if (alive) setEngine(e);
      else e.dispose();
    });
    return () => {
      alive = false;
      built?.dispose();
    };
  }, [tier]);

  if (!engine) return null;

  // full refresh rate only with live audio or on the high tier; otherwise 30 fps on demand
  const continuous = running && (audio || tier === "high");
  const throttled = running && !continuous;

  return (
    <Canvas
      frameloop={continuous ? "always" : "demand"}
      dpr={dpr}
      gl={{
        antialias: settings.antialias,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ fov: 72, near: 0.1, far: 140, position: [0, 0, 0] }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            onLost();
          },
          { once: true },
        );
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      {/* PerformanceMonitor measures the time between drawn frames, so it only runs while the loop is
          continuous: on-demand frames are sparse and would read as a slow GPU. */}
      {continuous && !fellBack && (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            setGlow(false);
            setDpr((d) => Math.max(0.75, Math.round((d - 0.25) * 100) / 100));
          }}
          onIncline={() => setDpr((d) => Math.min(cap, Math.round((d + 0.25) * 100) / 100))}
          onFallback={() => {
            setFellBack(true);
            setDpr(0.75);
          }}
        />
      )}
      <EchoScene engine={engine} reduced={reduced} glow={glow} throttled={throttled} onReady={onReady} />
    </Canvas>
  );
}
