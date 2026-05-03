"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatDate, getDateRange, type Period } from "@/lib/format";
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
  CalendarIcon,
  ChevronDown,
  BarChart3,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyH4, TypographyMuted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { canUseExportCsv } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";

/* ─── Period presets ─── */
const PERIOD_PRESETS: { key: Period; label: string; group: "quick" | "relative" | "rolling" }[] = [
  { key: "today", label: "Aujourd'hui", group: "quick" },
  { key: "yesterday", label: "Hier", group: "quick" },
  { key: "this_week", label: "Cette semaine", group: "relative" },
  { key: "last_week", label: "Semaine dernière", group: "relative" },
  { key: "this_month", label: "Ce mois", group: "relative" },
  { key: "last_month", label: "Mois dernier", group: "relative" },
  { key: "this_quarter", label: "Ce trimestre", group: "relative" },
  { key: "this_year", label: "Cette année", group: "relative" },
  { key: "7days", label: "7 derniers jours", group: "rolling" },
  { key: "30days", label: "30 derniers jours", group: "rolling" },
  { key: "90days", label: "90 derniers jours", group: "rolling" },
];

function getPeriodLabel(period: Period, customRange?: DateRange): string {
  if (period === "custom" && customRange?.from) {
    const fromStr = format(customRange.from, "d MMM", { locale: fr });
    const toStr = customRange.to
      ? format(customRange.to, "d MMM yyyy", { locale: fr })
      : format(customRange.from, "d MMM yyyy", { locale: fr });
    return customRange.to ? `${fromStr} – ${toStr}` : fromStr;
  }
  return PERIOD_PRESETS.find((p) => p.key === period)?.label ?? period;
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
      <TypographyMuted className="text-xs">{label}</TypographyMuted>
      {sub && <TypographyMuted className="mt-0.5 text-xs">{sub}</TypographyMuted>}
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams<{ publicId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantTier, setRestaurantTier] = useState<SubscriptionTier>("plat");

  // Effective date range
  const dateRange = useMemo(() => {
    if (period === "custom" && customRange?.from) {
      const start = new Date(customRange.from);
      start.setHours(0, 0, 0, 0);
      const end = customRange.to ? new Date(customRange.to) : new Date(customRange.from);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    return getDateRange(period);
  }, [period, customRange]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const supabase = createClient();

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, subscription_tier")
        .eq("public_id", params.publicId)
        .single();

      if (!restaurant) {
        setLoading(false);
        return;
      }

      setRestaurantId(restaurant.id);
      setRestaurantTier((restaurant.subscription_tier ?? "plat") as SubscriptionTier);

      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false })
        .returns<Order[]>();

      setOrders(data || []);
      setLoading(false);
    };

    fetchOrders();
  }, [params.publicId, dateRange]);

  const rangeDays = differenceInDays(dateRange.end, dateRange.start) + 1;
  const isMultiDay = rangeDays > 1;

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

  /* ─── Revenue by day (multi-day periods) ─── */
  const dailyData = useMemo(() => {
    if (!isMultiDay) return [];

    const completed = orders.filter((o) => o.status !== "cancelled");
    const byDay: Record<string, number> = {};

    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(dateRange.start);
      d.setDate(d.getDate() + i);
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
  }, [orders, isMultiDay, rangeDays, dateRange.start]);

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

  function handlePresetSelect(key: Period) {
    setPeriod(key);
    setCustomRange(undefined);
    setPopoverOpen(false);
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    setCustomRange(range);
    if (range?.from) {
      setPeriod("custom");
      // Close popover when both dates selected
      if (range.to) {
        setPopoverOpen(false);
      }
    }
  }

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
        <AdminPageHeader
          kicker="Pilotage"
          icon={BarChart3}
          title="Tableau de bord"
          subtitle={`${getPeriodLabel(period, customRange)} · ${metrics.totalOrders} commandes · ${formatPrice(metrics.revenue)}`}
          actions={
            <>
              {restaurantId && canUseExportCsv(restaurantTier) && (
                <ExportCsvButton
                  restaurantId={restaurantId}
                  type="orders"
                  label="Exporter"
                />
              )}
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start gap-2 text-left font-medium",
                  period === "custom" && !customRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{getPeriodLabel(period, customRange)}</span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
              <div className="flex flex-col sm:flex-row">
                {/* Preset list */}
                <div className="border-b border-border p-3 sm:w-44 sm:border-b-0 sm:border-r">
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Rapide
                  </p>
                  {PERIOD_PRESETS.filter((p) => p.group === "quick").map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handlePresetSelect(preset.key)}
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                        period === preset.key && period !== "custom"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <p className="mb-2 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Période
                  </p>
                  {PERIOD_PRESETS.filter((p) => p.group === "relative").map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handlePresetSelect(preset.key)}
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                        period === preset.key && period !== "custom"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}

                  <p className="mb-2 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Glissant
                  </p>
                  {PERIOD_PRESETS.filter((p) => p.group === "rolling").map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handlePresetSelect(preset.key)}
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                        period === preset.key && period !== "custom"
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Calendar */}
                <div className="p-3">
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Personnalisé
                  </p>
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={handleCalendarSelect}
                    numberOfMonths={1}
                    locale={fr}
                    disabled={{ after: new Date() }}
                    defaultMonth={customRange?.from ?? new Date()}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
            </>
          }
        />

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
        <div className={`mb-6 grid gap-4 ${isMultiDay ? "md:grid-cols-2" : ""}`}>
          {/* Orders by hour */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <TypographyH4>Commandes par heure</TypographyH4>
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

          {/* Revenue by day (multi-day only) */}
          {isMultiDay && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <TypographyH4>CA par jour</TypographyH4>
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
              <TypographyH3>Analyse IA</TypographyH3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Top products */}
              {analysis.topProducts.length > 0 && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <TypographyH4>Articles populaires</TypographyH4>
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
                    <TypographyH4>À surveiller</TypographyH4>
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
                    <Sun className="h-4 w-4 text-orange-500" />
                    <TypographyH4>Heures de pointe</TypographyH4>
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
                    <TypographyH4>Heures creuses</TypographyH4>
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
                  <Trophy className="h-4 w-4 text-orange-500" />
                  <TypographyH4>Meilleurs clients</TypographyH4>
                </div>
                <div className="space-y-2">
                  {analysis.bestClients.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600">
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
              <TypographyH4>Top clients</TypographyH4>
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
          <TypographyH4 className="mb-3">Historique des commandes</TypographyH4>

          {orders.length === 0 ? (
            <TypographyMuted className="py-8 text-center">
              Aucune commande sur cette période.
            </TypographyMuted>
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
