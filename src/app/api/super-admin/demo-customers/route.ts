import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Readable charset: no 0/O/1/l/I to avoid copy/dictation mistakes
const PASSWORD_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 12) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return out;
}

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

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  // listUsers paginates; the demo whitelist is small but supabase has no
  // server-side filter on email, so we paginate until match or end.
  let page = 1;
  // perPage max is 1000 in supabase-js; 200 keeps responses snappy
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
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

  // Whitelist upsert (idempotent)
  const { error: whitelistError } = await admin
    .from("platform_demo_customers")
    .upsert({ email, note, added_by: user!.id }, { onConflict: "email" });

  if (whitelistError) {
    return NextResponse.json({ error: whitelistError.message }, { status: 500 });
  }

  // Ensure a real Supabase auth user exists so the demo customer can log in
  // and request a password reset. Only generate a password when we actually
  // create the account — never silently overwrite an existing password.
  let existing;
  try {
    existing = await findAuthUserByEmail(admin, email);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur Supabase" },
      { status: 500 }
    );
  }

  if (existing) {
    return NextResponse.json({ created: false });
  }

  const password = generatePassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }

  // Match the customer signup flow: every customer needs a profile row
  const { error: profileError } = await admin
    .from("customer_profiles")
    .insert({ user_id: created.user.id, full_name: email.split("@")[0] });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `Erreur création profil: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ created: true, password });
}

export async function PATCH(request: Request) {
  const { error: authError } = await requireSuperAdmin();
  if (authError) return authError;

  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Only allow regenerating passwords for users that are explicitly in the
  // demo whitelist — refuse to touch arbitrary auth accounts.
  const { data: whitelisted } = await admin
    .from("platform_demo_customers")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (!whitelisted) {
    return NextResponse.json({ error: "Email pas en whitelist démo" }, { status: 404 });
  }

  let existing;
  try {
    existing = await findAuthUserByEmail(admin, email);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur Supabase" },
      { status: 500 }
    );
  }

  const password = generatePassword();

  if (existing) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      password,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ password });
  }

  // Auth user missing (e.g. legacy whitelist entry from before this feature):
  // create it now so the demo customer can actually log in.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }

  const { error: profileError } = await admin
    .from("customer_profiles")
    .insert({ user_id: created.user.id, full_name: email.split("@")[0] });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: `Erreur création profil: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ password });
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
