import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { useSelector } from "react-redux";
import { Check, Landmark, Loader2, Receipt } from "lucide-react";
import { getMyRefunds } from "@/api";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";

export type RefundListHandle = { reload: () => void };

const STEPS = [
  { key: "PENDING", label: "Requested", field: "createdAt", hint: "We received your cancellation" },
  { key: "PROCESSED", label: "Processed", field: "processedAt", hint: "Approved and sent to your bank" },
  { key: "COMPLETED", label: "Completed", field: "completedAt", hint: "Money credited to you" },
];

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

/** Every refund the customer is owed, with a three-step tracker and the date it should arrive. */
const RefundList = forwardRef<RefundListHandle>(function RefundList(_props, ref) {
  const user = useSelector((state: any) => state.user.user);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setRefunds(await getMyRefunds(user.id));
    } catch (e) {
      // the next refresh will try again
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  if (loading || refunds.length === 0) return null;

  const total = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const waiting = refunds.filter((r) => r.status !== "COMPLETED").reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div id="refunds" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60">
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
        <Receipt className="h-6 w-6 text-emerald-600" /> Refunds
      </h2>
      <p className="mb-5 text-sm text-slate-500">
        {formatINR(total)} refunded in total{waiting > 0 ? ` · ${formatINR(waiting)} still on its way` : ""}. Banks usually show the money in 5 to 7 business days.
      </p>

      <div className="space-y-4">
        {refunds.map((r) => {
          const current = STEPS.findIndex((s) => s.key === r.status);
          return (
            <div key={r.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-sm text-slate-500">
                    {r.bookingReference} · {r.quantity} cancelled · {r.reason}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-emerald-700">{formatINR(r.amount)}</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[r.status] || BADGE.PENDING}`}>
                    {r.status === "PENDING" ? "Pending" : r.status === "PROCESSED" ? "Processed" : "Completed"}
                  </span>
                </div>
              </div>

              <ol className="mt-4 grid grid-cols-3 gap-2">
                {STEPS.map((s, i) => {
                  const done = i <= current;
                  const active = i === current && r.status !== "COMPLETED";
                  return (
                    <li key={s.key} className="relative text-center">
                      {i > 0 && (
                        <span className={`absolute right-1/2 top-3.5 h-0.5 w-full ${i <= current ? "bg-emerald-500" : "bg-slate-200"}`} aria-hidden />
                      )}
                      <span
                        className={`relative z-10 mx-auto flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs ${
                          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-slate-400"
                        }`}
                      >
                        {active ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <div className={`mt-1.5 text-xs font-semibold ${done ? "text-slate-800" : "text-slate-400"}`}>{s.label}</div>
                      <div className="text-[11px] leading-tight text-slate-500">{r[s.field] ? formatDateTime(r[s.field]) : s.hint}</div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5" /> To your {String(r.method || "original payment method").toLowerCase()}
                </span>
                <span>
                  {r.status === "COMPLETED" ? "Credited" : "Expected by"} {r.status === "COMPLETED" ? formatDateTime(r.completedAt) : formatDate(r.expectedBy)}
                </span>
                <span>
                  {r.percent}% of {formatINR(r.amountPaid)} · {r.policyLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default RefundList;
