"use client";

import Link from "next/link";
import { useState } from "react";
import "../../landing-v3.css";

const CheckIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const FAQ_ITEMS = [
  {
    q: "Comment fonctionnent les zones de livraison ?",
    a: "Vous définissez des cercles concentriques autour de votre restaurant — par exemple : 0-1 km à 2,90€, 1-3 km à 4,50€, 3-5 km à 6€. Le client paie automatiquement le tarif de la zone correspondant à son adresse. Vous pouvez aussi définir un montant minimum de commande par zone.",
  },
  {
    q: "Comment mes livreurs accèdent-ils au module ?",
    a: "Vous invitez chaque livreur depuis votre interface admin avec son numéro de téléphone. Il reçoit un SMS avec un lien sécurisé, se connecte sans mot de passe, et accède à son espace livreur mobile. Pas d'app à installer.",
  },
  {
    q: "Le client peut-il suivre sa commande en temps réel ?",
    a: "Oui. Dès que le livreur prend en charge la commande, le client reçoit un lien de suivi qui montre le statut (préparation, en route, livré) et l'horodatage de chaque étape.",
  },
  {
    q: "Qui paie les frais de livraison ?",
    a: "Le client paie les frais de livraison au moment du checkout, en plus du panier. Vous reversez ensuite votre livreur selon les modalités que vous fixez (salaire, freelance, % commission).",
  },
  {
    q: "Puis-je désactiver la livraison à certaines heures ?",
    a: "Oui, la livraison suit vos horaires d'ouverture. Vous pouvez aussi suspendre temporairement la livraison depuis l'admin (ex: rush, livreur indisponible) sans toucher aux commandes sur place ou à emporter.",
  },
  {
    q: "Combien coûte le module ?",
    a: "19€/mois HT en complément d'un plan Pro (49€/mois) ou Business (79€/mois). Pas de frais par livraison, pas de commission. Annulable à tout moment.",
  },
];

