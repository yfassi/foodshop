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
    q: "Quels tickets puis-je scanner ?",
    a: "Tous les tickets imprimés de vos fournisseurs : Metro, Promocash, marchés, grossistes locaux, livraisons. Notre IA reconnaît automatiquement les produits, quantités, unités et prix — quel que soit le format du ticket.",
  },
  {
    q: "Est-ce que l'OCR est précis ?",
    a: "Oui, nous utilisons un modèle d'IA spécialisé qui comprend les tickets de fournisseurs. Vous pouvez relire et corriger les lignes avant de valider. Les corrections que vous faites améliorent l'auto-assignation au stock pour les fois suivantes.",
  },
  {
    q: "Comment l'IA assigne les produits à mon stock ?",
    a: "Lors du premier scan, vous mappez chaque ligne à un item de stock (ex: \"TOMATES GR. \" → Tomates en kg). L'IA mémorise et propose automatiquement le bon item pour les achats suivants — vous validez en un clic.",
  },
  {
    q: "Comment je suis mes stocks au quotidien ?",
    a: "Le module gère 3 types de mouvements : entrées (achats fournisseurs), sorties (consommation cuisine), ajustements (inventaire). Chaque mouvement met à jour la quantité en temps réel et l'historique.",
  },
  {
    q: "Y a-t-il des alertes de seuil bas ?",
    a: "Oui. Vous fixez un seuil minimum par item (ex: 5 kg de tomates). Quand vous passez sous le seuil, l'item s'affiche en rouge dans votre tableau de bord — vous savez qu'il faut racheter.",
  },
  {
    q: "Combien coûte le module ?",
    a: "29€/mois HT en complément de n'importe quel plan (Essentiel, Pro ou Business). Mouvements illimités, OCR illimité. Annulable à tout moment.",
  },
];

