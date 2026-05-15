"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Search, Users, Store, ArrowRight } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
  restaurants_owned: { id: string; name: string; slug: string }[];
  is_customer: boolean;
}

interface UsersPayload {
  users: UserRow[];
  counts: { total: number; owners: number; customers: number };
}

type Filter = "all" | "owner" | "customer";

export default function SuperAdminUsersPage() {
  const [data, setData] = useState<UsersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filter !== "all") params.set("role", filter);
    const res = await fetch(`/api/super-admin/users?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const tabs: { key: Filter; label: string; count: number | undefined }[] = [
    { key: "all", label: "Tous", count: data?.counts.total },
    { key: "owner", label: "Restaurateurs", count: data?.counts.owners },
    { key: "customer", label: "Clients finaux", count: data?.counts.customers },
  ];

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-lg font-bold">Utilisateurs</h2>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email, nom, restaurant..."
            className="h-11 pl-10"
          />
        </div>

        <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
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
              {typeof tab.count === "number" && (
                <span className="text-xs opacity-70">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !data || data.users.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun utilisateur trouve.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.users.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {(u.full_name?.charAt(0) || u.email.charAt(0)).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {u.full_name || u.email.split("@")[0]}
                      </p>
                      {u.restaurants_owned.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <Store className="h-3 w-3" />
                          Restaurateur
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        Inscrit le{" "}
                        {new Date(u.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      {u.last_sign_in_at && (
                        <span>
                          · Dernier login{" "}
                          {new Date(u.last_sign_in_at).toLocaleDateString(
                            "fr-FR"
                          )}
                        </span>
                      )}
                    </div>
                    {u.restaurants_owned.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {u.restaurants_owned.map((r) => (
                          <Link
                            key={r.id}
                            href={`/super-admin/restaurants/${r.id}`}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            {r.name}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        ))}
                      </div>
                    )}
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
