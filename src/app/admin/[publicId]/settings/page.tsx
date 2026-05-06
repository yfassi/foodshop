"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LogOut,
  Loader2,
  Store,
  CreditCard,
  User,
  Plus,
  X,
  Camera,
  QrCode,
  Link as LinkIcon,
  Copy,
  Clock,
  Gift,
  ChevronRight,
  ChevronDown,
  Check,
  UtensilsCrossed,
  ExternalLink,
  Wallet,
  Users,
  Download,
  Bike,
  Lock,
  Package,
  LayoutGrid,
  Key,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  BadgeCheck,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type {
  Restaurant,
  LoyaltyTier,
  WalletTopupTier,
  OrderType,
  DeliveryConfig,
  DeliveryCoords,
  DeliveryZone,
  SubscriptionTier,
  FloorPlan,
} from "@/lib/types";
import {
  getTierLabel,
  getTierPrice,
  nextTier,
  canUseLoyalty,
  canUseFloorPlan,
  canUseApi,
} from "@/lib/subscription";
import {
  DAYS_FR,
  DAYS_FR_SHORT,
  normalizeHoursEntry,
  TIME_OPTIONS,
} from "@/lib/constants";
import { KitchenToggle } from "@/components/restaurant/kitchen-toggle";
import { LoyaltyTierBuilder } from "@/components/admin/loyalty-tier-builder";
import { TopupTierBuilder } from "@/components/admin/topup-tier-builder";
import { QueueManager } from "@/components/admin/queue-manager";
import { DeliveryZoneBuilder } from "@/components/admin/delivery-zone-builder";
import { DeliveryMapPicker } from "@/components/admin/delivery-map-picker";
import { DriverManager } from "@/components/admin/driver-manager";
import { TierLockBanner } from "@/components/admin/tier-lock-banner";
import { FloorPlanEditor } from "@/components/admin/floor-plan-editor";
import { ApiKeysManager } from "@/components/admin/api-keys-manager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab =
  | "restaurant"
  | "payment"
  | "loyalty"
  | "wallet"
  | "queue"
  | "delivery"
  | "stock"
  | "floor"
  | "api"
  | "account";

interface StripePayment {
  id: string;
  amount: number;
  status: string;
  created: number;
  description: string | null;
  paid: boolean;
}

interface StripeData {
  balance: { available: number; pending: number; currency: string };
  payments: StripePayment[];
  dashboard_url: string;
}

interface TimeRange {
  open: string;
  close: string;
}

/* ─── Collapsible card section ─── */
function CollapsibleCard({
  icon: Icon,
  title,
  description,
  isOpen,
  onToggle,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 pt-4"
      >
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1 text-left">
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-4">{children}</CardContent>
        </div>
      </div>
    </Card>
  );
}

