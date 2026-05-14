// Epson Server Direct Print (SDP) transport envelope.
//
// The printer POSTs application/x-www-form-urlencoded with:
//   ConnectionType — 'GetRequest' to poll for work, 'SetResponse' to report a result
//   ID             — the printer's device id
//   ResponseFile   — (SetResponse only) XML carrying the print outcome
//
// On GetRequest we answer with a <PrintRequestInfo> document wrapping the
// ePOS-Print payload, or an empty body when nothing is queued. On SetResponse
// the ResponseFile field carries a <response> element with success/code.

// Per-job timeout (ms) the printer applies while rendering the job. 10s is
// Epson's documented default and is ample for a receipt.
const JOB_TIMEOUT_MS = 10000;

/** Wrap an <epos-print> payload in the SDP <PrintRequestInfo> envelope. */
export function wrapSdpResponse(payloadXml: string): string {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<PrintRequestInfo>` +
    `<ePOSPrint>` +
    `<Parameter><devid>local_printer</devid><timeout>${JOB_TIMEOUT_MS}</timeout></Parameter>` +
    `<PrintData>${payloadXml}</PrintData>` +
    `</ePOSPrint>` +
    `</PrintRequestInfo>`
  );
}

/**
 * Parse the printer's SetResponse ResponseFile XML for the print outcome.
 * The printer generates simple, well-formed XML (<response success="true"
 * code="" .../>), so a focused regex is enough and keeps this dependency-free.
 * An unparseable body is treated as a failure — conservative, and an 'error'
 * job is never silently reprinted.
 */
export function parseSdpResult(responseFile: string): {
  success: boolean;
  code: string | null;
} {
  const successMatch = responseFile.match(/<response\b[^>]*\bsuccess="([^"]*)"/i);
  const codeMatch = responseFile.match(/<response\b[^>]*\bcode="([^"]*)"/i);
  return {
    success: successMatch?.[1]?.toLowerCase() === "true",
    code: codeMatch?.[1] || null,
  };
}
