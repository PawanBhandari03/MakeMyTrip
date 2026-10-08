import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  Building2,
  Database,
  Gauge,
  IndianRupee,
  LayoutDashboard,
  Layers,
  Loader2,
  Plane,
  Radio,
  Receipt,
  Star,
  RefreshCw,
  Search,
  Ticket,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SignupDialog from "@/components/SignupDialog";
import Seo from "@/components/Seo";
import EntityManager, { Column, Field } from "@/components/admin/EntityManager";
import FlightOps from "@/components/admin/FlightOps";
import PricingAdmin from "@/components/admin/PricingAdmin";
import RefundsAdmin from "@/components/admin/RefundsAdmin";
import ReviewsAdmin from "@/components/admin/ReviewsAdmin";
import {
  addflight,
  addhotel,
  changeuserrole,
  deleteflight,
  deletehotel,
  deletelisting,
  editflight,
  edithotel,
  getadminstats,
  getallusers,
  getflight,
  gethotel,
  getlistings,
  loaddummydata,
  savelisting,
} from "@/api";
import { errorMessage, formatDateTime, formatINR } from "@/lib/format";

type Tab = "dashboard" | "flights" | "flightops" | "hotels" | "services" | "pricing" | "refunds" | "reviews" | "users";

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "flights", label: "Flights", icon: <Plane className="h-4 w-4" /> },
  { id: "flightops", label: "Flight Ops", icon: <Radio className="h-4 w-4" /> },
  { id: "hotels", label: "Hotels", icon: <Building2 className="h-4 w-4" /> },
  { id: "services", label: "Services", icon: <Layers className="h-4 w-4" /> },
  { id: "pricing", label: "Pricing", icon: <Gauge className="h-4 w-4" /> },
  { id: "refunds", label: "Refunds", icon: <Receipt className="h-4 w-4" /> },
  { id: "reviews", label: "Reviews", icon: <Star className="h-4 w-4" /> },
  { id: "users", label: "Users", icon: <UsersIcon className="h-4 w-4" /> },
];

const CATEGORIES = ["HOMESTAY", "HOLIDAY", "TRAIN", "BUS", "CAB", "FOREX", "INSURANCE"];

const DemoBadge = ({ row }: { row: any }) =>
  row.demo ? (
    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">demo</span>
  ) : null;

// ---------------------------------------------------------------- dashboard

