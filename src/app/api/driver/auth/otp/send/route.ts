import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  rateLimit,
  rateLimitResponse,
  getClientIp,
} from "@/lib/rate-limit";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s+/g, "");
  if (trimmed.startsWith("+") && /^\+\d{6,15}$/.test(trimmed)) return trimmed;
  if (/^0\d{9}$/.test(trimmed)) return `+33${trimmed.slice(1)}`;
  return null;
}

export async function POST(request: Request) {
  try {
    // Rate-limit: 3 OTP par phone / 10 min + 10 par IP / 10 min (protection bombe SMS)
    const ip = getClientIp(request);
    const ipRl = rateLimit(`otp-send-ip:${ip}`, 10, 10 * 60 * 1000);
    if (!ipRl.ok) return rateLimitResponse(ipRl);

    const { phone } = await request.json();
    const phoneE164 = normalizePhone(phone);
    if (!phoneE164) {
      return NextResponse.json(
        { error: "Numéro invalide" },
        { status: 400 }
      );
    }

    const phoneRl = rateLimit(`otp-send-phone:${phoneE164}`, 3, 10 * 60 * 1000);
    if (!phoneRl.ok) return rateLimitResponse(phoneRl);

    // Vérifie qu'un livreur actif existe pour ce téléphone.
    const admin = createAdminClient();
    const { data: driver } = await admin
      .from("drivers")
      .select("id")
      .eq("phone", phoneE164)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!driver) {
      return NextResponse.json(
        { error: "Aucun compte livreur trouvé pour ce numéro" },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneE164,
    });
    if (error) {
      return NextResponse.json(
        { error: error.message || "Impossible d'envoyer l'OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, phone: phoneE164 });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
