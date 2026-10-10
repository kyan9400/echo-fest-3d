"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Link = { href: string; label: string };

function lock(on: boolean) {
  document.documentElement.style.overflow = on ? "hidden" : "";
  // everything but the header (main, footer, the skip link) goes inert while the panel covers it
  const menu = document.getElementById("mobile-menu");
  for (const el of document.body.children) {
    if (el instanceof HTMLElement && !el.contains(menu) && el.tagName !== "SCRIPT") el.inert = on;
  }
}

/*
  Small-screen menu (hidden from md up, where the inline nav shows).
  Solid panel, no backdrop-filter; animates opacity/transform only and not at all under reduced motion.
  Escape or a link click closes it; focus moves in on open and back to the button on close;
  page scroll is locked and the content behind is made inert while it is open.
*/
export default function MobileMenu({ links, cta }: { links: Link[]; cta: Link }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    lock(false);
    setOpen(false);
    if (returnFocus) button.current?.focus({ preventScroll: true });
  }, []);

  const toggle = () => {
    if (open) return close();
    lock(true);
    setOpen(true);
  };

  // focus the first link once the panel is visible (visibility flips during the fade-in,
  // and focus() on a still-hidden element is ignored, so retry for a few frames)
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let tries = 0;
    const tryFocus = () => {
      const first = panel.current?.querySelector<HTMLElement>("a");
      first?.focus({ preventScroll: true });
      if (first && document.activeElement !== first && ++tries < 30) raf = requestAnimationFrame(tryFocus);
    };
    tryFocus();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape closes from anywhere (focus may sit on the panel background after a tap);
  // close if the viewport grows past the breakpoint while open; always unlock on unmount
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => mq.matches && close(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open, close]);
  useEffect(() => () => lock(false), []);

  return (
    <div className="md:hidden">
      <button
        ref={button}
        type="button"
        className="btn btn-line !min-h-11 !py-2 text-sm"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={toggle}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M3 3l10 10M13 3L3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
        </svg>
        {open ? "Close" : "Menu"}
      </button>

      <div
        ref={panel}
        id="mobile-menu"
        className={`menu-panel fixed inset-0 -z-10 overflow-y-auto bg-night px-4 pb-10 pt-24 sm:px-6 ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-3 opacity-0"
        }`}
      >
        <nav aria-label="Main">
          <ul className="border-t border-plum">
            {links.map((l) => (
              <li key={l.href} className="border-b border-plum">
                <a
                  href={l.href}
                  onClick={() => close()}
                  className="flex min-h-14 items-center font-display text-2xl font-bold uppercase tracking-tight"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={cta.href} onClick={() => close()} className="btn btn-acid mt-8 w-full">
          {cta.label}
        </a>
      </div>
    </div>
  );
}
