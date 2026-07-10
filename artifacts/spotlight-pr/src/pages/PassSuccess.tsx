import { Link } from "wouter";
import { CheckCircle2, CalendarHeart, Percent, Gift, Ticket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PERKS = [
  { icon: <CalendarHeart className="w-4 h-4" />, label: "Build your first plan in the Date Builder" },
  { icon: <Percent className="w-4 h-4" />, label: "5% off every experience — automatically" },
  { icon: <Gift className="w-4 h-4" />, label: "Your $5 monthly credit at Promoted businesses" },
  { icon: <Ticket className="w-4 h-4" />, label: "Members-only perks at partner businesses" },
];

export default function PassSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50/40 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-border p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-2">You're in! 🎉</h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Payment received — your Spotlight Pass is being activated on your account (usually within a minute). Time to explore Puerto Rico like a local.
        </p>
        <div className="text-left bg-muted/40 rounded-2xl p-4 mb-6 space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Your perks</p>
          {PERKS.map((p) => (
            <div key={p.label} className="flex items-start gap-2.5 text-sm"><span className="text-primary mt-0.5 shrink-0">{p.icon}</span><span>{p.label}</span></div>
          ))}
        </div>
        <div className="space-y-3">
          <Link href="/date-builder"><Button className="w-full gap-2" size="lg"><CalendarHeart className="w-4 h-4" /> Build my first plan</Button></Link>
          <Link href="/directory"><Button variant="outline" className="w-full">Browse the directory</Button></Link>
        </div>
        <p className="text-xs text-muted-foreground mt-6">Signed up with a different email than you paid with? Contact us and we'll link your Pass.</p>
      </div>
    </div>
  );
}
