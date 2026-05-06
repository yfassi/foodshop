"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Camera,
  Package,
  Plus,
  ScrollText,
  TrendingDown,
} from "lucide-react";
import type { Ingredient, DeliveryScan } from "@/lib/types";
import { cn } from "@/lib/utils";

const UNIT_LABEL: Record<string, string> = {
  kg: "kg",
  g: "g",
  l: "l",
  ml: "ml",
  piece: "u.",
};

function fmtQty(qty: number, unit: string) {
  const rounded =
    Math.abs(qty) >= 100
      ? Math.round(qty)
      : Math.round(qty * 100) / 100;
  return `${rounded} ${UNIT_LABEL[unit] || unit}`;
}

function levelPct(current: number, low: number) {
  // Heuristic: target = 5×threshold. If threshold=0, scale on max(current, 1).
  const target = low > 0 ? low * 5 : Math.max(current, 1);
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function statusOf(current: number, low: number) {
  if (low <= 0) return "ok" as const;
  if (current <= 0) return "crit" as const;
  if (current <= low) return "warn" as const;
  return "ok" as const;
}

export function StockDashboard({
  slug,
  restaurantId,
}: {
  slug: string;
  restaurantId: string;
}) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pendingScans, setPendingScans] = useState<DeliveryScan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [ing, sc] = await Promise.all([
      supabase
        .from("ingredients")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true })
        .returns<Ingredient[]>(),
      supabase
        .from("delivery_scans")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .returns<DeliveryScan[]>(),
    ]);
    setIngredients(ing.data || []);
    setPendingScans(sc.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
    const supabase = createClient();
    const channel = supabase
      .channel(`stock-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ingredients", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delivery_scans", filter: `restaurant_id=eq.${restaurantId}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, refresh]);

  const lows = ingredients.filter((i) => i.low_threshold > 0 && i.current_qty <= i.low_threshold);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
            ★ Inventaire live
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Stock</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/${slug}/stock/scan`}>
            <Button variant="outline" className="rounded-xl">
              <Camera className="mr-2 h-4 w-4" />
              Scanner un ticket
            </Button>
          </Link>
          <Link href={`/admin/${slug}/stock/ingredients`}>
            <Button className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un ingrédient
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warn"
          title="Sous le seuil"
          value={String(lows.length)}
          hint={lows.length === 0 ? "Tout va bien" : "À recommander"}
        />
        <DashboardCard
          icon={<Camera className="h-5 w-5" />}
          tone="info"
          title="Scans en attente"
          value={String(pendingScans.length)}
          hint={
            pendingScans.length === 0
              ? "Aucun ticket à valider"
              : "À valider"
          }
        />
        <DashboardCard
          icon={<Package className="h-5 w-5" />}
          tone="ok"
          title="Ingrédients suivis"
          value={String(ingredients.length)}
          hint="Au catalogue"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <p className="text-sm font-semibold">Inventaire</p>
            <Link
              href={`/admin/${slug}/stock/movements`}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Mouvements
            </Link>
          </div>
          <div className="hidden grid-cols-[2fr_1fr_2fr_auto] gap-4 border-b border-border bg-muted/30 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>Article</span>
            <span>Quantité</span>
            <span>Niveau</span>
            <span>Statut</span>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : ingredients.length === 0 ? (
            <div className="space-y-3 px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun ingrédient pour l&apos;instant.
              </p>
              <Link href={`/admin/${slug}/stock/ingredients`}>
                <Button size="sm" className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un ingrédient
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {ingredients.map((ing) => {
                const status = statusOf(ing.current_qty, ing.low_threshold);
                const pct = levelPct(ing.current_qty, ing.low_threshold);
                return (
                  <li
                    key={ing.id}
                    className="grid grid-cols-1 gap-2 px-5 py-3 md:grid-cols-[2fr_1fr_2fr_auto] md:items-center md:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{ing.name}</p>
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                        {(ing.category || "—") + " · " + (UNIT_LABEL[ing.unit] || ing.unit)}
                      </p>
                    </div>
                    <div className="font-mono text-sm tabular-nums">
                      {fmtQty(ing.current_qty, ing.unit)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            status === "warn" && "bg-amber-500",
                            status === "crit" && "bg-destructive",
                            status === "ok" && "bg-primary"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          status === "warn" && "bg-amber-100 text-amber-800",
                          status === "crit" && "bg-destructive/15 text-destructive",
                          status === "ok" && "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        {status === "warn" && <TrendingDown className="h-3 w-3" />}
                        {status === "crit"
                          ? "Rupture"
                          : status === "warn"
                          ? "Seuil bas"
                          : "OK"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardCard({
  icon,
  tone,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: "warn" | "info" | "ok";
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div
          className={cn(
            "mb-3 flex h-9 w-9 items-center justify-center rounded-lg",
            tone === "warn" && "bg-amber-100 text-amber-700",
            tone === "info" && "bg-primary/10 text-primary",
            tone === "ok" && "bg-emerald-100 text-emerald-700"
          )}
        >
          {icon}
        </div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
