import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, CreditCard, Loader2, Minus, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignupDialog from "@/components/SignupDialog";
import { createbooking, getpromos, getquote } from "@/api";
import { setUser } from "@/store";
import { errorMessage, formatINR } from "@/lib/format";

type Props = {
  category: string;
  itemId: string;
  quantity: number;
  setQuantity: (n: number) => void;
  quantityLabel: string;
  maxQuantity: number;
  nights?: number;
  setNights?: (n: number) => void;
  travelDate?: string;
  setTravelDate?: (d: string) => void;
  travelDateLabel?: string;
  minDate?: string;
  /** Called after a successful booking so the page can refresh stock. */
  onBooked?: () => void;
  soldOut?: boolean;
  initialPromo?: string;
};

const Stepper = ({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
}) => (
  <div>
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
    <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
      <button
        type="button"
        className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(isNaN(n) ? min : Math.max(min, Math.min(max, n)));
        }}
        className="w-full min-w-0 border-x border-slate-200 py-2 text-center font-semibold outline-none"
      />
      <button
        type="button"
        className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`flex items-center justify-between text-sm ${accent ? "text-green-600" : "text-slate-600"}`}>
    <span>{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const BookingPanel = ({
  category,
  itemId,
  quantity,
  setQuantity,
  quantityLabel,
  maxQuantity,
  nights,
  setNights,
  travelDate,
  setTravelDate,
  travelDateLabel = "Travel date",
  minDate,
  onBooked,
  soldOut,
  initialPromo = "",
}: Props) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);

  const [promoInput, setPromoInput] = useState(initialPromo);
  const [promo, setPromo] = useState(initialPromo);
  const [promos, setPromos] = useState<any[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [quoteError, setQuoteError] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [confirmed, setConfirmed] = useState<any>(null);

  useEffect(() => {
    getpromos(category).then(setPromos);
  }, [category]);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const q = await getquote(category, itemId, quantity, nights || 1, promo);
        if (!cancelled) {
          setQuote(q);
          setQuoteError("");
        }
      } catch (error) {
        if (!cancelled) setQuoteError(errorMessage(error, "Could not calculate the price."));
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [category, itemId, quantity, nights, promo]);

  const applyPromo = (code: string) => {
    setPromoInput(code);
    setPromo(code.trim());
  };

  const handleBook = async () => {
    if (!user) return;
    if (setTravelDate && !travelDate) {
      setBookError(`Please choose a ${travelDateLabel.toLowerCase()}.`);
      return;
    }
    setBooking(true);
    setBookError("");
    try {
      const data = await createbooking({
        userId: user.id,
        category,
        itemId,
        quantity,
        nights: nights || 1,
        promo,
        travelDate,
      });
      dispatch(setUser({ ...user, bookings: [...(user.bookings || []), data] }));
      setConfirmed(data);
      onBooked?.();
    } catch (error) {
      setBookError(errorMessage(error, "Booking failed. Please try again."));
    } finally {
      setBooking(false);
    }
  };

  const bookLabel = booking ? "Booking..." : "Book Now";

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <CreditCard className="h-5 w-5 text-slate-500" />
        Fare Summary
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <Stepper label={quantityLabel} value={quantity} onChange={setQuantity} min={1} max={Math.max(1, maxQuantity)} />
        {setNights && <Stepper label="Nights" value={nights || 1} onChange={setNights} min={1} max={30} />}
      </div>

      {setTravelDate && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {travelDateLabel}
          </label>
          <input
            type="date"
            value={travelDate || ""}
            min={minDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      )}

      {quoteError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{quoteError}</p>
      ) : quote ? (
        <div className="space-y-2">
          <Row label="Base Fare" value={formatINR(quote.base)} />
          <Row label="Taxes and Surcharges" value={formatINR(quote.taxes)} />
          <Row label="Other Services" value={formatINR(quote.fees)} />
          <Row label="Discounts" value={`- ${formatINR(quote.discount)}`} accent />
          <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-3">
            <span className="text-lg font-bold">Total Amount</span>
            <span className="text-2xl font-extrabold text-slate-900">{formatINR(quote.total)}</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      )}

      {/* Promo codes */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Tag className="h-4 w-4 text-amber-600" />
          PROMO CODES
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter promo code here"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && applyPromo(promoInput)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <Button type="button" variant="outline" className="bg-white" onClick={() => applyPromo(promoInput)}>
            Apply
          </Button>
        </div>
        {quote?.promoMessage && (
          <p className={`mt-2 text-sm ${quote.promoApplied ? "text-green-600" : "text-red-600"}`}>
            {quote.promoMessage}
          </p>
        )}
        {promos.length > 0 && (
          <ul className="mt-3 space-y-2">
            {promos.slice(0, 4).map((p) => (
              <li
                key={p.code}
                className={`flex items-start justify-between gap-3 rounded-lg border border-dashed bg-white p-3 text-sm ${
                  promo === p.code ? "border-green-400" : "border-amber-300"
                }`}
              >
                <div>
                  <div className="font-semibold text-red-600">{p.code}</div>
                  <div className="text-slate-600">{p.description}</div>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  onClick={() => applyPromo(p.code)}
                >
                  {promo === p.code ? "Applied" : "Apply"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {bookError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{bookError}</p>}

      {soldOut ? (
        <Button disabled className="h-12 w-full text-base">
          Sold out
        </Button>
      ) : user ? (
        <Button
          onClick={handleBook}
          disabled={booking || !quote}
          className="h-12 w-full bg-gradient-to-r from-red-500 to-red-600 text-base font-bold text-white shadow-lg hover:from-red-600 hover:to-red-700"
        >
          {booking && <Loader2 className="h-4 w-4 animate-spin" />}
          {bookLabel}
        </Button>
      ) : (
        <div className="space-y-2">
          <SignupDialog
            trigger={
              <Button className="h-12 w-full bg-gradient-to-r from-red-500 to-red-600 text-base font-bold text-white hover:from-red-600 hover:to-red-700">
                Log In / Sign Up to Book
              </Button>
            }
          />
          <p className="text-center text-xs text-slate-500">You need an account to complete a booking.</p>
        </div>
      )}

      <Dialog open={!!confirmed} onOpenChange={(o) => !o && setConfirmed(null)}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Booking confirmed
            </DialogTitle>
          </DialogHeader>
          {confirmed && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">{confirmed.title}</p>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking reference</span>
                  <span className="font-mono font-bold tracking-wider">{confirmed.reference}</span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="font-bold">{formatINR(confirmed.totalPrice)}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => router.push("/profile#trips")}>
                  View My Trips
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setConfirmed(null)}>
                  Stay here
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingPanel;
