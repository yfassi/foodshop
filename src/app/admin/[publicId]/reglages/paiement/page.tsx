"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface StripePayment {
  id: string;
  amount: number;
  status: string;
  created: number;
  description: string | null;
  paid: boolean;
}

interface StripeData {
  balance: { available: number; pending: number; currency: string };
  payments: StripePayment[];
  dashboard_url: string;
}

export default function ReglagesPaiementPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [acceptOnSite, setAcceptOnSite] = useState(true);
  const [acceptOnline, setAcceptOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [stripeData, setStripeData] = useState<StripeData | null>(null);
  const [stripeDataLoading, setStripeDataLoading] = useState(false);
  const hasLoaded = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load restaurant
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id, stripe_account_id, stripe_onboarding_complete, accepted_payment_methods")
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setRestaurantId(data.id);
        setStripeAccountId(data.stripe_account_id);
        setOnboardingComplete(data.stripe_onboarding_complete ?? false);
        const methods: string[] = data.accepted_payment_methods || ["on_site"];
        setAcceptOnSite(methods.includes("on_site"));
        setAcceptOnline(methods.includes("online"));
      }
      setLoading(false);
      setTimeout(() => {
        hasLoaded.current = true;
      }, 1500);
    };
    load();
  }, [params.publicId]);

  // Stripe status check (after onboarding redirect)
  const checkStripeStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      const data = await res.json();
      if (data.onboarding_complete) {
        setOnboardingComplete(true);
        toast.success("Paiement en ligne activé avec succès !");
      }
    } catch {
      // Silent fail
    }
    setCheckingStatus(false);
  }, [params.publicId]);

  useEffect(() => {
    if (!restaurantId) return;
    if (
      searchParams.get("stripe_return") === "true" ||
      searchParams.get("stripe_refresh") === "true"
    ) {
      router.replace(`/admin/${params.publicId}/reglages/paiement`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Stripe redirect callback: must trigger status refresh
      checkStripeStatus();
    }
  }, [restaurantId, searchParams, router, params.publicId, checkStripeStatus]);

  // Fetch Stripe balance + payments when onboarding is complete
  const fetchStripeData = useCallback(async () => {
    setStripeDataLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      if (res.ok) {
        const data = await res.json();
        setStripeData(data);
      }
    } catch {
      // Silent fail
    }
    setStripeDataLoading(false);
  }, [params.publicId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch dashboard data when Stripe is ready
    if (onboardingComplete) fetchStripeData();
  }, [onboardingComplete, fetchStripeData]);

  // Auto-save payment methods
  const saveMethods = useCallback(async () => {
    if (!hasLoaded.current || !restaurantId) return;
    const methods: string[] = [];
    if (acceptOnSite) methods.push("on_site");
    if (acceptOnline) methods.push("online");
    if (methods.length === 0) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ accepted_payment_methods: methods })
      .eq("id", restaurantId);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Enregistré");
  }, [restaurantId, acceptOnSite, acceptOnline]);

  useEffect(() => {
    if (!hasLoaded.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveMethods, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [saveMethods]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur lors de la configuration du paiement");
      }
    } catch {
      toast.error("Erreur lors de la configuration du paiement");
    }
    setStripeLoading(false);
  };

  if (loading) {
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
        icon={CreditCard}
        title="Paiement"
        subtitle="Compte Stripe et modes de paiement acceptés en caisse."
      />

      <div className="space-y-8">
        {/* ─── BLOC 1 — Modes de paiement acceptés ─── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Modes de paiement acceptés
            </h3>
          </div>

          <Card size="sm">
            <CardContent className="pt-5">
              <div className="space-y-0">
                <div className="flex items-center justify-between py-3 first:pt-0">
                  <div>
                    <p className="text-sm font-medium">Espèces / sur place</p>
                    <p className="text-xs text-muted-foreground">
                      Le client paie au comptoir.
                    </p>
                  </div>
                  <Switch
                    checked={acceptOnSite}
                    onCheckedChange={setAcceptOnSite}
                    aria-label="Accepter les paiements sur place"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-medium">Carte bancaire en ligne</p>
                    <p className="text-xs text-muted-foreground">
                      {onboardingComplete
                        ? "Paiement en ligne sécurisé · Apple Pay & Google Pay inclus."
                        : "Activez d'abord votre compte Stripe ci-dessous pour utiliser ce mode."}
                    </p>
                  </div>
                  <Switch
                    checked={acceptOnline}
                    onCheckedChange={setAcceptOnline}
                    disabled={!onboardingComplete}
                    aria-label="Accepter les paiements en ligne"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── BLOC 2 — Mon compte de paiements (Stripe Connect) ─── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Mon compte de paiements
            </h3>
          </div>

          <Card
            size="sm"
            className={cn(
              "transition-colors",
              onboardingComplete &&
                "border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20",
              !onboardingComplete &&
                stripeAccountId &&
                "border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20",
              !stripeAccountId && "border-dashed",
            )}
          >
            <CardHeader>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    onboardingComplete
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : stripeAccountId
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm">Compte Stripe</CardTitle>
                    {checkingStatus ? (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Vérification…
                      </Badge>
                    ) : onboardingComplete ? (
                      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <Check className="h-3 w-3" /> Actif
                      </Badge>
                    ) : stripeAccountId ? (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Configuration en cours
                      </Badge>
                    ) : (
                      <Badge variant="outline">Non configuré</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Recevez les paiements en ligne et les recharges directement sur votre
                    compte bancaire. Propulsé par Stripe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {onboardingComplete ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {stripeData?.dashboard_url ? (
                    <Button asChild variant="outline" className="w-full justify-between">
                      <a
                        href={stripeData.dashboard_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Mon dashboard Stripe
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full justify-between">
                      Mon dashboard Stripe
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className="w-full justify-between"
                  >
                    {stripeLoading ? (
                      <>
                        Mise à jour…
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </>
                    ) : (
                      <>
                        Mettre à jour mes infos
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              ) : stripeAccountId ? (
                <div className="space-y-3">
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                    Stripe a besoin d&apos;informations supplémentaires (justificatifs,
                    IBAN, identité du dirigeant) pour activer votre compte.
                  </p>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className="w-full justify-between"
                  >
                    {stripeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Reprendre la configuration
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>Onboarding guidé sur Stripe (env. 5 min)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>0 % de commission TaapR · uniquement les frais Stripe (~1,5 %)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>Versements automatiques sur votre compte bancaire</span>
                    </li>
                  </ul>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className="w-full justify-between"
                  >
                    {stripeLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Configurer mon compte Stripe
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fee transparency block */}
          <Card size="sm">
            <CardContent className="pt-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Frais Stripe par transaction
                    </p>
                    <p className="mt-0.5 font-mono text-base font-extrabold tracking-tight">
                      ~1,5 % <span className="text-muted-foreground">+</span> 0,20 €
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                    0 % TaapR
                  </span>
                </div>

                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">Comme un TPE bancaire.</span>{" "}
                      Stripe sécurise chaque paiement aux normes PCI-DSS et 3D Secure.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">Facturation incluse.</span>{" "}
                      Justificatifs et reçus exportables directement depuis votre tableau Stripe.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                    <p className="text-[12px] leading-snug text-muted-foreground">
                      <span className="font-semibold text-foreground">TaapR ne prend aucune commission.</span>{" "}
                      Nous négocions la meilleure tarification possible pour nos restaurants.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Balance + recent payments — only when onboarding is complete */}
          {onboardingComplete && (
            <>
              <Card size="sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Solde Stripe</CardTitle>
                      <CardDescription className="text-xs">
                        Versement automatique vers votre compte bancaire.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {stripeDataLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Chargement…</span>
                    </div>
                  ) : stripeData ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-green-500/20 bg-green-50/50 p-3 dark:bg-green-950/20">
                        <p className="text-xs font-medium text-muted-foreground">
                          Disponible
                        </p>
                        <p className="mt-1 text-lg font-bold text-green-600">
                          {formatPrice(stripeData.balance.available)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 p-3 dark:bg-amber-950/20">
                        <p className="text-xs font-medium text-muted-foreground">
                          En attente
                        </p>
                        <p className="mt-1 text-lg font-bold text-amber-600">
                          {formatPrice(stripeData.balance.pending)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Derniers paiements</CardTitle>
                      <CardDescription className="text-xs">
                        Les 20 derniers paiements reçus.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {stripeDataLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Chargement…</span>
                    </div>
                  ) : stripeData && stripeData.payments.length > 0 ? (
                    <div className="divide-y divide-border">
                      {stripeData.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {payment.description || "Paiement"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.created * 1000).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge
                              className={
                                payment.paid
                                  ? "border-green-200 bg-green-100 text-green-700"
                                  : "border-orange-200 bg-orange-100 text-orange-700"
                              }
                            >
                              {payment.paid ? "Payé" : "Échoué"}
                            </Badge>
                            <span className="text-sm font-semibold">
                              {formatPrice(payment.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : stripeData ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun paiement pour le moment.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
