"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Supplier } from "@/lib/types";

type FormState = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY: FormState = { name: "", phone: "", email: "", notes: "" };

export function SuppliersClient({
  publicId,
  restaurantId,
}: {
  publicId: string;
  restaurantId: string;
}) {
  const [items, setItems] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/stock/suppliers?restaurant_id=${restaurantId}`);
    const data = await res.json();
    setItems(data.suppliers || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Nom requis");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/stock/suppliers", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        id: form.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur");
      return;
    }
    setOpen(false);
    toast.success(form.id ? "Modifié" : "Fournisseur ajouté");
    load();
  };

  const remove = async (s: Supplier) => {
    if (!confirm(`Supprimer "${s.name}" ?`)) return;
    const res = await fetch(
      `/api/admin/stock/suppliers?id=${s.id}&restaurant_id=${restaurantId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success("Supprimé");
    load();
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/${publicId}/stock`}
        className="-ml-1 inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
            ★ Carnet
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Fournisseurs</h1>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY);
            setOpen(true);
          }}
          className="rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Aucun fournisseur.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[s.phone, s.email].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setForm({
                        id: s.id,
                        name: s.name,
                        phone: s.phone || "",
                        email: s.email || "",
                        notes: s.notes || "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => remove(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form.id ? "Modifier" : "Nouveau fournisseur"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 py-2">
            <div>
              <Label className="text-sm font-medium">Nom</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Téléphone</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input
                className="mt-1.5 h-11"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Input
                className="mt-1.5 h-11"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={submit} disabled={saving} className="h-11 w-full rounded-xl">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
