"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";

type Period = "day" | "week" | "month";

interface Earnings {
  period: Period;
  deliveriesCount: number;
  totalFees: number;
  totalTips: number;
  gross: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
};

export default function DriverEarningsPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("day");
  const [data, setData] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/driver/earnings?restaurant_public_id=${encodeURIComponent(params.publicId)}&period=${period}`
      );
      if (res.status === 401) {
        router.push("/driver/login");
        return;
      }
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [params.publicId, period, router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/driver/${params.publicId}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold">Mes gains</p>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(["day", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                period === p
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-xs uppercase tracking-wider opacity-80">
                Total brut
              </p>
              <p className="mt-1 text-3xl font-bold">
                {formatPrice(data.gross)}
              </p>
              <p className="mt-2 text-xs opacity-80">
                À encaisser auprès du restaurant
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Livraisons" value={data.deliveriesCount.toString()} />
              <Stat label="Frais" value={formatPrice(data.totalFees)} />
              <Stat label="Pourboires" value={formatPrice(data.totalTips)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
