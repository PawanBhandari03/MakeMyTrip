import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  Gift,
  Info,
  Luggage,
  MapPin,
  Plane,
  Star,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getflightbyid, gethotel } from "@/api";
import Loader from "@/components/Loader";
import SmartImage from "@/components/SmartImage";
import BookingPanel from "@/components/BookingPanel";
import PriceInsights from "@/components/PriceInsights";
import RefundPolicyCard from "@/components/RefundPolicyCard";
import Seo from "@/components/Seo";
import { durationBetween, formatINR, formatTime, formatDate } from "@/lib/format";

interface Flight {
  id: string;
  flightName: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
}


const BookFlightPage = () => {
  const router = useRouter();
  const { id, qty } = router.query;
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hotels, setHotels] = useState<any[]>([]);
  const [quantity, setQuantity] = useState(1);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getflightbyid(String(id));
      setFlight(data);
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
  }, [qty]);

  useEffect(() => {
    if (!flight) return;
    gethotel().then((all: any[]) => {
      const inCity = (all || []).filter((h) => h.location?.toLowerCase() === flight.to?.toLowerCase());
      setHotels(inCity.slice(0, 3));
    });
  }, [flight?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loader />;
  if (notFound || !flight) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Flight not found</h1>
        <p className="mt-2 text-slate-600">This flight may have been removed.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white">
          Search flights
        </Link>
      </div>
    );
  }

  const duration = durationBetween(flight.departureTime, flight.arrivalTime);
  const flightNo = flight.flightName.split(" ").slice(-1)[0];
  const airline = flight.flightName.replace(flightNo, "").trim() || flight.flightName;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Seo title={`${flight.from} to ${flight.to} flight, ${flight.flightName}`} path={`/book-flight/${flight.id}`} noindex />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Flight Details */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-blue-900/5">
              <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-4">
                    <h2 className="flex items-center text-lg font-bold">
                      <span>{flight.from}</span>
                      <ArrowRight className="mx-2 h-5 w-5" />
                      <span>{flight.to}</span>
                    </h2>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      PARTLY REFUNDABLE
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>{formatDate(flight.departureTime)}</span>
                    <span className="mx-2">•</span>
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Non Stop - {duration}</span>
                  </div>
                </div>
                <Link href="/info/cancellation" className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700">
                  <Info className="mr-1 h-4 w-4" />
                  View Fare Rules
                </Link>
              </div>

              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Plane className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold">{airline}</div>
                  <div className="text-sm text-slate-600">{flightNo} • Airbus A320</div>
                </div>
                <div className="ml-auto text-sm">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-600">Economy</span>
                  <span className="ml-2 text-slate-500">{flight.availableSeats} seats left</span>
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-6 border-t pt-6 md:flex-nowrap">
                <div>
                  <div className="text-3xl font-bold">{formatTime(flight.departureTime)}</div>
                  <div className="text-sm text-slate-500">{formatDate(flight.departureTime)}</div>
                  <div className="mt-1 flex items-start text-sm text-slate-600">
                    <MapPin className="mr-1 mt-0.5 h-4 w-4 shrink-0" />
                    {flight.from} International Airport, Terminal 2
                  </div>
                </div>
                <div className="shrink-0 text-center">
                  <div className="mb-1 text-sm text-slate-600">{duration}</div>
                  <div className="relative my-2 h-0.5 w-32 bg-slate-300">
                    <div className="absolute -top-2 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300">
                      <Plane className="h-3 w-3 text-slate-600" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">Non-stop</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{formatTime(flight.arrivalTime)}</div>
                  <div className="text-sm text-slate-500">{formatDate(flight.arrivalTime)}</div>
                  <div className="mt-1 flex items-start justify-end text-sm text-slate-600">
                    <MapPin className="mr-1 mt-0.5 h-4 w-4 shrink-0" />
                    {flight.to} International Airport, Terminal 3
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
                <div className="flex items-center">
                  <Luggage className="mr-2 h-5 w-5 text-slate-500" />
                  <span>Cabin Baggage: 7 Kgs / Adult</span>
                </div>
                <div className="flex items-center">
                  <Luggage className="mr-2 h-5 w-5 text-slate-500" />
                  <span>Check-in Baggage: 15 Kgs (1 piece only) / Adult</span>
                </div>
              </div>
            </div>

            <PriceInsights category="FLIGHT" itemId={flight.id} title="Price history & forecast" />

            <RefundPolicyCard
              category="FLIGHT"
              travelAt={flight.departureTime}
              total={Math.round(flight.price * 1.12 + 249)}
              fee={249}
              unitLabel="one seat"
            />

            {/* Hotel Offers */}
            {hotels.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-blue-900/5">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="flex items-center text-lg font-bold">
                    <Gift className="mr-2 h-5 w-5 text-red-500" />
                    Book a Flight &amp; unlock these offers
                  </h2>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
                    Flyer Exclusive Deal
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {hotels.map((hotel) => (
                    <Link
                      key={hotel.id}
                      href={`/book-hotel/${hotel.id}`}
                      className="overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md"
                    >
                      <div className="relative">
                        <SmartImage src={hotel.imageUrl} alt={hotel.hotelName} className="h-44 w-full object-cover" />
                        <div className="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-xs font-medium">
                          Best Seller
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="mb-1 text-base font-semibold">{hotel.hotelName}</h3>
                        <div className="mb-2 flex items-center text-sm text-slate-600">
                          <MapPin className="mr-1 h-4 w-4" />
                          {hotel.location}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-yellow-500">
                            <Star className="mr-1 h-4 w-4 fill-current" />
                            {hotel.rating ? hotel.rating.toFixed(1) : "New"}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Starting from</div>
                            <div className="text-lg font-bold">{formatINR(hotel.pricePerNight)}</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fare Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <BookingPanel
                category="FLIGHT"
                itemId={flight.id}
                quantity={quantity}
                setQuantity={setQuantity}
                quantityLabel="Tickets"
                maxQuantity={Math.min(20, flight.availableSeats)}
                soldOut={flight.availableSeats < 1}
                onBooked={load}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookFlightPage;
