"use client";

// In-browser print bridge for kind='usb_thermal' printers. Mounted on the
// admin commandes page (/admin/[publicId]) so it runs whenever the kitchen
// has the screen open. For each USB printer the restaurant has:
//
// 1. Look up the device that was authorized at pairing time via
//    navigator.usb.getDevices() — Chrome remembers the grant across reloads.
// 2. Poll /api/print/web-poll every ~8s with the printer's token (stored in
//    localStorage at creation).
// 3. When a job arrives, decode the base64 ESC/POS bytes, claim a bulk OUT
//    endpoint on the device, and transferOut() them.
// 4. POST the result back so the queue moves to 'done' / 'error'.
//
// All state is local to the page lifetime. Closing the tab simply pauses
// printing — jobs keep queuing in print_jobs and resume next time the page
// is opened (stale-printing rows are auto-requeued by poll-helpers).

import { useEffect, useRef, useState } from "react";
import { Usb, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Printer } from "@/lib/types";
import { usbPrinterTokenKey } from "./printer-manager";

const POLL_INTERVAL_MS = 8_000;

interface StationStatus {
  printerId: string;
  name: string;
  connected: boolean;
  lastError: string | null;
}

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// Pick the first bulk OUT endpoint on the device. ESC/POS printers expose
// exactly one — finding it dynamically avoids hard-coding interface numbers
// that vary between Xprinter / Epson / Star.
function findBulkOutEndpoint(
  device: USBDevice,
): { configurationValue: number; interfaceNumber: number; endpointNumber: number } | null {
  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === "out" && ep.type === "bulk") {
            return {
              configurationValue: config.configurationValue,
              interfaceNumber: iface.interfaceNumber,
              endpointNumber: ep.endpointNumber,
            };
          }
        }
      }
    }
  }
  return null;
}

interface ConnectedDevice {
  device: USBDevice;
  interfaceNumber: number;
  endpointNumber: number;
}

async function openDevice(device: USBDevice): Promise<ConnectedDevice> {
  const ep = findBulkOutEndpoint(device);
  if (!ep) throw new Error("Aucun endpoint bulk OUT trouvé sur cette imprimante");
  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(ep.configurationValue);
  }
  await device.claimInterface(ep.interfaceNumber);
  return {
    device,
    interfaceNumber: ep.interfaceNumber,
    endpointNumber: ep.endpointNumber,
  };
}

async function transferAll(
  conn: ConnectedDevice,
  bytes: Uint8Array,
): Promise<void> {
  // Some printers choke on >64 KB transfers; chunking by 4 KB is universally
  // safe and well within tickets we'd ever send.
  const CHUNK = 4096;
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    // slice() (not subarray) copies into a fresh ArrayBuffer-backed view, which
    // satisfies transferOut()'s BufferSource type and is safer than sharing a
    // view that could be retargeted while in flight.
    const slice = bytes.slice(i, Math.min(i + CHUNK, bytes.byteLength));
    const result = await conn.device.transferOut(
      conn.endpointNumber,
      slice.buffer as ArrayBuffer,
    );
    if (result.status !== "ok") {
      throw new Error(`transferOut status=${result.status}`);
    }
  }
}

