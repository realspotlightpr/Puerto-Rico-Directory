import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation, Link } from "wouter";
import { Mail, CheckCircle2, Loader2, Compass, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function VerifyEmail() {
  const { isAuthenticated, isLoading, supabaseUser } = useAuth();
  const [, setLocation] = useLocation();
  const [confirming, setConfirming] = useState(true);

  // Landing here via the emailed link means the address is verified — record it and clear the reminder.
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      if (isAuthenticated) {
        try { await supabase.auth.updateUser({ data: { email_confirmed: true } }); } catch { /* non-blocking */ }
      }
      setConfirming(false);
    })();
  }, [isLoading, isAuthenticated]);

  const email = (supabaseUser as any)?.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-border p-8 text-center">

        {confirming ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Confirming your email…</p>
          </>
        ) : isAuthenticated ? (
          <>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">Email confirmed 🎉</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              You're all set{email ? <> — <span className="font-medium text-foreground">{email}</span> is verified</> : ""}. Time to discover the best of Puerto Rico.
            </p>
            <div className="space-y-3">
              <Button className="w-full rounded-xl gap-2" onClick={() => setLocation("/directory")}>
                <Compass className="w-4 h-4" /> Start exploring
              </Button>
              <Link href="/welcome">
                <Button variant="outline" className="w-full rounded-xl gap-2">
                  Take the quick tour <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-100 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">Check your inbox</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              We sent you a confirmation link. Open it on this device to verify your email. You can keep exploring in the meantime — confirming isn't required.
            </p>
            <Link href="/directory">
              <Button className="w-full rounded-xl gap-2">
                <Compass className="w-4 h-4" /> Browse the directory
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
