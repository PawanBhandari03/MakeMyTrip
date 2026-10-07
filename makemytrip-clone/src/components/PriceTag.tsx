import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Info } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { LivePrice } from "@/lib/useLivePrices";
import PriceBreakdown from "@/components/PriceBreakdown";

/**
 * A price that is kept live. Shows the current price, how it compares with the base fare, the main reasons,
 * and a "Why this price?" panel. When the price moves it flashes green (cheaper) or red (dearer).
 */
const PriceTag = ({
  basePrice,
  live,
  unitLabel,
  size = "lg",
  align = "left",
}: {
  basePrice: number;
  live?: LivePrice;
  /** e.g. "per night", shown inside the explanation. */
  unitLabel?: string;
  size?: "md" | "lg";
  align?: "left" | "right";
}) => {
  const price = live ? live.price : basePrice;
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const last = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (last.current !== null && last.current !== price) {
      setFlash(price > last.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 3500);
      last.current = price;
      return () => clearTimeout(t);
    }
    last.current = price;
  }, [price]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pct = live ? live.adjustmentPct : 0;
  const colour = flash === "up" ? "text-red-600" : flash === "down" ? "text-green-600" : "text-slate-900";

  return (
    <div ref={box} className={`relative ${align === "right" ? "md:text-right" : ""}`}>
      <div className={`flex items-baseline gap-2 ${align === "right" ? "md:justify-end" : ""}`}>
        <span className={`${size === "lg" ? "text-2xl" : "text-lg"} font-extrabold transition-colors duration-500 ${colour}`}>{formatINR(price)}</span>
        {flash && (
          <span className={`flex items-center text-xs font-bold ${flash === "up" ? "text-red-600" : "text-green-600"}`}>
            {flash === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            {flash === "up" ? "Price up" : "Price down"}
          </span>
        )}
      </div>

      {live && (
        <>
          <div className={`mt-0.5 flex flex-wrap items-center gap-1.5 ${align === "right" ? "md:justify-end" : ""}`}>
            {live.tags.map((t) => (
              <span
                key={t}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.includes("−") ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}
              >
                {t}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:underline"
              aria-expanded={open}
            >
              <Info className="h-3 w-3" /> Why this price?
            </button>
          </div>
          {pct !== 0 && (
            <div className="text-[11px] text-slate-500">
              {pct > 0 ? `${pct}% above` : `${Math.abs(pct)}% below`} the base fare of {formatINR(basePrice)}
            </div>
          )}
          {open && (
            <div
              className={`absolute z-30 mt-2 w-72 max-w-[85vw] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xl ${
                align === "right" ? "md:right-0" : "left-0"
              }`}
            >
              <PriceBreakdown basePrice={basePrice} price={live.price} adjustments={live.adjustments} unitLabel={unitLabel} />
              <p className="mt-2 text-[11px] text-slate-400">Prices refresh every few seconds and never go more than 60% above or 15% below the base fare.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PriceTag;
