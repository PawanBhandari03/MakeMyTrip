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
