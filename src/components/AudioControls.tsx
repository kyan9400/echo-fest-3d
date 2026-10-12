"use client";

import { startDemo, startMic, stopDemo, stopMic, useAudioState } from "@/lib/audio";

export default function AudioControls() {
  const { playing, mic, micError } = useAudioState();

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          id="play-set"
          type="button"
          className="btn btn-acid"
          aria-pressed={playing}
          onClick={() => (playing ? stopDemo() : void startDemo())}
        >
          {playing ? <StopIcon /> : <PlayIcon />}
          {playing ? "Stop the set" : "Play the demo set"}
        </button>
        <button
          type="button"
          className="btn btn-line"
          data-magnetic
          aria-pressed={mic}
          onClick={() => (mic ? stopMic() : void startMic())}
        >
          <MicIcon />
          {mic ? "Mic is on — turn off" : "Use my microphone"}
        </button>
        <a href="#tickets" className="btn btn-line" data-magnetic>
          Get tickets
        </a>
      </div>
      <p className="mt-4 max-w-md text-sm text-haze" aria-live="polite">
        {micError ? (
          <span className="text-coral">{micError}</span>
        ) : playing ? (
          <span className="inline-flex items-center gap-2 text-ink">
            <span className="eq" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Now playing: Echo Fest demo set · 124 BPM, made live in your browser.
          </span>
        ) : (
          "The demo set is synthesised live in your browser. The microphone never leaves your device."
        )}
      </p>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M2 1l11 6-11 6z" fill="currentColor" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <rect x="2" y="2" width="10" height="10" fill="currentColor" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" />
      <path d="M3 7.5a5 5 0 0010 0M8 12.5v2.5" />
    </svg>
  );
}
