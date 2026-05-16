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
  TrendingUp,
  Award,
  Activity,
  Users as UsersIcon,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UnsavedChangesBar } from "@/components/admin/ui/unsaved-changes-bar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

// Ancres pour la table des matières (AnchorNav). L'ordre détermine l'affichage.
const SECTIONS = [
  { id: "statut", label: "Statut" },
  { id: "activite", label: "Activité" },
  { id: "regle", label: "Règle d'attribution" },
  { id: "paliers", label: "Paliers de récompense" },
];

interface FideliteDraft {
  loyaltyEnabled: boolean;
  tiers: LoyaltyTier[];
}

interface LoyaltyStats {
  enabled: boolean;
  totals: {
    active_members: number;
    points_earned: number;
    points_used: number;
    points_outstanding: number;
    redemptions: number;
    discount_amount: number;
  };
  recent_redemptions: Array<{
    order_id_display: string;
    customer_user_id: string | null;
    customer_name: string | null;
    points_used: number;
    discount_amount: number;
    tier_label: string;
    created_at: string;
  }>;
  top_redeemers: Array<{
    user_id: string;
    name: string;
    points_earned: number;
    points_used: number;
    points_balance: number;
    redemptions: number;
    total_spent: number;
  }>;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
// Loyalty insights — earn/use overview + recent redemptions + top redeemers
// ────────────────────────────────────────────────────────────────────────────

function LoyaltyInsights({ stats }: { stats: LoyaltyStats | null }) {
  if (!stats) return null;
  const { totals, recent_redemptions, top_redeemers } = stats;
  const noData =
    totals.active_members === 0 &&
    totals.points_earned === 0 &&
    totals.redemptions === 0;

  return (
    <section
      id="activite"
      className="scroll-mt-20 rounded-2xl border border-2-tk bg-card p-5 md:p-7"
    >
      <div className="mb-5 flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">
          Activité du programme
        </h2>
      </div>

      {/* KPIs — toujours visibles, version compacte */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiTile
          icon={<UsersIcon className="h-3.5 w-3.5" />}
          label="Membres actifs"
          value={String(totals.active_members)}
        />
        <KpiTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Points gagnés"
          value={totals.points_earned.toLocaleString("fr-FR")}
          mono
        />
        <KpiTile
          icon={<Gift className="h-3.5 w-3.5" />}
          label="Points utilisés"
          value={totals.points_used.toLocaleString("fr-FR")}
          mono
          accent={totals.points_used > 0}
        />
        <KpiTile
          icon={<Award className="h-3.5 w-3.5" />}
          label="En circulation"
          value={totals.points_outstanding.toLocaleString("fr-FR")}
          mono
          hint={
            totals.redemptions > 0
              ? `${totals.redemptions} échange${totals.redemptions > 1 ? "s" : ""} · ${formatPrice(totals.discount_amount)} offert${totals.redemptions > 1 ? "s" : ""}`
              : undefined
          }
        />
      </div>

      {noData ? (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Aucune activité fidélité enregistrée pour le moment. Les statistiques
          apparaîtront dès qu&apos;un client gagnera ou utilisera des points.
        </p>
      ) : (
        // Détails repliés par défaut pour épurer l'écran. L'opérateur déplie quand
        // il veut consulter les échanges récents ou le classement.
        <Accordion type="multiple" className="mt-4">
          <AccordionItem value="redemptions" className="border-b-0">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-medium">
                Échanges récents
                <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                  {recent_redemptions.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {recent_redemptions.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Aucun échange enregistré.
                </p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {recent_redemptions.map((r, i) => (
                    <li
                      key={`${r.order_id_display}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-bg-2/40 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {r.customer_name || "Client"}{" "}
                          <span className="text-muted-foreground">
                            · {r.order_id_display}
                          </span>
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.tier_label} · {formatDateTime(r.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs font-semibold tabular text-foreground">
                          −{r.points_used} pts
                        </p>
                        <p className="font-mono text-[11px] tabular text-rose-600">
                          −{formatPrice(r.discount_amount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="top" className="border-b-0">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-medium">
                Top utilisateurs
                <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[10px] tabular text-muted-foreground">
                  {top_redeemers.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {top_redeemers.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Aucun client n&apos;a encore échangé de points.
                </p>
              ) : (
                <ul className="space-y-1">
                  {top_redeemers.map((c, i) => (
                    <li
                      key={c.user_id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-bg-2/40 px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-[10px] font-bold text-brand-accent tabular">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {c.redemptions} échange{c.redemptions > 1 ? "s" : ""} ·{" "}
                            {formatPrice(c.total_spent)} dépensés
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs font-semibold tabular text-foreground">
                          {c.points_used} pts
                        </p>
                        <p className="text-[11px] tabular text-muted-foreground">
                          solde {c.points_balance}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </section>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        accent ? "border-tint bg-tint/40" : "border-2-tk bg-bg-2/40"
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold text-foreground",
          mono && "font-mono tabular"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hero card "Mon programme"
// ────────────────────────────────────────────────────────────────────────────

// Bandeau de statut épuré, aligné sur StatusBandeau d'établissement :
// pas de gradient, juste un fond teinté + indicateur clair + métriques compactes.
function StatusBandeau({
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
    <section
      id="statut"
      className={cn(
        "scroll-mt-20 rounded-2xl border p-5",
        enabled
          ? "border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20"
          : "border-2-tk bg-bg-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            enabled
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Gift className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Programme fidélité
          </p>
          <h2 className="text-base font-semibold text-foreground">
            {enabled ? "Actif" : "Désactivé"}
          </h2>
          {enabled && (
            <p className="mt-0.5 text-xs text-muted-foreground tabular">
              {activeCount} client{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""} · {redeemedCount} récompense{redeemedCount > 1 ? "s" : ""} échangée{redeemedCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label="Activer le programme fidélité"
        />
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Anchor nav (sticky right) — table des matières alignée sur Établissement
// ────────────────────────────────────────────────────────────────────────────

function AnchorNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) setActive(s.id);
          }
        },
        { rootMargin: "-30% 0px -50% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className="sticky top-4 hidden w-[180px] shrink-0 self-start md:block lg:w-[200px]">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sur cette page
      </p>
      <ul className="space-y-1">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "block border-l-2 px-3 py-1 text-xs transition-colors",
                active === s.id
                  ? "border-l-[color:var(--brand-accent)] text-foreground font-medium"
                  : "border-l-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
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
                aria-pressed={active}
                title={`Tier ${i + 1} — Dès ${t.points} pts`}
                className="group flex flex-1 cursor-pointer flex-col items-center gap-2"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-card text-sm font-semibold transition-all",
                    active
                      ? "border-brand-accent bg-brand-accent text-[color:var(--brand-accent-fg)] scale-105 shadow-md"
                      : "border-2-tk text-muted-foreground group-hover:scale-105 group-hover:border-foreground/40 group-hover:text-foreground"
                  )}
                >
                  {i + 1}
                </div>
                <p className="text-xs font-mono tabular text-foreground">Dès {t.points} pts</p>
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
    <aside className="sticky top-4 hidden w-[280px] shrink-0 self-start lg:block xl:w-[320px]">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Aperçu côté client
      </p>
      <div className="rounded-2xl border border-2-tk bg-bg-2/60 p-4">
        <div className="overflow-hidden rounded-xl bg-card p-4">
          {/* User header */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent text-sm font-semibold text-[color:var(--brand-accent-fg)]">
              {MOCK_USER.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{MOCK_USER.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{restaurantName}</p>
            </div>
          </div>

          {/* Points card */}
          <div className="mb-4 rounded-xl border border-2-tk bg-bg-2/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mes points
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular text-foreground">
              {MOCK_USER.points} pts
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-3">
              <div
                className="h-full rounded-full bg-brand-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {selected && pointsLeft > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Plus que <span className="font-mono tabular font-semibold text-foreground">{pointsLeft} pts</span>{" "}
                avant <span className="font-medium text-foreground">{tierLabel(selected)}</span>
              </p>
            )}
            {selected && pointsLeft === 0 && (
              <p className="mt-2 text-[11px] font-medium text-brand-accent">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Palier débloqué — échangez vos points !
              </p>
            )}
          </div>

          {/* Tier list */}
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Paliers
          </p>
          <ul className="space-y-1.5">
            {tiers.map((t, i) => {
              const unlocked = MOCK_USER.points >= t.points;
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                    i === selectedIdx
                      ? "border-[color:var(--brand-accent)] bg-tint/30"
                      : "border-2-tk bg-bg-2/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular",
                      unlocked
                        ? "bg-brand-accent text-[color:var(--brand-accent-fg)]"
                        : "bg-bg-3 text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        unlocked ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {tierLabel(t)}
                    </p>
                    <p className="text-[10px] font-mono tabular text-muted-foreground">
                      Dès {t.points} pts
                    </p>
                  </div>
                  {unlocked && (
                    <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-accent-fg)]">
                      Disponible
                    </span>
                  )}
                </li>
              );
            })}
            {tiers.length === 0 && (
              <li className="rounded-lg border border-dashed border-2-tk px-3 py-4 text-center text-xs text-muted-foreground">
                Ajoutez un palier pour voir l&apos;aperçu.
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
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
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
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

        // Loyalty aggregate stats (best-effort)
        try {
          const res = await fetch(
            `/api/admin/loyalty/stats?restaurant_public_id=${params.publicId}`
          );
          if (res.ok) {
            const json = (await res.json()) as LoyaltyStats;
            setStats(json);
          }
        } catch {
          // ignore — section just won't render
        }
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
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Réglages"
        icon={Gift}
        title="Fidélité"
        subtitle="Configurez les paliers de récompense pour vos clients."
      />

      <div className="flex gap-6 pb-24 lg:gap-8">
        <div className="min-w-0 flex-1 space-y-5">
          <StatusBandeau
            enabled={draft.loyaltyEnabled}
            onToggle={(v) => setDraft({ ...draft, loyaltyEnabled: v })}
            activeCount={activeCount}
            redeemedCount={redeemedCount}
          />

          <LoyaltyInsights stats={stats} />

          {/* Règle d'attribution */}
          <section
            id="regle"
            className="scroll-mt-20 rounded-2xl border border-2-tk bg-card p-5 md:p-7"
          >
            <h2 className="mb-5 text-base font-semibold text-foreground">
              Règle d&apos;attribution
            </h2>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_2fr]">
              <div className="space-y-2">
                <Label>Dépense (€)</Label>
                <Input value={1} readOnly disabled className="h-11 font-mono tabular" />
              </div>
              <div className="space-y-2">
                <Label>Points gagnés</Label>
                <Input value={1} readOnly disabled className="h-11 font-mono tabular" />
              </div>
              <div className="space-y-2">
                <Label>Validité</Label>
                <Input value="12 mois" readOnly disabled className="h-11" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Règle fixe : 1 € dépensé = 1 point. Les points expirent après 12 mois sans activité.
            </p>
          </section>

          {/* Paliers — timeline + éditeur dans une section unique */}
          <section
            id="paliers"
            className="scroll-mt-20 space-y-5"
          >
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
              <div className="rounded-2xl border border-dashed border-2-tk bg-bg-2 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Ajoutez un premier palier pour commencer à configurer votre programme.
                </p>
              </div>
            )}
          </section>
        </div>

        <PhonePreview tiers={draft.tiers} selectedIdx={pickIdx} restaurantName={restaurant.name} />

        <AnchorNav />
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
