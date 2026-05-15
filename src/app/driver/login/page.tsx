"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bike, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function DriverLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/driver/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Code envoyé par SMS");
      setStep("code");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
    setLoading(false);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/driver/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), token: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code invalide");
      const drivers: { restaurants?: { public_id: string } | null }[] =
        data.drivers || [];
      if (drivers.length === 0) {
        toast.error("Aucun restaurant trouvé pour ce numéro");
        return;
      }
      const firstPublicId = drivers[0]?.restaurants?.public_id;
      if (drivers.length === 1 && firstPublicId) {
        router.push(`/driver/${firstPublicId}`);
      } else {
        router.push(`/driver`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
    setLoading(false);
  };

  return (
    <AuthShell
      kicker="★ ESPACE LIVREUR"
      title={
        <>
          {step === "phone" ? (
            <>
              Bonsoir, <em>connectez-vous.</em>
              <span className="dot" />
            </>
          ) : (
            <>
              Code <em>SMS.</em>
              <span className="dot" />
            </>
          )}
        </>
      }
      subtitle={
        step === "phone"
          ? "Entrez votre numéro pour recevoir un code par SMS."
          : "Entrez le code reçu sur votre téléphone."
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--paprika)]/10 text-[var(--paprika)]">
          <Bike className="h-5 w-5" />
        </div>
        <div className="font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          Connexion par SMS
        </div>
      </div>

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33612345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              className="mt-1.5 h-12"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-primary">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>Recevoir le code <span className="arrow">→</span></>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div>
            <Label htmlFor="otp-code">Code SMS</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="mt-1.5 h-12 text-center font-[family-name:var(--font-dm-mono)] tracking-[0.4em]"
            />
          </div>
          <button type="submit" disabled={loading} className="auth-primary">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>Valider <span className="arrow">→</span></>
            )}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="auth-quiet"
          >
            Changer de numéro
          </button>
        </form>
      )}
    </AuthShell>
  );
}
