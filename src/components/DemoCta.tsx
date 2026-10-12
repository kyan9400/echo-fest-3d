"use client";

import { startDemo } from "@/lib/audio";

// Final CTA: start the set, then fly back up to the tunnel and hand focus to its controls.
export default function DemoCta() {
  const onClick = async () => {
    await startDemo();
    document.getElementById("top")?.scrollIntoView();
    document.getElementById("play-set")?.focus({ preventScroll: true });
  };
  return (
    <button type="button" className="btn btn-line" data-magnetic onClick={() => void onClick()}>
      Play the demo set
    </button>
  );
}
