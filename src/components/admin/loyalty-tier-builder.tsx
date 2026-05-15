"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Percent,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  Award,
  Medal,
  Trophy,
  Crown,
  Gem,
  Sparkles,
  Sparkle,
  AlertTriangle,
} from "lucide-react";
import type { LoyaltyTier } from "@/lib/types";
import { formatPrice } from "@/lib/format";

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  products: Product[];
}

type TierTheme = {
  name: string;
  Icon: typeof Award;
  hex: string;
  bgSoft: string;
  bgChip: string;
  border: string;
  text: string;
  ring: string;
  shadow: string;
};

const TIER_THEMES: TierTheme[] = [
  {
    name: "Bronze",
    Icon: Award,
    hex: "#d97706",
    bgSoft: "bg-amber-50 dark:bg-amber-950/30",
    bgChip: "bg-amber-100 dark:bg-amber-900/40",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400/40",
    shadow: "shadow-amber-200/40",
  },
  {
    name: "Argent",
    Icon: Medal,
    hex: "#64748b",
    bgSoft: "bg-slate-50 dark:bg-slate-900/40",
    bgChip: "bg-slate-100 dark:bg-slate-800",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-400/40",
    shadow: "shadow-slate-200/40",
  },
  {
    name: "Or",
    Icon: Trophy,
    hex: "#eab308",
    bgSoft: "bg-yellow-50 dark:bg-yellow-950/30",
    bgChip: "bg-yellow-100 dark:bg-yellow-900/40",
    border: "border-yellow-300 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-300",
    ring: "ring-yellow-400/40",
    shadow: "shadow-yellow-200/40",
  },
  {
    name: "Platine",
    Icon: Crown,
    hex: "#8b5cf6",
    bgSoft: "bg-violet-50 dark:bg-violet-950/30",
    bgChip: "bg-violet-100 dark:bg-violet-900/40",
    border: "border-violet-300 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-400/40",
    shadow: "shadow-violet-200/40",
  },
  {
    name: "Diamant",
    Icon: Gem,
    hex: "#06b6d4",
    bgSoft: "bg-cyan-50 dark:bg-cyan-950/30",
    bgChip: "bg-cyan-100 dark:bg-cyan-900/40",
    border: "border-cyan-300 dark:border-cyan-800",
    text: "text-cyan-700 dark:text-cyan-300",
    ring: "ring-cyan-400/40",
    shadow: "shadow-cyan-200/40",
  },
  {
    name: "Légende",
    Icon: Sparkles,
    hex: "#ec4899",
    bgSoft: "bg-pink-50 dark:bg-pink-950/30",
    bgChip: "bg-pink-100 dark:bg-pink-900/40",
    border: "border-pink-300 dark:border-pink-800",
    text: "text-pink-700 dark:text-pink-300",
    ring: "ring-pink-400/40",
    shadow: "shadow-pink-200/40",
  },
];

const themeFor = (index: number) =>
  TIER_THEMES[Math.min(index, TIER_THEMES.length - 1)];

function tierIssue(tier: LoyaltyTier): string | null {
  if (!tier.points || tier.points <= 0) {
    return "Définissez un seuil de points supérieur à 0.";
  }
  if (tier.reward_type === "free_product") {
    if (!tier.product_id) {
      return "Sélectionnez l'article offert. Sinon le client ne pourra pas réclamer la récompense.";
    }
  } else if (tier.reward_type === "discount") {
    if (!tier.discount_amount || tier.discount_amount <= 0) {
      return "Définissez un montant de réduction supérieur à 0 €.";
    }
  }
  return null;
}

