"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Copy,
  Loader2,
  Trash2,
  Printer as PrinterIcon,
  Usb,
  Wifi,
} from "lucide-react";
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
import type { Printer, PrinterKind } from "@/lib/types";

// A printer that polled within this window is considered online. Generous
// enough to tolerate a 60s SDP poll interval without false "offline".
const ONLINE_THRESHOLD_MS = 3 * 60_000;

function isOnline(printer: Printer): boolean {
  if (!printer.last_seen_at) return false;
  return Date.now() - new Date(printer.last_seen_at).getTime() < ONLINE_THRESHOLD_MS;
}

// Shared key shape between PrinterManager (writer, at pairing time) and
// UsbPrintStation (reader, at every poll). Scoping the key by printer id lets
// a single cuisine station drive multiple USB printers in parallel.
export function usbPrinterTokenKey(printerId: string): string {
  return `taapr:printer-token:${printerId}`;
}

// Vendor IDs of the three printers the docs recommend, plus a couple of
// common no-name USB-to-serial bridges Xprinter ships under. Keeping the
// filter wide is intentional: WebUSB will still ask the user to pick the
// right device, the filter just prunes the picker.
const USB_FILTERS: USBDeviceFilter[] = [
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x0519 }, // Star
  { vendorId: 0x0483 }, // STMicro (Xprinter / generic ESC/POS)
  { vendorId: 0x0fe6 }, // ICS Advent (Xprinter on some SKUs)
  { vendorId: 0x28e9 }, // GD32 (Xprinter)
];

export function PrinterManager({ restaurantId }: { restaurantId: string }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<PrinterKind>("epson_sdp");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{
    kind: PrinterKind;
    name: string;
    pollUrl: string;
    token: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pairingId, setPairingId] = useState<string | null>(null);

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
        body: JSON.stringify({
          restaurant_id: restaurantId,
          name: newName.trim(),
          kind: newKind,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      // USB printers store the token locally so the cuisine page station can
      // authenticate /api/print/web-poll without asking the user to paste it.
      if (newKind === "usb_thermal") {
        localStorage.setItem(
          usbPrinterTokenKey(data.printer.id),
          data.full_token,
        );
      }
      setRevealed({
        kind: newKind,
        name: data.printer.name,
        pollUrl: data.poll_url,
        token: data.full_token,
      });
      setCreateOpen(false);
      setNewName("");
      setNewKind("epson_sdp");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const patchPrinter = async (
    printer: Printer,
    updates: Partial<Printer>,
  ) => {
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
      if (printer.kind === "usb_thermal") {
        localStorage.removeItem(usbPrinterTokenKey(printer.id));
      }
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

  const pairUsb = async (printer: Printer) => {
    if (typeof navigator === "undefined" || !("usb" in navigator)) {
      toast.error(
        "WebUSB n'est pas disponible. Ouvrez cette page dans Chrome ou Edge.",
      );
      return;
    }
    setPairingId(printer.id);
    try {
      const device = await navigator.usb.requestDevice({ filters: USB_FILTERS });
      await patchPrinter(printer, {
        usb_vendor_id: device.vendorId,
        usb_product_id: device.productId,
      });
      toast.success(
        "Imprimante appairée. Ouvrez l'écran cuisine pour qu'elle commence à imprimer.",
      );
    } catch (e) {
      // User cancellation: DOMException with name 'NotFoundError'. Not an error.
      if (e instanceof DOMException && e.name === "NotFoundError") return;
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de l'appairage USB",
      );
    } finally {
      setPairingId(null);
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
                Imprimantes WiFi (Epson) ou USB (toutes ESC/POS) — tickets
                cuisine & reçus clients
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
              Aucune imprimante. Ajoutez-en une — WiFi (Epson) pour une
              installation sans poste, ou USB pour une option économique
              pilotée depuis l&apos;écran cuisine.
            </p>
          ) : (
            <div className="space-y-2">
              {printers.map((printer) => {
                const online = isOnline(printer);
                const isUsb = printer.kind === "usb_thermal";
                const paired = !!printer.usb_vendor_id;
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
                        <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                          {isUsb ? (
                            <Usb className="h-3 w-3" />
                          ) : (
                            <Wifi className="h-3 w-3" />
                          )}
                          {isUsb ? "USB" : "WiFi"} · {printer.token_prefix}…
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

                    {isUsb && (
                      <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs">
                        {paired ? (
                          <span className="text-muted-foreground">
                            Appairée via Chrome (USB {printer.usb_vendor_id?.toString(16).padStart(4, "0")}:
                            {printer.usb_product_id?.toString(16).padStart(4, "0")}).
                            L&apos;écran cuisine imprimera tant qu&apos;il reste ouvert.
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Branchez l&apos;USB, puis cliquez ci-dessous pour
                            autoriser Chrome à l&apos;utiliser.
                          </span>
                        )}
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => pairUsb(printer)}
                            disabled={pairingId === printer.id}
                          >
                            {pairingId === printer.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : paired ? (
                              "Réappairer"
                            ) : (
                              "Appairer l'imprimante USB"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

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
              <Label className="text-xs">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewKind("epson_sdp")}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                    newKind === "epson_sdp"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Wifi className="h-3 w-3" /> WiFi (Epson)
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Server Direct Print. Imprime sans ordi.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setNewKind("usb_thermal")}
                  className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                    newKind === "usb_thermal"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Usb className="h-3 w-3" /> USB (ESC/POS)
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Branchée sur l&apos;écran cuisine. Option économique.
                  </p>
                </button>
              </div>
            </div>
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
            <DialogTitle>
              {revealed?.kind === "usb_thermal"
                ? "Imprimante USB créée — appairez-la maintenant"
                : "Imprimante créée — configurez-la maintenant"}
            </DialogTitle>
          </DialogHeader>
          {revealed && revealed.kind === "usb_thermal" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Le jeton a été enregistré localement sur ce navigateur pour que
                l&apos;écran cuisine puisse piloter l&apos;imprimante. Il ne
                sera plus affiché — copiez-le quand même si vous voulez
                ouvrir l&apos;écran cuisine sur un autre poste.
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Jeton (à conserver)</Label>
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
              <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                <strong>Étape suivante :</strong> branchez l&apos;USB sur le
                poste qui affiche l&apos;écran cuisine, fermez ce dialogue, puis
                cliquez « Appairer l&apos;imprimante USB » sur la carte qui
                vient d&apos;apparaître.
              </p>
            </div>
          )}
          {revealed && revealed.kind !== "usb_thermal" && (
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
              {revealed?.kind === "usb_thermal"
                ? "OK, j'appaire l'imprimante"
                : "J'ai configuré l'imprimante"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
