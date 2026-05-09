"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailReceiptFormProps {
  orderId: string;
}

/**
 * Shown on the order confirmation page when no email was provided at
 * checkout. Lets the customer request a receipt by email after the fact.
 */
export function EmailReceiptForm({ orderId }: EmailReceiptFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || sent) return;

    const cleaned = email.trim();
    if (!EMAIL_RE.test(cleaned)) {
      setError("Email invalide");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/orders/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, email: cleaned }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi");
      }

      setSent(true);
      toast.success("Ticket envoyé ! Vérifiez votre boîte mail.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="oc-mailcard oc-mailcard-done">
        <div className="oc-mailcard-icon">
          <Check className="h-5 w-5" strokeWidth={3} />
        </div>
        <div className="oc-mailcard-text">
          <p className="oc-mailcard-h">Ticket envoyé&nbsp;!</p>
          <p className="oc-mailcard-sub">Pensez à vérifier vos spams.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="oc-mailcard">
      <div className="oc-mailcard-head">
        <div className="oc-mailcard-icon">
          <Mail className="h-5 w-5" />
        </div>
        <div className="oc-mailcard-text">
          <p className="oc-mailcard-h">Recevoir le ticket par email</p>
          <p className="oc-mailcard-sub">
            Pratique pour garder une trace de la commande.
          </p>
        </div>
      </div>
      <div className="oc-mailcard-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          className="oc-mailcard-input"
          aria-invalid={!!error}
        />
        <button
          type="submit"
          disabled={loading}
          className="oc-mailcard-btn"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer"}
        </button>
      </div>
      {error && <p className="oc-mailcard-err">{error}</p>}
    </form>
  );
}
