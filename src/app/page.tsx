"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  QrCode,
  ShoppingBag,
  LayoutDashboard,
  ChefHat,
  Heart,
  Bike,
  Package,
  type LucideIcon,
} from "lucide-react";
import { LandingNav } from "@/components/landing-v4/nav";
import { LandingFooter } from "@/components/landing-v4/footer";
import "./landing-v4.css";

type Module = {
  id: string;
  name: string;
  hint: string;
  short: string;
  paid: boolean;
  Icon: LucideIcon;
  iconClass: "ink" | "paprika" | "navy" | "mustard";
  kicker: string;
  title: string;
  desc: string;
  bullets: string[];
  price: string;
  cta?: { label: string; href: string };
  visualKey: "qr" | "cnc" | "dashboard" | "kitchen" | "loyalty" | "livraison" | "stock";
};

const MODULES: Module[] = [
  {
    id: "qr",
    name: "QR à table",
    hint: "Le client scanne, commande, paie",
    short: "INCLUS",
    paid: false,
    Icon: QrCode,
    iconClass: "ink",
    kicker: "★ CÔTÉ CLIENT",
    title: "QR à table",
    desc: "Le client flashe le QR sur sa table, commande depuis son téléphone et paie directement. Aucune app à télécharger, le menu s'ouvre dans le navigateur.",
    bullets: [
      "Apple Pay, Google Pay, CB",
      "Tickets-restos compris",
      "Additions séparées entre convives",
      "Pourboires paramétrables",
    ],
    price: "Inclus dans tous les plans",
    cta: { label: "Voir les tarifs", href: "#pricing" },
    visualKey: "qr",
  },
  {
    id: "cnc",
    name: "Click & collect",
    hint: "Commande à l'avance, retrait sur place",
    short: "INCLUS",
    paid: false,
    Icon: ShoppingBag,
    iconClass: "paprika",
    kicker: "★ CÔTÉ CLIENT",
    title: "Click & collect",
    desc: "Vos clients commandent à l'avance et passent récupérer. Une URL, pas d'app, paiement Stripe inclus. Idéal pour les services à fort débit.",
    bullets: [
      "Créneaux de retrait paramétrables",
      "Notification SMS quand prêt",
      "Stripe inclus, 0% commission",
      "Multi-canaux (sur place / à emporter)",
    ],
    price: "Inclus dans tous les plans",
    cta: { label: "Voir les tarifs", href: "#pricing" },
    visualKey: "cnc",
  },
  {
    id: "dashboard",
    name: "Dashboard interne",
    hint: "Le poste de pilotage du resto",
    short: "INCLUS",
    paid: false,
    Icon: LayoutDashboard,
    iconClass: "navy",
    kicker: "★ CÔTÉ RESTO",
    title: "Dashboard interne",
    desc: "Le poste de pilotage : commandes en cours, plan de salle, statistiques. Un seul écran pour suivre votre service en temps réel.",
    bullets: [
      "CA temps réel, ticket moyen, top ventes",
      "Plan de salle interactif",
      "Export CSV pour la compta",
      "Multi-établissements (Business)",
    ],
    price: "Inclus dans tous les plans",
    cta: { label: "Voir les tarifs", href: "#pricing" },
    visualKey: "dashboard",
  },
  {
    id: "kitchen",
    name: "Cuisine connectée",
    hint: "Imprimante, écran cuisine, push",
    short: "INCLUS",
    paid: false,
    Icon: ChefHat,
    iconClass: "ink",
    kicker: "★ CÔTÉ CUISINE",
    title: "Cuisine connectée",
    desc: "L'imprimante ESC/POS, l'écran cuisine, le push smartphone — la commande arrive là où vous voulez. Toutes les marques sont supportées.",
    bullets: [
      "Epson, Star, Bixolon, Citizen",
      "USB ou Ethernet",
      "Écran cuisine ou app smartphone",
      "Tickets formatés à votre charte",
    ],
    price: "Inclus dès Starter",
    cta: { label: "Voir les tarifs", href: "#pricing" },
    visualKey: "kitchen",
  },
  {
    id: "fidelite",
    name: "Fidélité + SMS",
    hint: "Tampons digitaux, relances",
    short: "PRO",
    paid: false,
    Icon: Heart,
    iconClass: "mustard",
    kicker: "★ CÔTÉ MARQUE",
    title: "Fidélité + SMS",
    desc: "Programme de tampons digital cumulés sans carte à présenter. Relances automatiques par SMS sur les segments que vous choisissez.",
    bullets: [
      "Tampons cumulés sans carte physique",
      "Relances SMS automatiques",
      "Récompenses paramétrables",
      "Segments (anniversaire, dormants…)",
    ],
    price: "Inclus dès Pro",
    cta: { label: "Voir les tarifs", href: "#pricing" },
    visualKey: "loyalty",
  },
  {
    id: "livraison",
    name: "Module Livraison",
    hint: "Zones, livreurs, suivi temps réel",
    short: "+19€/mois",
    paid: true,
    Icon: Bike,
    iconClass: "navy",
    kicker: "★ MODULE · À LA CARTE",
    title: "Module Livraison",
    desc: "Ajoutez la livraison à domicile à votre offre. Vos zones, vos livreurs, votre marque. Sans plateforme tierce, sans commission.",
    bullets: [
      "Zones par rayon ou polygone",
      "App livreur dédiée",
      "Suivi SMS pour le client",
      "0% de commission",
    ],
    price: "+19€",
    cta: { label: "Voir le module", href: "/livraison" },
    visualKey: "livraison",
  },
  {
    id: "stock",
    name: "Module Stock",
    hint: "OCR tickets, alertes seuil bas",
    short: "+12€/mois",
    paid: true,
    Icon: Package,
    iconClass: "mustard",
    kicker: "★ MODULE · À LA CARTE",
    title: "Module Stock",
    desc: "Numérisez les tickets fournisseur à la photo. Décrément automatique par recette, alertes seuil bas par SMS ou push.",
    bullets: [
      "OCR sur tickets fournisseur",
      "Décrément auto par recette",
      "Alertes seuil bas SMS / push",
      "Export inventaire CSV",
    ],
    price: "+12€",
    cta: { label: "Voir le module", href: "/stock" },
    visualKey: "stock",
  },
];

