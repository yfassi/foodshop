"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gift, Percent, Plus, Trash2, Search, Check, ChevronsUpDown } from "lucide-react";
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

  const updateTier = (id: string, updates: Partial<LoyaltyTier>) => {
    onChange(
      tiers.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const removeTier = (id: string) => {
    onChange(tiers.filter((t) => t.id !== id));
  };

  const maxPoints = sorted.length > 0 ? sorted[sorted.length - 1].points : 100;

  return (
    <div className="space-y-5">
      {/* Visual progress bar */}
      {sorted.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Apercu des paliers
          </p>
          <div className="relative">
            {/* Track */}
            <div className="h-2 w-full rounded-full bg-muted" />
            {/* Filled track */}
            <div
              className="absolute left-0 top-0 h-2 rounded-full bg-primary/30"
              style={{ width: "100%" }}
            />
            {/* Milestones */}
            {sorted.map((tier, i) => {
              const pos = maxPoints > 0 ? (tier.points / maxPoints) * 100 : 0;
              return (
                <div
                  key={tier.id}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${Math.min(pos, 100)}%` }}
                >
                  <div className="flex h-6 w-6 -translate-y-2 items-center justify-center rounded-full border-2 border-primary bg-background text-[10px] font-bold text-primary shadow-sm">
                    {i + 1}
                  </div>
                  <div className="mt-1 whitespace-nowrap text-center">
                    <p className="text-xs font-bold text-foreground">
                      {tier.points} pts
                    </p>
                    <p className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                      {tier.label || "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Spacer for labels */}
          <div className="h-10" />
        </div>
      )}

      {/* Tier cards */}
      {sorted.map((tier, i) => (
        <div
          key={tier.id}
          className="rounded-xl border border-border bg-card p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <span className="text-sm font-semibold">
                Palier {i + 1}
              </span>
            </div>
            <button
              onClick={() => removeTier(tier.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Points */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Points requis</Label>
                <Input
                  type="number"
                  min={1}
                  value={tier.points}
                  onChange={(e) =>
                    updateTier(tier.id, {
                      points: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Equivalent en commandes</Label>
                <p className="flex h-9 items-center text-sm text-muted-foreground">
                  ~ {tier.points} EUR
                </p>
              </div>
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
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
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
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
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
                <Label className="text-xs">Montant de la réduction (EUR)</Label>
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
                      label: euros > 0 ? `${euros.toFixed(2)} EUR offerts` : tier.label,
                    });
                  }}
                  placeholder="5.00"
                  className="h-9 text-sm"
                />
              </div>
            )}

            {/* Label */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Description (visible par le client)
              </Label>
              <Input
                value={tier.label}
                onChange={(e) =>
                  updateTier(tier.id, { label: e.target.value })
                }
                placeholder="Ex: Boisson offerte, -5EUR sur la commande..."
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add tier */}
      <Button
        variant="outline"
        onClick={addTier}
        className="w-full"
        type="button"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter un palier
      </Button>
    </div>
  );
}
