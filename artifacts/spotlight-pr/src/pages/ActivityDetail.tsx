import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Sparkles, Loader2, ArrowLeft, Waves, Info, Calendar, Signal, Share2, Navigation, Camera, Compass, X, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavePremiumButton } from "@/components/SavePremiumButton";

const VISUAL: Record<string, [string, string]> = {
  beach: ["from-cyan-400 to-blue-500", "🏖️"], snorkeling: ["from-teal-400 to-cyan-600", "🤿"], surfing: ["from-blue-500 to-indigo-600", "🏄"],
  cave: ["from-amber-700 to-stone-800", "🕳️"], waterfall: ["from-emerald-400 to-teal-600", "💧"], bioluminescent: ["from-indigo-600 to-purple-700", "✨"],
  hiking: ["from-green-500 to-emerald-700", "🥾"], scenic: ["from-orange-400 to-pink-500", "🌅"], zipline: ["from-lime-400 to-green-600", "🪂"], diving: ["from-cyan-500 to-blue-700", "🐠"],
};
const vis = (t: string): [string, string] => VISUAL[t] || ["from-teal-400 to-cyan-600", "🌴"];

type Thing = { icon: string; label: string; desc: string };
const THINGS_TO_DO: Record<string, Thing[]> = {
  beach: [
    { icon: "🏊", label: "Swim & relax", desc: "Wade into calm, warm Caribbean water and float away the afternoon. Bring water and shade — the sun is strong midday." },
    { icon: "🤿", label: "Snorkel the shallows", desc: "Bring a mask to spot little fish and rays near the rocks. Mornings usually have the clearest water." },
    { icon: "🌅", label: "Watch the sunset", desc: "Stick around as the sky turns gold over the water — one of the best free shows on the island." },
    { icon: "🧺", label: "Beach picnic", desc: "Grab food from a nearby chinchorro or food truck and set up under the palms." },
    { icon: "🏐", label: "Beach volleyball", desc: "There's usually room for a pickup game on the sand — bring a ball and make some friends." },
  ],
  surfing: [
    { icon: "🏄", label: "Catch a wave", desc: "Consistent breaks for a range of levels. Check the swell and tides before you paddle out." },
    { icon: "📚", label: "Take a surf lesson", desc: "Local instructors can have first-timers standing up within a single session." },
    { icon: "📸", label: "Watch the surfers", desc: "Grab a spot on the beach and watch the lineup work the waves — great for photos." },
    { icon: "🌇", label: "Sunset session", desc: "Evening glass-offs, when the wind drops and the water goes smooth, are the reward for a long day." },
  ],
  snorkeling: [
    { icon: "🤿", label: "Snorkel the reef", desc: "Clear water and coral make this a great spot to see marine life up close. Go with a buddy." },
    { icon: "🐠", label: "Spot tropical fish", desc: "Look for parrotfish, sergeant majors, and the occasional sea turtle gliding by." },
    { icon: "🏊", label: "Swim & float", desc: "Easy entry and calm water make for a relaxed swim even if you're not diving down." },
    { icon: "📸", label: "Underwater photos", desc: "Bring a waterproof camera — visibility here is often excellent." },
  ],
  cave: [
    { icon: "🔦", label: "Guided cave tour", desc: "Go with a local guide to explore safely and learn the geology and history of the site." },
    { icon: "📸", label: "Photograph formations", desc: "Dramatic light beams and rock formations make for unforgettable shots." },
    { icon: "🚶", label: "Explore the caverns", desc: "Wander the chambers and passages — wear closed shoes with good grip." },
  ],
  waterfall: [
    { icon: "🏊", label: "Swim in the pool", desc: "Cool off in the natural pool at the base of the falls — the water is refreshing and clear." },
    { icon: "🥾", label: "Hike to the falls", desc: "A short trail through lush forest leads you in. Wear shoes that can get wet." },
    { icon: "📸", label: "Photo spot", desc: "One of the most photogenic spots around — early morning light is best." },
    { icon: "🧺", label: "Picnic nearby", desc: "Shaded spots make it easy to linger and turn the visit into an afternoon." },
  ],
  bioluminescent: [
    { icon: "🛶", label: "Night kayak tour", desc: "Paddle after dark and watch the water light up with every stroke — a bucket-list experience." },
    { icon: "🚤", label: "Guided boat tour", desc: "An easy, dry way to experience the glow with a local captain who knows the bay." },
    { icon: "✨", label: "See the glow", desc: "The glow is strongest on darker nights, away from a full moon. Skip the bug spray — it harms the organisms." },
    { icon: "⭐", label: "Stargaze", desc: "Far from city lights, the night sky puts on its own show above the water." },
  ],
  hiking: [
    { icon: "🥾", label: "Hike the trail", desc: "Follow the path through forest and lookout points. Bring water and start early to beat the heat." },
    { icon: "🐦", label: "Birdwatching", desc: "Keep an eye out for native birds along the way — mornings are the most active." },
    { icon: "📸", label: "Scenic photos", desc: "Panoramic views reward you at the top — worth the climb." },
    { icon: "🧺", label: "Trailside picnic", desc: "Pack snacks and take a break at a viewpoint to soak it in." },
  ],
  scenic: [
    { icon: "📸", label: "Take photos", desc: "Postcard-worthy views around every corner — great for that perfect shot." },
    { icon: "🌅", label: "Watch the sunset", desc: "One of the best vantage points around for golden hour." },
    { icon: "😌", label: "Relax & take it in", desc: "Find a spot, breathe, and enjoy the scenery at your own pace." },
  ],
  zipline: [
    { icon: "🪂", label: "Zipline course", desc: "Soar over the canopy on a series of cables — a rush with a view." },
    { icon: "🌳", label: "Canopy tour", desc: "See the forest from a whole new angle, high above the trees." },
    { icon: "🧗", label: "Adventure park", desc: "Combine ziplines with other high-energy activities for a full day out." },
  ],
  diving: [
    { icon: "🐠", label: "Scuba dive", desc: "Explore deeper reefs with a certified operator — bring your card or book a discovery dive." },
    { icon: "🪸", label: "Explore reefs", desc: "Healthy coral and abundant fish life await below the surface." },
    { icon: "📸", label: "Underwater photography", desc: "Great visibility makes this a favorite for capturing the reef." },
  ],
};
const DEFAULT_THINGS: Thing[] = [
  { icon: "🧭", label: "Explore the area", desc: "Take your time and discover what makes this spot special." },
  { icon: "📸", label: "Take photos", desc: "Plenty of photo-worthy moments to capture here." },
  { icon: "😌", label: "Relax & enjoy", desc: "Slow down and soak in the surroundings." },
];
const thingsToDo = (t: string): Thing[] => THINGS_TO_DO[t] || DEFAULT_THINGS;

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