type PlanId = "plat" | "menu" | "carte";

type Plan = {
  id: PlanId;
  name: string;
  sub: string;
  price: number;
  per: string;
  cta: string;
  primary: boolean;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "plat",
    name: "Starter",
    sub: "Pour les restos qui démarrent",
    price: 29,
    per: "/ mois, par resto",
    cta: "Démarrer",
    primary: false,
  },
  {
    id: "menu",
    name: "Pro",
    sub: "L'expérience complète",
    price: 79,
    per: "/ mois, par resto",
    cta: "Essai 14 jours",
    primary: true,
    featured: true,
  },
  {
    id: "carte",
    name: "Business",
    sub: "Pour les groupes & multi-restos",
    price: 149,
    per: "/ mois, jusqu'à 5 restos",
    cta: "Nous contacter",
    primary: false,
  },
];

type FeatureValue = boolean | string;
type FeatureRow = {
  label: string;
  desc?: string;
  values: Record<PlanId, FeatureValue>;
};
type FeatureCategory = { name: string; rows: FeatureRow[] };

const COMPARE: FeatureCategory[] = [
  {
    name: "★ COMMANDE CLIENT",
    rows: [
      { label: "QR à table", values: { plat: true, menu: true, carte: true } },
      { label: "Click & collect", values: { plat: true, menu: true, carte: true } },
      { label: "Carte digitale", desc: "produits, options, allergènes", values: { plat: "illimitée", menu: "illimitée", carte: "illimitée" } },
    ],
  },
  {
    name: "★ PAIEMENT",
    rows: [
      { label: "Stripe inclus", desc: "0% de commission Taapr", values: { plat: true, menu: true, carte: true } },
      { label: "Apple Pay · Google Pay", values: { plat: true, menu: true, carte: true } },
      { label: "Tickets-restos", values: { plat: true, menu: true, carte: true } },
      { label: "Pourboires", values: { plat: true, menu: true, carte: true } },
    ],
  },
  {
    name: "★ CUISINE",
    rows: [
      { label: "Imprimante ESC/POS", desc: "Epson · Star · Bixolon · Citizen", values: { plat: true, menu: true, carte: true } },
      { label: "Écran cuisine dédié", values: { plat: false, menu: true, carte: true } },
      { label: "Push smartphone", values: { plat: true, menu: true, carte: true } },
    ],
  },
  {
    name: "★ PILOTAGE",
    rows: [
      { label: "Dashboard temps réel", values: { plat: true, menu: true, carte: true } },
      { label: "Top ventes & stats", values: { plat: true, menu: true, carte: true } },
      { label: "Plan de salle interactif", values: { plat: false, menu: true, carte: true } },
      { label: "Export CSV", desc: "pour la compta", values: { plat: false, menu: true, carte: true } },
    ],
  },
  {
    name: "★ MARQUE & MULTI",
    rows: [
      { label: "Fidélité + SMS", values: { plat: false, menu: true, carte: true } },
      { label: "Multi-établissements", desc: "restos inclus dans le plan", values: { plat: "1 resto", menu: "1 resto", carte: "jusqu'à 5" } },
      { label: "Restaurant supplémentaire", desc: "en option à la carte", values: { plat: false, menu: "+39 €/mois", carte: "inclus jusqu'à 5" } },
      { label: "API & webhooks", values: { plat: false, menu: false, carte: true } },
      { label: "Account manager dédié", values: { plat: false, menu: false, carte: true } },
    ],
  },
  {
    name: "★ VOLUME & SUPPORT",
    rows: [
      { label: "Commandes par mois", values: { plat: "illimité", menu: "illimité", carte: "illimité" } },
      { label: "Support", values: { plat: "E-mail", menu: "7j/7", carte: "Prioritaire" } },
    ],
  },
];

