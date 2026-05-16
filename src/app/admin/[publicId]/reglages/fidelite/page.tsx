"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Gift,
  Plus,
  Trash2,
  Sparkles,
  Percent,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/ui/page-header";
import { UnsavedChangesBar } from "@/components/admin/ui/unsaved-changes-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Restaurant, LoyaltyTier, Product } from "@/lib/types";

interface FideliteDraft {
  loyaltyEnabled: boolean;
  tiers: LoyaltyTier[];
}

// Mock customer for the live phone preview — anchors the "you are here" arrow.
const MOCK_USER = { name: "Léa M.", points: 93 };

function makeId() {
  return `t_${Math.random().toString(36).slice(2, 10)}`;
}

function newTier(points: number): LoyaltyTier {
  return {
    id: makeId(),
    points,
    reward_type: "discount",
    discount_amount: 5,
    label: `${points} pts`,
  };
}

function countDiffs(a: FideliteDraft, b: FideliteDraft): number {
  let n = 0;
  if (a.loyaltyEnabled !== b.loyaltyEnabled) n++;
  if (JSON.stringify(a.tiers) !== JSON.stringify(b.tiers)) n++;
  return n;
}

// ────────────────────────────────────────────────────────────────────────────
// Hero card "Mon programme"
// ────────────────────────────────────────────────────────────────────────────

function HeroProgramme({
  enabled,
  onToggle,
  activeCount,
  redeemedCount,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  activeCount: number;
  redeemedCount: number;
}) {
  return (
    <section className="rounded-2xl border border-tint p-5 bg-[linear-gradient(135deg,rgba(215,53,45,0.10),rgba(215,53,45,0.04))]">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground">Mon programme</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} actif{activeCount > 1 ? "s" : ""} · {redeemedCount} récompenses échangées
          </p>
        </div>
        <div className="hidden items-center gap-4 sm:flex">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Actifs</p>
            <p className="text-base font-semibold tabular text-foreground">{activeCount}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Échanges</p>
            <p className="text-base font-semibold tabular text-foreground">{redeemedCount}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              enabled ? "status-success" : "border border-2-tk bg-bg-2 text-muted-foreground"
            )}
          >
            {enabled ? "Actif" : "Désactivé"}
          </span>
          <Switch checked={enabled} onCheckedChange={onToggle} className="scale-110" />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Timeline (horizontal stops)
// ────────────────────────────────────────────────────────────────────────────

