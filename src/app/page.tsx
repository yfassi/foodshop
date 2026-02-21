"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatedBackground } from "@/components/animated-background";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";
import {
  ShieldCheck,
  ArrowDown,
  ChevronDown,
  Monitor,
  Users,
  QrCode,
  ShoppingBag,
  CreditCard,
  Check,
  X,
  ArrowRight,
  Lock,
  Landmark,
  Smartphone,
  LayoutDashboard,
  SlidersHorizontal,
  Gift,
  UtensilsCrossed,
  Bell,
  Search,
  Plus,
  Sparkles,
  Percent,
} from "lucide-react";

/* ─── Constants ─── */

const STATS = [
  { value: 0, suffix: "%", label: "de commission*" },
  { value: 29, suffix: "€/mois", label: "à partir de" },
  { value: 15, suffix: " min", label: "pour démarrer" },
  { value: 100, suffix: "%", label: "de votre CA conservé" },
];

const PLANS = [
  {
    name: "Essentiel",
    price: 29,
    description: "Pour démarrer sereinement",
    highlighted: false,
    features: [
      { text: "Jusqu'à 300 commandes/mois", included: true },
      { text: "Jusqu'à 50 produits", included: true },
      { text: "QR Code personnalisé", included: true },
      { text: "Paiement sécurisé Stripe", included: true },
      { text: "Tableau de bord basique", included: true },
      { text: "Support email", included: true },
      { text: "Programme de fidélité", included: false },
      { text: "Modificateurs partagés", included: false },
    ],
  },
  {
    name: "Pro",
    price: 49,
    description: "Pour les restaurants ambitieux",
    highlighted: true,
    badge: "Populaire",
    features: [
      { text: "Commandes illimitées", included: true },
      { text: "Produits illimités", included: true },
      { text: "QR Code personnalisé", included: true },
      { text: "Paiement sécurisé Stripe", included: true },
      { text: "Tableau de bord avancé + insights", included: true },
      { text: "Programme de fidélité", included: true },
      { text: "Modificateurs partagés", included: true },
      { text: "Support prioritaire", included: true },
    ],
  },
  {
    name: "Business",
    price: 79,
    description: "Multi-établissements & sur-mesure",
    highlighted: false,
    features: [
      { text: "Tout le plan Pro inclus", included: true },
      { text: "Jusqu'à 3 établissements", included: true },
      { text: "Analyse IA des performances", included: true },
      { text: "Export de données", included: true },
      { text: "Personnalisation avancée", included: true },
      { text: "Support dédié", included: true },
    ],
  },
];

/* ─── Phone Mockup Demo ─── */

