import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing-v4/nav";
import { LandingFooter } from "@/components/landing-v4/footer";
import "../landing-v4.css";

export const metadata: Metadata = {
  title: "Taapr — Module Livraison · Sans commission",
  description:
    "Ajoutez la livraison à domicile à votre offre. Vos zones, vos livreurs, votre marque. Zéro commission, suivi temps réel, à votre rythme.",
};

const BULLETS = [
  {
    n: "01 · ZONES",
    title: "Tracez vos zones <em>au pinceau</em>.",
    body: "Définissez plusieurs zones de livraison avec frais et délais propres. Code postal, rayon ou polygone libre — au choix.",
  },
  {
    n: "02 · LIVREURS",
    title: "Vos livreurs, votre app.",
    body: "App dédiée pour vos coursiers : tournée optimisée, GPS, encaissement, photo de remise. Pas de freelance imposé.",
  },
  {
    n: "03 · SUIVI",
    title: "Temps réel pour le client.",
    body: "Lien de suivi par SMS, position du livreur sur carte, ETA précis. Vos clients savent où en est leur commande, sans appeler.",
  },
];

export default function LivraisonPage() {
  return (
    <div className="lv4">
      <LandingNav active="livraison" />

      <section className="mod-hero">
        <div className="mod-hero-grid">
          <div>
            <Link href="/" className="mod-back-link">← MODULES TAAPR</Link>
            <div className="kicker">★ MODULE · LIVRAISON</div>
            <h1>
              La livraison,<br />
              <em>sans</em> commission.<span className="dot small" />
            </h1>
            <div className="mod-hero-script">à votre rythme ✦</div>
            <p className="mod-hero-sub">
              Ajoutez la livraison à domicile à votre offre. Vos zones, vos livreurs, votre marque.
              Suivi temps réel pour vos clients, zéro intermédiaire qui prélève 30%.
            </p>
            <div className="mod-hero-ctas">
              <Link href="/admin/onboarding" className="btn-primary big">
                Activer le module <span className="arrow">→</span>
              </Link>
              <Link href="/admin/chez-momo?demo=true" className="btn-ghost big">Voir une démo</Link>
            </div>
          </div>

          <aside className="mod-hero-vis">
            <div className="liv-map">
              <div className="liv-map-grid" />
              <div className="liv-zone liv-zone-2" />
              <div className="liv-zone liv-zone-1" />
              <div className="liv-pin liv-pin-shop">M</div>
              <div className="liv-pin liv-pin-rider">🛵</div>
              <div className="liv-pin liv-pin-client-1">●</div>
              <div className="liv-pin liv-pin-client-2">●</div>
            </div>
            <div className="liv-legend">
              <span><span className="liv-legend-sw zone-1" />ZONE 1 · 2 KM · GRATUITE</span>
              <span><span className="liv-legend-sw zone-2" />ZONE 2 · 4 KM · 2,90€</span>
            </div>

            <div className="liv-orders-track">
              <div className="liv-track">
                <div className="liv-track-step">
                  <span className="liv-step-dot done">✓</span>
                  <span className="liv-track-step-label">PRÉPARÉ</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="liv-track-tit">#0140 · 12 rue des Victoires</div>
                  <div className="liv-track-sub">MARC · 🛵 · ETA 8 MIN</div>
                </div>
                <span className="liv-step-dot active" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mod-bullets">
        {BULLETS.map((b) => (
          <div key={b.n} className="mod-bullet">
            <div className="mod-bullet-n">{b.n}</div>
            <h3 dangerouslySetInnerHTML={{ __html: b.title }} />
            <p>{b.body}</p>
          </div>
        ))}
      </section>

      <section className="big-stat" style={{ marginTop: 0 }}>
        <div className="big-stat-inner">
          <div className="bs-block">
            <div className="bs-num"><span className="accent-mustard">0%</span></div>
            <div className="bs-label">de commission par commande,<br />contre 30% sur les plateformes</div>
          </div>
          <div className="bs-divider" />
          <div className="bs-block">
            <div className="bs-num">+27%</div>
            <div className="bs-label">de marge moyenne récupérée<br />vs livraison via une marketplace</div>
          </div>
          <div className="bs-divider" />
          <div className="bs-block">
            <div className="bs-num">19<small>€</small></div>
            <div className="bs-label">/mois en option<br />sur n&apos;importe quel plan</div>
          </div>
        </div>
        <div className="bs-script">faites le calcul ✦</div>
      </section>

      <section className="final-cta">
        <div className="fc-inner">
          <h2 className="fc-title">
            On vous offre<br />
            <em>les 30 premières livraisons.</em><span className="dot small" />
          </h2>
          <p className="fc-script">à vous de jouer ✦</p>
          <div className="fc-ctas">
            <Link href="/admin/onboarding" className="btn-primary big light">
              Activer le module <span className="arrow">→</span>
            </Link>
            <a href="mailto:contact@taapr.com" className="btn-ghost big light">Parler à un humain</a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
