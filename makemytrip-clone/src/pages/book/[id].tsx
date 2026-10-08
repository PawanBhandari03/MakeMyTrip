import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowRight,
  Bus,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Home,
  MapPin,
  Shield,
  Star,
  Train,
  Umbrella,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { getlistingbyid } from "@/api";
import Loader from "@/components/Loader";
import SmartImage from "@/components/SmartImage";
import BookingPanel from "@/components/BookingPanel";
import PriceInsights from "@/components/PriceInsights";
import RefundPolicyCard from "@/components/RefundPolicyCard";
import Reviews from "@/components/Reviews";
import { useTrackView } from "@/lib/useTrackView";
import Seo from "@/components/Seo";
import { formatINR, isoDay, nightsBetween } from "@/lib/format";

const META: Record<string, { label: string; icon: React.ReactNode; tab: string; quantityLabel: string; dateLabel?: string }> = {
  HOMESTAY: { label: "Homestay", icon: <Home className="h-6 w-6" />, tab: "homestays", quantityLabel: "Rooms", dateLabel: "Check-in date" },
  HOLIDAY: { label: "Holiday Package", icon: <Umbrella className="h-6 w-6" />, tab: "holiday", quantityLabel: "Travellers", dateLabel: "Departure date" },
  TRAIN: { label: "Train", icon: <Train className="h-6 w-6" />, tab: "trains", quantityLabel: "Passengers", dateLabel: "Journey date" },
  BUS: { label: "Bus", icon: <Bus className="h-6 w-6" />, tab: "buses", quantityLabel: "Seats", dateLabel: "Journey date" },
  CAB: { label: "Cab", icon: <Car className="h-6 w-6" />, tab: "cabs", quantityLabel: "Cabs", dateLabel: "Pickup date" },
  FOREX: { label: "Forex", icon: <CreditCard className="h-6 w-6" />, tab: "forex", quantityLabel: "Amount" },
  INSURANCE: { label: "Insurance", icon: <Shield className="h-6 w-6" />, tab: "insurance", quantityLabel: "Travellers", dateLabel: "Cover starts on" },
};

const Fact = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-semibold text-slate-900">{value}</div>
    </div>
  ) : null;

