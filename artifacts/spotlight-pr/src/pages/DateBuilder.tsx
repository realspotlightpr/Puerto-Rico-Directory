import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Sparkles, Shuffle, Share2, MapPin, Loader2, Clock, ArrowRight, Star, Bookmark } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Stop = { time: string; name: string; href: string; sub: string; img?: string | null };

const REGIONS = ["Anywhere", "West", "North", "East", "Central", "South", "Metro"];
const VIBES: { id: string; emoji: string; label: string }[] = [
  { id: "romantic", emoji: "❤️", label: "Romantic date" },
  { id: "beach", emoji: "🏖️", label: "Beach chill" },
  { id: "adventure", emoji: "🧗", label: "Adventure" },
  { id: "foodie", emoji: "🍽️", label: "Foodie & drinks" },
  { id: "family", emoji: "👨‍👩‍👧", label: "Family day" },
  { id: "culture", emoji: "🎨", label: "Culture & sights" },
];

const rand = <T,>(a: T[]): T | null => (a.length ? a[Math.floor(Math.random() * a.length)] : null);

export default function DateBuilder() {
  const { toast } = useToast();
  const { openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  const [vibe, setVibe] = useState("romantic");
  const [region, setRegion] = useState("Anywhere");
  const [plan, setPlan] = useState<Stop[] | null>(null);
  const [isPass, setIsPass] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: acts }, { data: svcs }, { data: biz }] = await Promise.all([
          supabase.from("activities").select("id, name, slug, activity_type, municipality, region, image_url").eq("status", "approved"),
          supabase.from("services").select("id, title, slug, municipality, images, price, price_unit").eq("status", "active"),
          supabase.from("businesses").select("id, name, slug, municipality, category_id, cover_url, logo_url").eq("status", "approved").in("category_id", [1, 2, 3]),
        ]);
        setPlaces(acts || []);
        setExperiences(svcs || []);
        setRestaurants((biz || []).filter((b: any) => b.category_id === 1 || b.category_id === 2));
        setCafes((biz || []).filter((b: any) => b.category_id === 3));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: pu } = await supabase.from("users").select("plan_id, plan_ends_at").eq("id", user.id).maybeSingle();
          const pp = pu as any;
          setIsPass(!!(pp && (pp.plan_id === "spotlight_pass" || pp.plan_id === "travel_pass") && (!pp.plan_ends_at || new Date(pp.plan_ends_at) > new Date())));
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { if (!loading) generate(); /* eslint-disable-next-line */ }, [loading]);

  const generate = () => {
    const pool = region === "Anywhere" ? places : (places.filter((p) => p.region === region).length ? places.filter((p) => p.region === region) : places);
    const P = (a: any): Stop | null => a ? { time: "", name: a.name, href: `/activities/${a.slug || a.id}`, sub: a.activity_type, img: a.image_url } : null;
    const B = (b: any): Stop | null => b ? { time: "", name: b.name, href: `/businesses/${b.slug || b.id}`, sub: "local favorite", img: b.cover_url || b.logo_url } : null;
    const X = (s: any): Stop | null => s ? { time: "", name: s.title, href: `/experiences/${s.slug || s.id}`, sub: "guided experience", img: Array.isArray(s.images) ? s.images[0] : null } : null;
    const ofType = (types: string[]) => P(rand(pool.filter((p) => types.includes(p.activity_type))) || rand(pool));
    const food = () => B(rand(restaurants));
    const cafe = () => B(rand(cafes) || rand(restaurants));
    const exp = () => X(rand(experiences));

    const templates: Record<string, [string, () => Stop | null][]> = {
      romantic: [["Afternoon", () => ofType(["scenic", "waterfall", "beach"])], ["Golden hour", () => ofType(["beach", "scenic"])], ["Dinner", food], ["Nightcap", cafe]],
      beach: [["Morning", () => ofType(["beach"])], ["Lunch", food], ["Afternoon", () => ofType(["beach", "snorkeling"])], ["Sunset", () => ofType(["scenic", "beach"])]],
      adventure: [["Morning", () => ofType(["hiking", "cave", "waterfall", "zipline"])], ["Midday", () => exp() || ofType(["surfing"])], ["Afternoon", () => ofType(["beach", "scenic"])], ["Dinner", food]],
      foodie: [["Brunch", cafe], ["Explore", () => ofType(["scenic", "beach"])], ["Dinner", food], ["Drinks", food]],
      family: [["Morning", () => ofType(["beach", "cave"])], ["Lunch", food], ["Afternoon", () => ofType(["scenic", "waterfall", "zipline"])], ["Treat", cafe]],
      culture: [["Morning", () => ofType(["scenic", "cave"])], ["Lunch", food], ["Afternoon", () => ofType(["scenic", "hiking"])], ["Evening", food]],
    };
    const seen = new Set<string>();
    const stops = (templates[vibe] || templates.romantic)
      .map(([time, fn]) => { const s = fn(); return s ? { ...s, time } : null; })
      .filter((s): s is Stop => !!s && (!seen.has(s.href) && (seen.add(s.href), true)));
    setPlan(stops);
  };

  const share = async () => {
    const url = window.location.href;
    if ((navigator as any).share) { try { await (navigator as any).share({ title: "My Spotlight PR plan", url }); return; } catch { /* cancel */ } }
    try { await navigator.clipboard.writeText(url); toast({ title: "Link copied!" }); } catch { /* ignore */ }
  };

  const savePlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { openAuthModal?.(); return; }
    if (!isPass) { setShowUpgrade(true); return; }
    if (!plan || !plan.length) return;
    const title = `${VIBES.find((v) => v.id === vibe)?.label || "Plan"}${region !== "Anywhere" ? ` · ${region}` : ""}`;
    const { error } = await supabase.from("saved_plans").insert({ user_id: user.id, kind: "date", title, region, vibe, data: plan });
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan saved 🔖", description: "Find it under My Plans." });
  };

  return (
    <div className="min-h-screen">
      {showUpgrade && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUpgrade(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <button onClick={() => setShowUpgrade(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><Star className="w-0 h-0" />✕</button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-white flex items-center justify-center mx-auto mb-4"><Sparkles className="w-7 h-7" /></div>
            <h3 className="font-display text-xl font-bold mb-1">Save plans with Spotlight Pass</h3>
            <p className="text-sm text-muted-foreground mb-4">Build all you like — saving and revisiting your plans is a Spotlight Pass feature ($20/mo), plus 5% off experiences and a $5 monthly credit.</p>
            <div className="space-y-2">
              <Link href="/pass"><Button className="w-full">Get the Pass</Button></Link>
              <button onClick={() => setShowUpgrade(false)} className="block w-full text-xs text-muted-foreground hover:text-foreground pt-1">Keep exploring the preview</button>
            </div>
          </div>
        </div>
      )}
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-rose-500 via-primary to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative container mx-auto px-4 py-10 md:py-14 max-w-3xl">
          <p className="text-white/85 text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Date & Trip Builder</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Plan the perfect day in Puerto Rico</h1>
          <p className="text-white/90 max-w-xl">Pick a vibe and a region — we'll build you a ready-to-go plan of places, food, and experiences. Shuffle until it's just right.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Controls */}
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-sm font-semibold mb-2">What's the vibe?</p>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button key={v.id} onClick={() => setVibe(v.id)} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${vibe === v.id ? "bg-primary text-white border-primary" : "bg-muted/60 border-border/50 hover:bg-muted"}`}>
                  <span>{v.emoji}</span>{v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Where?</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button key={r} onClick={() => setRegion(r)} className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${region === r ? "bg-primary text-white border-primary" : "bg-muted/60 border-border/50 hover:bg-muted"}`}>{r}</button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="gap-2 shadow-lg shadow-primary/20" size="lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />} Build my plan
          </Button>
        </div>

        {/* Plan */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : plan && plan.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Your {VIBES.find((v) => v.id === vibe)?.label.toLowerCase()} plan</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={generate}><Shuffle className="w-4 h-4" /> Shuffle</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={savePlan}><Bookmark className="w-4 h-4" /> Save</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={share}><Share2 className="w-4 h-4" /> Share</Button>
              </div>
            </div>
            <div className="relative pl-6 space-y-3 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {plan.map((s, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-primary border-2 border-white shadow" />
                  <Link href={s.href}>
                    <div className="flex items-center gap-3 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-3 cursor-pointer group">
                      <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                        {s.img ? <img src={s.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-teal-400 to-cyan-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-wide text-primary font-bold flex items-center gap-1"><Clock className="w-3 h-3" />{s.time}</p>
                        <p className="font-semibold leading-tight truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground capitalize truncate">{s.sub}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-900 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> The Date Builder is a <span className="font-semibold">Spotlight Pass</span> perk.</p>
              <Link href="/pass"><Button size="sm" className="shrink-0">Get the Pass</Button></Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Pick a vibe and tap “Build my plan”.</p>
          </div>
        )}
      </div>
    </div>
  );
}