function TierTimeline({
  tiers,
  selectedIdx,
  onSelect,
  onAdd,
}: {
  tiers: LoyaltyTier[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-2xl border border-2-tk bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Paliers de récompense{" "}
          <span className="ml-1 text-xs tabular text-muted-foreground">({tiers.length})</span>
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Palier
        </Button>
      </div>

      <div className="relative pb-2 pt-3">
        {/* Bar */}
        <div className="absolute left-6 right-6 top-9 h-[3px] rounded-full bg-bg-3" />
        <div className="relative flex items-start justify-between gap-2">
          {tiers.map((t, i) => {
            const active = i === selectedIdx;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelect(i)}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-card text-sm font-semibold transition-transform",
                    active
                      ? "border-brand-accent bg-brand-accent text-[color:var(--brand-accent-fg)] scale-105 shadow-md"
                      : "border-2-tk text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  )}
                >
                  {i + 1}
                </div>
                <p className="text-xs font-mono tabular text-foreground">{t.points} pts</p>
                <p className="line-clamp-1 max-w-[120px] text-center text-[11px] text-muted-foreground">
                  {t.label || (t.reward_type === "discount" ? `-${t.discount_amount}€` : t.product_name || "Article")}
                </p>
              </button>
            );
          })}
          {/* + add stub */}
          <button
            type="button"
            onClick={onAdd}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-2-tk text-muted-foreground hover:border-foreground/40 hover:text-foreground">
              <Plus className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Ajouter</p>
          </button>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tier editor card
// ────────────────────────────────────────────────────────────────────────────

function TierEditor({
  tier,
  index,
  products,
  onChange,
  onDelete,
}: {
  tier: LoyaltyTier;
  index: number;
  products: Product[];
  onChange: (next: LoyaltyTier) => void;
  onDelete: () => void;
}) {
  const eurEquivalent = (tier.points / 1).toFixed(0); // assume 1pt = 1€ spent

  return (
    <section className="rounded-2xl border border-2-tk bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tint text-[11px] font-semibold text-brand-accent">
            {index + 1}
          </span>
          Édition du palier {index + 1}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="t-points">Seuil (points)</Label>
          <Input
            id="t-points"
            type="number"
            min={1}
            value={tier.points}
            onChange={(e) => onChange({ ...tier, points: parseInt(e.target.value || "0", 10) })}
            className="font-mono tabular"
          />
        </div>
        <div>
          <Label>Équivalent dépensé</Label>
          <Input value={`~${eurEquivalent} €`} readOnly disabled className="font-mono tabular" />
        </div>
      </div>

      <div className="mt-4">
        <Label className="mb-2 block">Type de récompense</Label>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg-3 p-1">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...tier,
                reward_type: "free_product",
                discount_amount: undefined,
              })
            }
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors",
              tier.reward_type === "free_product"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" /> Article offert
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...tier,
                reward_type: "discount",
                product_id: undefined,
                product_name: undefined,
                discount_amount: tier.discount_amount ?? 5,
              })
            }
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors",
              tier.reward_type === "discount"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Percent className="h-3.5 w-3.5" /> Réduction
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {tier.reward_type === "discount" ? (
          <div>
            <Label htmlFor="t-amount">Montant (€)</Label>
            <Input
              id="t-amount"
              type="number"
              min={0}
              value={tier.discount_amount ?? 0}
              onChange={(e) =>
                onChange({ ...tier, discount_amount: parseFloat(e.target.value || "0") })
              }
              className="font-mono tabular"
            />
          </div>
        ) : (
          <div>
            <Label>Article offert</Label>
            <Select
              value={tier.product_id ?? ""}
              onValueChange={(v) => {
                const p = products.find((x) => x.id === v);
                onChange({
                  ...tier,
                  product_id: v,
                  product_name: p?.name,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un article…" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="t-label">Description visible client</Label>
          <Input
            id="t-label"
            value={tier.label ?? ""}
            onChange={(e) => onChange({ ...tier, label: e.target.value })}
            placeholder="Ex. Boisson offerte"
          />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Phone preview (live)
// ────────────────────────────────────────────────────────────────────────────

function tierLabel(t: LoyaltyTier): string {
  if (t.label && t.label.trim()) return t.label;
  if (t.reward_type === "discount") return `-${t.discount_amount ?? 0} €`;
  return t.product_name || "Article offert";
}

function PhonePreview({
  tiers,
  selectedIdx,
  restaurantName,
}: {
  tiers: LoyaltyTier[];
  selectedIdx: number;
  restaurantName: string;
}) {
  const selected = tiers[selectedIdx];
  const progress = selected ? Math.min(100, Math.round((MOCK_USER.points / selected.points) * 100)) : 0;
  const pointsLeft = selected ? Math.max(0, selected.points - MOCK_USER.points) : 0;

  return (
    <div className="sticky top-4 hidden w-[400px] shrink-0 self-start xl:block">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Aperçu côté client · Live
      </p>
      <div className="rounded-[36px] bg-[#111] p-3 shadow-xl">
        <div className="overflow-hidden rounded-[28px] bg-[#f8f1e7] p-5">
          {/* User header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white">
              {MOCK_USER.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1a1410]">{MOCK_USER.name}</p>
              <p className="truncate text-[11px] text-[#1a1410]/60">{restaurantName}</p>
            </div>
          </div>

          {/* Points card */}
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600">
              Mes points
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular text-[#1a1410]">
              {MOCK_USER.points} pts
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1a1410]/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {selected && pointsLeft > 0 && (
              <p className="mt-2 text-xs text-[#1a1410]/70">
                Plus que <span className="font-mono tabular font-semibold">{pointsLeft} pts</span>{" "}
                avant <span className="font-medium">{tierLabel(selected)}</span>
              </p>
            )}
            {selected && pointsLeft === 0 && (
              <p className="mt-2 text-xs font-medium text-rose-600">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Palier débloqué — échangez vos points !
              </p>
            )}
          </div>

          {/* Tier list */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#1a1410]/60">
            Paliers
          </p>
          <ul className="space-y-2">
            {tiers.map((t, i) => {
              const unlocked = MOCK_USER.points >= t.points;
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border bg-white px-3 py-2",
                    i === selectedIdx ? "border-rose-300 ring-1 ring-rose-200" : "border-[#1a1410]/10"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      unlocked
                        ? "bg-rose-600 text-white"
                        : "bg-[#1a1410]/10 text-[#1a1410]/40"
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        unlocked ? "text-[#1a1410]" : "text-[#1a1410]/50"
                      )}
                    >
                      {tierLabel(t)}
                    </p>
                    <p className="text-[10px] font-mono tabular text-[#1a1410]/60">
                      {t.points} pts
                    </p>
                  </div>
                  {unlocked && (
                    <button
                      type="button"
                      className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-semibold text-white"
                    >
                      Échanger
                    </button>
                  )}
                </li>
              );
            })}
            {tiers.length === 0 && (
              <li className="rounded-xl border border-dashed border-[#1a1410]/20 bg-white/40 px-3 py-4 text-center text-xs text-[#1a1410]/40">
                Ajoutez un palier pour voir l&apos;aperçu.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default function FidelitePage() {
  const params = useParams<{ publicId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [redeemedCount, setRedeemedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickIdx, setPickIdx] = useState(0);
  const [initial, setInitial] = useState<FideliteDraft | null>(null);
  const [draft, setDraft] = useState<FideliteDraft | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("public_id", params.publicId)
        .single<Restaurant>();
      if (data) {
        setRestaurant(data);
        const d: FideliteDraft = {
          loyaltyEnabled: data.loyalty_enabled ?? false,
          tiers: (data.loyalty_tiers as LoyaltyTier[]) ?? [],
        };
        setInitial(d);
        setDraft(d);

        // Fetch products (for "Article offert" picker)
        const { data: cats } = await supabase
          .from("categories")
          .select("id")
          .eq("restaurant_id", data.id);
        const catIds = (cats || []).map((c) => c.id);
        if (catIds.length > 0) {
          const { data: prods } = await supabase
            .from("products")
            .select("*")
            .in("category_id", catIds)
            .order("name", { ascending: true })
            .returns<Product[]>();
          setProducts(prods || []);
        }

        // Active / redeemed counts (best-effort, may be zero on fresh installs)
        const { count: active } = await supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", data.id);
        if (typeof active === "number") setActiveCount(active);

        const { count: redeemed } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", data.id)
          .gt("loyalty_discount_amount", 0);
        if (typeof redeemed === "number") setRedeemedCount(redeemed);
      }
      setLoading(false);
    };
    load();
  }, [params.publicId]);

  const diffCount = useMemo(() => {
    if (!draft || !initial) return 0;
    return countDiffs(draft, initial);
  }, [draft, initial]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!restaurant || !draft) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        loyalty_enabled: draft.loyaltyEnabled,
        loyalty_tiers: draft.tiers,
      })
      .eq("id", restaurant.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      setInitial(draft);
      toast.success("Fidélité enregistrée");
    }
    setSaving(false);
  }, [restaurant, draft]);

  // ── Tier helpers ─────────────────────────────────────────────────────────
  const addTier = () => {
    if (!draft) return;
    const lastPoints = draft.tiers.length > 0 ? draft.tiers[draft.tiers.length - 1].points : 0;
    const t = newTier(lastPoints + 50);
    const next = { ...draft, tiers: [...draft.tiers, t] };
    setDraft(next);
    setPickIdx(next.tiers.length - 1);
  };

  const updateTier = (idx: number, next: LoyaltyTier) => {
    if (!draft) return;
    setDraft({
      ...draft,
      tiers: draft.tiers.map((t, i) => (i === idx ? next : t)),
    });
  };

  const deleteTier = (idx: number) => {
    if (!draft) return;
    const next = draft.tiers.filter((_, i) => i !== idx);
    setDraft({ ...draft, tiers: next });
    setPickIdx(Math.max(0, idx - 1));
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading || !draft || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedTier = draft.tiers[pickIdx] ?? null;

  return (
    <div className="space-y-6 p-4 md:p-7">
      <PageHeader
        icon={<Gift className="h-5 w-5" />}
        eyebrow="Réglages"
        title="Fidélité"
        subtitle="Configurez les paliers de récompense pour vos clients."
      />

      <div className="flex gap-8 pb-24">
        <div className="min-w-0 flex-1 space-y-5">
          <HeroProgramme
            enabled={draft.loyaltyEnabled}
            onToggle={(v) => setDraft({ ...draft, loyaltyEnabled: v })}
            activeCount={activeCount}
            redeemedCount={redeemedCount}
          />

          {/* Rule card */}
          <section className="rounded-2xl border border-2-tk bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Règle d&apos;attribution</h3>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
              <div>
                <Label>Dépense (€)</Label>
                <Input value={1} readOnly disabled className="font-mono tabular" />
              </div>
              <div>
                <Label>Points gagnés</Label>
                <Input value={1} readOnly disabled className="font-mono tabular" />
              </div>
              <div>
                <Label>Validité</Label>
                <Input value="12 mois" readOnly disabled />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Règle fixe : 1 € dépensé = 1 point. Les points expirent après 12 mois sans activité.
            </p>
          </section>

          <TierTimeline
            tiers={draft.tiers}
            selectedIdx={pickIdx}
            onSelect={setPickIdx}
            onAdd={addTier}
          />

          {selectedTier ? (
            <TierEditor
              tier={selectedTier}
              index={pickIdx}
              products={products}
              onChange={(next) => updateTier(pickIdx, next)}
              onDelete={() => deleteTier(pickIdx)}
            />
          ) : (
            <section className="rounded-2xl border border-dashed border-2-tk bg-bg-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Ajoutez un premier palier pour commencer à configurer votre programme.
              </p>
            </section>
          )}
        </div>

        <PhonePreview tiers={draft.tiers} selectedIdx={pickIdx} restaurantName={restaurant.name} />
      </div>

      <UnsavedChangesBar
        count={diffCount}
        onCancel={() => initial && setDraft(initial)}
        onSave={save}
        saving={saving}
      />
    </div>
  );
}
