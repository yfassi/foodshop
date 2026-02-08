import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { user_id, full_name } = await request.json();

    if (!user_id || !full_name?.trim()) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify the user actually exists in auth.users
    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(user_id);

    if (authError || !authUser?.user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Check if profile already exists
    const { data: existing } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase.from("customer_profiles").insert({
      user_id,
      full_name: full_name.trim(),
    });

    if (error) {
      console.error("Profile creation error:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Profile API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
