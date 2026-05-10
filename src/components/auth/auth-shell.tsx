"use client";

import { ReactNode } from "react";
import Link from "next/link";
import {
  Beef,
  Sandwich,
  Pizza,
  CupSoda,
  Salad,
  Cookie,
  Coffee,
  Croissant,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import "@/app/landing-v4.css";
import "./auth-shell.css";

const FLOATING_ITEMS: { icon: LucideIcon; x: number; y: number; duration: number; delay: number }[] = [
  { icon: Beef,      x:  6, y: 14, duration: 18, delay: 0 },
  { icon: Sandwich,  x: 88, y:  8, duration: 22, delay: 2 },
  { icon: Pizza,     x: 78, y: 78, duration: 20, delay: 4 },
  { icon: Croissant, x: 10, y: 82, duration: 16, delay: 1 },
  { icon: Cookie,    x: 92, y: 48, duration: 19, delay: 3 },
  { icon: CupSoda,   x:  4, y: 50, duration: 21, delay: 5 },
  { icon: Coffee,    x: 50, y:  4, duration: 17, delay: 2.5 },
  { icon: Salad,     x: 38, y: 90, duration: 23, delay: 1.5 },
];

export type AuthShellProps = {
  /** Mono kicker label rendered above the title (e.g. "★ ESPACE RESTAURATEUR"). */
  kicker?: string;
  /** Title — pass a string with `<em>` markup as ReactNode to highlight in paprika. */
  title: ReactNode;
  /** Optional subtitle below the title. */
  subtitle?: string;
  /** Optional back link (renders an arrow + label). */
  backHref?: string;
  backLabel?: string;
  /** Optional CTA below the card content. */
  footer?: ReactNode;
  /** Show the rotating "0% commission" stamp in the corner. Default true on desktop. */
  showStamp?: boolean;
  /** Brand link — defaults to "/". Set to null to hide. */
  brandHref?: string | null;
  children: ReactNode;
};

export function AuthShell({
  kicker,
  title,
  subtitle,
  backHref,
  backLabel = "Retour",
  footer,
  showStamp = true,
  brandHref = "/",
  children,
}: AuthShellProps) {
  return (
    <div className="lv4 auth-shell">
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        {FLOATING_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <span
              key={i}
              className="auth-food"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                animationDuration: `${item.duration}s`,
                animationDelay: `${item.delay}s`,
              }}
            >
              <Icon strokeWidth={1.5} />
            </span>
          );
        })}
      </div>

      {showStamp && (
        <div className="auth-stamp" aria-hidden="true">
          <div>
            ★ ★ ★
            <strong>0%</strong>
            commission
          </div>
        </div>
      )}

      <div className="auth-container">
        {brandHref && (
          <Link href={brandHref} className="auth-brand" aria-label="Taapr · accueil">
            <span className="logo">
              <span className="logo-word">taapr</span>
              <span className="logo-dot" />
            </span>
          </Link>
        )}
        <div className="auth-card">
          {backHref && (
            <Link href={backHref} className="auth-back">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}
          <div className="auth-head">
            {kicker && <div className="auth-kicker">{kicker}</div>}
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-sub">{subtitle}</p>}
          </div>
          <div className="auth-body">{children}</div>
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
