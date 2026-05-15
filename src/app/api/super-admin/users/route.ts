import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
  restaurants_owned: { id: string; name: string; slug: string }[];
  is_customer: boolean;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").toLowerCase();
  const role = searchParams.get("role") || "all"; // all | owner | customer

  const admin = createAdminClient();

  // Restaurants by owner_id
  const { data: restaurants } = await admin
    .from("restaurants")
    .select("id, name, slug, owner_id");
  const restoByOwner: Record<
    string,
    { id: string; name: string; slug: string }[]
  > = {};
  for (const r of restaurants || []) {
    if (!r.owner_id) continue;
    if (!restoByOwner[r.owner_id]) restoByOwner[r.owner_id] = [];
    restoByOwner[r.owner_id].push({ id: r.id, name: r.name, slug: r.slug });
  }

  // Customer profiles
  const { data: profiles } = await admin
    .from("customer_profiles")
    .select("user_id, full_name, phone");
  const profileByUser: Record<
    string,
    { full_name: string | null; phone: string | null }
  > = {};
  for (const p of profiles || []) {
    profileByUser[p.user_id] = {
      full_name: p.full_name,
      phone: p.phone,
    };
  }

  // Auth users — paginate
  const all: UserRow[] = [];
  let page = 1;
  const perPage = 200;
  const maxPages = 10; // safety
  while (page <= maxPages) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const u of data.users) {
      const owned = restoByOwner[u.id] || [];
      const profile = profileByUser[u.id];
      all.push({
        id: u.id,
        email: u.email || "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        restaurants_owned: owned,
        is_customer: !!profile,
      });
    }
    if (data.users.length < perPage) break;
    page++;
  }

  let filtered = all;
  if (role === "owner") {
    filtered = filtered.filter((u) => u.restaurants_owned.length > 0);
  } else if (role === "customer") {
    filtered = filtered.filter((u) => u.restaurants_owned.length === 0);
  }
  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        (u.full_name ?? "").toLowerCase().includes(search) ||
        u.restaurants_owned.some(
          (r) =>
            r.name.toLowerCase().includes(search) ||
            r.slug.toLowerCase().includes(search)
        )
    );
  }

  filtered.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({
    users: filtered,
    counts: {
      total: all.length,
      owners: all.filter((u) => u.restaurants_owned.length > 0).length,
      customers: all.filter((u) => u.restaurants_owned.length === 0).length,
    },
  });
}
