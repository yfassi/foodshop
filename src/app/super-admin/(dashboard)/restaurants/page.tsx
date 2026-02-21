"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Store,
  Search,
  ExternalLink,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

type Filter = "all" | "active" | "inactive";

interface RestaurantItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  is_accepting_orders: boolean;
  created_at: string;
  order_count: number;
  total_revenue: number;
}

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "active", label: "Actifs" },
  { key: "inactive", label: "Inactifs" },
];

export default function SuperAdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("filter", filter);
    const res = await fetch(`/api/super-admin/restaurants?${params}`);
    if (res.ok) {
      setRestaurants(await res.json());
    }
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchRestaurants, 300);
    return () => clearTimeout(timer);
  }, [fetchRestaurants]);

  const toggleActive = async (id: string, is_active: boolean) => {
    // Optimistic update
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active } : r))
    );

    const res = await fetch("/api/super-admin/restaurants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active }),
    });

    if (!res.ok) {
      // Revert
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !is_active } : r))
      );
      toast.error("Erreur lors de la mise a jour");
    } else {
      toast.success(is_active ? "Restaurant active" : "Restaurant desactive");
    }
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-lg font-bold">Restaurants</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou slug..."
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
        ) : restaurants.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Store className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun restaurant trouve.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Logo / Initial */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {r.logo_url ? (
                      <Image
                        src={r.logo_url}
                        alt={r.name}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {r.name}
                      </h3>
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(val) => toggleActive(r.id, val)}
                      />
                    </div>

                    <a
                      href={`/${r.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      /{r.slug}
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3 w-3" />
                        {r.order_count} commandes
                      </span>
                      <span>CA: {formatPrice(r.total_revenue)}</span>
                      <span>
                        {new Date(r.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {r.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detail link */}
                <Link
                  href={`/super-admin/restaurants/${r.id}`}
                  className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Voir les details
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
