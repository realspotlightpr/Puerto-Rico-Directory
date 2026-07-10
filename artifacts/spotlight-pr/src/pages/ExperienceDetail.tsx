import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Clock, Users, ShieldCheck, Share2, Phone, Instagram, Facebook, Globe,
  ArrowLeft, Loader2, Check, Star, Languages, Sparkles, X, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapEmbed } from "@/pages/ActivityDetail";
import { BookingModal } from "@/pages/Experiences";

const FALLBACK = "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/18.jpg";

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X className="w-7 h-7" /></button>
      <img src={src} alt="" className="max-w-full max-h-full rounded-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

export default function ExperienceDetail() {
  const { slug } = useParams();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [s, setS] = useState<any | null>(null);
  const [guide, setGuide] = useState<any | null>(null);
  const [booking, setBooking] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const isNumeric = /^\d+$/.test(String(slug));
        let q = supabase.from("services").select("*").eq("status", "active");
        q = isNumeric ? q.eq("id", Number(slug)) : q.eq("slug", slug);
        const { data } = await q.maybeSingle();
        setS(data ?? null);
        if (data?.guide_id) {
          const { data: g } = await supabase.from("guide_profiles").select("*").eq("user_id", data.guide_id).maybeSingle();
          setGuide(g ?? null);
        }
      } catch { setS(null); } finally { setLoading(false); }
    })();
  }, [slug]);

  const openBook = () => { if (!isAuthenticated) { openAuthModal?.(); return; } setBooking(true); };
  const doShare = async () => {
    const url = window.location.href;
    if ((navigator as any).share) { try { await (navigator as any).share({ title: s?.title, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); toast({ title: "Link copied!" }); } catch { /* ignore */ }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!s) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4"><h2 className="text-2xl font-bold">Experience not found</h2><Link href="/experiences"><Button>Browse experiences</Button></Link></div>;

  const images: string[] = (Array.isArray(s.images) && s.images.length ? s.images : [FALLBACK]);
  const price = s.price != null ? `$${s.price}` : "Inquire";
  const unit = s.price != null ? `/${s.price_unit === "per_group" ? "group" : "person"}` : "";
  const hours = s.duration_minutes ? `${Math.round(s.duration_minutes / 60 * 10) / 10}h` : null;
  const social = (guide?.social_links || {}) as Record<string, string>;
  const q = [s.title, s.municipality, "Puerto Rico"].filter(Boolean).join(", ");
  const guideName = guide?.display_name || s.provider || "Local guide";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative h-64 md:h-96 bg-muted overflow-hidden">
        <img src={images[0]} alt={s.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="absolute top-4 left-4"><Link href="/experiences"><Button variant="outline" size="sm" className="bg-white/90 gap-1"><ArrowLeft className="w-4 h-4" /> Experiences</Button></Link></div>
        <div className="absolute top-4 right-4"><Button variant="outline" size="sm" className="bg-white/90 gap-1" onClick={doShare}><Share2 className="w-4 h-4" /> Share</Button></div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 max-w-4xl pb-5 text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {s.provider && <span className="text-[11px] font-bold bg-teal-600 px-2.5 py-1 rounded-full">✦ {s.provider}</span>}
              {s.activity_type && <span className="text-xs font-semibold capitalize bg-black/40 backdrop-blur px-2.5 py-1 rounded-full">{s.activity_type}</span>}
              {guide?.is_verified && <span className="text-[11px] font-bold bg-emerald-500 px-2.5 py-1 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified guide</span>}
            </div>
            <h1 className="font-display text-2xl md:text-4xl font-bold text-white drop-shadow-lg">{s.title}</h1>
            <p className="text-white text-sm mt-1 flex items-center gap-1 font-medium"><MapPin className="w-4 h-4" /> {s.municipality || "Puerto Rico"} · with {guideName}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl grid lg:grid-cols-3 gap-8 items-start">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick facts */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary flex items-center gap-1.5">{price}<span className="font-normal text-xs">{unit}</span></span>
            {hours && <span className="text-sm px-3 py-1.5 rounded-xl bg-muted flex items-center gap-1.5"><Clock className="w-4 h-4" /> {hours}</span>}
            {s.max_group_size && <span className="text-sm px-3 py-1.5 rounded-xl bg-muted flex items-center gap-1.5"><Users className="w-4 h-4" /> Up to {s.max_group_size}</span>}
          </div>

          {/* Gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {images.slice(0, 6).map((src, i) => (
                <button key={i} onClick={() => setLightbox(src)} className="aspect-square rounded-xl overflow-hidden bg-muted group">
                  <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </button>
              ))}
            </div>
          )}

          {/* About */}
          {s.description && (
            <div>
              <h2 className="font-display text-xl font-bold mb-2">About this experience</h2>
              <p className="text-base leading-relaxed whitespace-pre-line text-muted-foreground">{s.description}</p>
            </div>
          )}

          {/* What's included */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3">What to expect</h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {[
                s.duration_minutes ? `About ${hours} of guided time` : "Guided by a local expert",
                s.max_group_size ? `Small group — up to ${s.max_group_size} people` : "Personal, small-group feel",
                "Led by a knowledgeable local guide",
                "Flexible dates — request the day that works for you",
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>{t}</span></div>
              ))}
            </div>
          </div>

          {/* Meeting point / area */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Where you'll meet</h2>
            {s.meeting_point && <p className="text-sm text-muted-foreground mb-3">{s.meeting_point}</p>}
            <MapEmbed query={q} title={s.title} />
          </div>

          {/* Guide */}
          <div>
            <h2 className="font-display text-xl font-bold mb-3">Meet your guide</h2>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-2xl font-bold font-display overflow-hidden shrink-0">
                  {guide?.photo_url ? <img src={guide.photo_url} alt={guideName} className="w-full h-full object-cover" /> : <span>{guideName.charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <Link href={`/profile/${s.guide_id}`}><p className="font-bold font-display text-lg flex items-center gap-1.5 hover:text-primary cursor-pointer">{guideName}{guide?.is_verified && <ShieldCheck className="w-4 h-4 text-emerald-500" />}</p></Link>
                  {guide?.municipality && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {guide.municipality}</p>}
                </div>
              </div>
              {guide?.bio && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{guide.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                {(guide?.specialties || []).map((sp: string) => <span key={sp} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1"><Sparkles className="w-3 h-3" />{sp}</span>)}
                {(guide?.languages || []).length > 0 && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted flex items-center gap-1"><Languages className="w-3 h-3" />{(guide.languages || []).join(", ")}</span>}
              </div>
              {(social.instagram || social.facebook || social.tiktok || social.website || guide?.phone) && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" title="Instagram" className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 transition-colors"><Instagram className="w-4 h-4" /></a>}
                  {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" title="Facebook" className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"><Facebook className="w-4 h-4" /></a>}
                  {social.tiktok && <a href={social.tiktok} target="_blank" rel="noopener noreferrer" title="TikTok" className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors text-xs font-bold">TT</a>}
                  {social.website && <a href={social.website} target="_blank" rel="noopener noreferrer" title="Website" className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"><Globe className="w-4 h-4" /></a>}
                  {guide?.phone && <a href={`https://wa.me/1${String(guide.phone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-colors"><MessageCircle className="w-4 h-4" /></a>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — sticky booking */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 self-start space-y-4">
          <div className="rounded-2xl border border-border bg-card shadow-lg p-5">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold font-display">{price}</span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">You only pay the guide after they confirm your date.</p>
            <Button onClick={openBook} className="w-full gap-2 shadow-lg shadow-primary/20" size="lg">Request to book</Button>
            {guide?.phone && (
              <a href={`tel:${guide.phone}`} className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border font-semibold text-sm hover:bg-muted"><Phone className="w-4 h-4 text-primary" /> Call the guide</a>
            )}
            <div className="mt-4 pt-4 border-t space-y-2">
              {[
                [<ShieldCheck className="w-4 h-4 text-emerald-500" key="v" />, "Verified local guide"],
                [<Star className="w-4 h-4 text-amber-500" key="s" />, "Handpicked Spotlight experience"],
                [<Check className="w-4 h-4 text-primary" key="c" />, "No payment until confirmed"],
              ].map(([icon, label], i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 text-center">
            <p className="text-sm font-semibold text-amber-900">Spotlight Pass members save 5%</p>
            <p className="text-xs text-amber-700 mt-0.5">On this and every experience.</p>
            <Link href="/pass"><Button variant="outline" size="sm" className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100">Get the Pass</Button></Link>
          </div>
        </div>
      </div>

      {booking && <BookingModal service={s} onClose={() => setBooking(false)} />}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
