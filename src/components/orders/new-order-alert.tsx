"use client";

import { useEffect, useRef, useCallback } from "react";

export function useNewOrderAlert() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create a simple beep using Web Audio API
    audioRef.current = null; // Will use AudioContext instead
  }, []);

  const playAlert = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "square";
      gainNode.gain.value = 0.3;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);

      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "square";
        gain2.gain.value = 0.3;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
      }, 200);
    } catch {
      // Audio not supported
    }
  }, []);

  return { playAlert };
}
