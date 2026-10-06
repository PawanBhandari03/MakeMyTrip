import React from "react";
import { ArrowRight, Clock, MapPin, Plane, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import SmartImage from "@/components/SmartImage";
import { durationBetween, formatDate, formatINR, formatTime } from "@/lib/format";

type OnBook = (item: any) => void;

const Chips = ({ text, max = 4 }: { text?: string; max?: number }) => {
  const items = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, max).map((a) => (
        <span key={a} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
          {a}
        </span>
      ))}
      {items.length > max && <span className="px-1 text-xs text-slate-400">+{items.length - max} more</span>}
    </div>
  );
};

const Rating = ({ value }: { value?: number }) =>
  value && value > 0 ? (
    <span className="inline-flex items-center rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white">
      {Number(value).toFixed(1)}
      <Star className="ml-0.5 h-3 w-3 fill-current" />
    </span>
  ) : null;

const Availability = ({ left }: { left: number }) =>
  left < 0 ? null : left <= 0 ? (
    <span className="text-xs font-semibold text-red-600">Sold out</span>
  ) : left <= 10 ? (
    <span className="text-xs font-semibold text-orange-600">Only {left} left</span>
  ) : (
    <span className="text-xs text-slate-500">{left} available</span>
  );

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg";

export const FlightCard = ({ flight, onBook }: { flight: any; onBook: OnBook }) => {
  const flightNo = flight.flightName.split(" ").slice(-1)[0];
  const airline = flight.flightName.replace(flightNo, "").trim() || flight.flightName;
  return (
    <div className={`${cardClass} flex flex-col gap-4 md:flex-row md:items-center`}>
      <div className="flex items-center gap-3 md:w-52">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Plane className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">{airline}</div>
          <div className="text-xs text-slate-500">{flightNo}</div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-4">
        <div>
          <div className="text-xl font-bold">{formatTime(flight.departureTime)}</div>
          <div className="text-sm text-slate-500">{flight.from}</div>
        </div>
        <div className="flex flex-1 flex-col items-center text-xs text-slate-500">
          <span>{durationBetween(flight.departureTime, flight.arrivalTime)}</span>
          <div className="my-1 flex w-full max-w-[160px] items-center">
            <div className="h-px flex-1 bg-slate-300" />
            <ArrowRight className="mx-1 h-3.5 w-3.5" />
            <div className="h-px flex-1 bg-slate-300" />
          </div>
          <span>Non-stop • {formatDate(flight.departureTime)}</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{formatTime(flight.arrivalTime)}</div>
          <div className="text-sm text-slate-500">{flight.to}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t pt-3 md:w-56 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <div className="md:text-right">
          <div className="text-2xl font-extrabold">{formatINR(flight.price)}</div>
          <Availability left={flight.availableSeats} />
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          disabled={flight.availableSeats < 1}
          onClick={() => onBook(flight)}
        >
          Book Now
        </Button>
      </div>
    </div>
  );
};

