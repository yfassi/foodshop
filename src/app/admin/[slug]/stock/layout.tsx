import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StockLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, stock_module_active")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/admin/login");

  // Allow access to /activation even when the module is off.
  // The page itself reads stock_module_active to render either the
  // paywall or a redirect link.
  return <>{children}</>;
}
