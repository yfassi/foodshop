"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Loader2 } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { DAYS_FR } from "@/lib/constants";

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", params.slug)
        .single<Restaurant>();

      setRestaurant(data);
      setLoading(false);
    };
    fetch();
  }, [params.slug]);

  const checkStripeStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: params.slug }),
      });
      const data = await res.json();
      if (data.onboarding_complete) {
        setRestaurant((prev) =>
          prev ? { ...prev, stripe_onboarding_complete: true } : prev
        );
        toast.success("Compte Stripe connecte avec succes !");
      }
    } catch {
      // Silent fail
    }
    setCheckingStatus(false);
  };

  useEffect(() => {
    if (
      restaurant &&
      (searchParams.get("stripe_return") === "true" ||
        searchParams.get("stripe_refresh") === "true")
    ) {
      checkStripeStatus();
    }
  }, [restaurant, searchParams]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: params.slug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur lors de la connexion Stripe");
      }
    } catch {
      toast.error("Erreur lors de la connexion Stripe");
    }
    setStripeLoading(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (loading || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <h2 className="mb-4 text-lg font-bold">Reglages</h2>

      <div className="mx-auto max-w-lg space-y-4">
        {/* Restaurant info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Informations</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-bold">Nom :</span> {restaurant.name}
            </p>
            <p>
              <span className="font-bold">Adresse :</span>{" "}
              {restaurant.address || "Non renseigne"}
            </p>
            <p>
              <span className="font-bold">Telephone :</span>{" "}
              {restaurant.phone || "Non renseigne"}
            </p>
          </div>
        </div>

        {/* Opening hours */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Horaires</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(DAYS_FR).map(([key, label]) => {
              const hours = restaurant.opening_hours?.[key];
              return (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{label}</span>
                  <span>
                    {hours
                      ? `${hours.open} - ${hours.close}`
                      : "Ferme"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Paiement en ligne */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Paiement en ligne
          </h3>

          {checkingStatus ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verification du compte Stripe...</span>
            </div>
          ) : restaurant.stripe_onboarding_complete ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Actif
                </span>
                <span className="text-sm">Compte Stripe connecte</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Les clients peuvent payer en ligne. Les paiements sont verses
                directement sur votre compte.
              </p>
            </div>
          ) : restaurant.stripe_account_id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Incomplet
                </span>
                <span className="text-sm">Configuration en cours</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Votre compte Stripe n&apos;est pas encore entierement configure.
                Completez la configuration pour recevoir des paiements en ligne.
              </p>
              <Button
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                variant="outline"
                className="h-10 w-full rounded-xl text-sm font-medium"
              >
                {stripeLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Completer la configuration
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                Connectez un compte Stripe pour accepter les paiements en ligne.
              </p>
              <p className="text-xs text-muted-foreground">
                Sans compte Stripe, seul le paiement sur place est propose aux
                clients.
              </p>
              <Button
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                className="h-10 w-full rounded-xl text-sm font-medium"
              >
                {stripeLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Connecter Stripe
              </Button>
            </div>
          )}
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="h-12 w-full rounded-xl font-medium"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Deconnexion
        </Button>
      </div>
    </div>
  );
}
