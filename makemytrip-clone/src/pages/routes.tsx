import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bus, Building2, Car, Globe2, Loader2, MapPin, Plane, Train } from "lucide-react";
import { getflight, gethotel, getlistings } from "@/api";
import { formatINR } from "@/lib/format";
import { isDomestic, placeOf } from "@/lib/places";
import Seo from "@/components/Seo";

type Mode = "flights" | "trains" | "buses" | "cabs" | "stays";
type Scope = "national" | "international";

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "flights", label: "Flights", icon: <Plane className="h-4 w-4" /> },
  { id: "trains", label: "Trains", icon: <Train className="h-4 w-4" /> },
  { id: "buses", label: "Buses", icon: <Bus className="h-4 w-4" /> },
  { id: "cabs", label: "Cabs", icon: <Car className="h-4 w-4" /> },
  { id: "stays", label: "Stays & Holidays", icon: <Building2 className="h-4 w-4" /> },
];

type Route = { from: string; to: string; count: number; minPrice: number };

const nice = (s: string) => s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const buildRoutes = (items: any[]): Route[] => {
  const map = new Map<string, Route>();
  items.forEach((i) => {
    if (!i.from || !i.to) return;
    const from = nice(i.from);
    const to = nice(i.to);
    const key = `${from}|${to}`;
    const r = map.get(key) || { from, to, count: 0, minPrice: Infinity };
    r.count += 1;
    r.minPrice = Math.min(r.minPrice, i.price ?? Infinity);
    map.set(key, r);
  });
  return Array.from(map.values());
};

const isNational = (r: Route) => isDomestic(r.from) && isDomestic(r.to);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-5 break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>
);

