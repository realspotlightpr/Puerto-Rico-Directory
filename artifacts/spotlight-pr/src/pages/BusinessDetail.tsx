import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Globe, Mail, ShieldCheck, BadgeCheck, Star, Clock, Tag, ExternalLink, Facebook, Instagram, Twitter, Youtube, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DOMPurify from "dompurify";
import { ClaimBusinessModal } from "@/components/business/ClaimBusinessModal";
import { MapEmbed } from "@/pages/ActivityDetail";

// ── Analytics: log listing interactions via the log_listing_event RPC ──────────
// Never let analytics break the page — every call is best-effort.
function analyticsSession(): string {
  try {
    let s = sessionStorage.getItem("sp_sid");
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("sp_sid", s); }
    return s;
  } catch { return "anon"; }
}
async function track(businessId: number, type: "page_view" | "phone_click" | "website_click" | "maps_click" | "share") {
  try {
    let source = "direct";
    try { if (document.referrer) source = new URL(document.referrer).hostname || "direct"; } catch { /* ignore */ }
    await supabase.rpc("log_listing_event", {
      p_business_id: businessId,
      p_type: type,
      p_source: source,
      p_session: analyticsSession(),
    });
  } catch { /* analytics must never throw */ }
}

function mapsUrl(address: string, municipality?: string | null): string {
  const q = [address, municipality || "", "Puerto Rico"].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

type Review = {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  created_at: string;
  users?: { first_name: string | null; last_name: string | null; username: string | null } | null;
};

type NearbyBusiness = {
  id: number;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_url: string | null;
  municipality: string | null;
  average_rating: number | null;
  review_count: number | null;
  categories?: { name: string | null } | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

function HoursBlock({ hours }: { hours: any }) {
  let entries: [string, any][] = [];
  if (Array.isArray(hours)) entries = hours.map((h: any, i: number) => [h?.day ?? String(i), h]);
  else if (hours && typeof hours === "object") entries = Object.entries(hours);
  if (!entries.length) return null;
  const fmt = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (v.closed) return "Closed";
    if (v.open || v.close) return `${v.open ?? ""}${v.open && v.close ? " – " : ""}${v.close ?? ""}`;
    return "";
  };
  return (
    <div className="border-t pt-4">
      <h3 className="flex items-center gap-2 font-semibold mb-2"><Clock className="w-4 h-4" /> Hours</h3>
      <div className="grid gap-1 text-sm">
        {entries.map(([day, v]) => {
          const val = fmt(v);
          if (!val) return null;
          return (
            <div key={day} className="flex justify-between max-w-xs">
              <span className="capitalize text-muted-foreground">{day}</span>
              <span className="font-medium">{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NearbyCard({ b }: { b: NearbyBusiness }) {
  const rating = Number(b.average_rating || 0);
  const count = Number(b.review_count || 0);
  return (
    <Link href={`/businesses/${b.slug || b.id}`}>
      <div className="group h-full bg-card rounded-2xl overflow-hidden border border-border/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30">
        <div className="relative h-32 w-full overflow-hidden bg-muted">
          <img
            src={b.cover_url || `${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt={b.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end gap-2">
            <div className="w-10 h-10 rounded-lg bg-white p-0.5 shadow-lg shrink-0 overflow-hidden">
              <img
                src={b.logo_url || `${import.meta.env.BASE_URL}images/placeholder-logo.png`}
                alt={`${b.name} logo`}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            <div className="text-white pb-0.5 overflow-hidden">
              <h3 className="font-display font-bold text-sm leading-tight truncate">{b.name}</h3>
              <p className="text-white/80 text-xs truncate">{b.categories?.name || "Local Business"}</p>
            </div>
          </div>
        </div>
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
            <MapPin className="w-3 h-3 text-primary" />
            {b.municipality || "Puerto Rico"}
          </div>
          {rating > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({count})</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">New</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ReviewForm({ businessId, onPosted }: { businessId: number; onPosted: () => void }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-center bg-muted/30">
        <p className="text-sm text-muted-foreground mb-3">Share your experience — sign in to leave a review.</p>
        <Button onClick={() => openAuthModal?.()}>Sign in to write a review</Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">
        <p className="font-medium">Thanks for your review!</p>
      </div>
    );
  }

  const submit = async () => {
    if (rating < 1) { toast({ title: "Please pick a star rating", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { openAuthModal?.(); return; }
      let authorName: string | null = null;
      const { data: prof } = await supabase.from("users").select("first_name,last_name,username").eq("id", user.id).maybeSingle();
      if (prof) authorName = [prof.first_name, prof.last_name].filter(Boolean).join(" ") || prof.username || null;
      const { error } = await supabase.from("reviews").insert({
        business_id: businessId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
        author_name: authorName,
        is_spotlight_review: false,
      });
      if (error) throw error;
      setDone(true);
      onPosted();
      toast({ title: "Review posted!" });
    } catch (e: any) {
      toast({ title: "Couldn't post review", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border p-5 space-y-3 bg-card">
      <p className="font-semibold">Write a review</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} className="p-0.5">
            <Star className={`w-7 h-7 transition-colors ${n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
      />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell others about your experience…" className="rounded-lg min-h-[90px]" />
      <Button onClick={submit} disabled={submitting} className="gap-2">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : "Post review"}
      </Button>
    </div>
  );
}

export default function BusinessDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nearby, setNearby] = useState<NearbyBusiness[]>([]);
  const [showClaim, setShowClaim] = useState(false);
  const viewedRef = useRef<number | null>(null);

  const loadNearby = useCallback(async (b: any) => {
    try {
      const cols = "id, name, slug, logo_url, cover_url, municipality, average_rating, review_count, categories(name)";
      const collected: NearbyBusiness[] = [];
      const seen = new Set<number>([b.id]);
      const push = (rows: NearbyBusiness[] | null) => {
        (rows || []).forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); collected.push(r); } });
      };
      if (b.municipality) {
        const { data } = await supabase.from("businesses").select(cols)
          .eq("status", "approved").eq("municipality", b.municipality).neq("id", b.id).limit(8);
        push(data as NearbyBusiness[]);
      }
      if (collected.length < 6 && b.category_id) {
        const { data } = await supabase.from("businesses").select(cols)
          .eq("status", "approved").eq("category_id", b.category_id).neq("id", b.id).limit(8);
        push(data as NearbyBusiness[]);
      }
      if (collected.length < 3) {
        const { data } = await supabase.from("businesses").select(cols)
          .eq("status", "approved").neq("id", b.id).limit(8);
        push(data as NearbyBusiness[]);
      }
      setNearby(collected.slice(0, 6));
    } catch (e) {
      console.error("Nearby load failed", e);
      setNearby([]);
    }
  }, []);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const raw = (id || "").trim();
      const numeric = Number(raw);
      let query = supabase.from("businesses").select("*, categories(name)").eq("status", "approved");
      query = (!Number.isNaN(numeric) && raw !== "") ? query.eq("id", numeric) : query.eq("slug", raw);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setBusiness(data ?? null);
      if (data?.id) {
        const { data: rv } = await supabase
          .from("reviews")
          .select("id, rating, title, body, author_name, created_at, users(first_name,last_name,username)")
          .eq("business_id", data.id)
          .order("created_at", { ascending: false });
        setReviews((rv as Review[]) ?? []);
        loadNearby(data);
      }
    } catch (e) {
      console.error("Business detail load failed", e);
      setBusiness(null);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [id, loadNearby]);

  useEffect(() => { load(); }, [load]);

  // Count one page view per business per mount.
  useEffect(() => {
    if (business?.id && viewedRef.current !== business.id) {
      viewedRef.current = business.id;
      track(business.id, "page_view");
    }
  }, [business?.id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Business not found</h2>
        <Link href="/directory"><Button>Return to Directory</Button></Link>
      </div>
    );
  }

  const b = business;
  const catName = b.categories?.name || "Local Business";
  const social = (b.social_links || {}) as Record<string, string>;
  const descHtml = b.description ? DOMPurify.sanitize(b.description) : "";
  const looksHtml = /<[a-z][\s\S]*>/i.test(b.description || "");
  const rating = Number(b.average_rating || 0);
  const hasSocial = social.facebook || social.instagram || social.twitter || social.youtube;
  const isVerified = b.status === "approved";
  const isClaimed = !!b.is_claimed;

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Link href="/directory"><Button variant="outline" className="mb-6">← Back to Directory</Button></Link>

      <Card className="overflow-hidden">
        {/* Hero cover with logo + name overlay */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden bg-muted">
          <img
            src={b.cover_url || `${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt={b.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute top-4 left-4 z-10 flex gap-1.5 flex-wrap">
            {isVerified && (
              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-semibold shadow-lg flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            )}
            {isClaimed && (
              <Badge className="bg-blue-500 hover:bg-blue-500 text-white font-semibold shadow-lg flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Claimed
              </Badge>
            )}
            {b.featured && (
              <Badge className="bg-secondary hover:bg-secondary text-white font-semibold shadow-lg">Featured</Badge>
            )}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl bg-white p-1 shadow-lg shrink-0 overflow-hidden">
              <img
                src={b.logo_url || `${import.meta.env.BASE_URL}images/placeholder-logo.png`}
                alt={`${b.name} logo`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="text-white pb-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight truncate">{b.name}</h1>
              <p className="text-white/85 text-sm">{catName}{b.municipality ? ` · ${b.municipality}` : ""}</p>
              {b.review_count > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={rating} />
                  <span className="text-sm text-white/85">{rating.toFixed(1)} ({b.review_count} {b.review_count === 1 ? "review" : "reviews"})</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {b.special_offer && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-amber-800">
              <Tag className="w-4 h-4 mt-0.5 shrink-0" /> <span className="text-sm font-medium">{b.special_offer}</span>
            </div>
          )}

          {b.description && (
            looksHtml
              ? <div className="prose prose-sm sm:prose max-w-none" dangerouslySetInnerHTML={{ __html: descHtml }} />
              : <p className="text-base leading-relaxed whitespace-pre-line">{b.description}</p>
          )}

          <div className="grid gap-2 text-sm border-t pt-4">
            {b.address && <a href={mapsUrl(b.address, b.municipality)} target="_blank" rel="noopener noreferrer" onClick={() => track(b.id, "maps_click")} className="flex items-center gap-2 text-primary"><MapPin className="w-4 h-4 shrink-0" /> {b.address}</a>}
            {b.phone && <a href={`tel:${b.phone}`} onClick={() => track(b.id, "phone_click")} className="flex items-center gap-2 text-primary"><Phone className="w-4 h-4" /> {b.phone}</a>}
            {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-primary"><Mail className="w-4 h-4" /> {b.email}</a>}
            {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" onClick={() => track(b.id, "website_click")} className="flex items-center gap-2 text-primary"><Globe className="w-4 h-4" /> Visit Website</a>}
          </div>

          {b.hours && <HoursBlock hours={b.hours} />}

          {b.menu_url && (
            <div className="border-t pt-4">
              <h3 className="flex items-center gap-2 font-semibold mb-2"><ExternalLink className="w-4 h-4" /> Menu</h3>
              <a href={b.menu_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary font-medium">
                <ExternalLink className="w-4 h-4" /> {b.menu_title || "View Menu"}
              </a>
            </div>
          )}

          {hasSocial && (
            <div className="flex items-center gap-3 border-t pt-4">
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="w-5 h-5" /></a>}
              {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="w-5 h-5" /></a>}
              {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Twitter className="w-5 h-5" /></a>}
              {social.youtube && <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Youtube className="w-5 h-5" /></a>}
            </div>
          )}

          {!isClaimed && !b.owner_id && (
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Is this your business?</p>
                  <p className="text-sm text-muted-foreground">Claim it to manage your page, add photos, and connect with customers — free.</p>
                </div>
              </div>
              <Button onClick={() => setShowClaim(true)} className="shrink-0">Claim this business</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map / location */}
      {(b.address || b.municipality) && (
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Location</h2>
          <MapEmbed
            query={[b.address, b.municipality, "Puerto Rico"].filter(Boolean).join(", ")}
            lat={(b as any).latitude}
            lon={(b as any).longitude}
            title={b.name}
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent([b.name, b.address, b.municipality, "Puerto Rico"].filter(Boolean).join(", "))}`}
              target="_blank" rel="noopener noreferrer" onClick={() => track(b.id, "maps_click")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            ><MapPin className="w-4 h-4 text-primary" /> Apple Maps</a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.name, b.address, b.municipality, "Puerto Rico"].filter(Boolean).join(", "))}`}
              target="_blank" rel="noopener noreferrer" onClick={() => track(b.id, "maps_click")}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
            ><MapPin className="w-4 h-4 text-primary" /> Google Maps</a>
          </div>
        </div>
      )}

      {/* Reviews section */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-bold mb-4">Reviews {b.review_count > 0 ? `(${b.review_count})` : ""}</h2>
        <div className="mb-6">
          <ReviewForm businessId={b.id} onPosted={() => load(false)} />
        </div>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((r) => {
              const author = r.author_name || [r.users?.first_name, r.users?.last_name].filter(Boolean).join(" ") || r.users?.username || "Anonymous";
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{author}</span>
                      <Stars rating={r.rating} />
                    </div>
                    {r.title && <p className="font-medium mt-1">{r.title}</p>}
                    {r.body && <p className="text-sm text-muted-foreground mt-1">{r.body}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet — be the first to share your experience.</p>
        )}
      </div>

      {/* Suggested nearby businesses */}
      {nearby.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold mb-1">You might also like</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {b.municipality ? `More businesses in and around ${b.municipality}` : "More businesses on Spotlight"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearby.map((n) => <NearbyCard key={n.id} b={n} />)}
          </div>
        </div>
      )}

      {showClaim && (
        <ClaimBusinessModal
          businessId={b.id}
          businessName={b.name}
          onClose={() => setShowClaim(false)}
        />
      )}
    </div>
  );
}
