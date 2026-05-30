import { useRef, useEffect } from "react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Format seconds → MM:SS  (supports negative for overtime) */
export function fmt(s) {
  const neg = s < 0;
  const a   = Math.abs(Math.round(s));
  return `${neg ? "−" : ""}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** Green → yellow → red ring based on remaining fraction */
export function ringColor(C, tl, allotted) {
  if (tl < 0)           return C.red;
  const r = tl / allotted;
  if (r > 0.4)          return C.green;
  if (r > 0.15)         return C.yellow;
  return C.red;
}

/** Stable setInterval hook — callback always has latest closure */
export function useInterval(fn, delay) {
  const cb = useRef(fn);
  useEffect(() => { cb.current = fn; }, [fn]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => cb.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/** Single short tick sound via Web Audio API */
export function playTick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    o.start();
    o.stop(ctx.currentTime + 0.06);
    setTimeout(() => ctx.close(), 300);
  } catch (e) {
    /* browser may block without prior user gesture */
  }
}
