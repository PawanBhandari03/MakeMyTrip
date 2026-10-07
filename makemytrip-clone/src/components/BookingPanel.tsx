import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch, useSelector } from "react-redux";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronDown, CreditCard, Info, Loader2, Minus, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignupDialog from "@/components/SignupDialog";
import PriceBreakdown from "@/components/PriceBreakdown";
import PriceFreezeCard from "@/components/PriceFreezeCard";
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

const REFRESH_MS = 20000;

const UNIT_NAME: Record<string, string> = {
  FLIGHT: "per seat",
  HOTEL: "per night",
  HOMESTAY: "per night",
  HOLIDAY: "per person",
  TRAIN: "per ticket",
  BUS: "per seat",
  CAB: "per cab",
  FOREX: "per unit",
  INSURANCE: "per traveller",
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
  const [freeze, setFreeze] = useState<any>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [notice, setNotice] = useState<{ up: boolean; diff: number } | null>(null);
  const [why, setWhy] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [confirmed, setConfirmed] = useState<any>(null);
  const previous = useRef<{ key: string; unit: number } | null>(null);

  const unitName = UNIT_NAME[category] || "per unit";
  const freezeId = freeze?.id as string | undefined;

  useEffect(() => {
    getpromos(category).then(setPromos);
  }, [category]);

  /** Fetches the price from the server. Called when anything changes and again every 20 seconds. */
  const fetchQuote = useCallback(
    async (isRefresh: boolean) => {
      if (!itemId) return null;
      try {
        const q = await getquote(category, itemId, quantity, nights || 1, promo, {
          travelDate,
          userId: user?.id,
          freezeId,
        });
        setQuote(q);
        setQuoteError("");
        setFetchedAt(new Date());

        // tell the customer if the price moved while they were looking at it
        const key = `${category}:${itemId}:${travelDate || ""}`;
        const last = previous.current;
        if (last && last.key === key && Math.abs(q.currentUnitPrice - last.unit) >= 1) {
          setNotice({ up: q.currentUnitPrice > last.unit, diff: Math.abs(Math.round(q.currentUnitPrice - last.unit)) });
        } else if (!last || last.key !== key) {
          setNotice(null);
        }
        previous.current = { key, unit: q.currentUnitPrice };
        return q;
      } catch (error) {
        if (!isRefresh) setQuoteError(errorMessage(error, "Could not calculate the price."));
        return null;
      }
    },
    [category, itemId, quantity, nights, promo, travelDate, user?.id, freezeId]
  );

  useEffect(() => {
    if (!itemId) return;
    const first = setTimeout(() => fetchQuote(false), 200);
    const timer = setInterval(() => fetchQuote(true), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [fetchQuote, itemId]);

  const applyPromo = (code: string) => {
    setPromoInput(code);
    setPromo(code.trim());
  };

  const handleBook = async () => {
    if (!user || !quote) return;
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
        freezeId: quote.frozen ? freezeId : undefined,
        expectedTotal: quote.total,
      });
      dispatch(setUser({ ...user, bookings: [...(user.bookings || []), data] }));
      setConfirmed(data);
      setFreeze(null);
      onBooked?.();
    } catch (error: any) {
      if (error?.response?.status === 409 && error.response.data?.code === "PRICE_CHANGED") {
        // The price moved between seeing it and pressing Book. Nothing was charged; show the new total.
        await fetchQuote(true);
        setBookError(error.response.data.message);
      } else {
        setBookError(errorMessage(error, "Booking failed. Please try again."));
        fetchQuote(true);
      }
    } finally {
      setBooking(false);
    }
  };

  const bookLabel = booking ? "Booking..." : "Book Now";
  const trend: "UP" | "DOWN" | "STABLE" = quote?.trend || "STABLE";

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
      <div className="flex items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <CreditCard className="h-5 w-5 text-slate-500" />
          Fare Summary
        </h2>
        {fetchedAt && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700" title="The price refreshes by itself every few seconds">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            Live · {fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stepper label={quantityLabel} value={quantity} onChange={setQuantity} min={1} max={Math.max(1, maxQuantity)} />
        {setNights && <Stepper label="Nights" value={nights || 1} onChange={setNights} min={1} max={30} />}
      </div>

      {setTravelDate && (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{travelDateLabel}</label>
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
        <>
          {/* The price per unit, and why */}
          {quote.adjustments?.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Price {unitName}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold">{formatINR(quote.currentUnitPrice)}</span>
                    {trend !== "STABLE" && (
                      <span className={`flex items-center text-xs font-bold ${trend === "UP" ? "text-red-600" : "text-green-600"}`}>
                        {trend === "UP" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                        {trend === "UP" ? "rising" : "falling"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhy((w) => !w)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  aria-expanded={why}
                >
                  <Info className="h-3.5 w-3.5" /> Why this price?
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${why ? "rotate-180" : ""}`} />
                </button>
              </div>
              {quote.tags?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {quote.tags.map((t: string) => (
                    <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.includes("−") ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {why && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <PriceBreakdown basePrice={quote.baseUnitPrice} price={quote.currentUnitPrice} adjustments={quote.adjustments} unitLabel={unitName} />
                </div>
              )}
            </div>
          )}

          {notice && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${notice.up ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {notice.up ? <ArrowUp className="mt-0.5 h-4 w-4 shrink-0" /> : <ArrowDown className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>
                The price {notice.up ? "went up" : "dropped"} by {formatINR(notice.diff)} {unitName} while you were here.
                {notice.up && " You can freeze today's price below."}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Row label="Base Fare" value={formatINR(quote.base)} />
            <Row label="Taxes and Surcharges" value={formatINR(quote.taxes)} />
            <Row label="Other Services" value={formatINR(quote.fees)} />
            <Row label="Discounts" value={`- ${formatINR(quote.discount)}`} accent />
            {quote.freezeCredit > 0 && <Row label="Price freeze fee credit" value={`- ${formatINR(quote.freezeCredit)}`} accent />}
            <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-3">
              <span className="text-lg font-bold">Total Amount</span>
              <span className="text-2xl font-extrabold text-slate-900">{formatINR(quote.total)}</span>
            </div>
            {quote.frozen && quote.freezeSavings > 0 && (
              <p className="text-right text-xs font-semibold text-emerald-700">Your price freeze saves you {formatINR(quote.freezeSavings)}</p>
            )}
            {freeze && !quote.frozen && quote.freezeMessage && <p className="text-xs text-amber-700">{quote.freezeMessage}</p>}
          </div>
        </>
      ) : (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      )}

      <PriceFreezeCard
        category={category}
        itemId={itemId}
        quantity={quantity}
        nights={nights || 1}
        travelDate={travelDate}
        onFreeze={setFreeze}
        unitName={unitName}
      />

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
          <p className={`mt-2 text-sm ${quote.promoApplied ? "text-green-600" : "text-red-600"}`}>{quote.promoMessage}</p>
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
                <button type="button" className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700" onClick={() => applyPromo(p.code)}>
                  {promo === p.code ? "Applied" : "Apply"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {bookError && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{bookError}</p>}

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
          {quote && !booking && <span className="ml-1 font-normal opacity-90">· {formatINR(quote.total)}</span>}
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
                  <span className="text-slate-500">Price {unitName}</span>
                  <span className="font-semibold">
                    {formatINR(confirmed.unitPrice)}
                    {confirmed.priceFrozen && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">FROZEN</span>}
                  </span>
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
