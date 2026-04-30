import Link from "next/link";
import type { Metadata } from "next";
import { LandingNav } from "@/components/landing-v4/nav";
import { LandingFooter } from "@/components/landing-v4/footer";
import "../landing-v4.css";

export const metadata: Metadata = {
  title: "Taapr — Module Stock · Stop aux ruptures",
  description:
    "Numérisez vos tickets de livraison à la photo. Suivi des quantités en temps réel, alertes seuil bas, pertes traçables. Sans tableur, sans inventaire du dimanche.",
};

const BULLETS = [
  {
    n: "01 · SCAN",
    title: "Photo, et c'est <em>réglé.</em>",
    body: "Photographiez le ticket du fournisseur, l'OCR reconnaît articles et quantités. Validation en 1 clic. Adieu les saisies manuelles.",
  },
  {
    n: "02 · DÉCRÉMENT AUTO",
    title: "La cuisine décompte <em>seule.</em>",
    body: "Chaque commande passée déduit automatiquement les ingrédients du stock. Recettes paramétrables, dosages précis.",
  },
  {
    n: "03 · ALERTES",
    title: "Notif <em>avant</em> la rupture.",
    body: "Seuils bas définis par article. SMS ou push à 11h pour pouvoir recommander avant le coup de feu du soir.",
  },
];

const STOCK_ROWS = [
  { name: "Tomates anciennes", cat: "LÉGUMES · KG", qty: "2,4 kg", pct: 78, fillClass: "", status: "ok", statusLabel: "OK", action: "Voir →" },
  { name: "Burrata 125g", cat: "FROMAGES · UNITÉ", qty: "4 u.", pct: 18, fillClass: "warn", status: "warn", statusLabel: "★ SEUIL BAS", action: "Recommander →" },
  { name: "Magret de canard", cat: "VIANDES · PIÈCE", qty: "3 p.", pct: 30, fillClass: "warn", status: "warn", statusLabel: "★ SEUIL BAS", action: "Recommander →" },
  { name: "Carnaroli", cat: "FÉCULENTS · KG", qty: "8,2 kg", pct: 82, fillClass: "", status: "ok", statusLabel: "OK", action: "Voir →" },
  { name: "Safran de Provence", cat: "ÉPICES · GRAMME", qty: "0,4 g", pct: 8, fillClass: "crit", status: "crit", statusLabel: "RUPTURE !", action: "Recommander →" },
  { name: "Pain brioché", cat: "BOULANGERIE · UNITÉ", qty: "28 u.", pct: 65, fillClass: "", status: "ok", statusLabel: "OK", action: "Voir →" },
];

export default function StockPage() {
  return (
    <div className="lv4">
      <LandingNav active="stock" />

      <section className="mod-hero">
        <div className="mod-hero-grid">
          <div>
            <Link href="/" className="mod-back-link">← MODULES TAAPR</Link>
            <div className="kicker">★ MODULE · STOCK</div>
            <h1>
              Stop aux ruptures<br />
              du <em>samedi soir.</em><span className="dot small" />
            </h1>
            <div className="mod-hero-script">tout sous contrôle ✦</div>
            <p className="mod-hero-sub">
              Numérisez vos tickets de livraison à la photo. Suivi des quantités en temps réel,
              alertes seuil bas, pertes traçables. Sans tableur, sans inventaire du dimanche.
            </p>
            <div className="mod-hero-ctas">
              <Link href="/admin/onboarding" className="btn-primary big">
                Activer le module <span className="arrow">→</span>
              </Link>
              <Link href="/admin/chez-momo?demo=true" className="btn-ghost big">Voir une démo</Link>
            </div>
          </div>

          <aside
            className="mod-hero-vis"
            style={{ background: "var(--cream-deep)", position: "relative" }}
          >
            <div className="stock-scan-btn">📷 scan</div>
            <div className="stock-receipt">
              <div className="stock-receipt-h">★ MAISON BERTRAND</div>
              <div className="stock-receipt-meta">LIVRAISON 12/05 · 14:22</div>
              <div className="stock-receipt-line"><span>Burrata 125g</span><span>×12</span></div>
              <div className="stock-receipt-line"><span>Tomates anciennes</span><span>3 kg</span></div>
              <div className="stock-receipt-line"><span>Magret canard</span><span>×8</span></div>
              <div className="stock-receipt-line"><span>Safran 1g</span><span>×2</span></div>
              <div className="stock-receipt-line"><span>Carnaroli 5kg</span><span>×1</span></div>
              <div className="stock-receipt-foot"><span>TOTAL</span><span>284,40€</span></div>
              <div className="stock-receipt-stamp">★ AUTO-IMPORTÉ DANS STOCK</div>
            </div>
            <div className="stock-pulse">
              <span className="stock-pulse-dot" />
              <span className="stock-pulse-text">5 ARTICLES AJOUTÉS · IL Y A 2 SEC</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="stock-section">
        <div className="kicker">★ INVENTAIRE · LIVE</div>
        <h2 className="stock-section-title">
          Vos quantités, en <em>temps réel.</em><span className="dot small" />
        </h2>

        <div className="stock-table">
          <div className="stock-h">
            <span>ARTICLE</span>
            <span>QUANTITÉ</span>
            <span>NIVEAU</span>
            <span>STATUT</span>
            <span>ACTION</span>
          </div>
          {STOCK_ROWS.map((r) => (
            <div className="stock-r" key={r.name}>
              <div className="stock-r-name">{r.name} <small>{r.cat}</small></div>
              <div className="stock-r-qty">{r.qty}</div>
              <div className="stock-r-bar">
                <span className="bar"><span className={`fill ${r.fillClass}`} style={{ width: `${r.pct}%` }} /></span>
                <span className="pct">{r.pct}%</span>
              </div>
              <div><span className={`stock-r-status ${r.status}`}>{r.statusLabel}</span></div>
              <div className="stock-r-action">{r.action}</div>
            </div>
          ))}
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
            <div className="bs-num">−<span className="accent-mustard">73%</span></div>
            <div className="bs-label">de ruptures<br />en service</div>
          </div>
          <div className="bs-divider" />
          <div className="bs-block">
            <div className="bs-num">2<small>h</small></div>
            <div className="bs-label">économisées par semaine<br />sur l&apos;inventaire</div>
          </div>
          <div className="bs-divider" />
          <div className="bs-block">
            <div className="bs-num">12<small>€</small></div>
            <div className="bs-label">/mois en option<br />sur n&apos;importe quel plan</div>
          </div>
        </div>
        <div className="bs-script">le stock, sereinement ✦</div>
      </section>

      <section className="final-cta">
        <div className="fc-inner">
          <h2 className="fc-title">
            14 jours pour<br />
            <em>poser l&apos;inventaire.</em><span className="dot small" />
          </h2>
          <p className="fc-script">on s&apos;y met ✦</p>
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
