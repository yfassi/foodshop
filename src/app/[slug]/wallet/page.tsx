import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WalletLive } from "@/components/wallet/wallet-live";
import type { WalletTransaction } from "@/lib/types";

export default async function WalletPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${slug}/login`);
  }

  // Get restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!restaurant) {
    redirect(`/${slug}`);
  }

  // Get wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id, balance")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurant.id)
    .single();

  // Get transactions
  let transactions: WalletTransaction[] = [];
  if (wallet) {
    const { data } = await supabase
      .from("wallet_transactions")
      .select(
        "id, type, amount, balance_after, description, order_id, created_at"
      )
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);

    transactions = (data as WalletTransaction[]) ?? [];
  }

  return (
    <WalletLive
      slug={slug}
      walletId={wallet?.id ?? null}
      initialBalance={wallet?.balance ?? 0}
      initialTransactions={transactions}
    />
  );
}
