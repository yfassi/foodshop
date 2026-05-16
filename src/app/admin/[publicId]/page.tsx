import { redirect } from "next/navigation";

export default async function AdminRootPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicId } = await params;
  const qs = await searchParams;
  // Preserve ?welcome=true and ?demo=true if present
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(qs)) {
    if (typeof v === "string") usp.set(k, v);
  }
  const tail = usp.toString();
  redirect(`/admin/${publicId}/commandes/comptoir${tail ? `?${tail}` : ""}`);
}
