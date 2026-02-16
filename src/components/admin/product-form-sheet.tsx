"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Copy, Layers, Link2Off, Loader2, Plus, Trash2, X } from "lucide-react";
import type {
  Category,
  Product,
  ModifierGroup,
  Modifier,
  SharedModifierGroup,
  SharedModifier,
} from "@/lib/types";

interface SharedGroupWithModifiers extends SharedModifierGroup {
  shared_modifiers: SharedModifier[];
}

interface ModifierGroupWithModifiers extends ModifierGroup {
  modifiers: Modifier[];
}

interface MenuChoiceItemRow {
  id: string;
  group_id: string;
  product_id: string;
  sort_order: number;
  created_at: string;
}

interface MenuChoiceGroupRow {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  created_at: string;
  menu_choice_items: MenuChoiceItemRow[];
}

interface ProductFormSheetProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  defaultCategoryId: string;
  restaurantId: string;
  onSaved: () => void;
}

export function ProductFormSheet({
  open,
  onClose,
  product,
  categories,
  defaultCategoryId,
  restaurantId,
  onSaved,
}: ProductFormSheetProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [menuEnabled, setMenuEnabled] = useState(false);
  const [menuSupplementEuros, setMenuSupplementEuros] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [modifierGroups, setModifierGroups] = useState<
    ModifierGroupWithModifiers[]
  >([]);
  const [productId, setProductId] = useState<string | null>(null);

  // Shared sections
  const [allSharedGroups, setAllSharedGroups] = useState<SharedGroupWithModifiers[]>([]);
  const [linkedSharedGroupIds, setLinkedSharedGroupIds] = useState<string[]>([]);

  // Menu choice groups
  const [menuChoiceGroups, setMenuChoiceGroups] = useState<MenuChoiceGroupRow[]>([]);
  const [allRestaurantProducts, setAllRestaurantProducts] = useState<Product[]>([]);
  const [expandedPicker, setExpandedPicker] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPriceEuros((product.price / 100).toFixed(2));
      setCategoryId(product.category_id);
      setIsAvailable(product.is_available);
      setIsFeatured(product.is_featured ?? false);
      setMenuEnabled(product.menu_supplement !== null && product.menu_supplement !== undefined);
      setMenuSupplementEuros(
        product.menu_supplement != null
          ? (product.menu_supplement / 100).toFixed(2)
          : ""
      );
      setMenuDescription(product.menu_description || "");
      setImageUrl(product.image_url);
      setProductId(product.id);
      fetchModifierGroups(product.id);
      fetchSharedSections(product.id);
      fetchMenuChoiceGroups(product.id);
      fetchAllRestaurantProducts();
    } else {
      setName("");
      setDescription("");
      setPriceEuros("");
      setCategoryId(defaultCategoryId);
      setIsAvailable(true);
      setIsFeatured(false);
      setMenuEnabled(false);
      setMenuSupplementEuros("");
      setMenuDescription("");
      setImageUrl(null);
      setProductId(null);
      setModifierGroups([]);
      setLinkedSharedGroupIds([]);
      setMenuChoiceGroups([]);
      setExpandedPicker(null);
      fetchSharedSections(null);
      fetchAllRestaurantProducts();
    }
  }, [product, open, defaultCategoryId]);

  const fetchModifierGroups = async (pid: string) => {
    const supabase = createClient();
    const { data: groups } = await supabase
      .from("modifier_groups")
      .select("*, modifiers(*)")
      .eq("product_id", pid)
      .order("sort_order")
      .returns<ModifierGroupWithModifiers[]>();

    if (groups) {
      setModifierGroups(
        groups.map((g) => ({
          ...g,
          modifiers: (g.modifiers || []).sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        }))
      );
    }
  };

  const fetchSharedSections = async (pid: string | null) => {
    const supabase = createClient();

    // Fetch all shared groups for this restaurant
    const { data: groups } = await supabase
      .from("shared_modifier_groups")
      .select("*, shared_modifiers(*)")
      .eq("restaurant_id", restaurantId)
      .order("sort_order")
      .returns<SharedGroupWithModifiers[]>();

    if (groups) {
      setAllSharedGroups(
        groups.map((g) => ({
          ...g,
          shared_modifiers: (g.shared_modifiers || []).sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        }))
      );
    }

    // Fetch which shared groups are linked to this product
    if (pid) {
      const { data: links } = await supabase
        .from("product_shared_groups")
        .select("shared_group_id")
        .eq("product_id", pid);

      setLinkedSharedGroupIds((links || []).map((l) => l.shared_group_id));
    } else {
      setLinkedSharedGroupIds([]);
    }
  };

  const fetchMenuChoiceGroups = async (pid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("menu_choice_groups")
      .select("*, menu_choice_items(*)")
      .eq("product_id", pid)
      .order("sort_order")
      .returns<MenuChoiceGroupRow[]>();

    if (data) {
      setMenuChoiceGroups(
        data.map((g) => ({
          ...g,
          menu_choice_items: (g.menu_choice_items || []).sort(
            (a, b) => a.sort_order - b.sort_order
          ),
        }))
      );
    }
  };

  const fetchAllRestaurantProducts = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .in(
        "category_id",
        categories.map((c) => c.id)
      )
      .order("name")
      .returns<Product[]>();

    if (data) setAllRestaurantProducts(data);
  };

  const addMenuChoiceGroup = async () => {
    if (!productId) {
      toast.error("Enregistrez d'abord le produit");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("menu_choice_groups")
      .insert({
        product_id: productId,
        name: "Accompagnement",
        min_select: 1,
        max_select: 1,
        sort_order: menuChoiceGroups.length,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error("Erreur lors de l'ajout du groupe");
      return;
    }

    setMenuChoiceGroups((prev) => [
      ...prev,
      { ...data, menu_choice_items: [] } as MenuChoiceGroupRow,
    ]);
  };

  const updateMenuChoiceGroup = async (
    groupId: string,
    updates: Partial<{ name: string; min_select: number; max_select: number }>
  ) => {
    const supabase = createClient();
    await supabase
      .from("menu_choice_groups")
      .update(updates)
      .eq("id", groupId);

    setMenuChoiceGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const deleteMenuChoiceGroup = async (groupId: string) => {
    const supabase = createClient();
    await supabase.from("menu_choice_groups").delete().eq("id", groupId);
    setMenuChoiceGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const toggleMenuChoiceItem = async (
    groupId: string,
    choiceProductId: string
  ) => {
    const group = menuChoiceGroups.find((g) => g.id === groupId);
    if (!group) return;

    const existing = group.menu_choice_items.find(
      (i) => i.product_id === choiceProductId
    );
    const supabase = createClient();

    if (existing) {
      await supabase.from("menu_choice_items").delete().eq("id", existing.id);
      setMenuChoiceGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                menu_choice_items: g.menu_choice_items.filter(
                  (i) => i.id !== existing.id
                ),
              }
            : g
        )
      );
    } else {
      const { data, error } = await supabase
        .from("menu_choice_items")
        .insert({
          group_id: groupId,
          product_id: choiceProductId,
          sort_order: group.menu_choice_items.length,
        })
        .select()
        .single();

      if (error || !data) {
        toast.error("Erreur");
        return;
      }

      setMenuChoiceGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                menu_choice_items: [
                  ...g.menu_choice_items,
                  data as MenuChoiceItemRow,
                ],
              }
            : g
        )
      );
    }
  };

  const linkSharedGroup = async (groupId: string) => {
    if (!productId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("product_shared_groups")
      .insert({
        product_id: productId,
        shared_group_id: groupId,
        sort_order: linkedSharedGroupIds.length,
      });

    if (error) {
      toast.error("Erreur lors de l'ajout de la section");
      return;
    }

    setLinkedSharedGroupIds((prev) => [...prev, groupId]);
    toast.success("Section liée");
  };

  const unlinkSharedGroup = async (groupId: string) => {
    if (!productId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("product_shared_groups")
      .delete()
      .eq("product_id", productId)
      .eq("shared_group_id", groupId);

    if (error) {
      toast.error("Erreur lors du retrait de la section");
      return;
    }

    setLinkedSharedGroupIds((prev) => prev.filter((id) => id !== groupId));
    toast.success("Section retirée");
  };

  const detachSharedGroup = async (sharedGroup: SharedGroupWithModifiers) => {
    if (!productId) return;
    const supabase = createClient();

    // Create a per-product modifier group from the shared one
    const { data: newGroup, error } = await supabase
      .from("modifier_groups")
      .insert({
        name: sharedGroup.name,
        product_id: productId,
        min_select: sharedGroup.min_select,
        max_select: sharedGroup.max_select,
        sort_order: modifierGroups.length,
      })
      .select()
      .single<ModifierGroup>();

    if (error || !newGroup) {
      toast.error("Erreur lors du détachement");
      return;
    }

    let newModifiers: Modifier[] = [];
    if (sharedGroup.shared_modifiers.length > 0) {
      const { data: mods } = await supabase
        .from("modifiers")
        .insert(
          sharedGroup.shared_modifiers.map((m, i) => ({
            name: m.name,
            price_extra: m.price_extra,
            group_id: newGroup.id,
            sort_order: i,
          }))
        )
        .select()
        .returns<Modifier[]>();

      if (mods) newModifiers = mods;
    }

    // Unlink the shared group
    await supabase
      .from("product_shared_groups")
      .delete()
      .eq("product_id", productId)
      .eq("shared_group_id", sharedGroup.id);

    setLinkedSharedGroupIds((prev) => prev.filter((id) => id !== sharedGroup.id));
    setModifierGroups((prev) => [...prev, { ...newGroup, modifiers: newModifiers }]);
    toast.success("Section détachée — vous pouvez la personnaliser");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const priceInCents = Math.round(parseFloat(priceEuros) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      toast.error("Le prix doit être supérieur à 0");
      return;
    }

    if (!categoryId) {
      toast.error("Veuillez sélectionner une catégorie");
      return;
    }

    const menuSupplement = menuEnabled
      ? Math.round(parseFloat(menuSupplementEuros || "0") * 100)
      : null;
    let menuDesc: string | null = null;
    if (menuEnabled) {
      if (menuChoiceGroups.length > 0) {
        menuDesc = menuChoiceGroups
          .map((g) => {
            const names = g.menu_choice_items
              .map(
                (item) =>
                  allRestaurantProducts.find((p) => p.id === item.product_id)
                    ?.name
              )
              .filter(Boolean);
            if (names.length === 0) return g.name;
            if (names.length <= 3) return names.join(", ");
            return `${g.name} au choix`;
          })
          .join(" + ");
      } else if (menuDescription.trim()) {
        menuDesc = menuDescription.trim();
      }
    }

    setSaving(true);

    const productData: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceInCents,
      category_id: categoryId,
      is_available: isAvailable,
      is_featured: isFeatured,
    };

    // Only include menu fields when menu is enabled (avoids error if columns don't exist yet)
    if (menuEnabled || product?.menu_supplement != null) {
      productData.menu_supplement = menuSupplement;
      productData.menu_description = menuDesc;
    }

    if (productId) {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productId,
          restaurant_id: restaurantId,
          ...productData,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Erreur lors de la mise à jour");
        setSaving(false);
        return;
      }
      toast.success("Produit mis à jour");
    } else {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Erreur lors de la création");
        setSaving(false);
        return;
      }

      setProductId(data.id);
      fetchSharedSections(data.id);
      fetchMenuChoiceGroups(data.id);
      toast.success("Produit créé");
    }

    setSaving(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!productId) return;

    const supabase = createClient();

    if (imageUrl) {
      const pathMatch = imageUrl.split("/product-images/")[1]?.split("?")[0];
      if (pathMatch) {
        await supabase.storage.from("product-images").remove([pathMatch]);
      }
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success("Produit supprimé");
    onSaved();
    onClose();
  };

  const compressImage = (file: File, maxSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const MAX_DIM = 1920;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error("Compression échouée"));
              if (blob.size <= maxSize || quality <= 0.3) {
                resolve(blob);
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            "image/webp",
            quality
          );
        };
        tryCompress();
      };
      img.onerror = () => reject(new Error("Impossible de lire l'image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File) => {
    if (!productId) {
      toast.error("Enregistrez d'abord le produit");
      return;
    }

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format accepté : JPG, PNG ou WebP");
      return;
    }

    setUploadingImage(true);

    const MAX_SIZE = 5 * 1024 * 1024;
    let uploadFile: File | Blob = file;
    let contentType = file.type;

    if (file.size > MAX_SIZE) {
      try {
        uploadFile = await compressImage(file, MAX_SIZE);
        contentType = "image/webp";
      } catch {
        toast.error("Impossible de compresser l'image");
        setUploadingImage(false);
        return;
      }
    }

    const supabase = createClient();
    const ext = contentType === "image/webp" ? "webp" : (file.name.split(".").pop() || "jpg");
    const filePath = `${restaurantId}/${productId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, uploadFile, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      toast.error(uploadError.message || "Erreur lors de l'upload");
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const newImageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("products")
      .update({ image_url: newImageUrl })
      .eq("id", productId);

    setImageUrl(newImageUrl);
    setUploadingImage(false);
    onSaved();
    toast.success("Photo ajoutée");
  };

  const removeImage = async () => {
    if (!productId || !imageUrl) return;

    const supabase = createClient();
    const pathMatch = imageUrl.split("/product-images/")[1]?.split("?")[0];
    if (pathMatch) {
      await supabase.storage.from("product-images").remove([pathMatch]);
    }

    await supabase
      .from("products")
      .update({ image_url: null })
      .eq("id", productId);

    setImageUrl(null);
    onSaved();
    toast.success("Photo supprimée");
  };

  // Modifier group handlers
  const addModifierGroup = async () => {
    if (!productId) {
      toast.error("Enregistrez d'abord le produit");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("modifier_groups")
      .insert({
        name: "Nouveau groupe",
        product_id: productId,
        min_select: 0,
        max_select: 1,
        sort_order: modifierGroups.length,
      })
      .select()
      .single<ModifierGroup>();

    if (error || !data) {
      toast.error("Erreur lors de l'ajout du groupe");
      return;
    }

    setModifierGroups((prev) => [...prev, { ...data, modifiers: [] }]);
  };

  const updateModifierGroup = async (
    groupId: string,
    updates: Partial<ModifierGroup>
  ) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("modifier_groups")
      .update(updates)
      .eq("id", groupId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    setModifierGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const deleteModifierGroup = async (groupId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("modifier_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    setModifierGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Modifier handlers
  const addModifier = async (groupId: string) => {
    const supabase = createClient();
    const group = modifierGroups.find((g) => g.id === groupId);

    const { data, error } = await supabase
      .from("modifiers")
      .insert({
        name: "Nouvelle option",
        price_extra: 0,
        group_id: groupId,
        sort_order: group?.modifiers.length || 0,
      })
      .select()
      .single<Modifier>();

    if (error || !data) {
      toast.error("Erreur lors de l'ajout");
      return;
    }

    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, modifiers: [...g.modifiers, data] } : g
      )
    );
  };

  const updateModifier = async (
    modifierId: string,
    groupId: string,
    updates: Partial<Modifier>
  ) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("modifiers")
      .update(updates)
      .eq("id", modifierId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              modifiers: g.modifiers.map((m) =>
                m.id === modifierId ? { ...m, ...updates } : m
              ),
            }
          : g
      )
    );
  };

  const deleteModifier = async (modifierId: string, groupId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("modifiers")
      .delete()
      .eq("id", modifierId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, modifiers: g.modifiers.filter((m) => m.id !== modifierId) }
          : g
      )
    );
  };

  const duplicateModifierGroup = async (group: ModifierGroupWithModifiers) => {
    if (!productId) return;

    const supabase = createClient();
    const { data: newGroup, error } = await supabase
      .from("modifier_groups")
      .insert({
        name: `${group.name} (copie)`,
        product_id: productId,
        min_select: group.min_select,
        max_select: group.max_select,
        sort_order: modifierGroups.length,
      })
      .select()
      .single<ModifierGroup>();

    if (error || !newGroup) {
      toast.error("Erreur lors de la duplication");
      return;
    }

    let newModifiers: Modifier[] = [];
    if (group.modifiers.length > 0) {
      const { data: mods, error: modError } = await supabase
        .from("modifiers")
        .insert(
          group.modifiers.map((m, i) => ({
            name: m.name,
            price_extra: m.price_extra,
            group_id: newGroup.id,
            sort_order: i,
          }))
        )
        .select()
        .returns<Modifier[]>();

      if (!modError && mods) {
        newModifiers = mods;
      }
    }

    setModifierGroups((prev) => [
      ...prev,
      { ...newGroup, modifiers: newModifiers },
    ]);
    toast.success("Option dupliquée");
  };

  const duplicateModifier = async (modifier: Modifier, groupId: string) => {
    const supabase = createClient();
    const group = modifierGroups.find((g) => g.id === groupId);

    const { data, error } = await supabase
      .from("modifiers")
      .insert({
        name: `${modifier.name} (copie)`,
        price_extra: modifier.price_extra,
        group_id: groupId,
        sort_order: group?.modifiers.length || 0,
      })
      .select()
      .single<Modifier>();

    if (error || !data) {
      toast.error("Erreur lors de la duplication");
      return;
    }

    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, modifiers: [...g.modifiers, data] } : g
      )
    );
  };

  const isEditing = !!productId;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-md p-0 gap-0" showCloseButton={false}>
        {/* Fixed header */}
        <SheetHeader className="border-b px-4 py-3 flex-row items-center justify-between">
          <SheetTitle className="text-base">
            {product ? "Modifier le produit" : "Nouveau produit"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {product
              ? "Modifier les détails du produit"
              : "Créer un nouveau produit"}
          </SheetDescription>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-4">
            {/* Image */}
            <div
              className="relative"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragging(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) uploadImage(file);
              }}
            >
              <label
                className={`relative flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/50 hover:border-primary/50 hover:bg-muted"
                }`}
              >
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <Camera className="h-7 w-7" />
                    <span className="text-xs font-medium">
                      {dragging ? "Déposez l'image" : "Ajouter une photo"}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {imageUrl && (
                <button
                  onClick={removeImage}
                  aria-label="Supprimer l'image"
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="product-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Nom
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Tacos 1 Viande"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="product-description"
                className="text-xs font-medium text-muted-foreground"
              >
                Description
              </Label>
              <textarea
                id="product-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Galette fraîche, viande au choix..."
                rows={2}
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              />
            </div>

            {/* Price + Category side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="product-price"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Prix
                </Label>
                <div className="relative">
                  <Input
                    id="product-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceEuros}
                    onChange={(e) => setPriceEuros(e.target.value)}
                    placeholder="7.50"
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Catégorie
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Settings card */}
            <div className="space-y-3 rounded-xl bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Disponible</Label>
                <Switch
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">À la une</Label>
                  <p className="text-[11px] text-muted-foreground">Affiché en haut du menu</p>
                </div>
                <Switch
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Proposer en Menu</Label>
                  <Switch
                    checked={menuEnabled}
                    onCheckedChange={setMenuEnabled}
                  />
                </div>
                {menuEnabled && (
                  <div className="space-y-2.5 pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Supplément menu
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={menuSupplementEuros}
                          onChange={(e) =>
                            setMenuSupplementEuros(e.target.value)
                          }
                          placeholder="3.00"
                          className="h-8 pr-8"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          €
                        </span>
                      </div>
                    </div>
                    {/* Dynamic menu composition */}
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            Composition du menu
                          </Label>
                          <button
                            onClick={addMenuChoiceGroup}
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Plus className="h-3 w-3" />
                            Groupe
                          </button>
                        </div>

                        {menuChoiceGroups.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-lg border border-border p-2.5"
                          >
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <Input
                                value={group.name}
                                onChange={(e) =>
                                  setMenuChoiceGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, name: e.target.value }
                                        : g
                                    )
                                  )
                                }
                                onBlur={(e) =>
                                  updateMenuChoiceGroup(group.id, {
                                    name: e.target.value,
                                  })
                                }
                                className="h-6 flex-1 text-xs font-medium"
                              />
                              <button
                                onClick={() =>
                                  deleteMenuChoiceGroup(group.id)
                                }
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>Min</span>
                              <Input
                                type="number"
                                min="0"
                                value={group.min_select}
                                onChange={(e) => {
                                  const val =
                                    parseInt(e.target.value) || 0;
                                  setMenuChoiceGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, min_select: val }
                                        : g
                                    )
                                  );
                                }}
                                onBlur={(e) =>
                                  updateMenuChoiceGroup(group.id, {
                                    min_select:
                                      parseInt(e.target.value) || 0,
                                  })
                                }
                                className="h-5 w-12 text-center text-[11px]"
                              />
                              <span>Max</span>
                              <Input
                                type="number"
                                min="1"
                                value={group.max_select}
                                onChange={(e) => {
                                  const val =
                                    parseInt(e.target.value) || 1;
                                  setMenuChoiceGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? { ...g, max_select: val }
                                        : g
                                    )
                                  );
                                }}
                                onBlur={(e) =>
                                  updateMenuChoiceGroup(group.id, {
                                    max_select:
                                      parseInt(e.target.value) || 1,
                                  })
                                }
                                className="h-5 w-12 text-center text-[11px]"
                              />
                            </div>

                            {/* Selected products as chips */}
                            {group.menu_choice_items.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1">
                                {group.menu_choice_items.map((item) => {
                                  const prod =
                                    allRestaurantProducts.find(
                                      (p) => p.id === item.product_id
                                    );
                                  return (
                                    <span
                                      key={item.id}
                                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary"
                                    >
                                      {prod?.name || "..."}
                                      <button
                                        onClick={() =>
                                          toggleMenuChoiceItem(
                                            group.id,
                                            item.product_id
                                          )
                                        }
                                        className="hover:text-destructive"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Product picker toggle */}
                            <button
                              onClick={() =>
                                setExpandedPicker(
                                  expandedPicker === group.id
                                    ? null
                                    : group.id
                                )
                              }
                              className="text-[11px] text-primary hover:underline"
                            >
                              {expandedPicker === group.id
                                ? "Masquer"
                                : "Sélectionner des articles"}
                            </button>

                            {/* Product picker */}
                            {expandedPicker === group.id && (
                              <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-border bg-background p-2">
                                {categories
                                  .filter((c) => c.is_visible)
                                  .map((cat) => {
                                    const prods =
                                      allRestaurantProducts.filter(
                                        (p) =>
                                          p.category_id === cat.id &&
                                          p.id !== productId
                                      );
                                    if (prods.length === 0) return null;
                                    return (
                                      <div
                                        key={cat.id}
                                        className="mb-2 last:mb-0"
                                      >
                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          {cat.name}
                                        </p>
                                        <div className="space-y-0.5">
                                          {prods.map((prod) => {
                                            const isSelected =
                                              group.menu_choice_items.some(
                                                (i) =>
                                                  i.product_id ===
                                                  prod.id
                                              );
                                            return (
                                              <button
                                                key={prod.id}
                                                onClick={() =>
                                                  toggleMenuChoiceItem(
                                                    group.id,
                                                    prod.id
                                                  )
                                                }
                                                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                                                  isSelected
                                                    ? "bg-primary/10 text-primary"
                                                    : "hover:bg-accent"
                                                }`}
                                              >
                                                <span
                                                  className={`block h-3 w-3 shrink-0 rounded-sm border transition-colors ${
                                                    isSelected
                                                      ? "border-primary bg-primary"
                                                      : "border-border"
                                                  }`}
                                                />
                                                <span className="flex-1 truncate">
                                                  {prod.name}
                                                </span>
                                                {!prod.is_available && (
                                                  <span className="text-[10px] text-muted-foreground">
                                                    indispo
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        ))}

                        {menuChoiceGroups.length === 0 && (
                          <p className="py-1 text-center text-[11px] text-muted-foreground">
                            Ajoutez des groupes pour composer le menu
                          </p>
                        )}
                      </div>
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Options</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addModifierGroup}
                    className="h-7 text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Ajouter
                  </Button>
                </div>

                {/* Shared sections chips */}
                {allSharedGroups.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Sections partagées
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allSharedGroups.map((sg) => {
                        const isLinked = linkedSharedGroupIds.includes(sg.id);
                        return (
                          <button
                            key={sg.id}
                            onClick={() =>
                              isLinked
                                ? unlinkSharedGroup(sg.id)
                                : linkSharedGroup(sg.id)
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                              isLinked
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            <Layers className="h-3 w-3" />
                            {sg.name}
                            {isLinked && <X className="ml-0.5 h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Option groups */}
                <div className="space-y-3">
                  {/* Linked shared groups */}
                  {linkedSharedGroupIds.map((gid) => {
                    const group = allSharedGroups.find((g) => g.id === gid);
                    if (!group) return null;
                    return (
                      <div
                        key={`shared-${group.id}`}
                        className="rounded-xl border border-primary/20 bg-primary/5 p-3"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              <Layers className="h-2.5 w-2.5" />
                              Partagée
                            </span>
                            <span className="truncate text-sm font-medium">
                              {group.name}
                            </span>
                          </div>
                          <button
                            onClick={() => detachSharedGroup(group)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Détacher pour personnaliser"
                          >
                            <Link2Off className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => unlinkSharedGroup(group.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Retirer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mb-2 text-xs text-muted-foreground">
                          Min {group.min_select} · Max {group.max_select}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {group.shared_modifiers.map((m) => (
                            <span
                              key={m.id}
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                                m.is_available
                                  ? "border-border bg-background"
                                  : "border-border bg-muted text-muted-foreground line-through opacity-60"
                              }`}
                            >
                              {m.name}
                              {m.price_extra > 0 && (
                                <span className="ml-1 text-muted-foreground">
                                  +{(m.price_extra / 100).toFixed(2)}€
                                </span>
                              )}
                              {!m.is_available && (
                                <span className="ml-1 text-[9px] no-underline">
                                  (rupture)
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Per-product modifier groups */}
                  {modifierGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-xl border border-border p-3"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <Input
                          value={group.name}
                          onChange={(e) => {
                            setModifierGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id
                                  ? { ...g, name: e.target.value }
                                  : g
                              )
                            );
                          }}
                          onBlur={(e) =>
                            updateModifierGroup(group.id, {
                              name: e.target.value,
                            })
                          }
                          className="h-7 flex-1 text-sm font-medium"
                        />
                        <button
                          onClick={() => duplicateModifierGroup(group)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Dupliquer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteModifierGroup(group.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Min/Max inline */}
                      <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Min</span>
                        <Input
                          type="number"
                          min="0"
                          value={group.min_select}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setModifierGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id
                                  ? { ...g, min_select: val }
                                  : g
                              )
                            );
                          }}
                          onBlur={(e) =>
                            updateModifierGroup(group.id, {
                              min_select: parseInt(e.target.value) || 0,
                            })
                          }
                          className="h-6 w-14 text-center text-xs"
                        />
                        <span>Max</span>
                        <Input
                          type="number"
                          min="1"
                          value={group.max_select}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setModifierGroups((prev) =>
                              prev.map((g) =>
                                g.id === group.id
                                  ? { ...g, max_select: val }
                                  : g
                              )
                            );
                          }}
                          onBlur={(e) =>
                            updateModifierGroup(group.id, {
                              max_select: parseInt(e.target.value) || 1,
                            })
                          }
                          className="h-6 w-14 text-center text-xs"
                        />
                      </div>

                      {/* Modifiers list */}
                      <div className="space-y-1">
                        {group.modifiers.map((modifier) => (
                          <div
                            key={modifier.id}
                            className="flex items-center gap-1.5"
                          >
                            <Input
                              value={modifier.name}
                              onChange={(e) => {
                                setModifierGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          modifiers: g.modifiers.map((m) =>
                                            m.id === modifier.id
                                              ? { ...m, name: e.target.value }
                                              : m
                                          ),
                                        }
                                      : g
                                  )
                                );
                              }}
                              onBlur={(e) =>
                                updateModifier(modifier.id, group.id, {
                                  name: e.target.value,
                                })
                              }
                              className="h-7 flex-1 text-xs"
                              placeholder="Nom"
                            />
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={(modifier.price_extra / 100).toFixed(2)}
                                onChange={(e) => {
                                  const cents = Math.round(
                                    parseFloat(e.target.value || "0") * 100
                                  );
                                  setModifierGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id
                                        ? {
                                            ...g,
                                            modifiers: g.modifiers.map((m) =>
                                              m.id === modifier.id
                                                ? { ...m, price_extra: cents }
                                                : m
                                            ),
                                          }
                                        : g
                                    )
                                  );
                                }}
                                onBlur={(e) => {
                                  const cents = Math.round(
                                    parseFloat(e.target.value || "0") * 100
                                  );
                                  updateModifier(modifier.id, group.id, {
                                    price_extra: cents,
                                  });
                                }}
                                className="h-7 w-20 pr-5 text-xs"
                                placeholder="0.00"
                              />
                              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                €
                              </span>
                            </div>
                            <Switch
                              checked={modifier.is_available}
                              onCheckedChange={(checked) => {
                                setModifierGroups((prev) =>
                                  prev.map((g) =>
                                    g.id === group.id
                                      ? {
                                          ...g,
                                          modifiers: g.modifiers.map((m) =>
                                            m.id === modifier.id
                                              ? { ...m, is_available: checked }
                                              : m
                                          ),
                                        }
                                      : g
                                  )
                                );
                                updateModifier(modifier.id, group.id, {
                                  is_available: checked,
                                });
                              }}
                              className="scale-75"
                            />
                            <button
                              onClick={() =>
                                duplicateModifier(modifier, group.id)
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                              title="Dupliquer"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() =>
                                deleteModifier(modifier.id, group.id)
                              }
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => addModifier(group.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        Ajouter une option
                      </button>
                    </div>
                  ))}
                </div>

                {linkedSharedGroupIds.length === 0 &&
                  modifierGroups.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Aucune option configurée.
                    </p>
                  )}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t bg-background p-4">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Enregistrer" : "Créer le produit"}
          </Button>
          {isEditing && (
            <button
              onClick={handleDelete}
              className="mt-2 w-full py-1 text-center text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              Supprimer ce produit
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
