import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/super-admin";
import { SuperAdminNav } from "./nav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    redirect("/super-admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminNav email={user.email!} />
      <div className="pb-20 md:pb-6">{children}</div>
    </div>
  );
}
