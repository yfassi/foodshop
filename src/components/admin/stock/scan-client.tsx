"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { parseReceipt } from "@/lib/stock/parse-receipt";
import type {
  Ingredient,
  IngredientUnit,
  ParsedScanLine,
  Supplier,
} from "@/lib/types";

type DraftLine = ParsedScanLine & {
  uid: string;
  ingredient_id: string | null;
};

const UNIT_OPTIONS: IngredientUnit[] = ["kg", "g", "l", "ml", "piece"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

async function compressToWebp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1600;
      let { width, height } = img;
      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("blob"))),
        "image/webp",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img"));
    };
    img.src = url;
  });
}

export function ScanClient({
  publicId,
  restaurantId,
}: {
  publicId: string;
  restaurantId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [ocrRaw, setOcrRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch(`/api/admin/stock/suppliers?restaurant_id=${restaurantId}`).then((r) => r.json()),
      fetch(`/api/admin/stock/ingredients?restaurant_id=${restaurantId}`).then((r) =>
        r.json()
      ),
    ]);
    setSuppliers(a.suppliers || []);
    setIngredients(b.ingredients || []);
  }, [restaurantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ingredientByName = useMemo(() => {
    const m = new Map<string, Ingredient>();
    for (const i of ingredients) m.set(i.name.toLowerCase(), i);
    return m;
  }, [ingredients]);

  const handleFile = (f: File) => {
    setFile(f);
    setLines([]);
    setOcrRaw("");
    setImageUrl(null);
    setScanId(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const runOcr = async () => {
    if (!file) return;
    setRunning(true);
    setProgress(0);
    try {
      // 1) Compress + upload to storage
      const blob = await compressToWebp(file);
      const supabase = createClient();
      const path = `${restaurantId}/${Date.now()}-${uid()}.webp`;
      const { error: uploadErr } = await supabase.storage
        .from("stock-receipts")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage
        .from("stock-receipts")
        .getPublicUrl(path);
      setImageUrl(pub.publicUrl);

      // 2) Tesseract OCR (browser)
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(blob, "fra", {
        logger: (m: { progress?: number; status?: string }) => {
          if (m.progress != null) setProgress(Math.round((m.progress || 0) * 100));
        },
      });
      const text = (data?.text as string) || "";
      setOcrRaw(text);

      // 3) Parse + suggest ingredient matches
      const parsed = parseReceipt(text);
      const drafts: DraftLine[] = parsed.map((p) => {
        const match = ingredientByName.get(p.name.toLowerCase());
        return {
          ...p,
          uid: uid(),
          unit: p.unit ?? match?.unit ?? "piece",
          ingredient_id: match?.id ?? null,
        };
      });
      setLines(drafts);

      // 4) Save draft scan to DB
      const res = await fetch("/api/admin/stock/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          image_url: pub.publicUrl,
          ocr_raw: text,
          parsed_items: drafts.map((d) => ({
            name: d.name,
            qty: d.qty,
            unit: d.unit,
            price_cents: d.price_cents,
          })),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setScanId(created.id);
      }
      if (drafts.length === 0) {
        toast.warning("Aucune ligne reconnue. Ajoutez-les manuellement.");
      } else {
        toast.success(`${drafts.length} ligne(s) reconnue(s)`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur OCR");
    } finally {
      setRunning(false);
    }
  };

  const updateLine = (uidStr: string, patch: Partial<DraftLine>) => {
    setLines((ls) => ls.map((l) => (l.uid === uidStr ? { ...l, ...patch } : l)));
  };

  const removeLine = (uidStr: string) => {
    setLines((ls) => ls.filter((l) => l.uid !== uidStr));
  };

  const addLine = () => {
    setLines((ls) => [
      ...ls,
      {
        uid: uid(),
        name: "",
        qty: 1,
        unit: "piece",
        price_cents: null,
        ingredient_id: null,
      },
    ]);
  };

  const totalCents = lines.reduce((sum, l) => sum + (l.price_cents || 0), 0);

  const validate = async () => {
    if (!scanId) {
      toast.error("Lancez d'abord la reconnaissance");
      return;
    }
    const clean = lines.filter((l) => (l.ingredient_id || l.name.trim()) && l.qty > 0);
    if (clean.length === 0) {
      toast.error("Aucune ligne valide");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/stock/scans/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        scan_id: scanId,
        supplier_id: supplierId || null,
        total_cents: totalCents > 0 ? totalCents : null,
        lines: clean.map((l) => ({
          ingredient_id: l.ingredient_id,
          name: l.name,
          qty: l.qty,
          unit: l.unit,
          price_cents: l.price_cents,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur");
      return;
    }
    const result = await res.json();
    toast.success(`${result.applied} ligne(s) intégrée(s) au stock`);
    setFile(null);
    setLines([]);
    setOcrRaw("");
    setImageUrl(null);
    setScanId(null);
    setSupplierId("");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    refresh();
  };

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <Link
        href={`/admin/${publicId}/stock`}
        className="-ml-1 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
          ★ Réception
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Scanner un ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photographiez le bon de livraison fournisseur. La reconnaissance se fait
          dans votre navigateur — vos images ne sortent que pour archivage.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label
              className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground transition-colors hover:bg-muted"
              htmlFor="receipt-input"
            >
              {previewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="ticket"
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <>
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium text-foreground">
                    Prendre une photo
                  </span>
                  <span className="text-xs">ou déposer une image</span>
                </>
              )}
              <input
                id="receipt-input"
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>

            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fournisseur
                </Label>
                <select
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">— Optionnel —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="h-12 rounded-xl"
                onClick={runOcr}
                disabled={!file || running}
              >
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconnaissance… {progress}%
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Lancer la reconnaissance
                  </>
                )}
              </Button>
              {file && !running && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => {
                    setFile(null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setLines([]);
                  }}
                >
                  Choisir une autre photo
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(lines.length > 0 || ocrRaw) && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Lignes reconnues</p>
              <Button variant="outline" size="sm" className="rounded-lg" onClick={addLine}>
                <Plus className="mr-1 h-4 w-4" />
                Ligne
              </Button>
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune ligne. Ajoutez-les manuellement.
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((l) => (
                  <div
                    key={l.uid}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border bg-card p-2"
                  >
                    <div className="col-span-12 md:col-span-5">
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={l.ingredient_id || ""}
                        onChange={(e) => {
                          const v = e.target.value || null;
                          const ing = v ? ingredients.find((i) => i.id === v) : null;
                          updateLine(l.uid, {
                            ingredient_id: v,
                            name: ing?.name || l.name,
                            unit: (ing?.unit as IngredientUnit) || l.unit,
                          });
                        }}
                      >
                        <option value="">— Nouvel ingrédient —</option>
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-7 md:col-span-3">
                      <Input
                        className="h-10"
                        value={l.name}
                        onChange={(e) => updateLine(l.uid, { name: e.target.value })}
                        placeholder="Nom"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-1">
                      <Input
                        className="h-10"
                        inputMode="decimal"
                        value={String(l.qty)}
                        onChange={(e) =>
                          updateLine(l.uid, {
                            qty: parseFloat(e.target.value.replace(",", ".")) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-1 text-sm"
                        value={l.unit || "piece"}
                        onChange={(e) =>
                          updateLine(l.uid, { unit: e.target.value as IngredientUnit })
                        }
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-10 md:col-span-1">
                      <Input
                        className="h-10"
                        inputMode="decimal"
                        placeholder="€"
                        value={
                          l.price_cents != null ? String(l.price_cents / 100) : ""
                        }
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(",", "."));
                          updateLine(l.uid, {
                            price_cents: Number.isFinite(v) ? Math.round(v * 100) : null,
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="col-span-2 flex h-10 items-center justify-center rounded-md text-muted-foreground hover:text-destructive md:col-span-1"
                      onClick={() => removeLine(l.uid)}
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageUrl && lines.length > 0 && (
              <div className="flex justify-end">
                <Button
                  className="h-11 rounded-xl"
                  onClick={validate}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Intégrer au stock
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
