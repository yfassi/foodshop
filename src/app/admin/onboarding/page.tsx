"use client";

import { Suspense, useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  X,
  Plus,
  Coins,
  ShieldCheck,
  Copy,
  UtensilsCrossed,
  ShoppingBag,
  CreditCard,
  Users,
  FileCheck,
  Upload,
  FileText,
  Bike,
  Package,
} from "lucide-react";
import {
  PLANS,
  PLAN_ORDER,
  ADDONS,
  annualNote,
  type AddonId,
  type PlanId,
} from "@/lib/plans";
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
import "./onboarding.css";

/* ─── Constants ─── */

const ALL_STEPS = [
  { label: "Restaurant" },
  { label: "Coordonnées" },
  { label: "Horaires" },
  { label: "Configuration" },
  { label: "Vérification" },
  { label: "Plan" },
  { label: "Compte" },
];
const PLAN_STEP_INDEX = 5;
const ACCOUNT_STEP_INDEX = 6;

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

/* ─── Component ─── */

export default function OnboardingPage() {
  // useSearchParams() inside the page requires a Suspense boundary so Next can
  // statically prerender the shell while the search params resolve client-side.
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect existing session — logged-in users add a restaurant without
  // re-creating an account.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
    });
  }, []);

  // Existing-session users (adding another restaurant) skip the Compte step
  // but still pick a plan for the new resto.
  const STEPS = useMemo(
    () => (hasSession ? ALL_STEPS.slice(0, ACCOUNT_STEP_INDEX) : ALL_STEPS),
    [hasSession]
  );

  // Success
  const [showSuccess, setShowSuccess] = useState(false);
  const [successPublicId, setSuccessPublicId] = useState("");

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

  // Step 6 — Plan
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(() => {
    const planParam = searchParams?.get("plan") as PlanId | null;
    return planParam && PLAN_ORDER.includes(planParam) ? planParam : "pro";
  });
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    () =>
      searchParams?.get("billing") === "annual" ? "annual" : "monthly",
  );
  const [livraisonAddon, setLivraisonAddon] = useState(false);
  const [stockAddon, setStockAddon] = useState(false);

  // Step 7 — Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        // Verification doc only required for first-time signups; existing
        // owners adding another restaurant skip this requirement.
        return hasSession ? true : !!verificationDoc;
      case 5:
        return PLAN_ORDER.includes(selectedPlan);
      case 6:
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
        ? "lv4-ob-step-enter-from-right"
        : "lv4-ob-step-enter-from-left"
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
      const addons: AddonId[] = [];
      if (livraisonAddon) addons.push("livraison");
      if (stockAddon) addons.push("stock");

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
        subscription_tier: selectedPlan,
        billing_period: billingPeriod,
        addons,
      };
      if (!hasSession) {
        payload.email = email.trim();
        payload.password = password;
      }

      const formData = new FormData();
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

      if (!hasSession) {
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

      setSuccessPublicId(data.public_id);
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
          colors: ["#E64A19", "#F2B33D", "#1A1410"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#E64A19", "#F2B33D", "#1A1410"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } catch (err) {
      const fullMessage =
        err instanceof Error ? err.message : "Erreur lors de la création";
      const [title, ...rest] = fullMessage.split(": ");
      const description = rest.join(": ").trim();
      toast.error(title || "Erreur lors de la création", {
        description: description || undefined,
        duration: 30000,
        closeButton: true,
      });
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
      <div className="lv4-ob">
        <div className="lv4-ob-stamp" aria-hidden="true">
          <div className="stamp">
            <div className="stamp-stars">★ ★ ★</div>
            <div className="stamp-num">0%</div>
            <div className="stamp-label">commission</div>
            <div className="stamp-stars">★ ★ ★</div>
          </div>
        </div>

        <div className="lv4-ob-top">
          <Link href="/" className="lv4-ob-logo" aria-label="Taapr · accueil">
            <span>taapr</span>
            <span className="lv4-ob-logo-dot" />
          </Link>
        </div>

        <div className="lv4-ob-success">
          <div className="lv4-ob-success-stamp" aria-hidden="true">
            <FileCheck strokeWidth={2} />
          </div>
          <p className="lv4-ob-success-script">bienvenue ✦</p>
          <h2 className="lv4-ob-success-h">
            Compte créé avec <em>succès.</em>
          </h2>
          <p className="lv4-ob-success-p">
            Votre document de vérification a été envoyé. Les équipes <strong>TaapR</strong> vont
            examiner votre dossier et valider votre compte. En attendant, vous pouvez configurer
            votre menu et vos réglages — votre page client sera activée une fois la vérification
            terminée.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = `/admin/${successPublicId}?welcome=true`;
            }}
            className="lv4-ob-success-cta"
          >
            Configurer mon restaurant <span className="arrow">→</span>
          </button>
        </div>
      </div>
    );
  }

  /* ─── Render ─── */

  return (
    <div className="lv4-ob">
      <div className="lv4-ob-stamp" aria-hidden="true">
        <div className="stamp">
          <div className="stamp-stars">★ ★ ★</div>
          <div className="stamp-num">0%</div>
          <div className="stamp-label">commission</div>
          <div className="stamp-stars">★ ★ ★</div>
        </div>
      </div>

      <div className="lv4-ob-top">
        <Link href="/" className="lv4-ob-logo" aria-label="Taapr · accueil">
          <span>taapr</span>
          <span className="lv4-ob-logo-dot" />
        </Link>
        <Link href="/" className="lv4-ob-back">
          ← RETOUR
        </Link>
      </div>

      <div className="lv4-ob-wrap">
        <div className="lv4-ob-step-counter">★ ÉTAPE {step + 1} / {STEPS.length}</div>

        {/* Stepper */}
        <div className="lv4-ob-stepper" aria-label="Progression de l'inscription">
          {STEPS.map((s, i) => {
            const isActive = i === step;
            const isDone = i < step;
            const stateClass = isDone ? "done" : isActive ? "active" : "";
            return (
              <div key={s.label} className="flex items-center" style={{ display: "flex" }}>
                <div className={`lv4-ob-step-item ${stateClass}`}>
                  <div className={`lv4-ob-step-circle ${stateClass}`}>
                    {isDone ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="lv4-ob-step-label">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`lv4-ob-step-line${i < step ? " done" : ""}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="lv4-ob-card">
          <div key={step} className={animClass}>
            {/* ─── Step 1: Restaurant ─── */}
            {step === 0 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ COMMENÇONS</div>
                  <h2 className="lv4-ob-h">
                    Votre <em>restaurant</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">L&apos;essentiel d&apos;abord.</p>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="name" className="lv4-ob-label">
                      Nom du restaurant
                    </label>
                    <input
                      id="name"
                      className="lv4-ob-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Les Saveurs du Midi"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <span className="lv4-ob-label">
                      Type d&apos;établissement
                    </span>
                    <div className="lv4-ob-type-grid">
                      {RESTAURANT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setRestaurantType(
                              restaurantType === type.value ? "" : type.value
                            )
                          }
                          className={`lv4-ob-type${restaurantType === type.value ? " on" : ""}`}
                        >
                          <span className="lv4-ob-type-emoji">{type.emoji}</span>
                          <span className="lv4-ob-type-label">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="description" className="lv4-ob-label">
                      Description<span className="lv4-ob-label-opt">— optionnel</span>
                    </label>
                    <textarea
                      id="description"
                      className="lv4-ob-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Cuisine marocaine traditionnelle…"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Coordonnées ─── */}
            {step === 1 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ ON VOUS LOCALISE</div>
                  <h2 className="lv4-ob-h">
                    Vos <em>coordonnées</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">
                    Pour que vos clients vous trouvent du premier coup.
                  </p>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="address" className="lv4-ob-label">
                      Adresse
                    </label>
                    <input
                      id="address"
                      className="lv4-ob-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="12 rue de la Paix, 75002 Paris"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="phone" className="lv4-ob-label">
                      Téléphone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className="lv4-ob-input"
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
                      maxLength={14}
                    />
                  </div>
                </div>

                <p className="lv4-ob-hint-foot">★ MODIFIABLE PLUS TARD</p>
              </div>
            )}

            {/* ─── Step 3: Hours ─── */}
            {step === 2 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ QUAND VOUS SERVEZ</div>
                  <h2 className="lv4-ob-h">
                    Vos <em>horaires</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">
                    Quand vos clients peuvent commander.
                  </p>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-hours">
                    {DAYS.map((day) => {
                      const ranges = hours[day.key];
                      const isOpen = !!ranges && ranges.length > 0;

                      return (
                        <div key={day.key} className="lv4-ob-day">
                          <div className="lv4-ob-day-h">
                            <div className="lv4-ob-day-l">
                              <span className={`lv4-ob-day-dot${isOpen ? " open" : ""}`} />
                              <span className="lv4-ob-day-name">{day.label}</span>
                            </div>
                            <div className="lv4-ob-day-r">
                              {isOpen ? (
                                <button
                                  onClick={() => openCopyDialog(day.key)}
                                  className="lv4-ob-icon-btn"
                                  title="Dupliquer ces horaires"
                                  type="button"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="lv4-ob-day-closed">FERMÉ</span>
                              )}
                              <Switch
                                checked={isOpen}
                                onCheckedChange={(v) => toggleDay(day.key, v)}
                              />
                            </div>
                          </div>

                          {isOpen && (
                            <div className="lv4-ob-day-ranges">
                              {ranges.map((range, idx) => (
                                <div key={idx} className="lv4-ob-day-range">
                                  <Select
                                    value={range.open}
                                    onValueChange={(v) =>
                                      updateRange(day.key, idx, "open", v)
                                    }
                                  >
                                    <SelectTrigger
                                      className="lv4-ob-time-trigger"
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

                                  <span className="lv4-ob-time-sep">→</span>

                                  <Select
                                    value={range.close}
                                    onValueChange={(v) =>
                                      updateRange(day.key, idx, "close", v)
                                    }
                                  >
                                    <SelectTrigger
                                      className="lv4-ob-time-trigger"
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
                                      className="lv4-ob-icon-btn danger"
                                      type="button"
                                      title="Supprimer cette plage"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {ranges.length < 2 && (
                                <button
                                  onClick={() => addRange(day.key)}
                                  className="lv4-ob-add-range"
                                  type="button"
                                >
                                  <Plus className="h-3 w-3" />
                                  AJOUTER UNE COUPURE
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
                  <DialogContent className="sm:max-w-sm lv4-ob-dialog">
                    <DialogHeader>
                      <DialogTitle>
                        Dupliquer{" "}
                        <em style={{ fontStyle: "italic", color: "var(--paprika)" }}>
                          {copyFromDay
                            ? DAYS.find((d) => d.key === copyFromDay)?.label.toLowerCase()
                            : ""}
                        </em>
                      </DialogTitle>
                    </DialogHeader>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {DAYS.filter((d) => d.key !== copyFromDay).map((d) => (
                        <label key={d.key} className="lv4-ob-dialog-day-row">
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
                          />
                          <span className="lv4-ob-dialog-day-name">{d.label}</span>
                        </label>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
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
                        className="lv4-ob-dialog-toggle-all"
                        type="button"
                      >
                        {copyToDays.length === DAYS.length - 1
                          ? "TOUT DÉSÉLECTIONNER"
                          : "TOUT SÉLECTIONNER"}
                      </button>
                    </div>
                    <DialogFooter>
                      <button
                        onClick={applyDuplicate}
                        disabled={copyToDays.length === 0}
                        className="lv4-ob-btn-primary"
                        style={{ width: "100%" }}
                        type="button"
                      >
                        <Check className="h-4 w-4" />
                        Appliquer
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* ─── Step 4: Configuration ─── */}
            {step === 3 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ COMMENT VOUS SERVEZ</div>
                  <h2 className="lv4-ob-h">
                    Votre <em>configuration</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">
                    Quelques choix pour adapter Taapr à votre service.
                  </p>
                </div>

                {/* Service type */}
                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <span className="lv4-ob-label">Type de service</span>
                    <div className="lv4-ob-choices">
                      <button
                        type="button"
                        onClick={() => setDineInEnabled(!dineInEnabled)}
                        className={`lv4-ob-choice${dineInEnabled ? " on" : ""}`}
                      >
                        <div className="lv4-ob-choice-icon">
                          <UtensilsCrossed className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="lv4-ob-choice-title">Sur place</div>
                          <div className="lv4-ob-choice-sub">Consommation au resto</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTakeawayEnabled(!takeawayEnabled)}
                        className={`lv4-ob-choice${takeawayEnabled ? " on" : ""}`}
                      >
                        <div className="lv4-ob-choice-icon">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="lv4-ob-choice-title">À emporter</div>
                          <div className="lv4-ob-choice-sub">Retrait au comptoir</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <span className="lv4-ob-label">Modes de paiement</span>
                    <div className="lv4-ob-choices">
                      <button
                        type="button"
                        onClick={() => setCashEnabled(!cashEnabled)}
                        className={`lv4-ob-choice${cashEnabled ? " on" : ""}`}
                      >
                        <div className="lv4-ob-choice-icon">
                          <Coins className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="lv4-ob-choice-title">Au comptoir</div>
                          <div className="lv4-ob-choice-sub">Espèces ou CB au retrait</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCardEnabled(!cardEnabled)}
                        className={`lv4-ob-choice${cardEnabled ? " on" : ""}`}
                      >
                        <div className="lv4-ob-choice-icon">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="lv4-ob-choice-title">En ligne</div>
                          <div className="lv4-ob-choice-sub">CB via Stripe</div>
                        </div>
                      </button>
                    </div>

                    {cardEnabled && (
                      <div className="lv4-ob-callout" style={{ marginTop: 10 }}>
                        <ShieldCheck className="h-4 w-4" />
                        <p>
                          Vous configurerez <strong>Stripe</strong> dans les réglages après
                          la création.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Queue */}
                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <span className="lv4-ob-label">Options</span>
                    <div className="lv4-ob-choices">
                      <button
                        type="button"
                        onClick={() => setQueueEnabled(!queueEnabled)}
                        className={`lv4-ob-choice full${queueEnabled ? " on" : ""}`}
                      >
                        <div className="lv4-ob-choice-icon">
                          <Users className="h-5 w-5" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="lv4-ob-choice-title">File d&apos;attente digitale</div>
                          <div className="lv4-ob-choice-sub">
                            Gérez l&apos;affluence aux heures de pointe
                          </div>
                        </div>
                        <Switch
                          checked={queueEnabled}
                          onCheckedChange={setQueueEnabled}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {((!dineInEnabled && !takeawayEnabled) ||
                  (!cashEnabled && !cardEnabled)) && (
                  <p className="lv4-ob-error">
                    ★ SÉLECTIONNEZ AU MOINS UN TYPE DE SERVICE ET UN MODE DE PAIEMENT
                  </p>
                )}
              </div>
            )}

            {/* ─── Step 5: Verification Document ─── */}
            {step === 4 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ ON VOUS VÉRIFIE</div>
                  <h2 className="lv4-ob-h">
                    Justificatif de <em>propriété</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">
                    Pour garantir la sécurité de la plateforme, on a besoin d&apos;un
                    justificatif officiel.
                  </p>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-info-card">
                    <div className="lv4-ob-info-card-icon">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="lv4-ob-info-card-h">Documents acceptés</h3>
                      <ul className="lv4-ob-info-card-list">
                        <li>Extrait KBIS (moins de 3 mois)</li>
                        <li>Certificat d&apos;inscription au répertoire SIRENE</li>
                        <li>Tout justificatif officiel attestant la propriété</li>
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

                <div className="lv4-ob-section">
                  {!verificationDoc ? (
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="lv4-ob-drop"
                    >
                      <div className="lv4-ob-drop-icon">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="lv4-ob-drop-t">Cliquez pour importer</div>
                        <div className="lv4-ob-drop-s">★ PDF · JPG · PNG · WEBP · 10 MO MAX</div>
                      </div>
                    </button>
                  ) : (
                    <div className="lv4-ob-doc-card">
                      <div className="lv4-ob-doc-icon">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="lv4-ob-doc-name">{verificationDocName}</div>
                        <div className="lv4-ob-doc-meta">
                          ★ {(verificationDoc.size / 1024 / 1024).toFixed(1)} MO
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationDoc(null);
                          setVerificationDocName("");
                          if (docInputRef.current) docInputRef.current.value = "";
                        }}
                        className="lv4-ob-icon-btn danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-callout">
                    <ShieldCheck className="h-4 w-4" />
                    <p>
                      Examen sous 48h. Votre page client sera activée une fois le
                      compte vérifié.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 6: Plan ─── */}
            {step === 5 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ VOTRE FORMULE</div>
                  <h2 className="lv4-ob-h">
                    Choisissez votre <em>plan</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">
                    Annulable à tout moment, 14 jours d&apos;essai sur le plan Pro.
                  </p>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-billing">
                    <button
                      type="button"
                      className={`lv4-ob-billing-opt${billingPeriod === "monthly" ? " on" : ""}`}
                      onClick={() => setBillingPeriod("monthly")}
                    >
                      Mensuel
                    </button>
                    <button
                      type="button"
                      className={`lv4-ob-billing-opt${billingPeriod === "annual" ? " on" : ""}`}
                      onClick={() => setBillingPeriod("annual")}
                    >
                      Annuel · −2 mois
                    </button>
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-plans">
                    {PLAN_ORDER.map((id) => {
                      const plan = PLANS[id];
                      const price =
                        billingPeriod === "annual"
                          ? plan.annualPrice
                          : plan.monthlyPrice;
                      const note =
                        billingPeriod === "annual" ? annualNote(plan) : "";
                      const isSelected = selectedPlan === id;
                      const isGroup = id === "groupe";
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedPlan(id)}
                          className={`lv4-ob-plan${isSelected ? " on" : ""}${
                            plan.featured ? " featured" : ""
                          }${isGroup ? " group" : ""}`}
                        >
                          {plan.featured && (
                            <span className="lv4-ob-plan-stamp">★ POPULAIRE</span>
                          )}
                          <div className="lv4-ob-plan-name">{plan.name}</div>
                          <div className="lv4-ob-plan-tagline">
                            {plan.tagline}
                          </div>
                          <div className="lv4-ob-plan-price">
                            <span className="num">{price}</span>
                            <span className="cur">€</span>
                            <span className="per">/ mois</span>
                          </div>
                          {note && (
                            <div className="lv4-ob-plan-note">{note}</div>
                          )}
                          {isGroup && (
                            <div className="lv4-ob-plan-note">
                              Contactez-nous après création pour configurer votre
                              groupe.
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <span className="lv4-ob-label">Modules complémentaires</span>
                  <p className="lv4-ob-hint">
                    Optionnel — activable ou désactivable à tout moment.
                  </p>
                  <div className="lv4-ob-addons">
                    <label
                      className={`lv4-ob-addon${livraisonAddon ? " on" : ""}`}
                    >
                      <span className="lv4-ob-addon-icon">
                        <Bike className="h-4 w-4" />
                      </span>
                      <span className="lv4-ob-addon-body">
                        <span className="lv4-ob-addon-name">
                          Module {ADDONS.livraison.name}
                        </span>
                        <span className="lv4-ob-addon-desc">
                          {ADDONS.livraison.description}
                        </span>
                      </span>
                      <span className="lv4-ob-addon-price">
                        +{ADDONS.livraison.monthlyPrice}€/mois
                      </span>
                      <input
                        type="checkbox"
                        checked={livraisonAddon}
                        onChange={(e) => setLivraisonAddon(e.target.checked)}
                      />
                    </label>
                    <label className={`lv4-ob-addon${stockAddon ? " on" : ""}`}>
                      <span className="lv4-ob-addon-icon">
                        <Package className="h-4 w-4" />
                      </span>
                      <span className="lv4-ob-addon-body">
                        <span className="lv4-ob-addon-name">
                          Module {ADDONS.stock.name}
                        </span>
                        <span className="lv4-ob-addon-desc">
                          {ADDONS.stock.description}
                        </span>
                      </span>
                      <span className="lv4-ob-addon-price">
                        +{ADDONS.stock.monthlyPrice}€/mois
                      </span>
                      <input
                        type="checkbox"
                        checked={stockAddon}
                        onChange={(e) => setStockAddon(e.target.checked)}
                      />
                    </label>
                  </div>
                </div>

                <p className="lv4-ob-hint-foot">
                  ★ FACTURATION CONFIGURABLE DEPUIS LES RÉGLAGES APRÈS CRÉATION
                </p>
              </div>
            )}

            {/* ─── Step 7: Account ─── */}
            {step === 6 && (
              <div className="lv4-ob-step-anim">
                <div className="lv4-ob-section">
                  <div className="lv4-ob-h-kicker">★ DERNIÈRE ÉTAPE</div>
                  <h2 className="lv4-ob-h">
                    Créez votre <em>compte</em>.<span className="lv4-ob-h-dot" />
                  </h2>
                  <p className="lv4-ob-h-sub">
                    Pour accéder à votre espace de gestion.
                  </p>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="email" className="lv4-ob-label">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="lv4-ob-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@restaurant.fr"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="password" className="lv4-ob-label">
                      Mot de passe
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="lv4-ob-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 caractères minimum"
                    />
                  </div>
                </div>

                <div className="lv4-ob-section">
                  <div className="lv4-ob-field">
                    <label htmlFor="confirm-password" className="lv4-ob-label">
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="lv4-ob-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="lv4-ob-error">
                        ★ LES MOTS DE PASSE NE CORRESPONDENT PAS
                      </p>
                    )}
                  </div>
                </div>

                <p className="lv4-ob-foot">
                  Déjà un compte ? <Link href="/admin/login">Connexion</Link>
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="lv4-ob-nav">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="lv4-ob-btn-ghost"
              >
                ← Retour
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className="lv4-ob-btn-primary"
              >
                Suivant <span className="arrow">→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canAdvance() || submitting}
                className="lv4-ob-btn-primary"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Créer mon restaurant <span className="arrow">→</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