export default function StockModulePage() {
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
              Module complémentaire · Stock
            </div>
            <h1>
              Vos tickets fournisseurs,<br />lus par <span className="accent">l&apos;IA.</span>
            </h1>
            <p>
              Photographiez votre ticket Metro, Promocash ou marché — l&apos;IA
              extrait les produits, quantités et prix, met à jour votre stock
              automatiquement. Plus de saisie manuelle.
            </p>
            <div className="ctas">
              <Link
                href="/admin/onboarding?addons=stock"
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
              +29€/mois HT · disponible sur tous les plans
            </div>
          </div>

          {/* Hero illustration: receipt + extraction */}
          <div className="lv3-fp-illus">
            <div className="lv3-fp-receipt-stage">
              {/* Receipt */}
              <div className="lv3-fp-receipt">
                <div className="h">METRO PARIS NORD<br />09/04/2026 14:32</div>
                <div className="row"><span>TOMATES GR.</span><span>×8</span></div>
                <div className="row"><span>2,4 KG</span><span>9,60</span></div>
                <div className="row"><span>HUILE OLIVE</span><span>×2</span></div>
                <div className="row"><span>1,5 L</span><span>14,90</span></div>
                <div className="row"><span>FARINE T55</span><span>×3</span></div>
                <div className="row"><span>15 KG</span><span>22,50</span></div>
                <div className="row"><span>MOZZA BUFF.</span><span>×4</span></div>
                <div className="row"><span>500 G</span><span>18,80</span></div>
                <div className="row total"><span>TOTAL TTC</span><span>65,80</span></div>
                <div className="barcode" />
              </div>

              {/* Scan beam over receipt */}
              <div className="lv3-fp-scan-beam" />

              {/* Extracted result */}
              <div className="lv3-fp-extract">
                <div className="ex-h">
                  <span className="badge">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 4L6 11l-3-3" />
                    </svg>
                  </span>
                  Extrait par IA · 4 items
                </div>
                <div className="ex-row">
                  <span className="nm">Tomates</span>
                  <span className="qty">2,4 kg</span>
                  <span className="pr">9,60€</span>
                </div>
                <div className="ex-row">
                  <span className="nm">Huile d&apos;olive</span>
                  <span className="qty">1,5 L</span>
                  <span className="pr">14,90€</span>
                </div>
                <div className="ex-row">
                  <span className="nm">Farine T55</span>
                  <span className="qty">15 kg</span>
                  <span className="pr">22,50€</span>
                </div>
                <div className="ex-row">
                  <span className="nm">Mozzarella</span>
                  <span className="qty">500 g</span>
                  <span className="pr">18,80€</span>
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
            <h2>Fini le carnet à spirale.</h2>
            <p>
              Un module qui transforme la gestion de stock — la corvée que personne
              ne fait — en un geste de 30 secondes.
            </p>
          </div>

          <div className="lv3-fp-benefits">
            <div className="lv3-fp-benefit">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 8h18M8 21V8" />
                </svg>
              </div>
              <h3>Scan caméra</h3>
              <p>
                Une photo, et l&apos;IA lit votre ticket fournisseur. Tomates,
                farine, huile — chaque ligne est reconnue, quantifiée, prêtée à
                être validée.
              </p>
            </div>
            <div className="lv3-fp-benefit">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 12l2 2 4-5" />
                </svg>
              </div>
              <h3>Auto-assignation</h3>
              <p>
                L&apos;IA mémorise vos produits récurrents. Au 2ème scan, le
                mapping vers votre stock est automatique. Validez en un clic, ou
                corrigez si besoin.
              </p>
            </div>
            <div className="lv3-fp-benefit">
              <div className="ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3>Alertes seuil bas</h3>
              <p>
                Fixez un seuil minimum par item. Quand vous passez sous le seuil,
                un badge rouge s&apos;affiche — racheter ce qu&apos;il faut, sans
                panique en plein service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lv3-block" style={{ background: "var(--bg-2)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <div className="lv3-wrap">
          <div className="lv3-fp-sec">
            <h2>De la photo au stock,<br />en 30 secondes.</h2>
            <p>3 étapes pour un suivi automatique.</p>
          </div>

          <div className="lv3-fp-steps">
            <div className="lv3-fp-step">
              <div className="lv3-fp-step-h">
                <div className="lv3-fp-step-num">01</div>
                <div>
                  <div className="lv3-fp-step-t">Vous scannez</div>
                  <div className="lv3-fp-step-d">
                    Ticket fournisseur, posé sur la table, scanné par votre
                    téléphone.
                  </div>
                </div>
              </div>
              <div className="lv3-fp-step-mock">
                <div className="lv3-fp-scan-ui">
                  <div className="frame">
                    <div className="corn tl" /><div className="corn tr" />
                    <div className="corn bl" /><div className="corn br" />
                    <div className="preview">
                      <div className="h">METRO PARIS NORD</div>
                      <div className="row"><span>TOMATES</span><span>9,60</span></div>
                      <div className="row"><span>HUILE</span><span>14,90</span></div>
                      <div className="row"><span>FARINE</span><span>22,50</span></div>
                      <div className="row"><span>MOZZA</span><span>18,80</span></div>
                    </div>
                    <div className="scanline" />
                  </div>
                  <div className="cta">Capturer →</div>
                </div>
              </div>
            </div>

            <div className="lv3-fp-step">
              <div className="lv3-fp-step-h">
                <div className="lv3-fp-step-num">02</div>
                <div>
                  <div className="lv3-fp-step-t">L&apos;IA extrait</div>
                  <div className="lv3-fp-step-d">
                    Produits, quantités, prix — séparés et structurés. Vous
                    relisez, vous validez.
                  </div>
                </div>
              </div>
              <div className="lv3-fp-step-mock">
                <div className="lv3-fp-extract" style={{ width: "82%", maxWidth: 280 }}>
                  <div className="ex-h">
                    <span className="badge">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M13 4L6 11l-3-3" />
                      </svg>
                    </span>
                    4 items extraits
                  </div>
                  <div className="ex-row">
                    <span className="nm">Tomates</span>
                    <span className="qty">2,4 kg</span>
                    <span className="pr">9,60€</span>
                  </div>
                  <div className="ex-row">
                    <span className="nm">Huile d&apos;olive</span>
                    <span className="qty">1,5 L</span>
                    <span className="pr">14,90€</span>
                  </div>
                  <div className="ex-row">
                    <span className="nm">Farine T55</span>
                    <span className="qty">15 kg</span>
                    <span className="pr">22,50€</span>
                  </div>
                  <div className="ex-row">
                    <span className="nm">Mozzarella</span>
                    <span className="qty">500 g</span>
                    <span className="pr">18,80€</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lv3-fp-step">
              <div className="lv3-fp-step-h">
                <div className="lv3-fp-step-num">03</div>
                <div>
                  <div className="lv3-fp-step-t">Stock à jour</div>
                  <div className="lv3-fp-step-d">
                    Quantités incrémentées, alertes bas niveau actualisées,
                    historique conservé.
                  </div>
                </div>
              </div>
              <div className="lv3-fp-step-mock">
                <div className="lv3-fp-stock-list" style={{ width: "84%" }}>
                  <div className="row">
                    <div>
                      <div className="nm">Tomates</div>
                      <div className="un">kg</div>
                    </div>
                    <div className="qty">12,4</div>
                    <span className="lvl">OK</span>
                  </div>
                  <div className="row warn">
                    <div>
                      <div className="nm">Huile d&apos;olive</div>
                      <div className="un">L</div>
                    </div>
                    <div className="qty">2,8</div>
                    <span className="lvl">BAS</span>
                  </div>
                  <div className="row low">
                    <div>
                      <div className="nm">Mozzarella</div>
                      <div className="un">g</div>
                    </div>
                    <div className="qty">200</div>
                    <span className="lvl">RUPTURE</span>
                  </div>
                  <div className="row">
                    <div>
                      <div className="nm">Farine T55</div>
                      <div className="un">kg</div>
                    </div>
                    <div className="qty">28</div>
                    <span className="lvl">OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAIL: OCR */}
      <section className="lv3-wrap">
        <div className="lv3-fp-detail">
          <div>
            <div className="lv3-fp-detail-num">01 · OCR par IA</div>
            <h2>Une photo,<br />tout est extrait.</h2>
            <p>
              Notre IA spécialisée comprend les tickets de fournisseurs : Metro,
              Promocash, marchés locaux, grossistes. Elle reconnaît les produits,
              les quantités, les unités, et les prix.
            </p>
            <ul>
              <li><span className="dot"><CheckIcon /></span>Tickets imprimés (toute mise en page)</li>
              <li><span className="dot"><CheckIcon /></span>Photos depuis téléphone ou tablette</li>
              <li><span className="dot"><CheckIcon /></span>Reconnaissance unités (kg, g, L, pièces, cartons)</li>
              <li><span className="dot"><CheckIcon /></span>Vous corrigez les lignes avant validation</li>
            </ul>
          </div>
          <div className="lv3-fp-detail-mock">
            <div style={{ position: "relative", width: "70%", display: "grid", placeItems: "center" }}>
              <div className="lv3-fp-receipt" style={{ transform: "rotate(-3deg)", maxWidth: 240 }}>
                <div className="h">METRO PARIS NORD<br />09/04/2026 14:32</div>
                <div className="row"><span>TOMATES GR.</span><span>×8</span></div>
                <div className="row"><span>2,4 KG</span><span>9,60</span></div>
                <div className="row"><span>HUILE OLIVE</span><span>×2</span></div>
                <div className="row"><span>1,5 L</span><span>14,90</span></div>
                <div className="row"><span>FARINE T55</span><span>×3</span></div>
                <div className="row"><span>15 KG</span><span>22,50</span></div>
                <div className="row total"><span>TOTAL</span><span>65,80</span></div>
                <div className="barcode" />
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL: Stock list */}
        <div className="lv3-fp-detail reverse">
          <div>
            <div className="lv3-fp-detail-num">02 · Tableau de stock</div>
            <h2>Quantités en temps réel,<br />par item.</h2>
            <p>
              Chaque achat ajoute, chaque consommation retire. Vous voyez en un
              coup d&apos;œil ce qui est en rupture, ce qui est bas, ce qui est
              bien fourni.
            </p>
            <ul>
              <li><span className="dot"><CheckIcon /></span>Mouvements illimités (entrées, sorties, ajustements)</li>
              <li><span className="dot"><CheckIcon /></span>Seuil bas paramétrable par item</li>
              <li><span className="dot"><CheckIcon /></span>Historique et journal d&apos;inventaire</li>
              <li><span className="dot"><CheckIcon /></span>Recherche et filtres par état</li>
            </ul>
          </div>
          <div className="lv3-fp-detail-mock">
            <div className="lv3-fp-stock-list" style={{ width: "82%" }}>
              <div className="row">
                <div>
                  <div className="nm">Tomates grappe</div>
                  <div className="un">kg · seuil: 5 kg</div>
                </div>
                <div className="qty">12,4</div>
                <span className="lvl">OK</span>
              </div>
              <div className="row warn">
                <div>
                  <div className="nm">Huile d&apos;olive</div>
                  <div className="un">L · seuil: 3 L</div>
                </div>
                <div className="qty">2,8</div>
                <span className="lvl">BAS</span>
              </div>
              <div className="row low">
                <div>
                  <div className="nm">Mozzarella di Bufala</div>
                  <div className="un">g · seuil: 500 g</div>
                </div>
                <div className="qty">200</div>
                <span className="lvl">RUPTURE</span>
              </div>
              <div className="row">
                <div>
                  <div className="nm">Farine T55</div>
                  <div className="un">kg · seuil: 10 kg</div>
                </div>
                <div className="qty">28</div>
                <span className="lvl">OK</span>
              </div>
              <div className="row">
                <div>
                  <div className="nm">Basilic frais</div>
                  <div className="un">pcs · seuil: 4</div>
                </div>
                <div className="qty">12</div>
                <span className="lvl">OK</span>
              </div>
            </div>
          </div>
        </div>

        {/* DETAIL: Smart matching */}
        <div className="lv3-fp-detail">
          <div>
            <div className="lv3-fp-detail-num">03 · Intelligence</div>
            <h2>L&apos;IA apprend<br />vos habitudes.</h2>
            <p>
              Au premier scan, vous mappez chaque ligne du ticket à un item de
              votre stock. Au deuxième, l&apos;IA propose le bon item. Au cinquième,
              vous validez tout en un clic.
            </p>
            <ul>
              <li><span className="dot"><CheckIcon /></span>Mémorisation des correspondances ticket → stock</li>
              <li><span className="dot"><CheckIcon /></span>Suggestions automatiques pour les achats récurrents</li>
              <li><span className="dot"><CheckIcon /></span>Création d&apos;item à la volée si besoin</li>
              <li><span className="dot"><CheckIcon /></span>Aucune saisie manuelle</li>
            </ul>
          </div>
          <div className="lv3-fp-detail-mock">
            <div style={{
              width: "82%",
              background: "#fff",
              border: "1px solid var(--rule)",
              borderRadius: "16px",
              boxShadow: "0 18px 40px -16px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rule)", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "var(--bg-3)", display: "grid", placeItems: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>Mapping IA</div>
                  <div style={{ fontSize: "10px", color: "var(--muted)" }}>Vérifiez et validez</div>
                </div>
              </div>
              {[
                { l: "TOMATES GR.", t: "Tomates grappe", c: 96 },
                { l: "HUILE OLIVE", t: "Huile d&apos;olive", c: 99 },
                { l: "FARINE T55", t: "Farine T55", c: 100 },
                { l: "MOZZA BUFF.", t: "Mozzarella di Bufala", c: 92 },
              ].map((m) => (
                <div key={m.l} style={{ padding: "10px 16px", borderBottom: "1px solid var(--rule)", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: "var(--font-space-mono), monospace", fontSize: "11px", color: "var(--muted)" }}>{m.l}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--muted)" }}>
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                    <span style={{ fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: m.t }} />
                    <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--green)", fontWeight: 700 }}>{m.c}%</span>
                  </div>
                </div>
              ))}
              <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>4 items prêts</span>
                <span style={{
                  background: "var(--ink)", color: "#fff", padding: "6px 12px",
                  borderRadius: "8px", fontSize: "11px", fontWeight: 600,
                }}>Confirmer →</span>
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
              <div className="l-tag">Module Stock</div>
              <h2>Un prix fixe.<br />Scans et items illimités.</h2>
              <p>
                Pas de coût par scan, pas de coût par item. Quel que soit votre
                volume — 1 ou 100 tickets par mois — le prix reste le même.
                L&apos;IA est incluse.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px", fontSize: "14px", color: "#d4d4d4" }}>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span className="lv3-chk" style={{ background: "#fff", color: "var(--ink)" }}><CheckIcon /></span>
                  Scans OCR illimités
                </li>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span className="lv3-chk" style={{ background: "#fff", color: "var(--ink)" }}><CheckIcon /></span>
                  Mouvements et items de stock illimités
                </li>
                <li style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span className="lv3-chk" style={{ background: "#fff", color: "var(--ink)" }}><CheckIcon /></span>
                  Annulable à tout moment
                </li>
              </ul>
            </div>
            <div className="pricing-side">
              <div className="v">+29€<span className="u">/mois HT</span></div>
              <div className="avail">Disponible sur tous les plans</div>
              <Link
                href="/admin/onboarding?addons=stock"
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
            <p>Tout ce qu&apos;il faut savoir sur le module Stock.</p>
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
          <h2>Vos stocks à jour,<br />sans saisie.</h2>
          <p>14 jours d&apos;essai. Sans carte bancaire. Annulable à tout moment.</p>
          <div className="ctas">
            <Link href="/admin/onboarding?addons=stock" className="lv3-btn lv3-btn-primary lv3-btn-lg">
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
