import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSelector } from "react-redux";
import {
  Loader2,
  PlaneTakeoff,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Seo from "@/components/Seo";
import SignupDialog from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";
import { getupcomingflightstatus, gettrackedflights, trackflight, untrackflight } from "@/api";
import FlightStatusCard from "@/components/FlightStatusCard";
import { errorMessage } from "@/lib/format";

const POLL_MS = 8000;

export default function Tracker() {
  const router = useRouter();
  const user = useSelector((state: any) => state.user.user);
  const ready = useSelector((state: any) => state.user.ready);

  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [, setClock] = useState(0);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const previous = useRef<Record<string, string>>({});
  const scrolled = useRef(false);

  const highlight = typeof router.query.flight === "string" ? router.query.flight.replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "";

  const load = useCallback(
    async (manual = false) => {
      if (!user?.id) return;
      if (manual) setRefreshing(true);
      try {
        const data: any[] = await gettrackedflights(user.id);
        // flash the cards that changed since the last check
        const changed = new Set<string>();
        const next: Record<string, string> = {};
        data.forEach((f) => {
          const sig = `${f.phase}|${f.delayMinutes}|${f.gate}|${f.estimatedDeparture}`;
          next[f.flightNumber] = sig;
          if (previous.current[f.flightNumber] && previous.current[f.flightNumber] !== sig) changed.add(f.flightNumber);
        });
        previous.current = next;
        if (changed.size > 0) {
          setFlashing(changed);
          setTimeout(() => setFlashing(new Set()), 4000);
        }
        setFlights(data);
        setFetchedAt(Date.now());
        setLoadError("");
      } catch (e) {
        setLoadError(errorMessage(e, "Could not load your flights."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) return;
    load();
    const poll = setInterval(() => load(), POLL_MS);
    return () => clearInterval(poll);
  }, [user?.id, load]);

  // keeps the countdowns and "updated" text moving between refreshes
  useEffect(() => {
    const t = setInterval(() => setClock((c) => c + 1), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getupcomingflightstatus().then(setSuggestions);
  }, []);

  useEffect(() => {
    if (!highlight || scrolled.current || flights.length === 0) return;
    const el = document.getElementById(`flight-${highlight}`);
    if (el) {
      scrolled.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight, flights]);

  const addFlight = async (number: string) => {
    const value = number.trim();
    if (!value || !user?.id) return;
    setAdding(true);
    setAddError("");
    try {
      await trackflight(user.id, value);
      setInput("");
      await load();
    } catch (e) {
      setAddError(errorMessage(e, "Could not follow that flight."));
    } finally {
      setAdding(false);
    }
  };

  const removeFlight = async (f: any) => {
    const note = f.source === "BOOKING" ? "\n\nThis flight came from your booking. You will stop getting its updates." : "";
    if (!window.confirm(`Stop following ${f.airline} ${f.flightNumber}?${note}`)) return;
    try {
      await untrackflight(user.id, f.flightNumber);
      setFlights((list) => list.filter((x) => x.flightNumber !== f.flightNumber));
    } catch (e) {
      setLoadError(errorMessage(e, "Could not stop following that flight."));
    }
  };

  const elapsedMin = (Date.now() - fetchedAt) / 60000;
  const followed = useMemo(() => new Set(flights.map((f) => f.flightNumber)), [flights]);
  const active = flights.filter((f) => f.phase !== "LANDED" && f.phase !== "CANCELLED");
  const finished = flights.filter((f) => f.phase === "LANDED" || f.phase === "CANCELLED");
  const delayedCount = active.filter((f) => f.delayMinutes > 0).length;
  const secondsAgo = Math.max(0, Math.round((Date.now() - fetchedAt) / 1000));

  if (!ready) return <Seo title="My Flights" path="/tracker" noindex />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Seo title="My Flights" path="/tracker" noindex />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <PlaneTakeoff className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Follow your flights</h1>
        <p className="mt-2 text-slate-600">Log in to follow several flights at once and get a notification the moment one is delayed, changes gate or lands.</p>
        <div className="mt-6">
          <SignupDialog trigger={<Button className="bg-blue-600 px-8 text-white hover:bg-blue-700">Login / Sign Up</Button>} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo title="My Flights" path="/tracker" noindex />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
            <PlaneTakeoff className="h-7 w-7 text-blue-600" /> My Flights
          </h1>
          <p className="mt-1 text-slate-600">
            Live status for every flight you follow. Flights you book are added automatically, and you are notified of any change.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : secondsAgo < 10 ? "Updated just now" : `Updated ${secondsAgo}s ago`}
        </button>
      </div>

      {/* Summary */}
      {flights.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Following", value: flights.length },
            { label: "Delayed", value: delayedCount },
            { label: "Completed", value: finished.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add a flight */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addFlight(input);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Follow another flight, e.g. 6E-126 or AI1234"
            className="h-11 w-full rounded-xl border border-slate-200 px-4 font-medium uppercase sm:flex-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <Button type="submit" disabled={adding || !input.trim()} className="h-11 bg-blue-600 px-6 hover:bg-blue-700">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Follow flight
          </Button>
        </form>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Next departures:</span>
            {suggestions
              .filter((s) => !followed.has(s.flightNumber))
              .slice(0, 8)
              .map((s) => (
                <button
                  key={s.flightNumber}
                  type="button"
                  onClick={() => addFlight(s.flightNumber)}
                  disabled={adding}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                >
                  {s.flightNumber} · {s.from} → {s.to}
                </button>
              ))}
          </div>
        )}
      </div>

      {loadError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : flights.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
          <PlaneTakeoff className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <h2 className="text-lg font-semibold">You are not following any flights yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Enter a flight number above, or pick one of the next departures. Flights you book are followed automatically.
          </p>
          <Link href="/" className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Search flights
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {active.map((f) => (
                <FlightStatusCard
                  key={f.flightNumber}
                  f={f}
                  elapsedMin={elapsedMin}
                  flash={flashing.has(f.flightNumber)}
                  highlighted={highlight === f.flightNumber}
                  onUntrack={removeFlight}
                />
              ))}
            </div>
          )}
          {finished.length > 0 && (
            <>
              <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-slate-500">Completed and cancelled</h2>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {finished.map((f) => (
                  <FlightStatusCard
                    key={f.flightNumber}
                    f={f}
                    elapsedMin={elapsedMin}
                    flash={flashing.has(f.flightNumber)}
                    highlighted={highlight === f.flightNumber}
                    onUntrack={removeFlight}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
