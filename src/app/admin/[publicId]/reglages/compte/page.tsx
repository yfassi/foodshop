"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bike,
  Key,
  LayoutGrid,
  Loader2,
  LogOut,
  Package,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { ADDONS, PLANS } from "@/lib/plans";
import { getTierLabel, getTierPrice, nextTier, normalizeTier } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function ReglagesComptePage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("essentiel");
  const [deliveryAddonActive, setDeliveryAddonActive] = useState(false);
  const [stockModuleActive, setStockModuleActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.email) setEmail(userData.user.email);
      const { data } = await supabase
        .from("restaurants")
        .select("subscription_tier, delivery_addon_active, stock_module_active")
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setSubscriptionTier(normalizeTier(data.subscription_tier));
        setDeliveryAddonActive(data.delivery_addon_active ?? false);
        setStockModuleActive(data.stock_module_active ?? false);
      }
      setLoading(false);
    };
    load();
  }, [params.publicId]);

  const passwordInvalid = (() => {
    if (!newPassword) return false; // submit will surface "Entrez un mot de passe"
    if (newPassword.length < 6) return true;
    if (confirmPassword && newPassword !== confirmPassword) return true;
    return false;
  })();

  const handleOpenBillingPortal = async () => {
    setOpeningBillingPortal(true);
    try {
      const res = await fetch("/api/stripe/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (data.error === "billing_not_configured") {
        toast.info(
          data.message ||
            "La facturation self-service n'est pas encore activée pour ce compte.",
        );
      } else {
        toast.error(data.message || data.error || "Impossible d'ouvrir le portail Stripe.");
      }
    } catch {
      toast.error("Erreur de connexion au portail Stripe.");
    } finally {
      setOpeningBillingPortal(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error("Entrez un nouveau mot de passe");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erreur lors du changement de mot de passe");
      setSavingPassword(false);
      return;
    }
    toast.success("Mot de passe modifié");
    setNewPassword("");
    setConfirmPassword("");
    setSavingPassword(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const upgradeTier = nextTier(subscriptionTier);
  const planHasApi = PLANS[subscriptionTier].features.api;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="Réglages"
        icon={User}
        title="Mon compte"
        subtitle="Abonnement, modules, identifiants et déconnexion."
      />

      <div className="space-y-4">
        {/* ─── Mon abonnement ─── */}
        <Card size="sm" className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm">Mon abonnement</CardTitle>
                <CardDescription className="text-xs">
                  Plan actuel et facturation TaapR.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                    Formule
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {getTierLabel(subscriptionTier)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatPrice(getTierPrice(subscriptionTier) * 100)} HT / mois · par restaurant
                  </p>
                </div>
                {upgradeTier && (
                  <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                    ↑ {getTierLabel(upgradeTier)} disponible
                  </Badge>
                )}
              </div>

              <Button
                onClick={handleOpenBillingPortal}
                disabled={openingBillingPortal}
                className="w-full"
              >
                {openingBillingPortal ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                )}
                Gérer mon abonnement sur Stripe
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Modifier la formule, les moyens de paiement, télécharger les factures…
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Modules ─── */}
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm">Modules</CardTitle>
                <CardDescription className="text-xs">
                  Modules complémentaires activés sur ce restaurant.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Livraison */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Bike className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Module {ADDONS.livraison.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {deliveryAddonActive
                        ? `Actif · +${ADDONS.livraison.monthlyPrice} €/mois`
                        : `${ADDONS.livraison.description} · +${ADDONS.livraison.monthlyPrice} €/mois`}
                    </p>
                  </div>
                </div>
                {deliveryAddonActive ? (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                    ● Actif
                  </Badge>
                ) : (
                  <Link
                    href={`/admin/${params.publicId}/reglages/livraison`}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Activer
                  </Link>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Module {ADDONS.stock.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {stockModuleActive
                        ? `Actif · +${ADDONS.stock.monthlyPrice} €/mois`
                        : `${ADDONS.stock.description} · +${ADDONS.stock.monthlyPrice} €/mois`}
                    </p>
                  </div>
                </div>
                {stockModuleActive ? (
                  <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                    ● Actif
                  </Badge>
                ) : (
                  <Link
                    href={`/admin/${params.publicId}/stock/activation`}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Activer
                  </Link>
                )}
              </div>

              {/* API hint for non-Groupe plans */}
              {!planHasApi && (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Key className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">API & webhooks</p>
                      <p className="text-xs text-muted-foreground">
                        Disponible avec le plan {PLANS.groupe.name} · {PLANS.groupe.monthlyPrice} €/mois
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/${params.publicId}/reglages/api`}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Voir
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── Email ─── */}
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm">Adresse e-mail</CardTitle>
                <CardDescription>{email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* ─── Mot de passe ─── */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Mot de passe</CardTitle>
            <CardDescription className="text-xs">
              Modifiez votre mot de passe de connexion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 caractères"
                  aria-invalid={newPassword.length > 0 && newPassword.length < 6}
                  className={
                    newPassword.length > 0 && newPassword.length < 6
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirmer</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répéter le mot de passe"
                  aria-invalid={
                    confirmPassword.length > 0 && newPassword !== confirmPassword
                  }
                  className={
                    confirmPassword.length > 0 && newPassword !== confirmPassword
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-destructive">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || passwordInvalid}
                variant="outline"
                className="w-full"
              >
                {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Modifier le mot de passe
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
