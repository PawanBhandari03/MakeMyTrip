import { useEffect, useState } from "react";
import { getliveprices } from "@/api";

export type LivePrice = {
  itemId: string;
  basePrice: number;
  price: number;
  adjustmentPct: number;
  previousPrice: number;
  trend: "UP" | "DOWN" | "STABLE";
  tags: string[];
  adjustments: { code: string; label: string; percent: number; detail: string }[];
  travelDate?: string;
  available?: number;
};

const REFRESH_MS = 20000;

/**
 * Keeps the prices of the items on screen up to date. Asks the server for the current price of each
 * item now and again every 20 seconds, so a price that moves is shown as it moves.
 * `date` is the travel or check-in date for items whose price depends on it.
 */
export function useLivePrices(category: string | null, ids: string[], date?: string): Record<string, LivePrice> {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const key = ids.join(",");

  useEffect(() => {
    setPrices({});
  }, [category, date]);

  useEffect(() => {
    if (!category || ids.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const data = await getliveprices(category, ids, date);
      if (!cancelled && data) setPrices((prev) => ({ ...prev, ...data }));
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `ids` is represented by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, key, date]);

  return prices;
}
