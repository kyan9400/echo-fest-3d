"use client";

import { useEffect } from "react";

// One IntersectionObserver for every [data-reveal] element on the page.
export default function Reveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => {
      // anything already on screen shows at once, no flash
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add("is-in");
      else io.observe(el);
    });
    document.documentElement.classList.add("reveal-ready");
    return () => io.disconnect();
  }, []);
  return null;
}