export default function LivraisonModulePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="landing-v3">
      {/* NAV */}
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

      {/* HERO */}
      <section className="lv3-wrap">
        <div className="lv3-fp-hero">
          <div>
            <div className="lv3-fp-tag">
              <span className="dot" />
              Module complémentaire · Livraison
            </div>
            <h1>
              Livrez à domicile,<br />sans <span className="accent">commission.</span>
            </h1>
            <p>
              Zones, livreurs, suivi temps réel. Le module Livraison transforme votre
              restaurant en service de livraison — sans Uber Eats, sans Deliveroo,
              sans 30 % de marge en moins.
            </p>
            <div className="ctas">
              <Link
                href="/admin/onboarding?plan=pro&addons=delivery"
                className="lv3-btn lv3-btn-primary lv3-btn-lg"
              >
                Activer le module
              </Link>
              <Link href="/demo" className="lv3-btn lv3-btn-secondary lv3-btn-lg">
                Demander une démo →
              </Link>
            </div>
            <div className="lv3-fp-hero-note">
              <span className="lv3-chk"><CheckIcon /></span>
              +19€/mois HT · sur les plans Pro & Business
            </div>
          </div>

          {/* Hero illustration: map with zones + driver phone */}
          <div className="lv3-fp-illus">
            <div className="lv3-fp-map">
              <div className="lv3-fp-map-zone z3" />
              <div className="lv3-fp-map-zone z2" />
              <div className="lv3-fp-map-zone z1" />

              {/* Houses (delivery destinations) */}
              <div className="lv3-fp-map-house h1">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3l9 7v11h-6v-6h-6v6H3V10z" />
                </svg>
              </div>
              <div className="lv3-fp-map-house h2">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3l9 7v11h-6v-6h-6v6H3V10z" />
                </svg>
              </div>
              <div className="lv3-fp-map-house h3">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3l9 7v11h-6v-6h-6v6H3V10z" />
                </svg>
              </div>
              <div className="lv3-fp-map-house h4">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3l9 7v11h-6v-6h-6v6H3V10z" />
                </svg>
              </div>

              {/* Drivers */}
              <div className="lv3-fp-map-driver d1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" />
                  <path d="M6 17l3-7h4l4 7M14 5h3" />
                </svg>
              </div>
              <div className="lv3-fp-map-driver d2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" />
                  <path d="M6 17l3-7h4l4 7M14 5h3" />
                </svg>
              </div>
              <div className="lv3-fp-map-driver d3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" />
                  <path d="M6 17l3-7h4l4 7M14 5h3" />
                </svg>
              </div>

              {/* Restaurant pin */}
              <div className="lv3-fp-map-pin">
                <svg viewBox="0 0 32 38" fill="none">
                  <path
                    d="M16 0C7.2 0 0 7.2 0 16c0 11 16 22 16 22s16-11 16-22C32 7.2 24.8 0 16 0z"
                    fill="#d7352d"
                  />
                  <circle cx="16" cy="14" r="6" fill="#fff" />
                  <text x="16" y="18" fontSize="9" fontWeight="700" fill="#d7352d" textAnchor="middle">🍴</text>
                </svg>
              </div>

              {/* Zone labels */}
              <div className="lv3-fp-map-label" style={{ left: "8%", top: "12%" }}>
                Zone 3 · 5 km <span className="price">6,00€</span>
              </div>
              <div className="lv3-fp-map-label" style={{ right: "8%", bottom: "16%" }}>
                Zone 1 · 1 km <span className="price">2,90€</span>
              </div>
            </div>

            {/* Driver phone overlay */}
            <div className="lv3-fp-driver-ph">
              <div className="top">
                <span>Livreur · 9:42</span>
                <span>●●●●</span>
              </div>
              <div className="body">
                <div className="hdr">3 courses en cours</div>
                <div className="order">
                  <div className="n">Cmd #1247</div>
                  <div className="a">12 rue de la Paix</div>
                  <div className="row">
                    <span>3,2 km</span>
                    <span className="pill">EN ROUTE</span>
                  </div>
                </div>
                <div className="order assigned">
                  <div className="n">Cmd #1248</div>
                  <div className="a">8 av. Foch</div>
                  <div className="row">
                    <span>1,8 km</span>
                    <span className="pill">À PRENDRE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="lv3-block" style={{ paddingTop: 40 }}>
        <div className="lv3-wrap">
          <div className="lv3-fp-sec">
            <h2>Tout ce qu&apos;il faut pour livrer.</h2>
            <p>
              Zones, livreurs, paiements, suivi — un module complet pensé pour les
              restaurants qui veulent garder le contrôle de leurs livraisons.
            </p>
          </div>

          <div className="lv3-fp-benefits">
            <div className="lv3-fp-benefit">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <h3>Zones illimitées</h3>
              <p>
                Cercles concentriques autour de votre restaurant. Tarif et minimum
                de commande par zone — vos clients voient leurs frais avant de
                valider.
              </p>
            </div>
            <div className="lv3-fp-benefit">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="6" cy="17" r="3" />
                  <circle cx="18" cy="17" r="3" />
                  <path d="M6 17l3-7h4l4 7M14 5h3" />
                </svg>
              </div>
              <h3>Livreurs autonomes</h3>
              <p>
                Invitez vos livreurs par SMS. Ils accèdent à leur espace mobile
                pour voir leurs courses, naviguer, et marquer les commandes
                livrées.
              </p>
            </div>
            <div className="lv3-fp-benefit">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h3>Suivi temps réel</h3>
              <p>
                Le client suit sa commande en direct — préparation, prise en
                charge, en route, livrée. Moins d&apos;appels &laquo; où est ma
                commande ? &raquo;.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lv3-block" style={{ background: "var(--bg-2)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <div className="lv3-wrap">
          <div className="lv3-fp-sec">
            <h2>3 étapes pour livrer ce soir.</h2>
            <p>Activez le module, configurez vos zones, invitez vos livreurs.</p>
          </div>

          <div className="lv3-fp-steps">
            <div className="lv3-fp-step">
              <div className="lv3-fp-step-h">
                <div className="lv3-fp-step-num">01</div>
                <div>
                  <div className="lv3-fp-step-t">Configurez vos zones</div>
                  <div className="lv3-fp-step-d">
                    Posez votre pin, dessinez vos rayons, fixez vos tarifs.
                  </div>
                </div>
              </div>
              <div className="lv3-fp-step-mock">
                <div style={{
                  width: "78%",
                  aspectRatio: "1 / 1",
                  background: "radial-gradient(circle, #fff 0%, #f5f5f5 100%)",
                  borderRadius: "16px",
                  position: "relative",
                  border: "1px solid var(--rule)",
                }}>
                  <div className="lv3-fp-map-zone z3" style={{ borderColor: "rgba(215,53,45,0.2)" }} />
                  <div className="lv3-fp-map-zone z2" style={{ borderColor: "rgba(215,53,45,0.3)" }} />
                  <div className="lv3-fp-map-zone z1" style={{ borderColor: "rgba(215,53,45,0.4)" }} />
                  <div className="lv3-fp-map-pin" style={{ left: "50%", top: "50%" }}>
                    <svg viewBox="0 0 32 38" fill="none">
                      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 22 16 22s16-11 16-22C32 7.2 24.8 0 16 0z" fill="#d7352d" />
                      <circle cx="16" cy="14" r="6" fill="#fff" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="lv3-fp-step">
              <div className="lv3-fp-step-h">
                <div className="lv3-fp-step-num">02</div>
                <div>
                  <div className="lv3-fp-step-t">Invitez vos livreurs</div>
                  <div className="lv3-fp-step-d">
                    Numéro de tél, prénom — connexion par SMS, sans app.
                  </div>
                </div>
              </div>
              <div className="lv3-fp-step-mock">
                <div style={{
                  width: "82%",
                  background: "#fff",
                  border: "1px solid var(--rule)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  fontSize: "12px",
                  display: "grid",
                  gap: "8px",
                  boxShadow: "0 12px 30px -12px rgba(0,0,0,0.08)",
                }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
                    Livreurs (3)
                  </div>
                  {[
                    { n: "Marc", p: "06 12 34 56 78", on: true },
                    { n: "Léa", p: "06 87 65 43 21", on: true },
                    { n: "Karim", p: "06 55 44 33 22", on: false },
                  ].map((d) => (
                    <div key={d.n} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderTop: "1px solid var(--rule)" }}>
                      <div style={{
                        width: "26px", height: "26px", borderRadius: "50%",
                        background: "var(--ink)", color: "#fff",
                        display: "grid", placeItems: "center",
                        fontSize: "11px", fontWeight: 700,
                      }}>{d.n.charAt(0)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{d.n}</div>
                        <div style={{ fontSize: "10px", color: "var(--muted)" }}>{d.p}</div>
                      </div>
                      <span style={{
                        fontSize: "9px", padding: "2px 7px", borderRadius: "999px",
                        background: d.on ? "#dcfce7" : "var(--bg-3)",
                        color: d.on ? "#008138" : "var(--muted)",
                        fontWeight: 700, letterSpacing: "0.04em",
                      }}>{d.on ? "ACTIF" : "INVITÉ"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lv3-fp-step">
              <div className="lv3-fp-step-h">
                <div className="lv3-fp-step-num">03</div>
                <div>
                  <div className="lv3-fp-step-t">Recevez les commandes</div>
                  <div className="lv3-fp-step-d">
                    Vos clients commandent en livraison. Le suivi est automatique.
                  </div>
                </div>
              </div>
              <div className="lv3-fp-step-mock">
                <div className="lv3-fp-track">
                  <div className="live-pill">
                    <span className="pulse" />
                    Cmd #1247 · 28 min
                  </div>
                  <div className="timeline">
                    <div className="ti-row done">
                      <div className="dot"><CheckIcon /></div>
                      <div>
                        <div className="label">Commande reçue</div>
                        <div className="ts">9:18</div>
                      </div>
                    </div>
                    <div className="ti-row done">
                      <div className="dot"><CheckIcon /></div>
                      <div>
                        <div className="label">En préparation</div>
                        <div className="ts">9:22</div>
                      </div>
                    </div>
                    <div className="ti-row live">
                      <div className="dot">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" />
                          <path d="M6 17l3-7h4l4 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="label">En livraison · Marc</div>
                        <div className="ts">arrive dans ~12 min</div>
                      </div>
                    </div>
                    <div className="ti-row">
                      <div className="dot" />
                      <div>
                        <div className="label">Livré</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAIL: Zones */}
      <section className="lv3-wrap">
        <div className="lv3-fp-detail">
          <div>
            <div className="lv3-fp-detail-num">01 · Zones de livraison</div>
            <h2>Vos rayons,<br />vos prix.</h2>
            <p>
              Définissez plusieurs zones concentriques avec des frais et un montant
              minimum personnalisés. La zone la plus proche du client s&apos;applique
              automatiquement.
            </p>
            <ul>
              <li><span className="dot"><CheckIcon /></span>Zones illimitées (rayon en mètres)</li>
              <li><span className="dot"><CheckIcon /></span>Frais de livraison par zone</li>
              <li><span className="dot"><CheckIcon /></span>Montant minimum de commande par zone</li>
              <li><span className="dot"><CheckIcon /></span>Rayon maximum global, hors zone = pas de livraison</li>
            </ul>
          </div>
          <div className="lv3-fp-detail-mock">
            <div style={{
              width: "82%",
              aspectRatio: "1 / 1",
              background: "radial-gradient(circle, #fff 0%, #f5f5f5 100%)",
              borderRadius: "20px",
              position: "relative",
              border: "1px solid var(--rule)",
              boxShadow: "0 24px 50px -20px rgba(0,0,0,0.12)",
            }}>
              <div className="lv3-fp-map-zone z3" />
              <div className="lv3-fp-map-zone z2" />
              <div className="lv3-fp-map-zone z1" />
              <div className="lv3-fp-map-pin" style={{ left: "50%", top: "50%" }}>
                <svg viewBox="0 0 32 38" fill="none">
                  <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 22 16 22s16-11 16-22C32 7.2 24.8 0 16 0z" fill="#d7352d" />
                  <circle cx="16" cy="14" r="6" fill="#fff" />
                </svg>
              </div>
              <div className="lv3-fp-map-label" style={{ left: "10%", top: "10%" }}>
                3 km <span className="price">6,00€</span>
              </div>
              <div className="lv3-fp-map-label" style={{ right: "12%", top: "30%" }}>
                2 km <span className="price">4,50€</span>
              </div>
              <div className="lv3-fp-map-label" style={{ left: "30%", bottom: "12%" }}>
                1 km <span className="price">2,90€</span>
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL: Driver app */}
        <div className="lv3-fp-detail reverse">
          <div>
            <div className="lv3-fp-detail-num">02 · Espace livreur</div>
            <h2>Une appli mobile,<br />sans installation.</h2>
            <p>
              Vos livreurs reçoivent un SMS, cliquent sur le lien, et accèdent à
              leur espace dédié dans le navigateur. Liste des courses, navigation,
              statut — tout est là.
            </p>
            <ul>
              <li><span className="dot"><CheckIcon /></span>Authentification par SMS, zéro mot de passe</li>
              <li><span className="dot"><CheckIcon /></span>Navigation Google/Apple Maps en un tap</li>
              <li><span className="dot"><CheckIcon /></span>Statut de course (récupérée, en route, livrée)</li>
              <li><span className="dot"><CheckIcon /></span>Historique de tournées par livreur</li>
            </ul>
          </div>
          <div className="lv3-fp-detail-mock">
            <div style={{
              width: "70%",
              background: "#fff",
              borderRadius: "22px",
              border: "8px solid var(--ink)",
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}>
              <div style={{ background: "var(--ink)", color: "#fff", padding: "12px 14px", fontSize: "11px", fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                <span>Livreur · 9:42</span>
                <span>●●●●</span>
              </div>
              <div style={{ padding: "14px", display: "grid", gap: "10px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
                  3 courses en cours
                </div>
                {[
                  { n: "#1247", a: "12 rue de la Paix", d: "3,2 km", p: "EN ROUTE", c: "var(--green)" },
                  { n: "#1248", a: "8 av. Foch", d: "1,8 km", p: "À PRENDRE", c: "#fef3c7" },
                  { n: "#1249", a: "23 bd Voltaire", d: "4,1 km", p: "À PRENDRE", c: "#fef3c7" },
                ].map((o) => (
                  <div key={o.n} style={{ border: "1px solid var(--rule)", borderRadius: "12px", padding: "12px", fontSize: "12px" }}>
                    <div style={{ fontWeight: 600 }}>Cmd {o.n}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{o.a}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                      <span style={{ color: "var(--muted)", fontSize: "11px" }}>{o.d}</span>
                      <span style={{
                        padding: "3px 9px", borderRadius: "999px",
                        background: o.p === "EN ROUTE" ? "var(--green)" : "#fef3c7",
                        color: o.p === "EN ROUTE" ? "#fff" : "#b45309",
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
                      }}>{o.p}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL: Customer tracking */}
        <div className="lv3-fp-detail">
          <div>
            <div className="lv3-fp-detail-num">03 · Suivi client</div>
            <h2>Le client suit<br />sa commande.</h2>
            <p>
              Plus besoin de répondre au téléphone. Le client reçoit un lien de
              suivi par SMS et email — il voit en temps réel où en est sa commande.
            </p>
            <ul>
              <li><span className="dot"><CheckIcon /></span>Timeline live : préparation, en route, livrée</li>
              <li><span className="dot"><CheckIcon /></span>Estimation d&apos;arrivée actualisée</li>
              <li><span className="dot"><CheckIcon /></span>Notifications push automatiques (option)</li>
              <li><span className="dot"><CheckIcon /></span>Aucune app à installer pour le client</li>
            </ul>
          </div>
          <div className="lv3-fp-detail-mock">
            <div className="lv3-fp-track">
              <div className="live-pill">
                <span className="pulse" />
                Suivi en direct
              </div>
              <div className="timeline">
                <div className="ti-row done">
                  <div className="dot"><CheckIcon /></div>
                  <div>
                    <div className="label">Commande reçue</div>
                    <div className="ts">9:18</div>
                  </div>
                </div>
                <div className="ti-row done">
                  <div className="dot"><CheckIcon /></div>
                  <div>
                    <div className="label">En préparation</div>
                    <div className="ts">9:22</div>
                  </div>
                </div>
                <div className="ti-row live">
                  <div className="dot">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" />
                      <path d="M6 17l3-7h4l4 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="label">En livraison · Marc</div>
                    <div className="ts">arrive dans ~12 min</div>
                  </div>
                </div>
                <div className="ti-row">
                  <div className="dot" />
                  <div>
                    <div className="label">Livré</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lv3-block">
        <div className="lv3-wrap">
          <div className="lv3-fp-price">
            <div>
              <div className="l-tag">Module Livraison</div>
              <h2>Un prix fixe.<br />Aucune commission par livraison.</h2>
              <p>
                Là où Uber Eats ou Deliveroo prennent 25 à 35 % par commande, vous
                gardez votre marge. Le module est inclus dans votre abonnement
                fixe — votre volume n&apos;y change rien.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px", fontSize: "14px", color: "#d4d4d4" }}>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span className="lv3-chk" style={{ background: "#fff", color: "var(--ink)" }}><CheckIcon /></span>
                  Zones, livreurs et suivi inclus
                </li>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span className="lv3-chk" style={{ background: "#fff", color: "var(--ink)" }}><CheckIcon /></span>
                  Pas de frais par livraison, pas de commission
                </li>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span className="lv3-chk" style={{ background: "#fff", color: "var(--ink)" }}><CheckIcon /></span>
                  Annulable à tout moment
                </li>
              </ul>
            </div>
            <div className="pricing-side">
              <div className="v">+19€<span className="u">/mois HT</span></div>
              <div className="avail">Disponible sur Pro et Business</div>
              <Link
                href="/admin/onboarding?plan=pro&addons=delivery"
                className="lv3-btn lv3-btn-primary lv3-btn-lg"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Activer le module
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lv3-block" style={{ paddingTop: 0 }}>
        <div className="lv3-wrap">
          <div className="lv3-fp-sec" style={{ marginBottom: 32 }}>
            <h2>Questions fréquentes</h2>
            <p>Tout ce qu&apos;il faut savoir sur le module Livraison.</p>
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
          <h2>Vos livraisons,<br />sans intermédiaire.</h2>
          <p>14 jours d&apos;essai. Sans carte bancaire. Annulable à tout moment.</p>
          <div className="ctas">
            <Link href="/admin/onboarding?plan=pro&addons=delivery" className="lv3-btn lv3-btn-primary lv3-btn-lg">
              Activer le module
            </Link>
            <Link href="/demo" className="lv3-btn lv3-btn-secondary lv3-btn-lg">
              Demander une démo
            </Link>
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
              <h6>Modules</h6>
              <Link href="/modules/livraison">Livraison</Link>
              <Link href="/modules/stock">Stock</Link>
              <Link href="/#pricing">Tarifs</Link>
              <Link href="/demo">Demander une démo</Link>
            </div>
            <div className="lv3-foot-col">
              <h6>Ressources</h6>
              <Link href="/#faq">Centre d&apos;aide</Link>
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
