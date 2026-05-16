"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Store,
  Phone,
  MapPin,
  Mail,
  Clock,
  Plus,
  Trash2,
  Power,
  Copy,
  ExternalLink,
  ShoppingBag,
  UtensilsCrossed,
  Bike,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/admin/ui/page-header";
import { UnsavedChangesBar } from "@/components/admin/ui/unsaved-changes-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAYS_FR, TIME_OPTIONS, normalizeHoursEntry } from "@/lib/constants";
import { buildCustomerOrderUrl } from "@/lib/qr";
import type { Restaurant, OrderType } from "@/lib/types";

type TimeRange = { open: string; close: string };
type DayHours = TimeRange[] | null;
type HoursMap = Record<string, DayHours>;

interface EtablissementDraft {
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  hours: HoursMap;
  orderDineIn: boolean;
  orderTakeaway: boolean;
  orderDelivery: boolean;
  isAcceptingOrders: boolean;
}

const SECTIONS = [
  { id: "statut", label: "Statut" },
  { id: "infos", label: "Informations" },
  { id: "horaires", label: "Horaires d'ouverture" },
  { id: "types", label: "Types de commande" },
  { id: "lien", label: "Lien de commande" },
];

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function loadDraftFromRestaurant(r: Restaurant): EtablissementDraft {
  const h: HoursMap = {};
  for (const day of Object.keys(DAYS_FR)) {
    h[day] = normalizeHoursEntry(r.opening_hours?.[day]);
  }
  const types = r.order_types || ["dine_in", "takeaway"];
  return {
    name: r.name ?? "",
    description: r.description ?? "",
    address: r.address ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    hours: h,
    orderDineIn: types.includes("dine_in"),
    orderTakeaway: types.includes("takeaway"),
    orderDelivery: types.includes("delivery"),
    isAcceptingOrders: r.is_accepting_orders ?? false,
  };
}

function countDiffs(a: EtablissementDraft, b: EtablissementDraft): number {
  let n = 0;
  if (a.name !== b.name) n++;
  if (a.description !== b.description) n++;
  if (a.address !== b.address) n++;
  if (a.phone !== b.phone) n++;
  if (a.email !== b.email) n++;
  if (a.orderDineIn !== b.orderDineIn) n++;
  if (a.orderTakeaway !== b.orderTakeaway) n++;
  if (a.orderDelivery !== b.orderDelivery) n++;
  // Hours: count each day that differs (one diff per day, not per slot).
  for (const day of Object.keys(DAYS_FR)) {
    const aH = JSON.stringify(a.hours[day] ?? null);
    const bH = JSON.stringify(b.hours[day] ?? null);
    if (aH !== bH) n++;
  }
  return n;
}

function totalHoursForDay(ranges: DayHours): number {
  if (!ranges) return 0;
  let mins = 0;
  for (const r of ranges) {
    const [oh, om] = r.open.split(":").map(Number);
    const [ch, cm] = r.close.split(":").map(Number);
    if (Number.isFinite(oh) && Number.isFinite(ch)) {
      const start = oh * 60 + (om || 0);
      const end = ch * 60 + (cm || 0);
      if (end > start) mins += end - start;
    }
  }
  return mins;
}

