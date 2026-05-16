"use client";

import { useEffect, useState } from "react";

// Renvoie le nombre de minutes écoulées depuis `since`, tick toutes les 30 s.
// Utiliser avec <ElapsedBadge minutes={…} /> pour un badge auto-rafraîchi.
export function useElapsedMinutes(since: string | Date | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [since]);
  if (!since) return 0;
  const ts = since instanceof Date ? since.getTime() : new Date(since).getTime();
  return (now - ts) / 60_000;
}
