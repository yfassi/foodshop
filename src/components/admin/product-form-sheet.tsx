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
import { Camera, Loader2, Plus, Trash2, X } from "lucide-react";
import type { Category, Product, ModifierGroup, Modifier } from "@/lib/types";

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
    } else {
      setName("");
      setDescription("");
      setPriceEuros("");
      setCategoryId(defaultCategoryId);
      setIsAvailable(true);
      setImageUrl(null);
      setProductId(null);
      setModifierGroups([]);
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

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const priceInCents = Math.round(parseFloat(priceEuros) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      toast.error("Le prix doit etre superieur a 0");
      return;
    }

    if (!categoryId) {
      toast.error("Veuillez selectionner une categorie");
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
        toast.error("Erreur lors de la mise a jour");
        setSaving(false);
        return;
      }
      toast.success("Produit mis a jour");
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
        toast.error("Erreur lors de la creation");
        setSaving(false);
        return;
      }

      setProductId(data.id);
      toast.success("Produit cree");
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

    toast.success("Produit supprime");
    onSaved();
    onClose();
  };

  const uploadImage = async (file: File) => {
    if (!productId) {
      toast.error("Enregistrez d'abord le produit");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format accepte : JPG, PNG ou WebP");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("L'image ne doit pas depasser 5 Mo");
      return;
    }

    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${restaurantId}/${productId}.${ext}`;

    setUploadingImage(true);

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur lors de l'upload");
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
    toast.success("Photo ajoutee");
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
    toast.success("Photo supprimee");
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
      toast.error("Erreur lors de la mise a jour");
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
      toast.error("Erreur lors de la mise a jour");
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
              ? "Modifier les details du produit"
              : "Creer un nouveau produit"}
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
              placeholder="Ex: Galette fraiche, viande au choix, frites..."
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
            <Label>Categorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une categorie" />
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
            {isEditing ? "Enregistrer" : "Creer le produit"}
          </Button>

          {/* Modifier Groups */}
          {isEditing && (
            <>
              <Separator />
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Groupes d&apos;options
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addModifierGroup}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Ajouter
                  </Button>
                </div>

                {modifierGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun groupe d&apos;options. Ajoutez des groupes pour
                    proposer des choix (viande, sauce, etc.)
                  </p>
                )}

                <div className="space-y-4">
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
