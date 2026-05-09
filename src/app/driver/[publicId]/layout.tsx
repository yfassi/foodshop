import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveCanonicalPublicId } from "@/lib/resolve-restaurant";

export default async function DriverScopedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ publicId: string }>;
}) {
  const { publicId: param } = await params;
  const supabase = await createClient();

  // Resolves legacy slug → public_id and issues a redirect when needed
  const publicId = await resolveCanonicalPublicId(supabase, param);
  if (!publicId) redirect("/driver/login");

  return <>{children}</>;
}
