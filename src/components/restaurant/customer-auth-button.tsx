"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import type { CustomerProfile } from "@/lib/types";
import { TopupDrawer } from "@/components/wallet/topup-drawer";
import { User, LogOut, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export function CustomerAuthButton({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if this is a restaurant owner (admin)
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", user.id)
          .single();

        if (restaurant) {
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
          const res = await fetch(
            `/api/wallet/balance?restaurant_slug=${slug}`
          );
          const data = await res.json();
          setBalance(data.balance || 0);
        }
      }

      setLoading(false);
    };

    load();
  }, [slug]);

  // Handle wallet topup success
  useEffect(() => {
    if (searchParams.get("wallet_topup") === "success") {
      toast.success("Solde recharge avec succes !");
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    setMenuOpen(false);
    router.refresh();
  };

  if (loading) return null;

  if (!profile) {
    return (
      <Link
        href={`/${slug}/login`}
        className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <User className="h-3.5 w-3.5" />
        Se connecter
      </Link>
    );
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <User className="h-3.5 w-3.5" />
          <span className="max-w-[100px] truncate">{profile.full_name}</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-card p-1 shadow-lg">
            {/* Balance */}
            <div className="border-b border-border px-3 py-2">
              <p className="text-xs text-muted-foreground">Solde</p>
              <p className="text-sm font-bold text-primary">
                {formatPrice(balance)}
              </p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                setTopupOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <Wallet className="h-3.5 w-3.5" />
              Recharger
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-accent"
            >
              <LogOut className="h-3.5 w-3.5" />
              Deconnexion
            </button>
          </div>
        )}
      </div>

      <TopupDrawer
        slug={slug}
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
      />
    </>
  );
}
