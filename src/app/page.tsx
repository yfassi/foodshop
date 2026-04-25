"use client";

import Link from "next/link";
import { useState } from "react";
import "./landing-v3.css";

const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const PLANS = [
  {
    name: "Essentiel",
    sub: "Démarrer sereinement",
    price: 29,
    cta: "Commencer",
    ctaPrimary: false,
    features: [
      "300 commandes / mois",
      "Menu jusqu'à 50 produits",
      "Paiement Stripe inclus",
      "QR codes illimités",
      "Support par email",
    ],
    featured: false,
  },
  {
    name: "Pro",
    sub: "Pour les restaurants qui tournent",
    price: 49,
    cta: "Commencer avec Pro →",
    ctaPrimary: true,
    features: [
      "Commandes illimitées",
      "Menu illimité",
      "Programme de fidélité",
      "Statistiques avancées",
      "Support prioritaire",
      "Module Livraison (+19€/mois)",
    ],
    featured: true,
    badge: "Le plus populaire",
  },
  {
    name: "Business",
    sub: "Multi-établissements",
    price: 79,
    cta: "Nous contacter",
    ctaPrimary: false,
    features: [
      "Jusqu'à 3 établissements",
      "Tout le plan Pro",
      "Analyse IA des ventes",
      "Vue consolidée",
      "Support dédié",
      "Module Livraison (+19€/mois)",
    ],
    featured: false,
  },
];

const FAQ_ITEMS = [
  {
    q: "Combien de temps pour mettre TaapR en place ?",
    a: "Entre 5 et 10 minutes. Vous créez votre restaurant, importez votre menu, générez votre QR code — puis vous l'imprimez et le collez sur vos tables. Nos gabarits d'impression sont inclus.",
  },
  {
    q: "Prenez-vous une commission sur les ventes ?",
    a: "Non, aucune commission — quel que soit votre plan ou votre volume. Seuls les frais Stripe s'appliquent (~1,5% + 0,25€ par transaction), prélevés directement par votre processeur de paiement.",
  },
  {
    q: "Mes clients doivent-ils télécharger une application ?",
    a: "Jamais. TaapR fonctionne entièrement dans le navigateur. Un scan, et le menu s'ouvre.",
  },
  {
    q: "Est-ce adapté à un food truck ?",
    a: "Oui. TaapR est pensé pour les food trucks, snacks et petits restaurants. Pas de matériel spécifique — un smartphone ou tablette suffit.",
  },
  {
    q: "Puis-je essayer avant de m'engager ?",
    a: "Oui, 14 jours offerts, sans carte bancaire. Vous pouvez annuler à tout moment, sans frais ni justificatif.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Cartes bancaires (Visa, Mastercard, Amex), Apple Pay, Google Pay, Link — tout ce que Stripe prend en charge.",
  },
  {
    q: "Comment fonctionne le module Livraison ?",
    a: "Disponible en option à +19€/mois sur les plans Pro et Business. Vous configurez vos zones de livraison (rayons et frais), invitez vos livreurs (authentification par SMS), et vos clients commandent en livraison à domicile avec sélection d'adresse sur carte. Les livreurs suivent leurs courses depuis leur téléphone, les clients suivent la livraison en temps réel.",
  },
];

const TESTIMONIALS = [
  {
    q: "« Enfin une solution sans commission. Ça change tout pour notre marge. Paramétrage en un après-midi. »",
    n: "Sophie Marchand",
    r: "Bistrot des Halles",
    avBg: "#172846",
    initial: "S",
  },
  {
    q: "« Mis en place en 10 minutes. Le QR code sur les tables le soir même, on a commencé à encaisser aussitôt. »",
    n: "Marco Rossi",
    r: "Pizza Express, Marseille",
    avBg: "#0a0a0a",
    initial: "M",
  },
  {
    q: "« Le programme de fidélité a boosté nos retours clients de 40%. Un vrai outil, pas un gadget. »",
    n: "Léa Tanguy",
    r: "Green Bowl, Nantes",
    avBg: "#d7352d",
    initial: "L",
  },
];

