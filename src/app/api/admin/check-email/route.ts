import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
    }

    const resp = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        cache: "no-store",
      }
    );

    if (!resp.ok) {
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    const data = (await resp.json()) as { users?: { email?: string }[] };
    const target = email.toLowerCase();
    const exists = Array.isArray(data?.users) && data.users.some((u) => u.email?.toLowerCase() === target);
    return NextResponse.json({ exists });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
