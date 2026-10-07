import React, { useEffect, useState } from "react";
import { Minus, Plus, Plane } from "lucide-react";
import { cancelbooking, getCancellationPolicy, previewCancellation } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, formatDate, formatINR } from "@/lib/format";

type Props = {
  booking: any | null;
  userId: string;
  onClose: () => void;
  /** Called after a successful cancellation with the updated booking and the refund that was opened. */
  onDone: (result: { booking: any; refund: any; summary: any }) => void;
};

const FALLBACK_REASONS = [
  "Change of plans",
  "Found a better price elsewhere",
  "Medical or personal emergency",
  "Booked the wrong dates",
  "Flight or schedule changed",
  "Documents or visa issue",
  "Other",
];

const Row = ({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: string }) => (
  <div className={`flex items-center justify-between gap-4 ${bold ? "font-semibold" : ""} ${tone || ""}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/** Asks why, shows exactly what will be refunded and why, and cancels all or part of a booking. */
const CancelDialog = ({ booking, userId, onClose, onDone }: Props) => {
  const [reasons, setReasons] = useState<string[]>(FALLBACK_REASONS);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remaining = booking ? booking.quantity - (booking.cancelledQuantity || 0) : 0;
  const unit = booking?.category === "HOTEL" || booking?.category === "HOMESTAY" ? "room" : booking?.category === "FLIGHT" ? "seat" : "ticket";

  useEffect(() => {
    getCancellationPolicy()
      .then((p) => p?.reasons?.length && setReasons(p.reasons))
      .catch(() => {});
  }, []);

  // A new booking opens with everything selected
  useEffect(() => {
    if (!booking) return;
    setReason("");
    setNote("");
    setError("");
    setPreview(null);
    setQuantity(Math.max(1, booking.quantity - (booking.cancelledQuantity || 0)));
  }, [booking]);

  useEffect(() => {
    if (!booking || !userId) return;
    let stale = false;
    setLoading(true);
    previewCancellation(userId, booking.reference, quantity)
      .then((p) => !stale && setPreview(p))
      .catch((e) => !stale && setError(errorMessage(e, "Could not work out the refund.")))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [booking, userId, quantity]);

  const airline = !!preview?.airlineCancelled;

  const confirm = async () => {
    if (!booking) return;
    if (!airline && !reason) {
      setError("Please choose a reason for cancelling.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await cancelbooking(userId, booking.reference, airline ? undefined : reason, reason === "Other" ? note : undefined, quantity);
      onDone(result);
    } catch (e) {
      setError(errorMessage(e, "Could not cancel this booking."));
    } finally {
      setBusy(false);
    }
  };

  const partial = quantity < remaining;

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel {partial ? "part of this booking" : "this booking"}</DialogTitle>
          <DialogDescription>
            {booking?.title} · <span className="font-mono">{booking?.reference}</span>
          </DialogDescription>
        </DialogHeader>

        {airline && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <Plane className="mt-0.5 h-4 w-4 shrink-0" />
            <span>The airline has cancelled this flight, so you get a full refund and do not need to give a reason.</span>
          </div>
        )}

        {remaining > 1 && (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">How many {unit}s do you want to cancel?</div>
              <div className="text-xs text-slate-500">
                You have {remaining} {unit}s on this booking.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Fewer"
                className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-slate-50 disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                aria-label="More"
                className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-slate-50 disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(remaining, q + 1))}
                disabled={quantity >= remaining}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {!airline && (
          <div>
            <label htmlFor="cancel-reason" className="mb-1 block text-sm font-medium">
              Reason for cancelling <span className="text-red-600">*</span>
            </label>
            <select
              id="cancel-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select a reason</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {reason === "Other" && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="Tell us a little more (optional)"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            )}
          </div>
        )}

        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          {loading && !preview ? (
            <p className="text-slate-500">Working out your refund...</p>
          ) : preview ? (
            <div className="space-y-2">
              <div className="font-semibold text-slate-800">{preview.policyLabel}</div>
              <p className="text-slate-600">{preview.explanation}</p>
              <div className="my-2 border-t" />
              <Row label={`Paid for ${quantity} ${unit}${quantity > 1 ? "s" : ""}`} value={formatINR(preview.amountPaid)} />
              {preview.nonRefundable > 0 && <Row label="Booking fee (not refundable)" value={`− ${formatINR(preview.nonRefundable)}`} tone="text-slate-500" />}
              {preview.percent < 100 && (
                <Row
                  label={`Cancellation charge (${100 - preview.percent}% of the fare)`}
                  value={`− ${formatINR(Math.max(0, preview.deduction - preview.nonRefundable))}`}
                  tone="text-slate-500"
                />
              )}
              <div className="my-2 border-t" />
              <Row label="You get back" value={formatINR(preview.refund)} bold tone={preview.refund > 0 ? "text-emerald-700 text-base" : "text-red-600 text-base"} />
              {preview.refund > 0 ? (
                <p className="text-xs text-slate-500">
                  To your original payment method. Expected by {formatDate(preview.expectedBy)} (5 to 7 business days). You can follow every step under Refunds in My Trips.
                </p>
              ) : (
                <p className="text-xs text-slate-500">No refund is due for this cancellation.</p>
              )}
            </div>
          ) : null}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
            Keep booking
          </Button>
          <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={confirm} disabled={busy || loading || !preview?.cancellable}>
            {busy ? "Cancelling..." : partial ? `Cancel ${quantity} ${unit}${quantity > 1 ? "s" : ""}` : "Yes, cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelDialog;
