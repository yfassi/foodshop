"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

// Cette page a fusionné avec /articles (Tabs shadcn en haut). Redirect
// transparent pour les bookmarks et liens externes existants — préserve les
// query params (notamment ?g=<groupId> pour ouvrir un groupe spécifique).
export default function OptionsDeMenuRedirectPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const preserved = new URLSearchParams(searchParams.toString());
    preserved.set("tab", "options");
    router.replace(
      `/admin/${params.publicId}/articles?${preserved.toString()}`,
    );
  }, [searchParams, router, params.publicId]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
