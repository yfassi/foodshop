// Raw ESC/POS builder for USB thermal printers (Xprinter XP-T80A, Epson
// TM-T20III, Star TSP143IIIU, and the broader ESC/POS family). Produces a
// Uint8Array that a WebUSB station writes to the device with transferOut().
//
// Implements PrintBuilder<Uint8Array> so the layouts in render-receipt.ts emit
// the exact same content as the ePOS/XML path — only the byte representation
// differs.
//
// Targets the common ESC/POS subset shared by all the models documented in
// docs/guide-imprimante.md: init / text / line feed / cut / align / bold /
// size. No graphics, no codepage games beyond CP858 (which carries the € sign
// and every French accent).

import {
  formatRow,
  LINE_WIDTH,
  type PrintBuilder,
  type TextOpts,
} from "./builder";

// --- ESC/POS control codes (only the ones we actually emit) ---
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD_INIT = [ESC, 0x40]; // ESC @
const CMD_CUT = [GS, 0x56, 0x00]; // GS V 0 (full cut, no extra feed)

// ESC t n — select character code table. 19 = CP858 (CP850 + €). All three
// targeted printers support it; CP858 is the de-facto default for FR/POS.
const CMD_SELECT_CP858 = [ESC, 0x74, 19];

function cmdAlign(align: "left" | "center" | "right"): number[] {
  const n = align === "center" ? 1 : align === "right" ? 2 : 0;
  return [ESC, 0x61, n]; // ESC a n
}

function cmdBold(on: boolean): number[] {
  return [ESC, 0x45, on ? 1 : 0]; // ESC E n
}

function cmdSize(width: number, height: number): number[] {
  // GS ! n — high nibble = width scale (0..7), low nibble = height scale.
  // PrintBuilder TextOpts expresses scale as 1..8 (1 = native); ESC/POS uses
  // 0..7. Clamp + offset so a "1×" caller stays at native size.
  const w = Math.max(0, Math.min(7, (width ?? 1) - 1));
  const h = Math.max(0, Math.min(7, (height ?? 1) - 1));
  return [GS, 0x21, (w << 4) | h];
}

function cmdUnderline(on: boolean): number[] {
  return [ESC, 0x2d, on ? 1 : 0]; // ESC - n
}

// --- CP858 encoding ---
// CP858 = CP850 with 0xD5 mapped to € instead of ı. Covers every diacritic the
// app uses (é à è ù ç ô î â …) plus the euro sign. Characters outside the
// table fall back to '?' rather than dropping bytes silently.
const CP858_OVERRIDES: Record<string, number> = {
  // Accented letters used in fr-FR menus / addresses.
  "À": 0xb7, "Á": 0xb5, "Â": 0xb6, "Ã": 0xc7, "Ä": 0x8e, "Å": 0x8f,
  "Ç": 0x80, "É": 0x90, "È": 0xd4, "Ê": 0xd2, "Ë": 0xd3,
  "Í": 0xd6, "Ì": 0xde, "Î": 0xd7, "Ï": 0xd8,
  "Ñ": 0xa5, "Ó": 0xe0, "Ò": 0xe3, "Ô": 0xe2, "Ö": 0x99, "Õ": 0xe5,
  "Ú": 0xe9, "Ù": 0xeb, "Û": 0xea, "Ü": 0x9a,
  "Ý": 0xed, "à": 0x85, "á": 0xa0, "â": 0x83, "ã": 0xc6, "ä": 0x84, "å": 0x86,
  "ç": 0x87, "é": 0x82, "è": 0x8a, "ê": 0x88, "ë": 0x89,
  "í": 0xa1, "ì": 0x8d, "î": 0x8c, "ï": 0x8b,
  "ñ": 0xa4, "ó": 0xa2, "ò": 0x95, "ô": 0x93, "ö": 0x94, "õ": 0xe4,
  "ú": 0xa3, "ù": 0x97, "û": 0x96, "ü": 0x81, "ý": 0xec, "ÿ": 0x98,
  // Currency + typography.
  "€": 0xd5,
  "£": 0x9c,
  "¥": 0xbd,
  "©": 0xb8,
  "®": 0xa9,
  "°": 0xf8,
  "±": 0xf1,
  "²": 0xfd,
  "·": 0xfa,
  "«": 0xae,
  "»": 0xaf,
  "—": 0x2d, // em dash → ascii dash (CP858 has no em-dash)
  "–": 0x2d, // en dash → ascii dash
  "‘": 0x27, // typographic apostrophes → ascii
  "’": 0x27,
  "“": 0x22, // typographic double quotes → ascii
  "”": 0x22,
  "…": 0x2e, // ellipsis → single period (best-effort)
};

function encodeCp858(str: string): number[] {
  const out: number[] = [];
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code < 0x80) {
      out.push(code);
      continue;
    }
    const mapped = CP858_OVERRIDES[ch];
    out.push(mapped !== undefined ? mapped : 0x3f); // '?'
  }
  return out;
}

export class EscposBuilder implements PrintBuilder<Uint8Array> {
  // Init + select CP858 once at the start. Every subsequent text() restates
  // align/bold/size for the same reason the ePOS builder does: each line is
  // self-contained, so a previous line can't corrupt the next.
  private bytes: number[] = [...CMD_INIT, ...CMD_SELECT_CP858];

  text(content: string, opts: TextOpts = {}): void {
    this.bytes.push(...cmdAlign(opts.align ?? "left"));
    this.bytes.push(...cmdBold(!!opts.em));
    this.bytes.push(...cmdSize(opts.width ?? 1, opts.height ?? 1));
    this.bytes.push(...cmdUnderline(!!opts.underline));
    this.bytes.push(...encodeCp858(content));
    this.bytes.push(LF);
  }

  row(left: string, right: string, opts: { em?: boolean } = {}): void {
    this.text(formatRow(left, right), { em: opts.em });
  }

  line(char = "-"): void {
    this.text(char.repeat(LINE_WIDTH));
  }

  // ESC d n — feed n lines. Falls back to LF when n is 0 or unset.
  feed(lines = 1): void {
    if (lines <= 0) return;
    this.bytes.push(ESC, 0x64, Math.min(255, lines));
  }

  cut(): void {
    this.bytes.push(...CMD_CUT);
  }

  finalize(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}
