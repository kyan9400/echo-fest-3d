"use client";

import { useState } from "react";

export default function ReserveButton({ name, featured }: { name: string; featured: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        className={`btn w-full ${featured ? "btn-acid" : "btn-line"}`}
        onClick={() => setOpen(true)}
        aria-describedby={open ? `note-${name.replace(/\W+/g, "-")}` : undefined}
      >
        Reserve <span className="sr-only">{name}</span>
      </button>
      <p id={`note-${name.replace(/\W+/g, "-")}`} className="mt-3 min-h-[3rem] text-sm text-haze" aria-live="polite">
        {open ? "Echo Fest is a concept project — tickets aren't on sale. Thanks for wanting to come." : ""}
      </p>
    </div>
  );
}
