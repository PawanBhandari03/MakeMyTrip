import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSelector } from "react-redux";
import { BellRing, Check, Loader2, Plus, Search } from "lucide-react";
import Seo from "@/components/Seo";
import SignupDialog from "@/components/SignupDialog";
import FlightStatusCard from "@/components/FlightStatusCard";
import { Button } from "@/components/ui/button";
import { getupcomingflightstatus, gettrackedflight, trackflight, untrackflight } from "@/api";
import { errorMessage } from "@/lib/format";

const POLL_MS = 8000;

const FlightStatus = () => {
  const router = useRouter();
  const user = useSelector((state: any) => state.user.user);

  const [flightNumber, setFlightNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [flight, setFlight] = useState<any>(null);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [, setClock] = useState(0);
  const lastQuery = useRef("");

  useEffect(() => {
    getupcomingflightstatus().then(setSuggestions);
    const t = setInterval(() => setClock((c) => c + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // /flight-status?flight=6E-126 opens straight to that flight (also used by shared links)
  useEffect(() => {
    if (!router.isReady) return;
    const q = typeof router.query.flight === "string" ? router.query.flight.trim() : "";
    if (q) {
      setFlightNumber(q.toUpperCase());
      setSearchQuery(q.toUpperCase());
    }
  }, [router.isReady, router.query.flight]);

  const load = useCallback(
    async (quiet = false) => {
      if (!searchQuery) return;
      if (!quiet) setLoading(true);
      try {
        const data = await gettrackedflight(user?.id, searchQuery);
        if (data) {
          setFlight(data);
          setFetchedAt(Date.now());
          setError("");
        } else {
          setFlight(null);
          setError(`We could not find flight ${searchQuery}. Check the number and try again, for example 6E-126 or AI1234.`);
        }
      } catch (e) {
        if (!quiet) setFlight(null);
        setError(errorMessage(e, "Could not fetch the flight status right now. Please try again."));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, user?.id]
  );

  useEffect(() => {
    if (!searchQuery) return;
    if (lastQuery.current !== searchQuery) {
      setFlight(null);
      lastQuery.current = searchQuery;
    }
    load();
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [searchQuery, load]);

  const search = (value: string) => {
    const v = value.trim().toUpperCase();
    if (!v) return;
    setError("");
    setSearchQuery(v);
    router.replace({ pathname: "/flight-status", query: { flight: v } }, undefined, { shallow: true });
  };

  const follow = async () => {
    if (!user?.id || !flight) return;
    setBusy(true);
    try {
      await trackflight(user.id, flight.flightNumber);
      await load(true);
    } catch (e) {
      setError(errorMessage(e, "Could not follow that flight."));
    } finally {
      setBusy(false);
    }
  };

  const unfollow = async () => {
    if (!user?.id || !flight) return;
    setBusy(true);
    try {
      await untrackflight(user.id, flight.flightNumber);
      await load(true);
    } catch (e) {
      setError(errorMessage(e, "Could not stop following that flight."));
    } finally {
      setBusy(false);
    }
  };

  const actions = flight ? (
    !user ? (
      <SignupDialog
        trigger={
          <button type="button" className="flex items-center gap-1 font-semibold text-blue-600 hover:underline">
            <BellRing className="h-3.5 w-3.5" /> Log in to get notified
          </button>
        }
      />
    ) : flight.tracked ? (
      <>
        <span className="flex items-center gap-1 font-semibold text-green-600">
          <Check className="h-3.5 w-3.5" /> Following
        </span>
        {flight.source !== "BOOKING" && (
          <button type="button" disabled={busy} onClick={unfollow} className="font-medium text-slate-500 hover:text-red-600 disabled:opacity-50">
            Stop
          </button>
        )}
        <Link href={`/tracker?flight=${flight.flightNumber}`} className="font-medium text-blue-600 hover:underline">
          Open in My Flights
        </Link>
      </>
    ) : (
      <Button size="sm" disabled={busy} onClick={follow} className="h-8 bg-blue-600 hover:bg-blue-700">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Follow this flight
      </Button>
    )
  ) : null;

  const elapsedMin = (Date.now() - fetchedAt) / 60000;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Seo
        title="Live Flight Status"
        description="Check the live status of any flight: on time, delayed, boarding or landed, with revised times, gate and terminal. Search by flight number such as 6E-126 or AI1234 and get notified of changes."
        path="/flight-status"
      />
      <main className="container mx-auto flex-grow px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900">Live Flight Status</h1>
            <p className="text-lg text-gray-600">Get real-time updates on your flight&apos;s departure, arrival, and gate information.</p>
          </div>

          <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                search(flightNumber);
              }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter flight number (e.g., 6E-126 or AI1234)"
                  className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-lg uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-12 bg-blue-600 px-8 text-lg hover:bg-blue-700">
                Check Status
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">Next departures:</span>
              {suggestions.map((s) => (
                <button
                  key={s.flightNumber}
                  type="button"
                  onClick={() => {
                    setFlightNumber(s.flightNumber);
                    search(s.flightNumber);
                  }}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {s.flightNumber}
                </button>
              ))}
            </div>
          </div>

          {loading && !flight && (
            <div className="py-12 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="mt-4 font-medium text-gray-500">Fetching live updates...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
              <p className="font-medium text-red-600">{error}</p>
            </div>
          )}

          {flight && (
            <>
              <FlightStatusCard f={flight} elapsedMin={elapsedMin} flash={false} highlighted={false} actions={actions} />
              <p className="mt-3 text-center text-xs text-slate-500">This page refreshes by itself every few seconds.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default FlightStatus;
