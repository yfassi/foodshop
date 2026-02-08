"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { DAYS_FR } from "@/lib/constants";

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", params.slug)
        .single<Restaurant>();

      setRestaurant(data);
      setLoading(false);
    };
    fetch();
  }, [params.slug]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  if (loading || !restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <h2 className="mb-4 text-lg font-bold">Reglages</h2>

      <div className="mx-auto max-w-lg space-y-4">
        {/* Restaurant info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Informations</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-bold">Nom :</span> {restaurant.name}
            </p>
            <p>
              <span className="font-bold">Adresse :</span>{" "}
              {restaurant.address || "Non renseigne"}
            </p>
            <p>
              <span className="font-bold">Telephone :</span>{" "}
              {restaurant.phone || "Non renseigne"}
            </p>
          </div>
        </div>

        {/* Opening hours */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Horaires</h3>
          <div className="space-y-1 text-sm">
            {Object.entries(DAYS_FR).map(([key, label]) => {
              const hours = restaurant.opening_hours?.[key];
              return (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{label}</span>
                  <span>
                    {hours
                      ? `${hours.open} - ${hours.close}`
                      : "Ferme"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="h-12 w-full rounded-xl font-medium"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Deconnexion
        </Button>
      </div>
    </div>
  );
}
