// Helpers for round-tripping print_jobs.payload_escpos (BYTEA) through
// PostgREST. PostgREST serializes BYTEA as a "\\x"-prefixed hex string on read
// and accepts the same format on write.

export function bytesToPgHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return "\\x" + hex;
}

export function pgHexToBytes(hex: string): Uint8Array {
  // Accept the standard PostgREST shape ("\\x...") but tolerate a missing
  // prefix to be defensive against driver quirks.
  const trimmed = hex.startsWith("\\x") ? hex.slice(2) : hex;
  if (trimmed.length % 2 !== 0) {
    throw new Error("pgHexToBytes: odd-length hex string");
  }
  const out = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(trimmed.substr(i * 2, 2), 16);
  }
  return out;
}
