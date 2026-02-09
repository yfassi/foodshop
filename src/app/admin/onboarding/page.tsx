"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  CreditCard,
  Palette,
  Plus,
  Camera,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FONT_OPTIONS } from "@/lib/branding";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = [
  { label: "Restaurant", icon: Store },
  { label: "Contact", icon: MapPin },
  { label: "Horaires", icon: Clock },
  { label: "Apparence", icon: Palette },
  { label: "Paiement", icon: CreditCard },
];

const DAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

interface TimeRange {
  open: string;
  close: string;
}

type HoursState = Record<string, TimeRange[] | null>;

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const DEFAULT_HOURS: HoursState = {
  monday: [{ open: "11:00", close: "22:00" }],
  tuesday: [{ open: "11:00", close: "22:00" }],
  wednesday: [{ open: "11:00", close: "22:00" }],
  thursday: [{ open: "11:00", close: "22:00" }],
  friday: [{ open: "11:00", close: "22:00" }],
  saturday: [{ open: "11:00", close: "23:00" }],
  sunday: [{ open: "12:00", close: "22:00" }],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Restaurant
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [description, setDescription] = useState("");

  // Step 2 — Contact
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3 — Hours
  const [hours, setHours] = useState<HoursState>(DEFAULT_HOURS);

  // Step 4 — Appearance
  const [primaryColor, setPrimaryColor] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step 5 — Payment
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(false);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(toSlug(name));
    }
  }, [name, slugEdited]);

  // Check slug availability (debounced)
  const checkSlug = useCallback(async (s: string) => {
    if (!s || s.length < 2) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    try {
      const res = await fetch(
        `/api/admin/check-slug?slug=${encodeURIComponent(s)}`
      );
      const data = await res.json();
      setSlugAvailable(data.available);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (slug) checkSlug(slug);
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, checkSlug]);

  const canAdvance = () => {
    switch (step) {
      case 0:
        return (
          name.trim().length > 0 && slug.length >= 2 && slugAvailable === true
        );
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return cashEnabled || cardEnabled;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canAdvance()) return;

    setSubmitting(true);

    // Build opening_hours
    const opening_hours: Record<string, { open: string; close: string }[]> = {};
    for (const day of DAYS) {
      const ranges = hours[day.key];
      opening_hours[day.key] = ranges || [];
    }

    // Build payment methods
    const accepted_payment_methods: string[] = [];
    if (cashEnabled) accepted_payment_methods.push("on_site");
    if (cardEnabled) accepted_payment_methods.push("online");

    try {
      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          opening_hours,
          accepted_payment_methods,
          primary_color: primaryColor.trim() || undefined,
          font_family: fontFamily || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }

      toast.success("Restaurant cree avec succes !");
      router.push(`/admin/${data.slug}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la creation"
      );
      setSubmitting(false);
    }
  };

  // --- Hours helpers ---

  const toggleDay = (key: string, enabled: boolean) => {
    setHours((prev) => ({
      ...prev,
      [key]: enabled ? [{ open: "11:00", close: "22:00" }] : null,
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

  // --- Logo upload ---

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
    const filePath = `temp-onboarding/${Date.now()}/logo.${ext}`;

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

    setLogoUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    setUploadingLogo(false);
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="mb-8 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted-foreground/30 text-muted-foreground/50"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-medium transition-colors duration-300 ${
                      isActive || isDone
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 mb-5 h-0.5 w-6 transition-colors duration-300 ${
                      i < step ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          {/* Step 1: Restaurant */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Votre restaurant</h2>
                <p className="text-sm text-muted-foreground">
                  Comment s&apos;appelle votre etablissement ?
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nom du restaurant
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Chez Momo"
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-sm font-medium">
                  Adresse web
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(toSlug(e.target.value));
                    }}
                    placeholder="chez-momo"
                    className="h-12 font-mono"
                  />
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                    {slugChecking && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!slugChecking && slugAvailable === true && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {!slugChecking && slugAvailable === false && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {slugAvailable === false && (
                  <p className="text-xs text-red-500">Ce nom est deja pris</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description{" "}
                  <span className="text-muted-foreground">(optionnel)</span>
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Cuisine marocaine traditionnelle..."
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Step 2: Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Coordonnees</h2>
                <p className="text-sm text-muted-foreground">
                  Ces informations seront visibles par vos clients
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-medium">
                  Adresse
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 rue de la Paix, 75002 Paris"
                  className="h-12"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telephone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01 23 45 67 89"
                  className="h-12"
                />
              </div>
            </div>
          )}

          {/* Step 3: Hours */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">
                  Horaires d&apos;ouverture
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configurez vos horaires pour chaque jour
                </p>
              </div>

              <div className="space-y-2">
                {DAYS.map((day) => {
                  const ranges = hours[day.key];
                  const isOpen = !!ranges && ranges.length > 0;

                  return (
                    <div
                      key={day.key}
                      className={`rounded-xl border px-3 py-2.5 transition-colors ${
                        isOpen
                          ? "border-border bg-card"
                          : "border-transparent bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isOpen}
                          onCheckedChange={(v) => toggleDay(day.key, v)}
                        />
                        <span
                          className={`w-20 text-sm font-medium ${
                            !isOpen ? "text-muted-foreground" : ""
                          }`}
                        >
                          {day.label}
                        </span>
                        {isOpen ? (
                          <div className="flex flex-1 flex-col gap-1.5">
                            {ranges.map((range, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="time"
                                  value={range.open}
                                  onChange={(e) =>
                                    updateRange(
                                      day.key,
                                      idx,
                                      "open",
                                      e.target.value
                                    )
                                  }
                                  className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
                                />
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                                <input
                                  type="time"
                                  value={range.close}
                                  onChange={(e) =>
                                    updateRange(
                                      day.key,
                                      idx,
                                      "close",
                                      e.target.value
                                    )
                                  }
                                  className="rounded-lg border border-input bg-background px-2 py-1 text-sm"
                                />
                                {ranges.length > 1 && (
                                  <button
                                    onClick={() => removeRange(day.key, idx)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {ranges.length < 2 && (
                              <button
                                onClick={() => addRange(day.key)}
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
          )}

          {/* Step 4: Appearance */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Apparence</h2>
                <p className="text-sm text-muted-foreground">
                  Personnalisez le look de votre restaurant
                </p>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Logo</Label>
                <div className="relative inline-block">
                  <label className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted transition-colors hover:border-primary">
                    {uploadingLogo ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt="Logo"
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                        <Camera className="h-4 w-4" />
                        <span className="text-[9px]">Ajouter</span>
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
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Couleur principale
                </Label>
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
                    <button
                      onClick={() => setPrimaryColor("")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Font */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Police</Label>
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
                  <button
                    onClick={() => setFontFamily("")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Revenir a la police par defaut
                  </button>
                )}
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Apercu</Label>
                <div
                  className="overflow-hidden rounded-xl border border-border"
                  style={
                    fontFamily
                      ? { fontFamily: `"${fontFamily}", system-ui, sans-serif` }
                      : undefined
                  }
                >
                  {/* Preview fonts link */}
                  {fontFamily && (
                    <link
                      rel="stylesheet"
                      href={`https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@400;600;700&display=swap`}
                      precedence="default"
                    />
                  )}
                  <div className="border-b border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-2">
                      {logoUrl && (
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
                          <Image
                            src={logoUrl}
                            alt="Logo"
                            fill
                            className="object-cover"
                            sizes="28px"
                          />
                        </div>
                      )}
                      <span className="text-sm font-bold">
                        {name || "Mon Restaurant"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">Plat du jour</p>
                        <p className="text-[10px] text-muted-foreground">
                          Delicieux plat maison
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={
                          primaryColor ? { color: primaryColor } : undefined
                        }
                      >
                        12,90 &euro;
                      </span>
                    </div>
                    <button
                      className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: primaryColor || "#d4522a",
                      }}
                    >
                      Ajouter au panier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Modes de paiement</h2>
                <p className="text-sm text-muted-foreground">
                  Comment vos clients pourront-ils payer ?
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold">Especes / sur place</p>
                    <p className="text-xs text-muted-foreground">
                      Paiement au comptoir lors du retrait
                    </p>
                  </div>
                  <Switch
                    checked={cashEnabled}
                    onCheckedChange={setCashEnabled}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold">Carte bancaire</p>
                    <p className="text-xs text-muted-foreground">
                      Paiement en ligne via Stripe
                    </p>
                  </div>
                  <Switch
                    checked={cardEnabled}
                    onCheckedChange={setCardEnabled}
                  />
                </div>
              </div>

              {!cashEnabled && !cardEnabled && (
                <p className="text-xs text-red-500">
                  Selectionnez au moins un mode de paiement
                </p>
              )}

              <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Stripe pourra etre connecte plus tard dans les reglages de votre
                restaurant.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="h-12 flex-1 rounded-xl font-semibold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="h-12 flex-1 rounded-xl font-semibold"
              >
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canAdvance() || submitting}
                className="h-12 flex-1 rounded-xl font-semibold"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Creer mon restaurant"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
