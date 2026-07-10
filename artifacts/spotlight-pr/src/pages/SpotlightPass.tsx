import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Check, CalendarHeart, Ticket, Percent, Sparkles, Gift, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
  id: string; name: string; price_cents: number; term: string;
  blurb: string | null; checkout_url: string | null; features: any;
};

const PERKS = [
  { icon: <CalendarHeart className="w-5 h-5" />, title: "Date & trip builder", desc: "Build the perfect day or trip — beaches, eats, and experiences mapped into one plan." },
  { icon: <Percent className="w-5 h-5" />, title: "5% off every experience", desc: "Save on every guided tour and lesson on Spotlight — and your guide still gets their full rate." },
  { icon: <Gift className="w-5 h-5" />, title: "$5 every month", desc: "Spotlight Pass members get a $5 coupon each month to spend at any Promoted local business.", monthlyOnly: true },
  { icon: <Ticket className="w-5 h-5" />, title: "Members-only perks", desc: "Exclusive discounts and extras at partner businesses across the island." },
];

function termLabel(t: string) { return t === "mo" ? "/month" : t === "week" ? "/week" : `/${t}`; }

function PlanCard({ plan, highlight }: { plan: Plan; highlight?: boolean }) {
  const price = `$${Math.round(plan.price_cents / 100)}`;
  const perks = PERKS.filter((p) => !(p.monthlyOnly && plan.term !== "mo"));
  return (
    <div className={`rounded-3xl border p-6 flex flex-col ${highlight ? "border-primary shadow-xl shadow-primary/10 bg-white relative" : "border-border bg-white"}`}>
      {highlight && <span className="absolute -top-3 left-6 text-[11px] font-bold bg-primary text-white px-3 py-1 rounded-full">Best value for locals</span>}
      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mt-1 mb-3">
        <span className="text-4xl font-bold font-display">{price}</span>
        <span className="text-muted-foreground">{termLabel(plan.term)}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{plan.term === "week" ? "One-time — 7 days of full access. Perfect for a trip." : "Billed monthly. Cancel anytime."}</p>
      <ul className="space-y-2.5 mb-6 flex-1">
        {perks.map((p) => (
          <li key={p.title} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span><span className="font-semibold">{p.title}</span> — <span className="text-muted-foreground">{p.desc}</span></span></li>
        ))}
      </ul>
      {plan.checkout_url ? (
        <a href={plan.checkout_url} target="_blank" rel="noopener noreferrer">
          <Button className="w-full" size="lg">Get {plan.name}</Button>
        </a>
      ) : (
        <Button className="w-full" size="lg" disabled>Available soon</Button>
      )}
    </div>
  );
}

export default function SpotlightPass() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("plans").select("*").in("id", ["spotlight_pass", "travel_pass"]).eq("is_active", true);
        const order = ["spotlight_pass", "travel_pass"];
        setPlans(((data as Plan[]) || []).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)));
      } catch { setPlans([]); } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary via-teal-600 to-emerald-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 75% 25%, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative container mx-auto px-4 py-14 md:py-20 text-center max-w-2xl">
          <p className="text-white/85 text-sm font-semibold mb-3 flex items-center justify-center gap-1.5"><Star className="w-4 h-4" /> Spotlight Pass</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">Explore Puerto Rico like a local</h1>
          <p className="text-white/90 md:text-lg">One pass unlocks a personal trip builder, 5% off every experience, monthly credit at local businesses, and members-only perks across the island.</p>
        </div>
      </div>

      {/* Perks strip */}
      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {PERKS.map((p) => (
            <div key={p.title} className="bg-white rounded-2xl border border-border shadow-sm p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">{p.icon}</div>
              <p className="font-semibold text-sm leading-tight">{p.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-5">
              {plans.map((p) => <PlanCard key={p.id} plan={p} highlight={p.id === "spotlight_pass"} />)}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> The 5% experience discount is on us — guides always receive their full rate.
            </p>
          </>
        )}
      </div>

      {/* Business CTA */}
      <div className="container mx-auto px-4 pb-14 max-w-3xl">
        <div className="rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50 border border-border p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-display font-bold">Own a business? Get Pass-holders through your door.</p>
            <p className="text-sm text-muted-foreground">Promoted businesses accept members' monthly $5 credits and reach every Pass holder.</p>
          </div>
          <Link href="/business"><Button variant="outline" className="shrink-0">List your business</Button></Link>
        </div>
      </div>
    </div>
  );
}
