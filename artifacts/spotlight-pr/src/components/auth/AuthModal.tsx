import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { X, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign-in" | "sign-up";

export function AuthModal() {
  const { showAuthModal, closeAuthModal } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [smsMode, setSmsMode] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");

  if (!showAuthModal) return null;

  function reset() {
    setError(null);
    setSuccess(null);
  }

  function switchMode(m: Mode) {
    setMode(m);
    reset();
  }

  async function handleForgotPassword() {
    reset();
    if (!email.trim()) {
      setError("Enter your email above, then tap “Forgot password”.");
      return;
    }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setSuccess("Password reset link sent! Check your email and follow the link to set a new password.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneLogin() {
    reset();
    if (!smsPhone.trim()) {
      setError("Enter your phone number to get a login link by text.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-login", { body: { phone: smsPhone.trim() } });
      if (error) throw error;
      setSuccess((data as any)?.message || "If that number is registered, a login link is on its way by text. Tap it to sign in.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't send the text link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    reset();

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!phone.trim()) {
          setError("Please enter your phone number — we use it for updates and quick login.");
          setLoading(false);
          return;
        }
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ") || undefined;
        const redirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}verify-email`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { first_name: firstName, last_name: lastName, full_name: fullName, phone: phone.trim() || undefined, signup_via: "web" },
          },
        });
        if (error) throw error;
        setSuccess("Account created! Check your email to confirm your address, then sign in.");
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeAuthModal} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold">Spotlight</span>
            <span className="text-xl">🇵🇷</span>
          </div>
          <p className="text-white/80 text-sm">
            {mode === "sign-in" ? "Welcome back! Sign in to your account." : "Create your account to get started."}
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === "sign-in"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode("sign-up")}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === "sign-up"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ana García"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}

            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone <span className="text-muted-foreground font-normal">(for text updates &amp; quick login)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(787) 555-1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ana@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === "sign-up" ? "At least 6 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  minLength={mode === "sign-up" ? 6 : undefined}
                />
              </div>
            </div>

            {mode === "sign-in" && (
              <div className="text-right -mt-2">
                <button type="button" onClick={handleForgotPassword} className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </Button>

            {mode === "sign-in" && (
              <div className="pt-1">
                <div className="relative my-3 text-center">
                  <div className="absolute inset-x-0 top-1/2 border-t border-border" />
                  <span className="relative z-10 text-xs text-muted-foreground bg-white px-2">or</span>
                </div>
                {!smsMode ? (
                  <button type="button" onClick={() => { reset(); setSmsMode(true); }} className="w-full text-sm font-medium text-primary hover:underline">
                    📱 Log in with a text link instead
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="smsPhone">Phone number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="smsPhone" type="tel" placeholder="(787) 555-1234" value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} className="pl-9" />
                    </div>
                    <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={handlePhoneLogin}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Text me a login link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
