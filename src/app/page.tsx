"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { TornEdgeBottom } from "@/components/landing/torn-edge";
import { TicketStrip } from "@/components/landing/ticket-strip";
import { ReceiptCard } from "@/components/landing/receipt-card";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { QueueVsPhone } from "@/components/landing/queue-vs-phone";

/* ─── Constants ─── */

const PLANS = [
  {
    name: "Essentiel",
    price: 29,
    description: "Pour démarrer sereinement",
    highlighted: false,
    features: [
      { text: "300 commandes/mois", included: true },
      { text: "50 produits", included: true },
      { text: "QR Code personnalisé", included: true },
      { text: "Paiement Stripe", included: true },
      { text: "Dashboard basique", included: true },
      { text: "Support email", included: true },
      { text: "Programme fidélité", included: false },
      { text: "Modificateurs partagés", included: false },
    ],
  },
  {
    name: "Pro",
    price: 49,
    description: "Pour les restaurants ambitieux",
    highlighted: true,
    badge: "POPULAIRE",
    annotation: "le choix du chef !",
    features: [
      { text: "Commandes illimitées", included: true },
      { text: "Produits illimités", included: true },
      { text: "QR Code personnalisé", included: true },
      { text: "Paiement Stripe", included: true },
      { text: "Dashboard avancé", included: true },
      { text: "Programme fidélité", included: true },
      { text: "Modificateurs partagés", included: true },
      { text: "Support prioritaire", included: true },
    ],
  },
  {
    name: "Business",
    price: 79,
    description: "Multi-établissements",
    highlighted: false,
    features: [
      { text: "Tout le plan Pro", included: true },
      { text: "Jusqu'à 3 établissements", included: true },
      { text: "Analyse IA", included: true },
      { text: "Export de données", included: true },
      { text: "Personnalisation avancée", included: true },
      { text: "Support dédié", included: true },
    ],
  },
];

const TESTIMONIALS = [
  {
    quote:
      "On a divisé notre temps de service par deux. Les clients adorent.",
    name: "Karim",
    restaurant: "Le Petit Gourmand",
    rotate: -2,
  },
  {
    quote:
      "Enfin une solution sans commission. Ça change tout pour notre marge.",
    name: "Sophie",
    restaurant: "Bistrot des Halles",
    rotate: 1.5,
  },
  {
    quote:
      "Mis en place en 10 minutes. Le QR code était sur les tables le soir même.",
    name: "Marco",
    restaurant: "Pizza Express",
    rotate: -1,
  },
  {
    quote:
      "Le programme de fidélité a boosté nos retours clients de 40%.",
    name: "Léa",
    restaurant: "Green Bowl",
    rotate: 2,
  },
];

const FEATURES_MENU = [
  {
    category: "LES ENTRÉES",
    subtitle: "Pour démarrer",
    icon: "🥗",
    items: [
      { name: "Menu en ligne instantané", annotation: null },
      { name: "QR Code personnalisé", annotation: "le best-seller !" },
      { name: "Zéro app à télécharger", annotation: null },
    ],
  },
  {
    category: "LES PLATS",
    subtitle: "Le cœur du service",
    icon: "🍽️",
    items: [
      { name: "Paiement sécurisé Stripe", annotation: null },
      { name: "Tableau de bord temps réel", annotation: null },
      { name: "Programme de fidélité", annotation: "nouveau !" },
      { name: "Notifications push", annotation: null },
    ],
  },
  {
    category: "LES DESSERTS",
    subtitle: "Les bonus",
    icon: "🍰",
    items: [
      { name: "0% de commission", annotation: null },
      { name: "Personnalisation complète", annotation: null },
      { name: "Support prioritaire", annotation: null },
    ],
  },
];

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

