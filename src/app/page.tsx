import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">FoodShop</h1>
      <p className="mb-8 text-center text-muted-foreground">
        La plateforme de commande en ligne pour les restaurants.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/admin/onboarding"
          className="rounded-lg bg-primary px-6 py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Créer mon restaurant
        </Link>
        <Link
          href="/admin/login"
          className="rounded-lg border border-border px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
