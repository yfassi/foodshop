import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurant_id");
  if (!restaurantId) {
    return NextResponse.json({ error: "restaurant_id manquant" }, { status: 400 });
  }
  const access = await verifyStockAccess(restaurantId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  return NextResponse.json({ suppliers: data });
}

export async function POST(request: Request) {
  try {
    const { restaurant_id, name, phone, email, notes } = await request.json();
    if (!restaurant_id || !name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Nom trop long" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        restaurant_id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supplier insert error:", error);
      return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, restaurant_id, name, phone, email, notes } = body;
    if (!id || !restaurant_id) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    const access = await verifyStockAccess(restaurant_id);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const updates: Record<string, unknown> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.length > 120) {
        return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
      }
      updates.name = name.trim();
    }
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (email !== undefined) updates.email = email?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", id)
      .eq("restaurant_id", restaurant_id);

    if (error) return NextResponse.json({ error: "Erreur" }, { status: 500 });
    return NextResponse.json({ success: true });
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
      .from("suppliers")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) return NextResponse.json({ error: "Erreur" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