type Testimonial = {
  initial: string;
  name: string;
  resto: string;
  quote: string;
  avatarClass: string;
  featured?: boolean;
  tag?: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    initial: "M",
    name: "Marcel D.",
    resto: "Chez Marcel · Lyon",
    quote: "« On a viré 3 abonnements pour passer sur Taapr. Mes serveurs sourient à nouveau. Ma compta aussi. »",
    avatarClass: "ava-paprika",
  },
  {
    initial: "L",
    name: "Léa M.",
    resto: "Le Petit Sud · Marseille",
    quote: "« Le QR à table, c'est <em>game-changer</em>. 30% de commandes en plus le midi, sans embaucher. »",
    avatarClass: "ava-mustard",
    featured: true,
    tag: "★ chouchou",
  },
  {
    initial: "K",
    name: "Karim B.",
    resto: "Bistrot 14 · Paris",
    quote: "« Setup en une après-midi. Zéro commission, ça change tout sur les marges. »",
    avatarClass: "ava-navy",
  },
];

const FAQ_ITEMS = [
  {
    q: "Combien de temps pour mettre en place ?",
    a: "Une après-midi. Sérieusement. La carte importe en CSV, le QR se génère en un clic, l'imprimante se configure en USB ou réseau.",
  },
  {
    q: "Quelles commissions sur les commandes ?",
    a: "Zéro. Vous payez l'abonnement Taapr, c'est tout. Stripe prélève ses ~1,5% bancaires habituels, qui vont à Stripe — pas à nous.",
  },
  {
    q: "Est-ce compatible avec mon imprimante de tickets ?",
    a: "Oui, on supporte toutes les imprimantes ESC/POS du marché : Epson TM-T20/T88, Star TSP, Bixolon, Citizen, etc. USB ou Ethernet.",
  },
  {
    q: "Peut-on essayer sans s'engager ?",
    a: "14 jours d'essai sur tous les plans, sans carte bancaire. Annulable en un clic à tout moment.",
  },
  {
    q: "Et si j'ouvre un deuxième restaurant ?",
    a: "Sur le plan Pro, vous pouvez ajouter un restaurant supplémentaire pour 39 €/mois. À partir de 3 établissements, le plan Business (149 €/mois jusqu'à 5 restos inclus) devient plus avantageux. Tout se gère depuis le même compte avec un switcher dans l'admin.",
  },
  {
    q: "Et si je veux récupérer mes données ?",
    a: "Vos données vous appartiennent. Export CSV/JSON disponible à tout moment. Pas de prison numérique chez nous.",
  },
];

const LOGOS = [
  { name: "The Feel By", italic: true },
  { name: "Bistrot Marcel", italic: false },
  { name: "Le Petit Sud", italic: true },
  { name: "CANTINE 14", italic: false },
  { name: "Trattoria Maria", italic: true },
  { name: "Burger Brut", italic: false },
  { name: "Café des Halles", italic: true },
  { name: "Pizzeria Gino", italic: false },
  { name: "La Cantoche", italic: true },
  { name: "Snack 7e", italic: false },
  { name: "Maison Truffard", italic: true },
];

type Sector = {
  emoji: string;
  name: string;
  desc: string;
  tag?: string;
  featured?: boolean;
};

