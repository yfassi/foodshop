"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function CompleteProfileForm({ publicId }: { publicId: string }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expirée, veuillez vous reconnecter");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("customer_profiles").insert({
      user_id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
    });

    if (error) {
      toast.error("Erreur lors de la création du profil");
      setLoading(false);
      return;
    }

    toast.success("Profil créé !");
    window.location.reload();
  };

  return (
    <div className="px-4 py-8">
      <Link
        href={`/restaurant/${publicId}/order`}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <h2 className="mb-2 text-xl font-bold">Complétez votre profil</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Renseignez votre nom pour accéder à votre espace client.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="text-sm font-medium">
            Prénom / Nom
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Votre prénom"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            Téléphone (optionnel)
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            className="mt-1.5 h-12"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !fullName.trim()}
          className="h-12 w-full rounded-xl font-semibold"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuer
        </Button>
      </form>
    </div>
  );
}
