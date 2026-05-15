// Admin CRUD for cloud-pull printers. Owner-authenticated; mirrors the
// api-keys route — the printer token is generated server-side, only the
// sha256 hash is stored, and the full token is returned exactly once.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.taapr.fr";

// Columns safe to expose — never includes token_hash.
const PUBLIC_COLUMNS =
  "id, restaurant_id, name, kind, token_prefix, auto_print_kitchen, auto_print_receipt, is_active, last_seen_at, usb_vendor_id, usb_product_id, created_at, updated_at";

const VALID_KINDS = ["epson_sdp", "star_cloudprnt", "usb_thermal"] as const;
type PrinterKind = (typeof VALID_KINDS)[number];

async function getRestaurantForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("restaurants")
    .select("id, owner_id")
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

  const { data, error } = await supabase
    .from("printers")
    .select(PUBLIC_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[printers] list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ printers: data ?? [] });
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

  // Generate the printer token. Only the sha256 hash is stored; the full token
  // lives only in the poll URL the owner pastes into the printer's config.
  const fullToken = `prt_${crypto.randomBytes(24).toString("base64url")}`;
  const tokenPrefix = fullToken.slice(0, 12);
  const tokenHash = crypto.createHash("sha256").update(fullToken).digest("hex");

  // kind defaults to 'epson_sdp' (the original WiFi flow). A WebUSB printer is
  // created with kind='usb_thermal' so the cuisine page picks it up and the
  // poll URL becomes irrelevant (USB jobs are fetched via /api/print/web-poll).
  const kind: PrinterKind = (VALID_KINDS as readonly string[]).includes(
    body.kind,
  )
    ? (body.kind as PrinterKind)
    : "epson_sdp";

  const { data, error } = await supabase
    .from("printers")
    .insert({
      restaurant_id: body.restaurant_id,
      name: String(body.name).trim().slice(0, 80),
      kind,
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
    })
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error("[printers] create error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  // Return the full token + poll URL once; never again. For usb_thermal the
  // token is what the cuisine page stores in localStorage to authenticate
  // /api/print/web-poll requests, so it's returned the same way.
  return NextResponse.json({
    printer: data,
    full_token: fullToken,
    poll_url: `${APP_URL}/api/print/poll?token=${fullToken}`,
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.restaurant_id) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const supabase = await createClient();
  const resto = await getRestaurantForUser(supabase, body.restaurant_id);
  if (!resto) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only these fields are editable; everything else (token, kind, restaurant)
  // is fixed at creation. The USB IDs are write-once-after-pairing — the
  // cuisine page PATCHes them after navigator.usb.requestDevice() succeeds.
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim().slice(0, 80);
  if (typeof body.auto_print_kitchen === "boolean")
    updates.auto_print_kitchen = body.auto_print_kitchen;
  if (typeof body.auto_print_receipt === "boolean")
    updates.auto_print_receipt = body.auto_print_receipt;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (
    typeof body.usb_vendor_id === "number" &&
    Number.isInteger(body.usb_vendor_id) &&
    body.usb_vendor_id >= 0 &&
    body.usb_vendor_id <= 0xffff
  ) {
    updates.usb_vendor_id = body.usb_vendor_id;
  }
  if (
    typeof body.usb_product_id === "number" &&
    Number.isInteger(body.usb_product_id) &&
    body.usb_product_id >= 0 &&
    body.usb_product_id <= 0xffff
  ) {
    updates.usb_product_id = body.usb_product_id;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("printers")
    .update(updates)
    .eq("id", body.id)
    .eq("restaurant_id", body.restaurant_id)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error("[printers] update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ printer: data });
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
    .from("printers")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("[printers] delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
