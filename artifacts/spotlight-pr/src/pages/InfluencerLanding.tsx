import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Loader2, Compass, MapPin, Ticket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InfluencerLanding() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [inf, setInf] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("influencers").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
      setInf(data ?? null);
      if (data?.code) { try { localStorage.setItem("sp_ref", data.code); } catch { /* ignore */ } }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!inf) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3"><h2 className="text-xl font-bold">Creator not found</h2><Link href="/"><Button>Go home</Button></Link></div>;

  const brand = inf.brand_color || "#0e7490";
  const ref = `?ref=${encodeURIComponent(inf.code)}`;

  return (
    <div className="min-h-screen">
      <div className="relative text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${brand}, #059669)` }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 75% 25%, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative container mx-auto px-4 py-16 text-center max-w-xl">
          {inf.photo_url && <img src={inf.photo_url} alt={inf.display_name} className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-white/50" />}
          <p className="text-white/85 text-sm font-semibold mb-2 flex items-center justify-center gap-1.5"><Sparkles className="w-4 h-4" /> {inf.display_name} × Spotlight PR</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Discover Puerto Rico with {inf.display_name}</h1>
          {inf.bio && <p className="text-white/90 mb-6">{inf.bio}</p>}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href={`/pass${ref}`}><Button size="lg" className="bg-white text-primary hover:bg-white/90 gap-2"><Ticket className="w-4 h-4" /> Get the Spotlight Pass</Button></Link>
            <Link href={`/directory${ref}`}><Button size="lg" variant="outline" className="border-white/60 text-white hover:bg-white/10 gap-2"><Compass className="w-4 h-4" /> Start exploring</Button></Link>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 max-w-3xl grid sm:grid-cols-3 gap-4 text-center">
        {[["🏝️", "Places", "Beaches, waterfalls & hidden gems"], ["🧭", "Experiences", "Book local guides & tours"], ["🏪", "Local businesses", "Support spots across the island"]].map(([e, t, d]) => (
          <div key={t} className="bg-white border rounded-2xl p-5">
            <div className="text-3xl mb-2">{e}</div>
            <p className="font-display font-bold">{t}</p>
            <p className="text-sm text-muted-foreground mt-1">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
