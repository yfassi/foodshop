import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountPage } from "@/components/customer/account-page";
import { CompleteProfileForm } from "@/components/customer/complete-profile-form";
import type { LoyaltyTier, WalletTopupTier, WalletTransaction } from "@/lib/types";

export default async function CustomerAccountPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/restaurant/${publicId}/login`);
  }

  // Fetch restaurant with loyalty config
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, loyalty_enabled, loyalty_tiers, wallet_topup_enabled, wallet_topup_tiers")
    .eq("public_id", publicId)
    .single();

  if (!restaurant) {
    redirect(`/restaurant/${publicId}/order`);
  }

  // Fetch customer profile
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("id, full_name, phone, created_at")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return <CompleteProfileForm publicId={publicId} />;
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
    .select("id, display_order_number, items, status, total_price, payment_method, order_type, payment_source, paid, wallet_amount_used, loyalty_discount_amount, loyalty_points_used, created_at")
    .eq("restaurant_id", restaurant.id)
    .eq("customer_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Loyalty points: an order that *uses* a loyalty discount earns 0 points;
  // otherwise 1pt / 1€ paid. Past redemptions also burn their tier cost.
  // Cancelled orders don't count.
  const paidOrders = (orders ?? []).filter((o) => o.paid && o.status !== "cancelled");
  const earnedPoints = paidOrders.reduce(
    (sum, o) =>
      sum +
      ((o.loyalty_points_used ?? 0) > 0
        ? 0
        : Math.floor(o.total_price / 100)),
    0
  );
  const usedPoints = paidOrders.reduce(
    (sum, o) => sum + (o.loyalty_points_used ?? 0),
    0
  );
  const totalPoints = Math.max(0, earnedPoints - usedPoints);

  return (
    <AccountPage
      publicId={publicId}
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
      topupTiers={
        restaurant.wallet_topup_enabled
          ? (restaurant.wallet_topup_tiers as WalletTopupTier[]) ?? []
          : []
      }
    />
  );
}
