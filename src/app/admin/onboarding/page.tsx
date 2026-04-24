"use client";

import { useState, useRef, useEffect } from "react";
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
  Settings,
  Plus,
  Coins,
  ShieldCheck,
  Copy,
  UserPlus,
  UtensilsCrossed,
  ShoppingBag,
  CreditCard,
  MapPin,
  Users,
  FileCheck,
  Upload,
  FileText,
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
import { AnimatedBackground } from "@/components/animated-background";
import { TIME_OPTIONS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ─── Constants ─── */

const STEPS = [
  { label: "Restaurant", icon: Store },
  { label: "Coordonnées", icon: MapPin },
  { label: "Horaires", icon: Clock },
  { label: "Configuration", icon: Settings },
  { label: "Vérification", icon: FileCheck },
  { label: "Compte", icon: UserPlus },
];

const ACCEPTED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const RESTAURANT_TYPES = [
  { value: "fast_food", emoji: "🍔", label: "Fast-food" },
  { value: "pizzeria", emoji: "🍕", label: "Pizzeria" },
  { value: "tacos_snack", emoji: "🌮", label: "Tacos / Snack" },
  { value: "boulangerie", emoji: "🥖", label: "Boulangerie" },
  { value: "patisserie", emoji: "🍰", label: "Pâtisserie" },
  { value: "asiatique", emoji: "🍣", label: "Asiatique" },
  { value: "healthy", emoji: "🥗", label: "Healthy" },
  { value: "traditionnel", emoji: "🍽️", label: "Traditionnel" },
  { value: "cafe", emoji: "☕", label: "Café / Bar" },
  { value: "autre", emoji: "🏪", label: "Autre" },
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

const DEFAULT_HOURS: HoursState = {
  monday: [{ open: "11:00", close: "22:00" }],
  tuesday: [{ open: "11:00", close: "22:00" }],
  wednesday: [{ open: "11:00", close: "22:00" }],
  thursday: [{ open: "11:00", close: "22:00" }],
  friday: [{ open: "11:00", close: "22:00" }],
  saturday: [{ open: "11:00", close: "23:00" }],
  sunday: [{ open: "12:00", close: "22:00" }],
};

const DRAFT_STORAGE_KEY = "taapr:onboarding-draft";

/* ─── Component ─── */

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Session detection: if user is already logged in, skip the Account step
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const draftRestoredRef = useRef(false);

  // Success
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSlug, setSuccessSlug] = useState("");

  // Step 1 — Restaurant
  const [name, setName] = useState("");
  const [restaurantType, setRestaurantType] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — Coordonnées
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Step 3 — Hours
  const [hours, setHours] = useState<HoursState>(DEFAULT_HOURS);
  const [copyFromDay, setCopyFromDay] = useState<string | null>(null);
  const [copyToDays, setCopyToDays] = useState<string[]>([]);

  // Step 4 — Configuration
  const [dineInEnabled, setDineInEnabled] = useState(true);
  const [takeawayEnabled, setTakeawayEnabled] = useState(true);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [queueEnabled, setQueueEnabled] = useState(false);

  // Step 5 — Verification document
  const [verificationDoc, setVerificationDoc] = useState<File | null>(null);
  const [verificationDocName, setVerificationDocName] = useState("");
  const docInputRef = useRef<HTMLInputElement | null>(null);

  // Step 6 — Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const visibleSteps = isLoggedIn ? STEPS.slice(0, 5) : STEPS;

  /* ─── Session & draft restore ─── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user) {
        // If the user already has a restaurant, onboarding is done — send them to admin
        const { data: existing } = await supabase
          .from("restaurants")
          .select("slug")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (existing?.slug) {
          window.location.href = `/admin/${existing.slug}`;
          return;
        }
        setIsLoggedIn(true);
        setEmail(user.email || "");
      }

      // Restore draft from localStorage (pre-fill existing info)
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as Record<string, unknown>;
          if (typeof draft.name === "string") setName(draft.name);
          if (typeof draft.restaurantType === "string")
            setRestaurantType(draft.restaurantType);
          if (typeof draft.description === "string")
            setDescription(draft.description);
          if (typeof draft.address === "string") setAddress(draft.address);
          if (typeof draft.phone === "string") setPhone(draft.phone);
          if (draft.hours && typeof draft.hours === "object")
            setHours(draft.hours as HoursState);
          if (typeof draft.dineInEnabled === "boolean")
            setDineInEnabled(draft.dineInEnabled);
          if (typeof draft.takeawayEnabled === "boolean")
            setTakeawayEnabled(draft.takeawayEnabled);
          if (typeof draft.cashEnabled === "boolean")
            setCashEnabled(draft.cashEnabled);
          if (typeof draft.cardEnabled === "boolean")
            setCardEnabled(draft.cardEnabled);
          if (typeof draft.queueEnabled === "boolean")
            setQueueEnabled(draft.queueEnabled);
        }
      } catch {
        /* ignore malformed draft */
      }

      draftRestoredRef.current = true;
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist draft as the user progresses (only after initial restore)
  useEffect(() => {
    if (!draftRestoredRef.current) return;
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          name,
          restaurantType,
          description,
          address,
          phone,
          hours,
          dineInEnabled,
          takeawayEnabled,
          cashEnabled,
          cardEnabled,
          queueEnabled,
        })
      );
    } catch {
      /* quota or disabled storage — ignore */
    }
  }, [
    name,
    restaurantType,
    description,
    address,
    phone,
    hours,
    dineInEnabled,
    takeawayEnabled,
    cashEnabled,
    cardEnabled,
    queueEnabled,
  ]);

  /* ─── Navigation ─── */

  const canAdvance = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return (
          (dineInEnabled || takeawayEnabled) &&
          (cashEnabled || cardEnabled)
        );
      case 4:
        return !!verificationDoc;
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
      direction === "forward"
        ? "step-enter-from-right"
        : "step-enter-from-left"
    );
    setStep(next);
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => setAnimClass(""), 310);
  };

  const handleNext = () => {
    if (step < visibleSteps.length - 1) goToStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  /* ─── Submit ─── */

  const handleSubmit = async () => {
    if (!canAdvance()) return;
    setSubmitting(true);

    const opening_hours: Record<string, { open: string; close: string }[]> = {};
    for (const day of DAYS) {
      opening_hours[day.key] = hours[day.key] || [];
    }

    const order_types: string[] = [];
    if (dineInEnabled) order_types.push("dine_in");
    if (takeawayEnabled) order_types.push("takeaway");

    const accepted_payment_methods: string[] = [];
    if (cashEnabled) accepted_payment_methods.push("on_site");
    if (cardEnabled) accepted_payment_methods.push("online");

    try {
      const formData = new FormData();
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        restaurant_type: restaurantType || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        opening_hours,
        order_types,
        accepted_payment_methods,
        queue_enabled: queueEnabled,
      };
      if (!isLoggedIn) {
        payload.email = email.trim();
        payload.password = password;
      }
      formData.append("data", JSON.stringify(payload));
      if (verificationDoc) {
        formData.append("verification_document", verificationDoc);
      }

      const res = await fetch("/api/admin/onboarding", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }

      if (!isLoggedIn) {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          toast.success("Restaurant créé ! Connectez-vous pour continuer.");
          window.location.href = "/admin/login";
          return;
        }
      }

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        /* ignore */
      }

      setSuccessSlug(data.slug);
      setShowSuccess(true);
      setSubmitting(false);

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

  /* ─── Hours helpers ─── */

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

  /* ─── Success Screen ─── */

  if (showSuccess) {
    return (
      <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8">
        <AnimatedBackground />
        <div className="relative z-10 w-full max-w-md step-enter-from-right">
          <div className="space-y-5 rounded-2xl border border-border bg-card/90 p-8 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <FileCheck className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Compte créé avec succès !</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Votre document de vérification a été envoyé. Les équipes{" "}
                <span className="font-semibold text-foreground">TaapR</span>{" "}
                vont examiner votre dossier et valider votre compte.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                En attendant, vous pouvez déjà configurer votre menu et vos
                réglages. Votre page client sera accessible une fois votre
                compte vérifié.
              </p>
            </div>
            <Button
              onClick={() => {
                window.location.href = `/admin/${successSlug}?welcome=true`;
              }}
              className="h-12 w-full rounded-xl font-semibold"
            >
              Configurer mon restaurant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Render ─── */

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-md">
        {isLoggedIn && sessionChecked && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-foreground">
            Reprise de l&apos;onboarding pour{" "}
            <span className="font-semibold">{email}</span>. Vos informations
            précédentes sont pré-remplies.
          </div>
        )}
        {/* Step counter */}
        <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
          Étape {step + 1} sur {visibleSteps.length}
        </p>

        {/* Progress bar */}
        <div className="mb-8 flex items-center justify-center gap-0">
          {visibleSteps.map((s, i) => {
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
                          ? "scale-110 border-primary bg-primary/10 text-primary"
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
                        ? "font-semibold text-primary"
                        : isDone
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < visibleSteps.length - 1 && (
                  <div
                    className={`mx-1 mb-5 h-0.5 w-6 rounded-full transition-colors duration-500 ${
                      i < step ? "bg-primary" : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card/90 p-6 shadow-lg backdrop-blur-sm">
          <div key={step} className={animClass}>
            {/* ─── Step 1: Restaurant ─── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Votre restaurant</h2>
                  <p className="text-sm text-muted-foreground">
                    Commençons par l&apos;essentiel
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
                    placeholder="Les Saveurs du Midi"
                    className="h-12"
                    autoFocus
                  />
                </div>

                {/* Restaurant type grid */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Type d&apos;établissement
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {RESTAURANT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setRestaurantType(
                            restaurantType === type.value ? "" : type.value
                          )
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 transition-all ${
                          restaurantType === type.value
                            ? "scale-105 border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <span className="text-xl">{type.emoji}</span>
                        <span className="text-center text-[9px] font-medium leading-tight">
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
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
                    rows={2}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* ─── Step 2: Coordonnées ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Coordonnées</h2>
                  <p className="text-sm text-muted-foreground">
                    Pour que vos clients vous trouvent
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

                <p className="text-center text-xs text-muted-foreground">
                  Ces informations sont optionnelles et modifiables plus tard
                </p>
              </div>
            )}

            {/* ─── Step 3: Hours ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">
                    Horaires d&apos;ouverture
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Quand vos clients peuvent commander
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

            {/* ─── Step 4: Configuration ─── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold">Configuration</h2>
                  <p className="text-sm text-muted-foreground">
                    Personnalisez le fonctionnement de votre restaurant
                  </p>
                </div>

                {/* Service type */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Type de service
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDineInEnabled(!dineInEnabled)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                        dineInEnabled
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          dineInEnabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <UtensilsCrossed className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">Sur place</p>
                        <p className="text-[10px] text-muted-foreground">
                          Consommation au restaurant
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTakeawayEnabled(!takeawayEnabled)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                        takeawayEnabled
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          takeawayEnabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">À emporter</p>
                        <p className="text-[10px] text-muted-foreground">
                          Retrait au comptoir
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Payment */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Modes de paiement
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCashEnabled(!cashEnabled)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                        cashEnabled
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          cashEnabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Coins className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">Au comptoir</p>
                        <p className="text-[10px] text-muted-foreground">
                          Espèces ou CB au retrait
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCardEnabled(!cardEnabled)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                        cardEnabled
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          cardEnabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">En ligne</p>
                        <p className="text-[10px] text-muted-foreground">
                          CB via Stripe
                        </p>
                      </div>
                    </button>
                  </div>

                  {cardEnabled && (
                    <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Vous configurerez{" "}
                        <span className="font-semibold text-foreground">
                          Stripe
                        </span>{" "}
                        dans les réglages après la création.
                      </p>
                    </div>
                  )}
                </div>

                {/* Queue */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Options
                  </Label>
                  <div
                    onClick={() => setQueueEnabled(!queueEnabled)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                      queueEnabled
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        queueEnabled
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">
                        File d&apos;attente digitale
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Gérez l&apos;affluence aux heures de pointe
                      </p>
                    </div>
                    <Switch
                      checked={queueEnabled}
                      onCheckedChange={setQueueEnabled}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                {(!dineInEnabled && !takeawayEnabled) ||
                (!cashEnabled && !cardEnabled) ? (
                  <p className="text-xs text-orange-500">
                    Sélectionnez au moins un type de service et un mode de
                    paiement
                  </p>
                ) : null}
              </div>
            )}

            {/* ─── Step 5: Verification Document ─── */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold">
                    Vérification de votre établissement
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Pour garantir la sécurité de notre plateforme, nous avons
                    besoin d&apos;un justificatif de propriété
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        Documents acceptés
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        <li>- Extrait KBIS (moins de 3 mois)</li>
                        <li>- Certificat d&apos;inscription au répertoire SIRENE</li>
                        <li>- Tout justificatif officiel attestant que vous êtes le propriétaire de l&apos;établissement</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
                      toast.error(
                        "Format non supporté. Utilisez PDF, JPG, PNG ou WebP."
                      );
                      return;
                    }
                    if (file.size > MAX_DOC_SIZE) {
                      toast.error("Le fichier ne doit pas dépasser 10 Mo.");
                      return;
                    }

                    setVerificationDoc(file);
                    setVerificationDocName(file.name);
                  }}
                />

                {!verificationDoc ? (
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        Cliquez pour importer votre document
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF, JPG, PNG ou WebP (max. 10 Mo)
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {verificationDocName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(verificationDoc.size / 1024 / 1024).toFixed(1)} Mo
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationDoc(null);
                        setVerificationDocName("");
                        if (docInputRef.current) docInputRef.current.value = "";
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    Votre document sera examiné par les équipes{" "}
                    <span className="font-semibold">TaapR</span>. Votre page
                    client sera activée une fois votre compte vérifié.
                  </p>
                </div>
              </div>
            )}

            {/* ─── Step 6: Account ─── */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold">Créez votre compte</h2>
                  <p className="text-sm text-muted-foreground">
                    Dernière étape pour accéder à votre espace de gestion
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
                    <p className="text-xs text-orange-500">
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

            {step < visibleSteps.length - 1 ? (
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
