"use client";

import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════
   SVG: Borne tactile + file d'attente
   ═══════════════════════════════════════════ */

function QueueScene({ animate }: { animate: boolean }) {
  return (
    <svg viewBox="0 0 520 240" fill="none" className="w-full h-auto max-w-lg mx-auto">
      {/* ── Borne de commande tactile ── */}
      <g>
        {/* Pied / support */}
        <rect x="60" y="180" width="40" height="8" rx="2" fill="#b0a898" />
        <rect x="73" y="130" width="14" height="52" fill="#c4b8ab" />
        {/* Écran principal */}
        <rect x="48" y="50" width="64" height="82" rx="5" fill="#3a3530" />
        <rect x="52" y="54" width="56" height="68" rx="3" fill="#f5f0eb" />
        {/* Contenu écran — lignes de menu */}
        <rect x="57" y="60" width="46" height="5" rx="1.5" fill="#d4c8ba" />
        <rect x="57" y="69" width="32" height="4" rx="1.5" fill="#e8e0d8" />
        <rect x="57" y="77" width="38" height="4" rx="1.5" fill="#e8e0d8" />
        <rect x="57" y="85" width="28" height="4" rx="1.5" fill="#e8e0d8" />
        <rect x="57" y="95" width="46" height="4" rx="1.5" fill="#e8e0d8" />
        {/* Bouton commander */}
        <rect x="62" y="106" width="36" height="10" rx="5" fill="#c4564a" opacity="0.6" />
        <text x="80" y="114" textAnchor="middle" fill="white" fontSize="5" fontWeight="600" fontFamily="system-ui">COMMANDER</text>
        {/* Lecteur CB en bas */}
        <rect x="66" y="126" width="28" height="6" rx="2" fill="#5a5248" />
        {/* Label */}
        <text x="80" y="46" textAnchor="middle" fill="#8a7e72" fontSize="7" fontWeight="600" fontFamily="system-ui">BORNE</text>
      </g>

      {/* ── File d'attente de 6 personnes ── */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const x = 155 + i * 56;
        const bodyColors = ["#8b9dc3", "#c9a87c", "#7fb5b0", "#d4a0a0", "#a3b18a", "#c7b299"];
        const hairColors = ["#4a3728", "#2c1810", "#6b4423", "#1a1a2e", "#3d2b1f", "#5c3d2e"];
        return (
          <g
            key={i}
            style={{
              opacity: animate ? 1 : 0,
              transform: animate ? "translateX(0)" : "translateX(-16px)",
              transition: `all 400ms ease-out ${300 + i * 180}ms`,
            }}
          >
            {/* Tête */}
            <circle cx={x} cy="108" r="13" fill="#f0d9c4" />
            {/* Cheveux */}
            <ellipse cx={x} cy="100" rx="12" ry="8" fill={hairColors[i]} />
            {/* Corps */}
            <rect x={x - 11} y="121" width="22" height="32" rx="7" fill={bodyColors[i]} />
            {/* Bras */}
            {i === 0 ? (
              // Bras croisés — impatient
              <rect x={x - 15} y="130" width="30" height="6" rx="3" fill={bodyColors[i]} opacity="0.8" />
            ) : i % 2 === 0 ? (
              // Regarde sa montre
              <>
                <rect x={x - 17} y="125" width="7" height="18" rx="3.5" fill={bodyColors[i]} opacity="0.8" transform={`rotate(-15 ${x - 13} 134)`} />
                <rect x={x + 10} y="128" width="7" height="16" rx="3.5" fill={bodyColors[i]} opacity="0.8" />
              </>
            ) : (
              // Bras le long du corps
              <>
                <rect x={x - 17} y="126" width="7" height="20" rx="3.5" fill={bodyColors[i]} opacity="0.8" />
                <rect x={x + 10} y="126" width="7" height="20" rx="3.5" fill={bodyColors[i]} opacity="0.8" />
              </>
            )}
            {/* Jambes */}
            <rect x={x - 7} y="153" width="6" height="24" rx="3" fill="#6b6560" />
            <rect x={x + 1} y="153" width="6" height="24" rx="3" fill="#6b6560" />
            {/* Chaussures */}
            <ellipse cx={x - 4} cy="178" rx="5" ry="3" fill="#4a4540" />
            <ellipse cx={x + 4} cy="178" rx="5" ry="3" fill="#4a4540" />
            {/* Expression agacée */}
            <line x1={x - 4} y1="112" x2={x + 4} y2="112" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx={x - 4} cy="107" r="1.3" fill="#5a4a3a" />
            <circle cx={x + 4} cy="107" r="1.3" fill="#5a4a3a" />
            {/* Sourcils froncés sur certains */}
            {i % 2 === 1 && (
              <>
                <line x1={x - 6} y1="104" x2={x - 2} y2="105" stroke="#5a4a3a" strokeWidth="1" strokeLinecap="round" />
                <line x1={x + 2} y1="105" x2={x + 6} y2="104" stroke="#5a4a3a" strokeWidth="1" strokeLinecap="round" />
              </>
            )}
          </g>
        );
      })}

      {/* Ligne pointillée de la file */}
      <line
        x1="130" y1="155" x2="500" y2="155"
        stroke="#c4b8ab" strokeWidth="1.5" strokeDasharray="5 4"
        style={{ opacity: animate ? 0.4 : 0, transition: "opacity 400ms ease-out 250ms" }}
      />

      {/* Sol */}
      <rect x="0" y="188" width="520" height="3" rx="1.5" fill="#e8e0d8" opacity="0.6" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   SVG: Tables de restaurant + commandes mobile
   ═══════════════════════════════════════════ */

