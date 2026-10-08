import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { getallusers, getRecommendationStats } from "@/api";
import { Button } from "@/components/ui/button";
import { errorMessage, formatINR } from "@/lib/format";

const Stat = ({ label, value, tone }: { label: string; value: string | number; tone: string }) => (
  <div className="rounded-xl border bg-white p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
  </div>
);

/** How the recommendations are doing, and a look inside what the system knows about one customer. */
const RecommendationsAdmin = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [who, setWho] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (userId?: string) => {
    setLoading(true);
    try {
      setStats(await getRecommendationStats(userId));
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Could not load recommendation data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getallusers()
      .then((u: any[]) => setUsers(u))
      .catch(() => {});
  }, [load]);

  const total = stats ? stats.helpful + stats.irrelevant : 0;
  const rate = total ? Math.round((stats.helpful / total) * 100) : 0;
  const profile = stats?.profile;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Recommendations</h2>
          <p className="text-sm text-slate-500">
            Suggestions blend a customer&apos;s own history, what similar travellers chose, ratings and budget. Customers answer with thumbs up or down.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(who || undefined)} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Marked helpful" value={stats.helpful} tone="text-emerald-600" />
          <Stat label="Marked not relevant" value={stats.irrelevant} tone="text-red-600" />
          <Stat label="Helpful rate" value={total ? `${rate}%` : "-"} tone="text-slate-900" />
          <Stat label="Visits from suggestions" value={stats.fromRecommendations} tone="text-blue-600" />
          <Stat label="Travellers learned from" value={stats.modelTravellers} tone="text-violet-600" />
        </div>
      )}

      {stats && (
        <p className="text-xs text-slate-500">
          The similarity model compares {stats.modelPairs.toLocaleString("en-IN")} pairs of places, built from {stats.modelTravellers} travellers
          ({stats.demoTravellers} of them generated demo travellers) and refreshed every 5 minutes.
        </p>
      )}

      {stats?.places?.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Feedback by place</h3>
          <div className="space-y-2">
            {stats.places.map((p: any) => (
              <div key={p.place} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate">{p.place}</span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-emerald-500" style={{ width: `${(p.helpful / (p.helpful + p.irrelevant)) * 100}%` }} />
                  <div className="bg-red-400" style={{ width: `${(p.irrelevant / (p.helpful + p.irrelevant)) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-slate-500">
                  {p.helpful} helpful · {p.irrelevant} no
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-amber-500" /> Inspect a customer
        </h3>
        <p className="mb-3 text-xs text-slate-500">See what the system has learned about one customer and what it would suggest to them.</p>
        <select
          value={who}
          onChange={(e) => {
            setWho(e.target.value);
            load(e.target.value || undefined);
          }}
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Choose a customer</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName} ({u.email})
            </option>
          ))}
        </select>

        {profile && (
          <div className="mt-4 space-y-4">
            {!profile.personalised && <p className="text-sm text-slate-500">Nothing learned yet. This customer sees popular places until they browse or book.</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Favourite places", profile.places],
                ["Kinds of trip", profile.kinds],
                ["Tastes", profile.tastes],
              ].map(([label, list]: any) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                  {list.length === 0 ? (
                    <div className="text-sm text-slate-400">None yet</div>
                  ) : (
                    <ul className="space-y-0.5 text-sm">
                      {list.map((x: any) => (
                        <li key={x.name} className="flex justify-between gap-2">
                          <span className="truncate">{x.name}</span>
                          <span className="text-slate-400">{x.weight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">What they would see</div>
              <div className="space-y-2">
                {(stats.recommendations || []).map((r: any) => (
                  <div key={r.category + r.itemId} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {r.name} <span className="text-slate-400">· {r.location || r.category}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        score {r.score} · {formatINR(r.price)} {r.unit}
                      </span>
                    </div>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                      {r.reasons.map((x: any, i: number) => (
                        <li key={i}>{x.text}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsAdmin;
