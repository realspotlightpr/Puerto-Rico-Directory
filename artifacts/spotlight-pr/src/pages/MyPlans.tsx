import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Loader2, Trash2, CalendarHeart, MapPin, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MyPlans() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("saved_plans").select("*").order("created_at", { ascending: false });
      setPlans(data || []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isAuthenticated]);

  const del = async (id: number) => { setPlans((p) => p.filter((x) => x.id !== id)); await supabase.from("saved_plans").delete().eq("id", id); };

  if (!isAuthenticated) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
      <CalendarHeart className="w-10 h-10 text-primary" />
      <h1 className="font-display text-2xl font-bold">Your saved plans</h1>
      <p className="text-muted-foreground max-w-sm">Sign in to save and revisit your date &amp; trip plans.</p>
      <Button onClick={() => openAuthModal?.()}>Sign in</Button>
    </div>
  );
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2"><CalendarHeart className="w-6 h-6 text-primary" /> My Plans</h1>
        <Link href="/date-builder"><Button className="gap-2"><Plus className="w-4 h-4" /> New plan</Button></Link>
      </div>
      {plans.length === 0 ? (
        <div className="bg-white border border-dashed rounded-2xl p-12 text-center">
          <CalendarHeart className="w-10 h-10 text-primary/40 mx-auto mb-3" />
          <p className="font-semibold mb-1">No saved plans yet</p>
          <p className="text-sm text-muted-foreground mb-4">Build a date or trip plan and save it to revisit anytime.</p>
          <Link href="/date-builder"><Button>Build a plan</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-display font-bold flex items-center gap-2">{p.title} <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{p.kind}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Saved {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => del(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="space-y-2">
                {(Array.isArray(p.data) ? p.data : []).map((s: any, i: number) => (
                  <Link key={i} href={s.href || "#"}>
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5 hover:bg-muted/40 cursor-pointer group">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">{s.img ? <img src={s.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-teal-400 to-cyan-600" />}</div>
                      <div className="min-w-0 flex-1">
                        {s.time && <p className="text-[10px] uppercase tracking-wide text-primary font-bold">{s.time}</p>}
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground capitalize truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{s.sub}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
