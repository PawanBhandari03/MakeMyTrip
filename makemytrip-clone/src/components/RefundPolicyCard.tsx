import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";

type Props = {
  /** When the trip starts: a flight departure (with time) or a check-in / travel date. */
  travelAt?: string | null;
  /** The total the customer would pay, to turn the percentages into rupees. */
  total?: number;
  /** The non-refundable booking fee in that total, if any. */
  fee?: number;
  /** FLIGHT, TRAIN, BUS, HOTEL ... used only for the wording. */
  category?: string;
  /** When set (for example "one seat"), the rupee amounts are labelled as being for that much. */
  unitLabel?: string;
  className?: string;
};

type Window = { from: Date | null; to: Date | null; percent: number; color: string };

const HOUR = 3600 * 1000;

const money = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const stamp = (d: Date, withTime: boolean) => (withTime ? formatDateTime(d.toISOString()) : formatDate(d.toISOString()));

/**
 * The refund rules for a booking made now, laid out on the real dates, with the rupee amount for each step.
 * It uses the same percentages as the server, which makes the final decision when someone cancels.
 */
const RefundPolicyCard = ({ travelAt, total, fee = 0, category, unitLabel, className = "" }: Props) => {
  const now = new Date();
  const hasTime = !!travelAt && String(travelAt).includes("T");
  const travel = travelAt ? new Date(hasTime ? travelAt : `${travelAt}T00:00:00`) : null;
  const valid = travel && !isNaN(travel.getTime()) && travel.getTime() > now.getTime();

  const windows: Window[] = [];
  if (valid && travel) {
    const b1 = new Date(Math.min(now.getTime() + 24 * HOUR, travel.getTime()));
    const b2 = new Date(Math.max(b1.getTime(), travel.getTime() - 48 * HOUR));
    windows.push({ from: now, to: b1, percent: 50, color: "bg-emerald-500" });
    if (b2.getTime() > b1.getTime()) windows.push({ from: b1, to: b2, percent: 25, color: "bg-amber-400" });
    if (travel.getTime() > b2.getTime()) windows.push({ from: b2, to: travel, percent: 10, color: "bg-orange-500" });
    windows.push({ from: travel, to: null, percent: 0, color: "bg-red-500" });
  } else {
    windows.push({ from: null, to: null, percent: 50, color: "bg-emerald-500" });
    windows.push({ from: null, to: null, percent: 25, color: "bg-amber-400" });
    windows.push({ from: null, to: null, percent: 10, color: "bg-orange-500" });
    windows.push({ from: null, to: null, percent: 0, color: "bg-red-500" });
  }

  const label = (w: Window, i: number) => {
    if (!valid) return ["First 24 hours after booking", "More than 48 hours before travel", "Less than 48 hours before travel", "After travel has started"][i];
    if (w.percent === 0) return `After ${stamp(w.from as Date, hasTime)}`;
    if (i === 0) return `Until ${stamp(w.to as Date, true)} (first 24 hours)`;
    return `${stamp(w.from as Date, hasTime)} to ${stamp(w.to as Date, hasTime)}`;
  };

  const refundable = total && total > 0 ? Math.max(0, total - fee) : 0;
  const hasFee = fee > 0;
  const noun = category === "HOTEL" || category === "HOMESTAY" ? "stay" : "booking";

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-blue-900/5 sm:p-8 ${className}`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center text-lg font-bold">
          <ShieldCheck className="mr-2 h-5 w-5 text-emerald-600" />
          Cancellation &amp; refund policy
        </h2>
        <Link href="/info/cancellation" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Full policy
        </Link>
      </div>

      <div className="flex h-2.5 overflow-hidden rounded-full">
        {windows.map((w, i) => (
          <div key={i} className={w.color} style={{ flex: i === windows.length - 1 ? 0.6 : 1 }} />
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {windows.map((w, i) => (
          <li key={i} className="flex items-start justify-between gap-4 text-sm">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${w.color}`} />
              <span className="text-slate-700">{label(w, i)}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-semibold">{w.percent === 0 ? "No refund" : `${w.percent}% back`}</span>
              {refundable > 0 && w.percent > 0 && <div className="text-xs text-slate-500">{money((refundable * w.percent) / 100)}</div>}
            </div>
          </li>
        ))}
      </ul>

      {refundable > 0 && unitLabel && (
        <p className="mt-3 text-xs text-slate-500">Rupee amounts are for {unitLabel} at today&apos;s price.</p>
      )}

      <ul className="mt-5 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
        {hasFee && <li>• The {money(fee)} booking fee is never refunded.</li>}
        {category === "FLIGHT" && <li>• If the airline cancels the flight, you get a full refund including the fee.</li>}
        <li>• You can cancel part of a {noun} (for example one of two seats) and the refund is worked out for that part.</li>
        <li>• Refunds go back to the original payment method; the refund tracker in My Trips shows each step.</li>
      </ul>
    </div>
  );
};

export default RefundPolicyCard;
