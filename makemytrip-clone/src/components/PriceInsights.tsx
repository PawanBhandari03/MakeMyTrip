import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Hourglass, Loader2, Minus, TrendingUp } from "lucide-react";
import { getpricehistory } from "@/api";
import { formatINR } from "@/lib/format";

type Point = { at: string; price: number; source: string };

const W = 720;
const H = 260;
const PAD = { l: 60, r: 18, t: 16, b: 30 };

const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const stamp = (at: string) =>
  new Date(at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const TONES: Record<string, { box: string; icon: React.ReactNode }> = {
  BOOK_NOW: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: <TrendingUp className="h-5 w-5 text-amber-600" /> },
  WAIT: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: <Hourglass className="h-5 w-5 text-sky-600" /> },
  STABLE: { box: "border-green-200 bg-green-50 text-green-900", icon: <Minus className="h-5 w-5 text-green-600" /> },
};

/**
 * How the price of this booking has moved, where it is heading, and whether now is a good time to book.
 * Earlier history is rebuilt from the pricing rules and marked as estimated; later points are recorded live.
 */
const PriceInsights = ({
  category,
  itemId,
  date,
  title = "Price history & forecast",
}: {
  category: string;
  itemId: string;
  /** Travel or check-in date, for items whose price depends on it. */
  date?: string;
  title?: string;
}) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const h = await getpricehistory(category, itemId, date, days);
        if (!cancelled) {
          setData(h);
          setFailed(!h);
        }
      } catch (e) {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [category, itemId, date, days]);

  const chart = useMemo(() => {
    if (!data) return null;
    const past: Point[] = data.points || [];
    const future: Point[] = data.forecast || [];
    const all = [...past, ...future];
    if (all.length < 2) return null;
    const times = all.map((p) => new Date(p.at).getTime());
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const prices = all.map((p) => p.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const margin = Math.max(1, (hi - lo) * 0.15);
    const y0 = lo - margin;
    const y1 = hi + margin;
    const x = (t: number) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
    const y = (p: number) => PAD.t + (1 - (p - y0) / Math.max(1, y1 - y0)) * (H - PAD.t - PAD.b);
    const px = (p: Point) => x(new Date(p.at).getTime());

    const firstLive = past.findIndex((p) => p.source === "LIVE");
    const split = firstLive < 0 ? past.length : Math.max(0, firstLive);
    const line = (pts: Point[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
    const estimated = past.slice(0, Math.min(past.length, split + 1));
    const live = past.slice(Math.max(0, split - 1));
    const connectFrom = past.length ? [past[past.length - 1], ...future] : future;
    const area = past.length
      ? `${line(past)} L${px(past[past.length - 1]).toFixed(1)},${H - PAD.b} L${px(past[0]).toFixed(1)},${H - PAD.b} Z`
      : "";
    const ticks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
    const xTicks = [0, 1, 2, 3, 4].map((i) => t0 + ((t1 - t0) * i) / 4);
    return { past, future, x, y, px, line, estimated, live, connectFrom, area, ticks, xTicks, t0, t1 };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white p-10 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }
  if (failed || !data || !chart) return null; // nothing to chart (for example a fixed price)

  const s = data.summary;
  const tone = TONES[s.recommendation] || TONES.STABLE;
  const hovered: Point | null = hover !== null ? chart.past[hover] ?? null : null;
  const nowX = chart.past.length ? chart.px(chart.past[chart.past.length - 1]) : 0;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    chart.past.forEach((p, i) => {
      const d = Math.abs(chart.px(p) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-blue-900/5 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          {title}
        </h2>
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${days === d ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"}`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* The advice */}
      <div className={`mb-5 flex gap-3 rounded-xl border p-4 text-sm ${tone.box}`}>
        <span className="mt-0.5 shrink-0">{tone.icon}</span>
        <div>
          <div className="font-bold">
            {s.recommendation === "BOOK_NOW" ? "Book soon" : s.recommendation === "WAIT" ? "You could wait" : "No rush"}
          </div>
          <div>{s.message}</div>
        </div>
      </div>

      {/* Numbers */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Price today", value: formatINR(s.current), strong: true },
          { label: "Lowest", value: formatINR(s.lowest) },
          { label: "Highest", value: formatINR(s.highest) },
          { label: "Average", value: formatINR(s.average) },
        ].map((c) => (
          <div key={c.label} className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</div>
            <div className={`mt-0.5 ${c.strong ? "text-lg font-extrabold" : "font-bold"}`}>{c.value}</div>
          </div>
        ))}
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">vs 7 days ago</div>
          <div
            className={`mt-0.5 flex items-center font-bold ${
              s.changeWeekPct == null ? "text-slate-500" : s.changeWeekPct > 0 ? "text-red-600" : s.changeWeekPct < 0 ? "text-green-600" : "text-slate-700"
            }`}
          >
            {s.changeWeekPct == null ? (
              "—"
            ) : (
              <>
                {s.changeWeekPct > 0 ? <ArrowUpRight className="h-4 w-4" /> : s.changeWeekPct < 0 ? <ArrowDownRight className="h-4 w-4" /> : null}
                {Math.abs(s.changeWeekPct)}%
              </>
            )}
          </div>
        </div>
      </div>

      {/* The graph */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          role="img"
          aria-label="Price history and forecast chart"
        >
          <defs>
            <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {chart.ticks.map((v, i) => (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={chart.y(v)} y2={chart.y(v)} stroke="#e2e8f0" strokeDasharray="3 4" />
              <text x={PAD.l - 8} y={chart.y(v) + 4} textAnchor="end" fontSize="11" fill="#64748b">
                {formatINR(Math.round(v / 10) * 10)}
              </text>
            </g>
          ))}
          {chart.xTicks.map((t, i) => (
            <text key={i} x={chart.x(t)} y={H - 8} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fontSize="11" fill="#64748b">
              {dayLabel(t)}
            </text>
          ))}

          <path d={chart.area} fill="url(#priceArea)" />
          {chart.estimated.length > 1 && <path d={chart.line(chart.estimated)} fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinejoin="round" />}
          {chart.live.length > 1 && <path d={chart.line(chart.live)} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" />}
          {chart.future.length > 0 && (
            <path d={chart.line(chart.connectFrom)} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 5" strokeLinejoin="round" />
          )}

          {/* today */}
          <line x1={nowX} x2={nowX} y1={PAD.t} y2={H - PAD.b} stroke="#94a3b8" strokeDasharray="2 4" />
          <text x={nowX} y={PAD.t - 3} textAnchor="middle" fontSize="10" fill="#64748b">
            Today
          </text>
          {chart.past.length > 0 && (
            <circle cx={nowX} cy={chart.y(chart.past[chart.past.length - 1].price)} r="5" fill="#2563eb" stroke="white" strokeWidth="2" />
          )}

          {hovered && (
            <g>
              <line x1={chart.px(hovered)} x2={chart.px(hovered)} y1={PAD.t} y2={H - PAD.b} stroke="#2563eb" strokeOpacity="0.35" />
              <circle cx={chart.px(hovered)} cy={chart.y(hovered.price)} r="5" fill="white" stroke="#2563eb" strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg"
            style={{ left: `${(chart.px(hovered) / W) * 100}%`, top: `${(chart.y(hovered.price) / H) * 100 - 3}%` }}
          >
            <div className="font-bold">{formatINR(hovered.price)}</div>
            <div className="text-slate-300">
              {stamp(hovered.at)} · {hovered.source === "LIVE" ? "recorded" : "estimated"}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-blue-600" /> Recorded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-blue-300" /> Earlier history (estimated from past demand patterns)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-amber-500" /> Forecast if demand stays the same
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">Prices are per seat, night or ticket. The forecast is an estimate, not a guarantee.</p>
    </section>
  );
};

export default PriceInsights;
