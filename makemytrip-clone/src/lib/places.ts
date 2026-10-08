/** Which state and country each place we serve belongs to (used for grouping and for friendly search). */
export type Place = { state: string; country: string };

const IN = "India";

export const PLACES: Record<string, Place> = {
  // India
  delhi: { state: "Delhi", country: IN },
  mumbai: { state: "Maharashtra", country: IN },
  pune: { state: "Maharashtra", country: IN },
  bengaluru: { state: "Karnataka", country: IN },
  mysuru: { state: "Karnataka", country: IN },
  coorg: { state: "Karnataka", country: IN },
  chennai: { state: "Tamil Nadu", country: IN },
  ooty: { state: "Tamil Nadu", country: IN },
  pondicherry: { state: "Puducherry", country: IN },
  hyderabad: { state: "Telangana", country: IN },
  warangal: { state: "Telangana", country: IN },
  kolkata: { state: "West Bengal", country: IN },
  darjeeling: { state: "West Bengal", country: IN },
  bhubaneswar: { state: "Odisha", country: IN },
  goa: { state: "Goa", country: IN },
  jaipur: { state: "Rajasthan", country: IN },
  udaipur: { state: "Rajasthan", country: IN },
  rajasthan: { state: "Rajasthan", country: IN },
  agra: { state: "Uttar Pradesh", country: IN },
  chandigarh: { state: "Chandigarh", country: IN },
  shimla: { state: "Himachal Pradesh", country: IN },
  manali: { state: "Himachal Pradesh", country: IN },
  himachal: { state: "Himachal Pradesh", country: IN },
  rishikesh: { state: "Uttarakhand", country: IN },
  munnar: { state: "Kerala", country: IN },
  alleppey: { state: "Kerala", country: IN },
  kerala: { state: "Kerala", country: IN },
  ahmedabad: { state: "Gujarat", country: IN },
  saputara: { state: "Gujarat", country: IN },
  kashmir: { state: "Jammu & Kashmir", country: IN },
  andaman: { state: "Andaman & Nicobar", country: IN },
  lucknow: { state: "Uttar Pradesh", country: IN },
  varanasi: { state: "Uttar Pradesh", country: IN },
  kochi: { state: "Kerala", country: IN },
  thiruvananthapuram: { state: "Kerala", country: IN },
  visakhapatnam: { state: "Andhra Pradesh", country: IN },
  indore: { state: "Madhya Pradesh", country: IN },
  bhopal: { state: "Madhya Pradesh", country: IN },
  nagpur: { state: "Maharashtra", country: IN },
  surat: { state: "Gujarat", country: IN },
  amritsar: { state: "Punjab", country: IN },
  patna: { state: "Bihar", country: IN },
  guwahati: { state: "Assam", country: IN },
  coimbatore: { state: "Tamil Nadu", country: IN },
  madurai: { state: "Tamil Nadu", country: IN },
  mangaluru: { state: "Karnataka", country: IN },
  ranchi: { state: "Jharkhand", country: IN },
  jodhpur: { state: "Rajasthan", country: IN },
  raipur: { state: "Chhattisgarh", country: IN },
  dehradun: { state: "Uttarakhand", country: IN },
  srinagar: { state: "Jammu & Kashmir", country: IN },
  leh: { state: "Ladakh", country: IN },
  ladakh: { state: "Ladakh", country: IN },
  "port blair": { state: "Andaman & Nicobar", country: IN },
  "abu dhabi": { state: "Abu Dhabi", country: "United Arab Emirates" },
  "san francisco": { state: "California", country: "United States" },
  "los angeles": { state: "California", country: "United States" },
  honolulu: { state: "Hawaii", country: "United States" },
  muscat: { state: "Muscat", country: "Oman" },
  male: { state: "Kaafu Atoll", country: "Maldives" },
  istanbul: { state: "Istanbul", country: "Turkey" },
  // International
  dubai: { state: "Dubai", country: "United Arab Emirates" },
  london: { state: "England", country: "United Kingdom" },
  singapore: { state: "Singapore", country: "Singapore" },
  bangkok: { state: "Bangkok", country: "Thailand" },
  thailand: { state: "Thailand", country: "Thailand" },
  bali: { state: "Bali", country: "Indonesia" },
  "new york": { state: "New York", country: "United States" },
  paris: { state: "Île-de-France", country: "France" },
  tokyo: { state: "Tokyo", country: "Japan" },
  kathmandu: { state: "Bagmati", country: "Nepal" },
  "kuala lumpur": { state: "Kuala Lumpur", country: "Malaysia" },
  doha: { state: "Doha", country: "Qatar" },
  colombo: { state: "Western Province", country: "Sri Lanka" },
  dhaka: { state: "Dhaka", country: "Bangladesh" },
  "hong kong": { state: "Hong Kong", country: "Hong Kong" },
  sydney: { state: "New South Wales", country: "Australia" },
  toronto: { state: "Ontario", country: "Canada" },
  frankfurt: { state: "Hesse", country: "Germany" },
};

/** Common alternative spellings people type. */
export const ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  "new delhi": "delhi",
  mysore: "mysuru",
  puducherry: "pondicherry",
  pondy: "pondicherry",
  nyc: "new york",
  "new york city": "new york",
  ny: "new york",
  uk: "london",
  uae: "dubai",
  trivandrum: "thiruvananthapuram",
  vizag: "visakhapatnam",
  banaras: "varanasi",
  benares: "varanasi",
  cochin: "kochi",
  mangalore: "mangaluru",
  hawaii: "honolulu",
  maldives: "male",
  "la": "los angeles",
  sf: "san francisco",
  ladakh: "leh",
  "andaman": "port blair",
  hongkong: "hong kong",
  kl: "kuala lumpur",
  "sri lanka": "colombo",
  alappuzha: "alleppey",
};

