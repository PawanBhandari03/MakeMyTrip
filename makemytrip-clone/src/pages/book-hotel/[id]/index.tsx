import { useRouter } from "next/router";
import Link from "next/link";
import {
  Bus,
  Check,
  ChevronRight,
  Coffee,
  Dumbbell,
  MapPin,
  Power,
  Sparkles,
  Star,
  UtensilsCrossed,
  Waves,
  Wifi,
  Wine,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { gethotelbyid } from "@/api";
import Loader from "@/components/Loader";
import SmartImage from "@/components/SmartImage";
import BookingPanel from "@/components/BookingPanel";
import PriceInsights from "@/components/PriceInsights";
import Seo from "@/components/Seo";
import { formatINR, isoDay, nightsBetween } from "@/lib/format";

const amenityIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("wi-fi") || n.includes("wifi")) return <Wifi className="h-5 w-5" />;
  if (n.includes("pool") || n.includes("beach") || n.includes("water")) return <Waves className="h-5 w-5" />;
  if (n.includes("restaurant") || n.includes("dining") || n.includes("meals") || n.includes("kitchen")) return <UtensilsCrossed className="h-5 w-5" />;
  if (n.includes("bar")) return <Wine className="h-5 w-5" />;
  if (n.includes("gym")) return <Dumbbell className="h-5 w-5" />;
  if (n.includes("spa")) return <Sparkles className="h-5 w-5" />;
  if (n.includes("breakfast")) return <Coffee className="h-5 w-5" />;
  if (n.includes("shuttle")) return <Bus className="h-5 w-5" />;
  if (n.includes("power")) return <Power className="h-5 w-5" />;
  return <Check className="h-5 w-5" />;
};

const ratingLabel = (r: number) => (r >= 4.5 ? "Excellent" : r >= 4 ? "Very Good" : r >= 3.5 ? "Good" : "Average");

const BookHotelPage = () => {
  const router = useRouter();
  const { id, rooms, checkIn, checkOut } = router.query;
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [nights, setNights] = useState(1);
  const [stayDate, setStayDate] = useState(isoDay(1));

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setHotel(await gethotelbyid(String(id)));
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

  // Defaults coming from the search form on the home page
  useEffect(() => {
    const r = parseInt(String(rooms || ""), 10);
    if (!isNaN(r) && r > 0) setQuantity(r);
    if (typeof checkIn === "string" && checkIn) {
      setStayDate(checkIn);
      if (typeof checkOut === "string" && checkOut) setNights(nightsBetween(checkIn, checkOut));
    }
  }, [rooms, checkIn, checkOut]);

  if (loading) return <Loader />;
  if (notFound || !hotel) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Hotel not found</h1>
        <p className="mt-2 text-slate-600">This hotel may have been removed.</p>
        <Link href="/?tab=hotels" className="mt-6 inline-block rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white">
          Search hotels
        </Link>
      </div>
    );
  }

  const amenities: string[] = (hotel.amenities || "")
    .split(",")
    .map((a: string) => a.trim())
    .filter(Boolean);
  const rating = Number(hotel.rating || 0);
  const fullStars = Math.round(rating);
  const perNightWithTax = Math.round(hotel.pricePerNight * (hotel.pricePerNight <= 7500 ? 1.12 : 1.18));

  return (
    <div className="bg-slate-50">
      <Seo title={`${hotel.hotelName}, ${hotel.location}`} path={`/book-hotel/${hotel.id}`} noindex />
      {/* Breadcrumb */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <Link href={`/?tab=hotels&city=${encodeURIComponent(hotel.location)}`} className="text-blue-600 hover:underline">
              {hotel.location}
            </Link>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="text-slate-600">{hotel.hotelName}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hotel Title & Rating */}
            <div className="mb-6">
              <h1 className="mb-2 text-3xl font-extrabold tracking-tight">{hotel.hotelName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <div className="flex items-center space-x-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < fullStars ? "fill-current text-yellow-400" : "text-slate-300"}`}
                    />
                  ))}
                </div>
                <span className="flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  {hotel.location}
                </span>
              </div>
            </div>

            {/* Image Gallery */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="col-span-2 overflow-hidden rounded-xl">
                <SmartImage src={hotel.imageUrl} alt={hotel.hotelName} className="h-80 w-full object-cover" />
              </div>
              <div className="space-y-4">
                <SmartImage
                  src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"
                  alt="Room"
                  className="h-[152px] w-full rounded-xl object-cover"
                />
                <SmartImage
                  src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"
                  alt="Pool"
                  className="h-[152px] w-full rounded-xl object-cover"
                />
              </div>
            </div>

            {/* Description */}
            <p className="mb-8 leading-relaxed text-slate-600">
              {hotel.description || `${hotel.hotelName} offers comfortable rooms and warm hospitality in ${hotel.location}.`}
            </p>

            <div className="mb-8">
              <PriceInsights category="HOTEL" itemId={hotel.id} date={stayDate} title="Price history & forecast for your stay" />
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="mb-4 text-xl font-semibold">Amenities</h2>
              <div className="flex flex-wrap gap-3">
                {amenities.length === 0 && <span className="text-slate-500">No amenities listed.</span>}
                {amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                  >
                    {amenityIcon(a)}
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
              <h3 className="mb-1 text-xl font-semibold">Standard Room</h3>
              <p className="mb-4 text-slate-600">Fits 2 Adults</p>
              <ul className="mb-4 space-y-2 text-sm text-slate-600">
                <li>• Complimentary welcome drink on arrival</li>
                <li>• Free cancellation up to 24 hours before check-in</li>
                <li>• 10% off on food &amp; beverage services</li>
              </ul>
              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Price Per Night:</span>
                  <span className="text-lg font-semibold">{formatINR(hotel.pricePerNight)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>incl. taxes</span>
                  <span>{formatINR(perNightWithTax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Available Rooms:</span>
                  <span className="text-lg font-semibold">{hotel.availableRooms}</span>
                </div>
              </div>
            </div>

            <BookingPanel
              category="HOTEL"
              itemId={hotel.id}
              quantity={quantity}
              setQuantity={setQuantity}
              quantityLabel="Rooms"
              maxQuantity={Math.min(20, hotel.availableRooms)}
              nights={nights}
              setNights={setNights}
              travelDate={stayDate}
              setTravelDate={setStayDate}
              travelDateLabel="Check-in date"
              minDate={isoDay(0)}
              soldOut={hotel.availableRooms < 1}
              onBooked={load}
            />

            {/* Rating Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600 text-2xl font-bold text-white">
                  {rating ? rating.toFixed(1) : "–"}
                </div>
                <div>
                  <div className="text-lg font-semibold">{rating ? ratingLabel(rating) : "Not rated yet"}</div>
                  <div className="text-slate-500">Guest rating</div>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="mb-1 text-lg font-semibold">{hotel.location}</h3>
                  <p className="text-sm text-slate-500">{hotel.hotelName}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.hotelName + " " + hotel.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  See on Map
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookHotelPage;
