"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AdminSignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/onboarding");
  }, [router]);

  return (
    <AuthShell
      kicker="★ INSCRIPTION"
      title={
        <>
          On vous emmène à <em>l&apos;onboarding…</em>
        </>
      }
      showStamp={false}
    >
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--paprika)]" />
      </div>
    </AuthShell>
  );
}
