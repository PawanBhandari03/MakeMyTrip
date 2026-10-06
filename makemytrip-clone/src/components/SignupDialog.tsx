import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { signup, login } from "../api";
import { setUser } from "@/store";
import { useDispatch } from "react-redux";
const SignupDialog = ({trigger}:any) => {
  const [isSignup, setIsSignup] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [open, setopem] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isSignup && !/^\d{10}$/.test(phoneNumber)) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    try {
      const data = isSignup
        ? await signup(firstName, lastName, email, phoneNumber, password)
        : await login(email, password);
      dispatch(setUser(data));
      setopem(false);
      clearform();
    } catch (err: any) {
      const status = err?.response?.status;
      if (!isSignup && status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(err?.response?.data?.message || "Something went wrong. Please try again.");
      }
    }
  };
  const clearform = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
    setShowPassword(false);
  };
  return (
    <Dialog open={open} onOpenChange={setopem}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isSignup ? "Create Account" : "Welcome Back"}
          </DialogTitle>
          <DialogDescription>
            {isSignup
              ? "Join us to start booking your travels."
              : "Enter your credentials to access your account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAuth} className="space-y-4 py-4">
          {isSignup && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{isSignup ? "Email" : "Email or username"}</Label>
            <Input
              id="email"
              type={isSignup ? "email" : "text"}
              autoComplete={isSignup ? "email" : "username"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                title="Enter a 10-digit phone number"
                placeholder="10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
              />
            </div>
          )}
          {!isSignup && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="mb-1.5 font-semibold text-slate-700">Demo logins (click to fill)</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setEmail("admin"); setPassword("admin123"); }}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono hover:border-blue-400"
                >
                  admin / admin123
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail("user"); setPassword("user123"); }}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono hover:border-blue-400"
                >
                  user / user123
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-blue-600 text-white"
            variant="outline"
          >
            {isSignup ? "Sign Up" : "Login"}
          </Button>
        </form>
        <div className="text-center text-sm">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-blue-600"
                onClick={() => { setIsSignup(false); setError(""); }}
              >
                Login
              </Button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-blue-600"
                onClick={() => { setIsSignup(true); setError(""); }}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignupDialog;
