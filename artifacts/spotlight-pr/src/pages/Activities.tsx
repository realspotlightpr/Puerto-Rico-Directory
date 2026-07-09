import { useState, useEffect } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { MapPin, Sparkles, Loader2 } from "lucide-react";

type Activity = {
  id: number;
  name: string;
  slug: string;
  activity_type: string;
  municipality: string | null;
  region: string | null;
  description: string | null;
  image_url: string | null;
  difficulty: string | null;
  is_free: boolean;
  featured: boolean;
};

const TYPES: { key: string; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "🌴" },
  { key: "beach", label: "Beaches", emoji: "🏖️" },
  { key: "snorkeling", label: "Snorkeling", emoji: "🤿" },
  { key: "surfing", label: "Surfing", emoji: "🏄" },
  { key: "waterfall", label: "Waterfalls", emoji: "💧" },
  { key: "cave", label: "Caves", emoji: "🕳️" },
  { key: "bioluminescent", label: "Bio Bays", emoji: "✨" },
  { key: "hiking", label: "Hiking", emoji: "🥾" },
  { key: "scenic", label: "Scenic", emoji: "🌅" },
  { key: "zipline", label: "Ziplining", emoji: "🪂" },
];

const VISUAL: Record<string, [string, string]> = {
  beach: ["from-cyan-400 to-blue-500", "🏖️"],
  snorkeling: ["from-teal-400 to-cyan-600", "🤿"],
  surfing: ["from-blue-500 to-indigo-600", "🏄"],
  cave: ["from-amber-700 to-stone-800", "🕳️"],
  waterfall: ["from-emerald-400 to-teal-600", "💧"],
  bioluminescent: ["from-indigo-600 to-purple-700", "✨"],
  hiking: ["from-green-500 to-emerald-700", "🥾"],
  scenic: ["from-orange-400 to-pink-500", "🌅"],
  zipline: ["from-lime-400 to-green-600", "🪂"],
  diving: ["from-cyan-500 to-blue-700", "🐠"],
};
const vis = (t: string): [string, string] => VISUAL[t] || ["from-teal-400 to-cyan-600", "🌴"];

function ActivityCard({ a }: { a: Activity }) {
  const [grad, emoji] = vis(a.activity_type);
  return (
    <Link href={`/activities/${a.slug}`} className="block cursor-pointer">
    <div className="group rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`relative h-40 bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`}>
        {a.image_url ? (
          <img src={a.image_url} alt={a.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="text-6xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">{emoji}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {a.featured && (
          <span className="absolute top-3 left-3 text-[11px] font-bold bg-white/90 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Featured
          </span>
        )}
        <span className="absolute bottom-3 left-3 text-white text-xs font-semibold capitalize bg-black/30 backdrop-blur px-2 py-0.5 rounded-full">{a.activity_type}</span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-base leading-tight">{a.name}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="w-3 h-3 text-primary shrink-0" /> {a.municipality}{a.region ? ` · ${a.region}` : ""}
        </div>
        {a.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{a.description}</p>}
        <div className="flex items-center gap-2 mt-3">
          {(a as any).provider && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white">✦ {(a as any).provider}</span>}
          {a.difficulty && <span className="text-[11px] font-medium capitalize px-2 py-0.5 rounded-full bg-muted">{a.difficulty}</span>}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${a.is_free ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {a.is_free ? "Free" : "Paid / Tour"}
          </span>
        </div>
      </div>
    </div>
    </Link>
  );
}

export default function Activities() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Activity[]>([]);
  const [type, setType] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("activities")
          .select("*")
          .eq("status", "approved")
          .order("featured", { ascending: false })
          .order("name");
        setItems((data as Activity[]) || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = type === "all" ? items : items.filter((a) => a.activity_type === type);
  const featured = items.filter((a) => a.featured).slice(0, 6);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <p className="text-white/80 text-sm font-medium mb-2">🌴 Explore the island</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Discover Puerto Rico's Best Places</h1>
          <p className="text-white/85 max-w-xl">Snorkel hidden reefs, chase waterfalls, glow in a bioluminescent bay, and explore ancient caves — the best natural experiences across the island.</p>
        </div>
      </div>

      {/* Type chips */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${type === t.key ? "bg-primary text-white shadow" : "bg-muted text-foreground hover:bg-muted/70"}`}
            >
              <span className="mr-1">{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {type === "all" && featured.length > 0 && (
              <div className="mb-8">
                <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Must-see spots</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featured.map((a) => <ActivityCard key={a.id} a={a} />)}
                </div>
              </div>
            )}

            <h2 className="font-display text-xl font-bold mb-3">
              {type === "all" ? "All places" : TYPES.find((t) => t.key === type)?.label}{" "}
              <span className="text-muted-foreground font-normal text-base">({filtered.length})</span>
            </h2>
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center">No spots in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((a) => <ActivityCard key={a.id} a={a} />)}
              </div>
            )}

            {/* Guide CTA */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 p-6 text-center">
              <p className="font-display font-bold text-lg mb-1">Are you a local tour guide? 🧭</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">List your snorkeling trips, hikes, cave tours, and experiences — and start taking bookings right here on Spotlight.</p>
              <Link href="/signup"><button className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">Become a guide</button></Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
