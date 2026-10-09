"use client";

/*
  Echo Fest audio engine.
  - A generative 124 BPM demo set, synthesised live with WebAudio (no audio files):
    kick (sine pitch drop), clap + hats (filtered noise), bass (saw through a resonant low-pass),
    pad (detuned triangles) and an arp through a feedback delay (the "echo").
  - Optional microphone: analysed only, never routed to the speakers.
  - getBands(out) fills 64 log-spaced bands (0..255) for the 3D tunnel. No allocations per call.
*/

import { useSyncExternalStore } from "react";

export type AudioState = { playing: boolean; mic: boolean; micError: string | null };

const BPM = 124;
const STEP = 60 / BPM / 4; // sixteenth note in seconds
const LOOKAHEAD = 0.12;
const BANDS = 64;

// A minor progression: Am – F – C – G (one bar each)
const ROOTS = [45, 41, 48, 43]; // MIDI bass roots
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [55, 60, 64],
  [55, 59, 62],
];
const ARP = [0, 2, 1, 2, 0, 1, 2, 1];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let state: AudioState = { playing: false, mic: false, micError: null };
const listeners = new Set<() => void>();
function setState(patch: Partial<AudioState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let echoIn: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let noise: AudioBuffer | null = null;
let freq: Uint8Array<ArrayBuffer> | null = null;
let bandIndex: Uint16Array | null = null;
let timer: number | null = null;
let nextTime = 0;
let step = 0;
let micStream: MediaStream | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;

function ensureContext(): AudioContext {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new Ctor();

  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

  // 64 log-spaced bands between ~40 Hz and ~12 kHz
  const nyquist = ctx.sampleRate / 2;
  bandIndex = new Uint16Array(BANDS + 1);
  for (let i = 0; i <= BANDS; i++) {
    const hz = 40 * Math.pow(12000 / 40, i / BANDS);
    bandIndex[i] = Math.min(analyser.frequencyBinCount - 1, Math.round((hz / nyquist) * analyser.frequencyBinCount));
  }

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = 0;
  musicBus = ctx.createGain();
  musicBus.connect(master);
  master.connect(comp);
  comp.connect(ctx.destination);
  comp.connect(analyser); // analyser is a sink, never connected to the speakers

  // Echo: 3/16 delay with feedback, gently low-passed on each repeat
  echoIn = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = STEP * 3;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.42;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2600;
  echoIn.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(musicBus);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const ch = noise.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;

  return ctx;
}

/* ---------------- voices ---------------- */

function kick(t: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g).connect(musicBus!);
  o.start(t);
  o.stop(t + 0.45);
}

function noiseHit(t: number, type: BiquadFilterType, freqHz: number, q: number, level: number, decay: number, toEcho = false) {
  const c = ctx!;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freqHz;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(musicBus!);
  if (toEcho) g.connect(echoIn!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
}

function bass(t: number, midi: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = mtof(midi);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 9;
  f.frequency.setValueAtTime(1400, t);
  f.frequency.exponentialRampToValueAtTime(160, t + STEP * 1.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.8);
  o.connect(f).connect(g).connect(musicBus!);
  o.start(t);
  o.stop(t + STEP * 2);
}

function pad(t: number, notes: number[]) {
  const c = ctx!;
  const len = STEP * 16;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.6);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1800;
  g.connect(f).connect(musicBus!);
  for (const n of notes) {
    for (const detune of [-7, 7]) {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = mtof(n);
      o.detune.value = detune;
      o.connect(g);
      o.start(t);
      o.stop(t + len + 0.05);
    }
  }
}

function pluck(t: number, midi: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.value = mtof(midi);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(3800, t);
  f.frequency.exponentialRampToValueAtTime(500, t + 0.18);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(f).connect(g);
  g.connect(musicBus!);
  g.connect(echoIn!);
  o.start(t);
  o.stop(t + 0.25);
}

/* ---------------- sequencer ---------------- */

function scheduleStep(s: number, t: number) {
  const bar = Math.floor(s / 16) % 4;
  const inBar = s % 16;
  const phrase = Math.floor(s / 64); // 4-bar phrases build up
  const breakdown = phrase % 4 === 3 && bar >= 2; // short breakdown every 16 bars

  if (inBar === 0) pad(t, CHORDS[bar]);
  if (!breakdown && inBar % 4 === 0) kick(t);
  if (!breakdown && (inBar === 4 || inBar === 12)) noiseHit(t, "bandpass", 1500, 0.8, 0.5, 0.18, true);
  if (inBar % 4 === 2) noiseHit(t, "highpass", 8000, 0.7, 0.22, 0.05);
  if (phrase > 0 && inBar % 2 === 1) noiseHit(t, "highpass", 10000, 0.7, 0.07, 0.03);
  if (!breakdown && (inBar % 4 === 2 || inBar === 15)) bass(t, ROOTS[bar] + (inBar === 15 ? 12 : 0));
  if ((phrase > 0 || bar >= 2) && inBar % 2 === 0) {
    const chord = CHORDS[bar];
    pluck(t, chord[ARP[(inBar / 2) % ARP.length]] + 12);
  }
}

function tick() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextTime);
    nextTime += STEP;
    step++;
  }
}

/* ---------------- public API ---------------- */

export async function startDemo() {
  const c = ensureContext();
  if (c.state === "suspended") await c.resume();
  if (timer !== null) return;
  step = 0;
  nextTime = c.currentTime + 0.08;
  master!.gain.cancelScheduledValues(c.currentTime);
  master!.gain.setValueAtTime(master!.gain.value, c.currentTime);
  master!.gain.linearRampToValueAtTime(0.8, c.currentTime + 0.4);
  tick();
  timer = window.setInterval(tick, 25);
  setState({ playing: true });
}

export function stopDemo() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  }
  setState({ playing: false });
}

export async function startMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setState({ micError: "This browser can't share a microphone." });
    return;
  }
  const c = ensureContext();
  if (c.state === "suspended") await c.resume();
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
    });
    micSource = c.createMediaStreamSource(micStream);
    micSource.connect(analyser!); // analysed only — never sent to the speakers
    setState({ mic: true, micError: null });
  } catch {
    setState({ mic: false, micError: "Microphone access was blocked. The demo set still works." });
  }
}

export function stopMic() {
  micSource?.disconnect();
  micSource = null;
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  setState({ mic: false });
}

/** Fills `out` (length 64) with band levels 0..255. Returns false when nothing is listening. */
export function getBands(out: Uint8Array): boolean {
  if (!analyser || !freq || !bandIndex || (!state.playing && !state.mic)) return false;
  analyser.getByteFrequencyData(freq);
  for (let i = 0; i < BANDS; i++) {
    const a = bandIndex[i];
    const b = Math.max(a + 1, bandIndex[i + 1]);
    let peak = 0;
    for (let k = a; k < b; k++) if (freq[k] > peak) peak = freq[k];
    // lift the quieter top end a little so treble shows on the wall
    out[i] = Math.min(255, peak * (1 + (i / BANDS) * 0.6));
  }
  return true;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const serverState: AudioState = { playing: false, mic: false, micError: null };

export function useAudioState(): AudioState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}
