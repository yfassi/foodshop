"use client";

import { useEffect, useState } from "react";

const floatingItems = [
  { emoji: "\u{1F354}", x: 8, y: 12, duration: 18, delay: 0 },
  { emoji: "\u{1F32E}", x: 85, y: 8, duration: 22, delay: 2 },
  { emoji: "\u{1F355}", x: 72, y: 75, duration: 20, delay: 4 },
  { emoji: "\u{1F959}", x: 15, y: 78, duration: 16, delay: 1 },
  { emoji: "\u{1F35F}", x: 90, y: 45, duration: 19, delay: 3 },
  { emoji: "\u{1F964}", x: 5, y: 45, duration: 21, delay: 5 },
  { emoji: "\u{1F9C6}", x: 50, y: 5, duration: 17, delay: 2.5 },
  { emoji: "\u{1F957}", x: 40, y: 88, duration: 23, delay: 1.5 },
  { emoji: "\u{1F357}", x: 60, y: 30, duration: 20, delay: 4.5 },
  { emoji: "\u{1F9C1}", x: 25, y: 55, duration: 18, delay: 3.5 },
];

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-background to-amber-50/60" />

      {/* Animated blurred orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-1 absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-primary/[0.07] blur-[80px]" />
        <div className="animate-orb-2 absolute -right-32 top-1/4 h-[32rem] w-[32rem] rounded-full bg-accent/[0.06] blur-[90px]" />
        <div className="animate-orb-3 absolute -bottom-24 left-1/4 h-[26rem] w-[26rem] rounded-full bg-secondary/[0.08] blur-[70px]" />
      </div>

      {/* Floating food emojis */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {mounted &&
          floatingItems.map((item, i) => (
            <span
              key={i}
              className="absolute animate-float-food select-none text-2xl sm:text-3xl"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                animationDuration: `${item.duration}s`,
                animationDelay: `${item.delay}s`,
                opacity: 0,
              }}
            >
              {item.emoji}
            </span>
          ))}
      </div>
    </>
  );
}