function formatHoursTotal(mins: number): string {
  if (mins === 0) return "Fermé";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Status bandeau (Ouvert / Fermé)
// ────────────────────────────────────────────────────────────────────────────

function StatusBandeau({
  isOpen,
  onToggle,
  toggling,
}: {
  isOpen: boolean;
  onToggle: () => void;
  toggling: boolean;
}) {
  return (
    <section
      id="statut"
      className={cn(
        "scroll-mt-20 rounded-2xl border p-5",
        isOpen
          ? "border-emerald-500/25 bg-[linear-gradient(135deg,rgba(0,199,88,0.10),rgba(0,199,88,0.04))]"
          : "border-2-tk bg-bg-2"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            isOpen ? "bg-emerald-500/15 text-emerald-700" : "bg-bg-3 text-muted-foreground"
          )}
        >
          <Power className="h-5 w-5" />
          {isOpen && (
            <span className="absolute inset-0 rounded-xl ring-2 ring-emerald-400/40 animate-pulse" />
          )}
        </div>
        <div className="flex-1">
          <h2
            className={cn(
              "text-lg font-semibold",
              isOpen ? "text-emerald-700" : "text-foreground"
            )}
          >
            {isOpen ? "Vous êtes ouvert" : "Vous êtes fermé"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isOpen
              ? "Les clients peuvent passer commande."
              : "Les commandes en ligne sont suspendues."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-muted-foreground">{isOpen ? "Ouvert" : "Fermé"}</span>
          <Switch checked={isOpen} onCheckedChange={onToggle} disabled={toggling} />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Hours editor (single day)
// ────────────────────────────────────────────────────────────────────────────

function HoursRow({
  dayKey,
  ranges,
  onChange,
}: {
  dayKey: string;
  ranges: DayHours;
  onChange: (next: DayHours) => void;
}) {
  const isOpen = !!ranges && ranges.length > 0;
  const total = totalHoursForDay(ranges);

  const toggle = (on: boolean) => {
    onChange(on ? [{ open: "12:00", close: "14:00" }] : null);
  };

  const updateSlot = (idx: number, partial: Partial<TimeRange>) => {
    if (!ranges) return;
    const next = ranges.map((r, i) => (i === idx ? { ...r, ...partial } : r));
    onChange(next);
  };

  const addSlot = () => {
    const next = [...(ranges ?? []), { open: "19:00", close: "22:00" }];
    onChange(next);
  };

  const removeSlot = (idx: number) => {
    if (!ranges) return;
    const next = ranges.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : null);
  };

  return (
    <div className="grid grid-cols-[80px_1fr_70px] items-center gap-3 border-b border-2-tk py-2 last:border-b-0">
      <div className="flex items-center gap-2">
        <Switch checked={isOpen} onCheckedChange={toggle} aria-label={`Ouvrir ${DAYS_FR[dayKey]}`} />
        <span className="text-sm font-medium text-foreground">{DAYS_FR[dayKey]}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!ranges ? (
          <span className="text-sm italic text-muted-foreground">Fermé</span>
        ) : (
          <>
            {ranges.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-1 rounded-full border border-2-tk bg-bg-2 px-2 py-1"
              >
                <Select
                  value={r.open}
                  onValueChange={(v) => updateSlot(i, { open: v })}
                >
                  <SelectTrigger className="h-7 w-[80px] border-0 bg-transparent font-mono text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="font-mono">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">—</span>
                <Select
                  value={r.close}
                  onValueChange={(v) => updateSlot(i, { close: v })}
                >
                  <SelectTrigger className="h-7 w-[80px] border-0 bg-transparent font-mono text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="font-mono">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  aria-label="Supprimer ce créneau"
                  className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-bg-3 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSlot}
              className="flex h-7 items-center gap-1 rounded-full border border-dashed border-2-tk px-2 text-xs text-muted-foreground hover:bg-bg-3 hover:text-foreground"
            >
              <Plus className="h-3 w-3" /> Créneau
            </button>
          </>
        )}
      </div>
      <span className="text-right text-xs tabular text-muted-foreground">
        {formatHoursTotal(total)}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Order type tile
// ────────────────────────────────────────────────────────────────────────────

function OrderTypeTile({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "flex h-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        disabled
          ? "border-2-tk bg-bg-2 opacity-50 cursor-not-allowed"
          : checked
            ? "border-tint bg-tint"
            : "border-2-tk bg-card hover:border-foreground/30"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          checked ? "bg-brand-accent text-[color:var(--brand-accent-fg)]" : "bg-bg-3 text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border",
            checked ? "border-brand-accent bg-brand-accent text-[color:var(--brand-accent-fg)]" : "border-2-tk"
          )}
        >
          {checked && (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Anchor nav (sticky right)
// ────────────────────────────────────────────────────────────────────────────

function AnchorNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) setActive(s.id);
          }
        },
        { rootMargin: "-30% 0px -50% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav className="sticky top-4 hidden w-[200px] shrink-0 self-start lg:block">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sur cette page
      </p>
      <ul className="space-y-1">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "block border-l-2 px-3 py-1 text-xs transition-colors",
                active === s.id
                  ? "border-l-[color:var(--brand-accent)] text-foreground font-medium"
                  : "border-l-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────────

export default function EtablissementPage() {
  const params = useParams<{ publicId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [initial, setInitial] = useState<EtablissementDraft | null>(null);
  const [draft, setDraft] = useState<EtablissementDraft | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("public_id", params.publicId)
        .single<Restaurant>();
      if (data) {
        setRestaurant(data);
        const d = loadDraftFromRestaurant(data);
        setInitial(d);
        setDraft(d);
      }
      setLoading(false);
    };
    load();
  }, [params.publicId]);

  const diffCount = useMemo(() => {
    if (!draft || !initial) return 0;
    return countDiffs(draft, initial);
  }, [draft, initial]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!restaurant || !draft) return;
    if (!draft.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!draft.orderDineIn && !draft.orderTakeaway && !draft.orderDelivery) {
      toast.error("Au moins un type de commande doit être actif");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const openingHours: Record<string, TimeRange[]> = {};
    for (const [day, ranges] of Object.entries(draft.hours)) {
      if (ranges && ranges.length > 0) openingHours[day] = ranges;
    }
    const orderTypes: OrderType[] = [];
    if (draft.orderDineIn) orderTypes.push("dine_in");
    if (draft.orderTakeaway) orderTypes.push("takeaway");
    if (draft.orderDelivery) orderTypes.push("delivery");

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        address: draft.address.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
        opening_hours: openingHours,
        order_types: orderTypes,
      })
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      setInitial(draft);
      toast.success("Établissement enregistré");
    }
    setSaving(false);
  }, [restaurant, draft]);

  // ── Toggle ouvert/fermé ──────────────────────────────────────────────────
  const toggleStatus = useCallback(async () => {
    if (!restaurant || !draft) return;
    setTogglingStatus(true);
    const next = !draft.isAcceptingOrders;
    const supabase = createClient();
    const { error } = await supabase
      .from("restaurants")
      .update({ is_accepting_orders: next })
      .eq("id", restaurant.id);
    if (error) {
      toast.error("Impossible de mettre à jour le statut");
    } else {
      setDraft({ ...draft, isAcceptingOrders: next });
      setInitial(initial ? { ...initial, isAcceptingOrders: next } : null);
      toast.success(next ? "Commandes ouvertes" : "Commandes suspendues");
    }
    setTogglingStatus(false);
  }, [restaurant, draft, initial]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading || !draft || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const customerUrl = buildCustomerOrderUrl(params.publicId);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(customerUrl)}`;

  return (
    <div className="space-y-6 p-4 md:p-7">
      <PageHeader
        icon={<Store className="h-5 w-5" />}
        eyebrow="Réglages"
        title="Établissement"
        subtitle="Identité, horaires, types de commande, lien client."
        right={
          <a
            href={customerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-2-tk bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-bg-3"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Aperçu client
          </a>
        }
      />

      <div className="flex gap-8 pb-24">
        <div className="min-w-0 flex-1 space-y-5">
          <StatusBandeau
            isOpen={draft.isAcceptingOrders}
            onToggle={toggleStatus}
            toggling={togglingStatus}
          />

          {/* Informations */}
          <section id="infos" className="scroll-mt-20 rounded-2xl border border-2-tk bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Store className="h-4 w-4 text-muted-foreground" /> Informations
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="et-name">Nom de l&apos;établissement</Label>
                <Input
                  id="et-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ex. Le Petit Bistrot"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="et-desc">Description courte</Label>
                <textarea
                  id="et-desc"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Quelques mots décrivant votre établissement"
                  rows={2}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label htmlFor="et-address" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Adresse
                </Label>
                <Input
                  id="et-address"
                  value={draft.address}
                  onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  placeholder="12 rue de Paris, 75001 Paris"
                />
              </div>
              <div>
                <Label htmlFor="et-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Téléphone
                </Label>
                <Input
                  id="et-phone"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="et-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  E-mail de contact
                </Label>
                <Input
                  id="et-email"
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="contact@monrestaurant.fr"
                />
              </div>
            </div>
          </section>

          {/* Horaires */}
          <section id="horaires" className="scroll-mt-20 rounded-2xl border border-2-tk bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" /> Horaires d&apos;ouverture
            </h2>
            <div className="rounded-xl border border-2-tk bg-bg-2 px-3">
              {Object.keys(DAYS_FR).map((day) => (
                <HoursRow
                  key={day}
                  dayKey={day}
                  ranges={draft.hours[day]}
                  onChange={(next) =>
                    setDraft({
                      ...draft,
                      hours: { ...draft.hours, [day]: next },
                    })
                  }
                />
              ))}
            </div>
          </section>

          {/* Types de commande */}
          <section id="types" className="scroll-mt-20 rounded-2xl border border-2-tk bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" /> Types de commande
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              <OrderTypeTile
                icon={<UtensilsCrossed className="h-5 w-5" />}
                label="Sur place"
                description="Service à table ou comptoir"
                checked={draft.orderDineIn}
                onChange={(v) => setDraft({ ...draft, orderDineIn: v })}
              />
              <OrderTypeTile
                icon={<ShoppingBag className="h-5 w-5" />}
                label="À emporter"
                description="Le client vient récupérer sa commande"
                checked={draft.orderTakeaway}
                onChange={(v) => setDraft({ ...draft, orderTakeaway: v })}
              />
              <OrderTypeTile
                icon={<Bike className="h-5 w-5" />}
                label="Livraison"
                description="Activez l'addon Livraison pour ce mode"
                checked={draft.orderDelivery}
                onChange={(v) => setDraft({ ...draft, orderDelivery: v })}
                disabled={!restaurant.delivery_addon_active}
              />
            </div>
          </section>

          {/* Lien de commande / QR */}
          <section id="lien" className="scroll-mt-20 rounded-2xl border border-2-tk bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <QrCode className="h-4 w-4 text-muted-foreground" /> Lien de commande
            </h2>
            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-2-tk bg-bg-2 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="QR code" className="h-40 w-40" width={160} height={160} />
                <p className="text-xs text-muted-foreground">QR prêt à imprimer</p>
                <a
                  href={qrSrc}
                  download={`taapr-qr-${params.publicId}.png`}
                  className="text-xs text-brand-accent hover:underline"
                >
                  Télécharger
                </a>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>URL publique</Label>
                  <div className="flex items-center gap-2">
                    <Input value={customerUrl} readOnly className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(customerUrl);
                        toast.success("Lien copié");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={customerUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-2-tk bg-bg-2 px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground">Tables configurées</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    La gestion des tables (plan de salle) reste dans{" "}
                    <Link
                      href={`/admin/${params.publicId}/settings?tab=floor`}
                      className="text-brand-accent hover:underline"
                    >
                      Réglages › Plan de salle
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <AnchorNav />
      </div>

      <UnsavedChangesBar
        count={diffCount}
        onCancel={() => initial && setDraft(initial)}
        onSave={save}
        saving={saving}
      />
    </div>
  );
}
