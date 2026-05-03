export function resolveAppUrl(request?: Request): string {
  const candidates: (string | undefined)[] = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    request?.headers.get("origin") ?? undefined,
    request ? new URL(request.url).origin : undefined,
    "http://localhost:3000",
  ];

  const raw = candidates.find((c): c is string => Boolean(c));
  if (!raw) return "http://localhost:3000";

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "http://localhost:3000";
  }

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isLocal && url.protocol !== "https:") {
    url.protocol = "https:";
  }

  return url.origin;
}
