import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function ensureOwnership(driverId: string, userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("drivers")
    .select("id, restaurant_id, restaurants:restaurant_id(owner_id)")
    .eq("id", driverId)
    .single();
  const owner = (data?.restaurants as { owner_id?: string } | null)?.owner_id;
  if (!data || owner !== userId) return null;
  return data;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const driver = await ensureOwnership(id, user.id);
    if (!driver) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const update: Record<string, unknown> = {};
    if (typeof body.full_name === "string") update.full_name = body.full_name.trim();
    if (typeof body.vehicle === "string") update.vehicle = body.vehicle.trim() || null;
    if (typeof body.is_active === "boolean") update.is_active = body.is_active;

    const supabase = createAdminClient();
    const { error } = await supabase.from("drivers").update(update).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("driver PATCH error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const driver = await ensureOwnership(id, user.id);
    if (!driver) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("driver DELETE error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
