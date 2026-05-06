"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Boxes, Bell, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const PERKS = [
  {
    icon: Camera,
    title: "OCR sur tickets",
    body: "Photographiez le bon de livraison. Articles et quantités reconnus, validation en 1 clic.",
  },
  {
    icon: Boxes,
    title: "Décrément automatique",
    body: "Recettes paramétrables, dosages précis. Chaque commande déduit les ingrédients.",
  },
  {
    icon: Bell,
    title: "Alertes seuil bas",
    body: "Notification push à 11h sur les articles à recommander avant le coup de feu.",
  },
];

export function ActivationClient({
  restaurantId,
  cancelled,
}: {
  restaurantId: string;
  cancelled: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stock/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Erreur");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 md:py-16">
      {cancelled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Paiement annulé. Le module n&apos;a pas été activé.
        </div>
      )}

      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Boxes className="h-7 w-7" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Module Stock
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Stop aux ruptures du samedi soir. 14 jours d&apos;essai gratuit.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PERKS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <p.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="mb-1 text-sm font-semibold">{p.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          À partir de
        </p>
        <p className="mt-1 text-3xl font-bold">
          12<span className="text-base font-medium text-muted-foreground"> €/mois</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          14 jours gratuits, sans engagement
        </p>
        <Button
          className="mt-5 h-12 w-full rounded-xl font-semibold"
          onClick={subscribe}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Activer le module
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
