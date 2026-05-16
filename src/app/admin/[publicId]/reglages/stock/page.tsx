"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function ReglagesStockPage() {
  const params = useParams<{ publicId: string }>();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [moduleActive, setModuleActive] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id, stock_module_active, stock_enabled")
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setRestaurantId(data.id);
        setModuleActive(data.stock_module_active ?? false);
        setEnabled(data.stock_enabled ?? false);
      }
      setLoading(false);
      setTimeout(() => {
        hasLoaded.current = true;
      }, 1500);
    };
    load();
  }, [params.publicId]);

  const save = useCallback(
    async (nextEnabled: boolean) => {
      if (!hasLoaded.current || !restaurantId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("restaurants")
        .update({ stock_enabled: nextEnabled })
        .eq("id", restaurantId);
      if (error) toast.error("Erreur lors de la sauvegarde");
      else toast.success("Enregistré");
    },
    [restaurantId],
  );

  useEffect(() => {
    if (!hasLoaded.current) return;
    const id = setTimeout(() => save(enabled), 600);
    return () => clearTimeout(id);
  }, [enabled, save]);

  const subscribe = async () => {
    if (!restaurantId) return;
    setSubscribing(true);
    try {
      const res = await fetch("/api/admin/stock/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "Erreur");
        return;
      }
      window.location.href = data.url;
    } finally {
      setSubscribing(false);
    }
  };

  const cancel = async () => {
    if (!restaurantId) return;
    if (!confirm("Annuler l'abonnement Stock ?")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/admin/stock/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Abonnement annulé");
      window.location.reload();
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !restaurantId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="Réglages"
        icon={Package}
        title="Stock"
        subtitle="Activation du module et configuration du suivi des stocks."
      />

      <div className="space-y-4">
        {!moduleActive ? (
          <Card size="sm" className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm">Module Stock — 12 €/mois</CardTitle>
                  <CardDescription className="text-xs">
                    OCR tickets fournisseur · alertes seuil bas · décrément auto.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                14 jours d&apos;essai gratuit. Sans engagement.
              </p>
              <Button
                type="button"
                className="rounded-xl"
                onClick={subscribe}
                disabled={subscribing}
              >
                {subscribing ? "Redirection…" : "Activer le module"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card size="sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">Activer le suivi de stock</CardTitle>
                    <CardDescription className="text-xs">
                      Numérisez les tickets, suivez les quantités, recevez les alertes.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Switch
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      aria-label="Activer le suivi de stock"
                    />
                  </CardAction>
                </div>
              </CardHeader>
            </Card>

            {enabled && (
              <Card size="sm">
                <CardContent className="space-y-3 py-6">
                  <p className="text-sm">
                    Module Stock actif. Retrouvez les ingrédients, recettes,
                    scans et mouvements depuis la nav.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/${params.publicId}/stock`}>
                      <Button variant="outline" className="rounded-lg" size="sm">
                        Ouvrir le module
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-destructive hover:bg-destructive/5 hover:text-destructive"
                      onClick={cancel}
                      disabled={cancelling}
                    >
                      {cancelling ? "Annulation…" : "Annuler l'abonnement"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
