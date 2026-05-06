import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";
import type { IngredientUnit } from "@/lib/types";

const VALID_UNITS: IngredientUnit[] = ["kg", "g", "l", "ml", "piece"];

interface ValidatedLine {
  ingredient_id?: string | null;   // existing ingredient (then we just delta its qty)
  name?: string;                   // for new ingredient creation
  qty: number;
  unit: IngredientUnit;
  price_cents?: number | null;
}

/**
 * Validates a pending delivery scan: applies the deltas to ingredients,
 * creates ingredients on the fly when only `name` is given, writes
 * stock_movements rows, and flips the scan to status='validated'.
 *
 * Body: { restaurant_id, scan_id, supplier_id?, total_cents?, lines: ValidatedLine[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, scan_id, supplier_id, total_cents, lines } = body as {
      restaurant_id: string;
      scan_id: string;
      supplier_id?: string | null;
      total_cents?: number | null;
      lines: ValidatedLine[];
    };

    if (!restaurant_id || !scan_id || !Array.isArray(lines)) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();

    const { data: scan } = await supabase
      .from("delivery_scans")
      .select("id, status, restaurant_id")
      .eq("id", scan_id)
      .eq("restaurant_id", restaurant_id)
      .single();
    if (!scan) {
      return NextResponse.json({ error: "Scan introuvable" }, { status: 404 });
    }
    if (scan.status === "validated") {
      return NextResponse.json({ error: "Scan déjà validé" }, { status: 409 });
    }

    let appliedCount = 0;
    for (const raw of lines) {
      const qty = Number(raw.qty);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      if (!VALID_UNITS.includes(raw.unit)) continue;

      let ingredientId = raw.ingredient_id || null;

      if (!ingredientId) {
        const cleanName = raw.name?.trim();
        if (!cleanName) continue;

        // try to find existing ingredient with same name (case-insensitive)
        const { data: match } = await supabase
          .from("ingredients")
          .select("id")
          .eq("restaurant_id", restaurant_id)
          .ilike("name", cleanName)
          .maybeSingle();

        if (match) {
          ingredientId = match.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("ingredients")
            .insert({
              restaurant_id,
              name: cleanName,
              unit: raw.unit,
              current_qty: 0,
              low_threshold: 0,
              cost_per_unit_cents:
                raw.price_cents && Number.isFinite(raw.price_cents) && raw.qty > 0
                  ? Math.round(raw.price_cents / raw.qty)
                  : null,
              supplier_id: supplier_id || null,
            })
            .select("id")
            .single();
          if (createErr || !created) continue;
          ingredientId = created.id;
        }
      }

      // bump qty
      const { data: ing } = await supabase
        .from("ingredients")
        .select("current_qty")
        .eq("id", ingredientId)
        .single();
      const currentQty = Number(ing?.current_qty ?? 0);
      await supabase
        .from("ingredients")
        .update({ current_qty: currentQty + qty })
        .eq("id", ingredientId);

      // log movement
      await supabase.from("stock_movements").insert({
        restaurant_id,
        ingredient_id: ingredientId,
        delta: qty,
        reason: "scan_in",
        delivery_scan_id: scan_id,
        created_by: access.userId,
      });

      appliedCount += 1;
    }

    await supabase
      .from("delivery_scans")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        supplier_id: supplier_id ?? null,
        total_cents: total_cents ?? null,
      })
      .eq("id", scan_id)
      .eq("restaurant_id", restaurant_id);

    return NextResponse.json({ success: true, applied: appliedCount });
  } catch (err) {
    console.error("Scan validate error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
