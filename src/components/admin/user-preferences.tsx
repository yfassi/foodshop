"use client";

import { useEffect, useState } from "react";
import { Palette, Sun, Moon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";
type Accent = "neutral" | "blue" | "red" | "green";

const ACCENT_SWATCHES: { value: Accent; label: string; color: string }[] = [
  { value: "neutral", label: "Neutral", color: "#171717" },
  { value: "blue",    label: "TaapR blue", color: "#1447e6" },
  { value: "red",     label: "TaapR red", color: "#d7352d" },
  { value: "green",   label: "Vert", color: "#15803d" },
];

function readPrefs(): { theme: Theme; accent: Accent } {
  if (typeof window === "undefined") {
    return { theme: "light", accent: "neutral" };
  }
  return {
    theme: (localStorage.getItem("taapr.theme") as Theme) || "light",
    accent: (localStorage.getItem("taapr.accent") as Accent) || "neutral",
  };
}

function applyPrefs(theme: Theme, accent: Accent) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-accent", accent);
}

export function UserPreferences({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState<Accent>("neutral");

  useEffect(() => {
    // Hydrate state from localStorage (set by the boot script on initial load).
    // The boot script applies classes to <html> before paint to avoid flash; this
    // useEffect synchronises React state so the menu reflects the current values.
    const p = readPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage on mount
    setTheme(p.theme);
    setAccent(p.accent);
    applyPrefs(p.theme, p.accent);
  }, []);

  const update = (next: { theme?: Theme; accent?: Accent }) => {
    const t = next.theme ?? theme;
    const a = next.accent ?? accent;
    if (next.theme !== undefined) {
      setTheme(next.theme);
      localStorage.setItem("taapr.theme", next.theme);
    }
    if (next.accent !== undefined) {
      setAccent(next.accent);
      localStorage.setItem("taapr.accent", next.accent);
    }
    applyPrefs(t, a);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Préférences d'affichage"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-bg-3 hover:text-foreground transition-colors",
            collapsed ? "w-10 justify-center" : "w-full"
          )}
        >
          <Palette className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Préférences</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-72 p-4">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Thème</div>
            <Segmented
              options={[
                { value: "light", label: "Clair", icon: Sun },
                { value: "dark",  label: "Sombre", icon: Moon },
              ]}
              value={theme}
              onChange={(v) => update({ theme: v as Theme })}
            />
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Accent</div>
            <div className="flex gap-2">
              {ACCENT_SWATCHES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => update({ accent: s.value })}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition-transform",
                    accent === s.value
                      ? "border-foreground scale-110"
                      : "border-border-2-tk hover:scale-105"
                  )}
                  style={{ backgroundColor: s.color }}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-bg-3 p-1">
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              value === o.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Inline script for SSR — prevents flash. Render once in admin layout. */
export const PREFS_BOOT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('taapr.theme') || 'light';
    var a = localStorage.getItem('taapr.accent') || 'neutral';
    var r = document.documentElement;
    if (t === 'dark') r.classList.add('dark');
    r.setAttribute('data-accent', a);
    // Cleanup any legacy density class left from a previous session.
    r.classList.remove('dens-compact', 'dens-confort');
    if (document.body) document.body.classList.remove('dens-compact', 'dens-confort');
  } catch(e) {}
})();
`;
