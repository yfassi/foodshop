export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter", category: "Moderne" },
  { value: "Poppins", label: "Poppins", category: "Arrondi" },
  { value: "Nunito", label: "Nunito", category: "Chaleureux" },
  { value: "Lato", label: "Lato", category: "Classique" },
  { value: "Open Sans", label: "Open Sans", category: "Neutre" },
  { value: "Montserrat", label: "Montserrat", category: "Elegant" },
  { value: "Raleway", label: "Raleway", category: "Fin" },
  { value: "DM Sans", label: "DM Sans", category: "Geometrique" },
] as const;

export type FontFamily = (typeof FONT_OPTIONS)[number]["value"];

/**
 * Convert hex (#rrggbb) to an oklch() CSS string.
 */
export function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // sRGB to linear RGB
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // Linear RGB to OKLab via LMS
  const l_ = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  );
  const m_ = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  );
  const s_ = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  );

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  // OKLab to OKLCh
  const C = Math.sqrt(a * a + bOk * bOk);
  let H = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

/**
 * Compute a readable foreground color (white or dark) for a given hex background.
 */
export function computeForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "oklch(0.17 0.012 75)" : "oklch(1 0 0)";
}

/**
 * Build the Google Fonts CSS URL for a given font family.
 */
export function googleFontUrl(family: string): string {
  const encoded = family.replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap`;
}
