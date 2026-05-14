"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Copy, Loader2, Trash2, Printer as PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Printer } from "@/lib/types";

// A printer that polled within this window is considered online. Generous
// enough to tolerate a 60s SDP poll interval without false "offline".
const ONLINE_THRESHOLD_MS = 3 * 60_000;

function isOnline(printer: Printer): boolean {
  if (!printer.last_seen_at) return false;
  return Date.now() - new Date(printer.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
}

export function PrinterManager({ restaurantId }: { restaurantId: string }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{
    name: string;
    pollUrl: string;
    token: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/printers?restaurant_id=${restaurantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setPrinters(data.printers ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    load();
    // Refresh the online/offline status periodically while the page is open.
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId, name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setRevealed({
        name: data.printer.name,
        pollUrl: data.poll_url,
        token: data.full_token,
      });
      setCreateOpen(false);
      setNewName("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const patchPrinter = async (printer: Printer, updates: Partial<Printer>) => {
    // Optimistic — revert on failure.
    const previous = printers;
    setPrinters((prev) =>
      prev.map((p) => (p.id === printer.id ? { ...p, ...updates } : p)),
    );
    try {
      const res = await fetch("/api/admin/printers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: printer.id,
          restaurant_id: restaurantId,
          ...updates,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPrinters(previous);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (printer: Printer) => {
    if (
      !confirm(
        `Supprimer l'imprimante « ${printer.name} » ? Elle cessera immédiatement d'imprimer.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/printers?id=${printer.id}&restaurant_id=${restaurantId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      setPrinters((prev) => prev.filter((p) => p.id !== printer.id));
      toast.success("Imprimante supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const testPrint = async (printer: Printer) => {
    setBusyId(printer.id);
    try {
      const res = await fetch("/api/admin/printers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ printer_id: printer.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Test envoyé — le ticket sortira d'ici quelques secondes");
    } catch {
      toast.error("Erreur lors de l'envoi du test");
    } finally {
      setBusyId(null);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
    <div className="space-y-3">
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Imprimantes tickets</CardTitle>
              <CardDescription className="text-xs">
                Imprimantes WiFi Epson (Server Direct Print) — tickets cuisine &
                reçus clients
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={loading}>
              <Plus className="h-3.5 w-3.5" /> Nouvelle imprimante
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : printers.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Aucune imprimante. Ajoutez-en une, puis collez l&apos;URL fournie
              dans la configuration Server Direct Print de l&apos;imprimante.
            </p>
          ) : (
            <div className="space-y-2">
              {printers.map((printer) => {
                const online = isOnline(printer);
                return (
                  <div
                    key={printer.id}
                    className="rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <PrinterIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {printer.name}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {printer.token_prefix}…
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          online
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            online ? "bg-emerald-500" : "bg-zinc-400"
                          }`}
                        />
                        {online ? "En ligne" : "Hors ligne"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 border-t border-dashed border-border pt-3">
                      <label className="flex items-center justify-between gap-3 text-xs">
                        <span>Imprimer le ticket cuisine automatiquement</span>
                        <Switch
                          checked={printer.auto_print_kitchen}
                          onCheckedChange={(v) =>
                            patchPrinter(printer, { auto_print_kitchen: v })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between gap-3 text-xs">
                        <span>Imprimer le reçu client automatiquement</span>
                        <Switch
                          checked={printer.auto_print_receipt}
                          onCheckedChange={(v) =>
                            patchPrinter(printer, { auto_print_receipt: v })
                          }
                        />
                      </label>
                      <label className="flex items-center justify-between gap-3 text-xs">
                        <span>Imprimante active</span>
                        <Switch
                          checked={printer.is_active}
                          onCheckedChange={(v) =>
                            patchPrinter(printer, { is_active: v })
                          }
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testPrint(printer)}
                        disabled={busyId === printer.id}
                      >
                        {busyId === printer.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Imprimer un test"
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(printer)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle imprimante</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ex. : Cuisine, Comptoir"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal dialog — poll URL + token shown once */}
      <Dialog open={!!revealed} onOpenChange={(open) => !open && setRevealed(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Imprimante créée — configurez-la maintenant</DialogTitle>
          </DialogHeader>
          {revealed && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Dans la configuration de l&apos;imprimante Epson →{" "}
                <strong>Server Direct Print</strong>, collez cette URL et activez
                l&apos;interrogation. Elle ne sera plus affichée.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">URL d&apos;interrogation</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
                  <span className="flex-1 truncate select-all">
                    {revealed.pollUrl}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(revealed.pollUrl, "URL copiée")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Jeton (token)</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
                  <span className="flex-1 truncate select-all">
                    {revealed.token}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(revealed.token, "Jeton copié")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRevealed(null)} className="w-full">
              J&apos;ai configuré l&apos;imprimante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