const StatCard = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</div>
    <div className="text-2xl font-extrabold">{value}</div>
    <div className="text-sm text-slate-500">{label}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setStats(await getadminstats());
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Could not load the dashboard."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSeed = async (reset: boolean) => {
    if (reset && !window.confirm("Replace all demo flights, hotels and services with fresh demo data? Items you added yourself are kept.")) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await loaddummydata(reset);
      const parts = Object.entries(res)
        .filter(([k]) => k !== "reset")
        .map(([k, v]) => `${v} ${k}`);
      setMessage(parts.length ? `Loaded ${parts.join(", ")}.` : "Demo data is already up to date.");
      await load();
    } catch (e) {
      setMessage(errorMessage(e, "Could not load demo data."));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!stats)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );

  const byType: [string, number][] = Object.entries(stats.revenueByType || {}) as [string, number][];
  const maxRevenue = Math.max(1, ...byType.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(stats.revenue)} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="Active bookings" value={stats.bookingsConfirmed} icon={<Ticket className="h-5 w-5" />} />
        <StatCard
          label={`Users (${stats.admins} admin)`}
          value={stats.users}
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard label="Cancelled bookings" value={stats.bookingsCancelled} icon={<RefreshCw className="h-5 w-5" />} />
        <StatCard label="Flights" value={stats.flights} icon={<Plane className="h-5 w-5" />} />
        <StatCard label="Hotels" value={stats.hotels} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Other services" value={stats.listings} icon={<Layers className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold">Revenue by category</h3>
          {byType.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {byType.map(([type, value]) => (
                <div key={type}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-semibold">{formatINR(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(value / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 flex items-center gap-2 font-bold">
            <Database className="h-4 w-4" /> Demo data
          </h3>
          <p className="mb-4 text-sm text-slate-500">
            Fill the site with sample flights, hotels, trains, buses, cabs, homestays, holidays, forex and insurance. Items you add
            yourself are never removed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => runSeed(false)} className="bg-blue-600 hover:bg-blue-700">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Load missing demo data
            </Button>
            <Button disabled={busy} variant="outline" onClick={() => runSeed(true)}>
              Reset demo data
            </Button>
          </div>
          {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-bold">Recent bookings</h3>
        {stats.recentBookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Booking</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b: any, i: number) => (
                  <tr key={(b.reference || "") + i} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{b.reference || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{b.title}</div>
                      <div className="text-xs text-slate-500">{b.type}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{b.customer}</div>
                      <div className="text-xs text-slate-500">{b.email}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{formatDateTime(b.bookedAt)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatINR(b.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- users

const UsersTab = ({ currentId }: { currentId: string }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setUsers(await getallusers());
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Could not load users."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q));
  }, [users, query]);

  const toggleRole = async (u: any) => {
    const next = u.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(`Make ${u.email} ${next === "ADMIN" ? "an administrator" : "a customer"}?`)) return;
    try {
      await changeuserrole(u.id, next);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not change the role."));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">User Management</h2>
        <p className="text-sm text-slate-500">Search for users by name or email and manage their role.</p>
      </div>
      <div className="p-5 pb-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search user by name or email"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
      <div className="overflow-x-auto p-5">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Bookings</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-3 py-2.5">{u.email}</td>
                  <td className="px-3 py-2.5">{u.phoneNumber || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "ADMIN" ? "Admin" : "Customer"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{(u.bookings || []).length}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={u.id === currentId}
                      title={u.id === currentId ? "You cannot change your own role" : undefined}
                      onClick={() => toggleRole(u)}
                    >
                      {u.role === "ADMIN" ? "Make customer" : "Make admin"}
                    </Button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- managers

const flightFields: Field[] = [
  { key: "flightName", label: "Flight name", type: "text", required: true, placeholder: "IndiGo 6E-201" },
  { key: "price", label: "Price (₹ per seat)", type: "number", required: true },
  { key: "from", label: "From", type: "text", required: true },
  { key: "to", label: "To", type: "text", required: true },
  { key: "departureTime", label: "Departure time", type: "datetime-local", required: true },
  { key: "arrivalTime", label: "Arrival time", type: "datetime-local", required: true },
  { key: "availableSeats", label: "Available seats", type: "number", required: true },
  { key: "capacity", label: "Capacity (seats when full)", type: "number", help: "Prices rise as seats run out, measured against this. Leave 0 to use the seats above." },
];

const flightColumns: Column[] = [
  { header: "Flight", render: (r) => (<><span className="font-medium">{r.flightName}</span><DemoBadge row={r} /></>) },
  { header: "Route", render: (r) => `${r.from} → ${r.to}` },
  { header: "Departure", render: (r) => formatDateTime(r.departureTime) },
  { header: "Price", render: (r) => formatINR(r.price) },
  { header: "Seats", render: (r) => r.availableSeats },
];

const hotelFields: Field[] = [
  { key: "hotelName", label: "Hotel name", type: "text", required: true },
  { key: "location", label: "Location (city)", type: "text", required: true },
  { key: "pricePerNight", label: "Price per night (₹)", type: "number", required: true },
  { key: "availableRooms", label: "Available rooms", type: "number", required: true },
  { key: "capacity", label: "Capacity (rooms when full)", type: "number", help: "Prices rise as rooms run out, measured against this. Leave 0 to use the rooms above." },
  { key: "rating", label: "Rating (0-5)", type: "number" },
  { key: "imageUrl", label: "Image URL", type: "text", placeholder: "https://..." },
  { key: "amenities", label: "Amenities", type: "textarea", required: true, help: "Separate with commas, e.g. Wi-Fi, Pool, Spa" },
  { key: "description", label: "Description", type: "textarea" },
];

const hotelColumns: Column[] = [
  { header: "Hotel", render: (r) => (<><span className="font-medium">{r.hotelName}</span><DemoBadge row={r} /></>) },
  { header: "Location", render: (r) => r.location },
  { header: "Price / night", render: (r) => formatINR(r.pricePerNight) },
  { header: "Rooms", render: (r) => r.availableRooms },
  { header: "Rating", render: (r) => (r.rating ? Number(r.rating).toFixed(1) : "—") },
];

const listingFields: Field[] = [
  { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "provider", label: "Provider / operator", type: "text" },
  { key: "type", label: "Class / type / plan", type: "text", placeholder: "AC 3 Tier, SUV, Gold..." },
  { key: "price", label: "Price (₹)", type: "number", required: true },
  { key: "unit", label: "Price unit", type: "text", placeholder: "per night, per person..." },
  { key: "available", label: "Available units", type: "number", required: true, help: "Use -1 for unlimited (forex, insurance)." },
  { key: "capacity", label: "Capacity (units when full)", type: "number", help: "Prices rise as units run out, measured against this. Leave 0 to use the units above." },
  { key: "from", label: "From", type: "text", help: "Trains, buses and cabs" },
  { key: "to", label: "To", type: "text", help: "Trains, buses and cabs" },
  { key: "location", label: "Location / region", type: "text", help: "City for homestays, destination for holidays, Domestic/International for insurance" },
  { key: "departureTime", label: "Departure time", type: "text", placeholder: "16:55" },
  { key: "arrivalTime", label: "Arrival time", type: "text", placeholder: "08:35 +1" },
  { key: "duration", label: "Duration", type: "text", placeholder: "5h 30m / 4 Nights / 5 Days" },
  { key: "rating", label: "Rating (0-5)", type: "number" },
  { key: "imageUrl", label: "Image URL", type: "text", full: true },
  { key: "features", label: "Features / inclusions", type: "textarea", help: "Separate with commas" },
  { key: "description", label: "Description", type: "textarea" },
];

const ServicesManager = () => {
  const [category, setCategory] = useState("ALL");
  const load = useCallback(() => getlistings(), []);
  const filter = useCallback((r: any) => category === "ALL" || r.category === category, [category]);
  const columns: Column[] = [
    { header: "Name", render: (r) => (<><span className="font-medium">{r.name}</span><DemoBadge row={r} /></>) },
    { header: "Category", render: (r) => r.category },
    { header: "Route / place", render: (r) => (r.from && r.to ? `${r.from} → ${r.to}` : r.location || "—") },
    { header: "Type", render: (r) => r.type || "—" },
    { header: "Price", render: (r) => formatINR(r.price) },
    { header: "Left", render: (r) => (r.available < 0 ? "∞" : r.available) },
  ];
  return (
    <EntityManager
      title="Manage Services"
      noun="Service"
      description="Homestays, holidays, trains, buses, cabs, forex and insurance."
      load={load}
      save={savelisting}
      remove={deletelisting}
      fields={listingFields}
      columns={columns}
      blank={() => ({
        category: category === "ALL" ? "HOMESTAY" : category,
        name: "",
        price: 0,
        available: 10,
        unit: "",
      })}
      searchText={(r) => `${r.name} ${r.from || ""} ${r.to || ""} ${r.location || ""} ${r.provider || ""} ${r.type || ""}`}
      filter={filter}
      toolbar={
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="ALL">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      }
    />
  );
};

// ---------------------------------------------------------------- page

export default function AdminDashboard() {
  const user = useSelector((state: any) => state.user.user);
  const ready = useSelector((state: any) => state.user.ready);
  const [tab, setTabState] = useState<Tab>("dashboard");

  // Tabs can be opened directly, for example /admin#flightops
  useEffect(() => {
    const h = window.location.hash.replace("#", "") as Tab;
    if (NAV.some((n) => n.id === h)) setTabState(h);
  }, []);
  const setTab = (t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, "", `#${t}`);
  };

  const loadFlights = useCallback(() => getflight(), []);
  const loadHotels = useCallback(() => gethotel(), []);
  const saveFlight = useCallback((f: any) => (f.id ? editflight(f.id, f) : addflight(f)), []);
  const saveHotel = useCallback((h: any) => (h.id ? edithotel(h.id, h) : addhotel(h)), []);

  if (!ready) return <Seo title="Admin Dashboard" path="/admin" noindex />;

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Seo title="Admin Dashboard" path="/admin" noindex />
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-slate-600">
          {user ? "Your account does not have access to the admin dashboard." : "Please log in with an administrator account."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {!user && (
            <SignupDialog trigger={<Button className="bg-blue-600 text-white hover:bg-blue-700">Log in</Button>} />
          )}
          <Link href="/" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Seo title="Admin Dashboard" path="/admin" noindex />
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === n.id ? "bg-slate-900 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "dashboard" && <Dashboard />}
          {tab === "flights" && (
            <EntityManager
              title="Manage Flights"
              noun="Flight"
              description="Add, edit, or remove flights from the system."
              load={loadFlights}
              save={saveFlight}
              remove={deleteflight}
              fields={flightFields}
              columns={flightColumns}
              blank={() => ({ flightName: "", from: "", to: "", departureTime: "", arrivalTime: "", price: 0, availableSeats: 100 })}
              searchText={(r) => `${r.flightName} ${r.from} ${r.to}`}
            />
          )}
          {tab === "flightops" && <FlightOps />}
          {tab === "hotels" && (
            <EntityManager
              title="Manage Hotels"
              noun="Hotel"
              description="Add, edit, or remove hotels from the system."
              load={loadHotels}
              save={saveHotel}
              remove={deletehotel}
              fields={hotelFields}
              columns={hotelColumns}
              blank={() => ({ hotelName: "", location: "", pricePerNight: 0, availableRooms: 10, amenities: "", rating: 4, imageUrl: "", description: "" })}
              searchText={(r) => `${r.hotelName} ${r.location}`}
            />
          )}
          {tab === "services" && <ServicesManager />}
          {tab === "pricing" && <PricingAdmin />}
          {tab === "refunds" && <RefundsAdmin />}
          {tab === "reviews" && <ReviewsAdmin />}
          {tab === "users" && <UsersTab currentId={user.id} />}
        </div>
      </div>
    </div>
  );
}
