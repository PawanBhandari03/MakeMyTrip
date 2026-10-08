import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { Bell, BellRing, MessageSquare, CheckCheck, Clock, DoorOpen, PlaneLanding, PlaneTakeoff, Plane, Receipt, X, XCircle, CircleCheck } from "lucide-react";
import { getnotifications, marknotificationsread } from "@/api";
import { timeAgo } from "@/lib/format";

const POLL_MS = 8000;

type Item = {
  id: string;
  type: string;
  title: string;
  message: string;
  flightNumber: string;
  read: boolean;
  createdAt: string;
};

const isRefund = (n: { type: string }) => n.type.startsWith("REFUND_");
const targetOf = (n: { type: string; flightNumber: string }) =>
  isRefund(n) ? "/profile#refunds" : n.type.startsWith("REVIEW_") ? n.flightNumber || "/" : `/tracker?flight=${n.flightNumber}`;

const iconFor = (type: string) => {
  switch (type) {
    case "DELAY_ANNOUNCED":
    case "DELAY_EXTENDED":
      return { icon: <Clock className="h-4 w-4" />, tone: "bg-amber-100 text-amber-700" };
    case "DELAY_REDUCED":
    case "ON_TIME":
      return { icon: <CircleCheck className="h-4 w-4" />, tone: "bg-green-100 text-green-700" };
    case "CANCELLED":
      return { icon: <XCircle className="h-4 w-4" />, tone: "bg-red-100 text-red-700" };
    case "GATE_CHANGED":
      return { icon: <DoorOpen className="h-4 w-4" />, tone: "bg-blue-100 text-blue-700" };
    case "BOARDING":
      return { icon: <Plane className="h-4 w-4" />, tone: "bg-green-100 text-green-700" };
    case "DEPARTED":
      return { icon: <PlaneTakeoff className="h-4 w-4" />, tone: "bg-sky-100 text-sky-700" };
    case "LANDED":
      return { icon: <PlaneLanding className="h-4 w-4" />, tone: "bg-sky-100 text-sky-700" };
    case "REVIEW_REPLY":
      return { icon: <MessageSquare className="h-4 w-4" />, tone: "bg-indigo-100 text-indigo-700" };
    case "REVIEW_REMOVED":
      return { icon: <MessageSquare className="h-4 w-4" />, tone: "bg-red-100 text-red-700" };
    case "REFUND_PENDING":
      return { icon: <Receipt className="h-4 w-4" />, tone: "bg-amber-100 text-amber-700" };
    case "REFUND_PROCESSED":
      return { icon: <Receipt className="h-4 w-4" />, tone: "bg-blue-100 text-blue-700" };
    case "REFUND_COMPLETED":
      return { icon: <Receipt className="h-4 w-4" />, tone: "bg-green-100 text-green-700" };
    default:
      return { icon: <Bell className="h-4 w-4" />, tone: "bg-slate-100 text-slate-600" };
  }
};

/**
 * The bell in the navbar. It checks for new flight updates every few seconds,
 * shows a pop-up for each new one and, if the user allows it, a browser notification too.
 */
const NotificationBell = () => {
  const router = useRouter();
  const user = useSelector((state: any) => state.user.user);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Item[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [permission, setPermission] = useState<string>("unsupported");
  const seen = useRef<Set<string> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission);
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getnotifications(user.id);
      const list: Item[] = data.items || [];
      setItems(list);
      setUnread(data.unread || 0);

      if (seen.current === null) {
        // First load: do not pop up everything that already existed
        seen.current = new Set(list.map((n) => n.id));
        return;
      }
      const fresh = list.filter((n) => !seen.current!.has(n.id)).reverse();
      fresh.forEach((n) => seen.current!.add(n.id));
      if (fresh.length > 0) {
        setToasts((t) => [...t, ...fresh].slice(-3));
        fresh.forEach((n) => {
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 8000);
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const shown = new Notification(n.title, { body: n.message, icon: "/favicon.svg", tag: n.id });
              shown.onclick = () => {
                window.focus();
                router.push(targetOf(n));
              };
            } catch (e) {
              // some browsers only allow notifications from a service worker; the pop-up still shows
            }
          }
        });
      }
    } catch (e) {
      // the next poll will try again
    }
  }, [user?.id, router]);

  useEffect(() => {
    seen.current = null;
    setItems([]);
    setUnread(0);
    if (!user?.id) return;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [user?.id, load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (!user) return null;

  const openItem = async (n: Item) => {
    setOpen(false);
    setToasts((t) => t.filter((x) => x.id !== n.id));
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      marknotificationsread(user.id, n.id).catch(() => {});
    }
    router.push(targetOf(n));
  };

  const readAll = async () => {
    setItems((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
    marknotificationsread(user.id).catch(() => {});
  };

  const askPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return (
    <>
      <div className="relative" ref={box}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
          className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100"
        >
          {unread > 0 ? <BellRing className="h-5 w-5 text-red-600" /> : <Bell className="h-5 w-5" />}
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-bold">Notifications</h3>
              {unread > 0 && (
                <button type="button" onClick={readAll} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {permission === "default" && (
              <button
                type="button"
                onClick={askPermission}
                className="flex w-full items-center gap-2 border-b bg-blue-50 px-4 py-2.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <BellRing className="h-4 w-4 shrink-0" /> Turn on browser alerts to hear about delays even in another tab
              </button>
            )}
            {permission === "denied" && (
              <p className="border-b bg-slate-50 px-4 py-2 text-xs text-slate-500">Browser alerts are blocked. You can allow them in your browser&apos;s site settings.</p>
            )}

            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  No updates yet. When a flight you follow is delayed, changes gate or lands, you will see it here.
                </div>
              ) : (
                items.slice(0, 20).map((n) => {
                  const { icon, tone } = iconFor(n.type);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openItem(n)}
                      className={`flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${n.read ? "" : "bg-blue-50/50"}`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-slate-900">{n.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{n.message}</span>
                        <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    </button>
                  );
                })
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/tracker");
              }}
              className="block w-full border-t bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-blue-600 hover:bg-slate-100"
            >
              Open My Flights
            </button>
          </div>
        )}
      </div>

      {/* Pop-ups for brand-new updates */}
      {mounted &&
        createPortal(
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((n) => {
          const { icon, tone } = iconFor(n.type);
          return (
            <div key={n.id} className="pointer-events-auto flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in slide-in-from-right-5 fade-in">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>
              <button type="button" onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">{n.message}</span>
              </button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setToasts((t) => t.filter((x) => x.id !== n.id))}
                className="self-start text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>,
          document.body
        )}
    </>
  );
};

export default NotificationBell;
