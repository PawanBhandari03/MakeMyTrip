import { getflight, gethotel, getlistings } from "@/api";
import { SearchSelect } from "@/components/SearchSelect";
import SmartImage from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FlightCard,
  ForexCard,
  HolidayCard,
  InsuranceCard,
  RouteCard,
  StayCard,
} from "@/components/home/ResultCards";
import {
  ArrowLeftRight,
  Bus,
  Calendar,
  Car,
  Check,
  Copy,
  CreditCard,
  HomeIcon,
  Hotel,
  Loader2,
  MapPin,
  Plane,
  SearchX,
  Shield,
  Train,
  Umbrella,
  Users,
} from "lucide-react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate, isoDay, nightsBetween, nowLocalIso } from "@/lib/format";
import { canonicalCity } from "@/lib/places";
import Seo from "@/components/Seo";
import { useLivePrices } from "@/lib/useLivePrices";
import Recommendations from "@/components/Recommendations";
import { recordActivity } from "@/api";
import { AUTHOR, DEFAULT_DESCRIPTION, GITHUB_URL, SITE_NAME, SITE_URL } from "@/lib/site";
import Link from "next/link";

// ---------------------------------------------------------------- configuration

type TabId = "flights" | "hotels" | "homestays" | "holiday" | "trains" | "buses" | "cabs" | "forex" | "insurance";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "flights", label: "Flights", icon: <Plane /> },
  { id: "hotels", label: "Hotels", icon: <Hotel /> },
  { id: "homestays", label: "Homestays", icon: <HomeIcon /> },
  { id: "holiday", label: "Holiday", icon: <Umbrella /> },
  { id: "trains", label: "Trains", icon: <Train /> },
  { id: "buses", label: "Buses", icon: <Bus /> },
  { id: "cabs", label: "Cabs", icon: <Car /> },
  { id: "forex", label: "Forex", icon: <CreditCard /> },
  { id: "insurance", label: "Insurance", icon: <Shield /> },
];

const CATEGORY: Record<TabId, string> = {
  flights: "FLIGHT",
  hotels: "HOTEL",
  homestays: "HOMESTAY",
  holiday: "HOLIDAY",
  trains: "TRAIN",
  buses: "BUS",
  cabs: "CAB",
  forex: "FOREX",
  insurance: "INSURANCE",
};

const POPULAR_ROUTES: Partial<Record<TabId, [string, string][]>> = {
  flights: [["Delhi", "Mumbai"], ["Mumbai", "Bengaluru"], ["Delhi", "Goa"], ["Hyderabad", "Mumbai"], ["Delhi", "Kolkata"]],
  trains: [["Mumbai", "Delhi"], ["Delhi", "Jaipur"], ["Mumbai", "Goa"], ["Bengaluru", "Chennai"]],
  buses: [["Bengaluru", "Chennai"], ["Delhi", "Jaipur"], ["Mumbai", "Pune"], ["Mumbai", "Goa"]],
  cabs: [["Delhi", "Jaipur"], ["Mumbai", "Pune"], ["Bengaluru", "Mysuru"], ["Delhi", "Agra"]],
};

const offers: { title: string; description: string; imageUrl: string; code: string; tab: TabId }[] = [
  {
    title: "Domestic Flights",
    description: "Get up to 20% off on domestic flights",
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800",
    code: "FLY20",
    tab: "flights",
  },
  {
    title: "International Hotels",
    description: "Book luxury hotels worldwide",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800",
    code: "LUXE15",
    tab: "hotels",
  },
  {
    title: "Holiday Packages",
    description: "Exclusive deals on holiday packages",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800",
    code: "HOLIDAY20",
    tab: "holiday",
  },
];

const collections: { title: string; imageUrl: string; city: string; tab: TabId }[] = [
  {
    title: "Stays in & Around Delhi",
    imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800",
    city: "Delhi",
    tab: "hotels",
  },
  {
    title: "Stays in & Around Mumbai",
    imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800",
    city: "Mumbai",
    tab: "hotels",
  },
  {
    title: "Stays in & Around Bangalore",
    imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800",
    city: "Bengaluru",
    tab: "hotels",
  },
  {
    title: "Beach Destinations",
    imageUrl: "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?auto=format&fit=crop&w=800",
    city: "Goa",
    tab: "hotels",
  },
];

