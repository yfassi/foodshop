"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PrinterManager } from "@/components/admin/printer-manager";

export default function MaterielPage() {
  const params = useParams<{ publicId: string }>();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id")
        .eq("public_id", params.publicId)
        .single();
      if (data) setRestaurantId(data.id);
      setLoading(false);
    };
    load();
  }, [params.publicId]);

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
        icon={Printer}
        title="Matériel"
        subtitle="Imprimantes thermiques et station d'impression USB."
      />
      <PrinterManager restaurantId={restaurantId} />
    </div>
  );
}
