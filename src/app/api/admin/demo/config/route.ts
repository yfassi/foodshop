import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Demo-only endpoint: allows unauthenticated toggling of feature flags
// so demos can showcase plan tiers and gated features live.
// Refuses in production as a safety net.

const ALLOWED_FIELDS = [
  "subscription_tier",
  "delivery_addon_active",
  "delivery_enabled",
  "loyalty_enabled",
  "queue_enabled",
  "stripe_onboarding_complete",
  "is_accepting_orders",
  "verification_status",
] as const;

type DemoField = (typeof ALLOWED_FIELDS)[number];

const SUBSCRIPTION_TIERS = ["essentiel", "pro", "business"];
const VERIFICATION_STATUSES = ["pending", "verified", "rejected"];

function guardNonProd() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Démo indisponible en production" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: Request) {
  const denied = guardNonProd();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Slug requis" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(ALLOWED_FIELDS.join(", "))
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const denied = guardNonProd();
  if (denied) return denied;

  const body = (await request.json()) as {
    slug?: string;
    updates?: Partial<Record<DemoField, unknown>>;
  };
  const { slug, updates } = body;

  if (!slug || !updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (!(key in updates)) continue;
    const value = updates[key];
    if (key === "subscription_tier") {
      if (typeof value !== "string" || !SUBSCRIPTION_TIERS.includes(value)) {
        return NextResponse.json(
          { error: "subscription_tier invalide" },
          { status: 400 }
        );
      }
      sanitized[key] = value;
    } else if (key === "verification_status") {
      if (typeof value !== "string" || !VERIFICATION_STATUSES.includes(value)) {
        return NextResponse.json(
          { error: "verification_status invalide" },
          { status: 400 }
        );
      }
      sanitized[key] = value;
    } else {
      if (typeof value !== "boolean") {
        return NextResponse.json(
          { error: `${key} doit être un booléen` },
          { status: 400 }
        );
      }
      sanitized[key] = value;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("restaurants")
    .update(sanitized)
    .eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: sanitized });
}
