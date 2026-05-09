import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCanonicalPublicId } from "@/lib/resolve-restaurant";

export const metadata = {
  title: "Affichage commandes — TaapR",
};

export default async function DisplayScopedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ publicId: string }>;
}) {
  const { publicId: param } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const publicId = await resolveCanonicalPublicId(supabase, param);
  if (!publicId) redirect("/admin/login");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("public_id", publicId)
    .eq("owner_id", user.id)
    .single();

  if (!restaurant) redirect("/admin/login");

  return <>{children}</>;
}
