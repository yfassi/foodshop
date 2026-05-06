import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StockAccess =
  | { ok: true; userId: string; restaurantId: string; moduleActive: boolean }
  | { ok: false; status: number; error: string };

/**
 * Verifies the user owns the restaurant AND the stock module is active.
 * Pass `requireActive=false` for endpoints that must work pre-subscription
 * (e.g. /subscribe).
 */
export async function verifyStockAccess(
  restaurantId: string,
  options: { requireActive?: boolean } = {}
): Promise<StockAccess> {
  const requireActive = options.requireActive ?? true;
  if (!restaurantId) {
    return { ok: false, status: 400, error: "Restaurant manquant" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Non connecté" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("restaurants")
    .select("id, stock_module_active")
    .eq("id", restaurantId)
    .eq("owner_id", user.id)
    .single();

  if (error || !data) {
    return { ok: false, status: 403, error: "Non autorisé" };
  }
  if (requireActive && !data.stock_module_active) {
    return { ok: false, status: 402, error: "Module Stock non activé" };
  }

  return {
    ok: true,
    userId: user.id,
    restaurantId: data.id,
    moduleActive: data.stock_module_active,
  };
}
