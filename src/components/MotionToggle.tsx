"use client";

import { setMotion, useReducedMotion } from "@/lib/motion";

type Props = { className?: string; variant?: "button" | "quiet" };

export default function MotionToggle({ className = "", variant = "button" }: Props) {
  const reduced = useReducedMotion();
  const label = reduced ? "Turn on full motion" : "Reduce motion";
  const onClick = () => setMotion(reduced ? "full" : "reduced");

  if (variant === "quiet") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={!reduced}
        className={`link-under inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-haze hover:text-ink ${className}`}
      >
        <span className={`h-2 w-2 rounded-full ${reduced ? "bg-haze" : "bg-acid"}`} aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <button type="button" className={`btn btn-line ${className}`} onClick={onClick} aria-pressed={!reduced}>
      {label}
    </button>
  );
}
