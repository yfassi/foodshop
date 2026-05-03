"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Restaurant, SubscriptionTier } from "@/lib/types";
import {
  getTierLabel,
  getTierPrice,
  normalizeTier,
  TIER_ORDER,
} from "@/lib/subscription";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  ShoppingBag,
  DollarSign,
  Receipt,
  XCircle,
  Layers,
  Package,
  Clock,
  Store,
  FileCheck,
  FileX,
  FileText,
  Save,
  Loader2,
} from "lucide-react";

interface RestaurantDetail extends Restaurant {
  owner_email: string | null;
  stats: {
    total_orders: number;
    total_revenue: number;
    avg_ticket: number;
    cancelled_orders: number;
    category_count: number;
    product_count: number;
  };
}

const DAY_LABELS: Record<string, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

interface FormState {
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  restaurant_type: string;
  siret: string;
  subscription_tier: SubscriptionTier;
  is_active: boolean;
  is_accepting_orders: boolean;
  loyalty_enabled: boolean;
  stock_module_active: boolean;
  stock_enabled: boolean;
  delivery_addon_active: boolean;
  delivery_enabled: boolean;
}

function toForm(r: RestaurantDetail): FormState {
  return {
    name: r.name ?? "",
    slug: r.slug ?? "",
    description: r.description ?? "",
    address: r.address ?? "",
    phone: r.phone ?? "",
    restaurant_type: r.restaurant_type ?? "",
    siret: r.siret ?? "",
    subscription_tier: normalizeTier(r.subscription_tier),
    is_active: r.is_active,
    is_accepting_orders: r.is_accepting_orders,
    loyalty_enabled: r.loyalty_enabled,
    stock_module_active: r.stock_module_active,
    stock_enabled: r.stock_enabled,
    delivery_addon_active: r.delivery_addon_active,
    delivery_enabled: r.delivery_enabled,
  };
}

