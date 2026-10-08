import React, { useEffect, useRef, useState } from "react";
import {
  Bus,
  Calendar,
  Car,
  Check,
  CreditCard,
  Edit2,
  Home,
  Hotel,
  LogOut,
  Mail,
  Phone,
  Plane,
  Shield,
  Star,
  Ticket,
  Train,
  Umbrella,
  User,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import Link from "next/link";
import { clearUser, setUser } from "@/store";
import { editprofile } from "@/api";
import SignupDialog from "@/components/SignupDialog";
import LiveStatus from "@/components/LiveStatus";
import PriceFreezeList from "@/components/PriceFreezeList";
import CancelDialog from "@/components/CancelDialog";
import RefundList, { RefundListHandle } from "@/components/RefundList";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { errorMessage, formatDate, formatDateTime, formatINR } from "@/lib/format";

const ICONS: Record<string, React.ReactNode> = {
  FLIGHT: <Plane className="h-6 w-6 text-blue-600" />,
  HOTEL: <Hotel className="h-6 w-6 text-green-600" />,
  HOMESTAY: <Home className="h-6 w-6 text-emerald-600" />,
  HOLIDAY: <Umbrella className="h-6 w-6 text-orange-600" />,
  TRAIN: <Train className="h-6 w-6 text-indigo-600" />,
  BUS: <Bus className="h-6 w-6 text-red-600" />,
  CAB: <Car className="h-6 w-6 text-yellow-600" />,
  FOREX: <CreditCard className="h-6 w-6 text-teal-600" />,
  INSURANCE: <Shield className="h-6 w-6 text-purple-600" />,
};

const categoryOf = (b: any) => (b.category || (b.type ? String(b.type).toUpperCase() : "")) as string;

const reviewPath = (b: any) => {
  const c = categoryOf(b);
  return c === "FLIGHT" ? `/book-flight/${b.bookingId}` : c === "HOTEL" ? `/book-hotel/${b.bookingId}` : `/book/${b.bookingId}`;
};

type Filter = "ALL" | "CONFIRMED" | "CANCELLED";

const Profile = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const ready = useSelector((state: any) => state.user.ready);
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [userData, setUserData] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "" });
  const [filter, setFilter] = useState<Filter>("ALL");
  const [toCancel, setToCancel] = useState<any>(null);
  const refunds = useRef<RefundListHandle>(null);

  // The user is restored from localStorage after first render, so keep the form in sync with it.
  useEffect(() => {
    setUserData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
    });
  }, [user]);

  const logout = () => {
    dispatch(clearUser());
    router.push("/");
  };

  const handleSave = async () => {
    setSaveError("");
    if (!/^\d{10}$/.test(userData.phoneNumber)) {
      setSaveError("Phone number must be exactly 10 digits.");
      return;
    }
    setSaving(true);
    try {
      const data = await editprofile(user?.id, userData.firstName, userData.lastName, userData.email, userData.phoneNumber);
      if (data) dispatch(setUser(data));
      setIsEditing(false);
    } catch (error) {
      setSaveError(errorMessage(error, "Could not save your profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const cancelDone = (result: any) => {
    const updated = result.booking;
    dispatch(
      setUser({
        ...user,
        bookings: user.bookings.map((b: any) => (b.reference === updated.reference ? updated : b)),
      })
    );
    setToCancel(null);
    refunds.current?.reload();
    if (result.refund) {
      setTimeout(() => document.getElementById("refunds")?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  };

  if (!ready) return <Seo title="My Trips & Profile" path="/profile" noindex />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Seo title="My Trips & Profile" path="/profile" noindex />
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <User className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Please log in</h1>
        <p className="mt-2 text-slate-600">Log in to see your profile and your trips.</p>
        <div className="mt-6">
          <SignupDialog trigger={<Button className="bg-blue-600 px-8 text-white hover:bg-blue-700">Login / Sign Up</Button>} />
        </div>
      </div>
    );
  }

  const bookings: any[] = (user.bookings || [])
    .filter((b: any) => b && b.bookingId)
    .slice()
    .sort((a: any, b: any) => String(b.bookedAt || b.date || "").localeCompare(String(a.bookedAt || a.date || "")));
  const shown = bookings.filter((b) => filter === "ALL" || (b.status || "CONFIRMED") === filter);
  const confirmedCount = bookings.filter((b) => (b.status || "CONFIRMED") === "CONFIRMED").length;
  const spent = bookings
    .filter((b) => (b.status || "CONFIRMED") === "CONFIRMED")
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="px-4 py-8">
      <Seo title="My Trips & Profile" path="/profile" noindex />
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Profile Section */}
          <div className="md:col-span-1">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60">
              <div className="mb-6 flex items-start justify-between">
                <h2 className="text-2xl font-bold">Profile</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
                    <input
                      type="text"
                      value={userData.firstName}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
                    <input
                      type="text"
                      value={userData.lastName}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                    <input type="email" value={userData.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
                    <p className="mt-1 text-xs text-slate-500">Your email is your login and cannot be changed.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={userData.phoneNumber}
                      onChange={(e) => setUserData({ ...userData, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className={inputClass}
                    />
                  </div>
                  {saveError && <p className="text-sm text-red-600">{saveError}</p>}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-red-600 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      <span>{saving ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setSaveError("");
                        setUserData({
                          firstName: user.firstName || "",
                          lastName: user.lastName || "",
                          email: user.email || "",
                          phoneNumber: user.phoneNumber || "",
                        });
                      }}
                      className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-slate-100 py-2 text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                        {user.role === "ADMIN" ? "Administrator" : "Customer"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-slate-500" />
                    <p className="break-all">{user.email}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-slate-500" />
                    <p>{user.phoneNumber || "—"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 border-t pt-5">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-2xl font-extrabold">{confirmedCount}</div>
                      <div className="text-xs text-slate-500">Active trips</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-lg font-extrabold">{formatINR(spent)}</div>
                      <div className="text-xs text-slate-500">Total spent</div>
                    </div>
                  </div>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="block rounded-lg bg-slate-900 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      Open admin dashboard
                    </Link>
                  )}
                  <button
                    className="mt-2 flex w-full items-center justify-center space-x-2 text-red-600 hover:text-red-700"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bookings Section */}
          <div id="trips" className="scroll-mt-24 md:col-span-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">My Bookings</h2>
                <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
                  {(["ALL", "CONFIRMED", "CANCELLED"] as Filter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`rounded-md px-3 py-1 font-medium capitalize transition-colors ${
                        filter === f ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {f.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 ? (
                <div className="py-14 text-center">
                  <Ticket className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-slate-600">
                    {bookings.length === 0 ? "You have no bookings yet." : `No ${filter.toLowerCase()} bookings.`}
                  </p>
                  {bookings.length === 0 && (
                    <Link href="/" className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700">
                      Start exploring
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {shown.map((booking: any, index: number) => {
                    const cancelled = booking.status === "CANCELLED";
                    const partlyCancelled = !cancelled && (booking.cancelledQuantity || 0) > 0;
                    const activeQty = booking.quantity - (booking.cancelledQuantity || 0);
                    return (
                      <div
                        key={booking.reference || index}
                        className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${cancelled ? "bg-slate-50 opacity-80" : "bg-white"}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-3">
                            <div className="rounded-lg bg-slate-100 p-2">{ICONS[categoryOf(booking)] || <Ticket className="h-6 w-6 text-slate-600" />}</div>
                            <div>
                              <h3 className="font-semibold">{booking.title || booking.type}</h3>
                              <p className="text-sm text-slate-500">
                                {booking.reference ? (
                                  <>
                                    Ref: <span className="font-mono font-semibold text-slate-700">{booking.reference}</span>
                                  </>
                                ) : (
                                  <>Booking ID: {booking.bookingId}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatINR(booking.totalPrice)}</p>
                            <span
                              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                cancelled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              }`}
                            >
                              {cancelled ? "Cancelled" : partlyCancelled ? "Partly cancelled" : "Confirmed"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {booking.travelDate
                                  ? `Travel: ${String(booking.travelDate).includes("T") ? formatDateTime(booking.travelDate) : formatDate(booking.travelDate)}`
                                  : `Booked: ${formatDate(booking.date)}`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Ticket className="h-4 w-4" />
                              <span>
                                Qty {cancelled ? booking.quantity : activeQty}
                                {partlyCancelled ? ` of ${booking.quantity}` : ""}
                                {booking.nights > 1 ? ` • ${booking.nights} nights` : ""}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CreditCard className="h-4 w-4" />
                              <span>
                                {booking.refundAmount > 0
                                  ? `Refund ${formatINR(booking.refundAmount)}`
                                  : cancelled
                                  ? "No refund due"
                                  : "Paid"}
                              </span>
                            </div>
                          </div>
                          {!cancelled && booking.bookingId && categoryOf(booking) !== "INSURANCE" && categoryOf(booking) !== "FOREX" && (
                            <Link
                              href={`${reviewPath(booking)}#reviews`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                            >
                              <Star className="h-4 w-4" /> Rate &amp; review
                            </Link>
                          )}
                          {!cancelled && booking.reference && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setToCancel(booking)}
                            >
                              {partlyCancelled ? "Cancel the rest" : activeQty > 1 ? "Cancel / modify" : "Cancel booking"}
                            </Button>
                          )}
                        </div>
                        {(cancelled || partlyCancelled) && booking.cancelReason && (
                          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            {booking.cancelledQuantity} cancelled on {formatDateTime(booking.cancelledAt)} · {booking.cancelReason}
                            {booking.refundAmount > 0 ? ` · ${formatINR(booking.refundAmount)} is being refunded (see Refunds below)` : ""}
                          </p>
                        )}
                        {!cancelled && ["FLIGHT", "TRAIN", "BUS"].includes(categoryOf(booking)) && <LiveStatus booking={booking} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <RefundList ref={refunds} />
            <PriceFreezeList />
          </div>
        </div>
      </div>

      <CancelDialog booking={toCancel} userId={user.id} onClose={() => setToCancel(null)} onDone={cancelDone} />
    </div>
  );
};

export default Profile;
