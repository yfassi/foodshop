import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Resolves a URL segment to a canonical `restaurants.public_id`.
// - returns the segment if it matches `public_id`
// - if it matches a legacy `slug`, redirects to the canonical URL
// - returns `null` if no restaurant matches
//
// Keeps old QR codes / shared links working through the migration.
export async function resolveCanonicalPublicId(
  supabase: SupabaseClient,
  segment: string,
): Promise<string | null> {
  const { data: byPublicId } = await supabase
    .from("restaurants")
    .select("public_id")
    .eq("public_id", segment)
    .maybeSingle();
  if (byPublicId) return byPublicId.public_id;

  const { data: byLegacySlug } = await supabase
    .from("restaurants")
    .select("public_id")
    .eq("slug", segment)
    .maybeSingle();
  if (byLegacySlug) {
    const path = await currentPath();
    const canonical = path.replace(
      new RegExp(`/${escapeRegex(segment)}(/|$)`),
      `/${byLegacySlug.public_id}$1`,
    );
    redirect(canonical);
  }

  return null;
}

async function currentPath(): Promise<string> {
  const h = await headers();
  const url = h.get("x-url") || "/";
  try {
    return new URL(url, "http://placeholder").pathname;
  } catch {
    return "/";
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
