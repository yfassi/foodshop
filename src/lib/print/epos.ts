// Dependency-free ePOS-Print XML builder for Epson thermal printers.
// Produces the <epos-print> document that the SDP poll endpoint embeds inside
// a <PrintData> element. See src/app/api/print/poll/route.ts for the transport.

const EPOS_NS = "http://www.epson-pos.com/schemas/2011/03/epos-print";

// 80mm paper, Font A. 42 is a deliberately safe column count for the TM-m30
// family — the real printable width is wider, so a 42-column layout never
// wraps. Bump this only if a customer's printer is confirmed narrower/wider.
export const LINE_WIDTH = 42;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface TextOpts {
  align?: "left" | "center" | "right";
  em?: boolean; // emphasis (bold)
  width?: number; // 1-8 horizontal scale
  height?: number; // 1-8 vertical scale
  underline?: boolean;
}

// One line of text. align/em/width/height are modal on the printer, so every
// <text> element sets all of them — each line is fully self-contained and
// can't be corrupted by a previous line's formatting. Always ends with a feed.
export function text(content: string, opts: TextOpts = {}): string {
  const align = opts.align ?? "left";
  const em = opts.em ? "true" : "false";
  const width = opts.width ?? 1;
  const height = opts.height ?? 1;
  const ul = opts.underline ? "true" : "false";
  return `<text align="${align}" em="${em}" width="${width}" height="${height}" ul="${ul}">${escapeXml(content)}&#10;</text>`;
}

// A full-width separator line.
export function line(char = "-"): string {
  return text(char.repeat(LINE_WIDTH));
}

// A two-column row: left text, right text flushed to the right edge. Truncates
// the left side if the two columns would collide. Stays at width/height 1 so
// the column math holds.
export function row(left: string, right: string, opts: { em?: boolean } = {}): string {
  let l = left;
  if (l.length + right.length + 1 > LINE_WIDTH) {
    l = l.slice(0, Math.max(0, LINE_WIDTH - right.length - 1));
  }
  const pad = Math.max(1, LINE_WIDTH - l.length - right.length);
  return text(l + " ".repeat(pad) + right, { em: opts.em });
}

// Feed n blank lines.
export function feed(lines = 1): string {
  return `<feed line="${lines}"/>`;
}

// Cut the paper (feeds to the cut position first).
export function cut(): string {
  return `<cut type="feed"/>`;
}

// Wrap fragments into a complete <epos-print> document. No <?xml?> prolog — the
// document is embedded inside an SDP <PrintData> element. lang="mul" enables the
// printer's multilingual font set so French accents (é à ç è ù …) render.
export function eposDocument(...fragments: string[]): string {
  return `<epos-print xmlns="${EPOS_NS}"><text lang="mul"/>${fragments.join("")}</epos-print>`;
}
