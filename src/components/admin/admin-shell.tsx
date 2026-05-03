"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Check,
  Plus,
  ChevronDown,
  Store,
  CreditCard,
  Gift,
  Wallet,
  Package,
  LayoutGrid,
  Key,
  User,
  Power,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getRestaurantStatusLabel } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type SettingsSection = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tab: string;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  { icon: Store, label: "Établissement", tab: "restaurant" },
  { icon: CreditCard, label: "Paiement", tab: "payment" },
  { icon: Gift, label: "Fidélité", tab: "loyalty" },
  { icon: Wallet, label: "Solde", tab: "wallet" },
  { icon: Users, label: "File d'attente", tab: "queue" },
  { icon: Bike, label: "Livraison", tab: "delivery" },
  { icon: Package, label: "Stock", tab: "stock" },
  { icon: LayoutGrid, label: "Plan de salle", tab: "floor" },
  { icon: Key, label: "API", tab: "api" },
  { icon: User, label: "Compte", tab: "account" },
];

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  sections?: SettingsSection[];
};

const BASE_NAV_ITEMS: NavItem[] = [
  { icon: ClipboardList, label: "Commandes", href: "" },
  { icon: UtensilsCrossed, label: "Articles", href: "/menu" },
  { icon: BarChart3, label: "Tableau de bord", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  { icon: Settings, label: "Réglages", href: "/settings", sections: SETTINGS_SECTIONS },
];

const DELIVERY_NAV_ITEM: NavItem = {
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
  isAcceptingOrders: initialIsAcceptingOrders,
  deliveryEnabled,
  restaurants,
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
  restaurants: { name: string; slug: string }[];
  children: React.ReactNode;
}) {
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(initialIsAcceptingOrders);
  const [togglingOrders, setTogglingOrders] = useState(false);
  const handleToggleOrders = async () => {
    if (togglingOrders || isDemo) return;
    setTogglingOrders(true);
    const next = !isAcceptingOrders;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ is_accepting_orders: next })
      .eq("id", restaurantId);
    if (error) {
      toast.error("Impossible de mettre à jour le statut");
    } else {
      setIsAcceptingOrders(next);
      toast.success(next ? "Commandes ouvertes" : "Commandes fermées");
    }
    setTogglingOrders(false);
  };
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = isDemo ? "?demo=true" : "";
  const NAV_ITEMS = deliveryEnabled
    ? [...BASE_NAV_ITEMS.slice(0, 4), DELIVERY_NAV_ITEM, ...BASE_NAV_ITEMS.slice(4)]
    : BASE_NAV_ITEMS;
  const settingsBase = `/admin/${slug}/settings`;
  const onSettingsRoute = pathname?.startsWith(settingsBase) ?? false;
  const activeTab = searchParams?.get("tab");
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Per-group "user has manually toggled" state. `null` means "follow the route":
  // settings group is auto-open while you're on a settings page, closed otherwise.
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const isGroupOpen = (href: string) => {
    if (href in groupOverrides) return groupOverrides[href];
    return href === "/settings" ? onSettingsRoute : false;
  };
  const toggleGroup = (key: string) =>
    setGroupOverrides((prev) => ({ ...prev, [key]: !isGroupOpen(key) }));
  const hasMultipleRestaurants = !isDemo && restaurants.length > 1;
  const canAddRestaurant = !isDemo;

  const switchRestaurant = (targetSlug: string) => {
    setSwitcherOpen(false);
    setAccountOpen(false);
    if (targetSlug === slug) return;
    router.push(`/admin/${targetSlug}${qs}`);
  };

  const goToAddRestaurant = () => {
    setSwitcherOpen(false);
    setAccountOpen(false);
    router.push("/admin/onboarding");
  };

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
          {/* Brand / Restaurant switcher */}
          <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Changer de restaurant"
                className={cn(
                  "flex h-14 w-full items-center gap-3 border-b border-sidebar-border px-4 text-left transition-colors hover:bg-sidebar-accent/40 focus-visible:bg-sidebar-accent/40 focus-visible:outline-none",
                  collapsed && "justify-center px-0"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                  {restaurantName.charAt(0).toUpperCase()}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-sm font-semibold text-sidebar-foreground">
                      {restaurantName}
                    </span>
                    {(hasMultipleRestaurants || canAddRestaurant) && (
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                    )}
                  </>
                )}
              </button>
            </PopoverTrigger>
            {(hasMultipleRestaurants || canAddRestaurant) && (
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-64 gap-1 p-1.5"
              >
                {restaurants.length > 0 && (
                  <>
                    <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Mes restaurants
                    </p>
                    <div className="max-h-64 space-y-0.5 overflow-y-auto">
                      {restaurants.map((r) => {
                        const active = r.slug === slug;
                        return (
                          <button
                            key={r.slug}
                            type="button"
                            onClick={() => switchRestaurant(r.slug)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/50"
                            )}
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                              {r.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="flex-1 truncate font-medium">
                              {r.name}
                            </span>
                            {active && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {canAddRestaurant && (
                  <>
                    {restaurants.length > 0 && (
                      <Separator className="my-1" />
                    )}
                    <button
                      type="button"
                      onClick={goToAddRestaurant}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <Plus className="h-4 w-4" />
                      </div>
                      Ajouter un restaurant
                    </button>
                  </>
                )}
              </PopoverContent>
            )}
          </Popover>

          {/* Nav */}
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const hasSubs = !!item.sections && !collapsed;
              const expanded = hasSubs && isGroupOpen(item.href);
              const itemHref = `/admin/${slug}${item.href}${qs}`;

              return (
                <div key={item.href} className="space-y-0.5">
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Link
                      href={itemHref}
                      className={cn(
                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        collapsed && "justify-center"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                    {hasSubs && (
                      <button
                        type="button"
                        aria-label={expanded ? "Replier" : "Déplier"}
                        aria-expanded={expanded}
                        onClick={() => toggleGroup(item.href)}
                        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            expanded && "rotate-180"
                          )}
                        />
                      </button>
                    )}
                  </div>

                  {hasSubs && (
                    <div
                      className={cn(
                        "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
                        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="min-h-0">
                        <div className="ml-4 mt-0.5 space-y-px border-l border-sidebar-border/60 pl-2">
                          {item.sections!.map((sec) => {
                            const subActive =
                              onSettingsRoute && (activeTab ?? "restaurant") === sec.tab;
                            return (
                              <Link
                                key={sec.tab}
                                href={`${settingsBase}?tab=${sec.tab}${isDemo ? "&demo=true" : ""}`}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                                  subActive
                                    ? "bg-primary/10 font-medium text-primary"
                                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                                )}
                              >
                                <sec.icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{sec.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Bottom section: live status toggle + profile + collapse */}
          <div className="space-y-2 border-t border-sidebar-border p-3">
            {/* Live "accepting orders" toggle — primary admin action during service */}
            <button
              type="button"
              onClick={handleToggleOrders}
              disabled={togglingOrders || isDemo}
              aria-label={
                isAcceptingOrders ? "Fermer les commandes" : "Rouvrir les commandes"
              }
              title={
                isDemo
                  ? "Mode démo — toggle indisponible"
                  : isAcceptingOrders
                    ? "Cliquer pour fermer les commandes"
                    : "Cliquer pour rouvrir les commandes"
              }
              className={cn(
                "group flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all",
                "disabled:cursor-not-allowed disabled:opacity-70",
                isAcceptingOrders
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400",
                collapsed && "justify-center px-0",
              )}
            >
              {togglingOrders ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                      isAcceptingOrders ? "bg-emerald-400" : "bg-rose-400",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      isAcceptingOrders ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                </span>
              )}
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">
                    {isAcceptingOrders ? status.label : "Commandes fermées"}
                  </span>
                  <Power className="h-3.5 w-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
                </>
              )}
            </button>

            {/* Profile card — restaurant identity is in the brand block, here we focus on the user */}
            <button
              onClick={() => setAccountOpen(true)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent/50",
                collapsed && "justify-center px-0",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                {(userEmail?.charAt(0) || restaurantName.charAt(0)).toUpperCase()}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-medium text-sidebar-foreground">
                      Mon compte
                    </p>
                    <p className="truncate text-[11px] text-sidebar-foreground/50">
                      {userEmail || "demo@taapr.com"}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
                </>
              )}
            </button>

            {/* Collapse toggle — discreet at the very bottom */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {collapsed ? (
                <PanelLeft className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
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

            {/* Restaurant switcher (mobile-friendly) */}
            {(hasMultipleRestaurants || canAddRestaurant) && (
              <div className="space-y-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mes restaurants
                </p>
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  {restaurants.map((r) => {
                    const active = r.slug === slug;
                    return (
                      <button
                        key={r.slug}
                        type="button"
                        onClick={() => switchRestaurant(r.slug)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 truncate font-medium">
                          {r.name}
                        </span>
                        {active && (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {canAddRestaurant && (
                  <button
                    type="button"
                    onClick={goToAddRestaurant}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Plus className="h-4 w-4" />
                    </div>
                    Ajouter un restaurant
                  </button>
                )}
                <Separator className="!my-3" />
              </div>
            )}

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
