"use client";

import { StampBadge } from "./stamp-badge";

interface OrderTicket {
  number: string;
  restaurant: string;
  table: string;
  items: { qty: number; name: string; price: string }[];
  total: string;
  status: "en_cours" | "pret" | "servi";
}

const TICKETS: OrderTicket[] = [
  {
    number: "047",
    restaurant: "Le Gourmet",
    table: "Table 3",
    items: [
      { qty: 2, name: "Classic Burger", price: "19,80" },
      { qty: 1, name: "Tacos XL", price: "11,50" },
      { qty: 1, name: "Coca-Cola", price: "2,50" },
    ],
    total: "33,80",
    status: "en_cours",
  },
  {
    number: "048",
    restaurant: "Chez Marco",
    table: "Comptoir",
    items: [
      { qty: 1, name: "Margherita", price: "11,90" },
      { qty: 2, name: "Tiramisu", price: "13,00" },
    ],
    total: "24,90",
    status: "pret",
  },
  {
    number: "049",
    restaurant: "Street Wok",
    table: "Table 7",
    items: [
      { qty: 3, name: "Pad Thai", price: "35,70" },
      { qty: 3, name: "Bubble Tea", price: "16,50" },
    ],
    total: "52,20",
    status: "en_cours",
  },
  {
    number: "050",
    restaurant: "Le Petit Zinc",
    table: "Table 1",
    items: [
      { qty: 1, name: "Entrecôte", price: "22,00" },
      { qty: 1, name: "Frites maison", price: "4,50" },
      { qty: 2, name: "Verre de vin", price: "14,00" },
    ],
    total: "40,50",
    status: "servi",
  },
  {
    number: "051",
    restaurant: "Burger Factory",
    table: "À emporter",
    items: [
      { qty: 2, name: "Smash Burger", price: "19,80" },
      { qty: 1, name: "Milkshake", price: "5,90" },
    ],
    total: "25,70",
    status: "pret",
  },
  {
    number: "052",
    restaurant: "Sushi Palace",
    table: "Table 12",
    items: [
      { qty: 1, name: "Plateau 18 pcs", price: "24,90" },
      { qty: 1, name: "Edamame", price: "4,50" },
      { qty: 2, name: "Asahi", price: "11,00" },
    ],
    total: "40,40",
    status: "en_cours",
  },
];

const STATUS_MAP = {
  en_cours: { label: "EN COURS", color: "primary" as const, rotation: -6 },
  pret: { label: "PRÊT", color: "accent" as const, rotation: 8 },
  servi: { label: "SERVI", color: "primary" as const, rotation: -4 },
};

function TicketCard({ ticket }: { ticket: OrderTicket }) {
  const status = STATUS_MAP[ticket.status];

  return (
    <div className="relative w-64 shrink-0 bg-[var(--landing-ticket)] p-4 text-[var(--landing-ticket-fg)]">
      <div className="text-center font-space text-[10px] font-bold uppercase tracking-widest opacity-50">
        Ticket #{ticket.number}
      </div>
      <div className="mt-1 text-center font-space text-xs font-bold">
        {ticket.restaurant}
      </div>
      <div className="text-center text-[10px] opacity-60">{ticket.table}</div>

      <div className="my-2 border-t border-dashed border-black/20" />

      <div className="space-y-1">
        {ticket.items.map((item, i) => (
          <div key={i} className="flex justify-between text-[11px]">
            <span>
              {item.qty}x {item.name}
            </span>
            <span className="tabular-nums">{item.price}€</span>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-black/20" />

      <div className="flex justify-between font-space text-sm font-bold">
        <span>TOTAL</span>
        <span className="tabular-nums">{ticket.total}€</span>
      </div>

      <div className="absolute right-2 top-2">
        <StampBadge color={status.color} rotation={status.rotation} className="text-[8px]">
          {status.label}
        </StampBadge>
      </div>
    </div>
  );
}

export function TicketStrip() {
  // Double the tickets for seamless loop
  const allTickets = [...TICKETS, ...TICKETS];

  return (
    <div className="group overflow-hidden">
      <div className="flex gap-4 animate-ticker group-hover:[animation-play-state:paused]">
        {allTickets.map((ticket, i) => (
          <TicketCard key={i} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
