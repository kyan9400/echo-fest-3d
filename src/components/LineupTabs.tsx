"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { Day } from "@/lib/content";

export default function LineupTabs({ days }: { days: Day[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = active;
    if (e.key === "ArrowRight") next = (active + 1) % days.length;
    else if (e.key === "ArrowLeft") next = (active - 1 + days.length) % days.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = days.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Festival days" className="flex flex-wrap gap-2" onKeyDown={onKey}>
        {days.map((d, i) => (
          <button
            key={d.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`tab-${d.id}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`panel-${d.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={`btn min-w-[5.5rem] font-display uppercase tracking-wider ${
              active === i ? "btn-acid" : "btn-line"
            }`}
          >
            {d.label}{" "}
            <span className="font-sans text-xs font-medium normal-case tracking-normal opacity-80">
              {d.date.split(" ")[1]} Aug
            </span>
          </button>
        ))}
      </div>

      {days.map((d, i) => (
        <div
          key={d.id}
          id={`panel-${d.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${d.id}`}
          hidden={active !== i}
          tabIndex={0}
          className="mt-10 rounded-sm outline-offset-8"
        >
          <h3 className="sr-only">{d.date}</h3>
          <p className="eyebrow text-coral">{d.date}</p>
          <ul className="mt-4 space-y-1" aria-label="Headliners">
            {d.headliners.map((h, k) => (
              <li
                key={h}
                className={`font-display text-[clamp(2rem,8.5vw,6.5rem)] font-black uppercase leading-[0.92] tracking-tight break-words ${
                  k === 0 ? "text-acid" : "text-ink"
                }`}
              >
                {h}
              </li>
            ))}
          </ul>
          <ul
            className="mt-8 flex flex-wrap gap-x-1 gap-y-2 text-[clamp(1.05rem,2.6vw,1.6rem)] font-medium leading-snug"
            aria-label="Also playing"
          >
            {d.acts.map((a, k) => (
              <li key={a} className="whitespace-nowrap">
                <span className={k % 5 === 2 ? "text-cyan" : k % 4 === 1 ? "text-haze" : "text-ink"}>{a}</span>
                {k < d.acts.length - 1 && (
                  <span className="px-2 text-coral" aria-hidden="true">
                    /
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
