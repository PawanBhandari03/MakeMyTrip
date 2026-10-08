import React, { useCallback, useEffect, useState } from "react";
import { Check, EyeOff, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { getReviewQueue, getReviewStats, moderateReview } from "@/api";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { errorMessage, formatDateTime } from "@/lib/format";

const FILTERS = [
  { id: "FLAGGED", label: "Reported" },
  { id: "HIDDEN", label: "Hidden" },
  { id: "REMOVED", label: "Removed" },
  { id: "ALL", label: "All recent" },
];

const STATUS: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  REMOVED: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = { PUBLISHED: "Published", UNDER_REVIEW: "Hidden, awaiting decision", REMOVED: "Removed" };

const Stat = ({ label, value, tone }: { label: string; value: number; tone: string }) => (
  <div className="rounded-xl border bg-white p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
  </div>
);

/** Moderation: reviews that people reported, with the reasons, and buttons to keep or remove them. */
const ReviewsAdmin = () => {
  const [filter, setFilter] = useState("FLAGGED");
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [q, s] = await Promise.all([getReviewQueue(filter), getReviewStats()]);
      setRows(q);
      setStats(s);
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Could not load reviews."));
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: string) => {
    let note: string | undefined;
    if (action === "REMOVE") {
      const n = window.prompt("Internal note: why is this review being removed?", "Breaks the review guidelines");
      if (n === null) return;
      note = n;
    }
    setBusy(id);
    try {
      await moderateReview(id, action, note);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Could not update the review."));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Review moderation</h2>
          <p className="text-sm text-slate-500">A review reported by 3 different people is hidden until you decide. Keep it to dismiss the reports, or remove it.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="All reviews" value={stats.total} tone="text-slate-900" />
          <Stat label="Published" value={stats.published} tone="text-emerald-600" />
          <Stat label="Reported" value={stats.flagged} tone="text-amber-600" />
          <Stat label="Hidden" value={stats.hidden} tone="text-orange-600" />
          <Stat label="Removed" value={stats.removed} tone="text-red-600" />
        </div>
      )}

      <div className="flex w-fit flex-wrap rounded-lg bg-slate-100 p-1 text-sm">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-md px-3 py-1 font-medium ${filter === f.id ? "bg-white shadow" : "text-slate-500"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
          Nothing here. Open any hotel page, press <strong>Report</strong> on a review as a customer, and it appears in this list.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ review: r, flags }) => (
            <div key={r.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.itemName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <StarRating value={r.rating} size={14} /> {r.userName} · {formatDateTime(r.createdAt)}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[r.status] || STATUS.PUBLISHED}`}>{STATUS_LABEL[r.status] || r.status}</span>
              </div>
              {r.title && <div className="mt-2 font-medium">{r.title}</div>}
              <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{r.text}</p>
              {r.photos?.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.photos.map((p: string, i: number) => (
                    <img key={i} src={p} alt="" className="h-14 w-14 rounded border object-cover" />
                  ))}
                </div>
              )}
              {flags?.length > 0 && (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-800">
                    <EyeOff className="h-4 w-4" /> {flags.length} report{flags.length > 1 ? "s" : ""}
                  </div>
                  <ul className="space-y-0.5 text-amber-900">
                    {flags.map((f: any, i: number) => (
                      <li key={i}>
                        {f.reason} <span className="text-xs text-amber-700">· {formatDateTime(f.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {r.moderationNote && <p className="mt-2 text-xs text-slate-500">Moderator note: {r.moderationNote}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "REMOVED" && (
                  <>
                    {(r.flagCount > 0 || r.status === "UNDER_REVIEW") && (
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, "KEEP")}>
                        <Check className="mr-1 h-4 w-4" /> Keep review
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={busy === r.id} onClick={() => act(r.id, "REMOVE")}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  </>
                )}
                {r.status === "REMOVED" && (
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act(r.id, "RESTORE")}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Restore
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsAdmin;
