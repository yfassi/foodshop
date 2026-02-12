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
  const [saving, setSaving] = useState(false);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [modifierGroups, setModifierGroups] = useState<
    ModifierGroupWithModifiers[]
  >([]);
  const [productId, setProductId] = useState<string | null>(null);

  // Shared sections
  const [allSharedGroups, setAllSharedGroups] = useState<SharedGroupWithModifiers[]>([]);
  const [linkedSharedGroupIds, setLinkedSharedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setPriceEuros((product.price / 100).toFixed(2));
      setCategoryId(product.category_id);
      setIsAvailable(product.is_available);
      setImageUrl(product.image_url);
      setProductId(product.id);
      fetchModifierGroups(product.id);
      fetchSharedSections(product.id);
    } else {
      setName("");
      setDescription("");
      setPriceEuros("");
      setCategoryId(defaultCategoryId);
      setIsAvailable(true);
      setImageUrl(null);
      setProductId(null);
      setModifierGroups([]);
      setAllSharedGroups([]);
      setLinkedSharedGroupIds([]);
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

  const fetchSharedSections = async (pid: string) => {
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
    const { data: links } = await supabase
      .from("product_shared_groups")
      .select("shared_group_id")
      .eq("product_id", pid);

    setLinkedSharedGroupIds((links || []).map((l) => l.shared_group_id));
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

    setSaving(true);
    const supabase = createClient();

    if (productId) {
      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          price: priceInCents,
          category_id: categoryId,
          is_available: isAvailable,
        })
        .eq("id", productId);

      if (error) {
        toast.error("Erreur lors de la mise à jour");
        setSaving(false);
        return;
      }
      toast.success("Produit mis à jour");
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          price: priceInCents,
          category_id: categoryId,
          is_available: isAvailable,
        })
        .select("id")
        .single();

      if (error || !data) {
        toast.error("Erreur lors de la création");
        setSaving(false);
        return;
      }

      setProductId(data.id);
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
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {product ? "Modifier le produit" : "Nouveau produit"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {product
              ? "Modifier les détails du produit"
              : "Créer un nouveau produit"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          {/* Image */}
          {isEditing && (
            <div>
              <Label className="mb-2 block text-sm">Photo</Label>
              <div className="relative">
                <label className="relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted transition-colors hover:border-primary">
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
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">Ajouter une photo</span>
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
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="product-name">Nom</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tacos 1 Viande"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Galette fraîche, viande au choix, frites..."
              rows={3}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="product-price">Prix (EUR)</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              placeholder="7.50"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une catégorie" />
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

          {/* Availability */}
          <div className="flex items-center justify-between">
            <Label>Disponible</Label>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>

          {/* Save */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Enregistrer" : "Créer le produit"}
          </Button>

          {/* Options — unified shared + per-product */}
          {isEditing && (
            <>
              <Separator />
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Options</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addModifierGroup}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Nouvelle section
                  </Button>
                </div>

                {/* Quick-add shared sections as toggleable chips */}
                {allSharedGroups.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs text-muted-foreground">
                      Sections réutilisables
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
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                              isLinked
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            <Layers className="h-3 w-3" />
                            {sg.name}
                            {isLinked && (
                              <X className="h-3 w-3 ml-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All option groups: linked shared first, then per-product */}
                <div className="space-y-4">
                  {/* Linked shared groups (read-only with detach option) */}
                  {linkedSharedGroupIds.map((gid) => {
                    const group = allSharedGroups.find((g) => g.id === gid);
                    if (!group) return null;
                    return (
                      <div
                        key={`shared-${group.id}`}
                        className="rounded-lg border border-primary/30 bg-primary/5 p-3"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              <Layers className="h-2.5 w-2.5" />
                              Partagée
                            </span>
                            <span className="text-sm font-medium truncate">
                              {group.name}
                            </span>
                          </div>
                          <button
                            onClick={() => detachSharedGroup(group)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Détacher pour personnaliser"
                          >
                            <Link2Off className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => unlinkSharedGroup(group.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Retirer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="text-xs text-muted-foreground mb-1.5">
                          Min {group.min_select} · Max {group.max_select}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {group.shared_modifiers.map((m) => (
                            <span
                              key={m.id}
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border ${
                                m.is_available
                                  ? "bg-background border-border"
                                  : "bg-muted border-border text-muted-foreground line-through opacity-60"
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

                        <p className="mt-2 text-[10px] text-muted-foreground italic">
                          Détachez pour personnaliser les options de cet article
                        </p>
                      </div>
                    );
                  })}

                  {/* Per-product modifier groups (editable) */}
                  {modifierGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-lg border border-border p-3"
                    >
                      {/* Group header */}
                      <div className="mb-2 flex items-start gap-2">
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
                          className="h-8 text-sm font-medium"
                        />
                        <button
                          onClick={() => duplicateModifierGroup(group)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Dupliquer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteModifierGroup(group.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Min/Max */}
                      <div className="mb-3 flex gap-2">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">
                            Min
                          </Label>
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
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">
                            Max
                          </Label>
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
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Modifiers list */}
                      <div className="space-y-1.5">
                        {group.modifiers.map((modifier) => (
                          <div
                            key={modifier.id}
                            className="flex items-center gap-2"
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
                              className="h-7 w-20 text-xs"
                              placeholder="0.00"
                            />
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

                {linkedSharedGroupIds.length === 0 && modifierGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucune option. Activez une section réutilisable ci-dessus ou créez une nouvelle section.
                  </p>
                )}
              </div>
            </>
          )}

          {/* Delete */}
          {isEditing && (
            <>
              <Separator />
              <Button
                variant="outline"
                onClick={handleDelete}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer le produit
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
