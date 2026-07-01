import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Globe, Mail, ShieldCheck, Star, Clock, Tag, ExternalLink, Facebook, Instagram } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DOMPurify from "dompurify";
import { ClaimBusinessModal } from "@/components/business/ClaimBusinessModal";

type Review = {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  users?: { first_name: string | null; last_name: string | null; username: string | null } | null;
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

export default function BusinessDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showClaim, setShowClaim] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
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
            .select("id, rating, title, body, created_at, users(first_name,last_name,username)")
            .eq("business_id", data.id)
            .order("created_at", { ascending: false });
          setReviews((rv as Review[]) ?? []);
        }
      } catch (e) {
        console.error("Business detail load failed", e);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

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

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <Link href="/directory"><Button variant="outline" className="mb-6">← Back to Directory</Button></Link>

      <Card className="overflow-hidden">
        {b.cover_url && <img src={b.cover_url} alt={b.name} className="w-full h-56 sm:h-72 object-cover" />}
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            {b.logo_url && <img src={b.logo_url} alt="logo" className="w-20 h-20 rounded-xl object-cover border shrink-0" />}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold">{b.name}</h1>
              <p className="text-muted-foreground">{catName}{b.municipality ? ` · ${b.municipality}` : ""}</p>
              {b.review_count > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={rating} />
                  <span className="text-sm text-muted-foreground">{rating.toFixed(1)} ({b.review_count} {b.review_count === 1 ? "review" : "reviews"})</span>
                </div>
              )}
            </div>
          </div>

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
            {b.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> {b.address}</p>}
            {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-2 text-primary"><Phone className="w-4 h-4" /> {b.phone}</a>}
            {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-2 text-primary"><Mail className="w-4 h-4" /> {b.email}</a>}
            {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary"><Globe className="w-4 h-4" /> Visit Website</a>}
          </div>

          {b.hours && <HoursBlock hours={b.hours} />}

          {b.menu_url && (
            <div className="border-t pt-4">
              <a href={b.menu_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary font-medium">
                <ExternalLink className="w-4 h-4" /> {b.menu_title || "View Menu"}
              </a>
            </div>
          )}

          {(social.facebook || social.instagram) && (
            <div className="flex items-center gap-3 border-t pt-4">
              {social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="w-5 h-5" /></a>}
              {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="w-5 h-5" /></a>}
            </div>
          )}

          {!b.is_claimed && !b.owner_id && (
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

      {reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Reviews</h2>
          <div className="space-y-4">
            {reviews.map((r) => {
              const author = [r.users?.first_name, r.users?.last_name].filter(Boolean).join(" ") || r.users?.username || "Anonymous";
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