function PhoneScene({ animate }: { animate: boolean }) {
  const tables = [
    { tx: 60, ty: 100, people: [{ dx: -20, dy: -30 }, { dx: 20, dy: -30 }] },
    { tx: 210, ty: 80, people: [{ dx: -22, dy: -28 }, { dx: 22, dy: -28 }, { dx: 0, dy: 28 }] },
    { tx: 370, ty: 110, people: [{ dx: -20, dy: -30 }, { dx: 20, dy: -30 }] },
    { tx: 460, ty: 70, people: [{ dx: 0, dy: -28 }] },
  ];

  const bodyColors = ["#c4564a", "#e88a6e", "#7fb5b0", "#c9a87c", "#a3b18a", "#d4a0a0", "#8b9dc3", "#c7b299"];
  const hairColors = ["#4a3728", "#2c1810", "#6b4423", "#1a1a2e", "#3d2b1f", "#5c3d2e", "#4a3728", "#2c1810"];
  let personIdx = 0;

  return (
    <svg viewBox="0 0 520 240" fill="none" className="w-full h-auto max-w-lg mx-auto">
      {tables.map((table, ti) => (
        <g key={ti}>
          {/* Table */}
          <g
            style={{
              opacity: animate ? 1 : 0,
              transition: `opacity 400ms ease-out ${150 + ti * 120}ms`,
            }}
          >
            <ellipse cx={table.tx} cy={table.ty + 10} rx="28" ry="10" fill="#e8ddd3" />
            <rect x={table.tx - 24} y={table.ty - 2} width="48" height="14" rx="4" fill="#f5f0eb" stroke="#e0d5c8" strokeWidth="1" />
            {/* QR code sur la table */}
            <g transform={`translate(${table.tx - 6}, ${table.ty})`}>
              <rect x="0" y="0" width="12" height="12" rx="1.5" fill="white" stroke="#c4564a" strokeWidth="0.8" />
              <rect x="2" y="2" width="3" height="3" fill="#c4564a" />
              <rect x="7" y="2" width="3" height="3" fill="#c4564a" />
              <rect x="2" y="7" width="3" height="3" fill="#c4564a" />
              <rect x="5.5" y="5.5" width="2" height="2" fill="#c4564a" />
            </g>
          </g>

          {/* Personnes assises autour de la table */}
          {table.people.map((pos, pi) => {
            const px = table.tx + pos.dx;
            const py = table.ty + pos.dy;
            const ci = personIdx++;
            const bc = bodyColors[ci % bodyColors.length];
            const hc = hairColors[ci % hairColors.length];
            return (
              <g
                key={pi}
                style={{
                  opacity: animate ? 1 : 0,
                  transform: animate ? "scale(1)" : "scale(0.7)",
                  transformOrigin: `${px}px ${py + 10}px`,
                  transition: `all 500ms cubic-bezier(0.34, 1.56, 0.64, 1) ${300 + ci * 130}ms`,
                }}
              >
                {/* Tête */}
                <circle cx={px} cy={py - 6} r="10" fill="#f0d9c4" />
                <ellipse cx={px} cy={py - 12} rx="9" ry="6" fill={hc} />
                {/* Corps (assis) */}
                <rect x={px - 8} y={py + 4} width="16" height="18" rx="5" fill={bc} />
                {/* Bras qui tient le téléphone */}
                <rect x={px + 7} y={py} width="5" height="14" rx="2.5" fill={bc} opacity="0.85" transform={`rotate(-20 ${px + 9} ${py + 7})`} />
                {/* Téléphone */}
                <rect x={px + 11} y={py - 5} width="8" height="13" rx="2" fill="#1a1a1a" />
                <rect x={px + 12} y={py - 3} width="6" height="9" rx="1.5" fill="white" />
                <rect x={px + 13} y={py - 2} width="4" height="3" rx="0.5" fill="#c4564a" opacity="0.4" />
                {/* Expression souriante */}
                <path d={`M${px - 3} ${py - 3} Q${px} ${py + 1} ${px + 3} ${py - 3}`} stroke="#8a7060" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <circle cx={px - 3} cy={py - 7} r="1" fill="#5a4a3a" />
                <circle cx={px + 3} cy={py - 7} r="1" fill="#5a4a3a" />
                {/* Bulle de commande */}
                {ci % 2 === 0 && (
                  <g style={{ opacity: animate ? 1 : 0, transition: `opacity 300ms ease-out ${800 + ci * 120}ms` }}>
                    <rect x={px + 16} y={py - 18} width="20" height="12" rx="6" fill="#22c55e" opacity="0.15" />
                    <text x={px + 26} y={py - 10} textAnchor="middle" fill="#16a34a" fontSize="6" fontWeight="700" fontFamily="system-ui">OK</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      ))}

      {/* Sol / fond */}
      <rect x="0" y="200" width="520" height="3" rx="1.5" fill="#e8e0d8" opacity="0.4" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   Main: sticky "Avant" + "Après" qui le recouvre
   ═══════════════════════════════════════════ */

export function QueueVsPhone() {
  const avantRef = useRef<HTMLDivElement>(null);
  const apresRef = useRef<HTMLDivElement>(null);
  const [avantVisible, setAvantVisible] = useState(false);
  const [apresVisible, setApresVisible] = useState(false);

  // Reveal triggers
  useEffect(() => {
    const avantEl = avantRef.current;
    const apresEl = apresRef.current;
    if (!avantEl || !apresEl) return;

    const obs1 = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setAvantVisible(true); obs1.unobserve(avantEl); } },
      { threshold: 0.2 }
    );
    const obs2 = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setApresVisible(true); obs2.unobserve(apresEl); } },
      { threshold: 0.3 }
    );

    obs1.observe(avantEl);
    obs2.observe(apresEl);
    return () => { obs1.disconnect(); obs2.disconnect(); };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="relative">
        {/* AVANT — stays in place, gets covered */}
        <div
          ref={avantRef}
          className={`sticky top-24 z-0 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-ticket)] p-5 sm:p-8 transition-opacity duration-500 ${
            avantVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-base">
              ❌
            </span>
            <div>
              <p className="font-space text-sm font-bold uppercase tracking-wider text-[var(--landing-fg)]">
                Avant
              </p>
              <p className="text-xs text-[var(--landing-muted-fg)]" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                La file d&apos;attente devant la borne de commande
              </p>
            </div>
          </div>

          <QueueScene animate={avantVisible} />

          <div className="mt-4 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="font-space text-2xl font-bold text-red-500/80">~12 min</p>
              <p className="text-xs text-[var(--landing-muted-fg)]" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                d&apos;attente par client
              </p>
            </div>
            <div className="h-8 w-px bg-[var(--landing-border)]" />
            <div>
              <p className="font-space text-2xl font-bold text-[var(--landing-fg)]/60">1 seule</p>
              <p className="text-xs text-[var(--landing-muted-fg)]" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                borne pour tous
              </p>
            </div>
          </div>
        </div>

        {/* Spacer — gives scroll room for the overlay to happen */}
        <div className="h-[40vh]" />

        {/* APRÈS — slides up over Avant */}
        <div
          ref={apresRef}
          className="relative z-10 rounded-2xl border border-[var(--landing-primary)]/20 bg-[var(--landing-primary)]/[0.03] p-5 sm:p-8 shadow-xl shadow-black/[0.04]"
          style={{
            backgroundColor: `color-mix(in oklch, var(--landing-bg) 97%, var(--landing-primary))`,
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-base">
              ✅
            </span>
            <div>
              <p className="font-space text-sm font-bold uppercase tracking-wider text-[var(--landing-primary)]">
                Avec Taapr
              </p>
              <p className="text-xs text-[var(--landing-muted-fg)]" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                Chaque client commande depuis son téléphone
              </p>
            </div>
          </div>

          <PhoneScene animate={apresVisible} />

          <div className="mt-4 flex items-center justify-center gap-6 text-center">
            <div>
              <p className="font-space text-2xl font-bold text-emerald-500">~30 sec</p>
              <p className="text-xs text-[var(--landing-muted-fg)]" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                pour commander
              </p>
            </div>
            <div className="h-8 w-px bg-[var(--landing-border)]" />
            <div>
              <p className="font-space text-2xl font-bold text-[var(--landing-primary)]">x5</p>
              <p className="text-xs text-[var(--landing-muted-fg)]" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                commandes simultanées
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
