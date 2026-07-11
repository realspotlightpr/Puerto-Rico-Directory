import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Heart, X, Loader2, MapPin, Bookmark, Navigation, RotateCcw, Sparkles, Star, Utensils, Info, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Card = {
  key: string;
  source: "business" | "experience" | "place";
  id: number;
  kind: string;
  name: string;
  sub: string;
  img: string | null;
  href: string;
  description?: string | null;
  rating?: number;
  reviewCount?: number;
};

type Glimpse = {
  eyebrow: string;
  title: string;
  body: string;
  image?: string | null;
  icon: typeof Info;
  rating?: number;
};

const FALLBACK = "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/18.jpg";
const SAVE_KEY = "sp_saved_swipes";

function loadSaved(): Card[] { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "[]"); } catch { return []; } }
function persistSaved(list: Card[]) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(list)); } catch { /* ignore */ } }

export default function DiscoverSwipe() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [liked, setLiked] = useState<Card | null>(null);
  const [saved, setSaved] = useState<Card[]>([]);
  const [preview, setPreview] = useState<Card | null>(null);
  const [glimpses, setGlimpses] = useState<Glimpse[]>([]);
  const [glimpseIndex, setGlimpseIndex] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);

  useEffect(() => { setSaved(loadSaved()); }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: biz }, { data: svcs }, { data: acts }] = await Promise.all([
          supabase.from("businesses").select("id, name, slug, municipality, cover_url, description, average_rating, review_count, categories(name)").eq("status", "approved").not("cover_url", "is", null).limit(25),
          supabase.from("services").select("id, title, slug, municipality, images, provider").eq("status", "active").limit(15),
          supabase.from("activities").select("id, name, slug, activity_type, municipality, image_url").eq("status", "approved").not("image_url", "is", null).limit(25),
        ]);
        const cards: Card[] = [];
        (biz || []).forEach((b: any) => cards.push({ key: `b${b.id}`, source: "business", id: b.id, kind: (b.categories?.name || "Local business"), name: b.name, sub: b.municipality || "Puerto Rico", img: b.cover_url, href: `/businesses/${b.slug || b.id}`, description: b.description, rating: Number(b.average_rating || 0), reviewCount: Number(b.review_count || 0) }));
        (svcs || []).forEach((s: any) => cards.push({ key: `s${s.id}`, source: "experience", id: s.id, kind: "Experience", name: s.title, sub: s.provider || s.municipality || "Puerto Rico", img: Array.isArray(s.images) ? s.images[0] : null, href: `/experiences/${s.slug || s.id}` }));
        (acts || []).forEach((a: any) => cards.push({ key: `a${a.id}`, source: "place", id: a.id, kind: a.activity_type || "Place", name: a.name, sub: a.municipality || "Puerto Rico", img: a.image_url, href: `/activities/${a.slug}` }));
        for (let j = cards.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [cards[j], cards[k]] = [cards[k], cards[j]]; }
        setDeck(cards);
      } catch { setDeck([]); } finally { setLoading(false); }
    })();
  }, []);

  const card = deck[i];
  const advance = () => { setDragX(0); setLiked(null); setI((x) => x + 1); };
  const onSkip = () => { setDragX(-(typeof window !== "undefined" ? window.innerWidth : 500)); window.setTimeout(() => advance(), 420); };
  const onLike = () => { if (card) setLiked(card); };
  const saveForLater = () => {
    if (!liked) return;
    const next = [liked, ...saved.filter((s) => s.key !== liked.key)];
    setSaved(next); persistSaved(next);
    toast({ title: "Saved for later 🔖" });
    advance();
  };
  const visitNow = () => { if (liked) setLocation(liked.href); };

  const cleanText = (value?: string | null) => (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const openPreview = async (item: Card) => {
    setPreview(item);
    setGlimpseIndex(0);
    setPreviewLoading(item.source === "business");

    const base: Glimpse[] = [{
      eyebrow: "At a glance",
      title: item.name,
      body: cleanText(item.description) || `${item.kind} in ${item.sub}. Tap again to discover another detail.`,
      image: item.img,
      icon: Info,
      rating: item.rating,
    }];
    setGlimpses(base);

    if (item.source !== "business") {
      setGlimpses([
        ...base,
        { eyebrow: "Picture yourself here", title: `Explore ${item.name}`, body: `A local ${item.kind.toLowerCase()} worth adding to your Puerto Rico plans.`, image: item.img, icon: Sparkles },
        { eyebrow: "Where you'll find it", title: item.sub, body: "Save it now or open the full page when you're ready for directions and details.", icon: MapPin },
      ]);
      return;
    }

    try {
      const [{ data: reviews }, { data: menu }, { data: media }] = await Promise.all([
        supabase.from("reviews").select("rating, title, body, author_name").eq("business_id", item.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("menu_items").select("title, description, price, image_url").eq("business_id", item.id).order("sort_order", { ascending: true }).limit(1),
        supabase.from("media_items").select("url").eq("business_id", item.id).order("created_at", { ascending: false }).limit(1),
      ]);
      const review = reviews?.[0] as any;
      const menuItem = menu?.[0] as any;
      const mediaItem = media?.[0] as any;
      const next = [...base];
      next.push(review ? {
        eyebrow: "What people say",
        title: review.title || `${review.rating}-star review`,
        body: review.body || `Rated ${review.rating} out of 5 by a Spotlight visitor.`,
        icon: Star,
        rating: Number(review.rating || 0),
      } : {
        eyebrow: "Community rating",
        title: item.reviewCount ? `${item.rating?.toFixed(1)} from ${item.reviewCount} reviews` : "Be the first to review",
        body: item.reviewCount ? "Locals and visitors are sharing what makes this spot special." : "Discover it now, then come back and tell the community what you loved.",
        icon: Star,
        rating: item.rating,
      });
      next.push(menuItem ? {
        eyebrow: "A taste of the menu",
        title: menuItem.title,
        body: [menuItem.description, menuItem.price].filter(Boolean).join(" · ") || "One of the featured items waiting for you.",
        image: menuItem.image_url || mediaItem?.url || item.img,
        icon: Utensils,
      } : {
        eyebrow: "Another look",
        title: `Inside ${item.name}`,
        body: `Get a feel for this ${item.kind.toLowerCase()} before opening the full listing.`,
        image: mediaItem?.url || item.img,
        icon: Sparkles,
      });
      setGlimpses(next);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => { setPreview(null); setGlimpses([]); setGlimpseIndex(0); };
  const nextGlimpse = () => {
    if (previewLoading || glimpses.length < 2) return;
    setGlimpseIndex((current) => (current + 1) % glimpses.length);
  };

  const onDown = (e: React.PointerEvent) => { dragging.current = true; moved.current = false; startX.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (dragging.current) { const distance = e.clientX - startX.current; if (Math.abs(distance) > 8) moved.current = true; setDragX(distance); } };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > 110) onLike();
    else if (dragX < -110) onSkip();
    else { setDragX(0); if (!moved.current && card) void openPreview(card); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-emerald-50/30">
      <div className="container mx-auto px-4 py-4 pb-24 md:pb-6 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Discover</h1>
            <p className="text-sm text-muted-foreground">Swipe right on what you love.</p>
          </div>
          {saved.length > 0 && <span className="text-xs font-semibold bg-white border border-border rounded-full px-3 py-1.5 flex items-center gap-1"><Bookmark className="w-3.5 h-3.5 text-primary" /> {saved.length} saved</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !card ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-border shadow-sm">
            <Heart className="w-12 h-12 text-primary/40 mx-auto mb-3" />
            <p className="font-display font-bold text-lg mb-1">That's everything for now!</p>
            <p className="text-sm text-muted-foreground mb-5">{saved.length > 0 ? `You saved ${saved.length}.` : "Come back for more spots soon."}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => { setI(0); setDeck((d) => [...d].sort(() => Math.random() - 0.5)); }} className="gap-2"><RotateCcw className="w-4 h-4" /> Start over</Button>
              <Link href="/directory"><Button>Browse all</Button></Link>
            </div>
          </div>
        ) : (
          <>
            <div className="relative h-[calc(100dvh-19rem)] max-h-[540px] min-h-[330px] select-none">
              {deck[i + 1] && (
                <div className="absolute inset-0 rounded-3xl overflow-hidden border border-border bg-muted shadow-sm scale-[0.96] translate-y-2">
                  <img src={deck[i + 1].img || FALLBACK} alt="" className="w-full h-full object-cover opacity-90" />
                </div>
              )}
              <div
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                className="absolute inset-0 rounded-3xl overflow-hidden border border-border bg-muted shadow-xl cursor-grab active:cursor-grabbing touch-none"
                style={{ transform: `translateX(${dragX}px) rotate(${dragX / 22}deg)`, transition: dragging.current ? "none" : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                <img src={card.img || FALLBACK} alt={card.name} className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {dragX > 40 && <span className="absolute top-6 left-6 text-emerald-400 border-4 border-emerald-400 rounded-xl px-3 py-1 font-bold text-2xl rotate-[-15deg]">LIKE</span>}
                {dragX < -40 && <span className="absolute top-6 right-6 text-red-400 border-4 border-red-400 rounded-xl px-3 py-1 font-bold text-2xl rotate-[15deg]">NOPE</span>}
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white pointer-events-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                  <span className="text-[11px] font-bold uppercase tracking-wide bg-white/20 backdrop-blur px-2 py-0.5 rounded-full capitalize">{card.kind}</span>
                  <h2 className="font-display text-2xl font-bold mt-2 leading-tight text-white drop-shadow-lg">{card.name}</h2>
                  <p className="text-white/85 text-sm flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {card.sub}</p>
                  <p className="mt-3 text-xs font-semibold text-white/90 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Tap for a quick look</p>
                </div>
              </div>

              {liked && (
                <div className="absolute inset-0 rounded-3xl bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-white">
                  <Heart className="w-10 h-10 text-rose-400 fill-rose-400" />
                  <p className="font-display font-bold text-lg text-center">Nice pick — {liked.name}</p>
                  <Button onClick={visitNow} className="w-full max-w-xs gap-2" size="lg"><Navigation className="w-4 h-4" /> Visit now</Button>
                  <Button onClick={saveForLater} variant="outline" className="w-full max-w-xs gap-2 bg-white/10 border-white/40 text-white hover:bg-white/20" size="lg"><Bookmark className="w-4 h-4" /> Save for later</Button>
                </div>
              )}
            </div>

            {!liked && (
              <div className="flex items-center justify-center gap-5 mt-4">
                <button onClick={() => { if (i > 0) { setI(i - 1); setDragX(0); setLiked(null); } }} disabled={i === 0} title="Undo last swipe" className="w-12 h-12 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-amber-500 hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100"><RotateCcw className="w-6 h-6" /></button>
                <button onClick={onSkip} className="w-14 h-14 rounded-full bg-white border border-border shadow-md flex items-center justify-center text-red-500 hover:scale-105 transition-transform"><X className="w-7 h-7" /></button>
                <button onClick={onLike} className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-primary shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform"><Heart className="w-8 h-8 fill-white" /></button>
              </div>
            )}

            {preview && glimpses[glimpseIndex] && (() => {
              const glimpse = glimpses[glimpseIndex];
              const GlimpseIcon = glimpse.icon;
              return (
                <div className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={nextGlimpse}>
                  <div className="relative w-full max-w-md min-h-[68dvh] sm:min-h-0 sm:h-[620px] max-h-[88dvh] overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-slate-900 text-white shadow-2xl border border-white/15" onClick={(e) => { e.stopPropagation(); nextGlimpse(); }}>
                    {glimpse.image && <img src={glimpse.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />
                    <button type="button" onClick={(e) => { e.stopPropagation(); closePreview(); }} className="absolute right-4 top-4 z-20 w-10 h-10 rounded-full bg-black/35 border border-white/25 backdrop-blur flex items-center justify-center hover:bg-black/55" aria-label="Close preview"><X className="w-5 h-5" /></button>

                    <div className="relative z-10 h-full min-h-[68dvh] sm:min-h-0 flex flex-col justify-end p-6 pb-7">
                      <div className="flex gap-1.5 mb-auto pt-2 pr-14">
                        {glimpses.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === glimpseIndex ? "w-8 bg-secondary" : "w-4 bg-white/35"}`} />)}
                      </div>
                      <div className="mt-16">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary"><GlimpseIcon className="w-4 h-4" /> {glimpse.eyebrow}</span>
                        <h2 className="font-display text-3xl leading-tight font-bold text-white mt-2">{glimpse.title}</h2>
                        {!!glimpse.rating && <div className="flex gap-1 mt-3">{[1,2,3,4,5].map((n) => <Star key={n} className={`w-5 h-5 ${n <= Math.round(glimpse.rating || 0) ? "fill-amber-400 text-amber-400" : "text-white/25"}`} />)}</div>}
                        <p className="text-white/80 leading-relaxed mt-3 line-clamp-5">{glimpse.body}</p>
                        {previewLoading ? (
                          <div className="flex items-center gap-2 text-sm text-white/65 mt-6"><Loader2 className="w-4 h-4 animate-spin" /> Gathering another glimpse…</div>
                        ) : (
                          <p className="flex items-center gap-1 text-sm font-semibold text-secondary mt-6">Tap anywhere for the next glimpse <ChevronRight className="w-4 h-4" /></p>
                        )}
                        <div className="grid grid-cols-2 gap-3 mt-5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={closePreview}>Back to swiping</Button>
                          <Button onClick={() => setLocation(preview.href)} className="gap-2">Full listing <ExternalLink className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
