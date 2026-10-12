"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion";

/*
  Desktop-only pointer layer: a dot + a lagging ring, and magnetic buttons (up to 6 px toward the pointer).
  Fine pointers only, never with reduced motion, no React state per move, and the native cursor always stays.
*/
export default function PointerFx() {
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (reduced || !dot || !ring || !window.matchMedia("(pointer: fine) and (hover: hover)").matches) return;
    const root = document.documentElement;
    let x = -99;
    let y = -99;
    let rx = x;
    let ry = y;
    let raf = 0;
    let mode = "";
    let mag: HTMLElement | null = null;
    let mx = 0;
    let my = 0;

    const tick = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      if (mag) mag.style.translate = `${mx}px ${my}px`;
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(tick) : 0;
    };

    const release = () => {
      if (mag) mag.style.translate = "";
      mag = null;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      const t = e.target instanceof Element ? e.target : null;
      const m = t?.closest<HTMLElement>(".btn-acid, [data-magnetic]") ?? null;
      if (m !== mag) release();
      if (m) {
        const r = m.getBoundingClientRect();
        mag = m;
        mx = Math.max(-1, Math.min(1, (x - r.left - r.width / 2) / (r.width / 2))) * 6;
        my = Math.max(-1, Math.min(1, (y - r.top - r.height / 2) / (r.height / 2))) * 6;
      }
      const next = t?.closest("a, button, input, select, textarea, summary, label, [role='tab']")
        ? "hover"
        : t?.closest("#top")
          ? "stage"
          : "on";
      if (next !== mode) root.dataset.cursor = mode = next;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      release();
      root.dataset.cursor = mode = "";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      release();
      delete root.dataset.cursor;
    };
  }, [reduced]);

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