const SECTORS: Sector[] = [
  {
    emoji: "🍷",
    name: "Bistrots & brasseries",
    desc: "QR à table, plan de salle, additions séparées.",
    tag: "★ LE PLUS POPULAIRE",
    featured: true,
  },
  { emoji: "🍕", name: "Pizzerias de quartier", desc: "Click & collect, fournée et livraison gérés au même endroit." },
  { emoji: "☕", name: "Cafés & salons de thé", desc: "Carte digitale qui change avec le service, fidélité incluse." },
  { emoji: "🚚", name: "Food trucks", desc: "QR sur la vitrine, paiement direct depuis le téléphone du client." },
  { emoji: "🥗", name: "Cantines & ghost kitchens", desc: "Cuisine connectée, multi-canaux, statistiques par couvert." },
  { emoji: "🍣", name: "Snacks & spécialités", desc: "Carte courte, options et allergènes, sans saisie en double." },
];

type Engagement = {
  glyph: string;
  title: string;
  desc: string;
};

const ENGAGEMENTS: Engagement[] = [
  {
    glyph: "0",
    title: "<em>0%</em> de commission.",
    desc: "Vous payez l'abonnement Taapr, c'est tout. Pas de prélèvement sur vos ventes.",
  },
  {
    glyph: "★",
    title: "Support <em>humain</em>.",
    desc: "Une équipe joignable par e-mail, pas un chatbot scripté.",
  },
  {
    glyph: "↗",
    title: "Vos données vous appartiennent.",
    desc: "Export CSV/JSON à tout moment. Aucune rétention contractuelle.",
  },
  {
    glyph: "⏱",
    title: "Setup en une <em>après-midi</em>.",
    desc: "Carte importée en CSV, QR généré en un clic, imprimante en USB ou réseau.",
  },
  {
    glyph: "✦",
    title: "Sans engagement.",
    desc: "14 jours d'essai sans carte bancaire. Résiliation en un clic.",
  },
  {
    glyph: "♥",
    title: "Fait à <em>Lyon</em>.",
    desc: "Une équipe française, des serveurs hébergés en France.",
  },
];

