import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { MapPin, Clock, Users, Loader2, Compass, ShieldCheck, X, CalendarCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SavePremiumButton } from "@/components/SavePremiumButton";
import { WEEEPAAA_GUIDE, WEEEPAAA_SERVICE } from "@/lib/curatedExperiences";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Service = {
  id: number; guide_id: string; title: string; activity_type: string | null; description: string | null;
  price: number | null; price_unit: string; duration_minutes: number | null; max_group_size: number | null;
  municipality: string | null; meeting_point: string | null;
  guide?: { display_name: string | null; is_verified: boolean } | null;
};

const TYPE_EMOJI: Record<string, string> = { snorkeling: "🤿", surfing: "🏄", hiking: "🥾", cave: "🕳️", waterfall: "💧", bioluminescent: "✨", diving: "🐠", zipline: "🪂", scenic: "🌅", beach: "🏖️" };

export function BookingModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [party, setParty] = useState("2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!date) { toast({ title: "Pick a date", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Please sign in to request a booking", variant: "destructive" }); setSubmitting(false); return; }
      const { error } = await supabase.from("bookings").insert({
        service_id: service.id > 0 ? service.id : null, guide_id: service.guide_id, customer_id: user.id,
        customer_name: name.trim() || null, customer_email: email.trim() || user.email || null, customer_phone: phone.trim() || null,
        requested_date: date, party_size: Number(party) || 1, message: service.id > 0 ? (message.trim() || null) : `[Curated experience: ${service.title}] ${message.trim() || "Please contact me with availability."}`,
        amount: service.price != null ? (service.price_unit === "per_person" ? service.price * (Number(party) || 1) : service.price) : null,
        status: "requested",
      });
      if (error) throw error;
      setDone(true);
    } catch (e: any) {
      toast({ title: "Couldn't send request", description: e?.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <CalendarCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold mb-1">Request sent! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-5">The guide will confirm your date and send payment details. You'll be notified by email.</p>
              <Button onClick={onClose} className="w-full">Done</Button>
            </div>
          ) : (
            <>
              <h3 className="font-display text-lg font-bold">Request to book</h3>
              <p className="text-sm text-muted-foreground mb-4">{service.title}</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                  <div className="space-y-1"><Label>People</Label><Input type="number" min={1} value={party} onChange={(e) => setParty(e.target.value)} /></div>
                </div>
                <div className="space-y-1"><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana García" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(787) …" /></div>
                </div>
                <div className="space-y-1"><Label>Message <span className="text-muted-foreground font-normal">(optional)</span></Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything the guide should know?" className="min-h-[70px]" /></div>
                {service.price != null && (() => {
                  const sub = service.price_unit === "per_person" ? service.price * (Number(party) || 1) : service.price;
                  const fee = Math.round(sub * 0.03 * 100) / 100;
                  return (
                    <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 space-y-0.5">
                      <div className="flex justify-between"><span>Subtotal</span><span className="text-foreground">${sub.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Service fee (3%)</span><span className="text-foreground">${fee.toFixed(2)}</span></div>
                      <div className="flex justify-between font-semibold text-foreground border-t pt-1 mt-1"><span>Total</span><span>${(sub + fee).toFixed(2)}</span></div>
                    </div>
                  );
                })()}
                <Button onClick={submit} disabled={submitting} className="w-full gap-2">{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : "Send booking request"}</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Experiences() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Service[]>([]);
  const [booking, setBooking] = useState<Service | null>(null);
  const [category, setCategory] = useState("all");
  const [, setLocation] = useLocation();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: svcs } = await supabase.from("services").select("*").eq("status", "active").order("created_at", { ascending: false });
        const list = [WEEEPAAA_SERVICE as any, ...((svcs as Service[]) ?? []).filter((s: any) => s.slug !== WEEEPAAA_SERVICE.slug)];
        const ids = [...new Set(list.map((s) => s.guide_id))];
        if (ids.length) {
          const { data: profs } = await supabase.from("guide_profiles").select("user_id, display_name, is_verified").in("user_id", ids);
          const pmap = Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p]));
          list.forEach((s) => { s.guide = pmap[s.guide_id] ?? null; });
        }
        const curated = list.find((s: any) => s.slug === WEEEPAAA_SERVICE.slug);
        if (curated) curated.guide = WEEEPAAA_GUIDE as any;
        setItems(list);
      } catch { setItems([]); } finally { setLoading(false); }
    })();
  }, []);

  const openBooking = (s: Service) => {
    if (!isAuthenticated) { openAuthModal?.(); return; }
    setBooking(s);
  };

  const categories = Array.from(new Set(items.map((item) => item.activity_type || "Other"))).sort();
  const visibleItems = category === "all" ? items : items.filter((item) => (item.activity_type || "Other") === category);

  return (
    <div className="min-h-screen">
      <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 40%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <p className="text-white/80 text-sm font-medium mb-2">🧭 Guided by locals</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Book an Experience</h1>
          <p className="text-white/85 max-w-xl">Snorkel trips, waterfall hikes, cave tours and more — led by verified local guides across Puerto Rico.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!loading && items.length > 0 && (
          <section className="mb-7">
            <div className="flex items-end justify-between gap-4 mb-3"><div><h2 className="font-display text-xl font-bold">Choose your adventure</h2><p className="text-sm text-muted-foreground">Jump straight to the kind of experience you want.</p></div><span className="text-xs text-muted-foreground shrink-0">{visibleItems.length} available</span></div>
            <div className="flex gap-3 overflow-x-auto pb-3 snap-x scrollbar-none">
              <button onClick={() => setCategory("all")} className={`snap-start shrink-0 min-w-[132px] rounded-2xl border p-4 text-left transition-all ${category === "all" ? "bg-primary text-white border-primary shadow-md" : "bg-card hover:border-primary"}`}><Compass className="w-6 h-6 mb-4" /><span className="block font-bold">All experiences</span><span className={`text-xs ${category === "all" ? "text-white/75" : "text-muted-foreground"}`}>{items.length} ways to explore</span></button>
              {categories.map((name) => <button key={name} onClick={() => setCategory(name)} className={`snap-start shrink-0 min-w-[132px] rounded-2xl border p-4 text-left transition-all capitalize ${category === name ? "bg-primary text-white border-primary shadow-md" : "bg-card hover:border-primary"}`}><span className="text-2xl block mb-3">{TYPE_EMOJI[name] || "🧭"}</span><span className="block font-bold">{name}</span><span className={`text-xs flex items-center gap-1 ${category === name ? "text-white/75" : "text-muted-foreground"}`}>{items.filter((item) => (item.activity_type || "Other") === name).length} options <ArrowRight className="w-3 h-3" /></span></button>)}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{[{ id: "all", label: "Everything" }, ...categories.map((name) => ({ id: name, label: name }))].map((option) => <button key={option.id} onClick={() => setCategory(option.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border capitalize ${category === option.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-border"}`}>{option.label}</button>)}</div>
          </section>
        )}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Compass className="w-12 h-12 text-primary/40 mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold mb-1">No experiences listed yet</h2>
            <p className="text-muted-foreground mb-5">Be the first local guide to offer tours on Spotlight.</p>
            <Link href="/guide"><Button>Become a guide</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map((s) => (
              <div key={s.id} onClick={() => setLocation(`/experiences/${(s as any).slug || s.id}`)} className="rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer">
                <div className="h-32 bg-muted overflow-hidden">{(s as any).images && (s as any).images[0] ? <img src={(s as any).images[0]} alt={s.title} className="w-full h-full object-cover" /> : <img src="https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/18.jpg" alt={s.title} className="w-full h-full object-cover" />}</div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display font-bold leading-tight">{s.title}</h3>
                  {(s as any).provider && <span className="inline-flex w-fit mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white">✦ {(s as any).provider}</span>}
                  {s.guide?.display_name && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      by {s.guide.display_name}{s.guide.is_verified && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                    </p>
                  )}
                  {s.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-3">
                    {s.municipality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.municipality}</span>}
                    {s.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</span>}
                    {s.max_group_size && <span className="flex items-center gap-1"><Users className="w-3 h-3" />up to {s.max_group_size}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="font-bold text-foreground">{s.price != null ? `$${s.price}` : "Inquire"}<span className="text-xs font-normal text-muted-foreground">{s.price != null ? `/${s.price_unit === "per_group" ? "group" : "person"}` : ""}</span></span>
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); openBooking(s); }}>Request booking</Button>
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}><SavePremiumButton name={s.title} img={(s as any).images?.[0]} kind="experience" hrefOverride={`/experiences/${(s as any).slug || s.id}`} className="w-full" /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {booking && <BookingModal service={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}
