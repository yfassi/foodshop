import { permanentRedirect } from "next/navigation";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "driver",
  "favicon.ico",
  "landing-v4.css",
  "livraison",
  "restaurant",
  "stock",
  "super-admin",
]);

export default async function LegacySlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) {
    permanentRedirect("/");
  }
  permanentRedirect(`/restaurant/${slug}/order`);
}
