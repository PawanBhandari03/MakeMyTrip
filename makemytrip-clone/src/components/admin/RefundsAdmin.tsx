import React, { useCallback, useEffect, useState } from "react";
import { FastForward, RefreshCw } from "lucide-react";
import { advanceRefund, getAllRefunds, getRefundStats } from "@/api";
import { Button } from "@/components/ui/button";
import { errorMessage, formatDateTime, formatINR } from "@/lib/format";

const BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
  <div className="rounded-xl border bg-white p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
  </div>
);

/** The refund queue: every refund, its status, and a button to move it to the next step. */
const RefundsAdmin = () => {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([getAllRefunds(), getRefundStats()]);
      setRefunds(r);
      setStats(s);
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Could not load refunds."));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const advance = async (id: string) => {
    setBusy(id);
    try {
      await advanceRefund(id);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not update the refund."));
    } finally {
      setBusy("");
    }
  };

  const shown = filter === "ALL" ? refunds : refunds.filter((r) => r.status === filter);
  const reasons: [string, number][] = stats ? Object.entries(stats.reasons as Record<string, number>).sort((a, b) => b[1] - a[1]) : [];
  const maxReason = reasons.length ? reasons[0][1] : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Refunds</h2>
          <p className="text-sm text-slate-500">
            Refunds move on their own (pending, then processed, then completed). Use the button to speed one up.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total refunds" value={String(stats.count)} tone="text-slate-900" />
          <Stat label="Pending" value={formatINR(stats.pendingAmount)} tone="text-amber-600" />
          <Stat label="Processed" value={formatINR(stats.processedAmount)} tone="text-blue-600" />
          <Stat label="Completed" value={formatINR(stats.completedAmount)} tone="text-emerald-600" />
        </div>
      )}

      {reasons.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Why customers cancel</h3>
          <div className="space-y-2">
            {reasons.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3 text-sm">
                <span className="w-44 shrink-0 truncate sm:w-60">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(count / maxReason) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex w-fit rounded-lg bg-slate-100 p-1 text-sm">
        {["ALL", "PENDING", "PROCESSED", "COMPLETED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1 font-medium capitalize ${filter === f ? "bg-white shadow" : "text-slate-500"}`}
          >
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Refund</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No refunds here yet. Cancel a booking as a customer to create one.
                </td>
              </tr>
            )}
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs font-semibold">{r.bookingReference}</div>
                  <div className="max-w-[220px] truncate text-slate-600">{r.title}</div>
                  <div className="text-xs text-slate-400">{r.quantity} cancelled</div>
                </td>
                <td className="px-4 py-3">{r.userName || "Customer"}</td>
                <td className="px-4 py-3">{r.reason}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{formatINR(r.amount)}</div>
                  <div className="text-xs text-slate-400">
                    {r.percent}% of {formatINR(r.amountPaid)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[r.status]}`}>{r.status.toLowerCase()}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  {r.status !== "COMPLETED" && (
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => advance(r.id)}>
                      <FastForward className="mr-1 h-4 w-4" /> {r.status === "PENDING" ? "Mark processed" : "Mark completed"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RefundsAdmin;