/* ─── Component ─── */

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [orderCount, setOrderCount] = useState(243);

  // Scroll listener for sticky nav
  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Live order counter
  useEffect(() => {
    const tick = () => {
      setOrderCount((c) => c + 1);
      const delay = 3000 + Math.random() * 2000;
      timer = window.setTimeout(tick, delay);
    };
    let timer = window.setTimeout(tick, 3000 + Math.random() * 2000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll reveal refs
  const phoneSection = useScrollReveal(0.1);
  const featuresSection = useScrollReveal(0.1);
  const pricingSection = useScrollReveal(0.1);
  const testimonialsSection = useScrollReveal(0.1);
  const ctaSection = useScrollReveal(0.2);

  // SERVICE! letter animation
  const [serviceAnimated, setServiceAnimated] = useState(false);
  const serviceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = serviceRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setServiceAnimated(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const serviceLetters = "SERVICE !".split("");

  return (
    <div className="landing min-h-screen">
      {/* ─── Section 0: Navigation ─── */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[var(--landing-muted)]/90 backdrop-blur-md border-b border-landing"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="font-ferron text-2xl text-landing-primary tracking-wider">
            taapr
          </span>

          {/* Center counter — hidden on mobile */}
          <div className="hidden md:block font-space-mono text-xs text-landing-muted tabular-nums tracking-wide">
            <span className="text-landing-primary font-bold">{orderCount}</span>{" "}
            commandes passées aujourd&apos;hui
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="hidden sm:block text-landing-muted hover:text-landing-fg uppercase text-sm tracking-wider transition-colors"
            >
              CONNEXION
            </Link>
            <Link
              href="/admin/onboarding"
              className="bg-landing-primary text-white rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider glow-primary hover:scale-[1.02] active:scale-[0.97] transition-transform"
            >
              COMMENCER
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Section 1: Hero "Le Ticket" ─── */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-16 pb-12 overflow-hidden">
        {/* Noise overlay */}
        <div className="absolute inset-0 noise-overlay pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Ticket */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div
              className={`${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-16"
              }`}
              style={{
                transition: "all 800ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <div className="bg-landing-ticket text-landing-ticket">
                <div className="px-6 py-8 sm:px-8 sm:py-10">
                  <p className="text-center font-ferron text-base tracking-[0.3em] opacity-40 text-landing-ticket">
                    taapr
                  </p>

                  <div className="my-3 border-t border-dashed border-black/15" />

                  <h1 className="font-space text-3xl sm:text-4xl font-bold uppercase leading-[0.95] tracking-tight text-landing-ticket">
                    VOS CLIENTS COMMANDENT DÉJÀ DEPUIS LEUR TÉLÉPHONE
                  </h1>

                  <div className="my-3 border-t border-dashed border-black/15" />

                  <p className="text-sm text-landing-ticket opacity-70" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                    Menu en ligne. QR code. Paiement sécurisé. Zéro commission. À
                    partir de 29€/mois.
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/admin/onboarding"
                      className="bg-[var(--landing-primary)] text-white rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.97] transition-transform shadow-[0_0_20px_oklch(0.58_0.20_28_/_0.3)] text-center"
                    >
                      CRÉER MON RESTAURANT
                    </Link>
                    <a
                      href="#pass"
                      className="border-2 border-dashed border-black/30 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider hover:border-black/60 transition-colors text-landing-ticket text-center"
                    >
                      VOIR LA DÉMO
                    </a>
                  </div>

                  <p
                    className="mt-5 font-caveat text-base text-[var(--landing-primary)]"
                    style={{ transform: "rotate(-3deg)" }}
                  >
                    C&apos;est parti chef ! {">>>>"}
                  </p>
                </div>
              </div>

              <TornEdgeBottom className="-mt-px" />
            </div>
          </div>

          {/* Right: Phone mockup */}
          <div
            ref={phoneSection.ref}
            className={`hidden lg:flex justify-center ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
            style={{
              transition: "all 1000ms cubic-bezier(0.34, 1.56, 0.64, 1) 400ms",
            }}
          >
            <div className="animate-float-phone">
              <PhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 2: "Le Pass" — Order Ticket Strip ─── */}
      <section id="pass" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-6">
          <p
            className="font-caveat text-xl text-landing-muted"
            style={{ transform: "rotate(-2deg)" }}
          >
            en ce moment en cuisine...
          </p>
        </div>
        <TicketStrip />
      </section>

      {/* ─── Section: Queue vs Phone comparison ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-10 text-center">
          <h2 className="font-space text-2xl sm:text-3xl font-bold uppercase tracking-wider text-landing-fg">
            FINI LA FILE D&apos;ATTENTE
          </h2>
          <p className="mt-3 text-sm text-landing-muted" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            Que vous soyez food truck, snack ou petit restaurant
          </p>
        </div>
        <QueueVsPhone />
      </section>

      {/* ─── Mobile phone preview ─── */}
      <section className="py-12 lg:hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center font-space text-lg font-bold uppercase tracking-wider text-landing-fg mb-2">
            L&apos;expérience client
          </p>
          <p className="text-center text-sm text-landing-muted mb-8" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            Vos clients scannent, commandent, paient.
          </p>
          <div className="flex justify-center">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* ─── Section 3: "La Carte" — Features Menu ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-space text-2xl sm:text-3xl font-bold uppercase text-center tracking-wider text-landing-fg">
            LA CARTE DES SERVICES
          </h2>
          <p className="mt-3 text-center text-sm text-landing-muted" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            Tout ce qu&apos;il faut pour digitaliser votre restaurant
          </p>

          <div
            ref={featuresSection.ref}
            className="mt-12 grid gap-8 md:grid-cols-3 max-w-4xl mx-auto"
          >
            {FEATURES_MENU.map((section, sIdx) => (
              <div
                key={section.category}
                className={`bg-landing-ticket p-5 sm:p-6 ${
                  featuresSection.isVisible
                    ? "animate-print-in"
                    : "opacity-0"
                }`}
                style={{
                  animationDelay: featuresSection.isVisible
                    ? `${sIdx * 150}ms`
                    : undefined,
                  animationFillMode: "both",
                }}
              >
                <div className="text-2xl mb-2">{section.icon}</div>
                <h3 className="font-space text-sm font-bold uppercase tracking-widest text-landing-primary">
                  {section.category}
                </h3>
                <p className="text-xs text-landing-muted mt-0.5 mb-3" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  {section.subtitle}
                </p>
                <div className="border-t border-dashed border-black/10 mb-3" />

                <ul className="space-y-2.5">
                  {section.items.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-start gap-2"
                    >
                      <span className="shrink-0 mt-0.5 text-[var(--landing-primary)] text-sm font-bold">✓</span>
                      <span className="text-sm leading-snug text-[var(--landing-ticket-fg)]" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                        {item.name}
                        {item.annotation && (
                          <span
                            className="ml-1.5 font-caveat text-sm text-[var(--landing-primary)]"
                          >
                            {item.annotation}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 4: "L'Addition" — Pricing ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div ref={pricingSection.ref}>
            <h2 className="font-space text-2xl sm:text-3xl font-bold uppercase text-center tracking-wider text-landing-fg">
              L&apos;ADDITION
            </h2>
            <p className="mt-3 text-center text-sm text-landing-muted" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
              Un prix fixe. Pas de pourcentage sur vos ventes.
            </p>

            <div
              className={`mt-12 grid gap-6 lg:grid-cols-3 items-start ${
                pricingSection.isVisible ? "" : "opacity-0"
              }`}
            >
              {PLANS.map((plan, i) => (
                <div
                  key={plan.name}
                  className={pricingSection.isVisible ? "animate-print-in" : "opacity-0"}
                  style={{
                    animationDelay: pricingSection.isVisible ? `${i * 120}ms` : undefined,
                    animationFillMode: "both",
                  }}
                >
                  <ReceiptCard
                    name={plan.name}
                    price={plan.price}
                    description={plan.description}
                    features={plan.features}
                    highlighted={plan.highlighted}
                    badge={plan.badge}
                    annotation={plan.annotation}
                  />
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-landing-muted" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
              Tous les plans incluent 0% de commission*.
              <br />
              <span className="opacity-60">
                * Hors frais Stripe (~1,5% + 0,25€ par transaction).
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 5: "Le Comptoir" — Testimonials ─── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-space text-2xl sm:text-3xl font-bold uppercase text-center tracking-wider text-landing-fg">
            LE COMPTOIR
          </h2>
          <p className="mt-3 text-center text-sm text-landing-muted" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
            Ce qu&apos;en disent nos restaurateurs
          </p>

          <div
            ref={testimonialsSection.ref}
            className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6"
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.name}
                className={`bg-landing-ticket text-landing-ticket p-5 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg ${
                  testimonialsSection.isVisible ? "animate-print-in" : "opacity-0"
                }`}
                style={{
                  transform: `rotate(${t.rotate}deg)`,
                  animationDelay: testimonialsSection.isVisible ? `${i * 100}ms` : undefined,
                  animationFillMode: "both",
                }}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--landing-primary)]" />
                <p className="mt-3 text-sm italic leading-relaxed" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <p className="mt-3 font-space text-xs font-bold">{t.name}</p>
                <p className="text-[10px] opacity-50" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
                  {t.restaurant}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 6: "Service !" — Final CTA ─── */}
      <section className="bg-landing-primary py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div ref={serviceRef} className="mb-8">
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
              {serviceLetters.map((letter, i) => (
                <span
                  key={i}
                  className={`font-space text-6xl sm:text-8xl font-bold uppercase text-white inline-block ${
                    serviceAnimated ? "animate-stamp" : "opacity-0"
                  }`}
                  style={{
                    animationDelay: serviceAnimated ? `${i * 60}ms` : undefined,
                    animationFillMode: "both",
                  }}
                >
                  {letter === " " ? "\u00A0" : letter}
                </span>
              ))}
            </div>
          </div>

          <p
            className={`text-lg text-white/70 transition-all duration-700 ${
              serviceAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{
              transitionDelay: "600ms",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
            }}
          >
            Votre restaurant en ligne est prêt.
          </p>

          <div
            className={`mt-8 flex flex-col items-center gap-4 transition-all duration-700 ${
              serviceAnimated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "800ms" }}
          >
            <Link
              href="/admin/onboarding"
              className="bg-[var(--landing-accent)] text-white rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.97] transition-transform shadow-[0_0_24px_oklch(0.28_0.06_260_/_0.4)]"
            >
              COMMENCER MAINTENANT
            </Link>
            <Link
              href="/admin/login"
              className="text-sm text-white/60 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <p
            className={`mt-6 font-space-mono text-xs text-white/50 transition-all duration-700 ${
              serviceAnimated ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: "1000ms" }}
          >
            Pas de CB requise. Sans engagement. 5 minutes.
          </p>
        </div>
      </section>

      {/* ─── Section 7: Footer ─── */}
      <footer className="py-10 border-t border-landing">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center font-space-mono space-y-3">
          <p className="text-xs text-landing-muted tracking-widest">
            ═══════ MERCI DE VOTRE VISITE ═══════
          </p>
          <p className="font-ferron text-base text-landing-fg">taapr <span className="font-sans text-sm">© 2026</span></p>
          <p className="text-xs text-landing-muted space-x-3">
            <a href="#" className="hover:text-landing-fg transition-colors">
              Mentions légales
            </a>
            <span>|</span>
            <a href="#" className="hover:text-landing-fg transition-colors">
              CGV
            </a>
            <span>|</span>
            <a href="#" className="hover:text-landing-fg transition-colors">
              Contact
            </a>
          </p>
          <p className="text-xs text-landing-muted">
            Paiement sécurisé par Stripe
          </p>
          <p className="text-xs text-landing-muted tracking-widest">
            ─── CONSERVEZ VOTRE TICKET ───
          </p>
        </div>
      </footer>
    </div>
  );
}
