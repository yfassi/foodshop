"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedBackground } from "@/components/animated-background";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4">
      <AnimatedBackground />

      {/* Main content */}
      <div
        className={`relative z-10 flex flex-col items-center transition-all duration-700 ease-out ${
          mounted
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        }`}
      >
        {/* Icon badge */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl shadow-sm backdrop-blur-sm">
          🍽️
        </div>

        {/* Title with gradient */}
        <h1 className="mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text font-heading text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          FoodShop
        </h1>

        <p className="mb-10 max-w-xs text-center text-base leading-relaxed text-muted-foreground sm:max-w-sm">
          La plateforme de commande en ligne pour les restaurants.
        </p>

        {/* CTA buttons */}
        <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row">
          <Link
            href="/admin/onboarding"
            className="group relative overflow-hidden rounded-xl bg-primary px-7 py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0"
          >
            <span className="relative z-10">Créer mon restaurant</span>
            <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />
          </Link>
          <Link
            href="/admin/login"
            className="rounded-xl border border-border bg-card/80 px-7 py-3.5 text-center text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md active:translate-y-0"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