const wonders: { title: string; imageUrl: string; city: string; tab: TabId }[] = [
  {
    title: "Shimla's Best Kept Secret",
    imageUrl: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800",
    city: "Shimla",
    tab: "homestays",
  },
  {
    title: "Tamil Nadu's Charming Hill Town",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800",
    city: "Ooty",
    tab: "homestays",
  },
  {
    title: "Quaint Little Hill Station in Gujarat",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800",
    city: "Saputara",
    tab: "homestays",
  },
  {
    title: "A pleasant summer retreat",
    imageUrl: "https://images.unsplash.com/photo-1593181629936-11c609b8db9b?auto=format&fit=crop&w=800",
    city: "Coorg",
    tab: "homestays",
  },
];

const PAGE_SIZE = 10;

type Form = {
  from: string;
  to: string;
  city: string;
  date: string;
  checkIn: string;
  checkOut: string;
  qty: number;
  currency: string;
  region: string;
};

const defaultForm = (): Form => ({
  from: "",
  to: "",
  city: "",
  date: isoDay(1),
  checkIn: isoDay(1),
  checkOut: isoDay(2),
  qty: 1,
  currency: "",
  region: "",
});

const norm = (s?: string) => (s || "").trim().toLowerCase();
// "Bangalore", "Bombay" etc. are understood as the names used in the data
const matches = (value: string | undefined, query: string) => {
  const q = canonicalCity(query);
  return !q || norm(value).includes(q);
};
const uniqueSorted = (values: (string | undefined)[]) =>
  Array.from(new Set(values.filter((v): v is string => !!v && v.trim() !== ""))).sort((a, b) => a.localeCompare(b));

// ---------------------------------------------------------------- page

