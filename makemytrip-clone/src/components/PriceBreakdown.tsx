import React from "react";
import { formatINR } from "@/lib/format";

type Adjustment = { code: string; label: string; percent: number; detail: string };

const fmt = (p: number) => `${p > 0 ? "+" : "−"}${Math.abs(p) % 1 === 0 ? Math.abs(p) : Math.abs(p).toFixed(1)}%`;

/**
 * "Why is the price what it is?": the base fare, every adjustment with its reason, and the price that results.
 */
const PriceBreakdown = ({
  basePrice,
  price,
  adjustments,
  unitLabel = "",
}: {
  basePrice: number;
  price: number;
  adjustments: Adjustment[];
  unitLabel?: string;
}) => (
  <div className="text-sm">
    <div className="flex items-center justify-between py-1.5">
      <span className="text-slate-600">Base fare{unitLabel ? ` ${unitLabel}` : ""}</span>
      <span className="font-semibold">{formatINR(basePrice)}</span>
    </div>
    {adjustments.length === 0 && <p className="py-1.5 text-xs text-slate-500">This price is fixed, so nothing adjusts it.</p>}
    {adjustments.map((a, i) => (
      <div key={a.code + i} className="border-t border-dashed border-slate-200 py-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-slate-800">{a.label}</span>
          <span className={`shrink-0 font-bold ${a.percent > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(a.percent)}</span>
        </div>
        <p className="text-xs text-slate-500">{a.detail}</p>
      </div>
    ))}
    <div className="flex items-center justify-between border-t border-slate-300 pt-2">
      <span className="font-semibold">Price today{unitLabel ? ` ${unitLabel}` : ""}</span>
      <span className="text-base font-extrabold">{formatINR(price)}</span>
    </div>
  </div>
);

export default PriceBreakdown;
