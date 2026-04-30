import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { tierAtLeast } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";

async function getRestaurantForUser(supabase: Awaited<ReturnType<typeof createClient>>, restaurantId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("restaurants")
    .select("id, owner_id, subscription_tier")
    .eq("id", restaurantId)
    .single();
  if (!data || data.owner_id !== user.id) return null;
  return data;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const restaurantId = url.searchParams.get("restaurant_id");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const resto = await getRestaurantForUser(supabase, restaurantId);
  if (!resto) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!tierAtLeast(resto.subscription_tier as SubscriptionTier, "carte")) {
    return NextResponse.json({ error: "Plan insuffisant" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, scopes, last_used_at, revoked_at, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.restaurant_id || !body?.name) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const supabase = await createClient();
  const resto = await getRestaurantForUser(supabase, body.restaurant_id);
  if (!resto) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!tierAtLeast(resto.subscription_tier as SubscriptionTier, "carte")) {
    return NextResponse.json({ error: "Plan Carte Blanche requis" }, { status: 403 });
  }

  // Generate a 32-byte token. Prefix is the first 12 chars of the visible part.
  const raw = crypto.randomBytes(24).toString("base64url");
  const fullKey = `tpr_live_${raw}`;
  const prefix = fullKey.slice(0, 16);
  const hashed = crypto.createHash("sha256").update(fullKey).digest("hex");

  const scopes = Array.isArray(body.scopes) && body.scopes.length > 0
    ? body.scopes.filter((s: unknown): s is string => typeof s === "string")
    : ["read"];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      restaurant_id: body.restaurant_id,
      name: body.name.trim().slice(0, 80),
      prefix,
      hashed_key: hashed,
      scopes,
      created_by: user?.id ?? null,
    })
    .select("id, name, prefix, scopes, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return the full key once; never again.
  return NextResponse.json({ key: data, full_key: fullKey });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const restaurantId = url.searchParams.get("restaurant_id");
  if (!id || !restaurantId) {
    return NextResponse.json({ error: "id et restaurant_id requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const resto = await getRestaurantForUser(supabase, restaurantId);
  if (!resto) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
