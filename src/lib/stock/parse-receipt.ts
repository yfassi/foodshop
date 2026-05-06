import type { IngredientUnit, ParsedScanLine } from "@/lib/types";

const UNIT_ALIASES: Record<string, IngredientUnit> = {
  kg: "kg",
  kgs: "kg",
  g: "g",
  gr: "g",
  grs: "g",
  grammes: "g",
  gramme: "g",
  l: "l",
  litre: "l",
  litres: "l",
  ml: "ml",
  cl: "ml",
  u: "piece",
  un: "piece",
  unite: "piece",
  unites: "piece",
  unité: "piece",
  unités: "piece",
  pcs: "piece",
  pc: "piece",
  piece: "piece",
  pieces: "piece",
  pièce: "piece",
  pièces: "piece",
  bte: "piece",
  btes: "piece",
  boite: "piece",
  boites: "piece",
};

function normalizeNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeUnit(raw: string | null | undefined): IngredientUnit | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\./g, "").trim();
  return UNIT_ALIASES[key] ?? null;
}

function unitInGramsOrMl(unit: IngredientUnit | null, qty: number) {
  if (unit === "kg") return { unit: "kg" as const, qty };
  if (unit === "g") return { unit: "g" as const, qty };
  if (unit === "l") return { unit: "l" as const, qty };
  if (unit === "ml") return { unit: "ml" as const, qty };
  return { unit: unit ?? null, qty };
}

const NOISE_KEYWORDS = [
  "total",
  "sous-total",
  "sous total",
  "tva",
  "ttc",
  "ht",
  "remise",
  "facture",
  "client",
  "siret",
  "tel",
  "telephone",
  "tél",
  "email",
  "merci",
  "page",
  "ref",
  "n°",
  "no.",
  "num",
  "date",
  "livraison",
  "fournisseur",
  "adresse",
];

function isNoise(line: string): boolean {
  const lower = line.toLowerCase();
  return NOISE_KEYWORDS.some((kw) => lower.startsWith(kw));
}

/**
 * Best-effort parser of an OCR'd delivery ticket.
 * Each output line is a candidate the user must validate / edit.
 *
 * Recognised shapes (loose):
 *   "Burrata 125g           x12          12,90"
 *   "Tomates anciennes      3 kg         4,50"
 *   "Magret de canard       8 pcs        18,40"
 *   "Safran 1g              x2           7,00"
 *
 * Strategy:
 *   1) Split into lines, drop boilerplate (TVA, total, etc.)
 *   2) Look for trailing price (eur), then a quantity (with optional unit)
 *      somewhere in the middle, and treat the prefix as the article name.
 */
export function parseReceipt(ocrText: string): ParsedScanLine[] {
  if (!ocrText) return [];

  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((l) => !isNoise(l));

  const out: ParsedScanLine[] = [];

  const priceRe = /([0-9]+[.,][0-9]{2})\s*(?:€|eur|euros?)?\s*$/i;
  const qtyRe =
    /\b(?:x\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(kg|kgs|g|gr|grs|grammes?|l|litres?|ml|cl|u|un|pcs?|pi[eè]ces?|unit[eé]s?|b(?:te|oite)s?)?\b/i;

  for (const line of lines) {
    if (line.length < 3) continue;

    // Trailing price (optional)
    let workingLine = line;
    let price_cents: number | null = null;
    const priceMatch = workingLine.match(priceRe);
    if (priceMatch) {
      const priceNum = normalizeNumber(priceMatch[1]);
      if (priceNum !== null) {
        price_cents = Math.round(priceNum * 100);
      }
      workingLine = workingLine.slice(0, priceMatch.index).trim();
    }

    // Quantity + optional unit, scanning right-to-left to bias toward
    // the qty that comes after the article name.
    const matches = [...workingLine.matchAll(new RegExp(qtyRe, "gi"))];
    if (matches.length === 0) {
      // No quantity: skip entirely (probably noise).
      continue;
    }
    const lastMatch = matches[matches.length - 1];
    const qty = normalizeNumber(lastMatch[1]);
    if (qty === null || qty <= 0) continue;
    const unit = normalizeUnit(lastMatch[2] ?? null);

    const matchStart = lastMatch.index ?? 0;
    let name = workingLine.slice(0, matchStart).trim();
    name = name.replace(/[-–—:|]+$/g, "").trim();

    if (!name || name.length < 2) continue;

    const norm = unitInGramsOrMl(unit, qty);
    out.push({
      name,
      qty: norm.qty,
      unit: norm.unit ?? null,
      price_cents,
    });
  }

  return out;
}