const RouteChip = ({ mode, route }: { mode: Mode; route: Route }) => (
  <Link
    href={`/?tab=${mode}&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
    className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
  >
    <span className="font-medium">{route.to}</span>
    {isFinite(route.minPrice) && <span className="text-xs text-slate-400 group-hover:text-blue-500">from {formatINR(route.minPrice)}</span>}
  </Link>
);

/** Groups routes by origin city and shows every destination reachable from it. */
const RouteGroups = ({ mode, routes, groupBy }: { mode: Mode; routes: Route[]; groupBy: "origin" | "country" }) => {
  const groups = useMemo(() => {
    const m = new Map<string, { title: string; subtitle: string; routes: Route[] }>();
    routes.forEach((r) => {
      const place = placeOf(groupBy === "origin" ? r.from : r.to);
      const key = groupBy === "origin" ? r.from : place.country;
      const g = m.get(key) || {
        title: key,
        subtitle: groupBy === "origin" ? `${place.state}, ${place.country}` : "",
        routes: [],
      };
      g.routes.push(r);
      m.set(key, g);
    });
    return Array.from(m.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [routes, groupBy]);

  if (groups.length === 0) return <p className="py-10 text-center text-slate-500">No routes available yet.</p>;
  return (
    <div className="gap-5 md:columns-2">
      {groups.map((g) => (
        <Card key={g.title}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-lg font-bold">
                <MapPin className="h-4 w-4 text-blue-600" />
                {groupBy === "origin" ? `From ${g.title}` : g.title}
              </h3>
              {g.subtitle && <p className="text-xs text-slate-500">{g.subtitle}</p>}
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {g.routes.length} route{g.routes.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.routes
              .sort((a, b) => (groupBy === "origin" ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from) || a.to.localeCompare(b.to)))
              .map((r) => (
                <RouteChip key={r.from + r.to} mode={mode} route={groupBy === "origin" ? r : { ...r, to: `${r.from} → ${r.to}` }} />
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default function RoutesPage() {
  const [mode, setMode] = useState<Mode>("flights");
  const [scope, setScope] = useState<Scope>("national");
  const [query, setQuery] = useState("");
  const [flights, setFlights] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getflight(), gethotel(), getlistings()])
      .then(([f, h, l]) => {
        setFlights(f || []);
        setHotels(h || []);
        setListings(l || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const byCat = (c: string) => listings.filter((l) => l.category === c);

  const flightRoutes = useMemo(() => buildRoutes(flights), [flights]);
  const trainRoutes = useMemo(() => buildRoutes(byCat("TRAIN")), [listings]); // eslint-disable-line react-hooks/exhaustive-deps
  const busRoutes = useMemo(() => buildRoutes(byCat("BUS")), [listings]); // eslint-disable-line react-hooks/exhaustive-deps
  const cabRoutes = useMemo(() => buildRoutes(byCat("CAB")), [listings]); // eslint-disable-line react-hooks/exhaustive-deps

  const national = scope === "national";
  const pick = (routes: Route[]) => routes.filter((r) => (national ? isNational(r) : !isNational(r)));

  // Stays: hotels, homestays and holiday packages grouped by place
  const places = useMemo(() => {
    const m = new Map<string, { hotels: number; homestays: number; holidays: number }>();
    const bump = (name: string | undefined, key: "hotels" | "homestays" | "holidays") => {
      if (!name) return;
      const e = m.get(name) || { hotels: 0, homestays: 0, holidays: 0 };
      e[key] += 1;
      m.set(name, e);
    };
    hotels.forEach((h) => bump(h.location, "hotels"));
    byCat("HOMESTAY").forEach((h) => bump(h.location, "homestays"));
    byCat("HOLIDAY").forEach((h) => bump(h.location, "holidays"));
    return Array.from(m.entries()).map(([name, c]) => ({ name, ...c, ...placeOf(name) }));
  }, [hotels, listings]); // eslint-disable-line react-hooks/exhaustive-deps

  const stayPlaces = places.filter((p) => (national ? p.country === "India" : p.country !== "India") && (!query.trim() || p.name.toLowerCase().includes(query.trim().toLowerCase())));
  const stayGroups = useMemo(() => {
    const m = new Map<string, typeof stayPlaces>();
    stayPlaces.forEach((p) => {
      const key = national ? p.state : p.country;
      m.set(key, [...(m.get(key) || []), p]);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [stayPlaces, national]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (r: Route) => !q || r.from.toLowerCase().includes(q) || r.to.toLowerCase().includes(q);
  const current: Route[] = (mode === "flights" ? pick(flightRoutes) : mode === "trains" ? pick(trainRoutes) : mode === "buses" ? pick(busRoutes) : pick(cabRoutes)).filter(matchesQuery);
  const cities = new Set(current.flatMap((r) => [r.from, r.to]));
  const countries = new Set(Array.from(cities).map((c) => placeOf(c).country));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Seo
        title="Routes & Destinations"
        description="Every place you can fly, ride or drive to and from: national and international flights, trains, buses, cabs, hotels, homestays and holiday packages."
        path="/routes"
      />
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
          <Globe2 className="h-7 w-7 text-blue-600" /> Routes &amp; Destinations
        </h1>
        <p className="mt-1 text-slate-600">
          Every place you can travel to and from. Pick a route to search it straight away.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {(["national", "international"] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                scope === s ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                mode === m.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city or country, e.g. Goa, London..."
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : mode === "stays" ? (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {stayPlaces.length} places in {stayGroups.length} {national ? "states" : "countries"}
          </p>
          {stayGroups.length === 0 ? (
            <p className="py-10 text-center text-slate-500">Nothing available yet.</p>
          ) : (
            <div className="gap-5 md:columns-2">
              {stayGroups.map(([group, items]) => (
                <Card key={group}>
                  <h3 className="mb-3 flex items-center gap-1.5 text-lg font-bold">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    {group}
                  </h3>
                  <ul className="space-y-2">
                    {items
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((p) => (
                        <li key={p.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium">{p.name}</span>
                          <span className="flex flex-wrap gap-2">
                            {p.hotels > 0 && (
                              <Link href={`/?tab=hotels&city=${encodeURIComponent(p.name)}`} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                                {p.hotels} hotel{p.hotels > 1 ? "s" : ""}
                              </Link>
                            )}
                            {p.homestays > 0 && (
                              <Link href={`/?tab=homestays&city=${encodeURIComponent(p.name)}`} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                                {p.homestays} homestay{p.homestays > 1 ? "s" : ""}
                              </Link>
                            )}
                            {p.holidays > 0 && (
                              <Link href={`/?tab=holiday&city=${encodeURIComponent(p.name)}`} className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-100">
                                {p.holidays} package{p.holidays > 1 ? "s" : ""}
                              </Link>
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : !national && mode !== "flights" ? (
        <Card>
          <p className="py-6 text-center text-slate-600">
            {MODES.find((m) => m.id === mode)?.label} are available within India only. For international travel, choose{" "}
            <button className="font-semibold text-blue-600 hover:underline" onClick={() => setMode("flights")}>
              Flights
            </button>{" "}
            or{" "}
            <button className="font-semibold text-blue-600 hover:underline" onClick={() => setMode("stays")}>
              Stays &amp; Holidays
            </button>
            .
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {current.length} routes connecting {cities.size} places in {countries.size} {countries.size === 1 ? "country" : "countries"}
            {!national && countries.size > 0 && `: ${Array.from(countries).sort().join(", ")}`}
          </p>
          <RouteGroups mode={mode} routes={current} groupBy="origin" />
        </>
      )}
    </div>
  );
}
