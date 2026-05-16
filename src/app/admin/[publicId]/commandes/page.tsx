import { redirect } from "next/navigation";

export default async function CommandesIndex({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/admin/${publicId}/commandes/comptoir`);
}
