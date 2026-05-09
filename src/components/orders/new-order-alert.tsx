"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Audio alerts for the kitchen.
 *
 * Two sounds:
 *  - playAlert():     two-tone "ding" when a new order comes in
 *  - announceReady(): TTS "Commande XXX prête" when an order is marked ready
 *
 * AudioContext is created lazily and resumed on the first user gesture
 * (browsers suspend it until then). Any beep before the first click queues
 * silently — but the first user click on the page (e.g. selecting the
 * Cuisine tab) unlocks it for the rest of the session.
 */
export function useNewOrderAlert() {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      try {
        if (!ctxRef.current) {
          ctxRef.current = new AudioContext();
        }
        if (ctxRef.current.state === "suspended") {
          void ctxRef.current.resume();
        }
        unlockedRef.current = true;
      } catch {
        // ignore
      }
    };
    const events: (keyof DocumentEventMap)[] = ["click", "touchstart", "keydown"];
    events.forEach((e) => document.addEventListener(e, unlock, { once: false, passive: true }));
    return () => {
      events.forEach((e) => document.removeEventListener(e, unlock));
    };
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playAlert = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    try {
      const beep = (freq: number, when: number, duration = 0.45) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "square";
        gain.gain.setValueAtTime(0.3, ctx.currentTime + when);
        osc.start(ctx.currentTime + when);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + when + duration);
        osc.stop(ctx.currentTime + when + duration);
      };
      beep(800, 0);
      beep(1000, 0.2);
    } catch {
      // ignore
    }
  }, [ensureCtx]);

  const announceReady = useCallback((orderNumber: string) => {
    const cleanNum = String(orderNumber).replace(/^#/, "");
    // Two-tone chime first
    const ctx = ensureCtx();
    if (ctx) {
      try {
        const chime = (freq: number, when: number, duration = 0.25) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.25, ctx.currentTime + when);
          osc.start(ctx.currentTime + when);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + when + duration);
          osc.stop(ctx.currentTime + when + duration);
        };
        chime(660, 0);
        chime(880, 0.18);
      } catch {
        // ignore
      }
    }
    // Then TTS
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const utter = new SpeechSynthesisUtterance(`Commande ${cleanNum} prête`);
      utter.lang = "fr-FR";
      utter.rate = 0.95;
      utter.pitch = 1;
      utter.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const fr = voices.find((v) => v.lang?.toLowerCase().startsWith("fr"));
      if (fr) utter.voice = fr;
      window.setTimeout(() => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }, 450);
    } catch {
      // ignore
    }
  }, [ensureCtx]);

  return { playAlert, announceReady };
}
