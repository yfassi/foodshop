"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CustomerProfile } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { User, LogOut, Wallet as WalletIcon, Gift, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function CustomerAuthButton({ publicId }: { publicId: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);

        // Fetch restaurant by public_id
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id, owner_id, loyalty_enabled")
          .eq("public_id", publicId)
          .single();

        if (!restaurant) {
          setLoading(false);
          return;
        }

        if (restaurant.owner_id === user.id) {
          setIsOwner(true);
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

          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .eq("restaurant_id", restaurant.id)
            .single();

          if (wallet) {
            setWalletBalance(wallet.balance);
          }

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
  }, [publicId]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/restaurant/${publicId}/order`;
  };

  if (loading) return null;
  if (isOwner) return null;

  // Not authenticated: show login link
  if (!isAuthenticated) {
    return (
      <Link
        href={`/restaurant/${publicId}/login`}
        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted/70"
      >
        <User className="h-3.5 w-3.5" />
        Connexion
      </Link>
    );
  }

  // Authenticated but no customer profile yet
  if (!profile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted/70"
          >
            <User className="h-3.5 w-3.5" />
            Mon compte
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <Link
            href={`/restaurant/${publicId}/account`}
            className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Compléter mon profil
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  const initials = profile.full_name
    .split(/\s+/)
    .map((s) => s.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-muted px-2 py-1 text-xs font-medium transition-colors active:bg-muted/70"
          aria-label="Mon compte"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {initials || <User className="h-3.5 w-3.5" />}
          </span>
          <span className="hidden max-w-[110px] truncate text-left sm:block">
            <span className="block leading-tight">{profile.full_name}</span>
            {(walletBalance != null && walletBalance > 0) || points != null ? (
              <span className="block text-[10px] text-muted-foreground">
                {[
                  walletBalance != null && walletBalance > 0
                    ? formatPrice(walletBalance)
                    : null,
                  points != null ? `${points} pts` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-3 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {initials || <User className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {profile.full_name}
            </p>
            {profile.phone && (
              <p className="truncate text-[11px] text-muted-foreground">
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        {(walletBalance != null || points != null) && (
          <div className="grid grid-cols-2 gap-1.5 border-b border-border p-2">
            {walletBalance != null && (
              <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <WalletIcon className="h-3 w-3" />
                  Solde
                </div>
                <p className="mt-0.5 text-sm font-bold">
                  {formatPrice(walletBalance)}
                </p>
              </div>
            )}
            {points != null && (
              <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Gift className="h-3 w-3" />
                  Points
                </div>
                <p className="mt-0.5 text-sm font-bold">{points}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="p-1.5">
          <Link
            href={`/restaurant/${publicId}/account`}
            className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Mon compte
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Déconnexion..." : "Déconnexion"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
