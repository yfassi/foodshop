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
  Sparkle,
  AlertTriangle,
} from "lucide-react";
import type { LoyaltyTier } from "@/lib/types";
import { formatPrice } from "@/lib/format";

// TaapR brand palette (aligned with customer-facing account page)
const BRAND = {
  red: "#d7352d",
  redSoft: "#fbe8e6",
  redLight: "#f56e54",
  ink: "#1c1410",
  cream: "#fdf9f3",
  creamDeep: "#f0ebe1",
  border: "#dbd7d2",
  muted: "#68625e",
} as const;

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
        className="flex h-10 w-full items-center justify-between rounded-lg border border-[#dbd7d2] bg-white px-3 text-sm shadow-xs transition-colors hover:border-[#1c1410]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7352d]/40"
      >
        <span className={selectedProduct ? "text-[#1c1410]" : "text-[#a89e94]"}>
          {selectedProduct ? selectedProduct.name : "Choisir un article…"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#68625e]" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#dbd7d2] bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-[#dbd7d2] px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#68625e]" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article…"
              className="h-6 w-full bg-transparent text-sm outline-none placeholder:text-[#a89e94]"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[#68625e]">
                Aucun article trouvé
              </p>
            ) : (
              filtered.map((group) => (
                <div key={group.id}>
                  <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#a89e94]">
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
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#fdf9f3]"
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${value === p.id ? "text-[#d7352d]" : "text-transparent"}`}
                      />
                      <span className="flex-1 truncate text-[#1c1410]">{p.name}</span>
                      <span className="shrink-0 text-xs text-[#68625e]">
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
      <div className="rounded-2xl border border-dashed border-[#dbd7d2] bg-[#fdf9f3] p-7 text-center">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_0_18px_#d7352d4d]"
          style={{ backgroundColor: BRAND.red }}
        >
          <Sparkle className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-extrabold tracking-[-0.01em] text-[#1c1410]">
          Aucun palier configuré
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-[#68625e]">
          Récompensez vos clients fidèles avec des paliers de points.{" "}
          <span className="font-bold text-[#1c1410]">1 € dépensé = 1 point.</span>
          {" "}Choisissez un programme prêt à l&apos;emploi ou créez le vôtre.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.points)}
              className="group rounded-xl border border-[#dbd7d2] bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#d7352d] hover:shadow-[0_4px_18px_-6px_#d7352d4d]"
            >
              <p className="text-sm font-extrabold tracking-[-0.01em] text-[#1c1410]">
                {p.title}
              </p>
              <p className="mt-0.5 text-xs text-[#68625e]">{p.subtitle}</p>
              <p className="mt-2 font-mono text-[10px] text-[#a89e94]">
                {p.points.map((pt) => `${pt}pt`).join(" · ")}
              </p>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={addTier}
          className="mt-4 text-[#68625e]"
          type="button"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Ou ajouter un palier vide
        </Button>
      </div>
    );
  }

  const incompleteCount = sorted.filter((t) => tierIssue(t) !== null).length;

  return (
    <div className="space-y-4">
      {incompleteCount > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs">
            <p className="font-bold text-amber-900">
              {incompleteCount === 1
                ? "1 palier est incomplet"
                : `${incompleteCount} paliers sont incomplets`}
            </p>
            <p className="mt-0.5 text-amber-800/80">
              Tant qu&apos;un palier n&apos;a pas d&apos;article (ou de réduction)
              défini, vos clients verront « Article offert » sans pouvoir le réclamer.
            </p>
          </div>
        </div>
      )}

      {/* Visual progress bar — TaapR navy hero echoing customer view */}
      <div className="loyalty-card-bg overflow-hidden rounded-2xl px-5 py-5 text-[#f8f1e7]">
        <div className="mb-1 flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#d7352d]">
            Aperçu côté client
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-white/90">
            1 € = 1 pt
          </span>
        </div>
        <p className="mb-7 text-[11px] text-white/70">
          Progression visible dans « Mes points » de votre client.
        </p>

        <div className="relative pb-20 pt-9">
          {/* Track background */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: "100%",
                background: `linear-gradient(90deg, ${BRAND.red}, ${BRAND.redLight})`,
                opacity: 0.95,
              }}
            />
          </div>

          {/* Milestones */}
          {sorted.map((tier, i) => {
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
                <div
                  className="relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow-[0_0_14px_#d7352d66] ring-4 ring-[#1c1410]"
                  style={{ backgroundColor: BRAND.red }}
                >
                  {i + 1}
                  {issue && (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#1c1410] bg-amber-400 text-[#1c1410]"
                      title={issue}
                    >
                      <AlertTriangle className="h-2 w-2" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="mt-2.5 w-32 -translate-x-[calc(50%-0.875rem)] text-center">
                  <p className="font-mono text-[11px] font-extrabold text-white">
                    {tier.points} pts
                  </p>
                  <p
                    className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-white/65"
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
        const issue = tierIssue(tier);
        return (
          <div
            key={tier.id}
            className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${
              issue
                ? "border-amber-400"
                : "border-[#dbd7d2] hover:shadow-[0_4px_18px_-8px_#d7352d33]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0ebe1] bg-[#fdf9f3] px-4 py-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-9 w-9 place-items-center rounded-full font-mono text-[13px] font-extrabold text-white shadow-[0_0_12px_#d7352d4d]"
                  style={{ backgroundColor: BRAND.red }}
                >
                  {i + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold tracking-[-0.01em] text-[#1c1410]">
                      Palier {i + 1}
                    </span>
                    {issue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        À compléter
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#68625e]">
                    Atteint à{" "}
                    <span className="font-mono font-bold text-[#1c1410]">{tier.points} pts</span>
                    <span className="text-[#a89e94]"> · ≈ {tier.points} € dépensés</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeTier(tier.id)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#68625e] transition-colors hover:bg-red-50 hover:text-[#d7352d]"
                aria-label="Supprimer le palier"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {issue && (
              <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{issue}</span>
              </div>
            )}

            <div className="space-y-4 p-4">
              {/* Points */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#68625e]">
                  Seuil de points
                </Label>
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
                    className="h-10 border-[#dbd7d2] pr-12 font-mono text-sm focus-visible:ring-[#d7352d]/40"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#a89e94]">
                    pts
                  </span>
                </div>
                <p className="text-[11px] text-[#68625e]">
                  Débloqué après{" "}
                  <span className="font-bold text-[#1c1410]">{tier.points} €</span>{" "}
                  dépensés au total.
                </p>
              </div>

              {/* Reward type */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#68625e]">
                  Type de récompense
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateTier(tier.id, {
                        reward_type: "free_product",
                        discount_amount: undefined,
                      })
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition-all ${
                      tier.reward_type === "free_product"
                        ? "border-[#d7352d] bg-[#fbe8e6] text-[#d7352d] shadow-[inset_0_0_0_1px_#d7352d]"
                        : "border-[#dbd7d2] text-[#68625e] hover:border-[#1c1410]/30 hover:text-[#1c1410]"
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
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition-all ${
                      tier.reward_type === "discount"
                        ? "border-[#d7352d] bg-[#fbe8e6] text-[#d7352d] shadow-[inset_0_0_0_1px_#d7352d]"
                        : "border-[#dbd7d2] text-[#68625e] hover:border-[#1c1410]/30 hover:text-[#1c1410]"
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
                  <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#68625e]">
                    Article offert
                  </Label>
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
                  <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#68625e]">
                    Montant de la réduction
                  </Label>
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
                      className="h-10 border-[#dbd7d2] pr-8 font-mono text-sm focus-visible:ring-[#d7352d]/40"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#a89e94]">
                      €
                    </span>
                  </div>
                </div>
              )}

              {/* Label */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#68625e]">
                  Description{" "}
                  <span className="font-medium normal-case tracking-normal text-[#a89e94]">
                    (visible par le client)
                  </span>
                </Label>
                <Input
                  value={tier.label}
                  onChange={(e) =>
                    updateTier(tier.id, { label: e.target.value })
                  }
                  placeholder="Ex : Boisson offerte, -5 € sur la commande…"
                  className="h-10 border-[#dbd7d2] text-sm focus-visible:ring-[#d7352d]/40"
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Add tier */}
      <button
        type="button"
        onClick={addTier}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#dbd7d2] bg-transparent px-4 py-4 text-sm font-bold text-[#68625e] transition-all hover:border-[#d7352d] hover:bg-[#fbe8e6]/40 hover:text-[#d7352d]"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
        Ajouter un palier
      </button>
    </div>
  );
}
