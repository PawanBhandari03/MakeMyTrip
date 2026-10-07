import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, Lock, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import SignupDialog from "@/components/SignupDialog";
import { createfreeze, getactivefreeze, getfreezeoptions } from "@/api";
import { errorMessage, formatINR } from "@/lib/format";

type Props = {
  category: string;
  itemId: string;
  quantity: number;
  nights?: number;
  travelDate?: string;
  /** Tells the booking panel which freeze (if any) to use for the price. */
  onFreeze: (freeze: any | null) => void;
  unitName: string;
};

const countdown = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h >= 1) return `${h}h ${String(m).padStart(2, "0")}m left`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s left`;
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Price freeze: lock today's price for 6, 24 or 48 hours for a small fee that is credited back if you book.
 */
const PriceFreezeCard = ({ category, itemId, quantity, nights = 1, travelDate, onFreeze, unitName }: Props) => {
  const user = useSelector((state: any) => state.user.user);
  const [freeze, setFreeze] = useState<any>(null);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [options, setOptions] = useState<any[]>([]);
  const [hours, setHours] = useState(24);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);

  const loadActive = useCallback(async () => {
    if (!user?.id || !itemId) {
      setFreeze(null);
      return;
    }
    try {
      const f = await getactivefreeze(user.id, category, itemId, travelDate);
      setFreeze(f);
      setFetchedAt(Date.now());
    } catch (e) {
      // keep whatever is shown; the next check will try again
    }
  }, [user?.id, category, itemId, travelDate]);

  useEffect(() => {
    loadActive();
    const t = setInterval(loadActive, 30000);
    return () => clearInterval(t);
  }, [loadActive]);

  useEffect(() => {
    onFreeze(freeze);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeze?.id]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.id || freeze || !itemId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const o = await getfreezeoptions(category, itemId, quantity, nights, travelDate);
        if (!cancelled) setOptions(o);
      } catch (e) {
        if (!cancelled) setOptions([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [user?.id, freeze, category, itemId, quantity, nights, travelDate]);

  if (category === "FOREX" || category === "INSURANCE") return null;

  const create = async () => {
    if (!user?.id) return;
    setCreating(true);
    setError("");
    try {
      const f = await createfreeze({ userId: user.id, category, itemId, quantity, nights, travelDate, hours });
      setFreeze(f);
      setFetchedAt(Date.now());
    } catch (e) {
      setError(errorMessage(e, "Could not freeze this price."));
    } finally {
      setCreating(false);
    }
  };

  // ---- an active freeze
  if (freeze) {
    const left = freeze.secondsLeft - (Date.now() - fetchedAt) / 1000;
    const cheaperToday = freeze.currentUnitPrice > 0 && freeze.currentUnitPrice < freeze.unitPrice;
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-bold text-emerald-900">
            <Lock className="h-4 w-4" /> Price frozen
          </h3>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-700">{countdown(left)}</span>
        </div>
        <p className="text-emerald-900">
          {freeze.quantity} × <strong>{formatINR(freeze.unitPrice)}</strong> {unitName} is locked until {when(freeze.expiresAt)}.
        </p>
        {cheaperToday ? (
          <p className="mt-1 text-emerald-800">Today&apos;s price is lower, so you will pay today&apos;s price.</p>
        ) : freeze.savingsPerUnit > 0 ? (
          <p className="mt-1 font-semibold text-emerald-800">
            You are saving {formatINR(freeze.savingsPerUnit)} {unitName} compared with today&apos;s {formatINR(freeze.currentUnitPrice)}.
          </p>
        ) : (
          <p className="mt-1 text-emerald-800">If the price goes up, you still pay the frozen price.</p>
        )}
        <p className="mt-1 text-xs text-emerald-700">The {formatINR(freeze.fee)} freeze fee is credited against your booking.</p>
      </div>
    );
  }

  // ---- not logged in
  if (!user) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm">
        <h3 className="mb-1 flex items-center gap-1.5 font-bold text-indigo-900">
          <Snowflake className="h-4 w-4" /> Worried the price will go up?
        </h3>
        <p className="text-indigo-900">Log in to freeze this price for up to 48 hours.</p>
        <div className="mt-2">
          <SignupDialog trigger={<button type="button" className="font-semibold text-indigo-700 hover:underline">Log in to freeze price</button>} />
        </div>
      </div>
    );
  }

  // ---- the offer
  const chosen = options.find((o) => o.hours === hours);
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-sm">
      <h3 className="mb-1 flex items-center gap-1.5 font-bold text-indigo-900">
        <Snowflake className="h-4 w-4" /> Freeze this price
      </h3>
      <p className="text-indigo-900">Lock today&apos;s price while you decide. If it rises you still pay this price; if it falls you pay the lower one.</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(options.length ? options : [6, 24, 48].map((h) => ({ hours: h, fee: null }))).map((o: any) => (
          <button
            key={o.hours}
            type="button"
            onClick={() => setHours(o.hours)}
            className={`rounded-lg border px-2 py-2 text-center transition-colors ${
              hours === o.hours ? "border-indigo-600 bg-white shadow-sm" : "border-indigo-200 bg-white/60 hover:border-indigo-400"
            }`}
          >
            <div className="font-bold text-indigo-900">{o.hours}h</div>
            <div className="text-xs text-slate-600">{o.fee == null ? "…" : formatINR(o.fee)}</div>
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <Button
        type="button"
        onClick={create}
        disabled={creating || !chosen}
        className="mt-3 w-full bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {chosen ? `Freeze for ${hours} hours · ${formatINR(chosen.fee)}` : "Freeze price"}
      </Button>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        The fee is credited against your booking if you book before the freeze ends, and lost if you do not. No real payment is taken in this demo.
      </p>
    </div>
  );
};

export default PriceFreezeCard;
