"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ActiveLink = "produit" | "livraison" | "stock" | "tarifs" | "demo" | null;

export function LandingNav({ active = null }: { active?: ActiveLink }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <Link href="/" className="logo" aria-label="Taapr · accueil">
        <span className="logo-word">taapr</span>
        <span className="logo-dot" />
      </Link>
      <nav className="nav-links">
        <Link href="/#features" className={active === "produit" ? "active" : undefined}>Produit</Link>
        <Link href="/livraison" className={active === "livraison" ? "active" : undefined}>Livraison</Link>
        <Link href="/stock" className={active === "stock" ? "active" : undefined}>Stock</Link>
        <Link href="/#pricing" className={active === "tarifs" ? "active" : undefined}>Tarifs</Link>
        <Link href="/admin/chez-momo?demo=true" className={active === "demo" ? "active" : undefined}>Démo</Link>
      </nav>
      <div className="nav-cta">
        <Link href="/admin/login" className="btn-ghost">Se connecter</Link>
        <Link href="/admin/onboarding" className="btn-primary">
          Essai 14 jours <span className="arrow">→</span>
        </Link>
      </div>
    </header>
  );
}