function Counter({ target, format = (n: number) => n.toString() }: { target: number; format?: (n: number) => string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true;
            const dur = 1200;
            const start = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setVal(Math.round(target * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{format(val)}</span>;
}

const formatThousands = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export default function Home() {
  const [billing, setBilling] = useState<"mensuel" | "annuel">("mensuel");
  const [activeModuleId, setActiveModuleId] = useState<string>(MODULES[0].id);
  const activeModule = MODULES.find((m) => m.id === activeModuleId) ?? MODULES[0];

  return (
    <div className="lv4">
      <LandingNav active="produit" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-stamp" aria-hidden="true">
          <div className="stamp">
            <div className="stamp-stars">★ ★ ★</div>
            <div className="stamp-num">0%</div>
            <div className="stamp-label">commission</div>
            <div className="stamp-stars">★ ★ ★</div>
          </div>
        </div>

        <div className="hero-inner">
          <div className="kicker">★ FAIT À LYON · POUR LES INDÉPENDANTS</div>
          <h1 className="hero-title">
            La suite tout-en-un<br />
            pour les restos <em>indépendants.</em><span className="dot" />
          </h1>
          <p className="hero-script">service compris.</p>

          <p className="hero-sub">
            Commandes, paiements, fidélité, cuisine. Un seul outil, zéro commission par commande,
            monté en une après-midi. Vos serveurs vous diront merci.
          </p>

          <div className="hero-ctas">
            <Link href="/admin/onboarding" className="btn-primary big">
              Démarrer gratuitement <span className="arrow">→</span>
            </Link>
            <a href="#features" className="btn-ghost big">Découvrir le produit</a>
          </div>

          <div className="hero-proof">
            <div className="proof-avatars">
              <span className="ava ava-1">M</span>
              <span className="ava ava-2">L</span>
              <span className="ava ava-3">K</span>
              <span className="ava ava-4">+</span>
            </div>
            <div>
              <div className="proof-stars">★★★★★ <span>4,8/5</span></div>
              <div className="proof-meta">+ 400 restos en France</div>
            </div>
          </div>
        </div>

        <aside className="hero-product" aria-label="Aperçu du dashboard">
          <div className="hp-window">
            <div className="hp-bar">
              <span className="hp-dot r" />
              <span className="hp-dot a" />
              <span className="hp-dot g" />
              <span className="hp-url">chez-marcel.taapr.fr</span>
            </div>
            <div className="hp-body">
              <div className="hp-head">
                <div>
                  <div className="hp-script">bonsoir Marcel,</div>
                  <div className="hp-title">Service du <em>soir</em> en cours.</div>
                </div>
                <div className="hp-pill">● 18 TABLES OCCUPÉES</div>
              </div>
              <div className="hp-kpis">
                <div className="hp-kpi hp-kpi-main">
                  <span className="hp-kpi-l">CA · CE SOIR</span>
                  <span className="hp-kpi-v">1 247€</span>
                  <span className="hp-kpi-d">+18%</span>
                </div>
                <div className="hp-kpi">
                  <span className="hp-kpi-l">CMDS</span>
                  <span className="hp-kpi-v">32</span>
                </div>
                <div className="hp-kpi">
                  <span className="hp-kpi-l">TICKET MOY.</span>
                  <span className="hp-kpi-v">39€</span>
                </div>
              </div>
              <div className="hp-orders">
                <div className="hp-order">
                  <span className="hp-on">#0142</span>
                  <span>Table 7 · 2 entrées · 2 plats</span>
                  <span className="hp-op">58€</span>
                  <span className="hp-os hp-os-cuisine">CUISINE</span>
                </div>
                <div className="hp-order">
                  <span className="hp-on">#0141</span>
                  <span>Click & collect · 19:50</span>
                  <span className="hp-op">24€</span>
                  <span className="hp-os hp-os-pret">PRÊT</span>
                </div>
                <div className="hp-order">
                  <span className="hp-on">#0140</span>
                  <span>Table 12 · 4 plats · 4 boissons</span>
                  <span className="hp-op">112€</span>
                  <span className="hp-os hp-os-servi">SERVI</span>
                </div>
              </div>
            </div>
          </div>
          <div className="hp-sticker">★ live</div>
        </aside>
      </section>

      {/* LOGOS BAR · marquee */}
      <section className="logos-bar" aria-label="Ils nous font confiance">
        <span className="logos-label">★ ILS COMPTENT SUR NOUS</span>
        <div className="logos-track" aria-hidden="false">
          {[...LOGOS, ...LOGOS].map((l, i) => (
            <span key={`${l.name}-${i}`} className={`logo-name${l.italic ? " italic" : ""}`}>
              {l.name}
            </span>
          ))}
        </div>
      </section>

      {/* MODULES — carousel + expandable panel */}
      <section className="features" id="features">
        <div className="section-head">
          <div className="kicker">★ TOUT-EN-UN</div>
          <h2 className="section-title">
            Une suite,<br />
            <em>sept</em> modules.<span className="dot small" />
          </h2>
          <p className="section-sub">
            Cliquez sur un module pour voir ce qu&apos;il fait. Cinq sont inclus dans
            l&apos;abonnement, deux sont activables à la carte.
          </p>
        </div>

        <div className="modules-carousel" role="tablist" aria-label="Modules Taapr">
          {MODULES.map((m) => (
            <button
              type="button"
              key={m.id}
              role="tab"
              aria-selected={activeModuleId === m.id}
              aria-controls="module-panel"
              className={`module-card${activeModuleId === m.id ? " active" : ""}`}
              onClick={() => setActiveModuleId(m.id)}
            >
              <div className="module-card-top">
                <span className={`module-icon ${m.iconClass}`} aria-hidden="true">
                  <m.Icon size={20} strokeWidth={1.75} />
                </span>
                <span className={`module-tag${m.paid ? " paid" : ""}`}>{m.short}</span>
              </div>
              <h3 className="module-card-name">{m.name}</h3>
              <p className="module-card-hint">{m.hint}</p>
            </button>
          ))}
        </div>

        <div className="module-panel" id="module-panel" role="tabpanel">
          <div className="module-panel-inner">
            <div className="module-panel-card" key={activeModule.id}>
              <div className={`panel-vis${activeModule.visualKey === "cnc" || activeModule.visualKey === "dashboard" ? " panel-vis-ink" : activeModule.visualKey === "kitchen" ? " panel-vis-cream" : ""}`}>
                <PanelVisual visual={activeModule.visualKey} />
              </div>
              <div className="panel-copy">
                <div className="panel-kicker">{activeModule.kicker}</div>
                <h3 className="panel-name">{activeModule.title}</h3>
                <p className="panel-desc">{activeModule.desc}</p>
                <ul className="panel-bullets">
                  {activeModule.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
                <div className="panel-foot">
                  {activeModule.paid ? (
                    <span className="panel-price">
                      {activeModule.price}<span className="per">/ mois</span>
                    </span>
                  ) : (
                    <span className="panel-price included">{activeModule.price}</span>
                  )}
                  {activeModule.cta && (
                    <Link href={activeModule.cta.href} className="btn-primary">
                      {activeModule.cta.label} <span className="arrow">→</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BIG STAT */}
      <section className="big-stat">
        <div className="big-stat-inner">
          <div className="bs-block">
            <div className="bs-num">
              <Counter target={1247} format={formatThousands} />€
            </div>
            <div className="bs-label">CA moyen samedi soir</div>
          </div>
          <div className="bs-divider" />
          <div className="bs-block">
            <div className="bs-num">
              +<Counter target={32} />%
            </div>
            <div className="bs-label">de commandes en plus<br />vs l&apos;ancienne caisse</div>
          </div>
          <div className="bs-divider" />
          <div className="bs-block">
            <div className="bs-num">
              &lt; <Counter target={4} /><small>h</small>
            </div>
            <div className="bs-label">pour mettre en place,<br />imprimante comprise</div>
          </div>
        </div>
        <div className="bs-script">les chiffres parlent ✦</div>
      </section>

      {/* SECTORS · "Pour qui ?" */}
      <section className="sectors" id="for-who">
        <div className="section-head">
          <div className="kicker">★ POUR QUI ?</div>
          <h2 className="section-title">
            Pour les <em>indépendants.</em><span className="dot small" />
          </h2>
          <p className="section-sub">
            Pensé pour les restos de quartier qui n&apos;ont ni le budget, ni le temps de cliquer
            dans trois logiciels différents pour servir leurs clients.
          </p>
        </div>

        <div className="sectors-grid">
          {SECTORS.map((s) => (
            <article key={s.name} className={`sector${s.featured ? " featured" : ""}`}>
              <span className="sector-emoji" aria-hidden="true">{s.emoji}</span>
              <h3 className="sector-name">{s.name}</h3>
              <p className="sector-desc">{s.desc}</p>
              {s.tag && <span className="sector-tag">{s.tag}</span>}
            </article>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials" id="testimonials">
        <div className="section-head">
          <div className="kicker">★ TÉMOIGNAGES</div>
          <h2 className="section-title">
            Ils ont posé<br />
            <em>l&apos;ardoise.</em><span className="dot small" />
          </h2>
        </div>

        <div className="test-grid">
          {TESTIMONIALS.map((t) => (
            <article key={t.name} className={`test-card${t.featured ? " featured" : ""}`}>
              <div className="test-stars">★★★★★</div>
              <p dangerouslySetInnerHTML={{ __html: t.quote }} />
              <div className="test-foot">
                <div className={`ava ${t.avatarClass}`}>{t.initial}</div>
                <div>
                  <div className="test-name">{t.name}</div>
                  <div className="test-resto">{t.resto}</div>
                </div>
              </div>
              {t.tag && <div className="test-tag">{t.tag}</div>}
            </article>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing" id="pricing">
        <div className="section-head center">
          <div className="kicker">★ TARIFS</div>
          <h2 className="section-title">
            Servez à <em>la carte.</em><span className="dot small" />
          </h2>
          <p className="section-sub">Simple, transparent, sans engagement. Annuel : <strong>−2 mois offerts</strong>.</p>
          <div className="billing-toggle">
            <button
              type="button"
              className={`bt-opt${billing === "mensuel" ? " active" : ""}`}
              onClick={() => setBilling("mensuel")}
            >
              Mensuel
            </button>
            <button
              type="button"
              className={`bt-opt${billing === "annuel" ? " active" : ""}`}
              onClick={() => setBilling("annuel")}
            >
              Annuel · −2 mois
            </button>
          </div>
        </div>

        {/* COMPARISON TABLE */}
        <div className="cmp-scroll">
          <div className="cmp-table">
            {/* Plan column headers */}
            <div className="cmp-th cmp-th-empty" />
            {PLANS.map((plan) => {
              const monthly = plan.price;
              const yearly = Math.round((plan.price * 10) / 12);
              const display = billing === "annuel" && plan.price > 0 ? yearly : monthly;
              return (
                <div
                  key={plan.id}
                  className={`cmp-th cmp-th-plan${plan.featured ? " featured" : ""}`}
                >
                  {plan.featured && <span className="cmp-plan-stamp">★ POPULAIRE</span>}
                  <div className="cmp-plan-name">{plan.name}</div>
                  <div className="cmp-plan-sub">{plan.sub}</div>
                  <div className="cmp-plan-price">
                    <span className="num">{display}</span>
                    <span className="cur">€</span>
                  </div>
                  <div className="cmp-plan-per">{plan.per}</div>
                  <Link
                    href="/admin/onboarding"
                    className={`${plan.primary ? "btn-primary" : "btn-ghost"} cmp-plan-cta`}
                  >
                    {plan.cta}
                    {plan.primary && <span className="arrow">→</span>}
                  </Link>
                </div>
              );
            })}

            {/* Categories + rows */}
            {COMPARE.map((cat) => (
              <Fragment key={cat.name}>
                <div className="cmp-cat">{cat.name}</div>
                {cat.rows.map((row) => (
                  <Fragment key={row.label}>
                    <div className="cmp-cell cmp-cell-feature">
                      <span>{row.label}</span>
                      {row.desc && <small>{row.desc}</small>}
                    </div>
                    {PLANS.map((plan) => {
                      const value = row.values[plan.id];
                      return (
                        <div
                          key={plan.id}
                          className={`cmp-cell cmp-cell-plan${plan.featured ? " featured" : ""}`}
                        >
                          {value === true ? (
                            <span className="cmp-yes" aria-label="Inclus">✓</span>
                          ) : value === false ? (
                            <span className="cmp-no" aria-label="Non inclus">—</span>
                          ) : (
                            <span className="cmp-val">{value}</span>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        <p className="cmp-foot">
          ★ TVA NON INCLUSE · FRAIS STRIPE BANCAIRES STANDARDS · ANNULABLE À TOUT MOMENT
        </p>
      </section>

      {/* ENGAGEMENTS · "Nos promesses" */}
      <section className="engagements" id="engagements">
        <div className="section-head">
          <div className="kicker">★ NOS ENGAGEMENTS</div>
          <h2 className="section-title">
            Nos engagements,<br />
            <em>noir sur blanc.</em><span className="dot small" />
          </h2>
          <p className="section-sub">
            Six promesses concrètes, écrites dans nos CGV. Si on en rompt une, on vous le dit.
          </p>
        </div>

        <div className="eng-grid">
          {ENGAGEMENTS.map((e) => (
            <article key={e.title} className="eng">
              <span className="eng-icon" aria-hidden="true">{e.glyph}</span>
              <h3 className="eng-title" dangerouslySetInnerHTML={{ __html: e.title }} />
              <p className="eng-desc">{e.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="faq" id="faq">
        <div className="faq-grid">
          <div className="faq-head">
            <div className="kicker">★ FAQ</div>
            <h2 className="section-title">
              Vos questions,<br />
              <em>nos réponses.</em><span className="dot small" />
            </h2>
            <p className="section-sub">Pas la vôtre ? Écrivez-nous, un humain répond en moins de 2 heures.</p>
            <a href="mailto:contact@taapr.com" className="btn-ghost">Nous écrire →</a>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} {...(i === 0 ? { open: true } : {})}>
                <summary>
                  {item.q}
                  <span className="plus">+</span>
                </summary>
                <div className="faq-body">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="fc-inner">
          <h2 className="fc-title">
            On vous offre<br />
            <em>les 2 premières semaines.</em><span className="dot small" />
          </h2>
          <p className="fc-script">à vous de jouer ✦</p>
          <div className="fc-ctas">
            <Link href="/admin/onboarding" className="btn-primary big light">
              Démarrer gratuitement <span className="arrow">→</span>
            </Link>
            <a href="mailto:contact@taapr.com" className="btn-ghost big light">Parler à un humain</a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

function PanelVisual({ visual }: { visual: Module["visualKey"] }) {
  switch (visual) {
    case "qr":
      return (
        <div className="pv-qr">
          <div className="pv-qr-square">
            <svg viewBox="0 0 70 70" aria-hidden="true">
              <rect width="70" height="70" fill="#fff" />
              <g fill="#1A1410">
                <rect x="5" y="5" width="18" height="18" /><rect x="9" y="9" width="10" height="10" fill="#fff" /><rect x="12" y="12" width="4" height="4" />
                <rect x="47" y="5" width="18" height="18" /><rect x="51" y="9" width="10" height="10" fill="#fff" /><rect x="54" y="12" width="4" height="4" />
                <rect x="5" y="47" width="18" height="18" /><rect x="9" y="51" width="10" height="10" fill="#fff" /><rect x="12" y="54" width="4" height="4" />
                <rect x="28" y="8" width="3" height="3" /><rect x="34" y="8" width="3" height="3" /><rect x="40" y="14" width="3" height="3" />
                <rect x="28" y="20" width="3" height="3" /><rect x="37" y="26" width="3" height="3" /><rect x="31" y="32" width="3" height="3" />
                <rect x="8" y="30" width="3" height="3" /><rect x="14" y="36" width="3" height="3" /><rect x="20" y="30" width="3" height="3" />
                <rect x="43" y="30" width="3" height="3" /><rect x="49" y="36" width="3" height="3" /><rect x="55" y="30" width="3" height="3" />
                <rect x="28" y="42" width="3" height="3" /><rect x="37" y="48" width="3" height="3" /><rect x="43" y="54" width="3" height="3" /><rect x="58" y="52" width="3" height="3" />
              </g>
            </svg>
            <span className="pv-qr-mark">t</span>
          </div>
          <div className="pv-qr-side">
            <span>★ TABLE 7 · 4 COUVERTS</span>
            <strong>chez-marcel.taapr.fr</strong>
            <span>SCAN · MENU · PAIEMENT</span>
          </div>
        </div>
      );
    case "cnc":
      return (
        <div className="pv-cnc">
          <span className="pv-cnc-label">RETRAIT 19:50 · #0141</span>
          <span className="pv-cnc-amount">24€</span>
          <span className="pv-cnc-meta">★ STRIPE · APPLE PAY · 0% COMMISSION</span>
        </div>
      );
    case "dashboard":
      return (
        <div className="pv-kpis">
          <div className="pv-kpi pv-kpi-main">
            <span className="pv-kpi-l">CA · CE SOIR</span>
            <span className="pv-kpi-v">1 247€</span>
          </div>
          <div className="pv-kpi">
            <span className="pv-kpi-l">CMDS</span>
            <span className="pv-kpi-v">32</span>
          </div>
          <div className="pv-kpi">
            <span className="pv-kpi-l">TICKET MOY.</span>
            <span className="pv-kpi-v">39€</span>
          </div>
        </div>
      );
    case "kitchen":
      return (
        <div className="ticket">
          <div className="ticket-head">★ TICKET #0142 · TABLE 7</div>
          <div className="ticket-line">2× Burrata, tomates anciennes</div>
          <div className="ticket-line">1× Risotto safran <em>(sans crevette)</em></div>
          <div className="ticket-line">1× Magret, miel</div>
          <div className="ticket-line">1× Tarte tatin</div>
          <div className="ticket-foot">19:42 · 4 couverts · 58€</div>
        </div>
      );
    case "loyalty":
      return (
        <div className="pv-loyalty">
          {[...Array(7)].map((_, i) => <span key={`f${i}`} className="pv-stamp filled">★</span>)}
          <span className="pv-stamp">★</span>
          <span className="pv-stamp">★</span>
          <span className="pv-stamp gift">🎁</span>
        </div>
      );
    case "livraison":
      return (
        <div className="pv-map">
          <div className="pv-map-grid" />
          <div className="pv-zone" />
          <div className="pv-pin pv-pin-shop">M</div>
          <div className="pv-pin pv-pin-rider">🛵</div>
          <div className="pv-pin pv-pin-client">●</div>
        </div>
      );
    case "stock":
      return (
        <div className="pv-stocks">
          <div className="pv-stock-row">
            <span className="pv-stock-name">Tomates anciennes</span>
            <span className="pv-stock-bar"><span className="pv-stock-fill" style={{ width: "78%" }} /></span>
            <span className="pv-stock-val">2,4 kg</span>
          </div>
          <div className="pv-stock-row">
            <span className="pv-stock-name">Burrata 125g</span>
            <span className="pv-stock-bar"><span className="pv-stock-fill warn" style={{ width: "18%" }} /></span>
            <span className="pv-stock-val warn">★ 4 u.</span>
          </div>
          <div className="pv-stock-row">
            <span className="pv-stock-name">Magret de canard</span>
            <span className="pv-stock-bar"><span className="pv-stock-fill warn" style={{ width: "30%" }} /></span>
            <span className="pv-stock-val warn">★ 3 p.</span>
          </div>
          <div className="pv-stock-row">
            <span className="pv-stock-name">Safran de Provence</span>
            <span className="pv-stock-bar"><span className="pv-stock-fill crit" style={{ width: "8%" }} /></span>
            <span className="pv-stock-val warn">! 0,4 g</span>
          </div>
          <div className="pv-stock-row">
            <span className="pv-stock-name">Carnaroli</span>
            <span className="pv-stock-bar"><span className="pv-stock-fill" style={{ width: "82%" }} /></span>
            <span className="pv-stock-val">8,2 kg</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}