function diff(a: FormState, b: FormState): Partial<FormState> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(a) as (keyof FormState)[]) {
    if (a[k] !== b[k]) out[k] = b[k];
  }
  return out;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SuperAdminRestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRestaurant = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/super-admin/restaurants/${id}`);
    if (res.ok) {
      const data: RestaurantDetail = await res.json();
      setRestaurant(data);
      setForm(toForm(data));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const updateVerification = async (verification_status: string) => {
    if (!restaurant) return;
    const prev = restaurant.verification_status;
    setRestaurant({
      ...restaurant,
      verification_status:
        verification_status as Restaurant["verification_status"],
    });

    const res = await fetch("/api/super-admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, verification_status }),
    });

    if (!res.ok) {
      setRestaurant({ ...restaurant, verification_status: prev });
      toast.error("Erreur lors de la mise a jour");
    } else {
      toast.success(
        verification_status === "verified"
          ? "Restaurant verifie"
          : "Verification refusee"
      );
    }
  };

  const handleSave = async () => {
    if (!restaurant || !form) return;
    const original = toForm(restaurant);
    const changes = diff(original, form);

    if (Object.keys(changes).length === 0) {
      toast.info("Aucune modification a enregistrer");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/super-admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, ...changes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Erreur lors de la sauvegarde");
      setSaving(false);
      return;
    }

    toast.success("Modifications enregistrees");
    await fetchRestaurant();
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!restaurant || !form) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-muted-foreground">
            Restaurant non trouve.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const dirty = Object.keys(diff(toForm(restaurant), form)).length > 0;

  return (
    <div className="px-4 py-6 pb-32 md:px-6">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux restaurants
        </button>

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {restaurant.logo_url ? (
                <Image
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold">{restaurant.name}</h2>
              <a
                href={`/restaurant/${restaurant.slug}/order`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                /restaurant/{restaurant.slug}/order
                <ExternalLink className="h-3 w-3" />
              </a>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    form.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {form.is_active ? "Actif" : "Inactif"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    restaurant.verification_status === "verified"
                      ? "bg-emerald-50 text-emerald-700"
                      : restaurant.verification_status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {restaurant.verification_status === "verified"
                    ? "Verifie"
                    : restaurant.verification_status === "rejected"
                      ? "Refuse"
                      : "En attente de verification"}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {getTierLabel(form.subscription_tier)} —{" "}
                  {getTierPrice(form.subscription_tier)}€/mois
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <MetricCard
            icon={ShoppingBag}
            label="Total commandes"
            value={String(restaurant.stats.total_orders)}
          />
          <MetricCard
            icon={DollarSign}
            label="Chiffre d'affaires"
            value={formatPrice(restaurant.stats.total_revenue)}
          />
          <MetricCard
            icon={Receipt}
            label="Panier moyen"
            value={formatPrice(restaurant.stats.avg_ticket)}
          />
          <MetricCard
            icon={XCircle}
            label="Annulees"
            value={String(restaurant.stats.cancelled_orders)}
          />
          <MetricCard
            icon={Layers}
            label="Categories"
            value={String(restaurant.stats.category_count)}
          />
          <MetricCard
            icon={Package}
            label="Produits"
            value={String(restaurant.stats.product_count)}
          />
        </div>

        {/* Verification */}
        <Section
          title="Verification KBIS"
          description="Validez l'inscription a la reception du KBIS du restaurateur."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Document</p>
                {restaurant.verification_document_url ? (
                  <a
                    href={restaurant.verification_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Voir le document
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun document fourni</p>
                )}
              </div>
              <div className="flex gap-2">
                {restaurant.verification_status !== "verified" && (
                  <button
                    onClick={() => updateVerification("verified")}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                  >
                    <FileCheck className="h-4 w-4" />
                    Valider
                  </button>
                )}
                {restaurant.verification_status !== "rejected" && (
                  <button
                    onClick={() => updateVerification("rejected")}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    <FileX className="h-4 w-4" />
                    Refuser
                  </button>
                )}
                {restaurant.verification_status !== "pending" && (
                  <button
                    onClick={() => updateVerification("pending")}
                    className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    Remettre en attente
                  </button>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Abonnement */}
        <Section
          title="Abonnement"
          description="Plan en cours et options du restaurant."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="tier">Plan</Label>
              <Select
                value={form.subscription_tier}
                onValueChange={(v) =>
                  updateField("subscription_tier", v as SubscriptionTier)
                }
              >
                <SelectTrigger id="tier" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {getTierLabel(t)} — {getTierPrice(t)}€/mois
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end gap-1">
              <p className="text-xs text-muted-foreground">Stripe Connect</p>
              <p className="text-sm font-medium">
                {restaurant.stripe_onboarding_complete
                  ? "Configure"
                  : "Non configure"}
              </p>
            </div>
          </div>
          <div className="mt-2 divide-y divide-border">
            <ToggleRow
              label="Restaurant actif"
              description="Visible et accessible par les clients."
              checked={form.is_active}
              onChange={(v) => updateField("is_active", v)}
            />
            <ToggleRow
              label="Accepte les commandes"
              description="Active la prise de commandes pendant les heures d'ouverture."
              checked={form.is_accepting_orders}
              onChange={(v) => updateField("is_accepting_orders", v)}
            />
            <ToggleRow
              label="Fidelite"
              checked={form.loyalty_enabled}
              onChange={(v) => updateField("loyalty_enabled", v)}
            />
            <ToggleRow
              label="Module stock — souscrit"
              checked={form.stock_module_active}
              onChange={(v) => updateField("stock_module_active", v)}
            />
            <ToggleRow
              label="Module stock — active"
              checked={form.stock_enabled}
              onChange={(v) => updateField("stock_enabled", v)}
            />
            <ToggleRow
              label="Livraison — souscrit"
              checked={form.delivery_addon_active}
              onChange={(v) => updateField("delivery_addon_active", v)}
            />
            <ToggleRow
              label="Livraison — activee"
              checked={form.delivery_enabled}
              onChange={(v) => updateField("delivery_enabled", v)}
            />
          </div>
        </Section>

        {/* Infos editables */}
        <Section title="Informations">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nom du restaurant</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telephone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="restaurant_type">Type de cuisine</Label>
              <Input
                id="restaurant_type"
                value={form.restaurant_type}
                onChange={(e) =>
                  updateField("restaurant_type", e.target.value)
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                value={form.siret}
                onChange={(e) => updateField("siret", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 mt-1.5 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              />
            </div>
          </div>
        </Section>

        {/* Proprietaire */}
        <Section title="Proprietaire">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-muted-foreground">Email</span>
              <span className="text-right text-sm font-medium">
                {restaurant.owner_email ? (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {restaurant.owner_email}
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Date d&apos;inscription
              </span>
              <span className="text-right text-sm font-medium">
                {new Date(restaurant.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </Section>

        {/* Horaires (read-only) */}
        <Section
          title="Horaires d'ouverture"
          description="Le restaurateur les modifie depuis son espace admin."
        >
          <div className="space-y-1 divide-y divide-border">
            {Object.entries(DAY_LABELS).map(([key, label]) => {
              const hours = restaurant.opening_hours?.[key];
              let display = "Ferme";
              if (hours) {
                if (Array.isArray(hours)) {
                  display = hours
                    .map((h) => `${h.open} - ${h.close}`)
                    .join(", ");
                } else if (
                  typeof hours === "object" &&
                  hours !== null &&
                  "open" in hours &&
                  "close" in hours
                ) {
                  const single = hours as { open: string; close: string };
                  display = `${single.open} - ${single.close}`;
                }
              }
              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2"
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {label}
                  </span>
                  <span className="text-sm font-medium">{display}</span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Link to admin view */}
        <Link
          href={`/admin/${form.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Ouvrir le dashboard admin de ce restaurant
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 md:bottom-6 md:left-auto md:right-6 md:max-w-md">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
            <p className="text-sm font-medium">
              Modifications non enregistrees
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setForm(toForm(restaurant))}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-1 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
