import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Lock, Snowflake } from "lucide-react";
import { getfreezes } from "@/api";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";

const bookLink = (f: any) => {
  switch (f.category) {
    case "FLIGHT":
      return `/book-flight/${f.itemId}?qty=${f.quantity}`;
    case "HOTEL":
      return `/book-hotel/${f.itemId}?rooms=${f.quantity}&checkIn=${f.travelDate}`;
    case "HOMESTAY":
      return `/book/${f.itemId}?qty=${f.quantity}&checkIn=${f.travelDate}`;
    default:
      return `/book/${f.itemId}?qty=${f.quantity}&date=${f.travelDate}`;
  }
};

const left = (iso: string) => {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
  const h = Math.floor(mins / 60);
  return h >= 1 ? `${h}h ${mins % 60}m left` : `${mins} min left`;
};

const STATUS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  USED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-slate-100 text-slate-600",
};

/** The customer's price freezes, with what each one is protecting them from. */
const PriceFreezeList = () => {
  const user = useSelector((state: any) => state.user.user);
  const [freezes, setFreezes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setFreezes(await getfreezes(user.id));
    } catch (e) {
      // the next refresh will try again
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (loading || freezes.length === 0) return null;

  return (
    <div id="freezes" className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60">
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <Snowflake className="h-6 w-6 text-indigo-600" /> Price freezes
      </h2>
      <p className="mb-5 text-sm text-slate-500">Prices you have locked. The freeze fee is credited when you book before it ends.</p>
      <div className="space-y-3">
        {freezes.map((f) => (
          <div key={f.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold">{f.itemName}</h3>
                <p className="text-sm text-slate-500">
                  {f.quantity} × {formatINR(f.unitPrice)} · {formatDate(f.travelDate)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[f.status] || STATUS.EXPIRED}`}>
                {f.status === "ACTIVE" ? `Active · ${left(f.expiresAt)}` : f.status === "USED" ? "Used for a booking" : "Expired"}
              </span>
            </div>

            {f.status === "ACTIVE" && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className={f.savingsPerUnit > 0 ? "font-semibold text-emerald-700" : "text-slate-600"}>
                  {f.savingsPerUnit > 0
                    ? `Saving ${formatINR(f.savingsPerUnit)} per unit (today's price is ${formatINR(f.currentUnitPrice)})`
                    : f.savingsPerUnit < 0
                    ? `Today's price (${formatINR(f.currentUnitPrice)}) is lower, so you will pay that`
                    : "Today's price matches your frozen price"}
                </p>
                <Link href={bookLink(f)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
                  <Lock className="h-4 w-4" /> Book at this price
                </Link>
              </div>
            )}
            {f.status !== "ACTIVE" && (
              <p className="mt-2 text-xs text-slate-500">
                Frozen {formatDateTime(f.createdAt)} · fee {formatINR(f.fee)}
                {f.status === "USED" && f.bookingReference ? ` · booking ${f.bookingReference}` : ""}
                {f.status === "EXPIRED" ? " · the fee was not credited because no booking was made in time" : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceFreezeList;
