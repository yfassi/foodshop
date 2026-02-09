"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import Image from "next/image";
import type { Restaurant } from "@/lib/types";
import { DAYS_FR, normalizeHoursEntry } from "@/lib/constants";
import { FONT_OPTIONS } from "@/lib/branding";
import { KitchenToggle } from "@/components/restaurant/kitchen-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "restaurant" | "appearance" | "payment" | "account";

interface TimeRange {
  open: string;
  close: string;
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
        toast.success("Compte Stripe connecte avec succes !");
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

    setSavingRestaurant(true);
    const supabase = createClient();

    const openingHours: Record<string, TimeRange[]> = {};
    for (const [day, ranges] of Object.entries(hours)) {
      if (ranges && ranges.length > 0) {
        openingHours[day] = ranges;
      }
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        description: description.trim() || null,
        opening_hours: openingHours,
      })
      .eq("id", restaurant!.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setSavingRestaurant(false);
      return;
    }

    toast.success("Informations mises a jour");
    setSavingRestaurant(false);
  };

  // --- Payment methods ---

  const savePaymentMethods = async () => {
    const methods: string[] = [];
    if (acceptOnSite) methods.push("on_site");
    if (acceptOnline) methods.push("online");

    if (methods.length === 0) {
      toast.error("Au moins un mode de paiement doit etre actif");
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
      toast.success("Modes de paiement mis a jour");
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
      toast.error("Le mot de passe doit contenir au moins 6 caracteres");
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

    toast.success("Mot de passe modifie");
    setNewPassword("");
    setConfirmPassword("");
    setSavingPassword(false);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
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
      toast.success("Apparence mise a jour");
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
      toast.error("Format accepte : JPG, PNG, WebP ou SVG");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Le logo ne doit pas depasser 2 Mo");
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
    toast.success("Logo mis a jour");
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
    toast.success("Logo supprime");
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
      const updated = ranges.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      );
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

  if (loading || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "restaurant", label: "Etablissement", icon: <Store className="h-4 w-4" /> },
    { key: "appearance", label: "Apparence", icon: <Palette className="h-4 w-4" /> },
    { key: "payment", label: "Paiement", icon: <CreditCard className="h-4 w-4" /> },
    { key: "account", label: "Mon compte", icon: <User className="h-4 w-4" /> },
  ];

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mx-auto max-w-lg">
        <h2 className="mb-4 text-lg font-bold">Reglages</h2>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab: Etablissement */}
        {activeTab === "restaurant" && (
          <div className="space-y-4">
            {/* Open/Closed toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <h3 className="text-sm font-semibold">Prise de commandes</h3>
                <p className="text-xs text-muted-foreground">
                  Activez ou desactivez les commandes
                </p>
              </div>
              <KitchenToggle
                restaurantId={restaurant.id}
                initialOpen={restaurant.is_accepting_orders}
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="r-name">Nom</Label>
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
                  <Label htmlFor="r-phone">Telephone</Label>
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

            {/* Opening hours */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Horaires d&apos;ouverture
              </h3>
              <div className="space-y-3">
                {Object.entries(DAYS_FR).map(([day, label]) => {
                  const ranges = hours[day];
                  const isOpen = !!ranges && ranges.length > 0;

                  return (
                    <div key={day}>
                      <div className="flex items-center gap-3">
                        <div className="w-20 shrink-0">
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <Switch
                          checked={isOpen}
                          onCheckedChange={(v) => toggleDay(day, v)}
                        />
                        {isOpen ? (
                          <div className="flex flex-1 flex-col gap-1.5">
                            {ranges.map((range, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5"
                              >
                                <Input
                                  type="time"
                                  value={range.open}
                                  onChange={(e) =>
                                    updateRange(
                                      day,
                                      idx,
                                      "open",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-[6.5rem] text-xs"
                                />
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                                <Input
                                  type="time"
                                  value={range.close}
                                  onChange={(e) =>
                                    updateRange(
                                      day,
                                      idx,
                                      "close",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 w-[6.5rem] text-xs"
                                />
                                {ranges.length > 1 && (
                                  <button
                                    onClick={() => removeRange(day, idx)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {ranges.length < 2 && (
                              <button
                                onClick={() => addRange(day)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Plus className="h-3 w-3" />
                                Coupure
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Ferme
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={saveRestaurant}
              disabled={savingRestaurant}
              className="w-full"
            >
              {savingRestaurant && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer
            </Button>
          </div>
        )}

        {/* Tab: Apparence */}
        {activeTab === "appearance" && (
          <div className="space-y-4">
            {/* Logo */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Logo
              </h3>
              <div className="relative inline-block">
                <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted transition-colors hover:border-primary">
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
                      <span className="text-[10px]">Ajouter</span>
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
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Primary color */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Couleur principale
              </h3>
              <div className="flex items-center gap-3">
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
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className="h-8 rounded-md px-4 text-xs font-medium leading-8 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Apercu bouton
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Apercu de la couleur
                  </span>
                </div>
              )}
            </div>

            {/* Font */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Police
              </h3>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Geist Sans (par defaut)" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span className="flex items-center gap-2">
                        <span>{font.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {font.category}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fontFamily && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFontFamily("")}
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Revenir a la police par defaut
                </Button>
              )}
            </div>

            {/* Save */}
            <Button
              onClick={saveBranding}
              disabled={savingBranding}
              className="w-full"
            >
              {savingBranding && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer l&apos;apparence
            </Button>
          </div>
        )}

        {/* Tab: Paiement */}
        {activeTab === "payment" && (
          <div className="space-y-4">
            {/* Accepted payment methods */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Modes de paiement acceptes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Especes / sur place</p>
                    <p className="text-xs text-muted-foreground">
                      Le client paie au comptoir
                    </p>
                  </div>
                  <Switch
                    checked={acceptOnSite}
                    onCheckedChange={setAcceptOnSite}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Carte bancaire en ligne</p>
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
                disabled={savingPaymentMethods || (!acceptOnSite && !acceptOnline)}
                className="mt-4 w-full"
                variant="outline"
              >
                {savingPaymentMethods && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </div>

            {/* Stripe connection */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Compte Stripe
              </h3>

              {checkingStatus ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    Verification du compte Stripe...
                  </span>
                </div>
              ) : restaurant.stripe_onboarding_complete ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Actif
                  </span>
                  <span className="text-sm">Compte Stripe connecte</span>
                </div>
              ) : restaurant.stripe_account_id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      Incomplet
                    </span>
                    <span className="text-sm">Configuration en cours</span>
                  </div>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {stripeLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Completer la configuration
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">
                    Connectez un compte Stripe pour accepter les paiements en
                    ligne et les recharges de solde.
                  </p>
                  <Button
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className="w-full"
                  >
                    {stripeLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Connecter Stripe
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Mon compte */}
        {activeTab === "account" && (
          <div className="space-y-4">
            {/* Email */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Adresse e-mail
              </h3>
              <p className="text-sm">{email}</p>
            </div>

            {/* Password */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                Changer le mot de passe
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirmer</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeter le mot de passe"
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
            </div>

            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Deconnexion
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