// WebUSB availability is stable for the page lifetime — read it once at mount
// via the state initializer instead of toggling state from inside the effect.
function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function UsbPrintStation({ restaurantId }: { restaurantId: string }) {
  const [statuses, setStatuses] = useState<StationStatus[]>([]);
  const [supported] = useState(isWebUsbSupported);
  const devicesRef = useRef<Map<string, ConnectedDevice>>(new Map());
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!supported) return;
    stoppedRef.current = false;
    const devices = devicesRef.current;

    const updateStatus = (
      printerId: string,
      patch: Partial<StationStatus>,
    ) => {
      setStatuses((prev) =>
        prev.map((s) => (s.printerId === printerId ? { ...s, ...patch } : s)),
      );
    };

    const ensureDevice = async (
      printer: Printer,
    ): Promise<ConnectedDevice | null> => {
      const existing = devices.get(printer.id);
      if (existing && existing.device.opened) return existing;
      const all = await navigator.usb.getDevices();
      const match = all.find(
        (d) =>
          (printer.usb_vendor_id === null || d.vendorId === printer.usb_vendor_id) &&
          (printer.usb_product_id === null ||
            d.productId === printer.usb_product_id),
      );
      if (!match) return null;
      const conn = await openDevice(match);
      devices.set(printer.id, conn);
      return conn;
    };

    const pollOnce = async (printer: Printer, token: string) => {
      // 1. Make sure the device is reachable before asking the server for work.
      let conn: ConnectedDevice | null = null;
      try {
        conn = await ensureDevice(printer);
      } catch (e) {
        updateStatus(printer.id, {
          connected: false,
          lastError: e instanceof Error ? e.message : "Erreur USB",
        });
        return;
      }
      if (!conn) {
        updateStatus(printer.id, {
          connected: false,
          lastError: "Imprimante USB introuvable — vérifiez le branchement",
        });
        return;
      }
      updateStatus(printer.id, { connected: true, lastError: null });

      // 2. Poll for a job.
      const res = await fetch("/api/print/web-poll", {
        method: "GET",
        headers: { "X-Printer-Token": token },
      });
      if (res.status === 204) return;
      if (!res.ok) {
        updateStatus(printer.id, {
          lastError: `web-poll ${res.status}`,
        });
        return;
      }
      const job = (await res.json()) as {
        job_id: string;
        payload_b64: string;
      };
      const bytes = decodeBase64(job.payload_b64);

      // 3. Print + report status. Wrap each step so a USB hiccup reports
      //    'error' to the server (queue moves on) instead of silently retrying.
      try {
        await transferAll(conn, bytes);
        await fetch("/api/print/web-poll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Printer-Token": token,
          },
          body: JSON.stringify({ job_id: job.job_id, status: "done" }),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erreur d'impression";
        updateStatus(printer.id, { lastError: msg });
        await fetch("/api/print/web-poll", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Printer-Token": token,
          },
          body: JSON.stringify({
            job_id: job.job_id,
            status: "error",
            error: msg,
          }),
        });
      }
    };

    const loadAndPoll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(
          `/api/admin/printers?restaurant_id=${restaurantId}`,
        );
        if (!res.ok) return;
        const { printers } = (await res.json()) as { printers: Printer[] };
        const usbPrinters = printers.filter(
          (p) => p.kind === "usb_thermal" && p.is_active,
        );

        // Refresh status list to mirror the current set of USB printers.
        setStatuses((prev) => {
          const byId = new Map(prev.map((s) => [s.printerId, s]));
          return usbPrinters.map((p) => ({
            printerId: p.id,
            name: p.name,
            connected: byId.get(p.id)?.connected ?? false,
            lastError: byId.get(p.id)?.lastError ?? null,
          }));
        });

        await Promise.all(
          usbPrinters.map(async (p) => {
            const token = localStorage.getItem(usbPrinterTokenKey(p.id));
            if (!token) {
              updateStatus(p.id, {
                connected: false,
                lastError:
                  "Jeton manquant sur ce poste — ré-appairez l'imprimante",
              });
              return;
            }
            await pollOnce(p, token);
          }),
        );
      } catch (e) {
        console.error("[usb-station] poll cycle failed:", e);
      }
    };

    void loadAndPoll();
    const timer = setInterval(loadAndPoll, POLL_INTERVAL_MS);

    return () => {
      stoppedRef.current = true;
      clearInterval(timer);
      // Release the interface — leaves the device free for another tab/session.
      for (const conn of devices.values()) {
        if (conn.device.opened) {
          conn.device
            .releaseInterface(conn.interfaceNumber)
            .catch(() => void 0)
            .finally(() => conn.device.close().catch(() => void 0));
        }
      }
      devices.clear();
    };
  }, [restaurantId, supported]);

  if (!supported) return null;
  if (statuses.length === 0) return null;

  const connectedCount = statuses.filter((s) => s.connected).length;
  const errorCount = statuses.filter((s) => s.lastError).length;

  return (
    <div className="fixed bottom-3 right-3 z-40 rounded-lg border border-border bg-card/95 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 font-semibold">
        <Usb className="h-3.5 w-3.5" />
        Stations USB
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            errorCount === 0 && connectedCount === statuses.length
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-amber-500/10 text-amber-800"
          }`}
        >
          {connectedCount}/{statuses.length} en ligne
        </span>
      </div>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        {statuses.map((s) => (
          <li key={s.printerId} className="flex items-center gap-1.5">
            {s.lastError ? (
              <AlertTriangle className="h-3 w-3 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            )}
            <span className="truncate">{s.name}</span>
            {s.lastError && (
              <span className="truncate text-amber-700">— {s.lastError}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