const clean = (s?: string) => (s || "").trim().toLowerCase();

/** Maps an alias such as "Bangalore" to the name used in our data ("bengaluru"). */
export const canonicalCity = (input?: string): string => {
  const c = clean(input);
  return ALIASES[c] || c;
};

export const placeOf = (city?: string): Place => PLACES[canonicalCity(city)] || { state: "Other", country: "Other" };

export const isDomestic = (city?: string): boolean => placeOf(city).country === IN;

// ---------------------------------------------------------------- suggestions for the place pickers

export type Suggestion = {
  value: string;
  label: string;
  /** Small grey text shown under the name, for example "Assam, India". */
  hint: string;
  /** How the suggestion was found: it is a typo fix or another name for the place when it is not "match". */
  kind: "match" | "alias" | "fuzzy";
  score: number;
};

/** Well-known places come first when several match equally well, so typing "M" shows Mumbai before Madurai. */
const POPULAR = [
  "delhi", "mumbai", "bengaluru", "hyderabad", "chennai", "kolkata", "pune", "goa", "jaipur", "ahmedabad", "kochi",
  "dubai", "singapore", "london", "bangkok", "paris", "new york", "lucknow", "chandigarh", "udaipur", "varanasi",
  "amritsar", "agra", "shimla", "manali", "darjeeling", "guwahati", "srinagar", "leh", "dehradun", "visakhapatnam",
];
const popularity = (city: string): number => {
  const i = POPULAR.indexOf(canonicalCity(city));
  return i === -1 ? 999 : i;
};

/** Number of single-letter edits (insert, delete, change, swap) between two words. */
const editDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let prevPrev: number[] = [];
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      // swapping two neighbouring letters ("dheradun") counts as one mistake
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prevPrev[j - 2] + 1);
    }
    prevPrev = prev.slice();
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
};

const hintFor = (city: string): string => {
  const p = PLACES[canonicalCity(city)];
  if (!p) return "";
  const c = clean(city);
  if (clean(p.state) === c || clean(p.state) === clean(p.country)) return p.country;
  return `${p.state}, ${p.country}`;
};

/**
 * Finds the places that fit what the traveller has typed. It understands a city ("goa"), a state or country
 * ("assam", "kerala", "uae"), another name for a place ("bangalore", "bombay", "cochin") and small typing mistakes
 * ("dheradun" finds Dehradun). The best matches come first.
 */
export const suggestPlaces = (options: { value: string; label: string }[], typed: string, max = 50): Suggestion[] => {
  const seen = new Map<string, { value: string; label: string }>();
  for (const o of options) {
    const key = canonicalCity(o.value);
    const prev = seen.get(key);
    // keep the nicely capitalised spelling
    if (!prev || (prev.label === prev.label.toLowerCase() && o.label !== o.label.toLowerCase())) seen.set(key, o);
  }
  options = Array.from(seen.values());
  const t = clean(typed);
  if (!t) {
    return options.slice(0, max).map((o) => ({ value: o.value, label: o.label, hint: hintFor(o.value), kind: "match" as const, score: 0 }));
  }
  const canon = canonicalCity(t);
  const tokens = t.split(/[\s,]+/).filter(Boolean);
  const aliasKeys = Object.keys(ALIASES);
  const out: Suggestion[] = [];

  for (const o of options) {
    const l = clean(o.label);
    const p = PLACES[canonicalCity(o.value)];
    const state = p ? clean(p.state) : "";
    const country = p ? clean(p.country) : "";
    const words = l.split(/[\s-]+/);
    let score = 0;
    let kind: Suggestion["kind"] = "match";
    let hint = hintFor(o.value);

    if (l === t || l === canon) score = 100;
    else if (l.startsWith(t) || (canon !== t && l.startsWith(canon))) score = 90;
    else if (words.some((w) => w.startsWith(t))) score = 80;
    else if (t.length >= 2 && l.includes(t)) score = 60;
    else if (t.length >= 2 && state && (state === t || state.startsWith(t))) score = 70;
    else if (t.length >= 2 && country && (country === t || country.startsWith(t))) score = 50;
    else if (t.length >= 3 && state.includes(t)) score = 40;
    else if (tokens.length > 1 && tokens.every((k) => l.includes(k) || state.includes(k) || country.includes(k))) score = 55;

    // another name for the same place: typing "bang" finds Bengaluru because of "Bangalore"
    if (score < 75 && t.length >= 2) {
      const alias = aliasKeys.find((k) => ALIASES[k] === l && (k === t || k.startsWith(t)));
      if (alias) {
        score = Math.max(score, 85);
        kind = "alias";
        hint = `Also called ${alias.replace(/\b\w/g, (c) => c.toUpperCase())}${hint ? " · " + hint : ""}`;
      }
    }

    // a small typing mistake
    if (score === 0 && t.length >= 4) {
      const allowed = t.length >= 7 ? 2 : 1;
      const best = Math.min(editDistance(l, t), ...aliasKeys.filter((k) => ALIASES[k] === l).map((k) => editDistance(k, t)));
      if (best <= allowed) {
        score = 30 - best;
        kind = "fuzzy";
      }
    }
    if (score > 0) out.push({ value: o.value, label: o.label, hint, kind, score });
  }
  out.sort((a, b) => b.score - a.score || popularity(a.value) - popularity(b.value) || a.label.localeCompare(b.label));
  return out.slice(0, max);
};
