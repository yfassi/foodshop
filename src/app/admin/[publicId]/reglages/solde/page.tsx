"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TopupTierBuilder } from "@/components/admin/topup-tier-builder";
import type { WalletTopupTier } from "@/lib/types";

export default function SoldePage() {
  const params = useParams<{ publicId: string }>();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<WalletTopupTier[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id, wallet_topup_enabled, wallet_topup_tiers")
        .eq("public_id", params.publicId)
        .single();
      if (data) {
        setRestaurantId(data.id);
        setEnabled(data.wallet_topup_enabled ?? false);
        setTiers((data.wallet_topup_tiers as WalletTopupTier[]) ?? []);
      }
      setLoading(false);
      setTimeout(() => {
        hasLoaded.current = true;
      }, 1500);
    };
    load();
  }, [params.publicId]);

  const save = useCallback(
    async (next: { enabled: boolean; tiers: WalletTopupTier[] }) => {
      if (!hasLoaded.current || !restaurantId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("restaurants")
        .update({
          wallet_topup_enabled: next.enabled,
          wallet_topup_tiers: next.tiers,
        })
        .eq("id", restaurantId);
      if (error) toast.error("Erreur lors de la sauvegarde");
      else toast.success("Enregistré");
    },
    [restaurantId],
  );

  useEffect(() => {
    if (!hasLoaded.current) return;
    const id = setTimeout(() => save({ enabled, tiers }), 600);
    return () => clearTimeout(id);
  }, [enabled, tiers, save]);

  if (loading || !restaurantId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="Réglages"
        icon={Wallet}
        title="Solde client"
        subtitle="Bonus de recharge pour inciter vos clients à pré-créditer leur solde."
      />

      <div className="space-y-4">
        <Card size="sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm">Recharge de solde</CardTitle>
                <CardDescription className="text-xs">
                  Proposez des bonus pour inciter vos clients à recharger leur portefeuille.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Activer les bonus de recharge"
              />
            </CardAction>
          </CardHeader>
        </Card>
        {enabled && (
          <TopupTierBuilder tiers={tiers} onChange={setTiers} />
        )}
      </div>
    </div>
  );
}
