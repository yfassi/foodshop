"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export function QueueVsPhone() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fade-in on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const updatePosition = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    []
  );

  // Mouse / touch handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      updatePosition(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [updatePosition]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      updatePosition(e.clientX);
    },
    [dragging, updatePosition]
  );

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      className={`mx-auto max-w-3xl px-4 sm:px-6 transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Slider widget */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-2xl border border-[var(--landing-border)] shadow-lg shadow-black/[0.06]"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* ── Image layer: AVEC (bottom / full) ── */}
        <div className="relative aspect-[16/9] w-full">
          <Image
            src="/avec-taapr.png"
            alt="Avec taapr — clients commandant depuis leur mobile"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
            draggable={false}
          />

          {/* ── Image layer: SANS (clipped left portion) ── */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <Image
              src="/sans-taapr.png"
              alt="Sans taapr — clients faisant la queue"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              draggable={false}
            />
          </div>

          {/* ── Labels on images ── */}
          <div
            className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm pointer-events-none"
            style={{ opacity: sliderPos > 15 ? 1 : 0, transition: "opacity 200ms" }}
          >
            <span className="text-sm">❌</span>
            <span className="font-space text-xs font-bold uppercase tracking-wider text-red-500">
              Sans taapr
            </span>
          </div>
          <div
            className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 shadow-sm pointer-events-none"
            style={{ opacity: sliderPos < 85 ? 1 : 0, transition: "opacity 200ms" }}
          >
            <span className="text-sm">✅</span>
            <span className="font-ferron text-xs tracking-wider text-[var(--landing-primary)]">
              avec taapr
            </span>
          </div>

          {/* ── Slider line + handle ── */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.3)] pointer-events-none"
            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{ left: `${sliderPos}%`, transform: `translate(-50%, -50%)` }}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-white/80 transition-transform ${
                dragging ? "scale-110" : "scale-100"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M7 4L3 10L7 16M13 4L17 10L13 16"
                  stroke="#666"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats comparison below ── */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        {/* Sans stats */}
        <div className="rounded-xl border border-red-200/60 bg-red-50/30 px-4 py-4 text-center">
          <p className="font-space text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
            Sans taapr
          </p>
          <div className="flex items-center justify-center gap-4">
            <div>
              <p className="font-space text-xl sm:text-2xl font-bold text-red-500/80">~12 min</p>
              <p
                className="text-[11px] text-[var(--landing-muted-fg)]"
                style={{ fontFamily: "var(--font-inter), system-ui" }}
              >
                d&apos;attente
              </p>
            </div>
            <div className="h-8 w-px bg-red-200/40" />
            <div>
              <p className="font-space text-xl sm:text-2xl font-bold text-[var(--landing-fg)]/50">1</p>
              <p
                className="text-[11px] text-[var(--landing-muted-fg)]"
                style={{ fontFamily: "var(--font-inter), system-ui" }}
              >
                borne pour tous
              </p>
            </div>
          </div>
        </div>

        {/* Avec stats */}
        <div
          className="rounded-xl border border-[var(--landing-primary)]/20 px-4 py-4 text-center"
          style={{
            backgroundColor: `color-mix(in oklch, var(--landing-bg) 97%, var(--landing-primary))`,
          }}
        >
          <p className="font-ferron text-xs tracking-wider text-[var(--landing-primary)] mb-2">
            avec taapr
          </p>
          <div className="flex items-center justify-center gap-4">
            <div>
              <p className="font-space text-xl sm:text-2xl font-bold text-emerald-500">~30 sec</p>
              <p
                className="text-[11px] text-[var(--landing-muted-fg)]"
                style={{ fontFamily: "var(--font-inter), system-ui" }}
              >
                pour commander
              </p>
            </div>
            <div className="h-8 w-px bg-[var(--landing-border)]" />
            <div>
              <p className="font-space text-xl sm:text-2xl font-bold text-[var(--landing-primary)]">x5</p>
              <p
                className="text-[11px] text-[var(--landing-muted-fg)]"
                style={{ fontFamily: "var(--font-inter), system-ui" }}
              >
                commandes simultanées
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
