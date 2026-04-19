import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Bike, ChevronRight } from "lucide-react";

export default async function DriverHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/driver/login");

  const admin = createAdminClient();
  const { data: drivers } = await admin
    .from("drivers")
    .select("id, is_active, restaurants:restaurant_id(slug, name)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  type DriverRow = { id: string; restaurants: { slug: string; name: string } | { slug: string; name: string }[] | null };
  const list: { id: string; slug: string; name: string }[] = ((drivers || []) as unknown as DriverRow[])
    .map((d) => {
      const r = Array.isArray(d.restaurants) ? d.restaurants[0] : d.restaurants;
      return r ? { id: d.id, slug: r.slug, name: r.name } : null;
    })
    .filter((x): x is { id: string; slug: string; name: string } => x !== null);

  if (list.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Aucun restaurant ne vous a invité comme livreur.
          </p>
          <Link
            href="/driver/login"
            className="mt-3 inline-block text-sm font-medium text-primary"
          >
            Changer de numéro
          </Link>
        </div>
      </div>
    );
  }

  if (list.length === 1) {
    redirect(`/driver/${list[0].slug}`);
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bike className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Choisissez un restaurant</h1>
          <p className="text-xs text-muted-foreground">
            Vous êtes livreur pour plusieurs établissements
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {list.map((d) => (
          <Link
            key={d.id}
            href={`/driver/${d.slug}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-sm font-semibold">{d.name}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
