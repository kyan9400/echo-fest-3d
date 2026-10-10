"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { lazy, Suspense, useEffect, useState } from "react";
import { yieldToMain } from "@/lib/defer";
import { TIERS, type Tier } from "@/lib/quality";
import { EchoEngine, PALETTE } from "./engine";
import { TUNNEL_LENGTH } from "./shaders";

const Effects = lazy(() => import("./Effects"));

type SceneProps = { engine: EchoEngine; reduced: boolean; onReady: () => void };

function EchoScene({ engine, reduced, onReady }: SceneProps) {
  const { gl, scene, camera, invalidate } = useThree();

  useEffect(() => {
    const onMove = (e: PointerEvent) =>
      engine.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [engine]);

  // compile every shader behind the poster before the canvas is revealed
  useEffect(() => {
    let alive = true;
    yieldToMain()
      .then(() => (alive ? gl.compileAsync(scene, camera) : undefined))
      .catch(() => undefined)
      .finally(() => {
        if (!alive) return;
        invalidate();
        requestAnimationFrame(() => {
          if (alive) onReady();
        });
      });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera, invalidate, onReady, engine]);

  // a still frame needs redrawing when the motion setting changes
  useEffect(() => {
    invalidate();
  }, [reduced, invalidate]);

  useFrame((state, delta) => engine.update(delta, state.camera, state.viewport.dpr, reduced));

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
  onReady: () => void;
  onLost: () => void;
};

export default function Tunnel({ tier, reduced, running, onReady, onLost }: TunnelProps) {
  const settings = TIERS[tier];
  const [cap] = useState(() => Math.min(window.devicePixelRatio || 1, settings.dprCap));
  const [dpr, setDpr] = useState(cap);
  const [bloom, setBloom] = useState(settings.bloom);
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

  return (
    <Canvas
      frameloop={running ? "always" : "demand"}
      dpr={dpr}
      flat
      gl={{
        antialias: settings.antialias,
        powerPreference: "high-performance",
        alpha: false,
        stencil: false,
        depth: true,
      }}
      camera={{ fov: 72, near: 0.1, far: 140, position: [0, 0, 0] }}
      onCreated={({ gl }) => {
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
      {running && !fellBack && (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            setBloom(false);
            setDpr((d) => Math.max(0.75, Math.round((d - 0.25) * 100) / 100));
          }}
          onIncline={() => setDpr((d) => Math.min(cap, Math.round((d + 0.25) * 100) / 100))}
          onFallback={() => {
            setFellBack(true);
            setDpr(0.75);
          }}
        />
      )}
      <EchoScene engine={engine} reduced={reduced} onReady={onReady} />
      {bloom && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  );
}
