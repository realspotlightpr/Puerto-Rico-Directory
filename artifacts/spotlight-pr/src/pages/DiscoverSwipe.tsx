import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Heart, X, Loader2, MapPin, Bookmark, Navigation, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Card = { key: string; kind: string; name: string; sub: string; img: string | null; href: string };

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
  const startX = useRef(0);
  const dragging = useRef(false);

  useEffect(() => { setSaved(loadSaved()); }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: biz }, { data: svcs }, { data: acts }] = await Promise.all([
          supabase.from("businesses").select("id, name, slug, municipality, cover_url, categories(name)").eq("status", "approved").not("cover_url", "is", null).limit(25),
          supabase.from("services").select("id, title, slug, municipality, images, provider").eq("status", "active").limit(15),
          supabase.from("activities").select("id, name, slug, activity_type, municipality, image_url").eq("status", "approved").not("image_url", "is", null).limit(25),
        ]);
        const cards: Card[] = [];
        (biz || []).forEach((b: any) => cards.push({ key: `b${b.id}`, kind: (b.categories?.name || "Local business"), name: b.name, sub: b.municipality || "Puerto Rico", img: b.cover_url, href: `/businesses/${b.slug || b.id}` }));
        (svcs || []).forEach((s: any) => cards.push({ key: `s${s.id}`, kind: "Experience", name: s.title, sub: s.provider || s.municipality || "Puerto Rico", img: Array.isArray(s.images) ? s.images[0] : null, href: `/experiences/${s.slug || s.id}` }));
        (acts || []).forEach((a: any) => cards.push({ key: `a${a.id}`, kind: a.activity_type || "Place", name: a.name, sub: a.municipality || "Puerto Rico", img: a.image_url, href: `/activities/${a.slug}` }));
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

  const onDown = (e: React.PointerEvent) => { dragging.current = true; startX.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (dragging.current) setDragX(e.clientX - startX.current); };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > 110) onLike();
    else if (dragX < -110) onSkip();
    else setDragX(0);
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
          </>
        )}
      </div>
    </div>
  );
}
