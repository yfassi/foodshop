"use client";

import { useEffect, useState } from "react";
import {
  Beef,
  Sandwich,
  Pizza,
  CupSoda,
  Salad,
  Drumstick,
  Cookie,
  Coffee,
  IceCreamCone,
  Croissant,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const floatingItems: { icon: LucideIcon; x: number; y: number; duration: number; delay: number }[] = [
  { icon: Beef, x: 8, y: 12, duration: 18, delay: 0 },
  { icon: Sandwich, x: 85, y: 8, duration: 22, delay: 2 },
  { icon: Pizza, x: 72, y: 75, duration: 20, delay: 4 },
  { icon: Croissant, x: 15, y: 78, duration: 16, delay: 1 },
  { icon: Cookie, x: 90, y: 45, duration: 19, delay: 3 },
  { icon: CupSoda, x: 5, y: 45, duration: 21, delay: 5 },
  { icon: Coffee, x: 50, y: 5, duration: 17, delay: 2.5 },
  { icon: Salad, x: 40, y: 88, duration: 23, delay: 1.5 },
  { icon: Drumstick, x: 60, y: 30, duration: 20, delay: 4.5 },
  { icon: IceCreamCone, x: 25, y: 55, duration: 18, delay: 3.5 },
];

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Warm gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.97_0.02_28)] via-background to-[oklch(0.97_0.01_75)]" />

      {/* Animated blurred orbs — terracotta & warm tones */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-1 absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-[80px]" />
        <div className="animate-orb-2 absolute -right-32 top-1/4 h-[32rem] w-[32rem] rounded-full bg-[oklch(0.72_0.10_75_/_0.06)] blur-[90px]" />
        <div className="animate-orb-3 absolute -bottom-24 left-1/4 h-[26rem] w-[26rem] rounded-full bg-primary/[0.04] blur-[70px]" />
      </div>

      {/* Floating food icons */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {mounted &&
          floatingItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <span
                key={i}
                className="absolute animate-float-food select-none text-primary/20"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  animationDuration: `${item.duration}s`,
                  animationDelay: `${item.delay}s`,
                  opacity: 0,
                }}
              >
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} />
              </span>
            );
          })}
      </div>
    </>
  );
}
