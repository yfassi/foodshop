export type PlanId = "essentiel" | "pro" | "business";
export type AddonId = "delivery" | "stock";

export interface Plan {
  id: PlanId;
  name: string;
  sub: string;
  price: number;
  features: string[];
  badge?: string;
  popular?: boolean;
}

export interface Addon {
  id: AddonId;
  name: string;
  shortName: string;
  description: string;
  price: number;
  availableOn: PlanId[];
  features: string[];
  highlight: string;
}

export const PLANS: Plan[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    sub: "Démarrer sereinement",
    price: 29,
    features: [
      "300 commandes / mois",
      "Menu jusqu'à 50 produits",
      "Paiement Stripe inclus",
      "QR codes illimités",
      "Support par email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    sub: "Pour les restaurants qui tournent",
    price: 49,
    badge: "Le plus populaire",
    popular: true,
    features: [
      "Commandes illimitées",
      "Menu illimité",
      "Programme de fidélité",
      "Statistiques avancées",
      "Support prioritaire",
    ],
  },
  {
    id: "business",
    name: "Business",
    sub: "Multi-établissements",
    price: 79,
    features: [
      "Jusqu'à 3 établissements",
      "Tout le plan Pro",
      "Analyse IA des ventes",
      "Vue consolidée",
      "Support dédié",
    ],
  },
];

export const ADDONS: Addon[] = [
  {
    id: "delivery",
    name: "Module Livraison",
    shortName: "Livraison",
    description:
      "Livraison à domicile — zones, livreurs, suivi temps réel.",
    price: 19,
    availableOn: ["pro", "business"],
    highlight: "+19€/mois",
    features: [
      "Zones de livraison personnalisées (rayon + frais)",
      "Espace livreur mobile avec auth SMS",
      "Sélection d'adresse par carte interactive",
      "Suivi livraison en temps réel pour le client",
    ],
  },
  {
    id: "stock",
    name: "Module Stock",
    shortName: "Stock",
    description:
      "OCR des tickets fournisseurs, suivi quantités, alertes seuil bas.",
    price: 29,
    availableOn: ["essentiel", "pro", "business"],
    highlight: "+29€/mois",
    features: [
      "Scan caméra des tickets fournisseurs",
      "Lecture OCR auto par IA et assignation au stock",
      "Mouvements illimités (entrées, sorties, ajustements)",
      "Alertes seuil bas par item",
    ],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function getAddon(id: string): Addon | undefined {
  return ADDONS.find((a) => a.id === id);
}

export function isAddonAvailableOn(addonId: AddonId, planId: PlanId): boolean {
  const addon = getAddon(addonId);
  return !!addon && addon.availableOn.includes(planId);
}
