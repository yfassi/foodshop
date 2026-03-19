export function StampBadge({
  children,
  color = "primary",
  rotation = 12,
  className = "",
}: {
  children: React.ReactNode;
  color?: "primary" | "accent";
  rotation?: number;
  className?: string;
}) {
  const colorClasses = color === "primary"
    ? "border-[var(--landing-primary)] text-[var(--landing-primary)]"
    : "border-[var(--landing-accent)] text-[var(--landing-accent)]";

  return (
    <span
      className={`inline-block rounded-sm border-2 border-dashed px-3 py-1 font-space text-xs font-bold uppercase tracking-widest ${colorClasses} ${className}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {children}
    </span>
  );
}
