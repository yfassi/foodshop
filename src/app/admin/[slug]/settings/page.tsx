"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  Palette,
  Camera,
  QrCode,
  Link as LinkIcon,
  Copy,
  Clock,
  Gift,
  ChevronRight,
  Check,
  Type,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import type { Restaurant, LoyaltyTier, OrderType } from "@/lib/types";
import {
  DAYS_FR,
  DAYS_FR_SHORT,
  normalizeHoursEntry,
  TIME_OPTIONS,
} from "@/lib/constants";
import { FONT_OPTIONS } from "@/lib/branding";
import { KitchenToggle } from "@/components/restaurant/kitchen-toggle";
import { LoyaltyTierBuilder } from "@/components/admin/loyalty-tier-builder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "restaurant" | "appearance" | "payment" | "loyalty" | "account";

interface TimeRange {
  open: string;
  close: string;
}

/* ─── Section wrapper ─── */
function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-5 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("restaurant");

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
  const [savingRestaurant, setSavingRestaurant] = useState(false);

  // Payment methods
  const [acceptOnSite, setAcceptOnSite] = useState(true);
  const [acceptOnline, setAcceptOnline] = useState(false);
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);

  // Branding
  const [primaryColor, setPrimaryColor] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Loyalty
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  // Account
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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
        .eq("slug", params.slug)
        .single<Restaurant>();

      if (data) {
        setRestaurant(data);
        setName(data.name);
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setDescription(data.description || "");

        const h: Record<string, TimeRange[] | null> = {};
        for (const day of Object.keys(DAYS_FR)) {
          h[day] = normalizeHoursEntry(data.opening_hours?.[day]);
        }
        setHours(h);

        setPrimaryColor(data.primary_color || "");
        setFontFamily(data.font_family || "");
        setLogoUrl(data.logo_url || null);

        const methods: string[] = data.accepted_payment_methods || ["on_site"];
        setAcceptOnSite(methods.includes("on_site"));
        setAcceptOnline(methods.includes("online"));

        const types: string[] = data.order_types || ["dine_in", "takeaway"];
        setOrderTypeDineIn(types.includes("dine_in"));
        setOrderTypeTakeaway(types.includes("takeaway"));

        setLoyaltyEnabled(data.loyalty_enabled ?? false);
        setLoyaltyTiers(data.loyalty_tiers ?? []);
      }

      setLoading(false);
    };
    load();
  }, [params.slug]);

  // --- Stripe ---

  const checkStripeStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch("/api/stripe/connect/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: params.slug }),
      });
      const data = await res.json();
      if (data.onboarding_complete) {
        setRestaurant((prev) =>
          prev ? { ...prev, stripe_onboarding_complete: true } : prev
        );
        toast.success("Compte Stripe connecté avec succès !");
      }
    } catch {
      // Silent fail
    }
    setCheckingStatus(false);
  };

  useEffect(() => {
    if (
      restaurant &&
      (searchParams.get("stripe_return") === "true" ||
        searchParams.get("stripe_refresh") === "true")
    ) {
      checkStripeStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant, searchParams]);

  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: params.slug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erreur lors de la connexion Stripe");
      }
    } catch {
      toast.error("Erreur lors de la connexion Stripe");
    }
    setStripeLoading(false);
  };

  // --- Restaurant save ---

  const saveRestaurant = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    if (!orderTypeDineIn && !orderTypeTakeaway) {
      toast.error("Au moins un type de commande doit être actif");
      return;
    }

    setSavingRestaurant(true);
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
      .eq("id", restaurant!.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setSavingRestaurant(false);
      return;
    }

    toast.success("Informations mises à jour");
    setSavingRestaurant(false);
  };

  // --- Payment methods ---

  const savePaymentMethods = async () => {
    const methods: string[] = [];
    if (acceptOnSite) methods.push("on_site");
    if (acceptOnline) methods.push("online");

    if (methods.length === 0) {
      toast.error("Au moins un mode de paiement doit être actif");
      return;
    }

    setSavingPaymentMethods(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ accepted_payment_methods: methods })
      .eq("id", restaurant!.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Modes de paiement mis à jour");
    }
    setSavingPaymentMethods(false);
  };

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

  // --- Loyalty ---

  const saveLoyalty = async () => {
    setSavingLoyalty(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("restaurants")
      .update({
        loyalty_enabled: loyaltyEnabled,
        loyalty_tiers: loyaltyTiers,
      })
      .eq("id", restaurant!.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Programme de fidélité mis à jour");
    }
    setSavingLoyalty(false);
  };

  // --- Branding ---

  const saveBranding = async () => {
    setSavingBranding(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("restaurants")
      .update({
        primary_color: primaryColor.trim() || null,
        font_family: fontFamily || null,
      })
      .eq("id", restaurant!.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Apparence mise à jour");
    }
    setSavingBranding(false);
  };

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
          // If new open >= close, push close forward
          return { open: value, close: value >= r.close ? value : r.close };
        }
        // If new close <= open, clamp to open
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

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "restaurant",
      label: "Établissement",
      icon: <Store className="h-4 w-4" />,
    },
    {
      key: "appearance",
      label: "Apparence",
      icon: <Palette className="h-4 w-4" />,
    },
    {
      key: "payment",
      label: "Paiement",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      key: "loyalty",
      label: "Fidélité",
      icon: <Gift className="h-4 w-4" />,
    },
    {
      key: "account",
      label: "Compte",
      icon: <User className="h-4 w-4" />,
    },
  ];

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-xl font-bold">Réglages</h2>

        {/* ─── Tabs ─── */}
        <div className="no-scrollbar mb-8 -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ Tab: Établissement ═══ */}
        {activeTab === "restaurant" && (
          <div className="space-y-4">
            {/* Open/Closed toggle */}
            <Section>
              <SectionHeader
                title="Prise de commandes"
                description="Activez ou désactivez les commandes en temps réel"
                action={
                  <KitchenToggle
                    restaurantId={restaurant.id}
                    initialOpen={restaurant.is_accepting_orders}
                  />
                }
              />
            </Section>

            {/* Order types */}
            <Section>
              <SectionHeader
                icon={UtensilsCrossed}
                title="Types de commande"
                description="Sur place, à emporter ou les deux"
              />

              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between rounded-lg px-1 py-3">
                  <div>
                    <p className="text-sm font-medium">Sur place</p>
                    <p className="text-xs text-muted-foreground">
                      Le client mange sur place
                    </p>
                  </div>
                  <Switch
                    checked={orderTypeDineIn}
                    onCheckedChange={setOrderTypeDineIn}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between rounded-lg px-1 py-3">
                  <div>
                    <p className="text-sm font-medium">À emporter</p>
                    <p className="text-xs text-muted-foreground">
                      Le client emporte sa commande
                    </p>
                  </div>
                  <Switch
                    checked={orderTypeTakeaway}
                    onCheckedChange={setOrderTypeTakeaway}
                  />
                </div>
              </div>
            </Section>

            {/* Public link & QR code */}
            <Section>
              <SectionHeader
                icon={QrCode}
                title="Lien de commande"
                description="Partagez ce lien ou imprimez le QR code"
              />

              <div className="mt-4 flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-sm">
                    {typeof window !== "undefined"
                      ? window.location.origin
                      : ""}
                    /{params.slug}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `${window.location.origin}/${params.slug}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Lien copié !");
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copier
                </Button>
              </div>

              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="rounded-xl border border-border bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/${params.slug}`)}`}
                    alt="QR Code"
                    width={160}
                    height={160}
                    className="h-[160px] w-[160px]"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  Scannez pour commander
                </span>
              </div>
            </Section>

            {/* Restaurant info form */}
            <Section>
              <SectionHeader
                icon={Store}
                title="Informations"
                description="Les informations visibles par vos clients"
              />

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="r-name">Nom du restaurant</Label>
                  <Input
                    id="r-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom du restaurant"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="r-desc">Description</Label>
                  <textarea
                    id="r-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Une courte description..."
                    rows={2}
                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="r-address">Adresse</Label>
                    <Input
                      id="r-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 rue Example, 69000 Lyon"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="r-phone">Téléphone</Label>
                    <Input
                      id="r-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Opening hours */}
            <Section>
              <SectionHeader
                icon={Clock}
                title="Horaires d'ouverture"
                description="Définissez vos jours et créneaux d'ouverture"
              />

              <div className="mt-4 divide-y divide-border">
                {Object.entries(DAYS_FR).map(([day, label]) => {
                  const ranges = hours[day];
                  const isOpen = !!ranges && ranges.length > 0;
                  const shortLabel = DAYS_FR_SHORT[day];

                  return (
                    <div key={day} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-2 w-2 rounded-full transition-colors ${
                              isOpen ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                          <span className="text-sm font-medium sm:hidden">
                            {shortLabel}
                          </span>
                          <span className="hidden text-sm font-medium sm:inline">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOpen && (
                            <button
                              onClick={() => openCopyDialog(day)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              title="Dupliquer ces horaires"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!isOpen && (
                            <span className="text-xs text-muted-foreground">
                              Fermé
                            </span>
                          )}
                          <Switch
                            checked={isOpen}
                            onCheckedChange={(v) => toggleDay(day, v)}
                          />
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-2.5 space-y-2 pl-[1.125rem]">
                          {ranges.map((range, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2"
                            >
                              <Select
                                value={range.open}
                                onValueChange={(v) =>
                                  updateRange(day, idx, "open", v)
                                }
                              >
                                <SelectTrigger
                                  className="h-9 w-[5.5rem] text-xs font-medium"
                                  size="sm"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  className="max-h-52"
                                >
                                  {TIME_OPTIONS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <span className="text-xs font-medium text-muted-foreground">
                                à
                              </span>

                              <Select
                                value={range.close}
                                onValueChange={(v) =>
                                  updateRange(day, idx, "close", v)
                                }
                              >
                                <SelectTrigger
                                  className="h-9 w-[5.5rem] text-xs font-medium"
                                  size="sm"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  className="max-h-52"
                                >
                                  {TIME_OPTIONS.filter(
                                    (opt) => opt.value >= range.open
                                  ).map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                      className="text-xs"
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {ranges.length > 1 && (
                                <button
                                  onClick={() => removeRange(day, idx)}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          {ranges.length < 2 && (
                            <button
                              onClick={() => addRange(day)}
                              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                            >
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

              <Dialog
                open={!!copyFromDay}
                onOpenChange={(open) => {
                  if (!open) {
                    setCopyFromDay(null);
                    setCopyToDays([]);
                  }
                }}
              >
                <DialogContent className="sm:max-w-sm">
                  <DialogHeader>
                    <DialogTitle>
                      Dupliquer les horaires du{" "}
                      {copyFromDay ? DAYS_FR[copyFromDay]?.toLowerCase() : ""}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {Object.entries(DAYS_FR)
                      .filter(([d]) => d !== copyFromDay)
                      .map(([d, label]) => (
                        <label
                          key={d}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={copyToDays.includes(d)}
                            onChange={(e) => {
                              setCopyToDays((prev) =>
                                e.target.checked
                                  ? [...prev, d]
                                  : prev.filter((x) => x !== d)
                              );
                            }}
                            className="h-4 w-4 rounded border-border text-primary accent-primary"
                          />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        const allOtherDays = Object.keys(DAYS_FR).filter(
                          (d) => d !== copyFromDay
                        );
                        setCopyToDays((prev) =>
                          prev.length === allOtherDays.length
                            ? []
                            : allOtherDays
                        );
                      }}
                      className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {copyToDays.length ===
                      Object.keys(DAYS_FR).length - 1
                        ? "Tout désélectionner"
                        : "Tout sélectionner"}
                    </button>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={applyDuplicate}
                      disabled={copyToDays.length === 0}
                      className="w-full"
                      size="sm"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Appliquer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Section>

            <Button
              onClick={saveRestaurant}
              disabled={savingRestaurant}
              className="w-full"
            >
              {savingRestaurant ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        )}

        {/* ═══ Tab: Apparence ═══ */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            {/* Logo */}
            <Section>
              <SectionHeader
                icon={Camera}
                title="Logo"
                description="JPG, PNG, WebP ou SVG (max 2 Mo)"
              />
              <div className="mt-4">
                <div className="relative inline-block">
                  <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary hover:bg-muted">
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Logo"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Camera className="h-5 w-5" />
                        <span className="text-[10px] font-medium">
                          Ajouter
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadLogo(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      onClick={removeLogo}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Section>

            {/* Primary color */}
            <Section>
              <SectionHeader
                icon={Palette}
                title="Couleur principale"
                description="Appliquée aux boutons et éléments d'accent"
              />
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor || "#d4522a"}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-border"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#d4522a"
                  className="flex-1 font-mono text-sm"
                  maxLength={7}
                />
                {primaryColor && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrimaryColor("")}
                    className="text-xs text-muted-foreground"
                  >
                    Reset
                  </Button>
                )}
              </div>
              {primaryColor && (
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="h-8 rounded-lg px-4 text-xs font-medium leading-8 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Aperçu bouton
                  </div>
                  <div
                    className="h-8 w-8 rounded-lg"
                    style={{ backgroundColor: primaryColor }}
                  />
                </div>
              )}
            </Section>

            {/* Font family */}
            <Section>
              <SectionHeader
                icon={Type}
                title="Typographie"
                description="Police utilisée sur votre page de commande"
              />
              <div className="mt-4">
                <Select
                  value={fontFamily || ""}
                  onValueChange={setFontFamily}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Police par défaut (Inter)" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span className="font-medium">{font.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {font.category}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fontFamily && (
                  <button
                    onClick={() => setFontFamily("")}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Réinitialiser la police
                  </button>
                )}
              </div>
            </Section>

            <Button
              onClick={saveBranding}
              disabled={savingBranding}
              className="w-full"
            >
              {savingBranding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Enregistrer l&apos;apparence
            </Button>
          </div>
        )}

        {/* ═══ Tab: Paiement ═══ */}
        {activeTab === "payment" && (
          <div className="space-y-4">
            {/* Accepted payment methods */}
            <Section>
              <SectionHeader
                icon={CreditCard}
                title="Modes de paiement"
                description="Choisissez les moyens de paiement acceptés"
              />

              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-between rounded-lg px-1 py-3">
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
                <div className="flex items-center justify-between rounded-lg px-1 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Carte bancaire en ligne
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {restaurant.stripe_onboarding_complete
                        ? "Paiement en ligne via Stripe"
                        : "Connectez Stripe pour activer"}
                    </p>
                  </div>
                  <Switch
                    checked={acceptOnline}
                    onCheckedChange={setAcceptOnline}
                    disabled={!restaurant.stripe_onboarding_complete}
                  />
                </div>
              </div>

              <Button
                onClick={savePaymentMethods}
                disabled={
                  savingPaymentMethods || (!acceptOnSite && !acceptOnline)
                }
                className="mt-4 w-full"
                variant="outline"
              >
                {savingPaymentMethods && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </Section>

            {/* Stripe connection */}
            <Section>
              <SectionHeader
                title="Compte Stripe"
                description="Recevez les paiements en ligne et les recharges de solde"
              />

              <div className="mt-4">
                {checkingStatus ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      Vérification du compte Stripe...
                    </span>
                  </div>
                ) : restaurant.stripe_onboarding_complete ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      <Check className="h-3 w-3" />
                      Connecté
                    </span>
                  </div>
                ) : restaurant.stripe_account_id ? (
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Configuration en cours
                    </span>
                    <Button
                      onClick={handleConnectStripe}
                      disabled={stripeLoading}
                      variant="outline"
                      className="w-full"
                    >
                      {stripeLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Compléter la configuration
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className="w-full"
                  >
                    {stripeLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Connecter Stripe
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* ═══ Tab: Fidélité ═══ */}
        {activeTab === "loyalty" && (
          <div className="space-y-4">
            <Section>
              <SectionHeader
                icon={Gift}
                title="Programme de fidélité"
                description="1 EUR dépensé = 1 point de fidélité"
                action={
                  <Switch
                    checked={loyaltyEnabled}
                    onCheckedChange={setLoyaltyEnabled}
                  />
                }
              />
            </Section>

            {loyaltyEnabled && (
              <LoyaltyTierBuilder
                restaurantId={restaurant.id}
                tiers={loyaltyTiers}
                onChange={setLoyaltyTiers}
              />
            )}

            <Button
              onClick={saveLoyalty}
              disabled={savingLoyalty}
              className="w-full"
            >
              {savingLoyalty ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        )}

        {/* ═══ Tab: Compte ═══ */}
        {activeTab === "account" && (
          <div className="space-y-4">
            {/* Email */}
            <Section>
              <SectionHeader
                icon={User}
                title="Adresse e-mail"
              />
              <p className="mt-3 text-sm text-muted-foreground">{email}</p>
            </Section>

            {/* Password */}
            <Section>
              <SectionHeader
                title="Mot de passe"
                description="Modifiez votre mot de passe de connexion"
              />
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirmer</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répéter le mot de passe"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword || !newPassword}
                  variant="outline"
                  className="w-full"
                >
                  {savingPassword && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Modifier le mot de passe
                </Button>
              </div>
            </Section>

            {/* Logout */}
            <Separator className="my-2" />
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
