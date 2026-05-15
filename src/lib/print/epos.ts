// ePOS-Print XML builder for Epson WiFi thermal printers. Produces the
// <epos-print> document embedded inside an SDP <PrintData> element by the
// poll endpoint (src/app/api/print/poll/route.ts).
//
// Implements PrintBuilder<string> so the layouts in render-receipt.ts emit
// the exact same content over either transport (XML for WiFi, ESC/POS bytes
// for USB) without duplicating ticket logic.

import {
  formatRow,
  LINE_WIDTH,
  type PrintBuilder,
  type TextOpts,
} from "./builder";

const EPOS_NS = "http://www.epson-pos.com/schemas/2011/03/epos-print";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export class EposBuilder implements PrintBuilder<string> {
  private parts: string[] = [];

  // Every <text> element fully restates align/em/width/height because those
  // settings are modal on the printer — each line is self-contained and can't
  // be corrupted by a previous line's formatting. Always ends with a feed.
  text(content: string, opts: TextOpts = {}): void {
    const align = opts.align ?? "left";
    const em = opts.em ? "true" : "false";
    const width = opts.width ?? 1;
    const height = opts.height ?? 1;
    const ul = opts.underline ? "true" : "false";
    this.parts.push(
      `<text align="${align}" em="${em}" width="${width}" height="${height}" ul="${ul}">${escapeXml(content)}&#10;</text>`,
    );
  }

  row(left: string, right: string, opts: { em?: boolean } = {}): void {
    this.text(formatRow(left, right), { em: opts.em });
  }

  line(char = "-"): void {
    this.text(char.repeat(LINE_WIDTH));
  }

  feed(lines = 1): void {
    this.parts.push(`<feed line="${lines}"/>`);
  }

  cut(): void {
    this.parts.push(`<cut type="feed"/>`);
  }

  // Wrap accumulated fragments into a complete <epos-print> document. No
  // <?xml?> prolog — the document is embedded inside an SDP <PrintData>
  // element. lang="mul" enables the printer's multilingual font set so French
  // accents (é à ç è ù …) render.
  finalize(): string {
    return `<epos-print xmlns="${EPOS_NS}"><text lang="mul"/>${this.parts.join("")}</epos-print>`;
  }
}
