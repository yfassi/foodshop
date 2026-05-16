"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ChevronLeft,
  Layers,
  X,
  ArrowRight,
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
import { EmptyState } from "@/components/admin/ui/empty-state";
import type { SharedModifierGroup, SharedModifier, Product } from "@/lib/types";

type GroupWithMods = SharedModifierGroup & { shared_modifiers: SharedModifier[] };
type LinkedProduct = { product_id: string; product: Pick<Product, "id" | "name" | "category_id"> };

// ────────────────────────────────────────────────────────────────────────────
// Sortable option row (inside an option group)
// ────────────────────────────────────────────────────────────────────────────

function SortableOptionRow({
  modifier,
  onChange,
  onDelete,
}: {
  modifier: SharedModifier;
  onChange: (next: Partial<SharedModifier>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: modifier.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [priceEuros, setPriceEuros] = useState(((modifier.price_extra ?? 0) / 100).toFixed(2));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local input when parent updates
    setPriceEuros(((modifier.price_extra ?? 0) / 100).toFixed(2));
  }, [modifier.price_extra]);

  const commitPrice = () => {
    const parsed = Math.round(parseFloat(priceEuros.replace(",", ".")) * 100);
    if (Number.isFinite(parsed) && parsed !== modifier.price_extra) {
      onChange({ price_extra: parsed });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-2-tk bg-card p-2"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="flex h-7 w-7 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-foreground active:cursor-grabbing"
        aria-label="Glisser pour réordonner"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Input
        value={modifier.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Nom de l'option"
        className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <div className="relative w-28 shrink-0">
        <Input
          inputMode="decimal"
          value={priceEuros}
          onChange={(e) => setPriceEuros(e.target.value)}
          onBlur={commitPrice}
          className="pr-7 text-right font-mono tabular"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          €
        </span>
      </div>
      <Switch
        checked={modifier.is_available}
        onCheckedChange={(v) => onChange({ is_available: v })}
        aria-label="Disponibilité"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Supprimer l'option"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-bg-3 hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Rules preview (auto-generated text)
// ────────────────────────────────────────────────────────────────────────────

function buildRulesPreview(min: number, max: number) {
  if (min === 0 && max === 0) return "Le client peut choisir librement.";
  if (min === 0 && max === 1) return "Le client peut choisir 1 option (facultatif).";
  if (min === 1 && max === 1) return "Le client doit choisir exactement 1 option.";
  if (min === max) return `Le client doit choisir exactement ${min} options.`;
  if (min === 0) return `Le client peut choisir jusqu'à ${max} options.`;
  return `Le client doit choisir entre ${min} et ${max} options.`;
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default function OptionsDeMenuPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("g");

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupWithMods[]>([]);
  const [productsByGroup, setProductsByGroup] = useState<Map<string, LinkedProduct[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<GroupWithMods | null>(null);
  const [linkProductOpen, setLinkProductOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ── Load data ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("public_id", params.publicId)
      .single();
    if (!restaurant) return;
    setRestaurantId(restaurant.id);

    const { data: groupsData } = await supabase
      .from("shared_modifier_groups")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true })
      .returns<SharedModifierGroup[]>();
    const g = groupsData || [];

    let mods: SharedModifier[] = [];
    if (g.length > 0) {
      const { data } = await supabase
        .from("shared_modifiers")
        .select("*")
        .in("group_id", g.map((x) => x.id))
        .order("sort_order", { ascending: true })
        .returns<SharedModifier[]>();
      mods = data || [];
    }
    const modsByGroup = new Map<string, SharedModifier[]>();
    for (const m of mods) {
      const list = modsByGroup.get(m.group_id) || [];
      list.push(m);
      modsByGroup.set(m.group_id, list);
    }

    setGroups(g.map((x) => ({ ...x, shared_modifiers: modsByGroup.get(x.id) || [] })));

    // Linked products per group
    if (g.length > 0) {
      const { data: linksData } = await supabase
        .from("product_shared_groups")
        .select("product_id, shared_group_id, products(id, name, category_id)")
        .in("shared_group_id", g.map((x) => x.id))
        .returns<
          { product_id: string; shared_group_id: string; products: { id: string; name: string; category_id: string } }[]
        >();
      const byGroup = new Map<string, LinkedProduct[]>();
      for (const l of linksData || []) {
        const arr = byGroup.get(l.shared_group_id) || [];
        arr.push({ product_id: l.product_id, product: l.products });
        byGroup.set(l.shared_group_id, arr);
      }
      setProductsByGroup(byGroup);
    } else {
      setProductsByGroup(new Map());
    }

    setLoading(false);
  }, [params.publicId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchAll();
  }, [fetchAll]);

  // ── Selection (URL state) ────────────────────────────────────────────────
  const selected = useMemo(
    () => groups.find((g) => g.id === selectedId) ?? groups[0] ?? null,
    [groups, selectedId]
  );
  const setSelection = useCallback(
    (id?: string) => {
      const usp = new URLSearchParams(searchParams.toString());
      if (id) usp.set("g", id);
      else usp.delete("g");
      router.replace(`?${usp.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // ── Group CRUD ───────────────────────────────────────────────────────────
  const addGroup = async () => {
    if (!restaurantId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shared_modifier_groups")
      .insert({
        restaurant_id: restaurantId,
        name: "Nouveau groupe d'options",
        min_select: 0,
        max_select: 1,
        sort_order: groups.length,
      })
      .select()
      .single<SharedModifierGroup>();
    if (error || !data) {
      toast.error("Erreur lors de la création");
      return;
    }
    const next: GroupWithMods = { ...data, shared_modifiers: [] };
    setGroups((prev) => [...prev, next]);
    setSelection(data.id);
  };

  const updateGroup = async (groupId: string, updates: Partial<SharedModifierGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
    const supabase = createClient();
    const { error } = await supabase
      .from("shared_modifier_groups")
      .update(updates)
      .eq("id", groupId);
    if (error) toast.error("Erreur lors de l'enregistrement");
  };

  const duplicateGroup = async (group: GroupWithMods) => {
    if (!restaurantId) return;
    const supabase = createClient();
    const { data: newGroup, error } = await supabase
      .from("shared_modifier_groups")
      .insert({
        restaurant_id: restaurantId,
        name: `${group.name} (copie)`,
        min_select: group.min_select,
        max_select: group.max_select,
        sort_order: groups.length,
      })
      .select()
      .single<SharedModifierGroup>();
    if (error || !newGroup) {
      toast.error("Erreur lors de la duplication");
      return;
    }
    let newMods: SharedModifier[] = [];
    if (group.shared_modifiers.length > 0) {
      const { data: mods } = await supabase
        .from("shared_modifiers")
        .insert(
          group.shared_modifiers.map((m, i) => ({
            group_id: newGroup.id,
            name: m.name,
            price_extra: m.price_extra,
            sort_order: i,
          }))
        )
        .select()
        .returns<SharedModifier[]>();
      newMods = mods || [];
    }
    setGroups((prev) => [...prev, { ...newGroup, shared_modifiers: newMods }]);
    setSelection(newGroup.id);
    toast.success("Groupe dupliqué");
  };

  const confirmDeleteGroup = async () => {
    if (!pendingDelete) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("shared_modifier_groups")
      .delete()
      .eq("id", pendingDelete.id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    setGroups((prev) => prev.filter((g) => g.id !== pendingDelete.id));
    if (selected?.id === pendingDelete.id) setSelection(undefined);
    setPendingDelete(null);
    toast.success("Groupe supprimé");
  };

  // ── Options CRUD ─────────────────────────────────────────────────────────
  const addOption = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shared_modifiers")
      .insert({
        group_id: groupId,
        name: "Nouvelle option",
        price_extra: 0,
        sort_order: group?.shared_modifiers.length || 0,
      })
      .select()
      .single<SharedModifier>();
    if (error || !data) {
      toast.error("Erreur lors de l'ajout");
      return;
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, shared_modifiers: [...g.shared_modifiers, data] } : g
      )
    );
  };

  const updateOption = async (
    groupId: string,
    modifierId: string,
    updates: Partial<SharedModifier>
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              shared_modifiers: g.shared_modifiers.map((m) =>
                m.id === modifierId ? { ...m, ...updates } : m
              ),
            }
          : g
      )
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("shared_modifiers")
      .update(updates)
      .eq("id", modifierId);
    if (error) toast.error("Erreur lors de l'enregistrement");
  };

  const deleteOption = async (groupId: string, modifierId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              shared_modifiers: g.shared_modifiers.filter((m) => m.id !== modifierId),
            }
          : g
      )
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("shared_modifiers")
      .delete()
      .eq("id", modifierId);
    if (error) toast.error("Erreur lors de la suppression");
  };

  const handleOptionsDragEnd = async (event: DragEndEvent) => {
    if (!selected) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = selected.shared_modifiers.findIndex((m) => m.id === active.id);
    const newIdx = selected.shared_modifiers.findIndex((m) => m.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(selected.shared_modifiers, oldIdx, newIdx);
    setGroups((prev) =>
      prev.map((g) => (g.id === selected.id ? { ...g, shared_modifiers: next } : g))
    );
    const supabase = createClient();
    for (let i = 0; i < next.length; i++) {
      await supabase
        .from("shared_modifiers")
        .update({ sort_order: i })
        .eq("id", next[i].id);
    }
  };

  // ── Linked articles ───────────────────────────────────────────────────────
  const openLinkProducts = async () => {
    if (!restaurantId || !selected) return;
    setLinkProductOpen(true);
    const supabase = createClient();
    const linkedIds = new Set((productsByGroup.get(selected.id) || []).map((l) => l.product_id));
    // Fetch all products for this restaurant (via categories→products)
    const { data: cats } = await supabase
      .from("categories")
      .select("id")
      .eq("restaurant_id", restaurantId);
    const catIds = (cats || []).map((c) => c.id);
    if (catIds.length === 0) {
      setAvailableProducts([]);
      return;
    }
    const { data: prods } = await supabase
      .from("products")
      .select("*")
      .in("category_id", catIds)
      .order("name", { ascending: true })
      .returns<Product[]>();
    setAvailableProducts((prods || []).filter((p) => !linkedIds.has(p.id)));
  };

  const linkProduct = async (productId: string) => {
    if (!selected) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("product_shared_groups")
      .insert({ product_id: productId, shared_group_id: selected.id });
    if (error) {
      toast.error("Erreur lors de la liaison");
      return;
    }
    const product = availableProducts.find((p) => p.id === productId);
    if (product) {
      setProductsByGroup((prev) => {
        const next = new Map(prev);
        const arr = next.get(selected.id) || [];
        next.set(selected.id, [
          ...arr,
          { product_id: productId, product: { id: product.id, name: product.name, category_id: product.category_id } },
        ]);
        return next;
      });
      setAvailableProducts((prev) => prev.filter((p) => p.id !== productId));
    }
    toast.success("Article lié");
  };

  const unlinkProduct = async (productId: string) => {
    if (!selected) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("product_shared_groups")
      .delete()
      .eq("product_id", productId)
      .eq("shared_group_id", selected.id);
    if (error) {
      toast.error("Erreur lors de la déliaison");
      return;
    }
    setProductsByGroup((prev) => {
      const next = new Map(prev);
      const arr = next.get(selected.id) || [];
      next.set(
        selected.id,
        arr.filter((l) => l.product_id !== productId)
      );
      return next;
    });
    toast.success("Article délié");
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Left rail */}
        <aside className="hidden flex-col border-r border-2-tk bg-bg-2 md:flex">
          <div className="border-b border-2-tk px-5 py-5">
            <Link
              href={`/admin/${params.publicId}/articles`}
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3 w-3" /> Articles
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Carte
            </p>
            <h2 className="mt-0.5 text-xl font-semibold text-foreground">Options de menu</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Réutilisables sur plusieurs articles (sauces, tailles, suppléments…).
            </p>
            <button
              type="button"
              onClick={addGroup}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-2-tk bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-bg-3"
            >
              <Plus className="h-4 w-4" /> Nouveau groupe d&apos;options
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {groups.map((g) => {
                const active = selected?.id === g.id;
                const linked = productsByGroup.get(g.id)?.length ?? 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelection(g.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-tint bg-card border-l-4 border-l-[color:var(--brand-accent)]"
                        : "border-transparent hover:bg-bg-3"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="truncate text-sm font-medium text-foreground">
                        {g.name || "Sans nom"}
                      </span>
                      <span className="ml-2 shrink-0 rounded-full bg-bg-3 px-1.5 py-0.5 text-[11px] tabular text-muted-foreground">
                        {linked}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular">
                      Min {g.min_select} · Max {g.max_select} · {g.shared_modifiers.length} options
                    </span>
                  </button>
                );
              })}
              {groups.length === 0 && (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Aucun groupe encore. Cliquez sur « + Nouveau groupe d&apos;options ».
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Editor */}
        <section className="overflow-y-auto bg-background">
          {selected ? (
            <div className="mx-auto max-w-3xl space-y-6 px-8 py-7">
              {/* Header */}
              <header className="flex items-start justify-between gap-4 border-b border-2-tk pb-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Groupe d&apos;options
                  </p>
                  <Input
                    value={selected.name}
                    onChange={(e) => updateGroup(selected.id, { name: e.target.value })}
                    placeholder="Nom du groupe"
                    className="mt-1 h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Utilisé dans {productsByGroup.get(selected.id)?.length ?? 0} article(s).
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => duplicateGroup(selected)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Dupliquer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(selected)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
                  </Button>
                </div>
              </header>

              {/* Rules */}
              <section className="rounded-2xl border border-2-tk bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Règles de choix</h3>
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.5fr]">
                  <div>
                    <Label htmlFor="opt-min">Min requis</Label>
                    <Input
                      id="opt-min"
                      type="number"
                      min={0}
                      value={selected.min_select}
                      onChange={(e) =>
                        updateGroup(selected.id, { min_select: parseInt(e.target.value || "0", 10) })
                      }
                      className="font-mono tabular"
                    />
                  </div>
                  <div>
                    <Label htmlFor="opt-max">Max autorisé</Label>
                    <Input
                      id="opt-max"
                      type="number"
                      min={0}
                      value={selected.max_select}
                      onChange={(e) =>
                        updateGroup(selected.id, { max_select: parseInt(e.target.value || "0", 10) })
                      }
                      className="font-mono tabular"
                    />
                  </div>
                  <div>
                    <Label>Aperçu</Label>
                    <div className="mt-1 rounded-lg border border-2-tk bg-bg-2 px-3 py-2.5 text-sm text-muted-foreground">
                      {buildRulesPreview(selected.min_select, selected.max_select)}
                    </div>
                  </div>
                </div>
              </section>

              {/* Options */}
              <section className="rounded-2xl border border-2-tk bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Options{" "}
                    <span className="ml-1 text-xs text-muted-foreground tabular">
                      ({selected.shared_modifiers.length})
                    </span>
                  </h3>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleOptionsDragEnd}
                >
                  <SortableContext
                    items={selected.shared_modifiers.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selected.shared_modifiers.map((m) => (
                        <SortableOptionRow
                          key={m.id}
                          modifier={m}
                          onChange={(u) => updateOption(selected.id, m.id, u)}
                          onDelete={() => deleteOption(selected.id, m.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => addOption(selected.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-tint px-3 py-1.5 text-sm font-medium text-brand-accent hover:bg-tint-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter une option
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Prix = supplément facturé au client
                  </p>
                </div>
              </section>

              {/* Linked products */}
              <section className="rounded-2xl border border-2-tk bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Articles utilisant ce groupe{" "}
                    <span className="ml-1 text-xs text-muted-foreground tabular">
                      ({productsByGroup.get(selected.id)?.length ?? 0})
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={openLinkProducts}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-bg-2 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-bg-3"
                  >
                    <Plus className="h-3.5 w-3.5" /> Lier des articles
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(productsByGroup.get(selected.id) || []).map((l) => (
                    <div
                      key={l.product_id}
                      className="group flex items-center gap-2 rounded-full border border-2-tk bg-bg-2 px-3 py-1.5 text-sm"
                    >
                      <span className="truncate">{l.product.name}</span>
                      <button
                        type="button"
                        onClick={() => unlinkProduct(l.product_id)}
                        aria-label="Délier l'article"
                        className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-bg-3 hover:text-destructive group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(productsByGroup.get(selected.id)?.length ?? 0) === 0 && (
                    <p className="col-span-full py-4 text-center text-xs text-muted-foreground">
                      Aucun article lié. Cliquez sur « Lier des articles » pour en associer.
                    </p>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 py-12">
              <EmptyState
                icon={<Layers className="h-5 w-5" />}
                title="Aucun groupe sélectionné"
                body="Sélectionnez un groupe à gauche ou créez-en un nouveau pour commencer."
                action={
                  <Button onClick={addGroup}>
                    <Plus className="mr-1 h-4 w-4" /> Nouveau groupe d&apos;options
                  </Button>
                }
              />
            </div>
          )}
        </section>
      </div>

      {/* Mobile note */}
      <div className="border-t border-2-tk bg-bg-2 px-4 py-3 text-center text-xs text-muted-foreground md:hidden">
        L&apos;éditeur Options de menu est optimisé pour les écrans ≥ 768px.
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce groupe d&apos;options</DialogTitle>
            <DialogDescription>
              Toutes les options de ce groupe seront supprimées et les articles liés
              perdront cette association.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDeleteGroup}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link products dialog */}
      <Dialog open={linkProductOpen} onOpenChange={setLinkProductOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lier des articles</DialogTitle>
            <DialogDescription>
              Cliquez sur un article pour le lier à ce groupe d&apos;options.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-2-tk">
            {availableProducts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Tous vos articles sont déjà liés à ce groupe.
              </p>
            ) : (
              availableProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => linkProduct(p.id)}
                  className="flex w-full items-center justify-between border-b border-2-tk px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-bg-3"
                >
                  <span className="truncate">{p.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkProductOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
