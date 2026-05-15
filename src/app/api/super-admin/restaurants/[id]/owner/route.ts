import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

interface OwnerBody {
  email?: string;
  password?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function ensureSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return null;
  }
  return user;
}

// Create or replace the owner with a brand-new auth user (email + password
// chosen by the super admin). If the restaurant already has an owner, the
// existing auth user is left intact (orphaned) and a new one becomes owner.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await ensureSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as OwnerBody | null;

  if (!body || !body.email || !body.password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caracteres" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: restaurant, error: fetchError } = await admin
    .from("restaurants")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !restaurant) {
    return NextResponse.json(
      { error: "Restaurant non trouve" },
      { status: 404 }
    );
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created?.user) {
    console.error("Super-admin create owner error:", createError);
    const msg = createError?.message?.toLowerCase().includes("already")
      ? "Un utilisateur avec cet email existe deja"
      : "Impossible de creer l'utilisateur";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("restaurants")
    .update({ owner_id: created.user.id })
    .eq("id", id);

  if (updateError) {
    // Best-effort rollback of the auth user we just created.
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    console.error("Super-admin assign owner error:", updateError);
    return NextResponse.json(
      { error: "Erreur lors de l'assignation du proprietaire" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    owner: { id: created.user.id, email: created.user.email },
  });
}

// Update the existing owner: change email and/or reset password.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await ensureSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as OwnerBody | null;

  if (!body || (!body.email && !body.password)) {
    return NextResponse.json(
      { error: "Email ou mot de passe requis" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: restaurant, error: fetchError } = await admin
    .from("restaurants")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (fetchError || !restaurant) {
    return NextResponse.json(
      { error: "Restaurant non trouve" },
      { status: 404 }
    );
  }

  if (!restaurant.owner_id) {
    return NextResponse.json(
      { error: "Aucun proprietaire — utilisez la creation" },
      { status: 400 }
    );
  }

  const update: { email?: string; password?: string; email_confirm?: boolean } =
    {};

  if (body.email) {
    const email = body.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    update.email = email;
    update.email_confirm = true;
  }

  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caracteres" },
        { status: 400 }
      );
    }
    update.password = body.password;
  }

  const { data: updated, error: updateError } =
    await admin.auth.admin.updateUserById(restaurant.owner_id, update);

  if (updateError || !updated?.user) {
    console.error("Super-admin update owner error:", updateError);
    const msg = updateError?.message?.toLowerCase().includes("already")
      ? "Cet email est deja utilise"
      : "Impossible de mettre a jour l'utilisateur";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    owner: { id: updated.user.id, email: updated.user.email },
  });
}
