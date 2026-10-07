import React from "react";
import { Gauge } from "lucide-react";
import EntityManager, { Column, Field } from "@/components/admin/EntityManager";
import { deletepricingrule, getpricingrules, savepricingrule } from "@/api";
import { isoDay } from "@/lib/format";

const CATEGORIES = ["ALL", "FLIGHT", "HOTEL", "HOMESTAY", "HOLIDAY", "TRAIN", "BUS", "CAB"];

const fields: Field[] = [
  { key: "name", label: "Rule name", type: "text", required: true, placeholder: "Diwali week", help: "Shown to customers when this rule changes their price." },
  { key: "category", label: "Applies to", type: "select", options: CATEGORIES, required: true },
  { key: "startDate", label: "First travel date", type: "date", required: true },
  { key: "endDate", label: "Last travel date", type: "date", required: true },
  { key: "percent", label: "Price change (%)", type: "number", required: true, help: "Use a positive number for a peak period (20 = +20%) and a negative one for a sale (-10)." },
  { key: "active", label: "Active", type: "boolean", help: "Switch off to stop applying this rule without deleting it." },
  { key: "description", label: "Explanation for customers", type: "textarea", full: true, placeholder: "Everyone travels home for Diwali, so fares are at their peak." },
];

const columns: Column[] = [
  {
    header: "Rule",
    render: (r) => (
      <>
        <span className="font-medium">{r.name}</span>
        {r.demo && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">demo</span>}
      </>
    ),
  },
  { header: "Applies to", render: (r) => r.category },
  { header: "Travel dates", render: (r) => `${r.startDate} → ${r.endDate}` },
  {
    header: "Change",
    render: (r) => (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.percent >= 0 ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
        {r.percent > 0 ? "+" : ""}
        {r.percent}%
      </span>
    ),
  },
  {
    header: "Status",
    render: (r) => (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
        {r.active ? "Active" : "Off"}
      </span>
    ),
  },
];

const FACTORS: [string, string][] = [
  ["Season rules (below)", "Festivals, long weekends and sales. You control these."],
  ["Weekend travel", "+6% for Fri to Sun transport, +8% for Fri and Sat stays."],
  ["Booking window", "Early-bird discounts up to -8%; last-minute increases up to +28% for flights, trains and buses."],
  ["Time of day", "+4% for peak-hour departures, -7% for late-night ones."],
  ["Demand", "+7% to +18% as seats or rooms run out; -3% while most are still open."],
  ["Market movement", "A small drift of up to ±3%, refreshed every 15 minutes."],
];

/** Season rules and an explanation of how every price is built. */
const PricingAdmin = () => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Gauge className="h-5 w-5 text-blue-600" /> Dynamic pricing
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Every price starts from the base fare you set on a flight, hotel or service, and is moved by the factors below. The total is kept
        between <strong>-15%</strong> and <strong>+60%</strong> of the base fare so prices stay predictable, and customers can always see
        why a price is what it is. Changes to a rule apply within seconds.
      </p>
      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {FACTORS.map(([k, v]) => (
          <div key={k}>
            <dt className="font-semibold text-slate-800">{k}</dt>
            <dd className="text-slate-600">{v}</dd>
          </div>
        ))}
      </dl>
    </div>

    <EntityManager
      title="Season rules"
      noun="Rule"
      description="Peak periods and sales, by travel date. If several rules cover a date, the biggest change wins."
      load={getpricingrules}
      save={savepricingrule}
      remove={deletepricingrule}
      fields={fields}
      columns={columns}
      blank={() => ({ name: "", category: "ALL", startDate: isoDay(7), endDate: isoDay(10), percent: 10, active: true, description: "" })}
      searchText={(r) => `${r.name} ${r.category} ${r.description || ""}`}
    />
  </div>
);

export default PricingAdmin;
