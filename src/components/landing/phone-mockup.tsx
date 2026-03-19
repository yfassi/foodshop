"use client";

import { useState, useCallback } from "react";

/* ─── Data ─── */

interface Product {
  name: string;
  desc: string;
  price: number;
  emoji: string;
  badge?: string;
}

interface Category {
  name: string;
  emoji: string;
  products: Product[];
  featured: number[]; // indices into products for the "incontournables" row
}

const CATEGORIES: Category[] = [
  {
    name: "Burgers",
    emoji: "🍔",
    products: [
      { name: "Classic Burger", desc: "Bœuf, cheddar, salade, tomate, oignon", price: 9.9, emoji: "🍔", badge: "Best-seller" },
      { name: "Cheese Burger", desc: "Double cheddar, sauce maison", price: 10.9, emoji: "🧀" },
      { name: "Smash Burger", desc: "Double smash, sauce signature", price: 12.5, emoji: "🍔" },
      { name: "Chicken Burger", desc: "Poulet croustillant, coleslaw", price: 10.9, emoji: "🍗" },
    ],
    featured: [0, 2, 3],
  },
  {
    name: "Tacos",
    emoji: "🌮",
    products: [
      { name: "Tacos XL", desc: "Viande, fromage, sauce algérienne", price: 11.5, emoji: "🌮", badge: "Populaire" },
      { name: "Tacos Poulet", desc: "Poulet grillé, cheddar, sauce blanche", price: 9.9, emoji: "🌮" },
      { name: "Tacos Mixte", desc: "Viande & poulet, double fromage", price: 12.9, emoji: "🌮" },
    ],
    featured: [0, 2],
  },
  {
    name: "Boissons",
    emoji: "🥤",
    products: [
      { name: "Coca-Cola", desc: "33cl", price: 2.5, emoji: "🥤" },
      { name: "Milkshake", desc: "Vanille, chocolat ou fraise", price: 5.9, emoji: "🥛", badge: "Nouveau" },
      { name: "Eau minérale", desc: "50cl", price: 1.5, emoji: "💧" },
      { name: "Jus d'orange", desc: "Pressé maison", price: 3.9, emoji: "🍊" },
    ],
    featured: [1, 3],
  },
  {
    name: "Desserts",
    emoji: "🍰",
    products: [
      { name: "Tiramisu", desc: "Recette italienne maison", price: 6.5, emoji: "🍰" },
      { name: "Cookie", desc: "Chocolat noir, fleur de sel", price: 3.5, emoji: "🍪" },
      { name: "Brownie", desc: "Chocolat fondant, noix de pécan", price: 4.5, emoji: "🍫" },
    ],
    featured: [0, 2],
  },
];

/* ─── Helpers ─── */

function formatPrice(n: number) {
  return n.toFixed(2).replace(".", ",") + "€";
}

/* ─── Component ─── */

