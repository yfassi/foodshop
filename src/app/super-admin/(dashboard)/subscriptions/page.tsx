"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import {
  getTierLabel,
  getTierPrice,
  normalizeTier,
  TIER_ORDER,
} from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";
import {
  CreditCard,
  Search,
  ArrowRight,
  Bike,
  Package,
  AlertCircle,
} from "lucide-react";

interface SubscriptionRow {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  is_active: boolean;
  subscription_tier: SubscriptionTier;
  delivery_addon_active: boolean;
  stock_module_active: boolean;
  verification_status: string;
  stripe_onboarding_complete: boolean;
  created_at: string;
}

interface SubscriptionsPayload {
  restaurants: SubscriptionRow[];
  summary: {
    total_mrr: number;
    tier_counts: Record<SubscriptionTier, number>;
    total_active: number;
    total_restaurants: number;
  };
}

type Filter = "all" | SubscriptionTier;

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  ...TIER_ORDER.map((t) => ({ key: t, label: getTierLabel(t) })),
];

export default function SuperAdminSubscriptionsPage() {
  const [data, setData] = useState<SubscriptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/subscriptions");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateTier = async (id: string, tier: SubscriptionTier) => {
    if (!data) return;
    const prev = data.restaurants.find((r) => r.id === id);
    if (!prev) return;

    setData({
      ...data,
      restaurants: data.restaurants.map((r) =>
        r.id === id ? { ...r, subscription_tier: tier } : r
      ),
    });

    const res = await fetch("/api/super-admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, subscription_tier: tier }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Erreur lors du changement de plan");
      // refetch to recover state
      fetchData();
      return;
    }

    toast.success(`Plan change vers ${getTierLabel(tier)}`);
    // recompute MRR by refetching
    fetchData();
  };

  const filtered = (data?.restaurants ?? []).filter((r) => {
    if (filter !== "all" && r.subscription_tier !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      r.slug.toLowerCase().includes(s) ||
      (r.owner_email ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-lg font-bold">Abonnements</h2>

        {/* Summary */}
        {data && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">MRR estime</p>
              <p className="mt-1 text-2xl font-bold">
                {formatPrice(data.summary.total_mrr * 100)}
              </p>
              <p className="text-xs text-muted-foreground">
                sur {data.summary.total_active} restaurants actifs
              </p>
            </div>
            {TIER_ORDER.map((t) => (
              <div
                key={t}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">
                  {getTierLabel(t)}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {data.summary.tier_counts[t] || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getTierPrice(t)}€/mois ·{" "}
                  {formatPrice(
                    (data.summary.tier_counts[t] || 0) * getTierPrice(t) * 100
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, slug, email..."
            className="h-11 pl-10"
          />
        </div>

        {/* Filters */}
        <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <CreditCard className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun abonnement trouve.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {r.name}
                      </h3>
                      {!r.is_active && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Inactif
                        </span>
                      )}
                      {r.verification_status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <AlertCircle className="h-3 w-3" />
                          KBIS en attente
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.owner_email || "—"} · /{r.slug}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {r.delivery_addon_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                          <Bike className="h-3 w-3" />
                          Livraison
                        </span>
                      )}
                      {r.stock_module_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                          <Package className="h-3 w-3" />
                          Stock
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                          r.stripe_onboarding_complete
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-muted"
                        }`}
                      >
                        Stripe{" "}
                        {r.stripe_onboarding_complete ? "OK" : "non configure"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={r.subscription_tier}
                      onValueChange={(v) =>
                        updateTier(r.id, v as SubscriptionTier)
                      }
                    >
                      <SelectTrigger className="h-9 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIER_ORDER.map((t) => (
                          <SelectItem key={t} value={t}>
                            {getTierLabel(t)} — {getTierPrice(t)}€
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Link
                      href={`/super-admin/restaurants/${r.id}`}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Voir le detail"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
