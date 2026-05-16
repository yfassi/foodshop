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
  Wrench,
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
};

function productToDraft(p: Product): EditorDraft {
  return {
    name: p.name,
    description: p.description ?? "",
    priceEuros: ((p.price ?? 0) / 100).toFixed(2),
    is_available: p.is_available,
  };
}

function draftToPayload(d: EditorDraft) {
  const priceCents = Math.round(parseFloat(d.priceEuros.replace(",", ".")) * 100);
  return {
    name: d.name.trim(),
    description: d.description.trim() || null,
    price: Number.isFinite(priceCents) ? priceCents : 0,
    is_available: d.is_available,
  };
}

function ArticleEditor({
  product,
  category,
  restaurantId,
  onApplied,
  onAdvancedEdit,
}: {
  product: Product;
  category: Category | null;
  restaurantId: string;
  onApplied: (next: Product) => void;
  onAdvancedEdit: () => void;
}) {
  const initial = useMemo(() => productToDraft(product), [product]);
  const [draft, setDraft] = useState<EditorDraft>(initial);
  const [saving, setSaving] = useState(false);

  // Reset draft when product changes
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const changed = useMemo(() => {
    return (
      draft.name !== initial.name ||
      draft.description !== initial.description ||
      draft.priceEuros !== initial.priceEuros ||
      draft.is_available !== initial.is_available
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

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-2-tk px-6 py-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {category?.name || "Article"} ›
          </p>
          <h2 className="truncate text-xl font-semibold text-foreground">
            {draft.name || "Sans nom"}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            onClick={onAdvancedEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-bg-3"
          >
            <Wrench className="h-3.5 w-3.5" /> Plus d&apos;options
          </button>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto px-6 py-6">
        {/* Hero: image + main fields */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-2-tk bg-bg-3">
            {product.image_url ? (
              <Image src={product.image_url} alt={product.name} fill className="object-cover" sizes="128px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <Label htmlFor="art-name">Nom</Label>
              <Input
                id="art-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Nom de l'article"
              />
            </div>
            <div>
              <Label htmlFor="art-desc">Description</Label>
              <textarea
                id="art-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Description courte affichée au client"
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Price & availability card */}
        <section className="rounded-2xl border border-2-tk bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Prix & disponibilité</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="art-price">Prix (€)</Label>
              <div className="relative">
                <Input
                  id="art-price"
                  inputMode="decimal"
                  value={draft.priceEuros}
                  onChange={(e) => setDraft({ ...draft, priceEuros: e.target.value })}
                  className="pr-10 font-mono tabular"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between rounded-lg border border-2-tk bg-bg-2 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Disponible</p>
                <p className="text-xs text-muted-foreground">Affiché au client si activé</p>
              </div>
              <Switch
                checked={draft.is_available}
                onCheckedChange={(v) => setDraft({ ...draft, is_available: v })}
              />
            </div>
          </div>
        </section>

        {/* Options & suppléments — pointer to "Plus d'options" */}
        <section className="rounded-2xl border border-2-tk bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Options & suppléments</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sauces, tailles, suppléments, groupes liés (réutilisables).
              </p>
            </div>
            <button
              type="button"
              onClick={onAdvancedEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-bg-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-bg-3"
            >
              <Layers className="h-3.5 w-3.5" /> Gérer
            </button>
          </div>
        </section>

        {/* Channel visibility — placeholder card, hooks into existing channels in advanced sheet */}
        <section className="rounded-2xl border border-2-tk bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Visibilité par canal</h3>
          <p className="text-xs text-muted-foreground">
            La visibilité par canal (sur place / à emporter / livraison) est gérée
            dans l&apos;éditeur complet — cliquez sur « Plus d&apos;options ».
          </p>
        </section>
      </div>

      <UnsavedChangesBar
        count={changed ? 1 : 0}
        onCancel={() => setDraft(initial)}
        onSave={saveDraft}
        saving={saving}
      />
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
