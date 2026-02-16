"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import type { Order } from "@/lib/types";
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  XCircle,
  Clock,
  Users,
  Sparkles,
  Flame,
  AlertTriangle,
  Trophy,
  Sun,
  Moon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Period = "today" | "7days" | "30days";

const PERIOD_TABS: { key: Period; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7days", label: "7 jours" },
  { key: "30days", label: "30 jours" },
];

function getStartDate(period: Period): Date {
  const d = new Date();
  if (period === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "7days") {
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/* ─── Metric card ─── */
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

export default function DashboardPage() {
  const params = useParams<{ slug: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const supabase = createClient();

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", params.slug)
        .single();

      if (!restaurant) {
        setLoading(false);
        return;
      }

      const startDate = getStartDate(period);

      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .returns<Order[]>();

      setOrders(data || []);
      setLoading(false);
    };

    fetchOrders();
  }, [params.slug, period]);

  /* ─── Computed metrics ─── */
  const metrics = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const revenue = valid.reduce((sum, o) => sum + o.total_price, 0);
    const avg = valid.length > 0 ? Math.round(revenue / valid.length) : 0;

    return {
      totalOrders: valid.length,
      revenue,
      avg,
      cancelled: cancelled.length,
    };
  }, [orders]);

  /* ─── Orders by hour ─── */
  const hourlyData = useMemo(() => {
    const completed = orders.filter(
      (o) => o.status === "done" || o.status === "preparing" || o.status === "ready" || o.status === "new"
    );
    const counts: Record<number, number> = {};
    for (let h = 8; h <= 23; h++) counts[h] = 0;

    for (const o of completed) {
      const hour = new Date(o.created_at).getHours();
      if (hour >= 8 && hour <= 23) {
        counts[hour] = (counts[hour] || 0) + 1;
      }
    }

    return Object.entries(counts).map(([h, count]) => ({
      hour: `${h}h`,
      commandes: count,
    }));
  }, [orders]);

  /* ─── Revenue by day (for 7d/30d) ─── */
  const dailyData = useMemo(() => {
    if (period === "today") return [];

    const completed = orders.filter((o) => o.status !== "cancelled");
    const byDay: Record<string, number> = {};

    const days = period === "7days" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      byDay[key] = 0;
    }

    for (const o of completed) {
      const key = new Date(o.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      if (key in byDay) {
        byDay[key] += o.total_price;
      }
    }

    return Object.entries(byDay).map(([date, cents]) => ({
      date,
      montant: Number((cents / 100).toFixed(2)),
    }));
  }, [orders, period]);

  /* ─── Top clients ─── */
  const topClients = useMemo(() => {
    const completed = orders.filter((o) => o.status !== "cancelled");
    const map = new Map<string, { orders: number; total: number }>();

    for (const o of completed) {
      const name = o.customer_info.name || o.display_order_number || "Anonyme";
      const prev = map.get(name) || { orders: 0, total: 0 };
      map.set(name, {
        orders: prev.orders + 1,
        total: prev.total + o.total_price,
      });
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [orders]);

  /* ─── AI Analysis ─── */
  const analysis = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    if (valid.length === 0) return null;

    // Product popularity
    const productCounts = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of valid) {
      for (const item of o.items) {
        const prev = productCounts.get(item.product_id) || { name: item.product_name, qty: 0, revenue: 0 };
        productCounts.set(item.product_id, {
          name: item.product_name,
          qty: prev.qty + item.quantity,
          revenue: prev.revenue + item.line_total,
        });
      }
    }
    const sortedProducts = Array.from(productCounts.values()).sort((a, b) => b.qty - a.qty);
    const topProducts = sortedProducts.slice(0, 5);
    const bottomProducts = sortedProducts.length > 2
      ? sortedProducts.slice(-3).reverse()
      : [];

    // Peak & slow hours
    const hourCounts: Record<number, number> = {};
    for (let h = 8; h <= 23; h++) hourCounts[h] = 0;
    for (const o of valid) {
      const h = new Date(o.created_at).getHours();
      if (h >= 8 && h <= 23) hourCounts[h]++;
    }
    const hourEntries = Object.entries(hourCounts)
      .map(([h, c]) => ({ hour: Number(h), count: c }))
      .filter((e) => e.count > 0);
    const peakHours = [...hourEntries].sort((a, b) => b.count - a.count).slice(0, 3);
    const slowHours = [...hourEntries].sort((a, b) => a.count - b.count).slice(0, 3);

    // Best clients
    const clientMap = new Map<string, { orders: number; total: number }>();
    for (const o of valid) {
      const name = o.customer_info.name || o.display_order_number || "Anonyme";
      const prev = clientMap.get(name) || { orders: 0, total: 0 };
      clientMap.set(name, { orders: prev.orders + 1, total: prev.total + o.total_price });
    }
    const bestClients = Array.from(clientMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { topProducts, bottomProducts, peakHours, slowHours, bestClients };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 text-xl font-bold">Tableau de bord</h2>

        {/* ─── Period toggle ─── */}
        <div className="no-scrollbar mb-6 flex gap-1">
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

        {/* ─── Metric cards ─── */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            icon={ShoppingBag}
            label="Commandes"
            value={String(metrics.totalOrders)}
          />
          <MetricCard
            icon={DollarSign}
            label="Chiffre d'affaires"
            value={formatPrice(metrics.revenue)}
          />
          <MetricCard
            icon={TrendingUp}
            label="Panier moyen"
            value={formatPrice(metrics.avg)}
          />
          <MetricCard
            icon={XCircle}
            label="Annulées"
            value={String(metrics.cancelled)}
          />
        </div>

        {/* ─── Charts ─── */}
        <div className={`mb-6 grid gap-4 ${period !== "today" ? "md:grid-cols-2" : ""}`}>
          {/* Orders by hour */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Commandes par heure</h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
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
                    dataKey="commandes"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by day (7d / 30d only) */}
          {period !== "today" && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">CA par jour</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}€`}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)} €`, "CA"]}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid var(--border)",
                        fontSize: "0.8rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="montant"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#colorMontant)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ─── Analyse IA ─── */}
        {analysis && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-bold">Analyse IA</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Top products */}
              {analysis.topProducts.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <h4 className="text-sm font-semibold">Articles populaires</h4>
                  </div>
                  <div className="space-y-2">
                    {analysis.topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600">
                            {i + 1}
                          </span>
                          <span className="font-medium">{p.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {p.qty} vendu{p.qty > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Least popular products */}
              {analysis.bottomProducts.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="text-sm font-semibold">À surveiller</h4>
                  </div>
                  <div className="space-y-2">
                    {analysis.bottomProducts.map((p) => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.qty} vendu{p.qty > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Peak hours */}
              {analysis.peakHours.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-500" />
                    <h4 className="text-sm font-semibold">Heures de pointe</h4>
                  </div>
                  <div className="space-y-2">
                    {analysis.peakHours.map((h) => (
                      <div key={h.hour} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{h.hour}h – {h.hour + 1}h</span>
                        <span className="text-xs text-muted-foreground">
                          {h.count} commande{h.count > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slow hours */}
              {analysis.slowHours.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-400" />
                    <h4 className="text-sm font-semibold">Heures creuses</h4>
                  </div>
                  <div className="space-y-2">
                    {analysis.slowHours.map((h) => (
                      <div key={h.hour} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{h.hour}h – {h.hour + 1}h</span>
                        <span className="text-xs text-muted-foreground">
                          {h.count} commande{h.count > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Best clients inside analysis */}
            {analysis.bestClients.length > 0 && (
              <div className="mt-4 rounded-xl bg-muted/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <h4 className="text-sm font-semibold">Meilleurs clients</h4>
                </div>
                <div className="space-y-2">
                  {analysis.bestClients.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-[10px] font-bold text-yellow-600">
                          {i + 1}
                        </span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({c.orders} cmd{c.orders > 1 ? "s" : ""})
                        </span>
                      </span>
                      <span className="text-xs font-semibold">{formatPrice(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Top clients ─── */}
        {topClients.length > 0 && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Top clients</h3>
            </div>
            <div className="divide-y divide-border">
              {topClients.map((client, i) => (
                <div
                  key={client.name}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.orders} commande{client.orders > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatPrice(client.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Order history ─── */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Historique des commandes</h3>

          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune commande sur cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">N°</th>
                    <th className="pb-2 pr-4 font-medium">Client</th>
                    <th className="hidden pb-2 pr-4 font-medium sm:table-cell">
                      Articles
                    </th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 pr-4 font-medium">Statut</th>
                    <th className="hidden pb-2 font-medium sm:table-cell">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                    <tr key={order.id} className="align-top">
                      <td className="py-2.5 pr-4 font-semibold">
                        {order.display_order_number ||
                          `#${order.order_number}`}
                      </td>
                      <td className="py-2.5 pr-4">
                        {order.customer_info.name}
                      </td>
                      <td className="hidden py-2.5 pr-4 sm:table-cell">
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {order.items
                            .map(
                              (item) =>
                                `${item.quantity}x ${item.product_name}`
                            )
                            .join(", ")}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-medium">
                        {formatPrice(order.total_price)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="hidden py-2.5 text-xs text-muted-foreground sm:table-cell">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
