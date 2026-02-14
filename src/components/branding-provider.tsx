"use client";

import { useEffect } from "react";
import { hexToOklch, computeForeground, googleFontUrl } from "@/lib/branding";

interface BrandingProviderProps {
  primaryColor: string | null;
  fontFamily: string | null;
  children: React.ReactNode;
  className?: string;
}

export function BrandingProvider({
  primaryColor,
  fontFamily,
  children,
  className,
}: BrandingProviderProps) {
  const style: React.CSSProperties & Record<string, string> = {};

  if (primaryColor) {
    const oklchColor = hexToOklch(primaryColor);
    const foreground = computeForeground(primaryColor);
    style["--primary"] = oklchColor;
    style["--primary-foreground"] = foreground;
    style["--ring"] = oklchColor;
    style["--sidebar-primary"] = oklchColor;
    style["--sidebar-primary-foreground"] = foreground;
    style["--chart-1"] = oklchColor;
  }

  if (fontFamily) {
    style["--font-geist-sans"] = `"${fontFamily}", system-ui, sans-serif`;
  }

  // Also set CSS variables on <html> so portaled content (drawers, modals)
  // inherits the custom colors
  useEffect(() => {
    const root = document.documentElement;
    const setProps: [string, string][] = [];

    if (primaryColor) {
      const oklchColor = hexToOklch(primaryColor);
      const foreground = computeForeground(primaryColor);
      setProps.push(
        ["--primary", oklchColor],
        ["--primary-foreground", foreground],
        ["--ring", oklchColor],
        ["--sidebar-primary", oklchColor],
        ["--sidebar-primary-foreground", foreground],
        ["--chart-1", oklchColor],
      );
    }

    if (fontFamily) {
      setProps.push(["--font-geist-sans", `"${fontFamily}", system-ui, sans-serif`]);
    }

    for (const [prop, value] of setProps) {
      root.style.setProperty(prop, value);
    }

    return () => {
      for (const [prop] of setProps) {
        root.style.removeProperty(prop);
      }
    };
  }, [primaryColor, fontFamily]);

  return (
    <>
      {fontFamily && (
        <link
          rel="stylesheet"
          href={googleFontUrl(fontFamily)}
          precedence="default"
        />
      )}
      <div style={style} className={className}>
        {children}
      </div>
    </>
  );
}
