import { redirect } from "next/navigation";

export default async function RestaurantRootPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  redirect(`/restaurant/${publicId}/order`);
}
