import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Radio } from "lucide-react";
import { getbookingstatus } from "@/api";

const TONES: Record<string, { box: string; pill: string; bar: string }> = {
  good: { box: "border-green-200 bg-green-50/60", pill: "bg-green-100 text-green-700", bar: "bg-green-500" },
  warn: { box: "border-amber-200 bg-amber-50/70", pill: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  bad: { box: "border-red-200 bg-red-50/70", pill: "bg-red-100 text-red-700", bar: "bg-red-500" },
  info: { box: "border-blue-200 bg-blue-50/60", pill: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
};

const REFRESH_MS = 30000;

/**
 * Live status of a booked flight, train or bus. Refreshes by itself every 30 seconds
 * and can also be refreshed by hand.
 */
const LiveStatus = ({ booking }: { booking: any }) => {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const category = String(booking.category || booking.type || "").toUpperCase();

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const data = await getbookingstatus(category, booking.bookingId, booking.travelDate);
        setInfo(data);
        setFailed(!data);
      } catch (e) {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [category, booking.bookingId, booking.travelDate]
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  if (failed && !info) return null; // nothing to show for this booking
  if (!info) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking live status...
      </div>
    );
  }

  const tone = TONES[info.tone] || TONES.info;
  const details = Object.entries(info.details || {}) as [string, string][];
  const updated = info.updatedAt ? new Date(info.updatedAt) : null;

  return (
    <div className={`mt-3 rounded-xl border p-3 ${tone.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live status</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone.pill}`}>{info.label}</span>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50"
          aria-label="Refresh live status"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {updated ? `Updated ${updated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Refresh"}
        </button>
      </div>

      {info.state === "IN_TRANSIT" && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-white/80">
            <div className={`h-1.5 rounded-full transition-all ${tone.bar}`} style={{ width: `${info.progress}%` }} />
          </div>
          <div className="mt-1 text-right text-[11px] text-slate-500">{info.progress}% of the journey done</div>
        </div>
      )}

      {details.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt>
              <dd className="font-semibold text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

export default LiveStatus;
