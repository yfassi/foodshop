import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { STOCK_UNITS, type StockUnit } from "@/lib/types";

interface ConfirmedItem {
  raw_name: string;
  qty: number;
  unit: StockUnit;
  matched_stock_item_id: string | null;
  create_new: boolean;
  new_name?: string;
  skipped: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { restaurant_slug, items } = body as {
      restaurant_slug?: string;
      items?: ConfirmedItem[];
    };

    if (!restaurant_slug || !Array.isArray(items)) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, owner_id, stock_addon_active")
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (!restaurant.stock_addon_active) {
      return NextResponse.json({ error: "Module Stock non activé" }, { status: 403 });
    }

    // Verify receipt belongs to this restaurant
    const { data: receipt } = await supabase
      .from("stock_receipts")
      .select("id, restaurant_id, status")
      .eq("id", id)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (!receipt) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }
    if (receipt.status === "confirmed") {
      return NextResponse.json({ error: "Ticket déjà validé" }, { status: 409 });
    }

    // For each item: create new stock_item if requested, then create stock_movement
    const movements: Array<{
      restaurant_id: string;
      stock_item_id: string;
      type: "in";
      quantity: number;
      reason: string;
      receipt_id: string;
      created_by: string;
    }> = [];

    for (const item of items) {
      if (item.skipped) continue;
      if (!STOCK_UNITS.includes(item.unit)) continue;

      let stockItemId = item.matched_stock_item_id;

      if (item.create_new) {
        const newName = (item.new_name || item.raw_name).trim();
        if (!newName) continue;

        // Try to insert; on conflict (unique restaurant_id+name), fetch existing
        const { data: created, error: createErr } = await supabase
          .from("stock_items")
          .insert({
            restaurant_id: restaurant.id,
            name: newName,
            unit: item.unit,
            current_qty: 0,
          })
          .select("id")
          .single();

        if (created) {
          stockItemId = created.id;
        } else if (createErr?.code === "23505") {
          const { data: existing } = await supabase
            .from("stock_items")
            .select("id")
            .eq("restaurant_id", restaurant.id)
            .eq("name", newName)
            .single();
          stockItemId = existing?.id ?? null;
        }
      }

      if (!stockItemId) continue;
      const qty = Math.abs(Number(item.qty) || 0);
      if (qty === 0) continue;

      movements.push({
        restaurant_id: restaurant.id,
        stock_item_id: stockItemId,
        type: "in",
        quantity: qty,
        reason: "Réception ticket scanné",
        receipt_id: receipt.id,
        created_by: user.id,
      });
    }

    if (movements.length > 0) {
      const { error: moveError } = await supabase.from("stock_movements").insert(movements);
      if (moveError) {
        return NextResponse.json({ error: moveError.message }, { status: 500 });
      }
    }

    const { error: updateError } = await supabase
      .from("stock_receipts")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", receipt.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, movements_created: movements.length });
  } catch (err) {
    console.error("stock receipts confirm error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
