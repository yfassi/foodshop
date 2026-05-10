import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";
import { WalletTopupEmail } from "./wallet-topup-email";

const FROM_ADDRESS = "TaapR <noreply@taapr.fr>";

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

interface SendWalletTopupOptions {
  /** UUID of the wallet_transactions row created by the topup */
  transactionId: string;
}

interface SendWalletTopupResult {
  ok: boolean;
  status: "sent" | "skipped" | "disabled" | "error";
  reason?: string;
}

/**
 * Send the wallet top-up receipt email (idempotent).
 *
 * Looks up the transaction, the wallet's owner profile and the restaurant,
 * renders the React Email template, and posts via Resend. On success sets
 * `wallet_transactions.receipt_email_sent_at` so retries don't double-send.
 *
 * Failures are logged but never throw — same contract as the order
 * confirmation sender, so callers (e.g. Stripe webhook) don't fail because
 * of an email hiccup.
 */
export async function sendWalletTopupEmail({
  transactionId,
}: SendWalletTopupOptions): Promise<SendWalletTopupResult> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn("[email] RESEND_API_KEY missing — wallet topup email skipped");
      return { ok: false, status: "disabled" };
    }

    const supabase = createAdminClient();

    const { data: tx, error: txErr } = await supabase
      .from("wallet_transactions")
      .select(
        "id, wallet_id, type, amount, balance_after, description, created_at, receipt_email_sent_at",
      )
      .eq("id", transactionId)
      .single<{
        id: string;
        wallet_id: string;
        type: string;
        amount: number;
        balance_after: number;
        description: string | null;
        created_at: string;
        receipt_email_sent_at: string | null;
      }>();

    if (txErr || !tx) {
      console.error("[email] wallet tx not found:", transactionId, txErr);
      return { ok: false, status: "error", reason: "tx-not-found" };
    }

    if (tx.type !== "topup_stripe") {
      return { ok: true, status: "skipped", reason: "not-stripe-topup" };
    }

    if (tx.receipt_email_sent_at) {
      return { ok: true, status: "skipped", reason: "already-sent" };
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("user_id, restaurant_id")
      .eq("id", tx.wallet_id)
      .single<{ user_id: string; restaurant_id: string }>();

    if (!wallet) {
      console.error("[email] wallet not found for tx:", transactionId);
      return { ok: false, status: "error", reason: "wallet-not-found" };
    }

    // The auth.users email is the canonical recipient; customer_profiles
    // gives us the first name for the greeting.
    const { data: authUser } = await supabase.auth.admin.getUserById(
      wallet.user_id,
    );
    const recipientEmail = authUser.user?.email?.trim();
    if (!recipientEmail) {
      return { ok: true, status: "skipped", reason: "no-email" };
    }

    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("full_name")
      .eq("user_id", wallet.user_id)
      .maybeSingle<{ full_name: string }>();
    const customerFirstName =
      profile?.full_name?.trim().split(/\s+/)[0] ?? undefined;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", wallet.restaurant_id)
      .single<{ name: string }>();
    if (!restaurant) {
      console.error("[email] restaurant not found for tx:", transactionId);
      return { ok: false, status: "error", reason: "restaurant-not-found" };
    }

    // Pull "amount paid" vs "bonus offered" out of the description string
    // when present — falls back to amount-only if no bonus was applied.
    // The webhook formats descriptions as e.g.
    //   "Recharge 20.00 € + 5.00 € offerts"
    let baseAmountCents = tx.amount;
    let bonusCents = 0;
    const match = tx.description?.match(
      /Recharge\s+([0-9]+(?:\.[0-9]+)?)\s*€\s*\+\s*([0-9]+(?:\.[0-9]+)?)\s*€\s*offerts/i,
    );
    if (match) {
      baseAmountCents = Math.round(parseFloat(match[1]) * 100);
      bonusCents = Math.round(parseFloat(match[2]) * 100);
    }

    const topupDate = new Date(tx.created_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const topupTime = new Date(tx.created_at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `Recharge confirmée chez ${restaurant.name} · +${formatPrice(tx.amount)}`,
      react: WalletTopupEmail({
        customerFirstName,
        restaurantName: restaurant.name,
        amountLabel: formatPrice(baseAmountCents),
        bonusLabel: bonusCents > 0 ? `+ ${formatPrice(bonusCents)}` : null,
        totalCreditedLabel: formatPrice(tx.amount),
        newBalanceLabel: formatPrice(tx.balance_after),
        topupDate,
        topupTime,
      }),
    });

    if (error) {
      console.error("[email] resend send failed:", error);
      return { ok: false, status: "error", reason: error.message };
    }

    await supabase
      .from("wallet_transactions")
      .update({ receipt_email_sent_at: new Date().toISOString() })
      .eq("id", tx.id)
      .is("receipt_email_sent_at", null);

    return { ok: true, status: "sent" };
  } catch (err) {
    console.error("[email] wallet topup unexpected error:", err);
    return {
      ok: false,
      status: "error",
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}
