"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Layers,
  X,
  ArrowRight,
  Eye,
  Search,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

  const priceInvalid = (() => {
    const raw = priceEuros.trim();
    if (!raw) return true;
    const parsed = parseFloat(raw.replace(",", "."));
    return !Number.isFinite(parsed);
  })();

  const commitPrice = () => {
    if (priceInvalid) {
      // Reset à la valeur valide stockée si l'utilisateur a saisi n'importe quoi.
      setPriceEuros(((modifier.price_extra ?? 0) / 100).toFixed(2));
      return;
    }
    const parsed = Math.round(parseFloat(priceEuros.replace(",", ".")) * 100);
    if (parsed !== modifier.price_extra) {
      onChange({ price_extra: parsed });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border border-2-tk bg-card px-2 py-1.5 transition-colors",
        !modifier.is_available && "opacity-60"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="flex h-7 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-foreground active:cursor-grabbing"
        aria-label="Glisser pour réordonner"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Input
        value={modifier.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Nom de l'option"
        className={cn(
          "h-9 flex-1 min-w-0 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0",
          !modifier.is_available && "line-through"
        )}
      />
      <div className="relative w-24 shrink-0">
        <Input
          inputMode="decimal"
          value={priceEuros}
          onChange={(e) => setPriceEuros(e.target.value)}
          onBlur={commitPrice}
          aria-invalid={priceInvalid}
          className={cn(
            "h-9 pr-7 text-right font-mono tabular text-sm",
            priceInvalid && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          €
        </span>
      </div>
      <Switch
        checked={modifier.is_available}
        onCheckedChange={(v) => onChange({ is_available: v })}
        aria-label="Disponibilité"
        className="shrink-0"
      />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Supprimer l'option"
        title="Supprimer l'option"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-bg-3 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
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

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an${months >= 24 ? "s" : ""}`;
}

function formatOptionPrice(cents: number): string {
  if (cents === 0) return "Sans supplément";
  const euros = cents / 100;
  const sign = cents > 0 ? "+" : "";
  return `${sign}${euros.toFixed(2).replace(".", ",")} €`;
}

// ────────────────────────────────────────────────────────────────────────────
// Customer-side preview pane — shows how a customer sees this group
// ────────────────────────────────────────────────────────────────────────────

function CustomerPreviewPane({
  group,
  sampleArticleName,
}: {
  group: GroupWithMods | null;
  sampleArticleName: string | null;
}) {
  if (!group) {
    return (
      <aside className="hidden flex-col border-l border-2-tk bg-bg-2/40 lg:flex">
        <div className="border-b border-2-tk px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Aperçu côté client
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionnez un groupe pour voir l&apos;aperçu.
          </p>
        </div>
      </aside>
    );
  }

  const isRequired = group.min_select >= 1;
  const isSingle = group.max_select === 1;
  const title = isSingle
    ? `choix de ${group.name.toLowerCase()}`
    : `${group.name.toLowerCase()}`;

  return (
    <aside className="hidden flex-col border-l border-2-tk bg-bg-2/40 lg:flex">
      <div className="border-b border-2-tk px-5 py-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Eye className="h-3 w-3" /> Aperçu côté client
        </p>
        <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
          {sampleArticleName || "Article exemple"} — {title}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl border border-2-tk bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-base font-semibold text-foreground">{group.name}</h4>
            {isRequired && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                Obligatoire
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {buildRulesPreview(group.min_select, group.max_select)}
          </p>

          {group.shared_modifiers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-2-tk p-4 text-center text-xs text-muted-foreground">
              Ajoutez une option pour voir l&apos;aperçu.
            </p>
          ) : (
            <ul className="space-y-2">
              {group.shared_modifiers.map((m, i) => {
                const checked = i === 0 && isRequired;
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                      checked
                        ? "border-foreground/30 bg-foreground/[0.03]"
                        : "border-2-tk bg-card"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        checked
                          ? "border-foreground bg-foreground text-background"
                          : "border-muted-foreground/40"
                      )}
                      aria-hidden
                    >
                      {checked && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm",
                        m.is_available
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      )}
                    >
                      {m.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular text-muted-foreground">
                      {formatOptionPrice(m.price_extra)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Composant principal — utilisé dans l'onglet "Options de menu" de /articles.
// État de sélection persisté dans l'URL (?g=...) pour préserver les deep-links.
// ────────────────────────────────────────────────────────────────────────────

export function OptionsManager() {
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
  const [linkProductSearch, setLinkProductSearch] = useState("");
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
    setLinkProductSearch("");
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

  const sampleArticleName = selected
    ? productsByGroup.get(selected.id)?.[0]?.product.name ?? null
    : null;

  return (
    // h-[calc(100vh-XXX)] : occupe la place restante sous le header de tabs de la
    // page parente. Hauteur dynamique via min-h-0 + flex-1 sur les sous-panes.
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[200px_1fr_260px] xl:grid-cols-[260px_1fr_360px]">
        {/* Left rail */}
        <aside className="hidden flex-col border-r border-2-tk bg-bg-2 md:flex">
          <div className="border-b border-2-tk px-5 py-5">
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
            <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 md:px-8 md:py-7">
              {/* Header — mockup-style: big title left, icon actions right, meta below */}
              <header className="space-y-3 border-b border-2-tk pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={selected.name}
                      onChange={(e) => updateGroup(selected.id, { name: e.target.value })}
                      placeholder="Nom du groupe"
                      aria-label="Nom du groupe d'options"
                      className="h-auto rounded-none border-0 border-b border-transparent bg-transparent px-0 pb-1 text-2xl font-semibold shadow-none focus-visible:border-foreground focus-visible:ring-0"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => duplicateGroup(selected)}
                      aria-label="Dupliquer le groupe"
                      title="Dupliquer le groupe"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-2-tk bg-card px-2.5 text-xs font-medium text-foreground hover:bg-bg-3"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Dupliquer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(selected)}
                      aria-label="Supprimer le groupe"
                      title="Supprimer le groupe"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-2-tk bg-card text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span>Groupe d&apos;options</span>
                  <span aria-hidden>·</span>
                  <span>
                    Utilisé dans{" "}
                    <span className="font-semibold text-foreground">
                      {productsByGroup.get(selected.id)?.length ?? 0} article
                      {(productsByGroup.get(selected.id)?.length ?? 0) > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span aria-hidden>·</span>
                  <span>Modifié {timeAgo(selected.created_at)}</span>
                </p>
              </header>

              {/* Règles de choix — Min / Max + computed preview on the right */}
              <section className="rounded-2xl border border-2-tk bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Règles de choix</h3>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="opt-min"
                      className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Minimum requis
                    </Label>
                    <Input
                      id="opt-min"
                      type="number"
                      min={0}
                      value={selected.min_select}
                      onChange={(e) =>
                        updateGroup(selected.id, { min_select: parseInt(e.target.value || "0", 10) })
                      }
                      className="h-11 text-center font-mono tabular text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="opt-max"
                      className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Maximum autorisé
                    </Label>
                    <Input
                      id="opt-max"
                      type="number"
                      min={0}
                      value={selected.max_select}
                      onChange={(e) =>
                        updateGroup(selected.id, { max_select: parseInt(e.target.value || "0", 10) })
                      }
                      className="h-11 text-center font-mono tabular text-base"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5 sm:col-span-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Aperçu
                    </Label>
                    <p className="text-sm text-muted-foreground sm:pt-2.5">
                      {buildRulesPreview(selected.min_select, selected.max_select)}
                    </p>
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

        {/* Customer-side preview pane (xl+) */}
        <CustomerPreviewPane group={selected} sampleArticleName={sampleArticleName} />
      </div>

      {/* Mobile note */}
      <div className="border-t border-2-tk bg-bg-2 px-4 py-3 text-center text-xs text-muted-foreground md:hidden">
        L&apos;éditeur Options de menu est optimisé pour les écrans ≥ 768px.
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce groupe d&apos;options ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les options de ce groupe seront supprimées et les articles liés
              perdront cette association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link products dialog */}
      <Dialog open={linkProductOpen} onOpenChange={setLinkProductOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lier des articles</DialogTitle>
            <DialogDescription>
              Cliquez sur un article pour le lier à ce groupe d&apos;options.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-2-tk bg-bg-2 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="search"
                value={linkProductSearch}
                onChange={(e) => setLinkProductSearch(e.target.value)}
                placeholder="Rechercher un article…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Rechercher un article"
              />
              {linkProductSearch && (
                <button
                  type="button"
                  onClick={() => setLinkProductSearch("")}
                  aria-label="Effacer"
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-2-tk">
              {(() => {
                const q = linkProductSearch.trim().toLowerCase();
                const filtered = q
                  ? availableProducts.filter((p) => p.name.toLowerCase().includes(q))
                  : availableProducts;
                if (availableProducts.length === 0) {
                  return (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Tous vos articles sont déjà liés à ce groupe.
                    </p>
                  );
                }
                if (filtered.length === 0) {
                  return (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Aucun article ne correspond à « {linkProductSearch} ».
                    </p>
                  );
                }
                return filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => linkProduct(p.id)}
                    className="flex w-full items-center justify-between border-b border-2-tk px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-bg-3"
                  >
                    <span className="truncate">{p.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ));
              })()}
            </div>
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
