import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { MapPin, Sparkles, Loader2, ArrowLeft, Waves, Info, Calendar, Signal } from "lucide-react";
import { Button } from "@/components/ui/button";

const VISUAL: Record<string, [string, string]> = {
  beach: ["from-cyan-400 to-blue-500", "🏖️"], snorkeling: ["from-teal-400 to-cyan-600", "🤿"], surfing: ["from-blue-500 to-indigo-600", "🏄"],
  cave: ["from-amber-700 to-stone-800", "🕳️"], waterfall: ["from-emerald-400 to-teal-600", "💧"], bioluminescent: ["from-indigo-600 to-purple-700", "✨"],
  hiking: ["from-green-500 to-emerald-700", "🥾"], scenic: ["from-orange-400 to-pink-500", "🌅"], zipline: ["from-lime-400 to-green-600", "🪂"], diving: ["from-cyan-500 to-blue-700", "🐠"],
};
const vis = (t: string): [string, string] => VISUAL[t] || ["from-teal-400 to-cyan-600", "🌴"];

export function MapEmbed({ query, lat, lon, title }: { query: string; lat?: number | null; lon?: number | null; title?: string }) {
  const src = (lat != null && lon != null)
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.015}%2C${lon + 0.02}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lon}`
    : `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm">
      <iframe title={title || "map"} src={src} className="w-full h-64 md:h-80" loading="lazy" style={{ border: 0 }} />
    </div>
  );
}

export default function ActivityDetail() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("activities").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
        setA(data ?? null);
      } catch { setA(null); } finally { setLoading(false); }
    })();
  }, [slug]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!a) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4"><h2 className="text-2xl font-bold">Spot not found</h2><Link href="/activities"><Button>Back to Activities</Button></Link></div>;

  const [grad, emoji] = vis(a.activity_type);
  const mapQuery = [a.name, a.municipality, "Puerto Rico"].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen">
      <div className={`relative h-56 md:h-72 bg-gradient-to-br ${grad} flex items-center justify-center`}>
        {a.image_url ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" /> : <span className="text-7xl drop-shadow-lg">{emoji}</span>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-4 left-4"><Link href="/activities"><Button variant="outline" size="sm" className="bg-white/90 gap-1"><ArrowLeft className="w-4 h-4" /> Activities</Button></Link></div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold capitalize bg-black/30 backdrop-blur px-2 py-0.5 rounded-full">{a.activity_type}</span>
            {a.featured && <span className="text-[11px] font-bold bg-white/90 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> Featured</span>}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">{a.name}</h1>
          <p className="text-white/85 text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {a.municipality}{a.region ? ` · ${a.region}` : ""}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <div className="flex flex-wrap gap-2">
          {a.difficulty && <span className="text-xs font-medium capitalize px-3 py-1 rounded-full bg-muted flex items-center gap-1"><Signal className="w-3.5 h-3.5" /> {a.difficulty}</span>}
          {a.best_season && <span className="text-xs font-medium px-3 py-1 rounded-full bg-muted flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {a.best_season}</span>}
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${a.is_free ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{a.is_free ? "Free" : "Paid / Tour"}</span>
        </div>

        {a.description && <p className="text-base leading-relaxed">{a.description}</p>}
        {a.wave_summary && <p className="text-cyan-700 font-medium flex items-center gap-2"><Waves className="w-4 h-4" /> {a.wave_summary}</p>}
        {a.highlights && (
          <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 flex gap-3">
            <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div><p className="font-semibold text-sm text-teal-900 mb-0.5">Good to know</p><p className="text-sm text-teal-800">{a.highlights}</p></div>
          </div>
        )}

        <div>
          <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Location</h2>
          <MapEmbed query={mapQuery} lat={a.latitude} lon={a.longitude} title={a.name} />
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-2 hover:underline"><MapPin className="w-4 h-4" /> Get directions</a>
        </div>

        {a.activity_type === "surfing" && (
          <Link href="/surf"><Button variant="outline" className="w-full">🏄 Check live surf cams</Button></Link>
        )}
      </div>
    </div>
  );
}
