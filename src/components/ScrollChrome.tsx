"use client";

import { useEffect, useState } from "react";
import { startScroll } from "@/lib/scroll";

const DOTS = [
  ["top", "Start"],
  ["about", "About"],
  ["lineup", "Lineup"],
  ["stages", "Stages"],
  ["tickets", "Tickets"],
  ["trip", "Plan"],
  ["faq", "FAQ"],
] as const;

// Section dots (lg and up) + the shared scroll listener. The progress bar itself is CSS (see .progress-bar).
export default function ScrollChrome() {
  const [active, setActive] = useState("top");

  useEffect(() => {
    startScroll();
    // the section that crosses the middle of the viewport is the active one
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-48% 0px -50% 0px" },
    );
    for (const [id] of DOTS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Sections" className="fixed right-2 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
      <ul>
        {DOTS.map(([id, label]) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-label={`Go to ${label}`}
              aria-current={active === id ? "location" : undefined}
              className="dot relative flex h-11 w-11 items-center justify-center"
            >
              <span className="dot-label" aria-hidden="true">
                {label}
              </span>
              <span className="dot-mark" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
