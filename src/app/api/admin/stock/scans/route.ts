import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";
import type { ParsedScanLine } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  const status = searchParams.get("status");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant" }, { status: 400 });
  }
  const access = await verifyStockAccess(restaurantId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = createAdminClient();
  let query = supabase
    .from("delivery_scans")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  return NextResponse.json({ scans: data });
}

/**
 * Creates a delivery scan in 'pending' state. Body:
 * { restaurant_id, supplier_id?, image_url?, ocr_raw?, parsed_items?, scan_date? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, supplier_id, image_url, ocr_raw, parsed_items, scan_date } = body as {
      restaurant_id: string;
      supplier_id?: string | null;
      image_url?: string | null;
      ocr_raw?: string | null;
      parsed_items?: ParsedScanLine[];
      scan_date?: string;
    };

    if (!restaurant_id) {
      return NextResponse.json({ error: "restaurant_id manquant" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("delivery_scans")
      .insert({
        restaurant_id,
        supplier_id: supplier_id || null,
        image_url: image_url || null,
        ocr_raw: ocr_raw || null,
        parsed_items: parsed_items || [],
        scan_date: scan_date || new Date().toISOString().slice(0, 10),
        status: "pending",
        created_by: access.userId,
      })
      .select()
      .single();
    if (error) {
      console.error("Scan insert error:", error);
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const restaurantId = searchParams.get("restaurant_id");
    if (!id || !restaurantId) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurantId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("delivery_scans")
      .update({ status: "discarded" })
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: "Erreur" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
