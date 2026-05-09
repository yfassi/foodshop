"use client";

export default function RestaurantError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h2 className="mb-2 text-xl font-bold">Erreur</h2>
      <p className="mb-6 text-muted-foreground">
        Impossible de charger la page du restaurant.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Réessayer
      </button>
    </div>
  );
}
