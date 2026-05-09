import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return { user: null, error: NextResponse.json({ error: "Non autorise" }, { status: 403 }) };
  }
  return { user, error: null };
}

export async function GET() {
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_demo_customers")
    .select("email, added_at, note")
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { user, error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const body = (await request.json()) as { email?: string; note?: string };
  const email = body.email?.trim().toLowerCase();
  const note = body.note?.trim() || null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_demo_customers")
    .upsert({ email, note, added_by: user!.id }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_demo_customers")
    .delete()
    .eq("email", email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
