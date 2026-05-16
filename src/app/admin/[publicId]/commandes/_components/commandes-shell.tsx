"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ClipboardList,
  Plus,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Tv,
  ChefHat,
  ExternalLink,
  Search,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrdersRealtime } from "@/lib/hooks/use-orders-realtime";
import { UsbPrintStation } from "@/components/admin/usb-print-station";
import { PageHeader } from "@/components/admin/ui/page-header";
import { HeroCta } from "@/components/admin/ui/hero-cta";
import { StatCell, StatStrip } from "@/components/admin/ui/stat-cell";
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

  // Aggregate KPIs from today's orders (paid only for revenue)
  const paidOrders = useMemo(() => orders.filter((o) => o.paid), [orders]);
  const ca = useMemo(
    () => paidOrders.reduce((acc, o) => acc + (o.total_price ?? 0), 0),
    [paidOrders]
  );
  const panierMoyen = paidOrders.length > 0 ? Math.round(ca / paidOrders.length) : 0;

  const activeTab = TABS.find((t) => pathname?.endsWith(`/commandes/${t.key}`))?.key ?? "comptoir";

  return (
    <OrdersProvider value={value}>
      <div className="space-y-6 p-4 md:p-6">
        {restaurantId && <UsbPrintStation restaurantId={restaurantId} />}

        <PageHeader
          icon={<ClipboardList className="h-5 w-5" />}
          eyebrow="Service en cours"
          title="Commandes"
          subtitle={
            totalEnAttente === 0
              ? "Tout est calme — les nouvelles commandes apparaissent ici en temps réel."
              : `${totalEnAttente} en attente · ${totalPaid} aujourd'hui`
          }
        />

        <HeroCta
          icon={<Plus className="h-6 w-6" />}
          title="Encaisser une commande au comptoir"
          subtitle="Ouvrir la borne plein écran — catégories, panier et paiement en un seul flux."
          primary={
            <button
              type="button"
              disabled
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-accent px-5 text-sm font-semibold opacity-50 cursor-not-allowed"
              title="Bientôt disponible"
            >
              <Plus className="h-4 w-4" />
              Nouvelle commande
            </button>
          }
          utilities={
            <>
              <button
                onClick={sound.toggle}
                aria-label={sound.enabled ? "Couper le son" : "Activer le son"}
                title={sound.enabled ? "Couper le son" : "Activer le son"}
                className={cn(
                  "flex h-[38px] w-[38px] items-center justify-center rounded-lg border transition-colors",
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
                    "flex h-[38px] w-[38px] items-center justify-center rounded-lg border transition-colors",
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
                className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-2-tk bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChefHat className="h-4 w-4" />
              </a>
              <a
                href={`/display/${publicId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Écran client plein écran"
                title="Écran client plein écran"
                className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-2-tk bg-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <Tv className="h-4 w-4" />
                <ExternalLink className="sr-only h-3 w-3" />
              </a>
            </>
          }
        />

        <StatStrip>
          <StatCell label="Aujourd'hui" value={totalPaid} hint="commandes payées" />
          <StatCell label="CA" value={formatPrice(ca)} hint="ventes du jour" />
          <StatCell label="Panier moyen" value={formatPrice(panierMoyen)} hint={paidOrders.length === 0 ? "—" : `${paidOrders.length} commandes`} />
          <StatCell label="Temps prép" value="—" hint="à instrumenter" />
          <StatCell label="En attente" value={totalEnAttente} hint="à traiter" accent={totalEnAttente > 0} />
        </StatStrip>

        <div className="flex flex-wrap items-center gap-3 border-b border-2-tk pb-3">
          <nav className="flex items-center gap-1 rounded-lg bg-bg-2 p-1" role="tablist">
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

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-2-tk bg-card px-2.5 py-1.5 text-sm text-muted-foreground sm:flex">
              <Search className="h-3.5 w-3.5" />
              <input
                type="search"
                placeholder="Rechercher…"
                className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Rechercher une commande"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="pulse-dot text-emerald-500" />
              Temps réel
            </span>
          </div>
        </div>

        {children}
      </div>
    </OrdersProvider>
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
