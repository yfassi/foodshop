import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountPage } from "@/components/customer/account-page";
import type { LoyaltyTier, WalletTransaction } from "@/lib/types";

export default async function CustomerAccountPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${slug}/login`);
  }

  // Fetch restaurant with loyalty config
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, loyalty_enabled, loyalty_tiers")
    .eq("slug", slug)
    .single();

  if (!restaurant) {
    redirect(`/${slug}`);
  }

  // Fetch customer profile
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id, full_name, phone, created_at")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    redirect(`/${slug}`);
  }

  // Fetch wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurant.id)
    .single();

  // Fetch wallet transactions
  let transactions: WalletTransaction[] = [];
  if (wallet) {
    const { data } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, description, order_id, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);
    transactions = (data as WalletTransaction[]) ?? [];
  }

  // Fetch orders for this restaurant
  const { data: orders } = await supabase
    .from("orders")
    .select("id, display_order_number, items, status, total_price, payment_method, order_type, payment_source, paid, wallet_amount_used, created_at")
    .eq("restaurant_id", restaurant.id)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Calculate loyalty points from paid orders
  const paidOrders = (orders ?? []).filter((o) => o.paid && o.status !== "cancelled");
  const totalPoints = paidOrders.reduce(
    (sum, o) => sum + Math.floor(o.total_price / 100),
    0
  );

  return (
    <AccountPage
      slug={slug}
      profile={{
        fullName: profile.full_name,
        phone: profile.phone,
        email: user.email ?? "",
        createdAt: profile.created_at,
      }}
      loyaltyEnabled={restaurant.loyalty_enabled}
      loyaltyTiers={(restaurant.loyalty_tiers as LoyaltyTier[]) ?? []}
      totalPoints={totalPoints}
      walletId={wallet?.id ?? null}
      walletBalance={wallet?.balance ?? 0}
      walletTransactions={transactions}
      orders={orders ?? []}
    />
  );
}
