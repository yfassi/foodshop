"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Restaurant } from "@/lib/types";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  Receipt,
  XCircle,
  Layers,
  Package,
  Clock,
  CreditCard,
  Store,
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function SuperAdminRestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRestaurant = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/super-admin/restaurants/${id}`);
    if (res.ok) {
      setRestaurant(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const toggleActive = async (is_active: boolean) => {
    if (!restaurant) return;
    setRestaurant({ ...restaurant, is_active });

    const res = await fetch("/api/super-admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: restaurant.id, is_active }),
    });

    if (!res.ok) {
      setRestaurant({ ...restaurant, is_active: !is_active });
      toast.error("Erreur lors de la mise a jour");
    } else {
      toast.success(is_active ? "Restaurant active" : "Restaurant desactive");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!restaurant) {
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

  const orderTypeLabels: Record<string, string> = {
    dine_in: "Sur place",
    takeaway: "A emporter",
  };

  const paymentLabels: Record<string, string> = {
    online: "En ligne",
    on_site: "Sur place",
  };

  return (
    <div className="px-4 py-6 md:px-6">
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
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-lg font-bold">
                  {restaurant.name}
                </h2>
                <Switch
                  checked={restaurant.is_active}
                  onCheckedChange={toggleActive}
                />
              </div>
              <a
                href={`/${restaurant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                /{restaurant.slug}
                <ExternalLink className="h-3 w-3" />
              </a>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    restaurant.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {restaurant.is_active ? "Actif" : "Inactif"}
                </span>
                {restaurant.is_accepting_orders && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    Accepte les commandes
                  </span>
                )}
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

        {/* Proprietaire */}
        <Section title="Proprietaire">
          <div className="space-y-1 divide-y divide-border">
            <InfoRow
              label="Email"
              value={
                restaurant.owner_email ? (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {restaurant.owner_email}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Date d'inscription"
              value={new Date(restaurant.created_at).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "long", year: "numeric" }
              )}
            />
          </div>
        </Section>

        {/* Infos restaurant */}
        <Section title="Informations">
          <div className="space-y-1 divide-y divide-border">
            {restaurant.description && (
              <InfoRow label="Description" value={restaurant.description} />
            )}
            <InfoRow
              label="Adresse"
              value={
                restaurant.address ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {restaurant.address}
                  </span>
                ) : null
              }
            />
            <InfoRow
              label="Telephone"
              value={
                restaurant.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {restaurant.phone}
                  </span>
                ) : null
              }
            />
            <InfoRow label="Type" value={restaurant.restaurant_type} />
            <InfoRow label="SIRET" value={restaurant.siret} />
            <InfoRow
              label="Types de commande"
              value={
                restaurant.order_types
                  ?.map((t) => orderTypeLabels[t] || t)
                  .join(", ") || "—"
              }
            />
            <InfoRow
              label="Paiements acceptes"
              value={
                restaurant.accepted_payment_methods
                  ?.map((m) => paymentLabels[m] || m)
                  .join(", ") || "—"
              }
            />
            <InfoRow
              label="Stripe"
              value={
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {restaurant.stripe_onboarding_complete
                    ? "Configure"
                    : "Non configure"}
                </span>
              }
            />
            <InfoRow
              label="Fidelite"
              value={restaurant.loyalty_enabled ? "Active" : "Desactive"}
            />
          </div>
        </Section>

        {/* Horaires */}
        <Section title="Horaires d'ouverture">
          <div className="space-y-1 divide-y divide-border">
            {Object.entries(DAY_LABELS).map(([key, label]) => {
              const hours = restaurant.opening_hours?.[key];
              let display = "Ferme";
              if (hours) {
                if (Array.isArray(hours)) {
                  display = hours
                    .map(
                      (h: { open: string; close: string }) =>
                        `${h.open} - ${h.close}`
                    )
                    .join(", ");
                } else if (
                  typeof hours === "object" &&
                  "open" in hours &&
                  "close" in hours
                ) {
                  display = `${(hours as { open: string; close: string }).open} - ${(hours as { open: string; close: string }).close}`;
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
          href={`/admin/${restaurant.slug}`}
          target="_blank"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Ouvrir le dashboard admin
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
