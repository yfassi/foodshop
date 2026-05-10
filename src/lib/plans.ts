/**
 * Single source of truth for TaapR plans + add-ons.
 *
 * Anything that displays a plan name, price, feature, or add-on (landing page,
 * onboarding, admin billing, upsell modal) must import from this file. Never
 * duplicate a label, price, or feature flag elsewhere.
 *
 * The plan IDs match the `subscription_tier` enum stored in the DB
 * (`essentiel` / `pro` / `groupe`) and the `SubscriptionTier` type in `types.ts`.
 */

import type { SubscriptionTier } from "./types";

export type PlanId = SubscriptionTier;

export type FeatureKey =
  | "qrTable"
  | "clickCollect"
  | "unlimitedMenu"
  | "stripe"
  | "printer"
  | "pushSmartphone"
  | "kitchenScreen"
  | "dashboard"
  | "floorPlan"
  | "csvExport"
  | "loyalty"
  | "multiEstablishment"
  | "api";

export type AddonId = "livraison" | "stock";

export interface Plan {
  id: PlanId;
  name: string;
  /** Short tagline shown under the plan name. */
  tagline: string;
  /** Monthly price in euros. */
  monthlyPrice: number;
  /** Effective monthly price when billed annually (annual / 12, rounded). */
  annualPrice: number;
  /** Marketing target audience, displayed above the features list. */
  audience: string;
  /** Boolean feature map — drives the comparison table + upsell logic. */
  features: Record<FeatureKey, boolean>;
  /** Per-plan CTA copy + href. */
  cta: { label: string; href: string };
  /** Highlight as "popular" on the landing pricing section. */
  featured?: boolean;
  /** Number of restaurants included before paying for extras. */
  includedRestaurants: number;
  /** Price per additional restaurant beyond included. `null` = not available. */
  extraRestaurantPrice: number | null;
}

export interface Addon {
  id: AddonId;
  name: string;
  /** Monthly price in euros. */
  monthlyPrice: number;
  description: string;
  /** Short bullets for "Selon votre activité" cards. */
  bullets: string[];
}

/* ─── Feature labels ─── */
/** Used in the upsell modal + locked feature placeholder. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  qrTable: "QR à table",
  clickCollect: "Click & collect",
  unlimitedMenu: "Carte illimitée",
  stripe: "Stripe · 0% commission",
  printer: "Imprimante ESC/POS",
  pushSmartphone: "Push smartphone",
  kitchenScreen: "Écran cuisine dédié",
  dashboard: "Dashboard & top ventes",
  floorPlan: "Plan de salle interactif",
  csvExport: "Export CSV / compta",
  loyalty: "Fidélité + SMS",
  multiEstablishment: "Multi-établissements",
  api: "API & webhooks",
};

/** One-line benefit shown in the upsell modal under the feature name. */
export const FEATURE_BENEFITS: Record<FeatureKey, string> = {
  qrTable: "Vos clients commandent et paient depuis leur téléphone, sans serveur.",
  clickCollect: "Prenez les commandes à l'avance, lissez vos coups de feu.",
  unlimitedMenu: "Gérez autant de produits, options et allergènes que vous voulez.",
  stripe: "Encaissez par CB, Apple Pay, Google Pay, tickets-restos — 0% pour TaapR.",
  printer: "Vos commandes sortent automatiquement sur l'imprimante de la cuisine.",
  pushSmartphone: "Vos serveurs reçoivent une alerte push à chaque nouvelle commande.",
  kitchenScreen: "Affichez les commandes en cuisine sans smartphone ni imprimante.",
  dashboard: "Suivez votre CA, vos top ventes et votre service en temps réel.",
  floorPlan: "Assignez vos tables et pilotez le service en salle en temps réel.",
  csvExport: "Exportez vos ventes et simplifiez votre comptabilité.",
  loyalty:
    "Fidélisez vos clients avec des tampons digitaux et des relances automatiques.",
  multiEstablishment: "Gérez plusieurs établissements depuis un seul compte.",
  api: "Connectez TaapR à vos outils métier (n8n, Zapier, scripts) via notre API.",
};