const LOGOS = [
  "Le Gourmet",
  "Chez Marco",
  "Street Wok",
  "Bistrot des Halles",
  "Green Bowl",
  "Pizza Express",
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="landing-v3">
      {/* NAV */}
      <nav className="lv3-nav">
        <div className="lv3-wrap lv3-nav-inner">
          <Link href="/" className="lv3-brand">taapr</Link>
          <div className="lv3-nav-links">
            <a href="#product">Produit</a>
            <a href="#pricing">Tarifs</a>
            <a href="#customers">Clients</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lv3-nav-cta">
            <Link href="/admin/login" className="lv3-nav-login">Connexion</Link>
            <Link href="/admin/onboarding" className="lv3-btn lv3-btn-primary">Commencer gratuitement</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="lv3-wrap lv3-hero">
        <div className="lv3-pill">
          <span className="tag">Alternative</span>
          <span>À la borne de commande classique</span>
        </div>
        <h1>
          La borne de commande,<br />dans la poche de <span className="accent">vos clients.</span>
        </h1>
        <p>
          Pas la place pour une borne ? Pas le budget ? TaapR transforme chaque table, chaque comptoir en point
          de commande. Vos clients scannent, commandent, paient — avec leur propre téléphone.
        </p>
        <div className="lv3-hero-ctas">
          <Link href="/admin/onboarding" className="lv3-btn lv3-btn-primary lv3-btn-lg">
            Commencer gratuitement
          </Link>
          <Link href="/admin/chez-momo?demo=true" className="lv3-btn lv3-btn-secondary lv3-btn-lg">
            Voir la démo →
          </Link>
        </div>
        <div className="lv3-hero-note">
          <span className="lv3-chk">
            <CheckIcon />
          </span>
          14 jours d&apos;essai · Sans carte bancaire · Annulable à tout moment
        </div>
      </header>

      {/* PRODUCT SHOT */}
      <div className="lv3-product-stage">
        <div className="lv3-product-bg">
          <div className="lv3-float lv3-float-left">
            <div className="lbl">Commandes aujourd&apos;hui</div>
            <div className="val">247</div>
            <div className="hint" style={{ color: "var(--green)" }}>▲ 18% vs hier</div>
          </div>

          <div className="lv3-float lv3-float-right">
            <div className="lbl">Commission TaapR</div>
            <div className="val">
              0<span style={{ fontSize: 24, color: "var(--muted)", fontWeight: 500 }}>%</span>
            </div>
            <div className="hint">sur tout votre CA</div>
          </div>

          <div className="lv3-phone">
            <div className="lv3-phone-screen">
              <div className="lv3-ph-top"><span>9:41</span><span>●●●●</span></div>
              <div className="lv3-ph-rest">
                <div className="av">🍽️</div>
                <div>
                  <div className="n">Le Gourmet</div>
                  <div className="s">Table 3 · Sur place</div>
                </div>
                <div className="b">OUVERT</div>
              </div>
              <div className="lv3-ph-cats">
                <div className="lv3-ph-cat on">Tout</div>
                <div className="lv3-ph-cat">Burgers</div>
                <div className="lv3-ph-cat">Tacos</div>
                <div className="lv3-ph-cat">Boissons</div>
              </div>
              <div className="lv3-ph-h">🍔 Burgers</div>
              <div className="lv3-ph-row">
                <div className="img">🍔</div>
                <div className="meta"><div className="t">Classic Burger</div><div className="d">Bœuf, cheddar, salade</div><div className="p">9,90 €</div></div>
                <div className="add">+</div>
              </div>
              <div className="lv3-ph-row">
                <div className="img">🧀</div>
                <div className="meta"><div className="t">Cheese Burger</div><div className="d">Double cheddar</div><div className="p">10,90 €</div></div>
                <div className="add">+</div>
              </div>
              <div className="lv3-ph-row">
                <div className="img">🌮</div>
                <div className="meta"><div className="t">Tacos XL</div><div className="d">2 viandes au choix</div><div className="p">11,50 €</div></div>
                <div className="add">+</div>
              </div>
              <div className="lv3-ph-row">
                <div className="img">🥤</div>
                <div className="meta"><div className="t">Coca-Cola</div><div className="d">33cl</div><div className="p">2,50 €</div></div>
                <div className="add">+</div>
              </div>
              <div className="lv3-ph-fab">
                <span className="badge">3</span>
                Voir mon panier
                <span style={{ marginLeft: "auto" }}>23,90 €</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOGOS */}
      <section className="lv3-logos-section">
        <div className="lv3-wrap">
          <div className="lv3-logos-label">Déjà utilisé par 800+ restaurants indépendants en France</div>
          <div className="lv3-logos-row">
            {LOGOS.map((l) => (<span key={l}>{l}</span>))}
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="lv3-metrics">
        <div className="lv3-wrap lv3-metrics-grid">
          <div className="lv3-metric">
            <div className="v">0<span className="unit">€</span></div>
            <div className="l">de matériel à acheter. Vos clients utilisent leur propre téléphone.</div>
          </div>
          <div className="lv3-metric">
            <div className="v">0<span className="unit">m²</span></div>
            <div className="l">d&apos;espace au sol. Un QR code remplace une borne entière.</div>
          </div>
          <div className="lv3-metric">
            <div className="v">29<span className="unit">€/mois</span></div>
            <div className="l">contre ~3 000 € pour une borne physique. Amorti en 1 mois.</div>
          </div>
        </div>
      </section>

      {/* VS BORNE */}
      <section id="why" className="lv3-block" style={{ paddingBottom: 80 }}>
        <div className="lv3-wrap">
          <div className="lv3-sec-h">
            <div className="lv3-sec-tag">Pensé pour les petits commerces</div>
            <h2>
              Une borne coûte cher.<br />Et prend de la place.
            </h2>
            <p>
              Pour les snacks, food trucks, cafés et restaurants de quartier, une borne de commande
              n&apos;est souvent ni viable, ni réaliste. TaapR remplace ce matériel par un simple QR code.
            </p>
          </div>

          <div className="lv3-vs-grid">
            <div className="lv3-vs-col bad">
              <div className="lv3-vs-hdr">
                <div className="lv3-vs-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="6" y="2" width="12" height="20" rx="1" />
                    <rect x="8" y="4" width="8" height="11" rx="0.5" fill="currentColor" opacity="0.1" />
                    <circle cx="12" cy="18.5" r="0.8" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <div className="lv3-vs-k">Borne de commande classique</div>
                  <div className="lv3-vs-t">À partir de 3 000 €</div>
                </div>
              </div>
              <ul className="lv3-vs-ul">
                <li><span className="lv3-vs-x">×</span>Investissement initial de 2 500 à 5 000 €</li>
                <li><span className="lv3-vs-x">×</span>1 m² d&apos;espace au sol minimum</li>
                <li><span className="lv3-vs-x">×</span>Une seule commande à la fois, file d&apos;attente</li>
                <li><span className="lv3-vs-x">×</span>Maintenance, pannes, obsolescence</li>
                <li><span className="lv3-vs-x">×</span>Prise secteur, branchements, câblage</li>
                <li><span className="lv3-vs-x">×</span>Écran partagé, hygiène délicate</li>
              </ul>
            </div>

            <div className="lv3-vs-col good">
              <div className="lv3-vs-hdr">
                <div className="lv3-vs-icon lv3-vs-icon-good">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="7" y="2" width="10" height="20" rx="2" />
                    <circle cx="12" cy="19" r="0.8" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <div className="lv3-vs-k">TaapR</div>
                  <div className="lv3-vs-t">29 € / mois</div>
                </div>
              </div>
              <ul className="lv3-vs-ul">
                <li><span className="lv3-vs-ok"><CheckIcon /></span>Aucun matériel — vos clients utilisent leur téléphone</li>
                <li><span className="lv3-vs-ok"><CheckIcon /></span>Zéro m² au sol, un QR code par table</li>
                <li><span className="lv3-vs-ok"><CheckIcon /></span>Commandes en parallèle, sans file</li>
                <li><span className="lv3-vs-ok"><CheckIcon /></span>Mises à jour automatiques, pas de SAV</li>
                <li><span className="lv3-vs-ok"><CheckIcon /></span>Aucune installation physique</li>
                <li><span className="lv3-vs-ok"><CheckIcon /></span>Chacun son écran, zéro contact</li>
              </ul>
            </div>
          </div>

          <div className="lv3-vs-who">
            <div className="lv3-vs-who-title">Conçu pour :</div>
            <div className="lv3-vs-who-row">
              <span>🥪 Snacks</span>
              <span>🚚 Food trucks</span>
              <span>☕ Cafés</span>
              <span>🍕 Pizzerias de quartier</span>
              <span>🥗 Ghost kitchens</span>
              <span>🍜 Petits restaurants</span>
            </div>
          </div>
        </div>
      </section>

      {/* CLIENT APP */}
      <section id="client-app" className="lv3-client-app">
        <div className="lv3-wrap">
          <div className="lv3-sec-h">
            <div className="lv3-sec-tag">Côté client</div>
            <h2>Scanner. Commander. Payer.</h2>
            <p>Aucune application à télécharger. Le menu s&apos;ouvre directement dans le navigateur, en 2 secondes. C&apos;est tout.</p>
          </div>

          <div className="lv3-client-flow">
            {/* Step 1 - Scan */}
            <div className="lv3-client-step">
              <div className="lv3-client-step-h">
                <div className="lv3-cs-num">01</div>
                <div>
                  <div className="lv3-cs-t">Il scanne le QR code</div>
                  <div className="lv3-cs-d">Depuis son téléphone. Aucune app.</div>
                </div>
              </div>
              <div className="lv3-ph-mini">
                <div className="lv3-ph-mini-screen lv3-ph-scan">
                  <div className="lv3-ph-scan-frame">
                    <span className="lv3-corn tl" /><span className="lv3-corn tr" />
                    <span className="lv3-corn bl" /><span className="lv3-corn br" />
                    <div className="lv3-ph-scan-qr">
                      <svg width="70" height="70" viewBox="0 0 70 70">
                        <rect width="70" height="70" fill="#fff" />
                        <g fill="#0a0a0a">
                          <rect x="5" y="5" width="18" height="18" /><rect x="9" y="9" width="10" height="10" fill="#fff" /><rect x="12" y="12" width="4" height="4" />
                          <rect x="47" y="5" width="18" height="18" /><rect x="51" y="9" width="10" height="10" fill="#fff" /><rect x="54" y="12" width="4" height="4" />
                          <rect x="5" y="47" width="18" height="18" /><rect x="9" y="51" width="10" height="10" fill="#fff" /><rect x="12" y="54" width="4" height="4" />
                          <rect x="28" y="8" width="3" height="3" /><rect x="34" y="8" width="3" height="3" /><rect x="40" y="14" width="3" height="3" />
                          <rect x="28" y="20" width="3" height="3" /><rect x="37" y="26" width="3" height="3" /><rect x="31" y="32" width="3" height="3" />
                          <rect x="8" y="30" width="3" height="3" /><rect x="14" y="36" width="3" height="3" /><rect x="20" y="30" width="3" height="3" />
                          <rect x="43" y="30" width="3" height="3" /><rect x="49" y="36" width="3" height="3" /><rect x="55" y="30" width="3" height="3" /><rect x="61" y="36" width="3" height="3" />
                          <rect x="28" y="42" width="3" height="3" /><rect x="37" y="48" width="3" height="3" /><rect x="43" y="54" width="3" height="3" /><rect x="52" y="60" width="3" height="3" /><rect x="58" y="52" width="3" height="3" />
                        </g>
                      </svg>
                    </div>
                    <div className="lv3-scanline" />
                  </div>
                  <div className="lv3-ph-scan-cta">
                    <div className="lv3-ph-scan-label">Ouvrir le menu de Le Gourmet</div>
                    <div className="lv3-ph-scan-btn">Ouvrir →</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lv3-flow-arrow">→</div>

            {/* Step 2 - Browse */}
            <div className="lv3-client-step">
              <div className="lv3-client-step-h">
                <div className="lv3-cs-num">02</div>
                <div>
                  <div className="lv3-cs-t">Il parcourt le menu</div>
                  <div className="lv3-cs-d">Photos, allergènes, descriptions.</div>
                </div>
              </div>
              <div className="lv3-ph-mini">
                <div className="lv3-ph-mini-screen" style={{ background: "#fff" }}>
                  <div style={{ padding: "18px 14px 8px", display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700 }}>
                    <span>9:41</span><span>●●●●</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 8px" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-3)", display: "grid", placeItems: "center", fontSize: 14 }}>🍽️</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em" }}>Le Gourmet</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>Table 3 · Ouvert</div>
                    </div>
                  </div>
                  <div style={{ padding: "0 12px 8px", display: "flex", gap: 4 }}>
                    <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 999, background: "var(--ink)", color: "#fff", fontWeight: 500 }}>Tout</span>
                    <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 999, background: "var(--bg-3)", color: "var(--ink-2)", fontWeight: 500 }}>Burgers</span>
                    <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 999, background: "var(--bg-3)", color: "var(--ink-2)", fontWeight: 500 }}>Tacos</span>
                  </div>
                  <div className="lv3-mini-row" style={{ background: "#fff8f7" }}>
                    <div className="mi">🍔</div>
                    <div className="mm"><div className="mn">Classic Burger</div><div className="mp">9,90 €</div></div>
                    <div className="madd on">+</div>
                  </div>
                  <div className="lv3-mini-row">
                    <div className="mi">🧀</div>
                    <div className="mm"><div className="mn">Cheese Burger</div><div className="mp">10,90 €</div></div>
                    <div className="madd">+</div>
                  </div>
                  <div className="lv3-mini-row">
                    <div className="mi">🌮</div>
                    <div className="mm"><div className="mn">Tacos XL</div><div className="mp">11,50 €</div></div>
                    <div className="madd">+</div>
                  </div>
                  <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, background: "var(--ink)", color: "#fff", borderRadius: 10, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 600, boxShadow: "0 8px 16px -4px rgba(0,0,0,.25)" }}>
                    <span style={{ background: "#fff", color: "var(--ink)", borderRadius: 5, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>1</span>
                    Voir mon panier <span style={{ marginLeft: "auto" }}>9,90 €</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lv3-flow-arrow">→</div>

            {/* Step 3 - Pay */}
            <div className="lv3-client-step">
              <div className="lv3-client-step-h">
                <div className="lv3-cs-num">03</div>
                <div>
                  <div className="lv3-cs-t">Il paie en un tap</div>
                  <div className="lv3-cs-d">Apple Pay, Google Pay, CB.</div>
                </div>
              </div>
              <div className="lv3-ph-mini">
                <div className="lv3-ph-mini-screen" style={{ background: "#fafafa" }}>
                  <div style={{ padding: "18px 14px 8px", display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700 }}>
                    <span>9:42</span><span>●●●●</span>
                  </div>
                  <div style={{ textAlign: "center", padding: "24px 16px 12px" }}>
                    <div style={{ width: 48, height: 48, margin: "0 auto 12px", borderRadius: "50%", background: "var(--green)", display: "grid", placeItems: "center", boxShadow: "0 8px 16px -4px rgba(0,165,68,0.35)" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Paiement confirmé</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>23,90 € · Apple Pay</div>
                  </div>
                  <div style={{ margin: "8px 12px", background: "#fff", border: "1px solid var(--rule)", borderRadius: 10, padding: "10px 12px", fontSize: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>1× Classic Burger</span><span>9,90</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>1× Tacos XL</span><span>11,50</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>1× Coca-Cola</span><span>2,50</span></div>
                    <div style={{ borderTop: "1px dashed var(--rule)", marginTop: 4, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                      <span>Total</span><span>23,90 €</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", padding: "4px 16px", fontSize: 9, color: "var(--muted)" }}>
                    Votre commande #047 est envoyée en cuisine
                  </div>
                  <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 9, color: "var(--muted)" }}>
                    <span style={{ background: "#635bff", color: "#fff", padding: "1px 5px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.04em", fontSize: 8 }}>stripe</span>
                    Paiement sécurisé
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lv3-client-features">
            <div className="lv3-cf">
              <div className="lv3-cf-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="0.5" />
                  <rect x="14" y="3" width="7" height="7" rx="0.5" />
                  <rect x="3" y="14" width="7" height="7" rx="0.5" />
                  <path d="M14 14h3v3h-3zM14 18h3v3h-3zM18 14h3v3h-3zM18 18h3v3h-3z" />
                </svg>
              </div>
              <div className="lv3-cf-t">Aucune app à installer</div>
              <div className="lv3-cf-d">Le menu s&apos;ouvre directement dans le navigateur du téléphone.</div>
            </div>
            <div className="lv3-cf">
              <div className="lv3-cf-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className="lv3-cf-t">30 secondes chrono</div>
              <div className="lv3-cf-d">De l&apos;ouverture du menu à la confirmation de paiement.</div>
            </div>
            <div className="lv3-cf">
              <div className="lv3-cf-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2l2.39 6.95H22l-6.06 4.4 2.32 7.15L12 16.3l-6.26 4.2 2.32-7.15L2 8.95h7.61z" />
                </svg>
              </div>
              <div className="lv3-cf-t">Fidélité automatique</div>
              <div className="lv3-cf-d">Chaque commande cumule des points, sans carte à présenter.</div>
            </div>
            <div className="lv3-cf">
              <div className="lv3-cf-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div className="lv3-cf-t">Paiement fractionné</div>
              <div className="lv3-cf-d">Partage de l&apos;addition entre convives, en un tap.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="product" className="lv3-block">
        <div className="lv3-wrap">
          <div className="lv3-sec-h">
            <div className="lv3-sec-tag">Produit</div>
            <h2>Tout pour servir plus vite et mieux.</h2>
            <p>Un menu, un QR code, un tableau de bord. Rien de plus, et c&apos;est exactement ce qu&apos;il faut.</p>
          </div>

          {/* Feature 1 */}
          <div className="lv3-f-row">
            <div className="lv3-f-copy">
              <div className="lv3-f-n">01 · Carte digitale</div>
              <h3>Votre carte,<br />modifiable en&nbsp;direct.</h3>
              <p>Créez, dupliquez, mettez en pause. Vos changements sont visibles instantanément sur le menu de vos clients, sans redéploiement.</p>
              <ul>
                <li><span className="dot"><CheckIcon /></span>Produits, options et modificateurs illimités</li>
                <li><span className="dot"><CheckIcon /></span>Stock en temps réel, rupture automatique</li>
                <li><span className="dot"><CheckIcon /></span>Photos, allergènes, traductions</li>
              </ul>
              <Link href="/admin/chez-momo/menu?demo=true" className="link">Découvrir l&apos;éditeur →</Link>
            </div>
            <div className="lv3-f-visual">
              <div className="lv3-editor">
                <div className="hdr">
                  <div className="ph">🍔</div>
                  <div>
                    <div className="ti">Classic Burger</div>
                    <div className="st">Publié · 142 commandes cette semaine</div>
                  </div>
                </div>
                <div className="field">
                  <div className="fl">Nom</div>
                  <div className="fi focus">Classic Burger</div>
                </div>
                <div className="field">
                  <div className="fl">Prix</div>
                  <div className="fi">9,90 €</div>
                </div>
                <div className="field">
                  <div className="fl">Disponibilité</div>
                  <div className="tog">
                    <span className="on">En vente</span>
                    <span>Épuisé</span>
                    <span>Masqué</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="lv3-f-row lv3-reverse">
            <div className="lv3-f-copy">
              <div className="lv3-f-n">02 · Pilotage</div>
              <h3>Des chiffres clairs,<br />pas des graphiques.</h3>
              <p>Chiffre d&apos;affaires, ticket moyen, produits stars. Un tableau de bord qui va droit à l&apos;essentiel, et s&apos;exporte d&apos;un clic pour votre comptable.</p>
              <ul>
                <li><span className="dot"><CheckIcon /></span>Ventes par jour, par produit, par canal</li>
                <li><span className="dot"><CheckIcon /></span>Export CSV pour votre comptable</li>
                <li><span className="dot"><CheckIcon /></span>Multi-établissements, vue consolidée</li>
              </ul>
              <Link href="/admin/chez-momo/dashboard?demo=true" className="link">Voir un tableau type →</Link>
            </div>
            <div className="lv3-f-visual dark">
              <div className="lv3-chart">
                <div className="lv3-chart-hdr">
                  <div>
                    <div className="ch-k">Chiffre d&apos;affaires · 7 jours</div>
                    <div className="ch-v">4 287 €</div>
                    <div className="ch-d">▲ 14,2% vs semaine précédente</div>
                  </div>
                  <div className="tabs">
                    <span>24h</span><span className="on">7j</span><span>30j</span>
                  </div>
                </div>
                <div className="lv3-chart-area">
                  <svg viewBox="0 0 400 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lv3grad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#00c758" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#00c758" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 110 L 58 90 L 116 96 L 174 68 L 232 78 L 290 46 L 348 30 L 400 40 L 400 140 L 0 140 Z" fill="url(#lv3grad)" />
                    <path d="M 0 110 L 58 90 L 116 96 L 174 68 L 232 78 L 290 46 L 348 30 L 400 40" fill="none" stroke="#00c758" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    <circle cx="400" cy="40" r="5" fill="#00c758" />
                    <circle cx="400" cy="40" r="10" fill="#00c758" opacity="0.2" />
                  </svg>
                </div>
                <div className="lv3-chart-legend">
                  <span>Lun 13</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim 19</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="lv3-f-row">
            <div className="lv3-f-copy">
              <div className="lv3-f-n">03 · Paiement</div>
              <h3>Un QR code par table.<br />Zéro file d&apos;attente.</h3>
              <p>Générez un QR code par table, par comptoir, par borne. Le paiement passe par Stripe — rien n&apos;est stocké chez nous, rien n&apos;est prélevé.</p>
              <ul>
                <li><span className="dot"><CheckIcon /></span>Apple Pay, Google Pay, CB</li>
                <li><span className="dot"><CheckIcon /></span>Pourboires et paiement fractionné</li>
                <li><span className="dot"><CheckIcon /></span>Gabarits d&apos;impression inclus</li>
              </ul>
              <a href="#client-app" className="link">Comment ça marche →</a>
            </div>
            <div className="lv3-f-visual">
              <div className="lv3-qr-stack">
                <div className="lv3-qr-card">
                  <div className="n">taapr</div>
                  <div className="s">LE GOURMET</div>
                  <div className="qr">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      <rect width="140" height="140" fill="#fff" />
                      <g fill="#0a0a0a">
                        <rect x="10" y="10" width="35" height="35" /><rect x="18" y="18" width="19" height="19" fill="#fff" /><rect x="24" y="24" width="7" height="7" />
                        <rect x="95" y="10" width="35" height="35" /><rect x="103" y="18" width="19" height="19" fill="#fff" /><rect x="109" y="24" width="7" height="7" />
                        <rect x="10" y="95" width="35" height="35" /><rect x="18" y="103" width="19" height="19" fill="#fff" /><rect x="24" y="109" width="7" height="7" />
                      </g>
                      <g fill="#0a0a0a">
                        <rect x="55" y="14" width="6" height="6" /><rect x="67" y="14" width="6" height="6" /><rect x="79" y="14" width="6" height="6" />
                        <rect x="55" y="26" width="6" height="6" /><rect x="67" y="26" width="6" height="6" /><rect x="85" y="26" width="6" height="6" />
                        <rect x="61" y="38" width="6" height="6" /><rect x="73" y="38" width="6" height="6" /><rect x="85" y="38" width="6" height="6" />
                        <rect x="14" y="55" width="6" height="6" /><rect x="26" y="55" width="6" height="6" /><rect x="38" y="55" width="6" height="6" />
                        <rect x="55" y="55" width="6" height="6" /><rect x="79" y="55" width="6" height="6" /><rect x="103" y="55" width="6" height="6" /><rect x="115" y="55" width="6" height="6" />
                        <rect x="20" y="67" width="6" height="6" /><rect x="32" y="67" width="6" height="6" /><rect x="55" y="67" width="6" height="6" /><rect x="67" y="67" width="6" height="6" /><rect x="91" y="67" width="6" height="6" /><rect x="109" y="67" width="6" height="6" />
                        <rect x="14" y="79" width="6" height="6" /><rect x="38" y="79" width="6" height="6" /><rect x="61" y="79" width="6" height="6" /><rect x="79" y="79" width="6" height="6" /><rect x="97" y="79" width="6" height="6" /><rect x="115" y="79" width="6" height="6" />
                        <rect x="55" y="91" width="6" height="6" /><rect x="73" y="91" width="6" height="6" /><rect x="103" y="91" width="6" height="6" />
                        <rect x="55" y="103" width="6" height="6" /><rect x="67" y="103" width="6" height="6" /><rect x="91" y="103" width="6" height="6" /><rect x="115" y="103" width="6" height="6" />
                        <rect x="61" y="115" width="6" height="6" /><rect x="79" y="115" width="6" height="6" /><rect x="97" y="115" width="6" height="6" /><rect x="109" y="115" width="6" height="6" />
                      </g>
                    </svg>
                  </div>
                  <div className="tnum">TABLE · 03</div>
                </div>
                <div style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--muted)", alignItems: "center" }}>
                  <span style={{ background: "#635bff", color: "#fff", padding: "2px 6px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.04em" }}>stripe</span>
                  Paiement sécurisé · Fonds versés chaque jour
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="lv3-block lv3-pricing-block">
        <div className="lv3-wrap">
          <div className="lv3-sec-h">
            <div className="lv3-sec-tag">Tarifs</div>
            <h2>Un prix fixe.<br />Pas de surprise sur votre addition.</h2>
            <p>Choisissez votre plan — changez à tout moment. Aucun engagement, aucune commission, jamais.</p>
          </div>

          <div className="lv3-price-grid">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`lv3-plan${plan.featured ? " feat" : ""}`}>
                {plan.badge && <div className="badge-top">{plan.badge}</div>}
                <h3>{plan.name}</h3>
                <div className="lv3-plan-sub">{plan.sub}</div>
                <div className="price">
                  <span className="v">{plan.price}€</span>
                  <span className="lv3-plan-unit">/mois HT</span>
                </div>
                <Link
                  href="/admin/onboarding"
                  className={`lv3-btn ${plan.ctaPrimary ? "lv3-btn-primary feat-cta" : "lv3-btn-secondary"} lv3-plan-cta`}
                >
                  {plan.cta}
                </Link>
                <ul className="lv3-plan-ft">
                  {plan.features.map((f) => (
                    <li key={f}><span className="dot"><CheckIcon /></span>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lv3-price-foot">
            TVA 20% non incluse · Frais Stripe ~1,5% + 0,25€ par transaction · Annulable à tout moment
          </div>

          <div className="lv3-addons-grid">
            <div className="lv3-addon">
              <div className="lv3-addon-head">
                <div className="lv3-addon-tag">Module complémentaire</div>
                <span className="lv3-addon-new">Nouveau</span>
              </div>
              <div className="lv3-addon-body">
                <div className="lv3-addon-main">
                  <h3>Module Livraison</h3>
                  <p>Ajoutez la livraison à domicile à votre offre — zones, livreurs, suivi temps réel.</p>
                  <ul className="lv3-addon-ft">
                    <li><span className="dot"><CheckIcon /></span>Zones de livraison personnalisées (rayon + frais)</li>
                    <li><span className="dot"><CheckIcon /></span>Espace livreur mobile avec auth SMS</li>
                    <li><span className="dot"><CheckIcon /></span>Sélection d&apos;adresse par carte interactive</li>
                    <li><span className="dot"><CheckIcon /></span>Suivi livraison en temps réel pour le client</li>
                  </ul>
                </div>
                <div className="lv3-addon-side">
                  <div className="lv3-addon-price">
                    <span className="v">+19€</span>
                    <span className="u">/mois HT</span>
                  </div>
                  <div className="lv3-addon-avail">
                    Disponible sur <strong>Pro</strong> et <strong>Business</strong>
                  </div>
                  <Link href="/admin/onboarding" className="lv3-btn lv3-btn-primary lv3-addon-cta">
                    Activer le module →
                  </Link>
                </div>
              </div>
            </div>

            <div className="lv3-addon">
              <div className="lv3-addon-head">
                <div className="lv3-addon-tag">Module complémentaire</div>
                <span className="lv3-addon-new">Nouveau</span>
              </div>
              <div className="lv3-addon-body">
                <div className="lv3-addon-main">
                  <h3>Module Stock</h3>
                  <p>Numérisez vos tickets, suivez vos quantités en temps réel, alerte sur seuil bas.</p>
                  <ul className="lv3-addon-ft">
                    <li><span className="dot"><CheckIcon /></span>Scan caméra des tickets fournisseurs</li>
                    <li><span className="dot"><CheckIcon /></span>Lecture OCR auto par IA et assignation au stock</li>
                    <li><span className="dot"><CheckIcon /></span>Mouvements illimités (entrées, sorties, ajustements)</li>
                    <li><span className="dot"><CheckIcon /></span>Alertes seuil bas par item</li>
                  </ul>
                </div>
                <div className="lv3-addon-side">
                  <div className="lv3-addon-price">
                    <span className="v">+29€</span>
                    <span className="u">/mois HT</span>
                  </div>
                  <div className="lv3-addon-avail">
                    Disponible sur tous les forfaits
                  </div>
                  <Link href="/admin/onboarding" className="lv3-btn lv3-btn-primary lv3-addon-cta">
                    Activer le module →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="customers" className="lv3-block">
        <div className="lv3-wrap">
          <div className="lv3-quote-block">
            <blockquote>
              « On a divisé notre temps de service par deux. Les clients s&apos;assoient, scannent, commandent — et nous, on cuisine. »
            </blockquote>
            <div className="lv3-quote-attr">
              <div className="lv3-qa-av">K</div>
              <div className="who">
                <div className="n">Karim Benali</div>
                <div className="r">Chef · Le Petit Gourmand, Lyon</div>
              </div>
            </div>
          </div>

          <div className="lv3-testi-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.n} className="lv3-testi">
                <p className="q">{t.q}</p>
                <div className="who">
                  <div className="lv3-qa-av" style={{ background: t.avBg }}>{t.initial}</div>
                  <div>
                    <div className="n">{t.n}</div>
                    <div className="r">{t.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="lv3-block" style={{ paddingTop: 40 }}>
        <div className="lv3-wrap">
          <div className="lv3-sec-h">
            <div className="lv3-sec-tag">Questions</div>
            <h2>Tout ce qu&apos;il faut savoir.</h2>
          </div>
          <div className="lv3-faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`lv3-faq-item${openFaq === i ? " open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="lv3-faq-q">
                  <span className="q">{item.q}</span>
                  <span className="tog">+</span>
                </div>
                <div className="lv3-faq-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="lv3-close">
        <div className="lv3-wrap">
          <h2>Votre restaurant en ligne,<br />ce soir.</h2>
          <p>Sans carte bancaire. Sans engagement. Et surtout, sans prélèvement sur vos ventes.</p>
          <div className="ctas">
            <Link href="/admin/onboarding" className="lv3-btn lv3-btn-primary lv3-btn-lg">
              Commencer gratuitement
            </Link>
            <a href="mailto:contact@taapr.com" className="lv3-btn lv3-btn-secondary lv3-btn-lg">
              Parler à un expert
            </a>
          </div>
          <div className="foot-note">
            <span><span className="lv3-chk"><CheckIcon /></span>Setup en 5 min</span>
            <span><span className="lv3-chk"><CheckIcon /></span>14 jours gratuits</span>
            <span><span className="lv3-chk"><CheckIcon /></span>Annulable à tout moment</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lv3-footer">
        <div className="lv3-wrap">
          <div className="lv3-foot-grid">
            <div>
              <div className="lv3-foot-brand">taapr</div>
              <p className="lv3-foot-desc">
                La commande en ligne pour les restaurants indépendants. 0% commission. Abonnement fixe. Sans engagement.
              </p>
            </div>
            <div className="lv3-foot-col">
              <h6>Produit</h6>
              <a href="#product">Fonctionnalités</a>
              <a href="#pricing">Tarifs</a>
              <Link href="/admin/chez-momo?demo=true">Démo</Link>
              <a href="#client-app">Côté client</a>
            </div>
            <div className="lv3-foot-col">
              <h6>Ressources</h6>
              <a href="#faq">Centre d&apos;aide</a>
              <a href="mailto:contact@taapr.com">Contact</a>
              <a href="#">Blog</a>
              <a href="#">Statut</a>
            </div>
            <div className="lv3-foot-col">
              <h6>Société</h6>
              <a href="#">À propos</a>
              <a href="#">Mentions légales</a>
              <a href="#">CGV</a>
              <a href="#">Confidentialité</a>
            </div>
          </div>
          <div className="lv3-foot-bot">
            <span>© 2026 TaapR — Tous droits réservés</span>
            <span>Paiement sécurisé par Stripe</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