const BookListingPage = () => {
  const router = useRouter();
  const { id, qty, date, checkIn, checkOut } = router.query;
  const [item, setItem] = useState<any>(null);
  useTrackView(item?.category || "", item?.category ? item?.id : null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [nights, setNights] = useState(1);
  const [travelDate, setTravelDate] = useState(isoDay(1));

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setItem(await getlistingbyid(String(id)));
      setNotFound(false);
    } catch (error) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const n = parseInt(String(qty || ""), 10);
    if (!isNaN(n) && n > 0) setQuantity(n);
    if (typeof date === "string" && date) setTravelDate(date);
    if (typeof checkIn === "string" && checkIn) {
      setTravelDate(checkIn);
      if (typeof checkOut === "string" && checkOut) setNights(nightsBetween(checkIn, checkOut));
    }
  }, [qty, date, checkIn, checkOut]);

  if (loading) return <Loader />;
  if (notFound || !item) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Not found</h1>
        <p className="mt-2 text-slate-600">This item may have been removed.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white">
          Back to home
        </Link>
      </div>
    );
  }

  const cat: string = item.category;
  const meta = META[cat] || META.HOLIDAY;
  const unlimited = item.available < 0;
  const isForex = cat === "FOREX";
  const maxQuantity = isForex ? 100000 : unlimited ? 20 : Math.min(20, item.available);
  const features: string[] = (item.features || "")
    .split(",")
    .map((f: string) => f.trim())
    .filter(Boolean);
  const hasRoute = item.from && item.to;
  const quantityLabel = isForex ? `Amount (${item.type})` : meta.quantityLabel;

  return (
    <div className="bg-slate-50">
      <Seo title={`${item.name}${item.location ? ", " + item.location : ""}`} path={`/book/${item.id}`} noindex />
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <Link href={`/?tab=${meta.tab}`} className="text-blue-600 hover:underline">
              {meta.label}s
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">{item.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2 lg:row-start-1">
            {item.imageUrl && (
              <div className="overflow-hidden rounded-2xl">
                <SmartImage src={item.imageUrl} alt={item.name} className="h-72 w-full object-cover" />
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-start gap-4">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">{meta.icon}</div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-extrabold tracking-tight">{item.name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    {item.provider && <span>{item.provider}</span>}
                    {item.type && !isForex && <span>• {item.type}</span>}
                    {item.location && !isForex && (
                      <span className="flex items-center">
                        <MapPin className="mr-1 h-4 w-4" />
                        {item.location}
                      </span>
                    )}
                    {item.rating > 0 && (
                      <span className="flex items-center text-yellow-600">
                        <Star className="mr-1 h-4 w-4 fill-current" />
                        {Number(item.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">{formatINR(item.price)}</div>
                  <div className="text-xs text-slate-500">{item.unit}</div>
                </div>
              </div>

              {hasRoute && (
                <div className="my-6 flex flex-wrap items-center justify-between gap-6 rounded-xl bg-slate-50 p-5">
                  <div>
                    <div className="text-sm text-slate-500">{item.from}</div>
                    <div className="text-2xl font-bold">{item.departureTime || "Flexible"}</div>
                  </div>
                  <div className="flex flex-1 flex-col items-center text-slate-500">
                    <span className="flex items-center text-sm">
                      <Clock className="mr-1 h-4 w-4" />
                      {item.duration || "—"}
                    </span>
                    <div className="my-1 flex w-full items-center">
                      <div className="h-px flex-1 bg-slate-300" />
                      <ArrowRight className="mx-1 h-4 w-4" />
                      <div className="h-px flex-1 bg-slate-300" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">{item.to}</div>
                    <div className="text-2xl font-bold">{item.arrivalTime || "Flexible"}</div>
                  </div>
                </div>
              )}

              {item.description && <p className="my-4 leading-relaxed text-slate-600">{item.description}</p>}

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Fact label="Duration" value={!hasRoute ? item.duration : undefined} />
                <Fact label="Region" value={cat === "INSURANCE" ? item.location : undefined} />
                <Fact label="Cover" value={cat === "INSURANCE" ? item.type : undefined} />
                <Fact label="Rate" value={isForex ? `${formatINR(item.price)} per 1 ${item.type}` : undefined} />
                <Fact label="Availability" value={unlimited ? "Always available" : `${item.available} left`} />
              </div>

              {features.length > 0 && (
                <div className="mt-6">
                  <h2 className="mb-3 font-semibold">{cat === "HOLIDAY" || cat === "INSURANCE" ? "What's included" : "Highlights"}</h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div>
              <BookingPanel
                category={cat}
                itemId={item.id}
                quantity={quantity}
                setQuantity={setQuantity}
                quantityLabel={quantityLabel}
                maxQuantity={maxQuantity}
                nights={cat === "HOMESTAY" ? nights : undefined}
                setNights={cat === "HOMESTAY" ? setNights : undefined}
                travelDate={isForex ? undefined : travelDate}
                setTravelDate={isForex ? undefined : setTravelDate}
                travelDateLabel={meta.dateLabel}
                minDate={isoDay(0)}
                soldOut={!unlimited && item.available < 1}
                onBooked={load}
              />
            </div>
          </div>

          {/* Everything else comes after the booking panel on phones */}
          <div className="space-y-6 lg:col-span-2 lg:row-start-2">
            {cat !== "INSURANCE" && (
              <PriceInsights
                category={cat}
                itemId={item.id}
                date={isForex ? undefined : travelDate}
                title={isForex ? "Exchange rate history" : "Price history & forecast"}
              />
            )}
            {!isForex && cat !== "INSURANCE" && <Reviews category={cat} itemId={item.id} itemName={item.name} />}
            {!isForex && (
              <RefundPolicyCard
                category={cat}
                travelAt={travelDate}
                fee={cat === "TRAIN" ? 35 : cat === "BUS" ? 20 : 0}
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default BookListingPage;
