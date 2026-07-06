import { useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, User, Phone, Loader2, CheckCircle2, Star, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nameParts = fullName.trim().split(/\s+/);
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
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 to-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left: value prop */}
        <div className="hidden md:block">
          <h1 className="font-display text-3xl font-bold mb-4">Join Spotlight Puerto Rico <span className="text-2xl">🇵🇷</span></h1>
          <p className="text-muted-foreground mb-6">Create a free account to discover and support the best local businesses across all 78 municipalities.</p>
          <ul className="space-y-4">
            <li className="flex items-start gap-3"><MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" /><span className="text-sm"><strong>Discover</strong> local businesses near you by category and town.</span></li>
            <li className="flex items-start gap-3"><Star className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" /><span className="text-sm"><strong>Review</strong> your favorites and help your community find great spots.</span></li>
            <li className="flex items-start gap-3"><MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" /><span className="text-sm"><strong>Save</strong> the places you love and get updates you care about.</span></li>
          </ul>
        </div>

        {/* Right: form */}
        <div className="bg-white rounded-2xl shadow-xl border border-border/60 overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold">Spotlight</span><span className="text-xl">🇵🇷</span>
            </div>
            <p className="text-white/80 text-sm">Create your free account to get started.</p>
          </div>

          <div className="p-6">
            {success ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">Account created!</h2>
                <p className="text-sm text-muted-foreground mb-6">Check your email to confirm your address, then sign in. We've also sent a warm welcome your way.</p>
                <Button onClick={() => setLocation("/directory")} className="w-full">Explore businesses</Button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="fullName" type="text" placeholder="Ana García" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="ana@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone <span className="text-muted-foreground font-normal">(optional — for text updates)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="(787) 555-1234" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={6} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Account
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account? <Link href="/" className="text-primary font-medium hover:underline">Sign in</Link>
                </p>
                <p className="mt-2 text-center text-xs text-muted-foreground">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
