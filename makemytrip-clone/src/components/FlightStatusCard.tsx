import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Clock,
  DoorOpen,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Ticket,
  Trash2,
  XCircle,
} from "lucide-react";
import { delayText, formatDate, formatTime, relativeMinutes, timeAgo } from "@/lib/format";

export type Tone = { pill: string; bar: string; ring: string };
const TONES: Record<string, Tone> = {
  good: { pill: "bg-green-100 text-green-700", bar: "bg-green-500", ring: "ring-green-300" },
  warn: { pill: "bg-amber-100 text-amber-800", bar: "bg-amber-500", ring: "ring-amber-300" },
  bad: { pill: "bg-red-100 text-red-700", bar: "bg-red-500", ring: "ring-red-300" },
  info: { pill: "bg-sky-100 text-sky-700", bar: "bg-sky-500", ring: "ring-sky-300" },
};

export const statusOf = (f: any): { label: string; tone: string } => {
  switch (f.phase) {
    case "CANCELLED":
      return { label: "Cancelled", tone: "bad" };
    case "LANDED":
      return { label: "Landed", tone: "info" };
    case "DEPARTED":
      return { label: f.delayMinutes > 0 ? "In the air · late" : "In the air", tone: "info" };
    case "BOARDING":
      return { label: "Boarding", tone: "good" };
    default:
      return f.delayMinutes > 0 ? { label: `Delayed by ${delayText(f.delayMinutes)}`, tone: "warn" } : { label: "On time", tone: "good" };
  }
};

const eventIcon = (type: string) => {
  switch (type) {
    case "DELAY_ANNOUNCED":
    case "DELAY_EXTENDED":
      return <Clock className="h-3.5 w-3.5" />;
    case "GATE_CHANGED":
      return <DoorOpen className="h-3.5 w-3.5" />;
    case "DEPARTED":
      return <PlaneTakeoff className="h-3.5 w-3.5" />;
    case "LANDED":
      return <PlaneLanding className="h-3.5 w-3.5" />;
    case "CANCELLED":
      return <XCircle className="h-3.5 w-3.5" />;
    default:
      return <Bell className="h-3.5 w-3.5" />;
  }
};

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-0.5 font-semibold text-slate-900">{children}</div>
  </div>
);

type CardProps = {
  f: any;
  /** Minutes that have passed since the data was fetched, so countdowns keep moving between refreshes. */
  elapsedMin: number;
  flash: boolean;
  highlighted: boolean;
  /** When given, the card shows a "Stop following" link. */
  onUntrack?: (f: any) => void;
  /** Extra controls for the footer, such as a "Follow this flight" button. */
  actions?: React.ReactNode;
};

const FlightStatusCard = ({ f, elapsedMin, flash, highlighted, onUntrack, actions }: CardProps) => {
  const [showAll, setShowAll] = useState(highlighted);
  const st = statusOf(f);
  const tone = TONES[st.tone];
  const delayed = f.delayMinutes > 0 && f.phase !== "CANCELLED";
  const toDeparture = f.minutesToDeparture - elapsedMin;
  const toArrival = f.minutesToArrival - elapsedMin;
  const finished = f.phase === "LANDED" || f.phase === "CANCELLED";
  const events: any[] = f.events || [];
  const shown = showAll ? events : events.slice(0, 3);

  let headline = "";
  if (f.phase === "CANCELLED") headline = "This flight will not operate";
  else if (f.phase === "LANDED") headline = `Landed ${relativeMinutes(toArrival)}`;
  else if (f.phase === "DEPARTED") headline = `Arrives ${relativeMinutes(toArrival)}`;
  else if (toDeparture <= 0) headline = "Departing now";
  else headline = `Departs ${relativeMinutes(toDeparture)}`;

  return (
    <article
      id={`flight-${f.flightNumber}`}
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-500 ${
        flash || highlighted ? `ring-2 ${tone.ring}` : "border-slate-200"
      } ${finished ? "opacity-80" : ""}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight">
              {f.airline} <span className="font-mono text-slate-500">{f.flightNumber}</span>
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              {f.from} <ArrowRight className="h-3.5 w-3.5" /> {f.to}
              <span className="text-slate-400">· {formatDate(f.scheduledDeparture)}</span>
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${tone.pill}`}>{st.label}</span>
      </header>

      {/* Why and by how much, like an airport board */}
      {delayed && (
        <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Delayed by {delayText(f.delayMinutes)}</strong>
            {f.delayReason ? ` — ${f.delayReason}` : ""}.
            <div className="mt-0.5 text-amber-800">
              New departure {formatTime(f.estimatedDeparture)} (scheduled {formatTime(f.scheduledDeparture)}), estimated arrival{" "}
              {formatTime(f.estimatedArrival)}.
            </div>
          </div>
        </div>
      )}
      {f.phase === "CANCELLED" && (
        <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Cancelled</strong>
            {f.delayReason ? ` — ${f.delayReason}` : ""}. If you booked this flight, you can cancel it for a refund in{" "}
            <Link href="/profile#trips" className="font-semibold underline">
              My Trips
            </Link>
            .
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label="Departure">
          {delayed && <span className="block text-xs font-normal text-slate-400 line-through">{formatTime(f.scheduledDeparture)}</span>}
          <span className="whitespace-nowrap">{formatTime(f.estimatedDeparture)}</span>
        </Fact>
        <Fact label="Est. arrival">
          {delayed && <span className="block text-xs font-normal text-slate-400 line-through">{formatTime(f.scheduledArrival)}</span>}
          <span className="whitespace-nowrap">{formatTime(f.estimatedArrival)}</span>
        </Fact>
        <Fact label="Gate / terminal">
          {f.gate} · {f.terminal}
        </Fact>
        <Fact label="Status">{headline}</Fact>
      </div>

      {/* Journey progress */}
      {(f.phase === "DEPARTED" || f.phase === "LANDED") && (
        <div className="mt-4">
          <div className="relative h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full transition-all duration-1000 ${tone.bar}`} style={{ width: `${f.phase === "LANDED" ? 100 : f.progress}%` }} />
            <Plane
              className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rotate-45 text-slate-700 transition-all duration-1000"
              style={{ left: `${f.phase === "LANDED" ? 100 : Math.max(2, f.progress)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>{f.from}</span>
            <span>{f.phase === "LANDED" ? "Landed" : `${f.progress}% of the way`}</span>
            <span>{f.to}</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Updates</h3>
          <ul className="space-y-2">
            {shown.map((e) => (
              <li key={e.id} className="flex gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">{eventIcon(e.type)}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{e.title}</span>
                  <span className="block text-xs text-slate-500">{e.message}</span>
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(e.createdAt)}</span>
              </li>
            ))}
          </ul>
          {events.length > 3 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
              {showAll ? "Show fewer updates" : `Show all ${events.length} updates`}
            </button>
          )}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          {f.source === "BOOKING" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
              <Ticket className="h-3 w-3" /> From your booking
            </span>
          ) : f.tracked ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Added by you</span>
          ) : (
            <span>Updated {timeAgo(f.updatedAt)}</span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {actions}
          {onUntrack && (
            <button type="button" onClick={() => onUntrack(f)} className="flex items-center gap-1 font-medium text-slate-500 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" /> Stop following
            </button>
          )}
        </span>
      </footer>
    </article>
  );
};

export default FlightStatusCard;
