import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email, password, full_name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caracteres" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.message?.includes("already been registered")) {
        return NextResponse.json({ error: "Un compte existe deja avec cet email" }, { status: 409 });
      }
      console.error("Signup error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Create customer profile in the same request
    const { error: profileError } = await supabase
      .from("customer_profiles")
      .insert({ user_id: data.user.id, full_name: full_name.trim() });

    if (profileError) {
      console.error("Profile creation error:", profileError.message, profileError.code, profileError.details);
      // Roll back: delete the auth user so the customer can retry
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { error: `Erreur lors de la création du profil: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    console.error("Signup API error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
