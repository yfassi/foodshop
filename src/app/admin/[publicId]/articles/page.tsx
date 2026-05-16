"use client";

import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  GripVertical,
  ImageIcon,
  ChevronRight,
  UtensilsCrossed,
  Layers,
  Copy,
  Sparkles,
  Settings2,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import { CATEGORY_ICONS, getCategoryIcon } from "@/lib/category-icons";
import type { Category, Product } from "@/lib/types";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProductFormSheet } from "@/components/admin/product-form-sheet";
import { PageHeader } from "@/components/admin/ui/page-header";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { UnsavedChangesBar } from "@/components/admin/ui/unsaved-changes-bar";

type CategoryWithProducts = Category & { products: Product[] };

// Stable wrapper for category icons. Resolves the dynamic Lucide component from
// a string key via createElement so we don't trip the static-components rule.
function CategoryIconBox({ iconKey, className }: { iconKey: string | null; className?: string }) {
  return createElement(getCategoryIcon(iconKey), {
    className: className ?? "h-4 w-4 shrink-0 text-muted-foreground",
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Data layer (Supabase + REST helpers)
// ────────────────────────────────────────────────────────────────────────────

async function apiCategory(method: "POST" | "PUT" | "DELETE", body: object) {
  const res = await fetch("/api/admin/categories", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => null);
    throw new Error(e?.error || "Erreur réseau");
  }
  return res.json();
}

async function apiProductUpdate(body: object) {
  const res = await fetch("/api/admin/products", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => null);
    throw new Error(e?.error || "Erreur réseau");
  }
  return res.json();
}

// ────────────────────────────────────────────────────────────────────────────
// Category pane (left, 240px)
// ────────────────────────────────────────────────────────────────────────────

function SortableCategoryRow({
  category,
  active,
  onSelect,
  onToggleVisibility,
  onEdit,
  onDelete,
}: {
  category: CategoryWithProducts;
  active: boolean;
  onSelect: () => void;
  onToggleVisibility: (visible: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-2 transition-colors",
        active
          ? "border-tint bg-tint border-l-4 border-l-[color:var(--brand-accent)]"
          : "hover:bg-bg-3"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-foreground active:cursor-grabbing"
        aria-label="Glisser pour réordonner"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <CategoryIconBox iconKey={category.icon} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          category.is_visible ? "text-foreground" : "text-muted-foreground/60 line-through"
        )}
      >
        {category.name}
      </span>
      <span className="shrink-0 text-xs tabular text-muted-foreground">
        {category.products.length}
      </span>
      <div
        className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <Switch
          checked={category.is_visible}
          onCheckedChange={onToggleVisibility}
          aria-label="Visibilité catégorie"
        />
        <button
          type="button"
          onClick={onEdit}
          aria-label="Renommer la catégorie"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer la catégorie"
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Article row (pane 2)
// ────────────────────────────────────────────────────────────────────────────

function ArticleRow({
  product,
  active,
  onSelect,
  onToggleAvailability,
}: {
  product: Product;
  active: boolean;
  onSelect: () => void;
  onToggleAvailability: (available: boolean) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-2-tk px-3 py-2.5 transition-colors",
        active ? "bg-tint" : "hover:bg-bg-3"
      )}
    >
      {product.image_url ? (
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
          <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="44px" />
        </div>
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-3">
          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            product.is_available ? "text-foreground" : "text-muted-foreground line-through"
          )}
        >
          {product.name}
        </p>
        <p className="truncate text-xs text-muted-foreground tabular">
          {formatPrice(product.price)}
        </p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={product.is_available}
          onCheckedChange={onToggleAvailability}
          aria-label="Disponibilité"
        />
      </div>
      {active && <ChevronRight className="h-4 w-4 shrink-0 text-brand-accent" />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Inline editor (pane 3)
// ────────────────────────────────────────────────────────────────────────────

type EditorDraft = {
  name: string;
  description: string;
  priceEuros: string;
  is_available: boolean;
  is_featured: boolean;
};

function productToDraft(p: Product): EditorDraft {
  return {
    name: p.name,
    description: p.description ?? "",
    priceEuros: ((p.price ?? 0) / 100).toFixed(2),
    is_available: p.is_available,
    is_featured: p.is_featured ?? false,
  };
}

function draftToPayload(d: EditorDraft) {
  const priceCents = Math.round(parseFloat(d.priceEuros.replace(",", ".")) * 100);
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    price: Number.isFinite(priceCents) ? priceCents : 0,
    is_available: d.is_available,
    is_featured: d.is_featured,
  };
}

type EditorGroup = {
  id: string;
  source: "own" | "shared";
  name: string;
  min: number;
  max: number;
  option_count: number;
};

async function fetchProductGroups(productId: string): Promise<EditorGroup[]> {
  const supabase = createClient();
  const [own, links] = await Promise.all([
    supabase
      .from("modifier_groups")
      .select("id, name, min_select, max_select, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_shared_groups")
      .select("shared_group_id, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
  ]);

  const ownGroups = (own.data ?? []) as Array<{
    id: string;
    name: string;
    min_select: number;
    max_select: number;
  }>;
  const ownIds = ownGroups.map((g) => g.id);
  const sharedIds = ((links.data ?? []) as Array<{ shared_group_id: string }>).map(
    (l) => l.shared_group_id
  );

  // Get option counts in parallel
  const [{ data: ownMods }, { data: shared }, { data: sharedMods }] = await Promise.all([
    ownIds.length > 0
      ? supabase.from("modifiers").select("group_id").in("group_id", ownIds)
      : Promise.resolve({ data: [] as Array<{ group_id: string }> }),
    sharedIds.length > 0
      ? supabase
          .from("shared_modifier_groups")
          .select("id, name, min_select, max_select")
          .in("id", sharedIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            name: string;
            min_select: number;
            max_select: number;
          }>,
        }),
    sharedIds.length > 0
      ? supabase
          .from("shared_modifiers")
          .select("group_id")
          .in("group_id", sharedIds)
      : Promise.resolve({ data: [] as Array<{ group_id: string }> }),
  ]);

  const ownCountByGroup = new Map<string, number>();
  for (const m of ownMods ?? []) {
    ownCountByGroup.set(m.group_id, (ownCountByGroup.get(m.group_id) ?? 0) + 1);
  }
  const sharedCountByGroup = new Map<string, number>();
  for (const m of sharedMods ?? []) {
    sharedCountByGroup.set(
      m.group_id,
      (sharedCountByGroup.get(m.group_id) ?? 0) + 1
    );
  }

  const sharedById = new Map(
    (shared ?? []).map((g) => [g.id, g])
  );

  const out: EditorGroup[] = [];
  for (const g of ownGroups) {
    out.push({
      id: g.id,
      source: "own",
      name: g.name,
      min: g.min_select,
      max: g.max_select,
      option_count: ownCountByGroup.get(g.id) ?? 0,
    });
  }
  for (const id of sharedIds) {
    const g = sharedById.get(id);
    if (!g) continue;
    out.push({
      id: g.id,
      source: "shared",
      name: g.name,
      min: g.min_select,
      max: g.max_select,
      option_count: sharedCountByGroup.get(id) ?? 0,
    });
  }
  return out;
}

function ArticleEditor({
  product,
  category,
  restaurantId,
  onApplied,
  onAdvancedEdit,
  onDuplicated,
  onDeleted,
}: {
  product: Product;
  category: Category | null;
  restaurantId: string;
  onApplied: (next: Product) => void;
  onAdvancedEdit: () => void;
  onDuplicated: () => void;
  onDeleted: () => void;
}) {
  const initial = useMemo(() => productToDraft(product), [product]);
  const [draft, setDraft] = useState<EditorDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [groups, setGroups] = useState<EditorGroup[] | null>(null);

  // Reset draft when product changes
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  // Fetch modifier groups for the current product
  useEffect(() => {
    let cancelled = false;
    setGroups(null);
    fetchProductGroups(product.id)
      .then((g) => {
        if (!cancelled) setGroups(g);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const changed = useMemo(() => {
    return (
      draft.name !== initial.name ||
      draft.description !== initial.description ||
      draft.priceEuros !== initial.priceEuros ||
      draft.is_available !== initial.is_available ||
      draft.is_featured !== initial.is_featured
    );
  }, [draft, initial]);

  const saveDraft = async () => {
    if (!changed) return;
    setSaving(true);
    try {
      const payload = draftToPayload(draft);
      await apiProductUpdate({
        id: product.id,
        restaurant_id: restaurantId,
        ...payload,
      });
      onApplied({
        ...product,
        ...payload,
      });
      toast.success("Article enregistré");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    setDuplicating(true);
    try {
      const supabase = createClient();
      const payload = draftToPayload(draft);
      const { error } = await supabase.from("products").insert({
        name: `${payload.name} (copie)`,
        description: payload.description,
        price: payload.price,
        category_id: product.category_id,
        image_url: product.image_url,
        is_available: payload.is_available,
        is_featured: false,
        sort_order: (product.sort_order ?? 0) + 1,
      });
      if (error) throw error;
      toast.success("Article dupliqué");
      onDuplicated();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la duplication";
      toast.error(msg);
    } finally {
      setDuplicating(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const supabase = createClient();
      if (product.image_url) {
        const pathMatch = product.image_url.split("/product-images/")[1]?.split("?")[0];
        if (pathMatch) {
          await supabase.storage.from("product-images").remove([pathMatch]);
        }
      }
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast.success("Article supprimé");
      onDeleted();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la suppression";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      {/* Breadcrumb header — mockup-style */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-2-tk px-4 py-3 md:px-6 md:py-4">
        <nav
          aria-label="Fil d'ariane"
          className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span>Articles</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate text-foreground">
            {category?.name ? `${category.name} · ` : ""}
            <span className="font-semibold">{draft.name || "Sans nom"}</span>
          </span>
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              draft.is_available
                ? "status-success border-transparent"
                : "border-2-tk bg-bg-2 text-muted-foreground"
            )}
          >
            {draft.is_available ? "Disponible" : "Indisponible"}
          </span>
          <button
            type="button"
            onClick={duplicate}
            disabled={duplicating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-bg-3 disabled:opacity-50"
            title="Dupliquer l'article"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dupliquer</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Supprimer l'article"
            title="Supprimer l'article"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-2-tk bg-card text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-5 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        {/* Hero: image + name + meta + Modifier */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onAdvancedEdit}
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-2-tk bg-bg-3 sm:h-28 sm:w-28"
            title="Modifier l'image"
          >
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-transparent transition-colors group-hover:bg-black/30 group-hover:text-white">
              Modifier
            </span>
          </button>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <Label htmlFor="art-name" className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                Nom de l&apos;article
              </Label>
              <Input
                id="art-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nom de l'article"
                className="mt-1.5 h-11 text-base font-semibold"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, is_featured: !draft.is_featured })}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  draft.is_featured
                    ? "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                    : "border-2-tk bg-bg-2 text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3" />
                {draft.is_featured ? "Top vente" : "Marquer top vente"}
              </button>
              <span className="text-muted-foreground/60">
                SKU&nbsp;:&nbsp;
                <span className="font-mono tabular text-muted-foreground">
                  {product.id.slice(0, 8).toUpperCase()}
                </span>
              </span>
              <button
                type="button"
                onClick={onAdvancedEdit}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-bg-3"
              >
                <Pencil className="h-3 w-3" /> Modifier
              </button>
            </div>

            <div>
              <Label
                htmlFor="art-desc"
                className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                Description
              </Label>
              <textarea
                id="art-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Description courte affichée au client"
                rows={2}
                className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Prix & disponibilité — 2x2 grid like the mockup */}
        <section className="rounded-2xl border border-2-tk bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Prix &amp; disponibilité
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="art-price"
                className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                Prix de vente
              </Label>
              <div className="relative">
                <Input
                  id="art-price"
                  inputMode="decimal"
                  value={draft.priceEuros}
                  onChange={(e) => setDraft({ ...draft, priceEuros: e.target.value })}
                  className="h-11 pr-10 font-mono tabular text-base"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Prix barré (optionnel)
              </Label>
              <Input
                value="—"
                readOnly
                disabled
                title="Bientôt disponible — comparez le prix barré à votre prix de vente"
                className="h-11 font-mono tabular text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Stock
              </Label>
              <Input
                value="Illimité"
                readOnly
                disabled
                title="Géré via le module Stock"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                TVA
              </Label>
              <Input
                value="Sur place — 10 %"
                readOnly
                disabled
                title="Taux TVA par défaut"
                className="h-11"
              />
            </div>
          </div>
        </section>

        {/* Article disponibilité — standalone card with green pill */}
        <section className="rounded-2xl border border-2-tk bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Article disponible à la commande
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Désactivez pour le masquer temporairement sans le supprimer.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                  draft.is_available
                    ? "status-success"
                    : "border border-2-tk bg-bg-2 text-muted-foreground"
                )}
              >
                {draft.is_available ? "Disponible" : "Masqué"}
              </span>
              <Switch
                checked={draft.is_available}
                onCheckedChange={(v) => setDraft({ ...draft, is_available: v })}
              />
            </div>
          </div>
        </section>

        {/* Options & suppléments — list with min/max badges */}
        <section className="rounded-2xl border border-2-tk bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Options &amp; suppléments
            </h3>
            <span className="text-[11px] text-muted-foreground tabular">
              {groups?.length ?? 0} groupe{(groups?.length ?? 0) > 1 ? "s" : ""}
            </span>
          </div>

          {groups === null ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Chargement…
            </p>
          ) : groups.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Aucun groupe d&apos;options. Ajoutez une sauce, un accompagnement…
            </p>
          ) : (
            <ul className="space-y-1.5">
              {groups.map((g) => (
                <li
                  key={`${g.source}-${g.id}`}
                  className="flex items-center gap-2 rounded-lg border border-2-tk bg-bg-2/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                      {g.name}
                      {g.source === "shared" && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-tint px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-brand-accent"
                          title="Groupe partagé entre plusieurs articles"
                        >
                          <Link2 className="h-2.5 w-2.5" />
                          Partagé
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {g.option_count} option{g.option_count > 1 ? "s" : ""}
                      {g.min > 0 && ` · ${g.min} requise${g.min > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-2-tk bg-card px-1.5 py-0.5 text-[10px] font-mono tabular text-muted-foreground">
                    Min {g.min} · Max {g.max}
                  </span>
                  <button
                    type="button"
                    onClick={onAdvancedEdit}
                    aria-label="Modifier le groupe"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAdvancedEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-bg-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-bg-3"
            >
              <Link2 className="h-3.5 w-3.5" /> Lier un groupe d&apos;options
            </button>
            <button
              type="button"
              onClick={onAdvancedEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-2-tk bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> Créer un nouveau groupe
            </button>
          </div>
        </section>
      </div>

      <UnsavedChangesBar
        count={changed ? 1 : 0}
        onCancel={() => setDraft(initial)}
        onSave={saveDraft}
        saving={saving}
      />

      <Dialog open={confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet article ?</DialogTitle>
            <DialogDescription>
              « {draft.name} » sera définitivement supprimé du menu. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Empty editor state
// ────────────────────────────────────────────────────────────────────────────

function EditorEmptyState({ hasItems }: { hasItems: boolean }) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <EmptyState
        icon={<UtensilsCrossed className="h-5 w-5" />}
        title={hasItems ? "Sélectionnez un article" : "Aucun article dans cette catégorie"}
        body={
          hasItems
            ? "Cliquez sur un article à gauche pour l'éditer."
            : "Ajoutez votre premier article avec le bouton « + Article »."
        }
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Category dialog (create / rename)
// ────────────────────────────────────────────────────────────────────────────

function CategoryDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Category | null;
  onSave: (data: { name: string; icon: string | null }) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens
    setName(editing?.name ?? "");
    setIcon(editing?.icon ?? null);
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Renommer la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          <DialogDescription>
            Donnez un nom court et une icône optionnelle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="cat-name">Nom</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Entrées"
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-2 block">Icône</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setIcon(null)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border text-xs",
                  icon === null
                    ? "border-foreground bg-bg-3 text-foreground"
                    : "border-2-tk bg-card text-muted-foreground hover:text-foreground"
                )}
                aria-label="Aucune icône"
              >
                —
              </button>
              {CATEGORY_ICONS.slice(0, 18).map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                    icon === opt.name
                      ? "border-foreground bg-bg-3 text-foreground"
                      : "border-2-tk bg-card text-muted-foreground hover:text-foreground"
                  )}
                  aria-label={opt.label}
                >
                  {createElement(opt.Icon, { className: "h-4 w-4" })}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={() => onSave({ name: name.trim(), icon })}
            disabled={!name.trim() || saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default function ArticlesPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const urlCatId = searchParams.get("cat");
  const urlItemId = searchParams.get("item");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Data load ────────────────────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    const supabase = createClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("public_id", params.publicId)
      .single();
    if (!restaurant) return;
    setRestaurantId(restaurant.id);

    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true })
      .returns<Category[]>();
    const catList = cats || [];

    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .in("category_id", catList.map((c) => c.id))
      .order("sort_order", { ascending: true })
      .returns<Product[]>();

    const byCat = new Map<string, Product[]>();
    for (const p of prods || []) {
      const list = byCat.get(p.category_id) || [];
      list.push(p);
      byCat.set(p.category_id, list);
    }
    setCategories(catList.map((c) => ({ ...c, products: byCat.get(c.id) || [] })));
    setLoading(false);
  }, [params.publicId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // ── Selection ────────────────────────────────────────────────────────────
  const selectedCat = useMemo(
    () =>
      categories.find((c) => c.id === urlCatId) ??
      categories[0] ??
      null,
    [categories, urlCatId]
  );
  const selectedItem = useMemo(() => {
    if (!selectedCat) return null;
    return (
      selectedCat.products.find((p) => p.id === urlItemId) ??
      selectedCat.products[0] ??
      null
    );
  }, [selectedCat, urlItemId]);

  const filteredItems = useMemo(() => {
    if (!selectedCat) return [];
    if (!search.trim()) return selectedCat.products;
    const q = search.toLowerCase();
    return selectedCat.products.filter((p) => p.name.toLowerCase().includes(q));
  }, [selectedCat, search]);

  const setSelection = useCallback(
    (catId?: string, itemId?: string) => {
      const usp = new URLSearchParams(searchParams.toString());
      if (catId) usp.set("cat", catId);
      else usp.delete("cat");
      if (itemId) usp.set("item", itemId);
      else usp.delete("item");
      router.replace(`?${usp.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // ── Category CRUD ────────────────────────────────────────────────────────
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CategoryWithProducts | null>(null);

  const saveCategory = async (data: { name: string; icon: string | null }) => {
    if (!restaurantId) return;
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await apiCategory("PUT", {
          id: editingCategory.id,
          restaurant_id: restaurantId,
          name: data.name,
          icon: data.icon,
        });
        toast.success("Catégorie renommée");
      } else {
        await apiCategory("POST", {
          restaurant_id: restaurantId,
          name: data.name,
          icon: data.icon,
          sort_order: categories.length,
        });
        toast.success("Catégorie créée");
      }
      setCategoryDialogOpen(false);
      await fetchMenu();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    } finally {
      setSavingCategory(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !restaurantId) return;
    try {
      await apiCategory("DELETE", {
        id: pendingDelete.id,
        restaurant_id: restaurantId,
      });
      toast.success("Catégorie supprimée");
      setPendingDelete(null);
      await fetchMenu();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    }
  };

  const toggleCategoryVisibility = async (id: string, visible: boolean) => {
    if (!restaurantId) return;
    try {
      await apiCategory("PUT", { id, restaurant_id: restaurantId, is_visible: visible });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_visible: visible } : c))
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    }
  };

  // ── Category reorder ──────────────────────────────────────────────────────
  const handleCatDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !restaurantId) return;
    const oldIdx = categories.findIndex((c) => c.id === active.id);
    const newIdx = categories.findIndex((c) => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(categories, oldIdx, newIdx);
    setCategories(next);
    // Persist
    for (let i = 0; i < next.length; i++) {
      try {
        await apiCategory("PUT", {
          id: next[i].id,
          restaurant_id: restaurantId,
          sort_order: i,
        });
      } catch {
        /* swallow — UI already updated, persistence is best-effort */
      }
    }
  };

  // ── Article toggle availability ───────────────────────────────────────────
  const toggleArticleAvailability = async (productId: string, available: boolean) => {
    if (!restaurantId) return;
    try {
      await apiProductUpdate({
        id: productId,
        restaurant_id: restaurantId,
        is_available: available,
      });
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          products: c.products.map((p) =>
            p.id === productId ? { ...p, is_available: available } : p
          ),
        }))
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    }
  };

  // ── ProductFormSheet (advanced add/edit) ──────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  const openNewProduct = () => {
    if (!selectedCat) return;
    setEditingProduct(null);
    setDefaultCategoryId(selectedCat.id);
    setSheetOpen(true);
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setDefaultCategoryId(p.category_id);
    setSheetOpen(true);
  };

  const flatCategories = useMemo<Category[]>(
    () =>
      categories.map((c) => ({
        id: c.id,
        restaurant_id: c.restaurant_id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        image_url: c.image_url,
        sort_order: c.sort_order,
        is_visible: c.is_visible,
        category_type: c.category_type,
        created_at: c.created_at,
      })),
    [categories]
  );

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col md:h-[100vh]">
      <div className="border-b border-2-tk px-4 py-3 md:px-6 md:py-4">
        <PageHeader
          icon={<UtensilsCrossed className="h-5 w-5" />}
          eyebrow="Carte"
          title="Articles"
          subtitle="Catégories, articles et options — édition rapide en 3 panneaux"
          className="pb-0"
          right={
            <Link
              href={`/admin/${params.publicId}/articles/options-de-menu`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-bg-3"
            >
              <Layers className="h-4 w-4" /> Options de menu
            </Link>
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[200px_280px_1fr] xl:grid-cols-[240px_380px_1fr]">
        {/* Pane 1 — Categories (hidden on md, shown from lg) */}
        <aside className="hidden flex-col border-r border-2-tk bg-bg-2 lg:flex">
          <div className="flex items-center justify-between border-b border-2-tk px-3 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Catégories</h3>
              <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[11px] text-muted-foreground tabular">
                {categories.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCategoryDialogOpen(true);
              }}
              aria-label="Nouvelle catégorie"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-bg-3 hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {categories.map((c) => (
                    <SortableCategoryRow
                      key={c.id}
                      category={c}
                      active={selectedCat?.id === c.id}
                      onSelect={() => setSelection(c.id, undefined)}
                      onToggleVisibility={(v) => toggleCategoryVisibility(c.id, v)}
                      onEdit={() => {
                        setEditingCategory(c);
                        setCategoryDialogOpen(true);
                      }}
                      onDelete={() => setPendingDelete(c)}
                    />
                  ))}
                  {categories.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Aucune catégorie. Cliquez sur « + » pour commencer.
                    </p>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </aside>

        {/* Pane 2 — Articles list */}
        <section className="hidden flex-col border-r border-2-tk md:flex">
          <div className="flex items-center justify-between gap-2 border-b border-2-tk bg-card px-3 py-3">
            <div className="min-w-0 flex-1">
              {/* Compact category picker (md only) — replaces hidden cats pane */}
              <div className="flex items-center gap-1.5 lg:hidden">
                <select
                  value={selectedCat?.id ?? ""}
                  onChange={(e) => setSelection(e.target.value, undefined)}
                  className="h-8 flex-1 min-w-0 rounded-md border border-2-tk bg-bg-2 px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  aria-label="Choisir une catégorie"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.products.length})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryDialogOpen(true);
                  }}
                  aria-label="Nouvelle catégorie"
                  title="Nouvelle catégorie"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-2-tk bg-card text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Title (lg+ only) */}
              <div className="hidden items-center gap-2 lg:flex">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {selectedCat?.name || "—"}
                </h3>
                <span className="rounded-full bg-bg-3 px-1.5 py-0.5 text-[11px] text-muted-foreground tabular">
                  {selectedCat?.products.length ?? 0}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={openNewProduct}
              disabled={!selectedCat}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-tint px-2.5 py-1.5 text-xs font-medium text-brand-accent hover:bg-tint-2 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Article
            </button>
          </div>
          <div className="border-b border-2-tk bg-card px-3 py-2">
            <div className="flex items-center gap-2 rounded-md border border-2-tk bg-bg-2 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans la catégorie…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredItems.map((p) => (
              <ArticleRow
                key={p.id}
                product={p}
                active={selectedItem?.id === p.id}
                onSelect={() => setSelection(selectedCat?.id, p.id)}
                onToggleAvailability={(v) => toggleArticleAvailability(p.id, v)}
              />
            ))}
            {filteredItems.length === 0 && selectedCat && (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                {search ? "Aucun article ne correspond à votre recherche." : "Aucun article dans cette catégorie."}
              </p>
            )}
          </div>
        </section>

        {/* Pane 3 — Editor */}
        <section className="flex min-h-0 flex-col bg-background">
          {selectedItem && selectedCat && restaurantId ? (
            <ArticleEditor
              key={selectedItem.id}
              product={selectedItem}
              category={selectedCat}
              restaurantId={restaurantId}
              onApplied={(next) =>
                setCategories((prev) =>
                  prev.map((c) =>
                    c.id === next.category_id
                      ? {
                          ...c,
                          products: c.products.map((p) => (p.id === next.id ? next : p)),
                        }
                      : c
                  )
                )
              }
              onAdvancedEdit={() => openEditProduct(selectedItem)}
              onDuplicated={() => fetchMenu()}
              onDeleted={() => {
                setSelection(selectedCat.id, undefined);
                fetchMenu();
              }}
            />
          ) : (
            <EditorEmptyState hasItems={(selectedCat?.products.length ?? 0) > 0} />
          )}
        </section>
      </div>

      {/* Mobile note */}
      <div className="border-t border-2-tk bg-bg-2 px-4 py-3 text-center text-xs text-muted-foreground md:hidden">
        L&apos;éditeur 3 panneaux nécessite un écran ≥ 768px. Utilisez l&apos;éditeur complet sur mobile.
      </div>

      {/* Dialogs */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        editing={editingCategory}
        onSave={saveCategory}
        saving={savingCategory}
      />

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>
              {pendingDelete?.products.length
                ? `Cette catégorie contient ${pendingDelete.products.length} article(s). Ils seront aussi supprimés.`
                : "Cette action est définitive."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {restaurantId && (
        <ProductFormSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          product={editingProduct}
          categories={flatCategories}
          defaultCategoryId={defaultCategoryId}
          restaurantId={restaurantId}
          onSaved={fetchMenu}
        />
      )}
    </div>
  );
}
