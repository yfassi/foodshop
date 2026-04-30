"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  UtensilsCrossed,
  Settings,
  Users,
  BarChart3,
  Bike,
  Package,
  Clock,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronsUpDown,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getRestaurantStatusLabel } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UpgradeDialog } from "@/components/admin/upgrade-dialog";
import type { PlanId } from "@/lib/plans";

const BASE_NAV_ITEMS = [
  { icon: ClipboardList, label: "Commandes", href: "" },
  { icon: UtensilsCrossed, label: "Articles", href: "/menu" },
  { icon: BarChart3, label: "Tableau de bord", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: Settings, label: "Réglages", href: "/settings" },
];

const DELIVERY_NAV_ITEM = {
  icon: Bike,
  label: "Livraison",
  href: "/delivery",
};

const STOCK_NAV_ITEM = {
  icon: Package,
  label: "Stock",
  href: "/stock",
};

export function AdminShell({
  slug,
  restaurantName,
  verificationStatus,
  isDemo,
  userEmail,
  openingHours,
  isAcceptingOrders,
  deliveryEnabled,
  stockEnabled,
  subscriptionTier,
  deliveryAddonActive,
  stockAddonActive,
  children,
}: {
  slug: string;
  restaurantName: string;
  verificationStatus: string;
  isDemo: boolean;
  userEmail: string;
  openingHours: Record<string, unknown> | null;
  isAcceptingOrders: boolean;
  deliveryEnabled?: boolean;
  stockEnabled?: boolean;
  subscriptionTier?: string;
  deliveryAddonActive?: boolean;
  stockAddonActive?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const qs = isDemo ? "?demo=true" : "";
  let NAV_ITEMS = [...BASE_NAV_ITEMS];
  if (deliveryEnabled) {
    NAV_ITEMS = [...NAV_ITEMS.slice(0, 4), DELIVERY_NAV_ITEM, ...NAV_ITEMS.slice(4)];
  }
  if (stockEnabled) {
    const insertAt = NAV_ITEMS.findIndex((i) => i.href === "/clients") + 1;
    NAV_ITEMS = [...NAV_ITEMS.slice(0, insertAt), STOCK_NAV_ITEM, ...NAV_ITEMS.slice(insertAt)];
  }
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const tier = (subscriptionTier ?? "essentiel") as PlanId;
  // Show upsell when on essentiel OR no add-ons activated
  const showUpsell =
    !isDemo &&
    (tier === "essentiel" ||
      (!deliveryAddonActive && !stockAddonActive));

  // Live restaurant status (re-check every 60s)
  const getStatus = useCallback(
    () => {
      if (!isAcceptingOrders) {
        return { isOpen: false, label: "Commandes suspendues" };
      }
      return getRestaurantStatusLabel(openingHours);
    },
    [openingHours, isAcceptingOrders]
  );

  const [status, setStatus] = useState(getStatus);

  useEffect(() => {
    setStatus(getStatus());
    const interval = setInterval(() => setStatus(getStatus()), 60_000);
    return () => clearInterval(interval);
  }, [getStatus]);

  function isActive(href: string) {
    const full = `/admin/${slug}${href}`;
    if (href === "") return pathname === `/admin/${slug}`;
    return pathname.startsWith(full);
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Banners */}
      {isDemo && (
        <div className="bg-primary/10 px-4 py-2 text-center text-xs font-medium text-primary">
          Mode Démo
        </div>
      )}
      {verificationStatus === "pending" && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2.5 text-center text-xs font-medium text-amber-700">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            Votre compte est en cours de vérification par les équipes TaapR.
            Votre page client sera accessible une fois validé.
          </span>
        </div>
      )}
      {verificationStatus === "rejected" && (
        <div className="bg-destructive/10 px-4 py-2.5 text-center text-xs font-medium text-destructive">
          Votre vérification a été refusée. Veuillez nous contacter pour plus
          d&apos;informations.
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 sticky top-0 h-screen",
            collapsed ? "w-[68px]" : "w-[240px]"
          )}
        >
          {/* Brand */}
          <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {restaurantName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                {restaurantName}
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={`/admin/${slug}${item.href}${qs}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section: status + profile */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            {/* Upgrade pill — shown for essentiel plan or no add-ons */}
            {showUpsell && (
              <button
                onClick={() => setUpgradeOpen(true)}
                title="Faites grandir votre restaurant"
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl bg-neutral-900 px-3 py-2.5 text-left text-amber-300 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/20 transition-all hover:bg-black hover:ring-amber-400/40",
                  collapsed && "justify-center px-0 py-2.5"
                )}
                style={{
                  background:
                    "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
                }}
              >
                <Sparkles
                  className={cn(
                    "h-4 w-4 shrink-0 text-amber-300 transition-transform group-hover:scale-110",
                    !collapsed && "drop-shadow-[0_0_4px_rgba(252,211,77,0.4)]"
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      {tier === "essentiel" ? "Passer Pro" : "Plus de modules"}
                    </p>
                    <p className="truncate text-[10px] font-medium text-amber-300/60">
                      Grandir avec TaapR →
                    </p>
                  </div>
                )}
              </button>
            )}

            {/* Restaurant status */}
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium",
                collapsed && "justify-center px-0"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  status.isOpen
                    ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                    : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                )}
              />
              {!collapsed && (
                <span className="truncate text-sidebar-foreground/70">
                  {status.label}
                </span>
              )}
            </div>

            {/* Profile card */}
            <button
              onClick={() => setAccountOpen(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-0"
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
                {(userEmail?.charAt(0) || restaurantName.charAt(0)).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {restaurantName}
                    </p>
                    <p className="truncate text-xs text-sidebar-foreground/50">
                      {userEmail || "demo@taapr.com"}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                </>
              )}
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0"
              )}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span>Réduire</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-auto" role="region" aria-label="Contenu principal">
          <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:pb-8">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom nav (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`/admin/${slug}${item.href}${qs}`}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label === "Tableau de bord" ? "Stats" : item.label}
            </Link>
          );
        })}
      </nav>

      {/* Account dialog */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mon compte</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Profile info */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {(userEmail?.charAt(0) || restaurantName.charAt(0)).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{restaurantName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail || "demo@taapr.com"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  status.isOpen
                    ? "bg-green-500"
                    : "bg-red-500"
                )}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {status.label}
              </span>
            </div>

            <Separator />

            {/* Manage settings link */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAccountOpen(false);
                router.push(`/admin/${slug}/settings${qs}`);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Gérer mon compte
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade dialog */}
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        restaurantSlug={slug}
        currentTier={tier}
        deliveryActive={!!deliveryAddonActive}
        stockActive={!!stockAddonActive}
      />
    </div>
  );
}
