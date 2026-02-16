"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h2 className="mb-2 text-xl font-bold">Une erreur est survenue</h2>
      <p className="mb-6 text-muted-foreground">
        Quelque chose s&apos;est mal passé. Veuillez réessayer.
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
