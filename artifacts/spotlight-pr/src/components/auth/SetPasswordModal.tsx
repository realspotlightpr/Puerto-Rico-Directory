import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetPasswordModalProps {
  onComplete: () => void;
}

export function SetPasswordModal({ onComplete }: SetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => onComplete(), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const strength = password.length === 0
    ? null
    : password.length < 8
    ? "weak"
    : password.length < 12
    ? "fair"
    : "strong";

  const strengthColor = { weak: "bg-red-400", fair: "bg-amber-400", strong: "bg-emerald-500" }[strength ?? "weak"];
  const strengthWidth = { weak: "w-1/3", fair: "w-2/3", strong: "w-full" }[strength ?? "weak"];
  const strengthLabel = { weak: "Weak", fair: "Fair", strong: "Strong" }[strength ?? "weak"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Set Your Password</h2>
          <p className="text-white/80 text-sm mt-1">
            Create a password so you can sign in easily next time.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Password Set!</h3>
              <p className="text-sm text-muted-foreground">
                Your password has been saved. You can now sign in with your email and password anytime.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {strength && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strengthColor} ${strengthWidth}`} />
                    </div>
                    <p className={`text-xs font-medium ${strength === "weak" ? "text-red-500" : strength === "fair" ? "text-amber-500" : "text-emerald-600"}`}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`pl-9 ${confirm && confirm !== password ? "border-destructive" : confirm && confirm === password ? "border-emerald-500" : ""}`}
                    required
                  />
                </div>
                {confirm && confirm === password && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  "Save Password"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You'll still be able to use magic links to sign in, but now you'll also have a password.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
