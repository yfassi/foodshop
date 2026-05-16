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
  Package,
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
  LayoutGrid,
  Key,
  User,
  Power,
  Loader2,
  Shield,
  Printer,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getRestaurantStatusLabel } from "@/lib/constants";
import { PlanProvider } from "@/hooks/use-plan";
import type { AddonId, PlanId } from "@/lib/plans";
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
import { FeatureGate } from "@/components/upsell/feature-gate";
import { UserPreferences } from "@/components/admin/user-preferences";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/admin/ui/breadcrumbs";

// Labels métier pour les segments de path admin. Étendre quand de nouvelles
// sections apparaissent.
const ROUTE_LABELS: Record<string, string> = {
  commandes: "Commandes",
  comptoir: "Comptoir",
  cuisine: "Cuisine",
  historique: "Historique",
  articles: "Articles",
  "options-de-menu": "Options de menu",
  dashboard: "Tableau de bord",
  clients: "Clients",
  reglages: "Réglages",
  etablissement: "Établissement",
  fidelite: "Fidélité",
  delivery: "Livraison",
  stock: "Stock",
  ingredients: "Ingrédients",
  movements: "Mouvements",
  recipes: "Recettes",
  scan: "Scanner un ticket",
  suppliers: "Fournisseurs",
  activation: "Activation",
  settings: "Réglages",
};

function deriveBreadcrumbs(pathname: string | null, publicId: string): BreadcrumbItem[] {
  if (!pathname) return [];
  const base = `/admin/${publicId}`;
  if (!pathname.startsWith(base)) return [];
  const rest = pathname.slice(base.length).replace(/^\/|\/$/g, "");
  if (!rest) return [];
  const segments = rest.split("/").filter(Boolean);
  // Une seule section ⇒ pas de breadcrumb (la sidebar suffit).
  if (segments.length < 2) return [];
  return segments.map((seg, i) => {
    const isLast = i === segments.length - 1;
    const label = ROUTE_LABELS[seg] ?? seg;
    const href = isLast ? undefined : `${base}/${segments.slice(0, i + 1).join("/")}`;
    return { label, href };
  });
}

type SettingsSection = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Path relative to /admin/[publicId] (e.g. "/settings?tab=payment"). */
  href: string;
};

// Établissement and Fidélité now have dedicated routes (/reglages/...). The
// remaining sub-sections still live as tabs in /settings until they get their
// own pages.
const SETTINGS_SECTIONS: SettingsSection[] = [
  { icon: Store, label: "Établissement", href: "/reglages/etablissement" },
  { icon: CreditCard, label: "Paiement", href: "/settings?tab=payment" },
  { icon: Gift, label: "Fidélité", href: "/reglages/fidelite" },
  { icon: Wallet, label: "Solde", href: "/settings?tab=wallet" },
  { icon: Users, label: "File d'attente", href: "/settings?tab=queue" },
  { icon: Bike, label: "Livraison", href: "/settings?tab=delivery" },
  { icon: Package, label: "Stock", href: "/settings?tab=stock" },
  { icon: LayoutGrid, label: "Plan de salle", href: "/settings?tab=floor" },
  { icon: Printer, label: "Matériel", href: "/settings?tab=materiel" },
  { icon: Key, label: "API", href: "/settings?tab=api" },
  { icon: User, label: "Compte", href: "/settings?tab=account" },
];

type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  /** When set, item also opens a sub-menu. The parent href is used for the "is on this section" check. */
  matchPrefix?: string;
  sections?: SettingsSection[];
};

