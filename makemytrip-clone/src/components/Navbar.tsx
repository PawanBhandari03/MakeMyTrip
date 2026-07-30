import React from "react";
import SignupDialog from "./SignupDialog";
import { LogOut, Plane, User } from "lucide-react";
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
import { useRouter } from "next/navigation";
import Link from "next/link";
const Navbar = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.user.user);
  const router = useRouter();
  const logout = () => {
    dispatch(clearUser());
  };
  return (
    <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 py-2 sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105">
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-1.5 rounded shadow-sm">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 tracking-tight">MakeMyTrip</span>
        </Link>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Button variant="default" onClick={() => router.push("/admin")}>
                  ADMIN
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.firstName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
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
                <Button
                  variant="outline"
                  className="bg-blue-600  text-white hover:bg-blue-700"
                >
                  Sign Up
                </Button>
              }
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
