"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function CustomerSignupPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    switch (field) {
      case "password":
        if (value && value.length < 6) {
          newErrors.password = "Min. 6 caractères";
        } else {
          delete newErrors.password;
        }
        // Re-validate confirm if it has a value
        if (confirmPassword && value !== confirmPassword) {
          newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      case "confirmPassword":
        if (value && value !== password) {
          newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setErrors((prev) => ({ ...prev, password: "Min. 6 caractères" }));
      return;
    }

    if (password !== confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Les mots de passe ne correspondent pas",
      }));
      return;
    }

    setLoading(true);

    // Create user + profile via API (auto-confirms email)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName.trim() }),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error || "Erreur lors de la création du compte");
      setLoading(false);
      return;
    }

    // Sign in to get a session
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      toast.error(signInError.message);
      setLoading(false);
      return;
    }

    toast.success("Compte créé avec succès !");
    window.location.href = `/restaurant/${publicId}/order`;
  };

  return (
    <AuthShell
      kicker="★ NOUVEAU CLIENT"
      title={
        <>
          Créez votre <em>compte.</em>
          <span className="dot" />
        </>
      }
      subtitle="On garde vos commandes et vos points de fidélité au chaud."
      backHref={`/restaurant/${publicId}/order`}
      backLabel="Retour au menu"
      brandHref={null}
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href={`/restaurant/${publicId}/login`} className="as-link">
            Connexion →
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">
            Prénom / Nom <span className="text-[var(--paprika)]">*</span>
          </Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Prénom"
            autoComplete="name"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <div>
          <Label htmlFor="email">
            Email <span className="text-[var(--paprika)]">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            autoComplete="email"
            required
            className="mt-1.5 h-12"
          />
        </div>

        <div>
          <Label htmlFor="password">
            Mot de passe <span className="text-[var(--paprika)]">*</span>
          </Label>
          <div className="relative mt-1.5">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => validateField("password", password)}
              placeholder="Min. 6 caractères"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              required
              className="h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-[var(--ink-mute)] transition-colors hover:text-[var(--paprika)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="auth-error" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">
            Confirmer le mot de passe <span className="text-[var(--paprika)]">*</span>
          </Label>
          <div className="relative mt-1.5">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => validateField("confirmPassword", confirmPassword)}
              placeholder="Répéter le mot de passe"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              required
              className="h-12 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-[var(--ink-mute)] transition-colors hover:text-[var(--paprika)]"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" className="auth-error" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !fullName || !email || !password || !confirmPassword}
          className="auth-primary"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Créer mon compte <span className="arrow">→</span></>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
