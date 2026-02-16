"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CustomerProfile } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { User } from "lucide-react";
import Link from "next/link";

export function CustomerAuthButton({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch restaurant by slug
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, owner_id, loyalty_enabled")
          .eq("slug", slug)
          .single();

        if (!restaurant) {
          setLoading(false);
          return;
        }

        // Check if this is a restaurant owner (admin)
        if (restaurant.owner_id === user.id) {
          setLoading(false);
          return;
        }

        const { data: customerProfile } = await supabase
          .from("customer_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (customerProfile) {
          setProfile(customerProfile as CustomerProfile);

          // Fetch wallet balance
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .eq("restaurant_id", restaurant.id)
            .single();

          if (wallet) {
            setWalletBalance(wallet.balance);
          }

          // Calculate loyalty points from paid orders
          if (restaurant.loyalty_enabled) {
            const { data: orders } = await supabase
              .from("orders")
              .select("total_price")
              .eq("restaurant_id", restaurant.id)
              .eq("customer_user_id", user.id)
              .eq("paid", true)
              .neq("status", "cancelled");

            if (orders) {
              const total = orders.reduce(
                (sum, o) => sum + Math.floor(o.total_price / 100),
                0
              );
              setPoints(total);
            }
          }
        }
      }

      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) return null;

  if (!profile) {
    return (
      <Link
        href={`/${slug}/login`}
        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted/70"
      >
        <User className="h-3.5 w-3.5" />
        Connexion
      </Link>
    );
  }

  const infoParts: string[] = [];
  if (walletBalance != null && walletBalance > 0) infoParts.push(formatPrice(walletBalance));
  if (points != null) infoParts.push(`${points} pts`);
  const infoLine = infoParts.join(" · ");

  return (
    <Link
      href={`/${slug}/account`}
      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors active:bg-muted/70"
    >
      <User className="h-3.5 w-3.5" />
      <div className="text-right">
        <span className="block max-w-[100px] truncate">{profile.full_name}</span>
        {infoLine && (
          <span className="block text-[10px] text-muted-foreground">{infoLine}</span>
        )}
      </div>
    </Link>
  );
}
