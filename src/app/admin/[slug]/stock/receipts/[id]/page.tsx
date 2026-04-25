"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { ArrowLeft, Loader2, X, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { STOCK_UNITS, type StockItem, type StockReceipt, type StockUnit } from "@/lib/types";

interface ReviewItem {
  raw_name: string;
  qty: number;
  unit: StockUnit;
  price_cents: number | null;
  matched_stock_item_id: string | null;
  create_new: boolean;
  new_name: string;
  skipped: boolean;
}

const NEW_VALUE = "__new__";
const SKIP_VALUE = "__skip__";

export default function ReceiptReviewPage() {
  const params = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.get("demo") === "true" ? "?demo=true" : "";

  const [receipt, setReceipt] = useState<StockReceipt | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: r } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", params.slug)
      .single();
    if (!r) return;

    const { data: receiptData } = await supabase
      .from("stock_receipts")
      .select("*")
      .eq("id", params.id)
      .eq("restaurant_id", r.id)
      .single();

    const { data: itemsData } = await supabase
      .from("stock_items")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("name");

    if (receiptData) {
      setReceipt(receiptData);
      const ocr = receiptData.ocr_data as StockReceipt["ocr_data"];
      const initial: ReviewItem[] = (ocr?.items ?? []).map((it) => ({
        raw_name: it.raw_name,
        qty: it.qty,
        unit: it.unit,
        price_cents: it.price_cents ?? null,
        matched_stock_item_id: it.matched_stock_item_id ?? null,
        create_new: !it.matched_stock_item_id,
        new_name: it.raw_name,
        skipped: false,
      }));
      setReviewItems(initial);
    }
    setStockItems(itemsData ?? []);
    setLoading(false);
  }, [params.slug, params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateItem = (idx: number, patch: Partial<ReviewItem>) => {
    setReviewItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const setDestination = (idx: number, value: string) => {
    if (value === SKIP_VALUE) {
      updateItem(idx, { skipped: true });
    } else if (value === NEW_VALUE) {
      updateItem(idx, { skipped: false, create_new: true, matched_stock_item_id: null });
    } else {
      updateItem(idx, { skipped: false, create_new: false, matched_stock_item_id: value });
    }
  };

  const destinationValue = (it: ReviewItem) => {
    if (it.skipped) return SKIP_VALUE;
    if (it.create_new) return NEW_VALUE;
    return it.matched_stock_item_id ?? NEW_VALUE;
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const payload = {
        restaurant_slug: params.slug,
        items: reviewItems.map((it) => ({
          raw_name: it.raw_name,
          qty: it.qty,
          unit: it.unit,
          matched_stock_item_id: it.matched_stock_item_id,
          create_new: it.create_new,
          new_name: it.new_name,
          skipped: it.skipped,
        })),
      };
      const res = await fetch(`/api/admin/stock/receipts/${params.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success(`${data.movements_created} mouvement(s) enregistré(s)`);
      router.push(`/admin/${params.slug}/stock${qs}`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!receipt) {
    return <p className="text-sm text-muted-foreground">Ticket introuvable</p>;
  }

  const isConfirmed = receipt.status === "confirmed";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/${params.slug}/stock${qs}`}>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <TypographyH2>Revue du ticket</TypographyH2>
          <TypographyMuted>
            {receipt.supplier_name || "Fournisseur inconnu"}
            {receipt.receipt_date && ` · ${new Date(receipt.receipt_date).toLocaleDateString("fr-FR")}`}
            {receipt.total_amount_cents !== null &&
              ` · Total : ${formatPrice(receipt.total_amount_cents)}`}
          </TypographyMuted>
        </div>
      </div>

      {isConfirmed && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Ticket déjà validé. Les mouvements ont été enregistrés.
        </div>
      )}

      {/* Image preview */}
      <Card>
        <CardContent className="p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receipt.image_url}
            alt="Ticket"
            className="max-h-[40vh] w-full rounded object-contain"
          />
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Articles extraits ({reviewItems.filter((i) => !i.skipped).length}/{reviewItems.length})
            </h3>
          </div>

          {reviewItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun article détecté.
            </p>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`space-y-3 rounded-lg border p-3 ${
                    item.skipped ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Détecté : <span className="font-mono">{item.raw_name}</span>
                      {item.price_cents !== null && (
                        <> · {formatPrice(item.price_cents)}</>
                      )}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => updateItem(idx, { skipped: !item.skipped })}
                      disabled={isConfirmed}
                    >
                      {item.skipped ? "Inclure" : <><X className="mr-1 h-3 w-3" />Ignorer</>}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(idx, { qty: Number(e.target.value) || 0 })
                        }
                        className="h-9 text-sm"
                        disabled={isConfirmed || item.skipped}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unité</Label>
                      <Select
                        value={item.unit}
                        onValueChange={(v) => updateItem(idx, { unit: v as StockUnit })}
                        disabled={isConfirmed || item.skipped}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STOCK_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs">Stock destinataire</Label>
                      <Select
                        value={destinationValue(item)}
                        onValueChange={(v) => setDestination(idx, v)}
                        disabled={isConfirmed}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NEW_VALUE}>+ Créer un nouvel item</SelectItem>
                          {stockItems.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={SKIP_VALUE}>Ignorer cette ligne</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {item.create_new && !item.skipped && (
                    <div className="space-y-1">
                      <Label className="text-xs">Nom du nouvel item</Label>
                      <Input
                        value={item.new_name}
                        onChange={(e) => updateItem(idx, { new_name: e.target.value })}
                        className="h-9 text-sm"
                        disabled={isConfirmed}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!isConfirmed && (
        <div className="sticky bottom-0 -mx-4 border-t bg-card/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <Button
            onClick={handleConfirm}
            disabled={submitting || reviewItems.every((i) => i.skipped)}
            className="w-full min-h-[44px]"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Valider l&apos;entrée en stock
          </Button>
        </div>
      )}
    </div>
  );
}
