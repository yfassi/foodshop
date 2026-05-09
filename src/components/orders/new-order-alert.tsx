"use client";

import { useCallback } from "react";

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  peakGain: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.value = frequency;

  const start = ctx.currentTime + startOffset;
  const end = start + duration;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.start(start);
  osc.stop(end + 0.02);
}

export function useNewOrderAlert() {
  const playAlert = useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    try {
      const ctx = new Ctx();
      // Petite sonnerie : C5 → E5, sinusoïdes douces
      playTone(ctx, 523.25, 0, 0.18, 0.18);
      playTone(ctx, 659.25, 0.16, 0.22, 0.18);
      // Close the context once the sound has played
      setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch {
      /* audio not available */
    }
  }, []);

  return { playAlert };
}
