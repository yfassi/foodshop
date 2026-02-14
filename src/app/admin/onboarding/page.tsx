"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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
  Clock,
  CreditCard,
  Palette,
  Plus,
  Camera,
  Coins,
  ShieldCheck,
  Copy,
  Building2,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import { TIME_OPTIONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEPS = [
  { label: "Restaurant", icon: Store },
  { label: "Informations", icon: Building2 },
  { label: "Horaires", icon: Clock },
  { label: "Apparence", icon: Palette },
  { label: "Paiement", icon: CreditCard },
  { label: "Compte", icon: UserPlus },
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
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Animation
  const [animClass, setAnimClass] = useState("");
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Step 1 — Restaurant
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const [description, setDescription] = useState("");

  // Success screen
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSlug, setSuccessSlug] = useState("");

  // Step 2 — Informations
  const [siret, setSiret] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3 — Hours
  const [hours, setHours] = useState<HoursState>(DEFAULT_HOURS);
  const [copyFromDay, setCopyFromDay] = useState<string | null>(null);
  const [copyToDays, setCopyToDays] = useState<string[]>([]);

  // Step 4 — Appearance
  const [primaryColor, setPrimaryColor] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step 5 — Payment
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(false);

  // Step 6 — Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
      case 5:
        return (
          email.trim().length > 0 &&
          password.length >= 6 &&
          password === confirmPassword
        );
      default:
        return false;
    }
  };

  const goToStep = (next: number) => {
    const direction = next > step ? "forward" : "backward";
    setAnimClass(
      direction === "forward" ? "step-enter-from-right" : "step-enter-from-left"
    );
    setStep(next);
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => setAnimClass(""), 310);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) goToStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
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
      // Create account + restaurant in one call
      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          slug,
          description: description.trim() || undefined,
          siret: siret.replace(/\s/g, "").trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          opening_hours,
          accepted_payment_methods,
          primary_color: primaryColor.trim() || undefined,
          logo_url: logoUrl || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }

      // Sign in to establish session
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Account and restaurant were created, but sign-in failed
        // Redirect to login instead
        toast.success("Restaurant créé ! Connectez-vous pour continuer.");
        window.location.href = "/admin/login";
        return;
      }

      // Show success screen with confetti
      setSuccessSlug(data.slug);
      setShowSuccess(true);
      setSubmitting(false);

      // Fire confetti bursts
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création"
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
      const updated = ranges.map((r, i) => {
        if (i !== index) return r;
        if (field === "open") {
          const adjustedClose =
            value >= r.close
              ? `${String(Math.min(23, Number(value.split(":")[0]) + 1)).padStart(2, "0")}:00`
              : r.close;
          return { open: value, close: adjustedClose };
        }
        if (value <= r.open) return r;
        return { ...r, close: value };
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

  // --- Logo upload ---

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/logo", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error || "Erreur lors de l'upload");
      setUploadingLogo(false);
      return;
    }

    setLogoUrl(`${result.url}?t=${Date.now()}`);
    setUploadingLogo(false);
  };

  const removeLogo = () => {
    setLogoUrl(null);
  };

  if (showSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md step-enter-from-right">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                Félicitations !
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Votre restaurant a été créé avec succès. Votre espace de gestion
                est prêt !
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = `/admin/${successSlug}`;
              }}
              className="h-12 w-full rounded-xl font-semibold"
            >
              Accéder à mon restaurant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Step counter */}
        <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
          Étape {step + 1} sur {STEPS.length}
        </p>

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
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : isActive
                          ? "border-primary bg-primary/10 text-primary scale-110"
                          : "border-muted-foreground/30 text-muted-foreground/50"
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[9px] font-medium transition-colors duration-300 ${
                      isActive
                        ? "text-primary font-semibold"
                        : isDone
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-0.5 mb-5 h-0.5 w-4 rounded-full transition-colors duration-500 ${
                      i < step ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div key={step} className={animClass}>
            {/* Step 1: Restaurant */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Bienvenue !</h2>
                  <p className="text-sm text-muted-foreground">
                    Commencez par nous parler de votre restaurant
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
                    <p className="text-xs text-red-500">
                      Ce nom est déjà pris
                    </p>
                  )}
                  {slug.length >= 2 && slugAvailable !== false && (
                    <p className="text-xs text-muted-foreground">
                      Vos clients commanderont sur ce lien
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Parlez-nous de votre restaurant{" "}
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

            {/* Step 2: Informations */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Informations</h2>
                  <p className="text-sm text-muted-foreground">
                    Ces informations sont utiles pour identifier votre
                    établissement
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="siret" className="text-sm font-medium">
                    Numéro SIRET{" "}
                    <span className="text-muted-foreground">(optionnel)</span>
                  </Label>
                  <Input
                    id="siret"
                    value={siret}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 14);
                      const formatted = digits.replace(
                        /(\d{3})(?=\d)/g,
                        "$1 "
                      );
                      setSiret(formatted);
                    }}
                    placeholder="123 456 789 00012"
                    className="h-12 font-mono"
                    maxLength={17}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    14 chiffres — disponible sur votre extrait Kbis
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
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      const formatted = digits.replace(
                        /(\d{2})(?=\d)/g,
                        "$1 "
                      );
                      setPhone(formatted);
                    }}
                    placeholder="06 12 34 56 78"
                    className="h-12"
                    maxLength={14}
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
                    Définissez quand vos clients peuvent commander
                  </p>
                </div>

                <div className="divide-y divide-border rounded-xl border border-border bg-card">
                  {DAYS.map((day) => {
                    const ranges = hours[day.key];
                    const isOpen = !!ranges && ranges.length > 0;

                    return (
                      <div key={day.key} className="px-3 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-2 w-2 rounded-full transition-colors ${
                                isOpen ? "bg-green-500" : "bg-gray-300"
                              }`}
                            />
                            <span className="text-sm font-medium">
                              {day.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOpen && (
                              <button
                                onClick={() => openCopyDialog(day.key)}
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
                              onCheckedChange={(v) => toggleDay(day.key, v)}
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
                                    updateRange(day.key, idx, "open", v)
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
                                    updateRange(day.key, idx, "close", v)
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

                                {ranges.length > 1 && (
                                  <button
                                    onClick={() => removeRange(day.key, idx)}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {ranges.length < 2 && (
                              <button
                                onClick={() => addRange(day.key)}
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
                        {copyFromDay
                          ? DAYS.find(
                              (d) => d.key === copyFromDay
                            )?.label.toLowerCase()
                          : ""}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {DAYS.filter((d) => d.key !== copyFromDay).map((d) => (
                        <label
                          key={d.key}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={copyToDays.includes(d.key)}
                            onChange={(e) => {
                              setCopyToDays((prev) =>
                                e.target.checked
                                  ? [...prev, d.key]
                                  : prev.filter((x) => x !== d.key)
                              );
                            }}
                            className="h-4 w-4 rounded border-border text-primary accent-primary"
                          />
                          <span className="text-sm font-medium">
                            {d.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          const allOtherDays = DAYS.filter(
                            (d) => d.key !== copyFromDay
                          ).map((d) => d.key);
                          setCopyToDays((prev) =>
                            prev.length === allOtherDays.length
                              ? []
                              : allOtherDays
                          );
                        }}
                        className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {copyToDays.length === DAYS.length - 1
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
              </div>
            )}

            {/* Step 4: Appearance */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Apparence</h2>
                  <p className="text-sm text-muted-foreground">
                    Donnez une identité visuelle à votre restaurant
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

                {/* Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Aperçu</Label>
                  <div className="overflow-hidden rounded-xl border border-border">
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
                            Délicieux plat maison
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

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCashEnabled(!cashEnabled)}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all ${
                      cashEnabled
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${
                        cashEnabled
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Coins className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Au comptoir</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        Espèces ou CB au retrait
                      </p>
                    </div>
                    {cashEnabled && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCardEnabled(!cardEnabled)}
                    className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all ${
                      cardEnabled
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${
                        cardEnabled
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <CreditCard className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        Sur l&apos;application
                      </p>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        Paiement en ligne sécurisé
                      </p>
                    </div>
                    {cardEnabled && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                </div>

                {!cashEnabled && !cardEnabled && (
                  <p className="text-xs text-red-500">
                    Sélectionnez au moins un mode de paiement
                  </p>
                )}

                {cardEnabled && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Le paiement par carte nécessite la configuration de votre
                      compte avec notre partenaire de paiement sécurisé{" "}
                      <span className="font-semibold text-foreground">
                        Stripe
                      </span>
                      . Vous pourrez le configurer dans les réglages.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Account */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Créez votre compte</h2>
                  <p className="text-sm text-muted-foreground">
                    Dernière étape ! Créez votre compte pour accéder à votre
                    espace de gestion
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@restaurant.fr"
                    className="h-12"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Mot de passe
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 caractères minimum"
                    className="h-12"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-password"
                    className="text-sm font-medium"
                  >
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link
                    href="/admin/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Connexion
                  </Link>
                </p>
              </div>
            )}
          </div>

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
                  "Créer mon restaurant"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
