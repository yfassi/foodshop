// Format-agnostic ticket builder interface. Receipt layouts (kitchen ticket,
// customer receipt, test page) describe their content against this interface
// and are emitted as either Epson ePOS-Print XML (WiFi printers, SDP transport)
// or raw ESC/POS bytes (USB printers, WebUSB transport). Adding a new transport
// only requires a new builder implementation — the layouts in render-receipt.ts
// don't move.

// 80mm paper, Font A. 42 cols is a deliberately safe width for the TM-m30
// family; the real printable width is wider so the layout never wraps. The
// same value is used by the ESC/POS path: all targeted USB printers
// (Xprinter XP-T80A, Epson TM-T20III, Star TSP143IIIU) ship 80mm paper too.
export const LINE_WIDTH = 42;

export interface TextOpts {
  align?: "left" | "center" | "right";
  em?: boolean;
  width?: number;
  height?: number;
  underline?: boolean;
}

export interface PrintBuilder<TPayload> {
  text(content: string, opts?: TextOpts): void;
  row(left: string, right: string, opts?: { em?: boolean }): void;
  line(char?: string): void;
  feed(lines?: number): void;
  cut(): void;
  finalize(): TPayload;
}

// Shared row layout — truncate-left to keep right column flush. Width/height
// are kept at 1× because the column math relies on monospace single-size text.
export function formatRow(left: string, right: string): string {
  let l = left;
  if (l.length + right.length + 1 > LINE_WIDTH) {
    l = l.slice(0, Math.max(0, LINE_WIDTH - right.length - 1));
  }
  const pad = Math.max(1, LINE_WIDTH - l.length - right.length);
  return l + " ".repeat(pad) + right;
}
