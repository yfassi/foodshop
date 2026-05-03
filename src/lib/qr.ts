import QRCode from "qrcode";

export const CUSTOMER_BASE_URL =
  process.env.NEXT_PUBLIC_CUSTOMER_URL || "https://taapr.fr";

export function buildCustomerOrderUrl(publicId: string): string {
  return `${CUSTOMER_BASE_URL}/restaurant/${publicId}/order`;
}

export async function generateQrDataUrl(
  data: string,
  options: { width?: number; margin?: number } = {},
): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",
    margin: options.margin ?? 1,
    width: options.width ?? 1024,
    color: { dark: "#1A1410", light: "#FFFFFF" },
  });
}
