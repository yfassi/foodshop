import Link from "next/link";
import { TornEdgeTop } from "./torn-edge";
import { StampBadge } from "./stamp-badge";

interface ReceiptFeature {
  text: string;
  included: boolean;
}

interface ReceiptCardProps {
  name: string;
  price: number;
  description: string;
  features: ReceiptFeature[];
  highlighted?: boolean;
  badge?: string;
  annotation?: string;
}

export function ReceiptCard({
  name,
  price,
  description,
  features,
  highlighted = false,
  badge,
  annotation,
}: ReceiptCardProps) {
  return (
    <div className={`relative flex flex-col ${highlighted ? "z-10 scale-[1.03]" : ""}`}>
      <TornEdgeTop fill="var(--landing-ticket)" className="-mb-px" />
      <div className="flex flex-1 flex-col bg-[var(--landing-ticket)] px-5 pb-6 pt-4 text-[var(--landing-ticket-fg)]">
        {/* Header */}
        <div className="text-center font-space text-[10px] font-bold uppercase tracking-[0.25em] opacity-40">
          ================================
        </div>
        <h3 className="mt-2 text-center font-space text-lg font-bold uppercase tracking-wider">
          {name}
        </h3>
        <div className="text-center font-space text-[10px] font-bold uppercase tracking-[0.25em] opacity-40">
          ================================
        </div>

        <p className="mt-3 text-center text-xs opacity-70">{description}</p>

        {/* Features */}
        <div className="mt-4 space-y-1.5">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <span
                className={`shrink-0 ${f.included ? "text-[var(--landing-primary)]" : "opacity-30"}`}
              >
                {f.included ? "✓" : "✗"}
              </span>
              <span className={f.included ? "" : "opacity-40 line-through"}>
                {f.text}
              </span>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="my-4 border-t border-dashed border-black/20" />
        <div className="flex items-baseline justify-between font-space">
          <span className="text-xs font-bold uppercase tracking-wider">Total HT</span>
          <span className="text-2xl font-bold">{price}€<span className="text-xs font-normal">/mois</span></span>
        </div>
        <div className="border-t border-dashed border-black/20 my-4" />

        {/* CTA */}
        <Link
          href="/admin/onboarding"
          className={`mt-auto block rounded-full py-3 text-center text-sm font-bold uppercase tracking-wider transition-all duration-150 hover:scale-[1.02] active:scale-[0.97] ${
            highlighted
              ? "bg-[var(--landing-primary)] text-white shadow-[0_0_20px_oklch(0.58_0.20_28_/_0.3)]"
              : "border-2 border-dashed border-black/30 text-[var(--landing-ticket-fg)] hover:border-black/60"
          }`}
        >
          Commencer
        </Link>

        <p className="mt-3 text-center text-[10px] opacity-50">Sans engagement</p>
      </div>

      {/* Highlighted decorations */}
      {badge && (
        <div className="absolute -right-2 -top-1">
          <StampBadge color="accent" rotation={12}>
            {badge}
          </StampBadge>
        </div>
      )}
      {annotation && (
        <span
          className="absolute -left-4 top-12 font-caveat text-sm text-[var(--landing-primary)]"
          style={{ transform: "rotate(-8deg)" }}
        >
          {annotation}
        </span>
      )}
    </div>
  );
}
