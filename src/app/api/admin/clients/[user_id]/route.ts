import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function authorize(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("restaurant_slug");
  if (!restaurantSlug) {
    return { error: NextResponse.json({ error: "Slug manquant" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Non autorise" }, { status: 401 }) };
  }
  const adminSupabase = createAdminClient();
  const { data: restaurant } = await adminSupabase
    .from("restaurants")
    .select("id, owner_id")
    .eq("slug", restaurantSlug)
    .single();
  if (!restaurant || restaurant.owner_id !== user.id) {
    return { error: NextResponse.json({ error: "Non autorise" }, { status: 403 }) };
  }
  return { adminSupabase, restaurantId: restaurant.id, ownerId: user.id };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await params;
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const { adminSupabase, restaurantId } = auth;

  // Profil + email
  const { data: profile } = await adminSupabase
    .from("customer_profiles")
    .select("user_id, full_name, phone, created_at")
    .eq("user_id", user_id)
    .maybeSingle();

  const { data: userData } = await adminSupabase.auth.admin.getUserById(user_id);
  const email = userData?.user?.email || "";
  const createdAt = userData?.user?.created_at || profile?.created_at || null;

  // Wallet
  const { data: wallet } = await adminSupabase
    .from("wallets")
    .select("id, balance, created_at, updated_at")
    .eq("user_id", user_id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  // Transactions wallet
  let transactions: unknown[] = [];
  if (wallet) {
    const { data: tx } = await adminSupabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, description, order_id, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(200);
    transactions = tx || [];
  }

  // Commandes pour ce resto
  const { data: orders } = await adminSupabase
    .from("orders")
    .select("id, order_number, display_order_number, status, total_price, items, created_at, payment_method, paid")
    .eq("restaurant_id", restaurantId)
    .eq("customer_user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Stats agrégées
  const okOrders = (orders || []).filter((o) => o.status !== "cancelled");
  const totalSpent = okOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const orderCount = okOrders.length;
  const lastOrderAt = okOrders[0]?.created_at || null;
  const firstOrderAt = okOrders.length > 0 ? okOrders[okOrders.length - 1].created_at : null;
  const avgTicket = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

  return NextResponse.json({
    user_id,
    email,
    full_name: profile?.full_name || "Client",
    phone: profile?.phone || null,
    created_at: createdAt,
    wallet: wallet
      ? { id: wallet.id, balance: wallet.balance, updated_at: wallet.updated_at }
      : null,
    stats: {
      order_count: orderCount,
      total_spent: totalSpent,
      avg_ticket: avgTicket,
      first_order_at: firstOrderAt,
      last_order_at: lastOrderAt,
    },
    transactions,
    orders: orders || [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await params;
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const { adminSupabase } = auth;

  const body = (await request.json()) as {
    full_name?: string;
    phone?: string | null;
    email?: string;
  };

  // Update auth.users email si fourni
  if (body.email !== undefined) {
    const { error } = await adminSupabase.auth.admin.updateUserById(user_id, {
      email: body.email,
      email_confirm: true,
    });
    if (error) {
      return NextResponse.json(
        { error: `Email: ${error.message}` },
        { status: 400 }
      );
    }
  }

  // Upsert profile
  const profileUpdates: Record<string, unknown> = {};
  if (body.full_name !== undefined) profileUpdates.full_name = body.full_name;
  if (body.phone !== undefined) profileUpdates.phone = body.phone;
  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await adminSupabase
      .from("customer_profiles")
      .upsert(
        { user_id, full_name: body.full_name || "Client", ...profileUpdates },
        { onConflict: "user_id" }
      );
    if (error) {
      return NextResponse.json(
        { error: `Profil: ${error.message}` },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await params;
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const { adminSupabase, restaurantId } = auth;

  // Sécurité : on ne supprime pas un user qui a des orders ailleurs
  const { count: otherOrders } = await adminSupabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_user_id", user_id)
    .neq("restaurant_id", restaurantId);

  // Wipe scope resto : wallet + transactions + orders.customer_user_id
  const { data: wallet } = await adminSupabase
    .from("wallets")
    .select("id")
    .eq("user_id", user_id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (wallet) {
    await adminSupabase.from("wallet_transactions").delete().eq("wallet_id", wallet.id);
    await adminSupabase.from("wallets").delete().eq("id", wallet.id);
  }

  // Détacher les orders de ce resto plutôt que de les supprimer (on garde l'historique commercial)
  await adminSupabase
    .from("orders")
    .update({ customer_user_id: null })
    .eq("customer_user_id", user_id)
    .eq("restaurant_id", restaurantId);

  // Si pas d'orders ailleurs, on supprime le user complètement
  if ((otherOrders || 0) === 0) {
    await adminSupabase.from("customer_profiles").delete().eq("user_id", user_id);
    await adminSupabase.auth.admin.deleteUser(user_id);
    return NextResponse.json({ success: true, fully_deleted: true });
  }

  return NextResponse.json({ success: true, fully_deleted: false });
}
