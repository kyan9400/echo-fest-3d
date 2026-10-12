"use client";

/*
  One passive scroll listener for the whole page (rAF-batched):
  - hero "drop" progress p (0..1 over the sticky hero track), written to --drop on the section
    and handed to subscribers (the 3D engine);
  - page progress --progress on <html>, only where CSS scroll timelines are missing;
  - fires the audio drop when p crosses 0.65 going down.
*/

import { triggerDrop } from "./audio";

type Listener = (p: number) => void;

const listeners = new Set<Listener>();
let progress = 0;
let started = false;
let frame = 0;
let fallback = false;

function measure() {
  frame = 0;
  const root = document.documentElement;
  if (fallback) {
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--progress", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
  }
  const hero = document.getElementById("top");
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  const span = rect.height - window.innerHeight;
  const p = span > 1 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
  if (p === progress) return;
  if (progress < 0.65 && p >= 0.65 && !root.classList.contains("reduce-motion")) triggerDrop();
  progress = p;
  hero.style.setProperty("--drop", p.toFixed(4));
  listeners.forEach((l) => l(p));
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(measure);
}

/** Starts the shared listener (idempotent). */
export function startScroll() {
  if (started) return;
  started = true;
  fallback = !(window.CSS && CSS.supports("animation-timeline: scroll()"));
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  measure();
}

/** Subscribes to hero progress; the listener gets the current value at once. */
export function onHeroProgress(l: Listener): () => void {
  listeners.add(l);
  l(progress);
  return () => {
    listeners.delete(l);
  };
}
