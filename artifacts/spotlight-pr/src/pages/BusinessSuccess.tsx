import { Link } from "wouter";
import { CheckCircle2, Sparkles, Film, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const PERKS = [
  { icon: <TrendingUp className="w-4 h-4" />, label: "Featured placement across Spotlight for 3 months" },
  { icon: <Film className="w-4 h-4" />, label: "1 promo reel/month from @spotlightpromopr" },
  { icon: <Users className="w-4 h-4" />, label: "Access to the premium business community" },
  { icon: <Sparkles className="w-4 h-4" />, label: "AI tools + extra listing features" },
];

export default function BusinessSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-teal-50/40 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-border p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-2">You're Promoted! 🎉</h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Payment received — your listing is being upgraded to Promoted (usually within a minute). Let's get you more views, calls, and customers.
        </p>
        <div className="text-left bg-muted/40 rounded-2xl p-4 mb-6 space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> What's included</p>
          {PERKS.map((p) => (
            <div key={p.label} className="flex items-start gap-2.5 text-sm"><span className="text-primary mt-0.5 shrink-0">{p.icon}</span><span>{p.label}</span></div>
          ))}
        </div>
        <Link href="/dashboard"><Button className="w-full gap-2" size="lg"><TrendingUp className="w-4 h-4" /> Go to my dashboard</Button></Link>
        <p className="text-xs text-muted-foreground mt-6">Paid with a different email than your account? Contact us and we'll link your upgrade.</p>
      </div>
    </div>
  );
}