function PhoneMockup({ interactive = false }: { interactive?: boolean }) {
  return (
    <div className={interactive ? "" : "animate-float-phone"}>
      {/* Phone frame */}
      <div className="relative mx-auto w-[260px] rounded-[2.5rem] border-[6px] border-foreground/90 bg-card p-1 shadow-2xl sm:w-[300px]">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-foreground/90" />

        {/* Screen content */}
        <div
          className={`relative h-[500px] rounded-[2rem] bg-background sm:h-[580px] ${
            interactive
              ? "overflow-y-auto no-scrollbar"
              : "overflow-hidden no-scrollbar"
          }`}
        >
          {/* Restaurant header */}
          <div className="bg-card px-4 pb-3 pt-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
                🍔
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold">Le Gourmet</h3>
                <div className="flex items-center gap-1 text-[10px] text-green-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Ouvert
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                Rechercher un produit...
              </span>
            </div>
          </div>

          {/* Category chips */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 pb-2">
            {["Burgers", "Tacos", "Boissons", "Desserts"].map((cat, i) => (
              <span
                key={cat}
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium ${
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Featured */}
          <div className="px-3 pt-2">
            <div className="mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                Nos incontournables
              </span>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
              {[
                { emoji: "🍔", name: "Classic Burger", price: "9,90€" },
                { emoji: "🌮", name: "Tacos XL", price: "11,50€" },
                { emoji: "🥤", name: "Milkshake", price: "5,90€" },
              ].map((p) => (
                <div
                  key={p.name}
                  className="w-24 shrink-0 rounded-xl border border-border bg-card p-2"
                >
                  <div className="mb-1 flex h-14 items-center justify-center rounded-lg bg-muted text-2xl">
                    {p.emoji}
                  </div>
                  <p className="truncate text-[10px] font-semibold">{p.name}</p>
                  <p className="text-[10px] font-bold text-primary">
                    {p.price}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Products list */}
          <div className="px-3 pb-16">
            {[
              {
                cat: "🍔",
                catName: "Burgers",
                items: [
                  { emoji: "🍔", name: "Classic Burger", desc: "Steak, salade, tomate, oignon", price: "9,90€" },
                  { emoji: "🧀", name: "Cheese Burger", desc: "Double cheddar, sauce maison", price: "10,90€" },
                  { emoji: "🥓", name: "Bacon Burger", desc: "Bacon croustillant, cheddar", price: "11,90€" },
                ],
              },
              {
                cat: "🌮",
                catName: "Tacos",
                items: [
                  { emoji: "🌮", name: "Tacos Classique", desc: "Viande, frites, fromage, sauce", price: "8,50€" },
                  { emoji: "🌯", name: "Tacos XL", desc: "Double viande, gratins, 3 sauces", price: "11,50€" },
                  { emoji: "🧆", name: "Tacos Végétarien", desc: "Falafels, crudités, houmous", price: "9,90€" },
                ],
              },
              {
                cat: "🥤",
                catName: "Boissons",
                items: [
                  { emoji: "🥤", name: "Coca-Cola", desc: "33cl", price: "2,50€" },
                  { emoji: "🧃", name: "Jus d'orange", desc: "Pressé, 25cl", price: "3,50€" },
                ],
              },
            ].map((section) => (
              <div key={section.catName} className="mb-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="text-sm">{section.cat}</span>
                  <span className="font-heading text-xs font-bold">
                    {section.catName}
                  </span>
                </div>
                <div className="space-y-2">
                  {section.items.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold">
                          {p.name}
                        </p>
                        <p className="truncate text-[9px] text-muted-foreground">
                          {p.desc}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-primary">
                          {p.price}
                        </p>
                      </div>
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                        {p.emoji}
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Plus className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Floating cart - sticky at bottom */}
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent px-3 pb-3 pt-4">
            <div className="flex items-center justify-between rounded-xl bg-primary px-4 py-2.5 text-primary-foreground shadow-lg">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="text-[11px] font-bold">
                  Voir mon panier (2)
                </span>
              </div>
              <span className="text-[11px] font-bold">20,80€</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Hooks ─── */

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function useAnimatedCounter(
  target: number,
  isVisible: boolean,
  duration = 1500
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return count;
}

/* ─── Component ─── */

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [orders, setOrders] = useState(200);
  const [ticket, setTicket] = useState(15);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal refs
  const bentoSection = useScrollReveal();
  const howSection = useScrollReveal();
  const featuresSection = useScrollReveal();
  const pricingSection = useScrollReveal();
  const calcSection = useScrollReveal();
  const trustSection = useScrollReveal();
  const trustVisualSection = useScrollReveal();
  const statsSection = useScrollReveal();

  // Animated counters for stats section
  const stat0 = useAnimatedCounter(STATS[0].value, statsSection.isVisible);
  const stat1 = useAnimatedCounter(STATS[1].value, statsSection.isVisible);
  const stat2 = useAnimatedCounter(STATS[2].value, statsSection.isVisible);
  const stat3 = useAnimatedCounter(STATS[3].value, statsSection.isVisible);
  const statValues = [stat0, stat1, stat2, stat3];

  const handleConfetti = useCallback(() => {
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
  }, []);

  // Savings calculator derived values
  const commissionLoss = Math.round(orders * ticket * 0.3);
  const recommendedPlan =
    orders > 300 ? (orders > 800 ? PLANS[2] : PLANS[1]) : PLANS[0];
  const savings = Math.max(0, commissionLoss - recommendedPlan.price);

  return (
    <div className="min-h-screen">
      {/* ─── Sticky Nav ─── */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-border bg-card/80 shadow-sm backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a
            href="#"
            className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text font-heading text-xl font-extrabold text-transparent"
          >
            Taapr
          </a>

          <div className="hidden items-center gap-6 sm:flex">
            <a
              href="#fonctionnement"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Fonctionnement
            </a>
            <a
              href="#tarifs"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Tarifs
            </a>
            <a
              href="#securite"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sécurité
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Connexion
            </Link>
            <Link
              href="/admin/onboarding"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Essayer gratuitement
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:pt-32 lg:min-h-[100dvh] lg:pb-0">
        <AnimatedBackground />

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: Text */}
            <div
              className={`transition-all duration-700 ease-out ${
                mounted
                  ? "translate-y-0 opacity-100"
                  : "translate-y-6 opacity-0"
              }`}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Paiement sécurisé par Stripe
              </div>

              <h1 className="mb-4 font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.5rem]">
                Vos clients commandent depuis{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  leur smartphone
                </span>
              </h1>

              <p className="mb-8 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Fini les files d&apos;attente et les commissions excessives.
                Taapr est la plateforme de commande en ligne pensée pour les
                restaurants indépendants.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/admin/onboarding"
                  className="group relative overflow-hidden rounded-xl bg-primary px-8 py-4 text-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0"
                >
                  <span className="relative z-10">
                    Créer mon restaurant gratuitement
                  </span>
                  <span className="absolute inset-0 -translate-x-full bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />
                </Link>
                <a
                  href="#fonctionnement"
                  className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-8 py-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-md active:translate-y-0"
                >
                  Découvrir
                  <ArrowDown className="h-4 w-4" />
                </a>
              </div>

              <p className="mt-8 text-xs text-muted-foreground">
                Aucune commission sur vos commandes*. À partir de 29€/mois.
              </p>
            </div>

            {/* Right: Phone mockup (desktop - floating animation) */}
            <div
              className={`hidden justify-center lg:flex transition-all duration-1000 ease-out delay-300 ${
                mounted
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }`}
            >
              <PhoneMockup />
            </div>
          </div>

          {/* Mobile: Interactive phone mockup below hero */}
          <div
            className={`mt-10 flex flex-col items-center lg:hidden transition-all duration-1000 ease-out delay-500 ${
              mounted
                ? "translate-y-0 opacity-100"
                : "translate-y-12 opacity-0"
            }`}
          >
            <p className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ChevronDown className="h-3 w-3" />
              Scrollez pour explorer le menu démo
              <ChevronDown className="h-3 w-3" />
            </p>
            <PhoneMockup interactive />
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce lg:bottom-8">
          <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
        </div>
      </section>

      {/* ─── Bento: Problems + Value Props ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            ref={bentoSection.ref}
            className={
              bentoSection.isVisible ? "animate-reveal-up" : "opacity-0"
            }
          >
            <div className="mb-12 text-center">
              <Badge variant="secondary" className="mb-4">
                Pourquoi Taapr
              </Badge>
              <h2 className="font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
                Les solutions actuelles vous coûtent cher
              </h2>
            </div>

            {/* Bento grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Large card: Commissions */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-8 sm:col-span-2 lg:row-span-2">
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <Percent className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold sm:text-2xl">
                    Commissions abusives
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Uber Eats, Deliveroo... jusqu&apos;à{" "}
                    <span className="font-bold text-destructive">
                      30% de commission
                    </span>{" "}
                    sur chaque commande. Sur un ticket moyen de 15€, c&apos;est
                    4,50€ envolés à chaque fois.
                  </p>
                  <div className="mt-6 inline-flex items-baseline gap-1 rounded-2xl bg-card px-5 py-3 shadow-sm">
                    <span className="font-heading text-3xl font-extrabold text-destructive">
                      -900€
                    </span>
                    <span className="text-sm text-muted-foreground">
                      /mois perdus
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sur 200 commandes/mois à 15€ de panier moyen
                  </p>
                </div>
              </div>

              {/* Bornes */}
              <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100/60 to-transparent p-6 sm:p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Monitor className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-bold">
                  Bornes inaccessibles
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Une borne coûte entre{" "}
                  <span className="font-bold text-foreground">
                    3 000€ et 8 000€
                  </span>
                  , sans la maintenance. Inaccessible pour les TPE/PME.
                </p>
              </div>

              {/* Files d'attente */}
              <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-blue-100/60 to-transparent p-6 sm:p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-bold">
                  Files d&apos;attente
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Vos clients attendent, s&apos;impatientent, parfois
                  repartent. Chaque minute perdue = du CA en moins.
                </p>
              </div>

              {/* Solution banner - full width */}
              <div className="flex items-center gap-4 rounded-3xl bg-primary/5 p-6 sm:col-span-2 sm:p-7 lg:col-span-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold sm:text-lg">
                    La solution ? Le smartphone que vos clients ont déjà.
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pas de borne, pas de tablette, pas d&apos;app à télécharger.
                    Un simple QR code suffit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        id="fonctionnement"
        className="scroll-mt-nav bg-muted/30 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            ref={howSection.ref}
            className={
              howSection.isVisible ? "animate-reveal-up" : "opacity-0"
            }
          >
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">
                Comment ça marche
              </Badge>
              <h2 className="font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
                3 étapes, zéro complication
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Vos clients ont déjà un smartphone dans leur poche. C&apos;est
                tout ce qu&apos;il leur faut.
              </p>
            </div>

            <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
              {[
                {
                  icon: QrCode,
                  step: 1,
                  title: "Scanner",
                  desc: "Le client scanne le QR code sur la table ou au comptoir. Le menu s'affiche instantanément.",
                },
                {
                  icon: ShoppingBag,
                  step: 2,
                  title: "Commander",
                  desc: "Il compose sa commande en toute autonomie. Personnalisation, suppléments, menus... tout est là.",
                },
                {
                  icon: CreditCard,
                  step: 3,
                  title: "Payer",
                  desc: "Paiement sécurisé via Stripe ou au comptoir. L'argent arrive directement sur votre compte.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 hover:scale-110">
                      <item.icon className="h-10 w-10" />
                    </div>
                    <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground shadow-md">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bento Features ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            ref={featuresSection.ref}
            className={
              featuresSection.isVisible ? "animate-reveal-up" : "opacity-0"
            }
          >
            <div className="mb-12 text-center">
              <Badge variant="secondary" className="mb-4">
                Fonctionnalités
              </Badge>
              <h2 className="font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
                Tout ce dont votre restaurant a besoin
              </h2>
            </div>

            {/* Bento grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* QR Code - large card with visual */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 lg:col-span-2 lg:row-span-2">
                <div className="relative z-10 max-w-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-xl font-bold sm:text-2xl">
                    QR Code intelligent
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Imprimez votre QR code unique. Vos clients scannent et
                    accèdent au menu instantanément, sans télécharger
                    d&apos;application. Fonctionne sur tous les smartphones.
                  </p>
                </div>
                {/* Decorative QR visual */}
                <div className="absolute -bottom-4 -right-4 hidden opacity-[0.07] sm:block">
                  <QrCode className="h-52 w-52 lg:h-64 lg:w-64" />
                </div>
              </div>

              {/* Dashboard */}
              <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-violet-100/60 to-transparent p-6 sm:p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-bold">
                  Tableau de bord temps réel
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Suivez vos commandes, gérez votre menu et consultez vos
                  statistiques depuis un seul tableau de bord.
                </p>
              </div>

              {/* Menu personnalisable */}
              <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-100/60 to-transparent p-6 sm:p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-bold">
                  Menu personnalisable
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Catégories, suppléments, options, menus composés... Configurez
                  votre carte exactement comme vous le souhaitez.
                </p>
              </div>

              {/* Fidélité - wide */}
              <div className="group flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-pink-100/60 to-transparent p-6 sm:col-span-2 sm:flex-row sm:items-center sm:p-7">
                <div className="shrink-0">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 sm:mb-0">
                    <Gift className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold">
                    Programme de fidélité intégré
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Fidélisez vos clients avec un portefeuille intégré et des
                    récompenses automatiques. Pas de carte à tamponner, tout est
                    digital.
                  </p>
                </div>
              </div>

              {/* Sur place & emporter */}
              <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-orange-100/60 to-transparent p-6 sm:p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-base font-bold">
                  Sur place & à emporter
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Gérez les commandes sur place et à emporter depuis la même
                  interface.
                </p>
              </div>

              {/* Notifications */}
              <div className="group overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100/60 to-transparent p-6 sm:col-span-2 sm:p-7 lg:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="shrink-0">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 sm:mb-0">
                      <Bell className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold">
                      Notifications en temps réel
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Vos clients sont alertés quand leur commande est prête.
                      Vous recevez les nouvelles commandes instantanément sur
                      votre tableau de bord.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        id="tarifs"
        className="scroll-mt-nav bg-muted/30 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            ref={pricingSection.ref}
            className={
              pricingSection.isVisible ? "animate-reveal-up" : "opacity-0"
            }
          >
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">
                Tarifs
              </Badge>
              <h2 className="font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
                Un prix fixe, zéro commission
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Contrairement aux plateformes qui prélèvent jusqu&apos;à 30%
                sur chaque vente, Taapr propose des abonnements fixes et
                transparents. Choisissez le plan adapté à votre activité.
              </p>
            </div>

            {/* Plan cards */}
            <div className="mt-12 grid items-start gap-6 lg:grid-cols-3 lg:gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${
                    plan.highlighted
                      ? "border-2 border-primary shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow-md">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}

                  <div
                    className={`mb-1 text-sm font-medium ${
                      plan.highlighted
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-heading text-4xl font-extrabold">
                      {plan.price}€
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / mois
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    HT, sans engagement
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {plan.description}
                  </p>

                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li
                        key={f.text}
                        className={`flex items-center gap-2 text-sm ${
                          f.included ? "" : "text-muted-foreground/50"
                        }`}
                      >
                        {f.included ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                        )}
                        {f.text}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/admin/onboarding"
                    className={`mt-6 flex h-12 w-full items-center justify-center rounded-xl font-heading text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    Commencer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Tous les plans incluent 0% de commission* et le paiement sécurisé
              via Stripe.
            </p>
            <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
              * Hors frais de service Stripe (environ 1,5% + 0,25€ par
              transaction carte), facturés directement par Stripe.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Savings Calculator ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div
            ref={calcSection.ref}
            className={
              calcSection.isVisible ? "animate-reveal-up" : "opacity-0"
            }
          >
            <div className="text-center">
              <h2 className="font-heading text-2xl font-bold sm:text-3xl">
                Calculez vos économies
              </h2>
              <p className="mt-3 text-muted-foreground">
                Combien économiseriez-vous en passant de 30% de commission à
                Taapr ?
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-border bg-card p-6">
              {/* Orders slider */}
              <div className="space-y-2">
                <label className="flex items-center justify-between text-sm">
                  <span className="font-medium">Commandes par mois</span>
                  <span className="font-heading text-lg font-bold text-primary">
                    {orders}
                  </span>
                </label>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={10}
                  value={orders}
                  onChange={(e) => setOrders(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50</span>
                  <span>1000</span>
                </div>
              </div>

              {/* Ticket slider */}
              <div className="mt-6 space-y-2">
                <label className="flex items-center justify-between text-sm">
                  <span className="font-medium">Panier moyen</span>
                  <span className="font-heading text-lg font-bold text-primary">
                    {ticket}€
                  </span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={1}
                  value={ticket}
                  onChange={(e) => setTicket(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5€</span>
                  <span>50€</span>
                </div>
              </div>

              {/* Results */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-destructive/5 p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    Avec 30% de commission
                  </p>
                  <p className="mt-1 font-heading text-xl font-bold text-destructive">
                    -{commissionLoss}€
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/5 p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    Taapr {recommendedPlan.name}
                  </p>
                  <p className="mt-1 font-heading text-xl font-bold text-primary">
                    {recommendedPlan.price}€
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-green-50 p-4 text-center">
                <p className="text-xs font-medium text-green-700">
                  Vous économisez
                </p>
                <p className="mt-1 font-heading text-3xl font-extrabold text-green-600">
                  {savings}€ / mois
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security / Trust ─── */}
      <section
        id="securite"
        className="scroll-mt-nav bg-muted/30 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Copy */}
            <div
              ref={trustSection.ref}
              className={
                trustSection.isVisible ? "animate-reveal-left" : "opacity-0"
              }
            >
              <Badge variant="secondary" className="mb-4">
                Sécurité
              </Badge>
              <h2 className="font-heading text-2xl font-bold sm:text-3xl lg:text-4xl">
                Votre argent, directement sur votre compte
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Nous ne touchons jamais votre argent. Les paiements transitent
                via{" "}
                <span className="font-semibold text-foreground">Stripe</span>,
                le leader mondial du paiement en ligne utilisé par Amazon,
                Google et des millions d&apos;entreprises.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Lock,
                    title: "Paiement chiffré",
                    desc: "Chiffrement SSL/TLS de bout en bout. Conforme PCI DSS niveau 1.",
                  },
                  {
                    icon: Landmark,
                    title: "Versement direct",
                    desc: "L'argent est versé directement sur le compte bancaire de votre restaurant. Aucun intermédiaire.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Protection anti-fraude",
                    desc: "Stripe Radar détecte et bloque automatiquement les transactions frauduleuses.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{item.title}</h4>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Payment flow visual */}
            <div
              ref={trustVisualSection.ref}
              className={
                trustVisualSection.isVisible
                  ? "animate-reveal-right"
                  : "opacity-0"
              }
            >
              <div className="mx-auto w-full max-w-sm space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Client paie</p>
                    <p className="text-xs text-muted-foreground">
                      15,90€ via smartphone
                    </p>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-5 w-5 text-primary" />
                </div>

                <div className="flex items-center gap-4 rounded-2xl border-2 border-[#635BFF] bg-[#635BFF]/5 p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#635BFF]/10 font-heading text-lg font-bold text-[#635BFF]">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Stripe sécurise</p>
                    <p className="text-xs text-muted-foreground">
                      Paiement chiffré & vérifié
                    </p>
                  </div>
                  <Check className="ml-auto h-5 w-5 text-green-500" />
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-5 w-5 text-primary" />
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Votre compte bancaire
                    </p>
                    <p className="text-xs text-muted-foreground">
                      +15,90€ reçus directement
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="border-y border-border py-16">
        <div
          ref={statsSection.ref}
          className={`mx-auto grid max-w-4xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6 ${
            statsSection.isVisible ? "animate-reveal-up" : "opacity-0"
          }`}
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-3xl font-extrabold text-primary sm:text-4xl">
                {statValues[i]}
                {stat.suffix}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-4xl text-center text-[11px] text-muted-foreground/60">
          * Taapr ne prélève aucune commission. Seuls les frais de service
          Stripe s&apos;appliquent (environ 1,5% + 0,25€ par transaction
          carte).
        </p>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-accent to-primary py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-extrabold text-primary-foreground sm:text-4xl lg:text-5xl">
            Prêt à simplifier votre restaurant ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
            Rejoignez les restaurants qui ont choisi de garder 100% de leurs
            revenus. Inscription en 5 minutes, sans engagement.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/admin/onboarding"
              onMouseEnter={handleConfetti}
              className="group relative overflow-hidden rounded-xl bg-white px-8 py-4 font-heading text-sm font-bold text-primary shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="relative z-10">
                Créer mon restaurant gratuitement
              </span>
              <span className="absolute inset-0 -translate-x-full bg-primary/5 transition-transform duration-500 group-hover:translate-x-full" />
            </Link>
            <Link
              href="/admin/login"
              className="text-sm font-medium text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <p className="mt-6 text-xs text-primary-foreground/60">
            Pas de carte bancaire requise. Annulez à tout moment.
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-card py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text font-heading text-lg font-extrabold text-transparent">
              Taapr
            </span>
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">
              Mentions légales
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              CGV
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            Paiement sécurisé par Stripe
          </p>
        </div>
      </footer>
    </div>
  );
}
