"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

// Tous les anciens onglets ?tab=X ont migré vers des routes /reglages/<slug>
// dédiées (PR D + PR E). Cette page reste comme redirect transparent pour les
// bookmarks et les liens externes.
const TAB_TO_ROUTE: Record<string, string> = {
  restaurant: "/reglages/etablissement",
  loyalty: "/reglages/fidelite",
  payment: "/reglages/paiement",
  wallet: "/reglages/solde",
  queue: "/reglages/file-attente",
  delivery: "/reglages/livraison",
  stock: "/reglages/stock",
  floor: "/reglages/plan-de-salle",
  materiel: "/reglages/materiel",
  api: "/reglages/api",
  account: "/reglages/compte",
};

export default function SettingsRedirectPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    const target = (tab && TAB_TO_ROUTE[tab]) || "/reglages/etablissement";
    router.replace(`/admin/${params.publicId}${target}`);
  }, [searchParams, router, params.publicId]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