const gmaps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const amaps = (q: string) => `https://maps.apple.com/?q=${encodeURIComponent(q)}`;

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X className="w-7 h-7" /></button>
      <img src={src} alt="" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function NearbyCard({ p }: { p: any }) {
  return (
    <Link href={`/activities/${p.slug}`} className="block group">
      <div className="rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
        <div className="h-28 bg-muted overflow-hidden">
          {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full bg-gradient-to-br from-teal-400 to-cyan-600" />}
        </div>
        <div className="p-3">
          <p className="font-semibold text-sm leading-tight line-clamp-1">{p.name}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-0.5 mt-0.5 capitalize"><MapPin className="w-3 h-3" />{p.activity_type}{p.municipality ? " · " + p.municipality : ""}</p>
        </div>
      </div>
    </Link>
  );
}

function ExperienceCard({ ex }: { ex: any }) {
  const img = Array.isArray(ex.images) && ex.images[0] ? ex.images[0] : null;
  const price = ex.price ? `$${ex.price}${ex.price_unit ? ` / ${ex.price_unit}` : ""}` : null;
  const mins = ex.duration_minutes ? `${Math.round(ex.duration_minutes / 60 * 10) / 10}h` : null;
  return (
    <Link href="/experiences" className="block group">
      <div className="rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all h-full flex flex-col">
        <div className="h-28 bg-muted overflow-hidden relative">
          {img ? <img src={img} alt={ex.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600" />}
          {price && <span className="absolute bottom-2 left-2 text-[11px] font-bold text-white bg-black/60 backdrop-blur rounded-full px-2 py-0.5">{price}</span>}
        </div>
        <div className="p-3 flex flex-col flex-1">
          <p className="font-semibold text-sm leading-tight line-clamp-2">{ex.title}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
            <span className="line-clamp-1">{ex.provider || "Local guide"}</span>
            {mins && <span className="flex items-center gap-0.5 shrink-0"><Clock className="w-3 h-3" />{mins}</span>}
          </p>
          <span className="mt-2 inline-flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-primary rounded-full px-3 py-1.5 group-hover:bg-primary/90 self-start">Book this tour →</span>
        </div>
      </div>
    </Link>
  );
}

export default function ActivityDetail() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [a, setA] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [nearby, setNearby] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thing, setThing] = useState(0);

  const loadPhotos = useCallback(async (actId: number) => {
    const { data } = await supabase.from("place_photos").select("*").eq("activity_id", actId).eq("status", "approved").order("created_at", { ascending: false });
    setPhotos(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setThing(0);
      try {
        const { data } = await supabase.from("activities").select("*").eq("slug", slug).eq("status", "approved").maybeSingle();
        setA(data ?? null);
        if (data) {
          loadPhotos(data.id);
          const cols = "id, name, slug, activity_type, municipality, image_url";
          const nb: any[] = [];
          const seen = new Set<number>([data.id]);
          const add = (rows: any[] | null) => { (rows || []).forEach((x) => { if (!seen.has(x.id) && nb.length < 8) { nb.push(x); seen.add(x.id); } }); };
          if (data.municipality) { const { data: m } = await supabase.from("activities").select(cols).eq("status", "approved").eq("municipality", data.municipality).neq("id", data.id).limit(8); add(m); }
          if (nb.length < 8 && data.region) { const { data: r } = await supabase.from("activities").select(cols).eq("status", "approved").eq("region", data.region).limit(10); add(r); }
          if (nb.length < 8) { const { data: f } = await supabase.from("activities").select(cols).eq("status", "approved").order("featured", { ascending: false }).limit(12); add(f); }
          setNearby(nb);
          // Guided experiences you can book at (or near) this place
          const expCols = "id, title, slug, activity_type, price, price_unit, duration_minutes, images, municipality, provider";
          const expRows: any[] = [];
          const { data: e1 } = await supabase.from("services").select(expCols).eq("status", "active").eq("activity_id", data.id).limit(6);
          (e1 || []).forEach((x) => expRows.push(x));
          if (expRows.length < 6 && data.municipality) {
            const { data: e2 } = await supabase.from("services").select(expCols).eq("status", "active").eq("municipality", data.municipality).limit(6);
            (e2 || []).forEach((x) => { if (!expRows.find((y) => y.id === x.id) && expRows.length < 6) expRows.push(x); });
          }
          setExperiences(expRows);
        }
      } catch { setA(null); } finally { setLoading(false); }
    })();
  }, [slug, loadPhotos]);

  const onUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file || !a) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { openAuthModal?.(); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `place-photos/${a.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("business-media").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("business-media").getPublicUrl(path).data.publicUrl;
      const { error: insErr } = await supabase.from("place_photos").insert({ activity_id: a.id, user_id: user.id, image_url: url });
      if (insErr) throw insErr;
      toast({ title: "Photo added — thanks for sharing! 📸" });
      loadPhotos(a.id);
    } catch (err: any) { toast({ title: "Upload failed", description: err?.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const doShare = async () => {
    const url = window.location.href;
    if ((navigator as any).share) { try { await (navigator as any).share({ title: a?.name, text: `Check out ${a?.name} on Spotlight Puerto Rico`, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); setCopied(true); toast({ title: "Link copied!" }); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!a) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4"><h2 className="text-2xl font-bold">Spot not found</h2><Link href="/activities"><Button>Back to Places</Button></Link></div>;

  const [grad, emoji] = vis(a.activity_type);
  const q = [a.name, a.municipality, "Puerto Rico"].filter(Boolean).join(", ");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const gallery = [a.image_url, ...photos.map((p) => p.image_url)].filter(Boolean);
  const todo = thingsToDo(a.activity_type);
  const active = todo[thing] || todo[0];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className={`relative h-72 md:h-96 bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden`}>
        {a.image_url ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" /> : <span className="text-7xl drop-shadow-lg">{emoji}</span>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute top-4 left-4"><Link href="/activities"><Button variant="outline" size="sm" className="bg-white/90 gap-1"><ArrowLeft className="w-4 h-4" /> Places</Button></Link></div>
        <div className="absolute top-4 right-4"><Button variant="outline" size="sm" className="bg-white/90 gap-1" onClick={doShare}><Share2 className="w-4 h-4" /> Share</Button></div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 max-w-4xl pb-5 text-white">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold capitalize bg-black/40 backdrop-blur px-2.5 py-1 rounded-full">{a.activity_type}</span>
              {a.provider && <span className="text-[11px] font-bold bg-teal-600 px-2.5 py-1 rounded-full">✦ {a.provider}</span>}
              {a.featured && <span className="text-[11px] font-bold bg-white/90 text-amber-600 px-2.5 py-1 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> Featured</span>}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white drop-shadow-lg">{a.name}</h1>
            <p className="text-white/90 text-sm md:text-base flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {a.municipality}{a.region ? ` · ${a.region}` : ""}</p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-b border-border bg-white/95 backdrop-blur sticky top-16 z-20">
        <div className="container mx-auto px-4 max-w-4xl py-3 flex flex-wrap items-center gap-2">
          <a href={gmaps(q)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"><Navigation className="w-4 h-4" /> Google Maps</a>
          <a href={amaps(q)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-muted"><MapPin className="w-4 h-4 text-primary" /> Apple Maps</a>
          <button onClick={doShare} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-muted"><Share2 className="w-4 h-4 text-primary" /> {copied ? "Copied!" : "Share"}</button>
          <SavePremiumButton name={a.name} img={a.image_url} kind="place" label="Save" className="!px-4 !py-2 !h-auto rounded-xl text-sm" />
          <div className="hidden sm:flex items-center gap-1.5 ml-auto">
            <a href={`https://wa.me/?text=${encodeURIComponent(a.name + " — " + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-bold hover:opacity-90" title="Share on WhatsApp">WA</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold hover:opacity-90" title="Share on Facebook">f</a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(a.name)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold hover:opacity-90" title="Share on X">X</a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Facts */}
        <div className="flex flex-wrap gap-2">
          {a.difficulty && <span className="text-xs font-medium capitalize px-3 py-1 rounded-full bg-muted flex items-center gap-1"><Signal className="w-3.5 h-3.5" /> {a.difficulty}</span>}
          {a.best_season && <span className="text-xs font-medium px-3 py-1 rounded-full bg-muted flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {a.best_season}</span>}
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${a.is_free ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{a.is_free ? "Free to visit" : "Paid / Tour"}</span>
        </div>

        {a.description && <div className="bg-white rounded-2xl border border-border p-5 shadow-sm"><p className="text-base md:text-lg leading-relaxed">{a.description}</p></div>}
        {a.wave_summary && <p className="text-cyan-700 font-medium flex items-center gap-2"><Waves className="w-4 h-4" /> {a.wave_summary}</p>}
        {a.highlights && (
          <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 flex gap-3">
            <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <div><p className="font-semibold text-sm text-teal-900 mb-0.5">Good to know</p><p className="text-sm text-teal-800">{a.highlights}</p></div>
          </div>
        )}

        {/* Gallery */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-primary" /> Photos {photos.length > 0 && <span className="text-sm font-normal text-muted-foreground">({gallery.length})</span>}</h2>
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Add your photo
            </label>
          </div>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gallery.map((src, i) => (
                <button key={i} onClick={() => setLightbox(src)} className="aspect-square rounded-xl overflow-hidden bg-muted group">
                  <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No photos yet — be the first to share one from your visit!</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">📸 Been here? {isAuthenticated ? "Tap “Add your photo” to share it." : "Sign in to add your photos and help other travelers."}</p>
        </div>

        {/* Things to do here */}
        <div>
          <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2"><Compass className="w-5 h-5 text-primary" /> Things to do here</h2>
          <p className="text-sm text-muted-foreground mb-4">Tap an idea to learn more about enjoying {a.name}.</p>
          <div className="flex flex-wrap gap-2">
            {todo.map((it, i) => (
              <button
                key={i}
                onClick={() => setThing(i)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${i === thing ? "bg-primary text-white border-primary shadow-sm" : "bg-muted/70 border-border/50 hover:bg-muted"}`}
              >
                <span className="text-base leading-none">{it.icon}</span>{it.label}
              </button>
            ))}
          </div>
          {active && (
            <div className="mt-3 rounded-2xl bg-teal-50 border border-teal-100 p-4 flex gap-3">
              <span className="text-2xl leading-none shrink-0">{active.icon}</span>
              <div>
                <p className="font-semibold text-sm text-teal-900">{active.label}</p>
                <p className="text-sm text-teal-800 mt-0.5 leading-relaxed">{active.desc}</p>
              </div>
            </div>
          )}

          {/* Book a guided tour with a local guide */}
          {experiences.length > 0 && (
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-4">
              <p className="text-sm font-bold flex items-center gap-1.5 text-emerald-900"><Users className="w-4 h-4 text-emerald-600" /> Book a guided tour here</p>
              <p className="text-xs text-muted-foreground mb-3">Local guides offering experiences at or near {a.municipality || "this spot"}.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {experiences.map((ex) => <ExperienceCard key={ex.id} ex={ex} />)}
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Location & directions</h2>
          <MapEmbed query={q} lat={a.latitude} lon={a.longitude} title={a.name} />
          <div className="flex flex-wrap gap-2 mt-3">
            <a href={gmaps(q)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-muted"><Navigation className="w-4 h-4 text-primary" /> Directions in Google Maps</a>
            <a href={amaps(q)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-muted"><MapPin className="w-4 h-4 text-primary" /> Directions in Apple Maps</a>
          </div>
        </div>

        {a.activity_type === "surfing" && (
          <Link href="/surf"><Button variant="outline" className="w-full">🏄 Check live surf cams for this area</Button></Link>
        )}

        {/* Nearby */}
        {nearby.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Nearby places to explore</h2>
            <p className="text-sm text-muted-foreground mb-4">More places to explore {a.municipality ? "around " + a.municipality : "on the island"}.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {nearby.map((p) => <NearbyCard key={p.id} p={p} />)}
            </div>
          </div>
        )}

        {/* Guided experiences CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-teal-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-display font-bold">Want a guided experience here? 🧭</p>
            <p className="text-sm text-muted-foreground">Book a local guide for tours, snorkeling, and more.</p>
          </div>
          <Link href="/experiences"><Button className="shrink-0">Browse experiences</Button></Link>
        </div>
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
