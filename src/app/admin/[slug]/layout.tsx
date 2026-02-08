import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ClipboardList, UtensilsCrossed, Settings, Users } from "lucide-react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const currentUrl = headersList.get("x-url") || "";
  const isDemo = currentUrl.includes("demo=true");
  const supabase = await createClient();

  let restaurant;

  if (isDemo) {
    // Demo mode: skip auth, fetch restaurant by slug only
    const { data } = await supabase
      .from("restaurants")
      .select("id, name, is_accepting_orders")
      .eq("slug", slug)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/admin/login");

    const { data } = await supabase
      .from("restaurants")
      .select("id, name, is_accepting_orders")
      .eq("slug", slug)
      .eq("owner_id", user.id)
      .single();

    if (!data) redirect("/admin/login");
    restaurant = data;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
        <h1 className="text-lg font-bold">{restaurant.name}</h1>
        <div className="flex items-center gap-4">
          {/* Desktop nav (hidden on mobile) */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href={`/admin/${slug}${isDemo ? "?demo=true" : ""}`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <ClipboardList className="h-4 w-4" />
              Commandes
            </Link>
            <Link
              href={`/admin/${slug}/menu${isDemo ? "?demo=true" : ""}`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Menu
            </Link>
            <Link
              href={`/admin/${slug}/clients${isDemo ? "?demo=true" : ""}`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <Users className="h-4 w-4" />
              Clients
            </Link>
            <Link
              href={`/admin/${slug}/settings${isDemo ? "?demo=true" : ""}`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              <Settings className="h-4 w-4" />
              Reglages
            </Link>
          </nav>
        </div>
      </header>

      {/* Demo banner */}
      {isDemo && (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-700">
          Mode Demo
        </div>
      )}

      {/* Content */}
      <div className="pb-20 md:pb-6">{children}</div>

      {/* Bottom nav (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
        <Link
          href={`/admin/${slug}${isDemo ? "?demo=true" : ""}`}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ClipboardList className="h-5 w-5" />
          Commandes
        </Link>
        <Link
          href={`/admin/${slug}/menu${isDemo ? "?demo=true" : ""}`}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <UtensilsCrossed className="h-5 w-5" />
          Menu
        </Link>
        <Link
          href={`/admin/${slug}/clients${isDemo ? "?demo=true" : ""}`}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <Users className="h-5 w-5" />
          Clients
        </Link>
        <Link
          href={`/admin/${slug}/settings${isDemo ? "?demo=true" : ""}`}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <Settings className="h-5 w-5" />
          Reglages
        </Link>
      </nav>
    </div>
  );
}
