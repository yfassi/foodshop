"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bike, Loader2, ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";

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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-10">
      <AnimatedBackground />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/95 p-6 shadow-xl shadow-black/[0.04] backdrop-blur-sm sm:p-8">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bike className="h-6 w-6" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Espace livreur</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "phone"
                ? "Connectez-vous avec votre numéro"
                : "Entrez le code reçu par SMS"}
            </p>
          </div>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                Téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="+33 6 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                autoFocus
                required
                className="mt-1.5 h-12"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !phone.trim()}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Recevoir le code"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Vous recevrez un SMS avec un code à 6 chiffres
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div>
              <Label htmlFor="code" className="text-sm font-medium">
                Code SMS
              </Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                required
                className="mt-1.5 h-12 text-center text-lg font-semibold tracking-[0.4em]"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Envoyé au {phone}
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading || code.length < 4}
              className="h-12 w-full rounded-xl font-semibold"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Valider"
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setCode("");
                setStep("phone");
              }}
              className="flex h-11 w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Changer de numéro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
