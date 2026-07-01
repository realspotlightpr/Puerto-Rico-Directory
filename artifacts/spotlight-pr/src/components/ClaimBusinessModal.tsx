import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, CheckCircle2, Loader2, Mail, Phone, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClaimBusinessModalProps {
  businessId: number;
  businessName: string;
  onClose: () => void;
}

export function ClaimBusinessModal({ businessId, businessName, onClose }: ClaimBusinessModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("claims", {
        body: { action: "submit", businessId, name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim() },
      });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 text-white/80 hover:text-white" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="bg-gradient-to-br from-primary to-primary/80 p-6 text-white text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Claim {businessName}</h2>
          <p className="text-white/80 text-sm mt-1">
            Tell us how to reach you and we'll verify your ownership.
          </p>
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Claim submitted!</h3>
              <p className="text-sm text-muted-foreground">
                Check your email and phone — we've sent instructions to verify ownership. Once our team confirms it,
                we'll create your account and email your login details.
              </p>
              <Button className="mt-5 w-full" onClick={onClose}>Done</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="claim-name">Your Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="claim-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="pl-9" required autoFocus />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claim-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="claim-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" className="pl-9" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claim-phone">Mobile (for SMS updates)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="claim-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (787) 555-0123" className="pl-9" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="claim-message">Anything we should know? (optional)</Label>
                <textarea
                  id="claim-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Your role at the business, etc."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit claim"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                A team member will personally verify your claim before your account is created.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
