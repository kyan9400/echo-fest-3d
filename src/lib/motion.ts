"use client";

/*
  Motion preference.
  Full motion by default on a first visit (whatever the OS reports); the "Reduce motion" toggle switches
  to a still version and back. The choice is remembered in localStorage and respected on later visits;
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

function snapshot(): boolean {
  const choice = readChoice();
  const reduced = choice === "reduced";
  const root = document.documentElement;
  root.classList.toggle("reduce-motion", reduced);
  root.classList.toggle("full-motion", !reduced);
  return reduced;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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