/** Lucide icon import is left to the consumer; this maps a feature to a glyph. */
export const FEATURE_ICONS: Record<FeatureKey, string> = {
  qrTable: "qr-code",
  clickCollect: "shopping-bag",
  unlimitedMenu: "list",
  stripe: "credit-card",
  printer: "printer",
  pushSmartphone: "bell",
  kitchenScreen: "monitor",
  dashboard: "layout-dashboard",
  floorPlan: "table",
  csvExport: "file-spreadsheet",
  loyalty: "heart",
  multiEstablishment: "building-2",
  api: "code",
};

/* ─── Plans ─── */

export const PLANS: Record<PlanId, Plan> = {
  essentiel: {
    id: "essentiel",
    name: "Essentiel",
    tagline: "Food trucks, dark kitchens, snacks",
    audience: "Pour démarrer simple",
    monthlyPrice: 39,
    annualPrice: 32,
    cta: { label: "Démarrer", href: "/admin/onboarding?plan=essentiel" },
    includedRestaurants: 1,
    extraRestaurantPrice: null,
    features: {
      qrTable: true,
      clickCollect: true,
      unlimitedMenu: true,
      stripe: true,
      printer: true,
      pushSmartphone: true,
      kitchenScreen: false,
      dashboard: true,
      floorPlan: false,
      csvExport: false,
      loyalty: false,
      multiEstablishment: false,
      api: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Restos avec salle, bistrots",
    audience: "L'expérience complète",
    monthlyPrice: 79,
    annualPrice: 66,
    cta: { label: "Essai 14 jours →", href: "/admin/onboarding?plan=pro" },
    featured: true,
    includedRestaurants: 1,
    extraRestaurantPrice: 39,
    features: {
      qrTable: true,
      clickCollect: true,
      unlimitedMenu: true,
      stripe: true,
      printer: true,
      pushSmartphone: true,
      kitchenScreen: true,
      dashboard: true,
      floorPlan: true,
      csvExport: true,
      loyalty: true,
      multiEstablishment: true,
      api: false,
    },
  },
  groupe: {
    id: "groupe",
    name: "Groupe",
    tagline: "Multi-établissements (jusqu'à 5)",
    audience: "Pour les groupes",
    monthlyPrice: 149,
    annualPrice: 124,
    cta: { label: "Nous contacter", href: "mailto:contact@taapr.com" },
    includedRestaurants: 5,
    extraRestaurantPrice: null,
    features: {
      qrTable: true,
      clickCollect: true,
      unlimitedMenu: true,
      stripe: true,
      printer: true,
      pushSmartphone: true,
      kitchenScreen: true,
      dashboard: true,
      floorPlan: true,
      csvExport: true,
      loyalty: true,
      multiEstablishment: true,
      api: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["essentiel", "pro", "groupe"];

/* ─── Add-ons ─── */

export const ADDONS: Record<AddonId, Addon> = {
  livraison: {
    id: "livraison",
    name: "Livraison",
    monthlyPrice: 19,
    description: "Zones, livreurs, suivi temps réel",
    bullets: [
      "Zones par rayon ou polygone",
      "App livreur dédiée",
      "Suivi SMS pour le client",
      "0% de commission",
    ],
  },
  stock: {
    id: "stock",
    name: "Stock",
    monthlyPrice: 19,
    description: "OCR tickets, alertes seuil bas",
    bullets: [
      "OCR sur tickets fournisseur",
      "Décrément auto par recette",
      "Alertes seuil bas SMS / push",
      "Export inventaire CSV",
    ],
  },
};

export const ADDON_ORDER: AddonId[] = ["livraison", "stock"];

/* ─── Helpers ─── */

/** Total annual cost (monthly * 12 in monthly billing, annual * 12 in annual billing). */
export function annualTotal(plan: Plan): number {
  return plan.annualPrice * 12;
}

/** Money saved per year by switching from monthly to annual. */
export function annualSavings(plan: Plan): number {
  return (plan.monthlyPrice - plan.annualPrice) * 12;
}

/** "Soit 384 €/an — économisez 84 €" — used under the price when annual mode is on. */
export function annualNote(plan: Plan): string {
  if (plan.annualPrice === 0) return "";
  return `Soit ${annualTotal(plan)} €/an — économisez ${annualSavings(plan)} €`;
}

/** Required plan for a given feature, or null if the feature is universal. */
export function requiredPlanFor(feature: FeatureKey): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (PLANS[id].features[feature]) return id;
  }
  return null;
}
