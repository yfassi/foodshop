"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Plus,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Tv,
  ChefHat,
  Search,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrdersRealtime } from "@/lib/hooks/use-orders-realtime";
import { UsbPrintStation } from "@/components/admin/usb-print-station";
import { OrdersProvider, selectBuckets } from "./orders-context";
import { formatPrice } from "@/lib/format";

const TABS: { key: string; label: string }[] = [
  { key: "comptoir", label: "Comptoir" },
  { key: "cuisine", label: "Cuisine" },
  { key: "historique", label: "Historique" },
];

export function CommandesShell({ children }: { children: React.ReactNode }) {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;
  const pathname = usePathname();
  const value = useOrdersRealtime(publicId);
  const { orders, restaurantId, sound, push } = value;

  const buckets = useMemo(() => selectBuckets(orders), [orders]);
  const totalPaid = buckets.new.length + buckets.preparing.length + buckets.ready.length + buckets.done.length;
  const totalEnAttente = buckets.unpaid.length + buckets.new.length + buckets.preparing.length;

  const paidOrders = useMemo(() => orders.filter((o) => o.paid), [orders]);
  const ca = useMemo(
    () => paidOrders.reduce((acc, o) => acc + (o.total_price ?? 0), 0),
    [paidOrders]
  );

  const activeTab = TABS.find((t) => pathname?.endsWith(`/commandes/${t.key}`))?.key ?? "comptoir";

  return (
    <OrdersProvider value={value}>
      <div className="space-y-4 p-3 sm:p-4 md:p-6">
        {restaurantId && <UsbPrintStation restaurantId={restaurantId} />}

        {/* Top action band — primary CTA + tools */}
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl border border-tint p-4 sm:p-5",
            "bg-[linear-gradient(135deg,var(--tint-bg-2),var(--tint-bg))]"
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent text-[color:var(--brand-accent-fg)] sm:h-12 sm:w-12">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                  Encaisser une commande au comptoir
                </h1>
                <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                  Catégories, panier et paiement en un seul écran.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                disabled
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 text-sm font-semibold opacity-50 cursor-not-allowed sm:flex-none sm:h-12 sm:px-5"
                title="Bientôt disponible"
              >
                <Plus className="h-4 w-4" />
                Nouvelle commande
              </button>

              <div className="hidden h-9 w-px bg-border-2-tk sm:block" aria-hidden />

              <div className="flex items-center gap-1.5">
                <button
                  onClick={sound.toggle}
                  aria-label={sound.enabled ? "Couper le son" : "Activer le son"}
                  title={sound.enabled ? "Couper le son" : "Activer le son"}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                    sound.enabled
                      ? "border-tint bg-tint text-brand-accent"
                      : "border-2-tk bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sound.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                {push.isSupported && (
                  <button
                    onClick={async () => {
                      if (!restaurantId) return;
                      await push.subscribe({ restaurantId, role: "admin" });
                    }}
                    disabled={push.isSubscribed || push.loading}
                    aria-label={push.isSubscribed ? "Notifications actives" : "Activer notifications push"}
                    title={push.isSubscribed ? "Notifications actives" : "Activer notifications push"}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                      push.isSubscribed
                        ? "border-tint bg-tint text-brand-accent"
                        : "border-2-tk bg-card text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {push.isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                )}
                <a
                  href={`/kitchen/${publicId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Écran cuisine plein écran"
                  title="Écran cuisine plein écran"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-2-tk bg-card text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChefHat className="h-4 w-4" />
                </a>
                <a
                  href={`/display/${publicId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Écran client plein écran"
                  title="Écran client plein écran"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-2-tk bg-card text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Tv className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs + compact stats + realtime indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <nav
            className="flex items-center gap-1 rounded-lg bg-bg-2 p-1"
            role="tablist"
            aria-label="Sections des commandes"
          >
            {TABS.map((t) => {
              const active = t.key === activeTab;
              return (
                <Link
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  href={`/admin/${publicId}/commandes/${t.key}`}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>

          {/* Inline mini-stats — only those that change during service */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:gap-2">
            <MiniStat
              label="En attente"
              value={String(totalEnAttente)}
              accent={totalEnAttente > 0}
            />
            <MiniStat label="Payées" value={String(totalPaid)} />
            <MiniStat label="CA" value={formatPrice(ca)} mono />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-2-tk bg-card px-2.5 py-1.5 text-sm text-muted-foreground md:flex">
              <Search className="h-3.5 w-3.5" />
              <input
                type="search"
                placeholder="Rechercher…"
                className="w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-40"
                aria-label="Rechercher une commande"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="pulse-dot text-emerald-500" />
              <span className="hidden sm:inline">Temps réel</span>
            </span>
          </div>
        </div>

        {children}
      </div>
    </OrdersProvider>
  );
}

function MiniStat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
        accent ? "border-tint bg-tint text-brand-accent" : "border-2-tk bg-card text-muted-foreground"
      )}
    >
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
      <span className={cn("font-semibold text-foreground", mono && "font-mono tabular")}>{value}</span>
    </span>
  );
}

export function EmptyOrdersState({ view }: { view: "comptoir" | "cuisine" | "historique" }) {
  const msg =
    view === "cuisine"
      ? { title: "Cuisine au calme", body: "Les bons à préparer apparaîtront ici dès qu'une commande arrive." }
      : view === "historique"
        ? { title: "Pas encore d'historique", body: "Les commandes terminées du jour apparaîtront ici." }
        : { title: "Aucune commande en cours", body: "Les nouvelles commandes apparaissent ici en temps réel, avec une alerte sonore." };
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-2-tk bg-bg-2/40 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-3 text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="mb-1 text-sm font-medium text-foreground">{msg.title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{msg.body}</p>
    </div>
  );
}
