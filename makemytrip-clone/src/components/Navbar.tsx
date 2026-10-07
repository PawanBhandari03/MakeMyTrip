import React from "react";
import SignupDialog from "./SignupDialog";
import { Globe2, LayoutDashboard, LogOut, Plane, PlaneTakeoff, Radio, Ticket, User } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useDispatch, useSelector } from "react-redux";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { clearUser } from "@/store";
import { useRouter } from "next/router";
import Link from "next/link";

const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const ready = useSelector((state: any) => state.user.ready);
  const router = useRouter();
  const logout = () => {
    dispatch(clearUser());
    router.push("/");
  };
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-[1.02]">
          <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-1.5 shadow-sm">
            <Plane className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            MakeMyTrip
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/routes"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 ${
              router.pathname === "/routes" ? "text-red-600" : "text-slate-700"
            }`}
          >
            <Globe2 className="h-4 w-4" />
            <span className="hidden sm:inline">Routes</span>
          </Link>
          <Link
            href="/flight-status"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 ${
              router.pathname === "/flight-status" ? "text-red-600" : "text-slate-700"
            }`}
          >
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Live Flight Status</span>
          </Link>
          {!ready ? null : user ? (
            <>
              <Link
                href="/tracker"
                className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 md:flex ${
                  router.pathname === "/tracker" ? "text-red-600" : "text-slate-700"
                }`}
              >
                <PlaneTakeoff className="h-4 w-4" />
                My Flights
              </Link>
              <Link
                href="/profile"
                className={`hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 sm:flex ${
                  router.pathname === "/profile" ? "text-red-600" : "text-slate-700"
                }`}
              >
                <Ticket className="h-4 w-4" />
                My Trips
              </Link>
              <NotificationBell />
              {user.role === "ADMIN" && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => router.push("/admin")}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  ADMIN
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" aria-label="Account menu">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-600 font-semibold text-white">
                        {user?.firstName?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 bg-white" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                        {user?.role === "ADMIN" ? "Administrator" : "Customer"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/tracker")}>
                    <PlaneTakeoff className="mr-2 h-4 w-4" />
                    <span>My Flights</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile#trips")}>
                    <Ticket className="mr-2 h-4 w-4" />
                    <span>My Trips</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <SignupDialog
              trigger={
                <Button className="bg-blue-600 text-white shadow-sm hover:bg-blue-700">
                  Login / Sign Up
                </Button>
              }
            />
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
