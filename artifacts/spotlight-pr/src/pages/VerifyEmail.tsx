import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { Mail, RefreshCw, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const { user, supabaseUser, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState(false);

  // Dynamically import supabase to resend email
  async function resendVerification() {
    setResending(true);
    setResendError(false);
    try {
      // Dynamically use supabase from the global app context
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const email = user?.email ?? supabaseUser?.email;
      if (email) {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        if (error) throw error;
        setResent(true);
      }
    } catch {
      setResendError(true);
    } finally {
      setResending(false);
    }
  }

  const email = user?.email ?? supabaseUser?.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-border p-8 text-center">

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-emerald-100 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-2xl font-bold font-display text-foreground mb-2">
          Check Your Email
        </h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          To access your dashboard and earn the{" "}
          <span className="font-semibold text-emerald-600">Verified</span> and{" "}
          <span className="font-semibold text-blue-600">Claimed</span> badges for your business listing, you need to verify your email address.
        </p>

        {email && (
          <div className="bg-muted/50 rounded-2xl px-4 py-3 mb-6 flex items-center gap-3 text-left">
            <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Verification sent to</p>
              <p className="font-semibold text-sm text-foreground truncate">{email}</p>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3 mb-8 text-left">
          {[
            { num: "1", label: "Open the verification email we sent you" },
            { num: "2", label: 'Click the "Confirm Email" link' },
            { num: "3", label: "Come back and refresh this page" },
          ].map(step => (
            <div key={step.num} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {step.num}
              </div>
              <p className="text-sm text-foreground">{step.label}</p>
            </div>
          ))}
        </div>

        {/* What you unlock */}
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200/50 p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">After verifying you unlock</p>
          <div className="space-y-2">
            {[
              { icon: "🏠", label: "Full dashboard access to manage your listings" },
              { icon: "✅", label: '"Verified" badge on your business profile' },
              { icon: "🏷️", label: '"Claimed" badge showing you own the listing' },
              { icon: "🤖", label: "AI Business Assistant for each location" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2.5 text-sm">
                <span className="text-base shrink-0 leading-tight">{item.icon}</span>
                <span className="text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            className="w-full rounded-xl gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" /> I've Verified — Refresh
          </Button>

          {resent ? (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium py-2">
              <CheckCircle2 className="w-4 h-4" /> Email resent! Check your inbox.
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={resendVerification}
              disabled={resending}
            >
              {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Resend Verification Email
            </Button>
          )}

          {resendError && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" /> Failed to resend. Try again or contact support.
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <Link href="/directory" className="hover:text-primary transition-colors flex items-center gap-1">
            Browse Directory <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => logout()}
            className="hover:text-destructive transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