export default function Home() {
  const router = useRouter();
  const loggedInUserId = useSelector((state: any) => state.user.user?.id);
  const [tab, setTab] = useState<TabId>("flights");
  const [form, setForm] = useState<Form>(defaultForm);
  const [applied, setApplied] = useState<({ tab: TabId } & Form) | null>(null);
  const [sort, setSort] = useState("recommended");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [flights, setFlights] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  // each list is fetched on its own, so a tab can appear as soon as the data it needs has arrived
  const [ready, setReady] = useState({ flights: false, hotels: false, listings: false });
  const [loadError, setLoadError] = useState(false);
  const [slow, setSlow] = useState(false);
  const [toast, setToast] = useState("");
  // "Explore" popup opened from the collection and wonder cards
  const [explore, setExplore] = useState<{ title: string; city: string; tab: TabId } | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = (fetcher: () => Promise<any[]>, set: (rows: any[]) => void, key: "flights" | "hotels" | "listings") => {
      fetcher()
        .then((rows) => !cancelled && set(rows || []))
        .catch(() => !cancelled && setLoadError(true))
        .finally(() => !cancelled && setReady((r) => ({ ...r, [key]: true })));
    };
    load(getflight, setFlights, "flights");
    load(gethotel, setHotels, "hotels");
    load(getlistings, setListings, "listings");
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = tab === "flights" ? !ready.flights : tab === "hotels" ? !ready.hotels : !ready.listings;

  // free hosting sleeps when idle, so the first visit can be slow: say so instead of leaving a bare spinner
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const byCategory = useCallback((cat: string) => listings.filter((l) => l.category === cat), [listings]);

  // ---- options for the place pickers
  const options = useMemo(() => {
    const toOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }));
    const routeCities = (items: any[]) => toOptions(uniqueSorted(items.flatMap((i) => [i.from, i.to])));
    return {
      flights: routeCities(flights),
      hotels: toOptions(uniqueSorted(hotels.map((h) => h.location))),
      homestays: toOptions(uniqueSorted(byCategory("HOMESTAY").map((h) => h.location))),
      holiday: toOptions(uniqueSorted(byCategory("HOLIDAY").map((h) => h.location))),
      trains: routeCities(byCategory("TRAIN")),
      buses: routeCities(byCategory("BUS")),
      cabs: routeCities(byCategory("CAB")),
      forex: byCategory("FOREX").map((f) => ({ value: f.type, label: `${f.name}` })),
    };
  }, [flights, hotels, byCategory]);

  const routeItems = useCallback(
    (t: TabId): any[] => (t === "flights" ? flights : byCategory(CATEGORY[t] || "")),
    [flights, byCategory]
  );

  // Once a "From" place is chosen, only offer destinations that can actually be reached from it
  const toOptions = useMemo(() => {
    if (!["flights", "trains", "buses", "cabs"].includes(tab)) return [];
    const all = options[tab as "flights" | "trains" | "buses" | "cabs"];
    if (!norm(form.from)) return all;
    const reachable = uniqueSorted(routeItems(tab).filter((i) => matches(i.from, form.from)).map((i) => i.to));
    return reachable.length ? reachable.map((v) => ({ value: v, label: v })) : all;
  }, [tab, form.from, options, routeItems]);

  // ---- switching tabs and shortcuts (footer links, collections, offers)
  const switchTab = useCallback((t: TabId) => {
    setTab(t);
    setApplied(null);
    setSort("recommended");
    setVisible(PAGE_SIZE);
    setForm((f) => ({ ...f, qty: t === "forex" ? 1000 : 1 }));
  }, []);

  const scrollToSearch = () => {
    setTimeout(() => searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const shortcut = useCallback((t: TabId, patch: Partial<Form>) => {
    const next = { ...defaultForm(), qty: t === "forex" ? 1000 : 1, ...patch };
    setTab(t);
    setForm(next);
    setApplied({ tab: t, ...next });
    setSort("recommended");
    setVisible(PAGE_SIZE);
    setTimeout(() => searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }, []);

  // Links such as /?tab=hotels&city=Delhi or /?tab=flights&from=Delhi&to=London
  useEffect(() => {
    if (!router.isReady) return;
    const t = String(router.query.tab || "") as TabId;
    if (!TABS.some((x) => x.id === t)) return;
    const q = (k: string) => (typeof router.query[k] === "string" ? (router.query[k] as string) : "");
    const city = q("city");
    const from = q("from");
    const to = q("to");
    if (from || to) shortcut(t, { from, to });
    else if (t === "hotels" || t === "homestays" || t === "holiday") shortcut(t, { city });
    else switchTab(t);
  }, [router.isReady, router.query.tab, router.query.city, router.query.from, router.query.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSearch = () => {
    // remember what the customer searched for, so "Recommended for you" can learn from it
    const place = tab === "hotels" || tab === "homestays" || tab === "holiday" ? form.city : form.to;
    if (loggedInUserId && place && place.trim()) recordActivity(loggedInUserId, "SEARCH", { query: place.trim() });
    setVisible(PAGE_SIZE);
    setApplied({ tab, ...form });
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const swap = () => setForm((f) => ({ ...f, from: f.to, to: f.from }));

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      // clipboard may be blocked; the code is still shown on the card
    }
  };

  // ---------------------------------------------------------------- results

  const a = applied && applied.tab === tab ? applied : null;
  const nights = nightsBetween((a || form).checkIn, (a || form).checkOut);

  const results: any[] | null = useMemo(() => {
    const now = nowLocalIso();
    let list: any[] | null = null;
    switch (tab) {
      case "flights": {
        if (!a) return null;
        const upcoming = flights.filter((f) => (f.departureTime || "") >= now);
        const route = upcoming.filter((f) => matches(f.from, a.from) && matches(f.to, a.to));
        const onDate = a.date ? route.filter((f) => (f.departureTime || "").startsWith(a.date)) : route;
        list = onDate;
        break;
      }
      case "hotels":
        list = hotels.filter((h) => matches(h.location, (a || form).city) || matches(h.hotelName, (a || form).city));
        if (!a && !norm(form.city)) list = hotels;
        break;
      case "homestays":
        list = byCategory("HOMESTAY").filter((h) => matches(h.location, (a || form).city) || matches(h.name, (a || form).city));
        break;
      case "holiday":
        list = byCategory("HOLIDAY").filter((h) => matches(h.location, (a || form).city) || matches(h.name, (a || form).city));
        break;
      case "trains":
      case "buses":
      case "cabs":
        if (!a) return null;
        list = byCategory(CATEGORY[tab]).filter((i) => matches(i.from, a.from) && matches(i.to, a.to));
        break;
      case "forex":
        list = byCategory("FOREX").filter((f) => matches(f.name, (a || form).currency) || matches(f.type, (a || form).currency));
        break;
      case "insurance":
        list = byCategory("INSURANCE").filter((p) => !norm((a || form).region) || norm(p.location) === norm((a || form).region));
        break;
    }
    if (!list) return null;
    const price = (x: any) => x.price ?? x.pricePerNight ?? 0;
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((x, y) => price(x) - price(y));
    else if (sort === "price-desc") sorted.sort((x, y) => price(y) - price(x));
    else if (sort === "rating") sorted.sort((x, y) => (y.rating || 0) - (x.rating || 0));
    else if (sort === "duration" && tab === "flights") {
      const dur = (f: any) => new Date(f.arrivalTime).getTime() - new Date(f.departureTime).getTime();
      sorted.sort((x, y) => dur(x) - dur(y));
    } else if (tab === "flights") sorted.sort((x, y) => (x.departureTime || "").localeCompare(y.departureTime || ""));
    else if (sort === "recommended") {
      // A stable mixed order, so great and average places appear together; "Rating" sorts best first.
      const mix = (id: string) => {
        let h = 7;
        for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
        return Math.abs(h);
      };
      sorted.sort((x, y) => mix(x.id) - mix(y.id));
    }
    return sorted;
  }, [tab, a, form.city, form.currency, form.region, flights, hotels, listings, sort, byCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live prices for what is on screen. Prices depend on the travel date, which is the check-in date for stays.
  const priceDate = tab === "hotels" || tab === "homestays" ? (a || form).checkIn : tab === "flights" ? undefined : (a || form).date;
  const liveIds = useMemo(() => (results && tab !== "insurance" ? results.slice(0, 60).map((r: any) => r.id) : []), [results, tab]);
  const livePrices = useLivePrices(tab === "insurance" ? null : CATEGORY[tab], liveIds, priceDate);
  const ordered = useMemo(() => {
    if (!results || (sort !== "price-asc" && sort !== "price-desc")) return results;
    const price = (x: any) => livePrices[x.id]?.price ?? x.price ?? x.pricePerNight ?? 0;
    const head = results.slice(0, 60).sort((x: any, y: any) => (sort === "price-asc" ? price(x) - price(y) : price(y) - price(x)));
    return [...head, ...results.slice(60)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, sort, livePrices]);

  // Flights: if nothing on the chosen date, offer the next departures on the same route
  const flightAlternatives = useMemo(() => {
    if (tab !== "flights" || !a || (results && results.length > 0)) return [];
    const now = nowLocalIso();
    return flights
      .filter((f) => (f.departureTime || "") >= now && matches(f.from, a.from) && matches(f.to, a.to))
      .sort((x, y) => (x.departureTime || "").localeCompare(y.departureTime || ""))
      .slice(0, 8);
  }, [tab, a, results, flights]);

  // Every day on which the searched route actually flies
  const flightDates = useMemo(() => {
    if (tab !== "flights" || !a) return [];
    const now = nowLocalIso();
    const days = flights
      .filter((f) => (f.departureTime || "") >= now && matches(f.from, a.from) && matches(f.to, a.to))
      .map((f) => (f.departureTime || "").slice(0, 10));
    return Array.from(new Set(days)).sort().slice(0, 14);
  }, [tab, a, flights]);

  // The last day we have any flight on, so the date picker never offers a day with nothing
  const lastFlightDay = useMemo(() => {
    let last = "";
    flights.forEach((f) => {
      const d = (f.departureTime || "").slice(0, 10);
      if (d > last) last = d;
    });
    return last;
  }, [flights]);

  const handleBook = (item: any) => {
    const f = a || form;
    switch (tab) {
      case "flights":
        router.push(`/book-flight/${item.id}?qty=${f.qty}`);
        break;
      case "hotels":
        router.push(`/book-hotel/${item.id}?rooms=${f.qty}&checkIn=${f.checkIn}&checkOut=${f.checkOut}`);
        break;
      case "homestays":
        router.push(`/book/${item.id}?qty=${f.qty}&checkIn=${f.checkIn}&checkOut=${f.checkOut}`);
        break;
      default:
        router.push(`/book/${item.id}?qty=${f.qty}&date=${f.date}`);
    }
  };

  const renderResult = (item: any) => {
    switch (tab) {
      case "flights":
        return <FlightCard key={item.id} flight={item} onBook={handleBook} live={livePrices[item.id]} />;
      case "hotels":
        return <StayCard key={item.id} stay={item} kind="hotel" nights={nights} onBook={handleBook} live={livePrices[item.id]} />;
      case "homestays":
        return <StayCard key={item.id} stay={item} kind="homestay" nights={nights} onBook={handleBook} live={livePrices[item.id]} />;
      case "holiday":
        return <HolidayCard key={item.id} pkg={item} onBook={handleBook} live={livePrices[item.id]} />;
      case "forex":
        return <ForexCard key={item.id} item={item} amount={(a || form).qty} onBook={handleBook} live={livePrices[item.id]} />;
      case "insurance":
        return <InsuranceCard key={item.id} plan={item} onBook={handleBook} />;
      default:
        return <RouteCard key={item.id} item={item} onBook={handleBook} live={livePrices[item.id]} />;
    }
  };

  const exploreHotels = explore ? hotels.filter((h) => matches(h.location, explore.city)) : [];
  const exploreHomestays = explore ? byCategory("HOMESTAY").filter((h) => matches(h.location, explore.city)) : [];

  const bookFromExplore = (kind: "hotel" | "homestay", item: any) => {
    const qs = `checkIn=${isoDay(1)}&checkOut=${isoDay(2)}`;
    setExplore(null);
    router.push(kind === "hotel" ? `/book-hotel/${item.id}?rooms=1&${qs}` : `/book/${item.id}?qty=1&${qs}`);
  };

  const reachableFromA = useMemo(() => {
    if (!a || !["flights", "trains", "buses", "cabs"].includes(tab) || !norm(a.from)) return [];
    return uniqueSorted(routeItems(tab).filter((i) => matches(i.from, a.from)).map((i) => i.to)).slice(0, 14);
  }, [a, tab, routeItems]);

  const gridTabs: TabId[] = ["holiday", "insurance"];
  const popular = POPULAR_ROUTES[tab];
  const label = TABS.find((t) => t.id === tab)?.label.toLowerCase() || tab;

  const sortOptions =
    tab === "flights"
      ? [
          ["recommended", "Departure (earliest)"],
          ["price-asc", "Price: Low to High"],
          ["duration", "Duration (shortest)"],
        ]
      : [
          ["recommended", "Recommended"],
          ["price-asc", "Price: Low to High"],
          ["price-desc", "Price: High to Low"],
          ...(["hotels", "homestays", "holiday", "trains", "buses", "cabs"].includes(tab) ? [["rating", "Rating"]] : []),
        ];

  // ---------------------------------------------------------------- render

  return (
    <div className="relative pb-20">
      <Seo
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            description: DEFAULT_DESCRIPTION,
            inLanguage: "en-IN",
            author: { "@type": "Person", name: AUTHOR, url: "https://github.com/PawanBhandari03" },
          },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: SITE_NAME,
            codeRepository: GITHUB_URL,
            programmingLanguage: ["Java", "TypeScript"],
            author: { "@type": "Person", name: AUTHOR },
          },
        ]}
      />
      <h1 className="sr-only">{SITE_NAME}: book flights, hotels, trains, buses, cabs and holidays</h1>
      <div className="absolute left-0 top-0 z-0 h-[620px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=2940&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a192f]/60 via-[#0a192f]/40 to-slate-50" />
      </div>

      <main className="container relative z-10 mx-auto px-4 pb-6 pt-14">
        {/* Category tabs */}
        <nav className="mx-auto mb-6 max-w-5xl overflow-x-auto rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
          <div className="flex min-w-max items-center justify-between gap-1">
            {TABS.map((t) => (
              <NavItem key={t.id} icon={t.icon} text={t.label} active={tab === t.id} onClick={() => switchTab(t.id)} />
            ))}
          </div>
        </nav>

        {toast && (
          <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center space-x-2 rounded-full bg-slate-900 px-6 py-3 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-5">
            <Check className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium">{toast}</span>
          </div>
        )}

        {/* Search form */}
        <div ref={searchRef} className="mx-auto max-w-5xl scroll-mt-24 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl md:p-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr"
          >
            {(tab === "flights" || tab === "trains" || tab === "buses" || tab === "cabs") && (
              <>
                <div className="relative">
                  <SearchSelect
                    options={options[tab]}
                    placeholder="From"
                    value={form.from}
                    onChange={(v) => setField("from", v)}
                    icon={<MapPin />}
                    subtitle="Enter city or airport"
                  />
                  <button
                    type="button"
                    onClick={swap}
                    aria-label="Swap from and to"
                    className="absolute -right-4 top-1/2 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border bg-white text-blue-600 shadow hover:bg-blue-50 lg:flex"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </button>
                </div>
                <SearchSelect
                  options={toOptions}
                  placeholder="To"
                  value={form.to}
                  onChange={(v) => setField("to", v)}
                  icon={<MapPin />}
                  subtitle="Enter city or airport"
                />
                <DateField
                  label="Date"
                  value={form.date}
                  min={isoDay(0)}
                  max={tab === "flights" && lastFlightDay ? lastFlightDay : undefined}
                  onChange={(v) => setField("date", v)}
                  subtitle={tab === "flights" && lastFlightDay ? `Flights until ${formatDate(lastFlightDay)}` : "Select a date"}
                />
                <CountField
                  label={tab === "cabs" ? "Cabs" : tab === "flights" ? "Travelers" : "Passengers"}
                  value={form.qty}
                  onChange={(v) => setField("qty", v)}
                  subtitle={tab === "cabs" ? "Number of cabs" : "Number of travelers"}
                />
              </>
            )}

            {(tab === "hotels" || tab === "homestays") && (
              <>
                <SearchSelect
                  options={options[tab]}
                  placeholder="City"
                  value={form.city}
                  onChange={(v) => setField("city", v)}
                  icon={<MapPin />}
                  subtitle="Enter city"
                />
                <DateField
                  label="Check-in"
                  value={form.checkIn}
                  min={isoDay(0)}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, checkIn: v, checkOut: f.checkOut <= v ? nextDay(v) : f.checkOut }))
                  }
                  subtitle="Select a date"
                />
                <DateField
                  label="Check-out"
                  value={form.checkOut}
                  min={nextDay(form.checkIn)}
                  onChange={(v) => setField("checkOut", v)}
                  subtitle={`${nightsBetween(form.checkIn, form.checkOut)} night${nightsBetween(form.checkIn, form.checkOut) > 1 ? "s" : ""}`}
                />
                <CountField label="Rooms" value={form.qty} onChange={(v) => setField("qty", v)} subtitle="Number of rooms" />
              </>
            )}

            {tab === "holiday" && (
              <>
                <SearchSelect
                  options={options.holiday}
                  placeholder="Destination"
                  value={form.city}
                  onChange={(v) => setField("city", v)}
                  icon={<MapPin />}
                  subtitle="Anywhere if left empty"
                />
                <DateField label="Departure" value={form.date} min={isoDay(0)} onChange={(v) => setField("date", v)} subtitle="Select a date" />
                <CountField label="Travelers" value={form.qty} onChange={(v) => setField("qty", v)} subtitle="Number of travelers" />
              </>
            )}

            {tab === "forex" && (
              <>
                <SearchSelect
                  options={options.forex}
                  placeholder="Currency"
                  value={form.currency}
                  onChange={(v) => setField("currency", v)}
                  icon={<CreditCard />}
                  subtitle="e.g. USD, Euro"
                />
                <CountField label="Amount" value={form.qty} onChange={(v) => setField("qty", v)} min={1} max={100000} step={100} subtitle="In foreign currency" />
              </>
            )}

            {tab === "insurance" && (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <Shield className="text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Region</div>
                      <select
                        value={form.region}
                        onChange={(e) => setField("region", e.target.value)}
                        className="w-full bg-transparent text-lg font-semibold text-slate-900 outline-none"
                      >
                        <option value="">All plans</option>
                        <option value="Domestic">Domestic</option>
                        <option value="International">International</option>
                      </select>
                      <div className="text-xs text-slate-400">Where are you travelling?</div>
                    </div>
                  </div>
                </div>
                <CountField label="Travelers" value={form.qty} onChange={(v) => setField("qty", v)} subtitle="Number of travelers" />
              </>
            )}

            <Button
              type="submit"
              className="h-full min-h-[60px] rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 text-lg font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              SEARCH
            </Button>
          </form>

          {popular && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Popular routes:</span>
              {popular.map(([from, to]) => (
                <button
                  key={from + to}
                  type="button"
                  onClick={() => shortcut(tab, { from, to })}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {from} → {to}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="mx-auto mt-8 max-w-6xl scroll-mt-24 rounded-3xl bg-slate-50 p-4 shadow-sm ring-1 ring-slate-200/70 md:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Search Results</h2>
              {results && !loading && (
                <p className="text-sm text-slate-500">
                  {results.length} {results.length === 1 ? "option" : "options"} found
                  {!a && " (popular right now)"}
                </p>
              )}
            </div>
            {results && results.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  {sortOptions.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {loading ? (
            <div>
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" /> Loading...
              </div>
              {slow && (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                  The server is waking up. It runs on free hosting that sleeps when nobody is using it, so the first visit can take up to a
                  minute. Everything is fast after that. Thank you for waiting.
                </p>
              )}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
              We could not load the latest data. The server may still be waking up (it runs on free hosting), so please wait a few seconds and refresh the page.
            </div>
          ) : results === null ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
              Choose where you want to go and press <strong>SEARCH</strong> to see {label}, or pick one of the popular routes above.
            </div>
          ) : results.length === 0 && tab === "flights" && a && flightAlternatives.length > 0 ? (
            <div>
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>
                  No flights from <strong>{a.from}</strong> to <strong>{a.to}</strong> on <strong>{formatDate(a.date)}</strong>.
                  Here are the next available flights on this route.
                </p>
                {flightDates.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-medium">Pick another day:</span>
                    {flightDates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => shortcut("flights", { from: a.from, to: a.to, date: d, qty: a.qty })}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 font-medium text-amber-900 hover:bg-amber-100"
                      >
                        {formatDate(d)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {flightAlternatives.map((f) => (
                  <FlightCard key={f.id} flight={f} onBook={handleBook} />
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <SearchX className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-slate-700">No {label} available for the selected criteria.</p>
              {a && ["flights", "trains", "buses", "cabs"].includes(tab) && (
                <div className="mt-4 text-sm text-slate-600">
                  {reachableFromA.length > 0 ? (
                    <>
                      <p className="mb-2">
                        From <strong>{a.from}</strong> you can travel to:
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {reachableFromA.map((to) => (
                          <button
                            key={to}
                            type="button"
                            onClick={() => shortcut(tab, { from: a.from, to })}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            {a.from} → {to}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>
                      We don&apos;t have {label} from <strong>{a.from || "that place"}</strong> yet. Try one of the popular routes
                      above.
                    </p>
                  )}
                </div>
              )}
              <Link href="/routes" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
                See all routes &amp; destinations
              </Link>
            </div>
          ) : (
            <>
              <div className={gridTabs.includes(tab) ? "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
                {(ordered || results).slice(0, visible).map(renderResult)}
              </div>
              {results.length > visible && (
                <div className="mt-6 text-center">
                  <Button variant="outline" className="bg-white" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Show more ({results.length - visible} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mx-auto mt-12 max-w-7xl px-0">
          <Recommendations className="my-16" />

          {/* Offers Section */}
          <section className="my-16">
            <h2 className="mb-8 text-3xl font-bold text-slate-900">Best Offers</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.title}
                  {...offer}
                  onBook={async () => {
                    await copyCode(offer.code);
                    switchTab(offer.tab);
                    showToast(`Code ${offer.code} copied — apply it at checkout`);
                    scrollToSearch();
                  }}
                  onCopy={async () => {
                    await copyCode(offer.code);
                    showToast(`Code ${offer.code} copied`);
                  }}
                />
              ))}
            </div>
          </section>

          {/* Collections Section */}
          <section className="my-16">
            <h2 className="mb-8 text-2xl font-bold text-slate-900">Handpicked Collections for You</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {collections.map((c) => {
                const stays =
                  hotels.filter((h) => matches(h.location, c.city)).length +
                  (c.city === "Goa" ? byCategory("HOMESTAY").filter((h) => matches(h.location, c.city)).length : 0);
                return (
                  <CollectionCard
                    key={c.title}
                    title={c.title}
                    imageUrl={c.imageUrl}
                    tag={stays > 0 ? `${stays} STAYS` : "EXPLORE"}
                    onClick={() => setExplore({ title: c.title, city: c.city, tab: c.tab })}
                  />
                );
              })}
            </div>
          </section>

          {/* Wonders Section */}
          <section className="my-16">
            <h2 className="mb-8 text-2xl font-bold text-slate-900">
              Unlock Lesser-Known <span></span> Wonders of India
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wonders.map((w) => (
                <WonderCard
                  key={w.title}
                  title={w.title}
                  imageUrl={w.imageUrl}
                  onClick={() => setExplore({ title: w.title, city: w.city, tab: w.tab })}
                />
              ))}
            </div>
          </section>
        </div>

      <Dialog open={!!explore} onOpenChange={(o) => !o && setExplore(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto bg-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{explore?.title}</DialogTitle>
            <DialogDescription>
              {exploreHotels.length + exploreHomestays.length} places to stay in {explore?.city}. Prices are per night.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {exploreHotels.length + exploreHomestays.length === 0 && (
              <p className="py-10 text-center text-slate-500">No stays listed for {explore?.city} yet.</p>
            )}
            {exploreHotels.map((h) => (
              <StayCard key={h.id} stay={h} kind="hotel" nights={1} onBook={(item) => bookFromExplore("hotel", item)} />
            ))}
            {exploreHomestays.map((h) => (
              <StayCard key={h.id} stay={h} kind="homestay" nights={1} onBook={(item) => bookFromExplore("homestay", item)} />
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setExplore(null)}>
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                if (!explore) return;
                const target = explore;
                setExplore(null);
                shortcut(target.tab, { city: target.city });
              }}
            >
              Open in search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}

const nextDay = (iso: string) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// ---------------------------------------------------------------- small components

const OfferCard = ({ title, description, imageUrl, code, onBook, onCopy }: any) => (
  <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
    <SmartImage src={imageUrl} alt={title} className="h-48 w-full object-cover" />
    <div className="p-5">
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Use code</div>
          <div className="font-mono text-base font-bold text-blue-800">{code}</div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          <Copy className="h-4 w-4" /> Copy
        </button>
      </div>
      <button
        onClick={onBook}
        className="mt-4 rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
      >
        Book Now
      </button>
    </div>
  </div>
);

const CollectionCard = ({ title, imageUrl, tag, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
  >
    <SmartImage
      src={imageUrl}
      alt={title}
      className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-110"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/90">
      <div className="absolute left-4 top-4">
        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-blue-900 shadow-sm backdrop-blur-sm">
          {tag}
        </span>
      </div>
      <div className="absolute bottom-4 left-4 right-4 transition-transform duration-300 group-hover:-translate-y-2">
        <h3 className="mb-1 text-xl font-bold text-white">{title}</h3>
        <p className="flex items-center text-sm text-blue-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Explore Collection &rarr;
        </p>
      </div>
    </div>
  </button>
);

const WonderCard = ({ title, imageUrl, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
  >
    <SmartImage
      src={imageUrl}
      alt={title}
      className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
      <div className="absolute bottom-6 left-6 right-6">
        <h3 className="mb-2 text-lg font-bold leading-tight text-white transition-colors duration-300 group-hover:text-amber-300">
          {title}
        </h3>
        <div className="h-0.5 w-0 bg-amber-400 transition-all duration-300 group-hover:w-12" />
      </div>
    </div>
  </button>
);

function NavItem({ icon, text, active = false, onClick }: any) {
  return (
    <button
      className={`flex flex-col items-center rounded-xl px-4 py-3 transition-all duration-200 ${
        active ? "scale-105 bg-blue-50 text-blue-600 shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-blue-500"
      }`}
      onClick={onClick}
    >
      <div className={`mb-1 transition-colors ${active ? "text-blue-600" : "text-slate-400"}`}>{icon}</div>
      <span className="whitespace-nowrap text-sm font-bold">{text}</span>
    </button>
  );
}

function DateField({ label, value, min, max, onChange, subtitle }: { label: string; value: string; min?: string; max?: string; onChange: (v: string) => void; subtitle?: string }) {
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex items-center gap-3">
        <Calendar className="text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          <input
            type="date"
            value={value}
            min={min}
            max={max}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none"
          />
          <div className="truncate text-xs text-slate-400">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function CountField({
  label,
  value,
  onChange,
  subtitle,
  min = 1,
  max = 20,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  subtitle?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const btn =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-lg font-bold leading-none text-blue-600 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent";
  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex items-center gap-3">
        <Users className="shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Decrease ${label}`}>
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                onChange(isNaN(n) ? min : clamp(n));
              }}
              className="w-full min-w-0 bg-transparent text-center text-lg font-semibold text-slate-900 outline-none"
              aria-label={label}
            />
            <button type="button" className={btn} onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`Increase ${label}`}>
              +
            </button>
          </div>
          <div className="truncate text-xs text-slate-400">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
