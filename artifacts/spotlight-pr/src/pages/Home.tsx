import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Search, MapPin, Shuffle, ArrowRight, Sparkles, Store, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { BusinessCard } from "@/components/business/BusinessCard";

const mapBiz = (b: any) => ({
  id: b.id, slug: b.slug, name: b.name,
  categoryName: b.categories?.name || "Local Business",
  municipality: b.municipality, coverUrl: b.cover_url, logoUrl: b.logo_url,
  averageRating: b.average_rating, reviewCount: b.review_count,
  featured: b.featured, status: b.status, phone: b.phone,
  description: b.description, isClaimed: b.is_claimed,
});

const DISCOVER = [
  { href: "/directory", label: "Businesses", sub: "Shops, food & services", emoji: "🏪", grad: "from-blue-500 to-cyan-500" },
  { href: "/activities", label: "Activities", sub: "Beaches, caves, waterfalls", emoji: "🌴", grad: "from-teal-500 to-emerald-500" },
  { href: "/surf", label: "Surf Cams", sub: "Live spots & conditions", emoji: "🏄", grad: "from-cyan-600 to-blue-700" },
  { href: "/experiences", label: "Experiences", sub: "Book local guides", emoji: "🧭", grad: "from-emerald-500 to-teal-600" },
];

const ACT_EMOJI: Record<string, string> = { beach: "🏖️", snorkeling: "🤿", surfing: "🏄", cave: "🕳️", waterfall: "💧", bioluminescent: "✨", hiking: "🥾", scenic: "🌅", zipline: "🪂", diving: "🐠" };
const ACT_GRAD: Record<string, string> = { beach: "from-cyan-400 to-blue-500", snorkeling: "from-teal-400 to-cyan-600", surfing: "from-blue-500 to-indigo-600", cave: "from-amber-700 to-stone-800", waterfall: "from-emerald-400 to-teal-600", bioluminescent: "from-indigo-600 to-purple-700", hiking: "from-green-500 to-emerald-700", scenic: "from-orange-400 to-pink-500", zipline: "from-lime-400 to-green-600", diving: "from-cyan-500 to-blue-700" };

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [featured, setFeatured] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [acts, setActs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [surprising, setSurprising] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: feat }, { data: recent }, { data: c }, { data: a }] = await Promise.all([
          supabase.from("businesses").select("*, categories(name)").eq("status", "approved").eq("featured", true).limit(8),
          supabase.from("businesses").select("*, categories(name)").eq("status", "approved").order("created_at", { ascending: false }).limit(8),
          supabase.from("categories").select("id, name, slug").order("id"),
          supabase.from("activities").select("id, name, slug, activity_type, municipality, featured").eq("status", "approved").order("featured", { ascending: false }).limit(6),
        ]);
        const list = (feat && feat.length >= 3 ? feat : recent) ?? [];
        setFeatured(list.map(mapBiz));
        setCats(c ?? []);
        setActs(a ?? []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const doSearch = () => setLocation(`/directory${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`);

  const surprise = async () => {
    setSurprising(true);
    try {
      const { data } = await supabase.from("businesses").select("id, slug").eq("status", "approved").limit(60);
      if (data && data.length) {
        const pick = data[Math.floor(Math.random() * data.length)];
        setLocation(`/businesses/${pick.slug || pick.id}`);
      }
    } finally { setSurprising(false); }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 15% 25%, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div className="relative container mx-auto px-4 py-12 md:py-20 text-center">
          <p className="inline-flex items-center gap-2 text-sm font-medium bg-white/15 rounded-full px-3 py-1 mb-4">🇵🇷 Your guide to the island</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3 leading-tight">Discover the best of<br className="hidden sm:block" /> Puerto Rico</h1>
          <p className="text-white/85 max-w-xl mx-auto mb-6 text-base md:text-lg">Local businesses, hidden beaches, surf breaks, waterfalls, and guided adventures — all in one place.</p>
          <div className="max-w-lg mx-auto flex gap-2 bg-white rounded-2xl p-2 shadow-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Search businesses, food, services…" className="pl-10 border-0 focus-visible:ring-0 text-foreground h-11" />
            </div>
            <Button onClick={doSearch} className="rounded-xl h-11 px-5">Search</Button>
          </div>
          <button onClick={surprise} disabled={surprising} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 transition-colors">
            <Shuffle className="w-4 h-4" /> {surprising ? "Finding a gem…" : "Surprise me"}
          </button>
        </div>
      </section>

      {/* Discover tiles */}
      <section className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DISCOVER.map((d) => (
            <Link key={d.href} href={d.href}>
              <div className={`group cursor-pointer rounded-2xl p-4 bg-gradient-to-br ${d.grad} text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full`}>
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{d.emoji}</div>
                <p className="font-display font-bold leading-tight">{d.label}</p>
                <p className="text-white/80 text-xs mt-0.5">{d.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      {cats.length > 0 && (
        <section className="container mx-auto px-4 pt-8">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {cats.map((c) => (
              <Link key={c.id} href={`/directory?category=${encodeURIComponent(c.slug || c.name)}`}>
                <span className="shrink-0 inline-block px-4 py-2 rounded-full bg-muted hover:bg-primary hover:text-white text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer">{c.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured businesses */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Featured businesses</h2>
          <Link href="/directory"><span className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer">See all <ArrowRight className="w-4 h-4" /></span></Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />)}</div>
        ) : featured.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.slice(0, 8).map((b) => <BusinessCard key={b.id} business={b as any} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">No businesses yet — <Link href="/list-your-business"><span className="text-primary font-medium cursor-pointer">be the first to list</span></Link>.</p>
        )}
      </section>

      {/* Activities rail */}
      {acts.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2">🌴 Adventures on the island</h2>
            <Link href="/activities"><span className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer">Explore <ArrowRight className="w-4 h-4" /></span></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {acts.map((a) => (
              <Link key={a.id} href="/activities">
                <div className="group cursor-pointer rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-lg transition-all">
                  <div className={`h-24 bg-gradient-to-br ${ACT_GRAD[a.activity_type] || "from-teal-400 to-cyan-600"} flex items-center justify-center text-4xl group-hover:scale-105 transition-transform`}>{ACT_EMOJI[a.activity_type] || "🌴"}</div>
                  <div className="p-2.5">
                    <p className="font-semibold text-sm leading-tight line-clamp-1">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{a.municipality}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA band */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-cyan-600 text-white p-6 flex flex-col justify-between">
            <div>
              <Store className="w-8 h-8 mb-2" />
              <p className="font-display font-bold text-xl mb-1">Own a business?</p>
              <p className="text-white/85 text-sm mb-4">List it free and reach visitors and locals across all 78 municipalities.</p>
            </div>
            <Link href="/list-your-business"><button className="self-start px-5 py-2.5 rounded-xl bg-white text-primary text-sm font-bold hover:bg-white/90">Add your business</button></Link>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 flex flex-col justify-between">
            <div>
              <Compass className="w-8 h-8 mb-2" />
              <p className="font-display font-bold text-xl mb-1">Are you a local guide?</p>
              <p className="text-white/85 text-sm mb-4">Offer snorkeling trips, hikes, and tours — and take bookings on Spotlight.</p>
            </div>
            <Link href="/guide"><button className="self-start px-5 py-2.5 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:bg-white/90">Become a guide</button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
