"use client";

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
