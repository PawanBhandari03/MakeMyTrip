import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Radio, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getflightoperations, operateflight } from "@/api";
import { delayText, errorMessage, formatTime } from "@/lib/format";

const TONES: Record<string, string> = {
  "On Time": "bg-green-100 text-green-700",
  Delayed: "bg-amber-100 text-amber-800",
  Boarding: "bg-green-100 text-green-700",
  Departed: "bg-sky-100 text-sky-700",
  Landed: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-100 text-red-700",
};

/**
 * Operator console for the mock airline feed. Anything done here is sent to the same API an airline would use,
 * and every customer who follows the flight is notified straight away.
 */
const FlightOps = () => {
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setFlights(await getflightoperations());
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e, "Could not load flights.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flights.filter((f) => !q || `${f.flightNumber} ${f.flightName} ${f.from} ${f.to}`.toLowerCase().includes(q)).slice(0, 40);
  }, [flights, query]);

  const run = async (f: any, body: any, done: string) => {
    setBusy(f.flightNumber);
    setMessage(null);
    try {
      await operateflight(f.flightNumber, body);
      setMessage({ ok: true, text: `${f.flightNumber}: ${done}. Followers have been notified.` });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e, "That change could not be made.") });
    } finally {
      setBusy(null);
    }
  };

  const btn = "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Radio className="h-5 w-5 text-blue-600" /> Flight Operations
        </h2>
        <p className="text-sm text-slate-500">
          This console plays the part of an airline sending live updates. Delay a flight, change its gate or cancel it, and every customer
          following that flight gets a notification. Flights also change on their own as time passes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-5 pb-0">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by flight number, airline or city"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <span className="text-sm text-slate-500">Showing flights from 3 hours ago to the next 36 hours</span>
      </div>

      {message && (
        <p className={`mx-5 mt-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <div className="overflow-x-auto p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : shown.length === 0 ? (
          <p className="py-12 text-center text-slate-500">No flights found.</p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Flight</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Departure</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Gate</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => {
                const closed = f.phase === "LANDED" || f.phase === "CANCELLED";
                const left = f.phase === "DEPARTED";
                const disabled = busy === f.flightNumber || closed;
                return (
                  <tr key={f.flightNumber} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-semibold">{f.flightNumber}</div>
                      <div className="text-xs text-slate-500">{f.flightName}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {f.from} → {f.to}
                    </td>
                    <td className="px-3 py-2.5">
                      {f.delayMinutes > 0 ? (
                        <>
                          <span className="block text-xs text-slate-400 line-through">{formatTime(f.scheduledDeparture)}</span>
                          <span className="whitespace-nowrap font-semibold">{formatTime(f.estimatedDeparture)}</span>
                        </>
                      ) : (
                        formatTime(f.scheduledDeparture)
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[f.status] || "bg-slate-100 text-slate-600"}`}>
                        {f.status}
                        {f.delayMinutes > 0 && f.phase === "SCHEDULED" ? ` ${delayText(f.delayMinutes)}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">{f.gate}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <button className={btn} disabled={disabled || left} onClick={() => run(f, { type: "ADD_DELAY", minutes: 30 }, "delayed by 30 more minutes")}>
                          +30m
                        </button>
                        <button className={btn} disabled={disabled || left} onClick={() => run(f, { type: "ADD_DELAY", minutes: 60 }, "delayed by 1 more hour")}>
                          +1h
                        </button>
                        <button className={btn} disabled={disabled || left} onClick={() => run(f, { type: "ADD_DELAY", minutes: 120 }, "delayed by 2 more hours")}>
                          +2h
                        </button>
                        <button className={btn} disabled={disabled || left || f.delayMinutes === 0} onClick={() => run(f, { type: "CLEAR_DELAY" }, "back on time")}>
                          Clear delay
                        </button>
                        <button
                          className={btn}
                          disabled={disabled}
                          onClick={() => {
                            const gate = window.prompt("New gate (for example B4). Leave empty for a random gate.", "");
                            if (gate === null) return;
                            run(f, { type: "GATE_CHANGE", gate }, "gate changed");
                          }}
                        >
                          Change gate
                        </button>
                        <button className={btn} disabled={disabled || left || f.phase === "BOARDING"} onClick={() => run(f, { type: "BOARDING" }, "boarding started")}>
                          Start boarding
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-200 px-2 text-xs text-red-600 hover:bg-red-50"
                          disabled={disabled || left}
                          onClick={() => {
                            if (window.confirm(`Cancel flight ${f.flightNumber}? Everyone following it will be told.`)) run(f, { type: "CANCEL", reason: "Operational reasons" }, "cancelled");
                          }}
                        >
                          Cancel flight
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FlightOps;
