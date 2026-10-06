export const formatINR = (value: number | string | undefined | null): string => {
  const n = Number(value ?? 0);
  return "₹" + (isNaN(n) ? 0 : n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const parse = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** "06 Oct 2026, 03:45 PM" */
export const formatDateTime = (value?: string | null): string => {
  const d = parse(value);
  if (!d) return value || "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** "06 Oct 2026" */
export const formatDate = (value?: string | null): string => {
  const d = parse(value);
  if (!d) return value || "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/** "03:45 PM" */
export const formatTime = (value?: string | null): string => {
  const d = parse(value);
  if (!d) return value || "-";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

/** Duration between two ISO date-times, e.g. "2h 30m". */
export const durationBetween = (from?: string | null, to?: string | null): string => {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return "";
  const mins = Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

/** yyyy-mm-dd in local time, offset by a number of days from today. */
export const isoDay = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/** Number of nights between two yyyy-mm-dd dates (minimum 1). */
export const nightsBetween = (checkIn: string, checkOut: string): number => {
  const a = parse(checkIn);
  const b = parse(checkOut);
  if (!a || !b) return 1;
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
};

export const errorMessage = (error: any, fallback = "Something went wrong. Please try again."): string =>
  error?.response?.data?.message || (error?.code === "ERR_NETWORK" ? "Cannot reach the server. Is the backend running?" : fallback);

export const CATEGORY_LABELS: Record<string, string> = {
  FLIGHT: "Flight",
  HOTEL: "Hotel",
  HOMESTAY: "Homestay",
  HOLIDAY: "Holiday",
  TRAIN: "Train",
  BUS: "Bus",
  CAB: "Cab",
  FOREX: "Forex",
  INSURANCE: "Insurance",
};

/** The current local date and time as "yyyy-mm-ddThh:mm", the same shape flight times are stored in. */
export const nowLocalIso = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** "1h 30m", "45 min" for a number of minutes. */
export const delayText = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

/** "in 2h 05m" / "45 min ago" style text for a number of minutes from now (negative = in the past). */
export const relativeMinutes = (minutes: number): string => {
  const m = Math.round(minutes);
  if (Math.abs(m) < 1) return "now";
  const text = Math.abs(m) >= 60 ? `${Math.floor(Math.abs(m) / 60)}h ${String(Math.abs(m) % 60).padStart(2, "0")}m` : `${Math.abs(m)} min`;
  return m > 0 ? `in ${text}` : `${text} ago`;
};

/** "just now", "5 min ago", "2h ago", or a date, for an ISO timestamp. */
export const timeAgo = (iso?: string | null): string => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return formatDate(iso);
};