function QueueManagerSection({ publicId, restaurantId }: { publicId: string; restaurantId: string }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium">File d&apos;attente en cours</p>
      <QueueManager publicId={publicId} restaurantId={restaurantId} />
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const ALLOWED_TABS: Tab[] = [
    "restaurant",
    "payment",
    "loyalty",
    "wallet",
    "queue",
    "delivery",
    "stock",
    "floor",
    "api",
    "account",
  ];
  const initialTab = (() => {
    const t = searchParams.get("tab");
    return t && (ALLOWED_TABS as string[]).includes(t) ? (t as Tab) : "restaurant";
  })();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Sync tab → URL (?tab=...) so deep-links and the sidebar sub-nav stay aligned.
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current === activeTab) return;
    const sp = new URLSearchParams(searchParams.toString());
    if (activeTab === "restaurant") sp.delete("tab");
    else sp.set("tab", activeTab);
    const qs = sp.toString();
    router.replace(`/admin/${params.slug}/settings${qs ? `?${qs}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Sync URL (?tab=...) → tab when sidebar links change the query param.
  useEffect(() => {
    const t = searchParams.get("tab");
    const next = t && (ALLOWED_TABS as string[]).includes(t) ? (t as Tab) : "restaurant";
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Restaurant form
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState<Record<string, TimeRange[] | null>>({});
  const [copyFromDay, setCopyFromDay] = useState<string | null>(null);
  const [copyToDays, setCopyToDays] = useState<string[]>([]);
  const [orderTypeDineIn, setOrderTypeDineIn] = useState(true);
  const [orderTypeTakeaway, setOrderTypeTakeaway] = useState(true);
  const [orderTypeDelivery, setOrderTypeDelivery] = useState(false);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(false);

  // Delivery
  const [deliveryAddonActive, setDeliveryAddonActive] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("plat");
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState<DeliveryCoords | null>(null);
  const [deliveryPrepTime, setDeliveryPrepTime] = useState<number>(20);
  const [deliveryMaxRadius, setDeliveryMaxRadius] = useState<number>(5000);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);

  // Stock module
  const [stockModuleActive, setStockModuleActive] = useState(false);
  const [stockEnabled, setStockEnabled] = useState(false);

  // Floor plan
  const [floorPlan, setFloorPlan] = useState<FloorPlan>({ tables: [] });

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set()
  );
  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Payment methods
  const [acceptOnSite, setAcceptOnSite] = useState(true);
  const [acceptOnline, setAcceptOnline] = useState(false);

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Loyalty
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);

  // Wallet topup
  const [walletTopupEnabled, setWalletTopupEnabled] = useState(false);
  const [walletTopupTiers, setWalletTopupTiers] = useState<WalletTopupTier[]>([]);

  // Queue
  const [queueEnabled, setQueueEnabled] = useState(false);
  const [queueMaxConcurrent, setQueueMaxConcurrent] = useState(5);

  // Stripe data
  const [stripeData, setStripeData] = useState<StripeData | null>(null);
  const [stripeDataLoading, setStripeDataLoading] = useState(false);

  // Account
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);

  const handleOpenBillingPortal = async () => {
    setOpeningBillingPortal(true);
    try {
      const res = await fetch("/api/stripe/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: params.slug }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (data.error === "billing_not_configured") {
        toast.info(
          data.message ||
            "La facturation self-service n'est pas encore activée pour ce compte.",
        );
      } else {
        toast.error(data.message || data.error || "Impossible d'ouvrir le portail Stripe.");
      }
    } catch {
      toast.error("Erreur de connexion au portail Stripe.");
    } finally {
      setOpeningBillingPortal(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setEmail(userData.user.email || "");
      }

      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("public_id", params.publicId)
        .single<Restaurant>();

      if (data) {
        setRestaurant(data);
        setName(data.name);
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setDescription(data.description || "");
        setIsAcceptingOrders(data.is_accepting_orders);

        const h: Record<string, TimeRange[] | null> = {};
        for (const day of Object.keys(DAYS_FR)) {
          h[day] = normalizeHoursEntry(data.opening_hours?.[day]);
        }
        setHours(h);

        setLogoUrl(data.logo_url || null);

        const methods: string[] = data.accepted_payment_methods || ["on_site"];
        setAcceptOnSite(methods.includes("on_site"));
        setAcceptOnline(methods.includes("online"));

        const types: string[] = data.order_types || ["dine_in", "takeaway"];
        setOrderTypeDineIn(types.includes("dine_in"));
        setOrderTypeTakeaway(types.includes("takeaway"));
        setOrderTypeDelivery(types.includes("delivery"));
        setLoyaltyEnabled(data.loyalty_enabled ?? false);
        setLoyaltyTiers(data.loyalty_tiers ?? []);
        setWalletTopupEnabled(data.wallet_topup_enabled ?? false);
        setWalletTopupTiers(data.wallet_topup_tiers ?? []);
        setQueueEnabled(data.queue_enabled ?? false);
        setQueueMaxConcurrent(data.queue_max_concurrent ?? 5);

        setDeliveryAddonActive(data.delivery_addon_active ?? false);
        setSubscriptionTier((data.subscription_tier ?? "plat") as SubscriptionTier);
        setDeliveryEnabled(data.delivery_enabled ?? false);
        const dc = (data.delivery_config || {}) as DeliveryConfig;
        setDeliveryCoords(dc.coords ?? null);
        setDeliveryPrepTime(dc.prep_time_minutes ?? 20);
        setDeliveryMaxRadius(dc.max_radius_m ?? 5000);
        setDeliveryZones(dc.zones ?? []);

        setStockModuleActive(data.stock_module_active ?? false);
        setStockEnabled(data.stock_enabled ?? false);
        setFloorPlan((data.floor_plan as FloorPlan) ?? { tables: [] });
      }

      setLoading(false);
      // Mark loaded after all effects have settled (useEffect is async in React 18,
      // so setTimeout(0) can fire before pending effects — use a longer delay)
      setTimeout(() => { hasLoaded.current = true; }, 1500);
    };
    load();
  }, [params.publicId]);

  // --- Stripe ---

  const checkStripeStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      const data = await res.json();
      if (data.onboarding_complete) {
        setRestaurant((prev) =>
          prev ? { ...prev, stripe_onboarding_complete: true } : prev
        );
        toast.success("Paiement en ligne activé avec succès !");
      }
    } catch {
      // Silent fail
    }
    setCheckingStatus(false);
  }, [params.publicId]);

  useEffect(() => {
    if (
      restaurant &&
      (searchParams.get("stripe_return") === "true" ||
        searchParams.get("stripe_refresh") === "true")
    ) {
      // Stripe redirect lands us back on the payment tab. Strip stripe_* but keep tab=payment.
      router.replace(`/admin/${params.publicId}/settings?tab=payment`);
      checkStripeStatus();
    }
  }, [restaurant, searchParams, router, params.publicId, checkStripeStatus]);

  const fetchStripeData = useCallback(async () => {
    setStripeDataLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      if (res.ok) {
        const data = await res.json();
        setStripeData(data);
      }
    } catch {
      // Silent fail
    }
    setStripeDataLoading(false);
  }, [params.publicId]);

  useEffect(() => {
    if (restaurant?.stripe_onboarding_complete && activeTab === "payment") {
      fetchStripeData();
    }
  }, [restaurant?.stripe_onboarding_complete, activeTab, fetchStripeData]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_public_id: params.publicId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur lors de la configuration du paiement");
      }
    } catch {
      toast.error("Erreur lors de la configuration du paiement");
    }
    setStripeLoading(false);
  };

  // --- Auto-save ---

  const hasLoaded = useRef(false);
  const restaurantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loyaltyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deliveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSaveRestaurant = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant || !name.trim()) return;
    if (!orderTypeDineIn && !orderTypeTakeaway && !orderTypeDelivery) return;

    const supabase = createClient();
    const openingHours: Record<string, TimeRange[]> = {};
    for (const [day, ranges] of Object.entries(hours)) {
      if (ranges && ranges.length > 0) {
        openingHours[day] = ranges;
      }
    }
    const orderTypes: OrderType[] = [];
    if (orderTypeDineIn) orderTypes.push("dine_in");
    if (orderTypeTakeaway) orderTypes.push("takeaway");
    if (orderTypeDelivery && deliveryAddonActive) orderTypes.push("delivery");

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        description: description.trim() || null,
        opening_hours: openingHours,
        order_types: orderTypes,
      })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [restaurant, name, address, phone, description, hours, orderTypeDineIn, orderTypeTakeaway, orderTypeDelivery, deliveryAddonActive]);

  const autoSavePaymentMethods = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    const methods: string[] = [];
    if (acceptOnSite) methods.push("on_site");
    if (acceptOnline) methods.push("online");
    if (methods.length === 0) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ accepted_payment_methods: methods })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [restaurant, acceptOnSite, acceptOnline]);

  const autoSaveLoyalty = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        loyalty_enabled: loyaltyEnabled,
        loyalty_tiers: loyaltyTiers,
      })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [restaurant, loyaltyEnabled, loyaltyTiers]);

  const autoSaveWalletTopup = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        wallet_topup_enabled: walletTopupEnabled,
        wallet_topup_tiers: walletTopupTiers,
      })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [restaurant, walletTopupEnabled, walletTopupTiers]);

  const autoSaveQueue = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        queue_enabled: queueEnabled,
        queue_max_concurrent: queueMaxConcurrent,
      })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [restaurant, queueEnabled, queueMaxConcurrent]);

  const autoSaveStock = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ stock_enabled: stockEnabled })
      .eq("id", restaurant.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Enregistré");
  }, [restaurant, stockEnabled]);

  const autoSaveFloorPlan = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({
        floor_plan: { ...floorPlan, updated_at: new Date().toISOString() },
      })
      .eq("id", restaurant.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Enregistré");
  }, [restaurant, floorPlan]);

  // Auto-save restaurant settings (debounced)
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (restaurantTimerRef.current) clearTimeout(restaurantTimerRef.current);
    restaurantTimerRef.current = setTimeout(autoSaveRestaurant, 1000);
    return () => { if (restaurantTimerRef.current) clearTimeout(restaurantTimerRef.current); };
  }, [autoSaveRestaurant]);

  // Auto-save payment methods (debounced)
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (paymentTimerRef.current) clearTimeout(paymentTimerRef.current);
    paymentTimerRef.current = setTimeout(autoSavePaymentMethods, 500);
    return () => { if (paymentTimerRef.current) clearTimeout(paymentTimerRef.current); };
  }, [autoSavePaymentMethods]);

  // Auto-save loyalty (debounced)
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (loyaltyTimerRef.current) clearTimeout(loyaltyTimerRef.current);
    loyaltyTimerRef.current = setTimeout(autoSaveLoyalty, 800);
    return () => { if (loyaltyTimerRef.current) clearTimeout(loyaltyTimerRef.current); };
  }, [autoSaveLoyalty]);

  // Auto-save wallet topup (debounced)
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (walletTimerRef.current) clearTimeout(walletTimerRef.current);
    walletTimerRef.current = setTimeout(autoSaveWalletTopup, 800);
    return () => { if (walletTimerRef.current) clearTimeout(walletTimerRef.current); };
  }, [autoSaveWalletTopup]);

  // Auto-save queue settings (debounced)
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (queueTimerRef.current) clearTimeout(queueTimerRef.current);
    queueTimerRef.current = setTimeout(autoSaveQueue, 800);
    return () => { if (queueTimerRef.current) clearTimeout(queueTimerRef.current); };
  }, [autoSaveQueue]);

  // Auto-save stock / split-payment / floor-plan (debounced)
  useEffect(() => {
    if (!hasLoaded.current) return;
    const t = setTimeout(autoSaveStock, 600);
    return () => clearTimeout(t);
  }, [autoSaveStock]);

  useEffect(() => {
    if (!hasLoaded.current) return;
    const t = setTimeout(autoSaveFloorPlan, 1200);
    return () => clearTimeout(t);
  }, [autoSaveFloorPlan]);

  const autoSaveDelivery = useCallback(async () => {
    if (!hasLoaded.current) return;
    if (!restaurant) return;
    if (!deliveryAddonActive) return;

    const payload = {
      restaurant_public_id: restaurant.public_id,
      delivery_enabled: deliveryEnabled,
      delivery_config: {
        coords: deliveryCoords,
        prep_time_minutes: deliveryPrepTime,
        max_radius_m: deliveryMaxRadius,
        zones: deliveryZones,
      },
    };

    const res = await fetch("/api/admin/delivery-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors de la sauvegarde");
    } else {
      toast.success("Enregistré");
    }
  }, [
    restaurant,
    deliveryAddonActive,
    deliveryEnabled,
    deliveryCoords,
    deliveryPrepTime,
    deliveryMaxRadius,
    deliveryZones,
  ]);

  useEffect(() => {
    if (!hasLoaded.current) return;
    if (deliveryTimerRef.current) clearTimeout(deliveryTimerRef.current);
    deliveryTimerRef.current = setTimeout(autoSaveDelivery, 800);
    return () => { if (deliveryTimerRef.current) clearTimeout(deliveryTimerRef.current); };
  }, [autoSaveDelivery]);

  // --- Account ---

  const handleChangePassword = async () => {
    if (!newPassword) {
      toast.error("Entrez un nouveau mot de passe");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error("Erreur lors du changement de mot de passe");
      setSavingPassword(false);
      return;
    }

    toast.success("Mot de passe modifié");
    setNewPassword("");
    setConfirmPassword("");
    setSavingPassword(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // --- Logo ---

  const uploadLogo = async (file: File) => {
    const MAX_SIZE = 2 * 1024 * 1024;
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format accepté : JPG, PNG, WebP ou SVG");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Le logo ne doit pas dépasser 2 Mo");
      return;
    }

    setUploadingLogo(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "png";
    const filePath = `${restaurant!.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("restaurant-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur lors de l'upload");
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("restaurant-logos")
      .getPublicUrl(filePath);

    const newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("restaurants")
      .update({ logo_url: newLogoUrl })
      .eq("id", restaurant!.id);

    setLogoUrl(newLogoUrl);
    setUploadingLogo(false);
    toast.success("Logo mis à jour");
  };

  const removeLogo = async () => {
    if (!logoUrl) return;

    const supabase = createClient();
    const pathMatch = logoUrl.split("/restaurant-logos/")[1]?.split("?")[0];
    if (pathMatch) {
      await supabase.storage.from("restaurant-logos").remove([pathMatch]);
    }

    await supabase
      .from("restaurants")
      .update({ logo_url: null })
      .eq("id", restaurant!.id);

    setLogoUrl(null);
    toast.success("Logo supprimé");
  };

  // --- Hours helpers ---

  const toggleDay = (day: string, enabled: boolean) => {
    setHours((prev) => ({
      ...prev,
      [day]: enabled ? [{ open: "11:00", close: "22:00" }] : null,
    }));
  };

  const updateRange = (
    day: string,
    index: number,
    field: "open" | "close",
    value: string
  ) => {
    setHours((prev) => {
      const ranges = prev[day];
      if (!ranges) return prev;
      const updated = ranges.map((r, i) => {
        if (i !== index) return r;
        if (field === "open") {
          return { open: value, close: value >= r.close ? value : r.close };
        }
        return { open: r.open, close: value <= r.open ? r.open : value };
      });
      return { ...prev, [day]: updated };
    });
  };

  const addRange = (day: string) => {
    setHours((prev) => {
      const ranges = prev[day];
      if (!ranges) return prev;
      const lastClose = ranges[ranges.length - 1].close;
      return {
        ...prev,
        [day]: [...ranges, { open: lastClose, close: "22:00" }],
      };
    });
  };

  const removeRange = (day: string, index: number) => {
    setHours((prev) => {
      const ranges = prev[day];
      if (!ranges || ranges.length <= 1) return prev;
      return { ...prev, [day]: ranges.filter((_, i) => i !== index) };
    });
  };

  const openCopyDialog = (day: string) => {
    setCopyFromDay(day);
    setCopyToDays([]);
  };

  const applyDuplicate = () => {
    if (!copyFromDay) return;
    const source = hours[copyFromDay];
    if (!source) return;
    setHours((prev) => {
      const next = { ...prev };
      for (const day of copyToDays) {
        next[day] = source.map((r) => ({ ...r }));
      }
      return next;
    });
    setCopyFromDay(null);
    setCopyToDays([]);
  };

  if (loading || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const SECTION_META: Record<Tab, { label: string; subtitle: string; icon: typeof Store }> = {
    restaurant: { label: "Établissement", subtitle: "Statut, horaires, identité visuelle, lien de commande.", icon: Store },
    payment:    { label: "Paiement",      subtitle: "Stripe, Apple Pay, tickets-restos, paiement fractionné.", icon: CreditCard },
    loyalty:    { label: "Fidélité",      subtitle: "Programme de tampons et récompenses pour vos habitués.", icon: Gift },
    wallet:     { label: "Solde",         subtitle: "Recharges client et historique des paiements.",          icon: Wallet },
    queue:      { label: "File d'attente", subtitle: "File digitale et limite de commandes simultanées.",      icon: Users },
    delivery:   { label: "Livraison",     subtitle: "Module Livraison, zones, livreurs et tarifs.",            icon: Bike },
    stock:      { label: "Stock",         subtitle: "Module Stock — suivi des entrées/sorties.",               icon: Package },
    floor:      { label: "Plan de salle", subtitle: "Tables, capacités et organisation visuelle.",             icon: LayoutGrid },
    api:        { label: "API",           subtitle: "Clés API et webhooks pour vos intégrations.",             icon: Key },
    account:    { label: "Compte",        subtitle: "Email, mot de passe et sécurité du compte.",              icon: User },
  };
  const sectionMeta = SECTION_META[activeTab];

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <AdminPageHeader
          kicker="Réglages"
          icon={sectionMeta.icon}
          title={sectionMeta.label}
          subtitle={sectionMeta.subtitle}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          {/* TabsList intentionally omitted — navigation lives in the sidebar (?tab=…). */}

          {/* ═══ Tab: Établissement ═══ */}
          <TabsContent value="restaurant">
            <div className="space-y-4">
              {/* Commandes ouvertes / fermées */}
              <Card size="sm" className={cn(
                "transition-colors duration-300",
                isAcceptingOrders
                  ? "ring-green-500/20 bg-green-50/50 dark:bg-green-950/20"
                  : "ring-red-500/20 bg-red-50/50 dark:bg-red-950/20"
              )}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isAcceptingOrders ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                    )}>
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">
                        {isAcceptingOrders ? "Commandes ouvertes" : "Commandes fermées"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isAcceptingOrders
                          ? "Les clients peuvent passer commande"
                          : "Les commandes sont actuellement suspendues"}
                      </CardDescription>
                    </div>
                  </div>
                  <CardAction>
                    <KitchenToggle
                      restaurantId={restaurant.id}
                      initialOpen={restaurant.is_accepting_orders}
                      onToggle={setIsAcceptingOrders}
                    />
                  </CardAction>
                </CardHeader>
              </Card>

              {/* Horaires */}
              <CollapsibleCard
                icon={Clock}
                title="Horaires d'ouverture"
                description="Définissez vos jours et créneaux d'ouverture"
                isOpen={openSections.has("hours")}
                onToggle={() => toggleSection("hours")}
              >
                <div className="divide-y divide-border">
                  {Object.entries(DAYS_FR).map(([day, label]) => {
                    const ranges = hours[day];
                    const isDayOpen = !!ranges && ranges.length > 0;
                    const shortLabel = DAYS_FR_SHORT[day];

                    return (
                      <div key={day} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("h-2 w-2 rounded-full transition-colors", isDayOpen ? "bg-green-500" : "bg-gray-300")} />
                            <span className="text-sm font-medium sm:hidden">{shortLabel}</span>
                            <span className="hidden text-sm font-medium sm:inline">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDayOpen && (
                              <button
                                onClick={() => openCopyDialog(day)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                title="Dupliquer ces horaires"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {!isDayOpen && <span className="text-xs text-muted-foreground">Fermé</span>}
                            <Switch checked={isDayOpen} onCheckedChange={(v) => toggleDay(day, v)} />
                          </div>
                        </div>

                        {isDayOpen && (
                          <div className="mt-2.5 space-y-2 pl-[1.125rem]">
                            {ranges.map((range, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Select value={range.open} onValueChange={(v) => updateRange(day, idx, "open", v)}>
                                  <SelectTrigger className="h-8 w-[5.5rem] text-xs" size="sm"><SelectValue /></SelectTrigger>
                                  <SelectContent position="popper" className="max-h-52">
                                    {TIME_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                                <span className="text-xs text-muted-foreground">à</span>
                                <Select value={range.close} onValueChange={(v) => updateRange(day, idx, "close", v)}>
                                  <SelectTrigger className="h-8 w-[5.5rem] text-xs" size="sm"><SelectValue /></SelectTrigger>
                                  <SelectContent position="popper" className="max-h-52">
                                    {TIME_OPTIONS.filter((opt) => opt.value >= range.open).map((opt) => (<SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                                {ranges.length > 1 && (
                                  <button onClick={() => removeRange(day, idx)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {ranges.length < 2 && (
                              <button onClick={() => addRange(day)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                                <Plus className="h-3 w-3" />
                                Ajouter une coupure
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Dialog open={!!copyFromDay} onOpenChange={(open) => { if (!open) { setCopyFromDay(null); setCopyToDays([]); } }}>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Dupliquer les horaires du {copyFromDay ? DAYS_FR[copyFromDay]?.toLowerCase() : ""}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1">
                      {Object.entries(DAYS_FR).filter(([d]) => d !== copyFromDay).map(([d, label]) => (
                        <label key={d} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted">
                          <input type="checkbox" checked={copyToDays.includes(d)} onChange={(e) => { setCopyToDays((prev) => e.target.checked ? [...prev, d] : prev.filter((x) => x !== d)); }} className="h-4 w-4 rounded border-border accent-primary" />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => { const all = Object.keys(DAYS_FR).filter((d) => d !== copyFromDay); setCopyToDays((prev) => prev.length === all.length ? [] : all); }} className="text-xs font-medium text-primary hover:text-primary/80">
                        {copyToDays.length === Object.keys(DAYS_FR).length - 1 ? "Tout désélectionner" : "Tout sélectionner"}
                      </button>
                    </div>
                    <DialogFooter>
                      <Button onClick={applyDuplicate} disabled={copyToDays.length === 0} className="w-full" size="sm">
                        <Check className="mr-2 h-4 w-4" />Appliquer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CollapsibleCard>

              {/* Types de commande */}
              <CollapsibleCard
                icon={UtensilsCrossed}
                title="Types de commande"
                description="Sur place, à emporter ou les deux"
                isOpen={openSections.has("order-types")}
                onToggle={() => toggleSection("order-types")}
              >
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">Sur place</p>
                      <p className="text-xs text-muted-foreground">Le client mange sur place</p>
                    </div>
                    <Switch checked={orderTypeDineIn} onCheckedChange={setOrderTypeDineIn} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">À emporter</p>
                      <p className="text-xs text-muted-foreground">Le client emporte sa commande</p>
                    </div>
                    <Switch checked={orderTypeTakeaway} onCheckedChange={setOrderTypeTakeaway} />
                  </div>
                </div>
              </CollapsibleCard>

              {/* Logo */}
              <CollapsibleCard
                icon={Camera}
                title="Logo"
                description="JPG, PNG, WebP ou SVG (max 2 Mo)"
                isOpen={openSections.has("logo")}
                onToggle={() => toggleSection("logo")}
              >
                <div className="relative inline-block">
                  <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted">
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" sizes="96px" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Ajouter</span>
                      </div>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadLogo(file); e.target.value = ""; }} />
                  </label>
                  {logoUrl && (
                    <button onClick={removeLogo} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background transition-colors hover:bg-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </CollapsibleCard>

              {/* Lien de commande */}
              <CollapsibleCard
                icon={QrCode}
                title="Lien de commande"
                description="Partagez ce lien ou imprimez le QR code"
                isOpen={openSections.has("link")}
                onToggle={() => toggleSection("link")}
              >
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
                    <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">
                      {process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/restaurant/{params.publicId}/order
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin; navigator.clipboard.writeText(`${appUrl}/restaurant/${params.publicId}/order`); toast.success("Lien copié !"); }}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />Copier
                  </Button>
                </div>
                <div className="mt-5 flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-border bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")}/restaurant/${params.publicId}/order`)}`} alt="QR Code" width={180} height={180} className="h-[180px] w-[180px]" />
                  </div>
                  <p className="text-xs text-muted-foreground">Scannez pour commander</p>
                  <Button variant="outline" size="sm" onClick={() => { const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/restaurant/${params.publicId}/order`)}`; const link = document.createElement("a"); link.href = qrUrl; link.download = `qr-${params.publicId}.png`; link.click(); }}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />Télécharger le QR code
                  </Button>
                </div>
              </CollapsibleCard>

              {/* Informations */}
              <CollapsibleCard
                icon={Store}
                title="Informations"
                description="Les informations visibles par vos clients"
                isOpen={openSections.has("info")}
                onToggle={() => toggleSection("info")}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="r-name">Nom du restaurant</Label>
                    <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du restaurant" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r-desc">Description</Label>
                    <textarea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Une courte description..." rows={2} className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="r-address">Adresse</Label>
                      <Input id="r-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 rue Example, 69000 Lyon" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="r-phone">Téléphone</Label>
                      <Input id="r-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                    </div>
                  </div>
                </div>
              </CollapsibleCard>
            </div>
          </TabsContent>

          {/* ═══ Tab: Paiement ═══ */}
          <TabsContent value="payment">
            <div className="space-y-8">
              {/* ═══════════════════════════════════════════
                   BLOC 1 — Modes de paiement acceptés
                  ═══════════════════════════════════════════ */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Modes de paiement acceptés
                  </h3>
                </div>

                <Card size="sm">
                  <CardContent className="pt-5">
                    <div className="space-y-0">
                      <div className="flex items-center justify-between py-3 first:pt-0">
                        <div>
                          <p className="text-sm font-medium">Espèces / sur place</p>
                          <p className="text-xs text-muted-foreground">
                            Le client paie au comptoir
                          </p>
                        </div>
                        <Switch
                          checked={acceptOnSite}
                          onCheckedChange={setAcceptOnSite}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between py-3">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm font-medium">Carte bancaire en ligne</p>
                          <p className="text-xs text-muted-foreground">
                            {restaurant.stripe_onboarding_complete
                              ? "Paiement en ligne sécurisé · Apple Pay & Google Pay inclus"
                              : "Activez d'abord votre compte Stripe ci-dessous pour utiliser ce mode."}
                          </p>
                        </div>
                        <Switch
                          checked={acceptOnline}
                          onCheckedChange={setAcceptOnline}
                          disabled={!restaurant.stripe_onboarding_complete}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </section>

              {/* ═══════════════════════════════════════════
                   BLOC 2 — Mon compte de paiements (Stripe Connect)
                  ═══════════════════════════════════════════ */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Mon compte de paiements
                  </h3>
                </div>

                <Card
                  size="sm"
                  className={cn(
                    "transition-colors",
                    restaurant.stripe_onboarding_complete &&
                      "border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20",
                    !restaurant.stripe_onboarding_complete &&
                      restaurant.stripe_account_id &&
                      "border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20",
                    !restaurant.stripe_account_id && "border-dashed",
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          restaurant.stripe_onboarding_complete
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : restaurant.stripe_account_id
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-sm">Compte Stripe</CardTitle>
                          {checkingStatus ? (
                            <Badge variant="secondary" className="gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Vérification…
                            </Badge>
                          ) : restaurant.stripe_onboarding_complete ? (
                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              <Check className="h-3 w-3" /> Actif
                            </Badge>
                          ) : restaurant.stripe_account_id ? (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                              Configuration en cours
                            </Badge>
                          ) : (
                            <Badge variant="outline">Non configuré</Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          Recevez les paiements en ligne et les recharges directement
                          sur votre compte bancaire. Propulsé par Stripe.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {restaurant.stripe_onboarding_complete ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {stripeData?.dashboard_url ? (
                          <Button
                            asChild
                            variant="outline"
                            className="w-full justify-between"
                          >
                            <a
                              href={stripeData.dashboard_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Mon dashboard Stripe
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                            className="w-full justify-between"
                          >
                            Mon dashboard Stripe
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={handleConnectStripe}
                          disabled={stripeLoading}
                          className="w-full justify-between"
                        >
                          {stripeLoading ? (
                            <>
                              Mise à jour…
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            </>
                          ) : (
                            <>
                              Mettre à jour mes infos
                              <ChevronRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    ) : restaurant.stripe_account_id ? (
                      <div className="space-y-3">
                        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                          Stripe a besoin d&apos;informations supplémentaires
                          (justificatifs, IBAN, identité du dirigeant) pour activer
                          votre compte.
                        </p>
                        <Button
                          onClick={handleConnectStripe}
                          disabled={stripeLoading}
                          className="w-full justify-between"
                        >
                          {stripeLoading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Reprendre la configuration
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>Onboarding guidé sur Stripe (env. 5 min)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>0 % de commission TaapR · uniquement les frais Stripe (~1,5 %)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>Versements automatiques sur votre compte bancaire</span>
                          </li>
                        </ul>
                        <Button
                          onClick={handleConnectStripe}
                          disabled={stripeLoading}
                          className="w-full justify-between"
                        >
                          {stripeLoading && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          Configurer mon compte Stripe
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Fee transparency block */}
                <Card size="sm">
                  <CardContent className="pt-4">
                    <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Frais Stripe par transaction
                          </p>
                          <p className="mt-0.5 font-mono text-base font-extrabold tracking-tight">
                            ~1,5 % <span className="text-muted-foreground">+</span> 0,20 €
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                          0 % TaapR
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                          <p className="text-[12px] leading-snug text-muted-foreground">
                            <span className="font-semibold text-foreground">Comme un TPE bancaire.</span>{" "}
                            Stripe sécurise chaque paiement aux normes PCI-DSS et 3D Secure.
                          </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                          <p className="text-[12px] leading-snug text-muted-foreground">
                            <span className="font-semibold text-foreground">Facturation incluse.</span>{" "}
                            Justificatifs et reçus exportables directement depuis votre tableau Stripe.
                          </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
                          <p className="text-[12px] leading-snug text-muted-foreground">
                            <span className="font-semibold text-foreground">TaapR ne prend aucune commission.</span>{" "}
                            Nous négocions la meilleure tarification possible pour nos restaurants.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Balance + recent payments — only when onboarding is complete. */}
                {restaurant.stripe_onboarding_complete && (
                  <>
                    <Card size="sm">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">Solde Stripe</CardTitle>
                            <CardDescription className="text-xs">
                              Versement automatique vers votre compte bancaire
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {stripeDataLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Chargement…</span>
                          </div>
                        ) : stripeData ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-green-500/20 bg-green-50/50 p-3 dark:bg-green-950/20">
                              <p className="text-xs font-medium text-muted-foreground">
                                Disponible
                              </p>
                              <p className="mt-1 text-lg font-bold text-green-600">
                                {formatPrice(stripeData.balance.available)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 p-3 dark:bg-amber-950/20">
                              <p className="text-xs font-medium text-muted-foreground">
                                En attente
                              </p>
                              <p className="mt-1 text-lg font-bold text-amber-600">
                                {formatPrice(stripeData.balance.pending)}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>

                    <Card size="sm">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">Derniers paiements</CardTitle>
                            <CardDescription className="text-xs">
                              Les 20 derniers paiements reçus
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {stripeDataLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Chargement…</span>
                          </div>
                        ) : stripeData && stripeData.payments.length > 0 ? (
                          <div className="divide-y divide-border">
                            {stripeData.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {payment.description || "Paiement"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(payment.created * 1000).toLocaleDateString(
                                      "fr-FR",
                                      {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Badge
                                    className={
                                      payment.paid
                                        ? "border-green-200 bg-green-100 text-green-700"
                                        : "border-orange-200 bg-orange-100 text-orange-700"
                                    }
                                  >
                                    {payment.paid ? "Payé" : "Échoué"}
                                  </Badge>
                                  <span className="text-sm font-semibold">
                                    {formatPrice(payment.amount)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : stripeData ? (
                          <p className="text-sm text-muted-foreground">
                            Aucun paiement pour le moment
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </>
                )}
              </section>
            </div>
          </TabsContent>

          {/* ═══ Tab: Fidélité ═══ */}
          <TabsContent value="loyalty">
            <div className="space-y-4">
              {!canUseLoyalty(subscriptionTier) ? (
                <TierLockBanner
                  current={subscriptionTier}
                  required="menu"
                  feature="Programme de fidélité + SMS"
                  description="Tampons digitaux & relances clientes"
                />
              ) : (
                <>
                  <Card size="sm">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Gift className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm">Programme de fidélité</CardTitle>
                          <CardDescription className="text-xs">1 EUR dépensé = 1 point de fidélité</CardDescription>
                        </div>
                      </div>
                      <CardAction><Switch checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} /></CardAction>
                    </CardHeader>
                  </Card>
                  {loyaltyEnabled && <LoyaltyTierBuilder restaurantId={restaurant.id} tiers={loyaltyTiers} onChange={setLoyaltyTiers} />}
                </>
              )}
            </div>
          </TabsContent>

          {/* ═══ Tab: Solde ═══ */}
          <TabsContent value="wallet">
            <div className="space-y-4">
              <Card size="sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm">Recharge de solde</CardTitle>
                      <CardDescription className="text-xs">Proposez des bonus pour inciter vos clients à recharger</CardDescription>
                    </div>
                  </div>
                  <CardAction><Switch checked={walletTopupEnabled} onCheckedChange={setWalletTopupEnabled} /></CardAction>
                </CardHeader>
              </Card>
              {walletTopupEnabled && <TopupTierBuilder tiers={walletTopupTiers} onChange={setWalletTopupTiers} />}
            </div>
          </TabsContent>

          {/* ═══ Tab: File d'attente ═══ */}
          <TabsContent value="queue">
            <div className="space-y-4">
              <Card size="sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm">File d&apos;attente digitale</CardTitle>
                      <CardDescription className="text-xs">Limitez les commandes simultanées pendant les heures de pointe</CardDescription>
                    </div>
                  </div>
                  <CardAction><Switch checked={queueEnabled} onCheckedChange={setQueueEnabled} /></CardAction>
                </CardHeader>
              </Card>

              {queueEnabled && (
                <>
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle className="text-sm">Commandes simultanées max</CardTitle>
                      <CardDescription className="text-xs">Nombre de clients pouvant commander en même temps</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setQueueMaxConcurrent(Math.max(1, queueMaxConcurrent - 1))}>-</Button>
                        <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">{queueMaxConcurrent}</span>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setQueueMaxConcurrent(Math.min(50, queueMaxConcurrent + 1))}>+</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card size="sm">
                    <CardContent className="pt-4">
                      <QueueManagerSection publicId={params.publicId} restaurantId={restaurant.id} />
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* ═══ Tab: Livraison ═══ */}
          <TabsContent value="delivery">
            <div className="space-y-4">
              {!deliveryAddonActive ? (
                <Card size="sm" className="border-dashed">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">
                          Module Livraison — 19 €/mois
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Ajoutez la livraison à domicile à votre offre
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Plan actuel : <strong>{getTierLabel(subscriptionTier)}</strong>.
                      Contactez le support pour activer le module Livraison sur votre
                      abonnement.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card size="sm">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Bike className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">
                            Activer la livraison
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Propose « Livraison » aux clients dans le checkout
                          </CardDescription>
                        </div>
                        <CardAction>
                          <Switch
                            checked={deliveryEnabled}
                            onCheckedChange={setDeliveryEnabled}
                          />
                        </CardAction>
                      </div>
                    </CardHeader>
                  </Card>

                  {deliveryEnabled && (
                    <>
                      <Card size="sm">
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Position & paramètres
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Déposez le pin sur votre restaurant
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <DeliveryMapPicker
                            value={deliveryCoords}
                            defaultAddress={address}
                            onChange={setDeliveryCoords}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Temps de préparation (min)
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                step={5}
                                value={deliveryPrepTime}
                                onChange={(e) =>
                                  setDeliveryPrepTime(
                                    Math.max(0, parseInt(e.target.value) || 0)
                                  )
                                }
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Rayon maximum (km)
                              </Label>
                              <Input
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={
                                  deliveryMaxRadius
                                    ? deliveryMaxRadius / 1000
                                    : ""
                                }
                                onChange={(e) => {
                                  const km = parseFloat(e.target.value) || 0;
                                  setDeliveryMaxRadius(Math.round(km * 1000));
                                }}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card size="sm">
                        <CardHeader>
                          <CardTitle className="text-sm">Zones</CardTitle>
                          <CardDescription className="text-xs">
                            Cercles concentriques triés par rayon. Le client
                            paie le tarif de la zone la plus proche.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DeliveryZoneBuilder
                            zones={deliveryZones}
                            onChange={setDeliveryZones}
                          />
                        </CardContent>
                      </Card>

                      <Card size="sm">
                        <CardHeader>
                          <CardTitle className="text-sm">Livreurs</CardTitle>
                          <CardDescription className="text-xs">
                            Invitez des livreurs — ils se connectent par SMS
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <DriverManager publicId={params.publicId} />
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ═══ Tab: Stock ═══ */}
          <TabsContent value="stock">
            <div className="space-y-4">
              {!stockModuleActive ? (
                <Card size="sm" className="border-dashed">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm">Module Stock — 12 €/mois</CardTitle>
                        <CardDescription className="text-xs">
                          OCR tickets fournisseur · alertes seuil bas · décrément auto
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-xs text-muted-foreground">
                      14 jours d&apos;essai gratuit. Sans engagement.
                    </p>
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={async () => {
                        const res = await fetch("/api/admin/stock/subscribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ restaurant_id: restaurant.id }),
                        });
                        const data = await res.json();
                        if (!res.ok || !data.url) {
                          toast.error(data.error || "Erreur");
                          return;
                        }
                        window.location.href = data.url;
                      }}
                    >
                      Activer le module
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card size="sm">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">Activer le suivi de stock</CardTitle>
                          <CardDescription className="text-xs">
                            Numérisez les tickets, suivez les quantités, recevez les alertes
                          </CardDescription>
                        </div>
                        <CardAction>
                          <Switch
                            checked={stockEnabled}
                            onCheckedChange={setStockEnabled}
                          />
                        </CardAction>
                      </div>
                    </CardHeader>
                  </Card>

                  {stockEnabled && (
                    <Card size="sm">
                      <CardContent className="space-y-3 py-6">
                        <p className="text-sm">
                          Module Stock actif. Retrouvez les ingrédients, recettes,
                          scans et mouvements depuis la nav.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/admin/${restaurant.slug}/stock`}>
                            <Button variant="outline" className="rounded-lg" size="sm">
                              Ouvrir le module
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-destructive hover:bg-destructive/5 hover:text-destructive"
                            onClick={async () => {
                              if (!confirm("Annuler l'abonnement Stock ?")) return;
                              const res = await fetch("/api/admin/stock/cancel", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ restaurant_id: restaurant.id }),
                              });
                              if (!res.ok) {
                                const data = await res.json().catch(() => ({}));
                                toast.error(data.error || "Erreur");
                                return;
                              }
                              toast.success("Abonnement annulé");
                              window.location.reload();
                            }}
                          >
                            Annuler l&apos;abonnement
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* ═══ Tab: Plan de salle ═══ */}
          <TabsContent value="floor">
            <div className="space-y-4">
              {!canUseFloorPlan(subscriptionTier) ? (
                <TierLockBanner
                  current={subscriptionTier}
                  required="menu"
                  feature="Plan de salle interactif"
                  description="Disposez vos tables, suivez l'occupation"
                />
              ) : (
                <FloorPlanEditor value={floorPlan} onChange={setFloorPlan} />
              )}
            </div>
          </TabsContent>

          {/* ═══ Tab: API & webhooks ═══ */}
          <TabsContent value="api">
            <div className="space-y-4">
              {!canUseApi(subscriptionTier) ? (
                <TierLockBanner
                  current={subscriptionTier}
                  required="carte"
                  feature="API & webhooks"
                  description="Authentifiez vos intégrations externes (n8n, Zapier, scripts maison…)"
                />
              ) : (
                <ApiKeysManager restaurantId={restaurant.id} />
              )}
            </div>
          </TabsContent>

          {/* ═══ Tab: Compte ═══ */}
          <TabsContent value="account">
            <div className="space-y-4">
              {/* ─── Mon abonnement ─── */}
              <Card size="sm" className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">Mon abonnement</CardTitle>
                      <CardDescription className="text-xs">
                        Plan actuel et facturation TaapR
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                          Formule
                        </p>
                        <p className="text-base font-semibold text-foreground">
                          {getTierLabel(subscriptionTier)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatPrice(getTierPrice(subscriptionTier) * 100)} HT / mois · par restaurant
                        </p>
                      </div>
                      {nextTier(subscriptionTier) && (
                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700">
                          ↑ {getTierLabel(nextTier(subscriptionTier)!)} disponible
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={handleOpenBillingPortal}
                      disabled={openingBillingPortal}
                      className="w-full"
                    >
                      {openingBillingPortal ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                      )}
                      Gérer mon abonnement sur Stripe
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Modifier la formule, les moyens de paiement, télécharger les factures…
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Adresse e-mail</CardTitle>
                      <CardDescription>{email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm">Mot de passe</CardTitle>
                  <CardDescription className="text-xs">Modifiez votre mot de passe de connexion</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                      <Input id="new-pw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 caractères" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw">Confirmer</Label>
                      <Input id="confirm-pw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Répéter le mot de passe" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword} variant="outline" className="w-full">
                      {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Modifier le mot de passe
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              <Button onClick={handleLogout} variant="ghost" className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
