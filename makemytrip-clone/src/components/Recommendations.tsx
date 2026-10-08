import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { ArrowRight, Info, MapPin, Plane, RefreshCw, Sparkles, Star, ThumbsDown, ThumbsUp, Undo2, X } from "lucide-react";
import { clearRecommendationFeedback, getRecommendations, sendRecommendationFeedback } from "@/api";
import SignupDialog from "@/components/SignupDialog";
import SmartImage from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatINR } from "@/lib/format";

type Props = {
  title?: string;
  limit?: number;
  className?: string;
};

const KIND: Record<string, string> = { HOTEL: "Hotel", HOMESTAY: "Homestay", HOLIDAY: "Holiday package", FLIGHT: "Flight" };

const BAR: Record<string, string> = {
  "Your history": "bg-blue-500",
  "Similar travellers": "bg-violet-500",
  Ratings: "bg-amber-400",
  "Budget fit": "bg-emerald-500",
  Popularity: "bg-emerald-500",
};

/** "Recommended for you": suggestions with the reasons behind them and a way to say whether they help. */
const Recommendations = ({ title = "Recommended for you", limit = 8, className = "" }: Props) => {
  const user = useSelector((state: any) => state.user.user);
  const ready = useSelector((state: any) => state.user.ready);
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [undo, setUndo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const res = await getRecommendations(user?.id, limit);
        setData(res);
        setItems(res.items);
        setError(false);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, limit]
  );

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const keyOf = (it: any) => `${it.category}:${it.itemId}`;

  const answer = async (it: any, verdict: "HELPFUL" | "IRRELEVANT") => {
    if (!user) return;
    const key = keyOf(it);
    try {
      await sendRecommendationFeedback(user.id, it.category, it.itemId, verdict);
    } catch (e) {
      return;
    }
    if (verdict === "IRRELEVANT") {
      setItems((list) => list.filter((x) => keyOf(x) !== key));
      setUndo(it);
      clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), 8000);
    } else {
      setAnswers((a) => ({ ...a, [key]: "HELPFUL" }));
    }
    // the answer changes what comes next, so refresh quietly in the background
    load(true).then(() => verdict === "HELPFUL" && setAnswers((a) => ({ ...a, [key]: "HELPFUL" })));
  };

  const undoLast = async () => {
    if (!user || !undo) return;
    try {
      await clearRecommendationFeedback(user.id, undo.category, undo.itemId);
    } catch (e) {
      // ignore; a refresh will show the real state
    }
    setUndo(null);
    load(true);
  };

  if (!ready || error) return null;
  if (!loading && items.length === 0 && !undo) return null;

  const personal = !!data?.personalised && !!user;

  return (
    <section className={className} aria-label={title}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Sparkles className="h-6 w-6 text-amber-500" /> {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {data ? (personal ? data.headline : user ? "Browse and book a few places and these will become personal." : data.headline) : "Finding places you may like..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!user && (
            <SignupDialog
              trigger={
                <Button variant="outline" size="sm">
                  Log in for personal picks
                </Button>
              }
            />
          )}
          <Button variant="ghost" size="sm" onClick={() => load()} disabled={loading} className="text-slate-600">
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {undo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white">
          <span>
            Got it. We will show fewer places like <strong>{undo.name}</strong>.
          </span>
          <button type="button" onClick={undoLast} className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:underline">
            <Undo2 className="h-4 w-4" /> Undo
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {items.map((it) => (
            <Card key={keyOf(it)} it={it} canAnswer={!!user} answer={answers[keyOf(it)]} onAnswer={(v) => answer(it, v)} />
          ))}
        </div>
      )}
    </section>
  );
};

const Card = ({ it, canAnswer, answer, onAnswer }: { it: any; canAnswer: boolean; answer?: string; onAnswer: (v: "HELPFUL" | "IRRELEVANT") => void }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const top = it.reasons?.[0]?.text;
  const isFlight = it.category === "FLIGHT";

  return (
    <article className="group relative flex w-[78%] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg sm:w-auto">
      <Link href={it.path} className="block overflow-hidden rounded-t-2xl">
        <div className="relative h-40 w-full bg-slate-100">
          {isFlight ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
              <Plane className="h-12 w-12" />
            </div>
          ) : (
            <SmartImage src={it.imageUrl} alt={it.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow">{KIND[it.category] || it.category}</span>
          {it.rating > 0 && (
            <span className="absolute right-3 top-3 inline-flex items-center rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white shadow">
              {Number(it.rating).toFixed(1)}
              <Star className="ml-0.5 h-3 w-3 fill-current" />
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={it.path} className="line-clamp-2 font-semibold leading-snug text-slate-900 hover:text-blue-700">
          {it.name}
        </Link>
        {it.location && (
          <div className="mt-1 flex items-center text-sm text-slate-500">
            <MapPin className="mr-1 h-3.5 w-3.5" /> {it.location}
          </div>
        )}
        {isFlight && it.departureTime && <div className="mt-1 text-xs text-slate-500">Departs {formatDateTime(it.departureTime)}</div>}

        {top && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="line-clamp-2">{top}</span>
          </p>
        )}

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-bold text-slate-900">{formatINR(it.price)}</div>
            <div className="text-xs text-slate-500">{it.unit}</div>
          </div>
          <Link href={it.path} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
            View <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div ref={box} className="relative mt-4 flex items-center justify-between border-t pt-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            onMouseEnter={() => setOpen(true)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-700"
          >
            <Info className="h-4 w-4" /> Why this?
          </button>

          {canAnswer ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAnswer("HELPFUL")}
                aria-label="Helpful"
                title="Helpful, show me more like this"
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                  answer === "HELPFUL" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${answer === "HELPFUL" ? "fill-emerald-600" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => onAnswer("IRRELEVANT")}
                aria-label="Not relevant"
                title="Not relevant, show fewer like this"
                className="flex h-8 w-8 items-center justify-center rounded-full border text-slate-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Log in to rate</span>
          )}

          {open && (
            <div
              role="tooltip"
              onMouseLeave={() => setOpen(false)}
              className="absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xl"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">Why we picked this</div>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {(it.reasons || []).map((r: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {r.text}
                  </li>
                ))}
              </ul>
              {it.breakdown && Object.keys(it.breakdown).length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">How it was scored</div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                    {Object.entries(it.breakdown as Record<string, number>).map(([k, v]) => (
                      <div key={k} className={BAR[k] || "bg-slate-400"} style={{ width: `${v}%` }} title={`${k} ${v}%`} />
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                    {Object.entries(it.breakdown as Record<string, number>).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${BAR[k] || "bg-slate-400"}`} /> {k} {v}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400">Use the thumbs to tell us if this was helpful; it changes what we show next.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default Recommendations;