function ProductSearchSelect({
  groups,
  value,
  onSelect,
}: {
  groups: CategoryGroup[];
  value: string | undefined;
  onSelect: (product: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = value
    ? groups.flatMap((g) => g.products).find((p) => p.id === value)
    : null;

  const query = search.toLowerCase();
  const filtered = groups
    .map((g) => ({
      ...g,
      products: g.products.filter((p) => p.name.toLowerCase().includes(query)),
    }))
    .filter((g) => g.products.length > 0);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className={selectedProduct ? "text-foreground" : "text-muted-foreground"}>
          {selectedProduct ? selectedProduct.name : "Choisir un article..."}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Aucun article trouvé
              </p>
            ) : (
              filtered.map((group) => (
                <div key={group.id}>
                  <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {group.name}
                  </p>
                  {group.products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelect(p);
                        setOpen(false);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50"
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${value === p.id ? "text-primary" : "text-transparent"}`}
                      />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatPrice(p.price)}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const PRESETS: {
  key: string;
  title: string;
  subtitle: string;
  points: number[];
}[] = [
  {
    key: "starter",
    title: "Démarrage",
    subtitle: "1 palier simple",
    points: [100],
  },
  {
    key: "classic",
    title: "Classique",
    subtitle: "3 paliers progressifs",
    points: [50, 150, 300],
  },
  {
    key: "premium",
    title: "Premium",
    subtitle: "5 paliers, fidélité longue",
    points: [50, 120, 250, 500, 1000],
  },
];

export function LoyaltyTierBuilder({
  restaurantId,
  tiers,
  onChange,
}: {
  restaurantId: string;
  tiers: LoyaltyTier[];
  onChange: (tiers: LoyaltyTier[]) => void;
}) {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient();
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_visible", true)
        .order("sort_order");

      if (!categories || categories.length === 0) return;

      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, category_id")
        .in("category_id", categories.map((c) => c.id))
        .eq("is_available", true)
        .order("name");

      if (products) {
        const groups: CategoryGroup[] = categories
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            products: products.filter((p) => p.category_id === cat.id),
          }))
          .filter((g) => g.products.length > 0);
        setCategoryGroups(groups);
      }
    };
    fetchProducts();
  }, [restaurantId]);

  const sorted = [...tiers].sort((a, b) => a.points - b.points);

  const addTier = () => {
    const maxPoints = sorted.length > 0 ? sorted[sorted.length - 1].points : 0;
    const newTier: LoyaltyTier = {
      id: crypto.randomUUID(),
      points: maxPoints + 50,
      reward_type: "free_product",
      label: "",
    };
    onChange([...tiers, newTier]);
  };

  const applyPreset = (points: number[]) => {
    onChange(
      points.map((p) => ({
        id: crypto.randomUUID(),
        points: p,
        reward_type: "free_product" as const,
        label: "",
      })),
    );
  };

  const updateTier = (id: string, updates: Partial<LoyaltyTier>) => {
    onChange(
      tiers.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  const removeTier = (id: string) => {
    onChange(tiers.filter((t) => t.id !== id));
  };

  const maxPoints = sorted.length > 0 ? sorted[sorted.length - 1].points : 100;

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkle className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold">Aucun palier configuré</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Récompensez vos clients fidèles avec des paliers de points. 1 € dépensé = 1 point.
          Choisissez un programme prêt à l&apos;emploi ou créez le vôtre.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.points)}
              className="group rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-primary/60 hover:shadow-sm"
            >
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.subtitle}</p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                {p.points.map((pt) => `${pt}pt`).join(" · ")}
              </p>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addTier}
          className="mt-3"
          type="button"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Ou ajouter un palier vide
        </Button>
      </div>
    );
  }

  // Build a multi-stop gradient that transitions through each tier color
  const gradientStops = sorted
    .map((tier, i) => {
      const pos = maxPoints > 0 ? (tier.points / maxPoints) * 100 : 0;
      return `${themeFor(i).hex} ${pos}%`;
    })
    .join(", ");
  const gradient =
    sorted.length === 1
      ? `linear-gradient(to right, ${themeFor(0).hex}, ${themeFor(0).hex})`
      : `linear-gradient(to right, ${gradientStops})`;

  const incompleteCount = sorted.filter((t) => tierIssue(t) !== null).length;

  return (
    <div className="space-y-4">
      {incompleteCount > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {incompleteCount === 1
                ? "1 palier est incomplet"
                : `${incompleteCount} paliers sont incomplets`}
            </p>
            <p className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
              Tant qu&apos;un palier n&apos;a pas d&apos;article (ou de réduction)
              défini, vos clients verront « Article offert » sans pouvoir le
              réclamer.
            </p>
          </div>
        </div>
      )}

      {/* Visual progress bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aperçu du parcours client
          </p>
          <span className="text-[10px] text-muted-foreground">
            1 € dépensé = 1 point
          </span>
        </div>
        <p className="mb-6 text-xs text-muted-foreground">
          Voici comment vos clients verront leur progression vers chaque récompense.
        </p>

        <div className="relative pb-20 pt-10">
          {/* Track background */}
          <div className="h-3 w-full rounded-full bg-muted" />
          {/* Filled gradient track */}
          <div
            className="absolute left-0 right-0 h-3 rounded-full"
            style={{ top: "2.5rem", background: gradient, opacity: 0.9 }}
          />

          {/* Milestones */}
          {sorted.map((tier, i) => {
            const theme = themeFor(i);
            const Icon = theme.Icon;
            const pos = maxPoints > 0 ? (tier.points / maxPoints) * 100 : 0;
            const clamped = Math.min(Math.max(pos, 0), 100);
            const issue = tierIssue(tier);
            const rewardLabel = issue
              ? "À configurer"
              : tier.label ||
                (tier.reward_type === "free_product"
                  ? tier.product_name
                    ? `${tier.product_name} offert`
                    : "Article offert"
                  : tier.discount_amount
                    ? `${(tier.discount_amount / 100).toFixed(2)} € offerts`
                    : "Réduction");

            return (
              <div
                key={tier.id}
                className="absolute -translate-x-1/2"
                style={{ left: `${clamped}%`, top: "1.5rem" }}
              >
                {/* Marker */}
                <div
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background ring-4 ${theme.ring} ${theme.border} shadow-md`}
                  style={{ color: theme.hex }}
                >
                  <Icon className="h-4 w-4" />
                  {issue && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-amber-500 text-white"
                      title={issue}
                    >
                      <AlertTriangle className="h-2 w-2" strokeWidth={3} />
                    </span>
                  )}
                </div>
                {/* Label below */}
                <div className="mt-2 w-32 -translate-x-[calc(50%-1.125rem)] text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.bgChip} ${theme.text}`}
                  >
                    {theme.name}
                  </span>
                  <p className="mt-1 text-xs font-bold text-foreground">
                    {tier.points} pts
                  </p>
                  <p
                    className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground"
                    title={rewardLabel}
                  >
                    {rewardLabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier cards */}
      {sorted.map((tier, i) => {
        const theme = themeFor(i);
        const Icon = theme.Icon;
        const issue = tierIssue(tier);
        return (
          <div
            key={tier.id}
            className={`overflow-hidden rounded-xl border bg-card ${
              issue ? "border-amber-400 dark:border-amber-700" : theme.border
            }`}
          >
            {/* Colored header */}
            <div
              className={`flex items-center justify-between border-b ${theme.border} ${theme.bgSoft} px-4 py-3`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${theme.border} bg-background`}
                  style={{ color: theme.hex }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      Palier {i + 1}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${theme.bgChip} ${theme.text}`}
                    >
                      {theme.name}
                    </span>
                    {issue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        À compléter
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Atteint à {tier.points} points
                    <span className="text-muted-foreground/60"> · ≈ {tier.points} € dépensés</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeTier(tier.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="Supprimer le palier"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {issue && (
              <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{issue}</span>
              </div>
            )}

            <div className="space-y-3 p-4">
              {/* Points */}
              <div className="space-y-1.5">
                <Label className="text-xs">Seuil de points</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={tier.points}
                    onChange={(e) =>
                      updateTier(tier.id, {
                        points: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-9 pr-12 text-sm"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    pts
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Le client débloque ce palier après avoir dépensé{" "}
                  <span className="font-medium text-foreground">{tier.points} €</span>
                  {" "}au total.
                </p>
              </div>

              {/* Reward type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Type de récompense</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateTier(tier.id, {
                        reward_type: "free_product",
                        discount_amount: undefined,
                      })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      tier.reward_type === "free_product"
                        ? `${theme.border} ${theme.bgChip} ${theme.text}`
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <Gift className="h-3.5 w-3.5" />
                    Article offert
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateTier(tier.id, {
                        reward_type: "discount",
                        product_id: undefined,
                        product_name: undefined,
                      })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      tier.reward_type === "discount"
                        ? `${theme.border} ${theme.bgChip} ${theme.text}`
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    <Percent className="h-3.5 w-3.5" />
                    Réduction
                  </button>
                </div>
              </div>

              {/* Reward config */}
              {tier.reward_type === "free_product" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Article offert</Label>
                  <ProductSearchSelect
                    groups={categoryGroups}
                    value={tier.product_id}
                    onSelect={(product) => {
                      updateTier(tier.id, {
                        product_id: product.id,
                        product_name: product.name,
                        label: `${product.name} offert`,
                      });
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Montant de la réduction</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={
                        tier.discount_amount != null
                          ? tier.discount_amount / 100
                          : ""
                      }
                      onChange={(e) => {
                        const euros = parseFloat(e.target.value) || 0;
                        updateTier(tier.id, {
                          discount_amount: Math.round(euros * 100),
                          label:
                            euros > 0
                              ? `${euros.toFixed(2)} € offerts`
                              : tier.label,
                        });
                      }}
                      placeholder="5.00"
                      className="h-9 pr-8 text-sm"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      €
                    </span>
                  </div>
                </div>
              )}

              {/* Label */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Description{" "}
                  <span className="text-muted-foreground">
                    (visible par le client)
                  </span>
                </Label>
                <Input
                  value={tier.label}
                  onChange={(e) =>
                    updateTier(tier.id, { label: e.target.value })
                  }
                  placeholder="Ex: Boisson offerte, -5 € sur la commande..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Add tier */}
      <Button
        variant="outline"
        onClick={addTier}
        className="w-full border-dashed"
        type="button"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter un palier
      </Button>
    </div>
  );
}
