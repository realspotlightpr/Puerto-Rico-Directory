import { useState, useEffect } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { MapPin, Waves, Loader2, Camera } from "lucide-react";

type SurfSpot = {
  id: number;
  name: string;
  slug: string;
  municipality: string | null;
  region: string | null;
  description: string | null;
  difficulty: string | null;
  best_season: string | null;
  wave_summary: string | null;
  live_feed_url: string | null;
  live_feed_type: string | null;
  feed_partner: string | null;
  featured: boolean;
};

function LiveFeed({ s }: { s: SurfSpot }) {
  if (!s.live_feed_url) {
    return (
      <div className="relative aspect-video bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 flex flex-col items-center justify-center text-white/80">
        <Waves className="w-10 h-10 mb-2 opacity-70" />
        <p className="text-sm font-semibold">Live cam coming soon</p>
        <p className="text-xs text-white/50 mt-0.5">Partner cam not yet connected</p>
      </div>
    );
  }
  const type = s.live_feed_type || "iframe";
  return (
    <div className="relative aspect-video bg-black">
      {type === "image" ? (
        <img src={s.live_feed_url} alt={`${s.name} live`} className="w-full h-full object-cover" />
      ) : (
        <iframe
          src={s.live_feed_url}
          title={`${s.name} live cam`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )}
      <span className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
      </span>
      {s.feed_partner && (
        <span className="absolute bottom-2 right-2 text-[10px] text-white/85 bg-black/40 px-2 py-0.5 rounded-full">cam by {s.feed_partner}</span>
      )}
    </div>
  );
}

export default function Surf() {
  const [loading, setLoading] = useState(true);
  const [spots, setSpots] = useState<SurfSpot[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("activities")
          .select("*")
          .eq("status", "approved")
          .eq("activity_type", "surfing")
          .order("featured", { ascending: false })
          .order("name");
        setSpots((data as SurfSpot[]) || []);
      } catch {
        setSpots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const liveCount = spots.filter((s) => s.live_feed_url).length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-700 via-cyan-700 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <p className="text-white/80 text-sm font-medium mb-2">🏄 Live surf report</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Puerto Rico Surf Cams &amp; Spots</h1>
          <p className="text-white/85 max-w-xl">Check live conditions from our local camera partners and find your next wave — from Rincón's winter reefs to Isabela's north-shore breaks.</p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> {liveCount} live {liveCount === 1 ? "cam" : "cams"} · {spots.length} spots
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {spots.map((s) => (
                <div key={s.id} className="rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-lg transition-shadow">
                  <LiveFeed s={s} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-base leading-tight">{s.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3 text-primary shrink-0" /> {s.municipality}{s.region ? ` · ${s.region}` : ""}
                        </div>
                      </div>
                      {s.featured && <span className="text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full shrink-0">Top spot</span>}
                    </div>
                    {s.wave_summary && (
                      <p className="text-sm text-cyan-700 font-medium mt-2 flex items-center gap-1.5"><Waves className="w-4 h-4 shrink-0" /> {s.wave_summary}</p>
                    )}
                    {s.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {s.difficulty && <span className="text-[11px] capitalize px-2 py-0.5 rounded-full bg-muted font-medium">{s.difficulty}</span>}
                      {s.best_season && <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium">{s.best_season}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Camera partner CTA */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 md:p-8 text-center">
              <Camera className="w-8 h-8 mx-auto mb-2" />
              <p className="font-display font-bold text-xl mb-1">Own a surf cam?</p>
              <p className="text-white/85 text-sm mb-4 max-w-lg mx-auto">Partner with Spotlight Puerto Rico to feature your live feed here and reach thousands of surfers and visitors checking conditions every day.</p>
              <Link href="/signup"><button className="px-5 py-2.5 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-white/90 transition-colors">Become a cam partner</button></Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
