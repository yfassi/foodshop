"use client";

import Link from "next/link";
import Script from "next/script";
import "../landing-v3.css";

export default function DemoPage() {
  return (
    <div className="landing-v3">
      <nav className="lv3-nav">
        <div className="lv3-wrap lv3-nav-inner">
          <Link href="/" className="lv3-brand">taapr</Link>
          <div className="lv3-nav-links">
            <Link href="/#product">Produit</Link>
            <Link href="/#pricing">Tarifs</Link>
            <Link href="/#customers">Clients</Link>
            <Link href="/#faq">FAQ</Link>
          </div>
          <div className="lv3-nav-cta">
            <Link href="/admin/login" className="lv3-nav-login">Connexion</Link>
            <Link href="/admin/onboarding" className="lv3-btn lv3-btn-primary">Commencer gratuitement</Link>
          </div>
        </div>
      </nav>

      <header className="lv3-wrap lv3-hero" style={{ paddingBottom: 32 }}>
        <div className="lv3-pill">
          <span className="tag">Demo</span>
          <span>Réservez votre démo personnalisée</span>
        </div>
        <h1>
          Découvrez TaapR<br />en <span className="accent">15 minutes.</span>
        </h1>
        <p>
          Remplissez le formulaire ci-dessous, et un expert TaapR vous contactera pour vous présenter la
          plateforme adaptée à votre restaurant.
        </p>
      </header>

      <section className="lv3-block" style={{ paddingTop: 0 }}>
        <div className="lv3-wrap">
          <div
            style={{
              width: "100%",
              minHeight: 720,
              background: "#fff",
              border: "1px solid var(--rule)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 8px 24px -12px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{ width: "100%", height: 720 }}
              data-fillout-id="wMQXamihtZus"
              data-fillout-embed-type="standard"
              data-fillout-inherit-parameters
              data-fillout-dynamic-resize
            />
          </div>
        </div>
      </section>

      <Script src="https://server.fillout.com/embed/v1/" strategy="afterInteractive" />
    </div>
  );
}
