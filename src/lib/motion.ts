"use client";

/*
  Motion preference.
  Respects prefers-reduced-motion by default, but the visitor can switch full motion back on
  (many people turn animations off for speed, not comfort). The choice is remembered in localStorage;
  ?motion=full|reduced in the URL overrides everything.
*/

import { useSyncExternalStore } from "react";

const KEY = "echo-fest-motion";
type Choice = "full" | "reduced" | null;

const listeners = new Set<() => void>();
let override: Choice | undefined; // set when the visitor clicks the toggle and storage is blocked

function readChoice(): Choice {
  if (override !== undefined) return override;
  const fromUrl = new URLSearchParams(window.location.search).get("motion");
  if (fromUrl === "full" || fromUrl === "reduced") return fromUrl;
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === "full" || saved === "reduced" ? saved : null;
  } catch {
    return null;
  }
}

function systemReduced(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function snapshot(): boolean {
  const choice = readChoice();
  const reduced = choice === "full" ? false : choice === "reduced" ? true : systemReduced();
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", reduced);
  // explicit "full motion" on an OS that asks for less: CSS uses this to bring the drop track back
  root.classList.toggle("full-motion", choice === "full");
  return reduced;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener("change", listener);
  };
}

/** true = reduced motion. Server render assumes reduced (no motion until we know). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}

export function setMotion(choice: "full" | "reduced") {
  try {
    window.localStorage.setItem(KEY, choice);
    override = undefined;
    const url = new URL(window.location.href);
    if (url.searchParams.has("motion")) {
      url.searchParams.delete("motion");
      window.history.replaceState(null, "", url);
    }
  } catch {
    override = choice; // storage blocked: keep it for this visit
  }
  listeners.forEach((l) => l());
}
