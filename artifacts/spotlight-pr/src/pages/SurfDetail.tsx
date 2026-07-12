import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Calendar, Loader2, MapPin, ShieldAlert, Waves } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Conditions, LiveFeed, type SurfSpot } from "@/pages/Surf";
import { AdSlot } from "@/components/ads/AdSlot";

export default function SurfDetail() {
  const { slug } = useParams();
  const [spot, setSpot] = useState<SurfSpot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const numeric = /^\d+$/.test(String(slug));
      let query = supabase.from("activities").select("*").eq("status", "approved").eq("activity_type", "surfing");
      query = numeric ? query.eq("id", Number(slug)) : query.eq("slug", slug);
      const { data } = await query.maybeSingle();
      setSpot((data as SurfSpot) || null);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!spot) return;
    document.title = `${spot.name} Surf Report & Conditions | Spotlight Puerto Rico`;
    return () => { document.title = "Spotlight Puerto Rico"; };
  }, [spot]);

  if (loading) return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!spot) return <div className="min-h-[60vh] grid place-items-center text-center"><div><Waves className="w-12 h-12 mx-auto text-primary/40" /><h1 className="font-display text-2xl font-bold mt-3">Surf spot not found</h1><Link href="/surf"><Button className="mt-4">Browse surf spots</Button></Link></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-blue-800 via-cyan-800 to-slate-950 text-white">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Link href="/surf"><span className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white"><ArrowLeft className="w-4 h-4" /> All surf spots</span></Link>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-white mt-5">{spot.name}</h1>
          <p className="flex items-center gap-1.5 text-white/75 mt-2"><MapPin className="w-4 h-4" /> {spot.municipality}{spot.region ? ` · ${spot.region}` : ""}</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-7 max-w-5xl grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl overflow-hidden border bg-white shadow-sm"><LiveFeed s={spot} /><div className="p-5"><Conditions lat={spot.latitude} lon={spot.longitude} /></div></div>
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold">About this break</h2>
            <p className="text-muted-foreground leading-relaxed mt-3">{spot.description || `${spot.name} is one of Puerto Rico’s notable surf locations. Check live conditions before entering the water and respect local surfers and posted safety guidance.`}</p>
            {spot.wave_summary && <p className="mt-4 rounded-xl bg-cyan-50 text-cyan-900 p-4 font-medium flex items-start gap-2"><Waves className="w-5 h-5 shrink-0" />{spot.wave_summary}</p>}
          </div>
          <AdSlot placement="surf-detail" />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-display font-bold">Plan your session</h2>
            {spot.difficulty && <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Experience level</p><p className="font-semibold capitalize">{spot.difficulty}</p></div>}
            {spot.best_season && <div><p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Best season</p><p className="font-semibold">{spot.best_season}</p></div>}
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900 flex items-start gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />Conditions change quickly. Confirm locally and surf within your ability.</div>
          </div>
          <Link href="/activities"><Button variant="outline" className="w-full">Explore nearby places</Button></Link>
        </aside>
      </div>
    </div>
  );
}