const BASE_NAV_ITEMS: NavItem[] = [
  { icon: ClipboardList, label: "Commandes", href: "/commandes" },
  { icon: UtensilsCrossed, label: "Articles", href: "/articles" },
  { icon: BarChart3, label: "Tableau de bord", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/clients" },
  {
    icon: Settings,
    label: "Réglages",
    href: "/reglages/etablissement",
    matchPrefix: "/reglages",
    sections: SETTINGS_SECTIONS,
  },
];

const DELIVERY_NAV_ITEM: NavItem = {
  icon: Bike,
  label: "Livraison",
  href: "/delivery",
};

const STOCK_NAV_ITEM: NavItem = {
  icon: Package,
  label: "Stock",
  href: "/stock",
};

export function AdminShell({
  publicId,
  restaurantId,
  restaurantName,
  verificationStatus,
  isDemo,
  userEmail,
  openingHours,
  isAcceptingOrders: initialIsAcceptingOrders,
  deliveryEnabled,
  stockEnabled,
  restaurants,
  isSuperAdmin = false,
  actingAsSuperAdmin = false,
  actingOwnerEmail = null,
  planId,
  activeAddons,
  children,
}: {
  publicId: string;
  restaurantId: string;
  restaurantName: string;
  verificationStatus: string;
  isDemo: boolean;
  userEmail: string;
  openingHours: Record<string, unknown> | null;
  isAcceptingOrders: boolean;
  deliveryEnabled?: boolean;
  stockEnabled?: boolean;
  restaurants: { name: string; public_id: string }[];
  isSuperAdmin?: boolean;
  actingAsSuperAdmin?: boolean;
  actingOwnerEmail?: string | null;
  planId: PlanId;
  activeAddons: AddonId[];
  children: React.ReactNode;
}) {
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(initialIsAcceptingOrders);
  const [togglingOrders, setTogglingOrders] = useState(false);
  const handleToggleOrders = async () => {
    if (togglingOrders) return;
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
  // Pages that need to span the full viewport width (multi-pane layouts, dense
  // realtime screens). They handle their own padding instead of the standard
  // max-w-6xl container.
  const FULLWIDTH_PREFIXES = [
    `/admin/${publicId}/articles`,
    `/admin/${publicId}/commandes`,
  ];
  const fullWidth = FULLWIDTH_PREFIXES.some((p) => pathname?.startsWith(p));
  const breadcrumbs = deriveBreadcrumbs(pathname, publicId);
  const NAV_ITEMS = (() => {
    const items = [...BASE_NAV_ITEMS];
    // Insert before "Réglages" (last item).
    const insertAt = items.length - 1;
    if (stockEnabled) items.splice(insertAt, 0, STOCK_NAV_ITEM);
    if (deliveryEnabled) items.splice(insertAt, 0, DELIVERY_NAV_ITEM);
    return items;
  })();
  const reglagesPrefix = `/admin/${publicId}/reglages`;
  const settingsLegacyBase = `/admin/${publicId}/settings`;
  const onReglagesRoute =
    (pathname?.startsWith(reglagesPrefix) ?? false) ||
    (pathname?.startsWith(settingsLegacyBase) ?? false);
  const activeTab = searchParams?.get("tab");
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  // Per-group "user has manually toggled" state. Réglages group is auto-open
  // while you're on a Réglages page (new routes) or legacy /settings, closed otherwise.
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const isGroupOpen = (key: string) => {
    if (key in groupOverrides) return groupOverrides[key];
    return key === "/reglages" ? onReglagesRoute : false;
  };
  const toggleGroup = (key: string) =>
    setGroupOverrides((prev) => ({ ...prev, [key]: !isGroupOpen(key) }));

  // Returns whether the absolute path matches the current section (path + querystring).
  const isSectionActive = (sectionHref: string) => {
    const [path, query] = sectionHref.split("?");
    const fullPath = `/admin/${publicId}${path}`;
    if (pathname !== fullPath) return false;
    if (!query) return true;
    const expected = new URLSearchParams(query).get("tab");
    return (activeTab ?? "restaurant") === expected;
  };
  const hasMultipleRestaurants = !isDemo && restaurants.length > 1;
  const canAddRestaurant = !isDemo;

  const switchRestaurant = (targetPublicId: string) => {
    setSwitcherOpen(false);
    setAccountOpen(false);
    if (targetPublicId === publicId) return;
    router.push(`/admin/${targetPublicId}${qs}`);
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

  function isActive(item: NavItem) {
    const matcher = item.matchPrefix ?? item.href;
    const full = `/admin/${publicId}${matcher}`;
    if (matcher === "") return pathname === `/admin/${publicId}`;
    // Treat legacy /settings as part of the Réglages section.
    if (matcher === "/reglages" && pathname.startsWith(`/admin/${publicId}/settings`)) {
      return true;
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <PlanProvider planId={planId} addons={activeAddons}>
    <div className="min-h-screen bg-background">
      {/* Banners */}
      {actingAsSuperAdmin && (
        <div className="flex flex-col items-center justify-center gap-1 bg-primary px-4 py-2.5 text-center text-xs font-medium text-primary-foreground sm:flex-row sm:gap-3">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            Mode super admin
            {actingOwnerEmail && (
              <span className="opacity-90">
                — vous gérez le compte de {actingOwnerEmail}
              </span>
            )}
          </span>
          <Link
            href="/super-admin/restaurants"
            className="rounded-full bg-primary-foreground/15 px-3 py-0.5 text-[11px] font-semibold underline-offset-2 transition-colors hover:bg-primary-foreground/25"
          >
            Retour au panneau
          </Link>
        </div>
      )}
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
                        const active = r.public_id === publicId;
                        return (
                          <button
                            key={r.public_id}
                            type="button"
                            onClick={() => switchRestaurant(r.public_id)}
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
                    <FeatureGate feature="multiEstablishment" fallback="modal-on-click">
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
                    </FeatureGate>
                  </>
                )}
              </PopoverContent>
            )}
          </Popover>

          {/* Nav */}
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const hasSubs = !!item.sections && !collapsed;
              const groupKey = item.matchPrefix ?? item.href;
              const expanded = hasSubs && isGroupOpen(groupKey);
              const itemHref = `/admin/${publicId}${item.href}${qs}`;

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
                        onClick={() => toggleGroup(groupKey)}
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
                            const subActive = isSectionActive(sec.href);
                            const sep = sec.href.includes("?") ? "&" : "?";
                            const subHref = `/admin/${publicId}${sec.href}${qs ? `${sep}${qs.slice(1)}` : ""}`;
                            return (
                              <Link
                                key={sec.href}
                                href={subHref}
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
              disabled={togglingOrders}
              aria-label={
                isAcceptingOrders ? "Fermer les commandes" : "Rouvrir les commandes"
              }
              title={
                isAcceptingOrders
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

            {/* Display preferences (theme, density, accent) */}
            <UserPreferences collapsed={collapsed} />

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
                      {userEmail}
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
          {fullWidth ? (
            <div className="pb-24 md:pb-0">{children}</div>
          ) : (
            <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:pb-8">
              {breadcrumbs.length > 0 && (
                <Breadcrumbs items={breadcrumbs} className="mb-4" />
              )}
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={`/admin/${publicId}${item.href}${qs}`}
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
                  {userEmail}
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
                    const active = r.public_id === publicId;
                    return (
                      <button
                        key={r.public_id}
                        type="button"
                        onClick={() => switchRestaurant(r.public_id)}
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
                  <FeatureGate feature="multiEstablishment" fallback="modal-on-click">
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
                  </FeatureGate>
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
                router.push(`/admin/${publicId}/settings${qs}`);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Gérer mon compte
            </Button>

            {isSuperAdmin && (
              <Button
                variant="outline"
                className="w-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => {
                  setAccountOpen(false);
                  router.push("/super-admin");
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Espace Super Admin
              </Button>
            )}

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
    </PlanProvider>
  );
}
