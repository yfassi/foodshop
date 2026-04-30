import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="footer">
      <div className="ft-grid">
        <div className="ft-brand">
          <div className="logo logo-light">
            <span className="logo-word">taapr</span>
            <span className="logo-dot" />
          </div>
          <div className="ft-script">service compris.</div>
          <p>La suite tout-en-un pour les restos indépendants. Faite à Lyon.</p>
        </div>

        <div className="ft-col">
          <div className="ft-h">PRODUIT</div>
          <Link href="/#features">Commandes</Link>
          <Link href="/livraison">Livraison</Link>
          <Link href="/stock">Stock</Link>
          <Link href="/#pricing">Tarifs</Link>
        </div>
        <div className="ft-col">
          <div className="ft-h">RESSOURCES</div>
          <Link href="/#faq">Centre d&apos;aide</Link>
          <a href="mailto:contact@taapr.com">Contact</a>
          <a href="#">Blog</a>
          <a href="#">Statut · live</a>
        </div>
        <div className="ft-col">
          <div className="ft-h">TAAPR</div>
          <a href="#">À propos</a>
          <Link href="/#testimonials">Témoignages</Link>
          <a href="#">Carrières · 3</a>
          <a href="#">Presse</a>
          <a href="mailto:contact@taapr.com">Contact</a>
        </div>
      </div>
      <div className="ft-bottom">
        <span>© 2026 TAAPR · FAIT À LYON, AVEC AMOUR</span>
        <span className="ft-stars">★ ★ ★</span>
        <span>CONFIDENTIALITÉ · CGU · MENTIONS</span>
      </div>
    </footer>
  );
}
