import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s+/g, "");
  if (trimmed.startsWith("+") && /^\+\d{6,15}$/.test(trimmed)) return trimmed;
  if (/^0\d{9}$/.test(trimmed)) return `+33${trimmed.slice(1)}`;
  return null;
}

export async function POST(request: Request) {
  try {
    const { phone, token } = await request.json();
    const phoneE164 = normalizePhone(phone);
    if (!phoneE164 || !token) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneE164,
      token: String(token),
      type: "sms",
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Code invalide" },
        { status: 401 }
      );
    }

    // Lie le user_id sur toutes les lignes drivers qui correspondent à ce phone et n'ont pas encore de user_id.
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    await admin
      .from("drivers")
      .update({ user_id: data.user.id, first_login_at: nowIso })
      .eq("phone", phoneE164)
      .is("user_id", null);

    // Retourne la liste de restaurants accessibles au livreur.
    const { data: drivers } = await admin
      .from("drivers")
      .select(
        "id, restaurant_id, is_active, restaurants:restaurant_id(public_id, name)"
      )
      .eq("user_id", data.user.id)
      .eq("is_active", true);

    return NextResponse.json({ success: true, drivers: drivers || [] });
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
