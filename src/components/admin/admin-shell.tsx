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
  Clock,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronsUpDown,
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

export function AdminShell({
  slug,
  restaurantId,
  restaurantName,
  verificationStatus,
  isDemo,
  userEmail,
  openingHours,
  isAcceptingOrders,
  deliveryEnabled,
  initialBadges,
  children,
}: {
  slug: string;
  restaurantId: string;
  restaurantName: string;
  verificationStatus: string;
  isDemo: boolean;
  userEmail: string;
  openingHours: Record<string, unknown> | null;
  isAcceptingOrders: boolean;
  deliveryEnabled?: boolean;
  initialBadges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const qs = isDemo ? "?demo=true" : "";
  const NAV_ITEMS = deliveryEnabled
    ? [...BASE_NAV_ITEMS.slice(0, 4), DELIVERY_NAV_ITEM, ...BASE_NAV_ITEMS.slice(4)]
    : BASE_NAV_ITEMS;
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>(
    initialBadges ?? {}
  );

  useEffect(() => {
    setBadges(initialBadges ?? {});
  }, [initialBadges]);

  // Refresh badge counts from DB
  const refreshBadges = useCallback(async () => {
    const supabase = createClient();
    const [{ count: newOrders }, { count: pendingDeliveries }] =
      await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .eq("status", "new"),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .eq("order_type", "delivery")
          .eq("delivery_status", "pending"),
      ]);
    setBadges({
      "": newOrders ?? 0,
      "/delivery": pendingDeliveries ?? 0,
    });
  }, [restaurantId]);

  // Realtime: re-fetch counts on any orders change for this restaurant
  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-shell-badges-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => refreshBadges()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, refreshBadges]);

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
              const count = badges[item.href] ?? 0;
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
                  <span className="relative shrink-0">
                    <item.icon className="h-4 w-4" />
                    {collapsed && count > 0 && (
                      <span
                        aria-hidden
                        className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-sidebar"
                      >
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      {count > 0 && (
                        <span
                          aria-label={`${count} ${count > 1 ? "nouvelles" : "nouvelle"}`}
                          className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white"
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section: status + profile */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
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
          const count = badges[item.href] ?? 0;
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
              <span className="relative">
                <item.icon className="h-5 w-5" />
                {count > 0 && (
                  <span
                    aria-label={`${count} ${count > 1 ? "nouvelles" : "nouvelle"}`}
                    className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
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
    </div>
  );
}
