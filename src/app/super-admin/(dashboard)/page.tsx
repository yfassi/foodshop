"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  Store,
  CheckCircle,
  ShoppingBag,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = "today" | "7days" | "30days";

interface Stats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  recentRestaurants: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    is_active: boolean;
  }[];
  ordersByDay: { date: string; count: number; revenue: number }[];
}

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7days", label: "7 jours" },
  { key: "30days", label: "30 jours" },
];

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/super-admin/stats?period=${period}`);
    if (res.ok) {
      setStats(await res.json());
    }
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-lg font-bold">Tableau de bord</h2>

        {/* Period toggle */}
        <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                period === tab.key
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
        ) : stats ? (
          <>
            {/* Metrics */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                icon={Store}
                label="Total restaurants"
                value={String(stats.totalRestaurants)}
              />
              <MetricCard
                icon={CheckCircle}
                label="Restaurants actifs"
                value={String(stats.activeRestaurants)}
              />
              <MetricCard
                icon={ShoppingBag}
                label="Commandes"
                value={String(stats.totalOrders)}
              />
              <MetricCard
                icon={DollarSign}
                label="Chiffre d'affaires"
                value={formatPrice(stats.totalRevenue)}
              />
            </div>

            {/* Chart */}
            {stats.ordersByDay.length > 0 && (
              <div className="mb-6 rounded-2xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  Commandes par jour
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.ordersByDay}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "0.75rem",
                          border: "1px solid var(--border)",
                          fontSize: "0.8rem",
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Commandes"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent restaurants */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Derniers restaurants inscrits
                </h3>
                <Link
                  href="/super-admin/restaurants"
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Voir tout
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {stats.recentRestaurants.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun restaurant pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.recentRestaurants.map((r) => (
                    <Link
                      key={r.id}
                      href={`/super-admin/restaurants/${r.id}`}
                      className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          /{r.slug}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {r.is_active ? "Actif" : "Inactif"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
