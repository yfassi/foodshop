"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

type ActiveLink = "produit" | "livraison" | "stock" | "tarifs" | "demo" | null;

export function LandingNav({ active = null }: { active?: ActiveLink }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the panel when the user navigates or resizes back to desktop
  useEffect(() => {
    if (!menuOpen) return;
    const onResize = () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}${menuOpen ? " nav-open" : ""}`}>
      <Link href="/" className="logo" aria-label="Taapr · accueil" onClick={close}>
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
      <button
        type="button"
        className="nav-burger"
        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={menuOpen}
        aria-controls="nav-mobile-panel"
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            className="nav-mobile-overlay"
            aria-label="Fermer le menu"
            onClick={close}
          />
          <div className="nav-mobile-panel" id="nav-mobile-panel" role="menu">
            <Link href="/#features" onClick={close} className={active === "produit" ? "active" : undefined}>Produit</Link>
            <Link href="/livraison" onClick={close} className={active === "livraison" ? "active" : undefined}>Livraison</Link>
            <Link href="/stock" onClick={close} className={active === "stock" ? "active" : undefined}>Stock</Link>
            <Link href="/#pricing" onClick={close} className={active === "tarifs" ? "active" : undefined}>Tarifs</Link>
            <Link href="/admin/chez-momo?demo=true" onClick={close} className={active === "demo" ? "active" : undefined}>Démo</Link>
            <hr />
            <Link href="/admin/login" onClick={close} className="nav-mobile-login">Se connecter</Link>
          </div>
        </>
      )}
    </header>
  );
}