export function PhoneMockup() {
  const [activeCategory, setActiveCategory] = useState(0);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const category = CATEGORIES[activeCategory];

  const addToCart = useCallback((productName: string) => {
    setCart((prev) => ({ ...prev, [productName]: (prev[productName] || 0) + 1 }));
    setLastAdded(productName);
    setTimeout(() => setLastAdded(null), 600);
  }, []);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((total, [name, qty]) => {
    for (const cat of CATEGORIES) {
      const p = cat.products.find((p) => p.name === name);
      if (p) return total + p.price * qty;
    }
    return total;
  }, 0);

  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px] select-none" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Phone frame — thin titanium-style bezel */}
      <div className="rounded-[3rem] bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] p-[5px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3),_0_0_0_1px_rgba(255,255,255,0.05)_inset]">
        <div className="rounded-[2.7rem] bg-black p-[3px]">
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-[13px] z-20 h-[24px] w-[85px] -translate-x-1/2 rounded-full bg-black ring-1 ring-black" />

          {/* Screen */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white" style={{ height: "560px" }}>
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-5 pb-1 pt-[38px] text-[10px] font-semibold text-gray-900">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><rect x="0" y="3" width="3" height="7" rx="0.5" fill="#1a1a1a" opacity="0.3"/><rect x="3.7" y="2" width="3" height="8" rx="0.5" fill="#1a1a1a" opacity="0.5"/><rect x="7.4" y="1" width="3" height="9" rx="0.5" fill="#1a1a1a" opacity="0.7"/><rect x="11" y="0" width="3" height="10" rx="0.5" fill="#1a1a1a"/></svg>
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M6.5 1.5C8.5 1.5 10.3 2.3 11.6 3.6L12.5 2.7C10.9 1.1 8.8 0.2 6.5 0.2C4.2 0.2 2.1 1.1 0.5 2.7L1.4 3.6C2.7 2.3 4.5 1.5 6.5 1.5ZM6.5 4.5C7.7 4.5 8.8 5 9.6 5.8L10.5 4.9C9.4 3.8 8 3.2 6.5 3.2C5 3.2 3.6 3.8 2.5 4.9L3.4 5.8C4.2 5 5.3 4.5 6.5 4.5ZM6.5 7.5C7.1 7.5 7.6 7.7 8 8.1L6.5 9.8L5 8.1C5.4 7.7 5.9 7.5 6.5 7.5Z" fill="#1a1a1a"/></svg>
              <div className="flex items-center">
                <div className="h-[9px] w-[20px] rounded-[2px] border border-[#1a1a1a]/30 p-[1px]">
                  <div className="h-full w-3/4 rounded-[1px] bg-[#1a1a1a]" />
                </div>
              </div>
            </div>
          </div>

          {/* Restaurant header */}
          <div className="px-4 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--landing-primary)]/10">
                <span className="text-base">🍽️</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-900">Le Gourmet</p>
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] text-emerald-600 font-medium">Ouvert</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span className="text-[10px] text-gray-400">Rechercher un produit...</span>
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-hidden px-4 py-2 no-scrollbar">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(i)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                  i === activeCategory
                    ? "bg-[var(--landing-primary)] text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Scrollable content area */}
          <div className="overflow-y-auto no-scrollbar" style={{ height: "342px" }}>
            {/* Featured section */}
            <div className="px-4 pt-3 pb-1">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                <span>⭐</span> Nos incontournables
              </p>
            </div>

            {/* Horizontal featured cards */}
            <div className="flex gap-2.5 overflow-x-auto px-4 py-2 no-scrollbar">
              {category.featured.map((idx) => {
                const p = category.products[idx];
                return (
                  <button
                    key={p.name}
                    onClick={() => addToCart(p.name)}
                    className="group relative shrink-0 w-[100px] rounded-xl border border-gray-100 bg-white p-2 text-left transition-all duration-200 hover:shadow-md hover:border-[var(--landing-primary)]/30 active:scale-95"
                  >
                    <div className="flex h-[52px] items-center justify-center rounded-lg bg-gray-50 text-2xl">
                      {p.emoji}
                    </div>
                    <p className="mt-1.5 text-[10px] font-semibold text-gray-900 leading-tight truncate">{p.name}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-[var(--landing-primary)]">{formatPrice(p.price)}</p>
                    {/* Add indicator */}
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--landing-primary)] text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      +
                    </div>
                    {lastAdded === p.name && (
                      <div className="absolute inset-0 rounded-xl border-2 border-[var(--landing-primary)] animate-ping-once pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Full menu list */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[12px] font-bold text-gray-900">{category.name}</p>
            </div>

            <div className="space-y-2 px-4 pb-4">
              {category.products.map((p) => {
                const qty = cart[p.name] || 0;
                return (
                  <button
                    key={p.name}
                    onClick={() => addToCart(p.name)}
                    className="group flex w-full items-start gap-3 rounded-xl border border-gray-100 p-2.5 text-left transition-all duration-200 hover:shadow-md hover:border-[var(--landing-primary)]/20 active:scale-[0.98]"
                  >
                    {/* Emoji image placeholder */}
                    <div className="relative flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-lg bg-gray-50 text-2xl">
                      {p.emoji}
                      {qty > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--landing-primary)] text-[8px] font-bold text-white shadow-sm">
                          {qty}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[11px] font-bold text-gray-900">{p.name}</p>
                        {p.badge && (
                          <span className="shrink-0 rounded-full bg-[var(--landing-primary)]/10 px-1.5 py-0.5 text-[7px] font-bold text-[var(--landing-primary)]">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[9px] leading-snug text-gray-400 line-clamp-2">
                        {p.desc}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-[var(--landing-primary)]">
                        {formatPrice(p.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart bar — slides up when items in cart */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
              cartCount > 0 ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            }`}
          >
            <div className="mx-3 mb-3 flex items-center justify-between rounded-2xl bg-[var(--landing-primary)] px-4 py-3 text-white shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                  {cartCount}
                </span>
                <span className="text-[11px] font-bold">Voir mon panier</span>
              </div>
              <span className="text-[12px] font-bold">{formatPrice(cartTotal)}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Side button details */}
      <div className="absolute right-[-2px] top-[120px] h-8 w-[3px] rounded-l-sm bg-[#2a2a2a]" />
      <div className="absolute left-[-2px] top-[100px] h-6 w-[3px] rounded-r-sm bg-[#2a2a2a]" />
      <div className="absolute left-[-2px] top-[130px] h-10 w-[3px] rounded-r-sm bg-[#2a2a2a]" />
      <div className="absolute left-[-2px] top-[150px] h-10 w-[3px] rounded-r-sm bg-[#2a2a2a]" />

      {/* Glow effect */}
      <div className="absolute -inset-6 -z-10 rounded-[3.5rem] bg-[var(--landing-primary)] opacity-[0.05] blur-3xl" />
    </div>
  );
}