/** Used for both hotels and homestays. */
export const StayCard = ({
  stay,
  kind,
  nights,
  onBook,
}: {
  stay: any;
  kind: "hotel" | "homestay";
  nights: number;
  onBook: OnBook;
}) => {
  const name = kind === "hotel" ? stay.hotelName : stay.name;
  const price = kind === "hotel" ? stay.pricePerNight : stay.price;
  const left = kind === "hotel" ? stay.availableRooms : stay.available;
  const amenities = kind === "hotel" ? stay.amenities : stay.features;
  return (
    <div className={`${cardClass} flex flex-col gap-4 overflow-hidden p-0 sm:flex-row`}>
      <div className="relative h-48 w-full shrink-0 sm:h-auto sm:min-h-[14rem] sm:w-64">
        <SmartImage src={stay.imageUrl} alt={name} className="h-full w-full object-cover sm:absolute sm:inset-0" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold">{name}</h3>
            <Rating value={stay.rating} />
          </div>
          <div className="mt-1 flex items-center text-sm text-slate-500">
            <MapPin className="mr-1 h-4 w-4" />
            {stay.location}
          </div>
          {stay.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{stay.description}</p>}
          <div className="mt-3">
            <Chips text={amenities} />
          </div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-extrabold">{formatINR(price)}</div>
            <div className="text-xs text-slate-500">
              per night{nights > 1 ? ` • ${nights} nights = ${formatINR(price * nights)}` : ""}
            </div>
            <Availability left={left} />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={left === 0} onClick={() => onBook(stay)}>
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export const HolidayCard = ({ pkg, onBook }: { pkg: any; onBook: OnBook }) => (
  <div className={`${cardClass} flex flex-col overflow-hidden p-0`}>
    <div className="relative">
      <SmartImage src={pkg.imageUrl} alt={pkg.name} className="h-48 w-full object-cover" />
      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-blue-900 shadow">
        {pkg.duration}
      </span>
    </div>
    <div className="flex flex-1 flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold">{pkg.name}</h3>
        <Rating value={pkg.rating} />
      </div>
      <div className="flex items-center text-sm text-slate-500">
        <MapPin className="mr-1 h-4 w-4" />
        {pkg.location}
      </div>
      <p className="line-clamp-2 text-sm text-slate-600">{pkg.description}</p>
      <Chips text={pkg.features} max={3} />
      <div className="mt-auto flex items-end justify-between pt-2">
        <div>
          <div className="text-2xl font-extrabold">{formatINR(pkg.price)}</div>
          <div className="text-xs text-slate-500">per person</div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onBook(pkg)}>
          Book Now
        </Button>
      </div>
    </div>
  </div>
);

/** Trains, buses and cabs share one layout: a route with times, a class/type and a price. */
export const RouteCard = ({ item, onBook }: { item: any; onBook: OnBook }) => (
  <div className={`${cardClass} flex flex-col gap-4 md:flex-row md:items-center`}>
    <div className="md:w-60">
      <h3 className="font-bold">{item.name}</h3>
      <div className="mt-0.5 text-xs text-slate-500">{item.provider}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.type && (
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{item.type}</span>
        )}
        <Rating value={item.rating} />
      </div>
    </div>
    <div className="flex flex-1 items-center justify-between gap-4">
      <div>
        <div className="text-xl font-bold">{item.departureTime || item.from}</div>
        <div className="text-sm text-slate-500">{item.departureTime ? item.from : "Pickup"}</div>
      </div>
      <div className="flex flex-1 flex-col items-center text-xs text-slate-500">
        <span className="flex items-center">
          <Clock className="mr-1 h-3.5 w-3.5" />
          {item.duration || "—"}
        </span>
        <div className="my-1 flex w-full max-w-[160px] items-center">
          <div className="h-px flex-1 bg-slate-300" />
          <ArrowRight className="mx-1 h-3.5 w-3.5" />
          <div className="h-px flex-1 bg-slate-300" />
        </div>
        <span>{item.category === "CAB" ? "Door to door" : "Runs daily"}</span>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold">{item.arrivalTime || item.to}</div>
        <div className="text-sm text-slate-500">{item.arrivalTime ? item.to : "Drop"}</div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-4 border-t pt-3 md:w-56 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-5 md:pt-0">
      <div className="md:text-right">
        <div className="text-2xl font-extrabold">{formatINR(item.price)}</div>
        <div className="text-xs text-slate-500">{item.unit}</div>
        <Availability left={item.available} />
      </div>
      <Button className="bg-blue-600 hover:bg-blue-700" disabled={item.available === 0} onClick={() => onBook(item)}>
        Book Now
      </Button>
    </div>
  </div>
);

export const ForexCard = ({ item, amount, onBook }: { item: any; amount: number; onBook: OnBook }) => (
  <div className={`${cardClass} flex items-center justify-between gap-4`}>
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-lg font-extrabold text-emerald-700">
        {item.type}
      </div>
      <div>
        <h3 className="font-bold">{item.name}</h3>
        <div className="text-sm text-slate-500">{item.description}</div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          1 {item.type} = {formatINR(item.price)}
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-xs text-slate-500">
        {amount.toLocaleString("en-IN")} {item.type} costs
      </div>
      <div className="text-2xl font-extrabold">{formatINR(Math.round(item.price * amount))}</div>
      <Button className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={() => onBook(item)}>
        Book Now
      </Button>
    </div>
  </div>
);

export const InsuranceCard = ({ plan, onBook }: { plan: any; onBook: OnBook }) => (
  <div className={`${cardClass} flex flex-col gap-3`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-bold">{plan.name}</h3>
        <div className="text-sm text-slate-500">{plan.location} trips</div>
      </div>
      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{plan.type}</span>
    </div>
    <p className="text-sm text-slate-600">{plan.description}</p>
    <Chips text={plan.features} max={4} />
    <div className="mt-auto flex items-end justify-between pt-2">
      <div>
        <div className="text-2xl font-extrabold">{formatINR(plan.price)}</div>
        <div className="text-xs text-slate-500">per traveller</div>
      </div>
      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onBook(plan)}>
        Book Now
      </Button>
    </div>
  </div>
);
