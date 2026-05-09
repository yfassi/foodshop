"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bike, Loader2 } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Bike className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Espace livreur</h1>
          <p className="text-sm text-muted-foreground">
            {step === "phone"
              ? "Connectez-vous avec votre numéro de téléphone"
              : "Entrez le code reçu par SMS"}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                type="tel"
                placeholder="+33612345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Recevoir le code"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Code SMS</Label>
              <Input
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Valider"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Changer de numéro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
