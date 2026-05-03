import { redirect } from "next/navigation";

export default async function RestaurantRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/restaurant/${slug}/order`);
}
