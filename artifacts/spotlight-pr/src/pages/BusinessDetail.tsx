import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import DOMPurify from "dompurify";
import {
  MapPin, Phone, Globe, Mail, Share2, Heart, Flag, CheckCircle2,
  BadgeCheck, AlertCircle, Loader2, Star, Clock, Send, Copy,
  MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetBusiness,
  useListBusinessReviews,
  useCreateReview,
  useClaimBusiness,
  useSubmitBusinessInquiry,
  useGetSimilarBusinesses,
  useGetBusinessFormConfig,
} from "@workspace/api-client-react";
import type { BusinessDetail, Business, FormFieldConfig } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { StarRating } from "@/components/ui/star-rating";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BusinessMap } from "@/components/business/BusinessMap";

const API_BASE = import.meta.env.BASE_URL || "/";

// Puerto Rico timezone helpers
function getPRTime(): { day: string; minutes: number } {
  const now = new Date();
  const pr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Puerto_Rico",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const day = pr.find(p => p.type === "weekday")?.value ?? "";
  const h = parseInt(pr.find(p => p.type === "hour")?.value ?? "0");
  const m = parseInt(pr.find(p => p.type === "minute")?.value ?? "0");
  return { day, minutes: h * 60 + m };
}

function parseTimeToMinutes(t: string): number {
  const lower = t.toLowerCase().replace(/\s/g, "");
  const isPM = lower.includes("pm");
  const isAM = lower.includes("am");
  const clean = lower.replace(/[ap]m/, "");
  const [hStr, mStr] = clean.split(":");
  let h = parseInt(hStr ?? "0");
  const m = parseInt(mStr ?? "0");
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function isOpenNow(hours: Record<string, string>): boolean | null {
  const { day, minutes } = getPRTime();
  const todayHours = hours[day];
  if (!todayHours) return null;
  const lower = todayHours.toLowerCase().replace(/\s/g, "");
  if (lower === "closed" || lower === "") return false;
  const parts = todayHours.split(/[–-]/);
  if (parts.length < 2) return null;
  const open = parseTimeToMinutes(parts[0].trim());
  const close = parseTimeToMinutes(parts[1].trim());
  return minutes >= open && minutes < close;
}

// Social brand icons (Facebook, Instagram, Twitter/X, YouTube)
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.025 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.927-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.093 24 18.098 24 12.073z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#igGrad)">
      <defs>
        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TwitterXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="#FF0000">
      <path d="M19.582 2.186A2.506 2.506 0 0017.817.421C16.254 0 10 0 10 0S3.746 0 2.183.421A2.506 2.506 0 00.418 2.186C0 3.75 0 7 0 7s0 3.25.418 4.814a2.506 2.506 0 001.765 1.765C3.746 14 10 14 10 14s6.254 0 7.817-.421a2.506 2.506 0 001.765-1.765C20 10.25 20 7 20 7s0-3.25-.418-4.814zM8 10V4l6 3-6 3z" />
    </svg>
  );
}

// Hours display component with open/closed state
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function HoursBlock({ hours }: { hours: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const openStatus = isOpenNow(hours);
  const { day: today } = getPRTime();

  const hasAnyHours = DAYS.some(d => hours[d]);
  if (!hasAnyHours) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm text-foreground">Business Hours</span>
          {openStatus === true && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Open Now</span>
          )}
          {openStatus === false && (
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Closed</span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5">
          {DAYS.map(day => (
            <div
              key={day}
              className={`flex justify-between text-sm py-1 px-2 rounded-lg ${day === today ? "bg-primary/5 font-semibold" : ""}`}
            >
              <span className={day === today ? "text-primary" : "text-muted-foreground"}>{day}</span>
              <span className={hours[day]?.toLowerCase() === "closed" || !hours[day] ? "text-muted-foreground italic" : "text-foreground"}>
                {hours[day] || "Closed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Share popover (copy link, WhatsApp, Facebook)
function SharePopover({ businessName, url }: { businessName: string; url: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!" });
      setOpen(false);
    });
  };

  const waText = encodeURIComponent(`Check out ${businessName} on Spotlight Puerto Rico: ${url}`);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => setOpen(v => !v)}>
        <Share2 className="w-4 h-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-xl border border-border p-3 w-52 space-y-1">
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium text-foreground transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" /> Copy Link
          </button>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
            Share on WhatsApp
          </a>
          <a
            href={fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-sm font-medium text-foreground transition-colors"
          >
            <FacebookIcon /> Share on Facebook
          </a>
        </div>
      )}
    </div>
  );
}

// Contact inquiry form
const inputCls = "w-full px-3 py-2 rounded-xl border border-border text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function DynamicField({ field, value, onChange }: { field: FormFieldConfig; value: string; onChange: (v: string) => void }) {
  if (field.type === "textarea") {
    return (
      <textarea
        required={field.required}
        placeholder={field.placeholder ?? field.label}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        className={`${inputCls} resize-none`}
      />
    );
  }
  if (field.type === "select" && field.options?.length) {
    return (
      <select
        required={field.required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">{field.placeholder ?? `Select ${field.label}`}</option>
        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  return (
    <input
      required={field.required}
      type={field.type}
      placeholder={field.placeholder ?? field.label}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

function InquiryForm({ businessId, businessName }: { businessId: number; businessName: string }) {
  const { data: formConfig, isLoading: configLoading } = useGetBusinessFormConfig(businessId);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const { mutate: sendInquiry, isPending, isSuccess } = useSubmitBusinessInquiry();
  const { toast } = useToast();

  const enabledFields = (formConfig?.fields ?? []).filter(f => f.enabled);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendInquiry(
      { id: businessId, data: fieldValues as any },
      {
        onError: (err: Error) => {
          toast({ title: "Error", description: (err as any)?.message || "Failed to send message.", variant: "destructive" });
        },
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        <p className="font-semibold text-emerald-900">Message Sent!</p>
        <p className="text-sm text-emerald-700">{businessName} will be in touch with you soon.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
      <h3 className="font-bold text-sm mb-4 font-display flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        {formConfig?.title ?? "Send a Message"}
      </h3>
      {configLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3" id="inquiry-form">
          {enabledFields.map(field => (
            <div key={field.id}>
              <label className="text-xs text-muted-foreground mb-1 block">
                {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <DynamicField
                field={field}
                value={fieldValues[field.id] ?? ""}
                onChange={v => setFieldValues(prev => ({ ...prev, [field.id]: v }))}
              />
            </div>
          ))}
          <Button type="submit" disabled={isPending} className="w-full rounded-xl gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPending ? "Sending…" : (formConfig?.submitButtonText ?? "Send Message")}
          </Button>
        </form>
      )}
    </div>
  );
}

// Similar businesses section
function SimilarBusinessCard({ business }: { business: Business }) {
  const slug = business.slug || String(business.id);
  return (
    <Link href={`/businesses/${slug}`}>
      <div className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group">
        <div className="h-28 bg-muted relative overflow-hidden">
          {business.coverUrl ? (
            <img src={business.coverUrl} alt={business.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary/20 font-display">{business.name[0]}</span>
            </div>
          )}
          {business.logoUrl && (
            <div className="absolute bottom-2 left-2 w-10 h-10 rounded-xl bg-white border border-border/50 shadow-sm overflow-hidden">
              <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">{business.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {business.municipality}
          </p>
          {(business.averageRating ?? 0) > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-foreground">{business.averageRating!.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({business.reviewCount})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function SimilarBusinesses({ businessId }: { businessId: number }) {
  const { data } = useGetSimilarBusinesses(businessId, {
    query: { enabled: !!businessId },
  });

  const items = (data?.businesses ?? []).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold font-display mb-4">You Might Also Like</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map(b => <SimilarBusinessCard key={b.id} business={b} />)}
      </div>
    </div>
  );
}

// Main business detail page
export default function BusinessDetail() {
  const { id } = useParams();
  const businessSlugOrId = id || "";
  const numericId = parseInt(businessSlugOrId, 10);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: business, isLoading: loadingBusiness, refetch: refetchBusiness } = useGetBusiness(businessSlugOrId, { query: { enabled: !!businessSlugOrId } });
  const businessId = business?.id ?? (isNaN(numericId) ? 0 : numericId);
  const { data: reviewsData, isLoading: loadingReviews } = useListBusinessReviews(businessId, { query: { enabled: !!businessId } });

  useEffect(() => {
    if (businessId && businessId > 0) {
      fetch(`${API_BASE}api/businesses/${businessId}/track-page-view`, { method: "POST" }).catch(() => {});
    }
  }, [businessId]);

  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "claim">("about");

  const { mutateAsync: submitReview } = useCreateReview();
  const { mutate: claimBiz, isPending: isClaimingBusiness } = useClaimBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: "Business claimed!", description: "You can now manage this listing from your dashboard." });
        setActiveTab("about");
        refetchBusiness();
        queryClient.invalidateQueries({ queryKey: [`/api/my/businesses`] });
      },
      onError: (error: Error) => {
        toast({ title: "Failed to claim business", description: error.message || "Please try again.", variant: "destructive" });
      },
    },
  });

  if (loadingBusiness) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Business not found</h2>
        <Link href="/directory"><Button>Return to Directory</Button></Link>
      </div>
    );
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    setIsSubmittingReview(true);
    try {
      await submitReview({ id: businessId, data: { rating, title: reviewTitle, body: reviewBody } });
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setRating(0);
      setReviewTitle("");
      setReviewBody("");
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessSlugOrId}`] });
    } catch {
      toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Narrow to BusinessDetail for extended fields
  const detail = business as BusinessDetail;
  const socialLinks = detail.socialLinks;
  const hours = (detail.hours as Record<string, string> | undefined) ?? {};
  const openStatus = Object.keys(hours).length > 0 ? isOpenNow(hours) : null;
  const publicUrl = `${window.location.origin}/businesses/${detail.slug || String(business.id)}`;

  const scrollToInquiry = () => {
    document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const directionsQuery = [business.address, business.municipality, "Puerto Rico"].filter(Boolean).join(", ");
  const googleMapsUrl = `https://maps.google.com/?q=${encodeURIComponent(directionsQuery)}`;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">

      {/* Cover Header */}
      <div className="relative h-64 md:h-96 w-full bg-muted overflow-hidden">
        <img
          src={business.coverUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="container px-4 mx-auto relative -mt-20 md:-mt-32">

        {/* Hero card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10 mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Logo */}
            <div className="w-24 h-24 md:w-36 md:h-36 shrink-0 rounded-2xl bg-white p-2 shadow-lg border border-border/50 -mt-16 md:-mt-20 relative z-10 overflow-hidden">
              <img
                src={business.logoUrl || `${import.meta.env.BASE_URL}images/placeholder-logo.png`}
                alt={`${business.name} logo`}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            {/* Title & Core Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-full px-3">
                      {business.categoryName}
                    </Badge>
                    {business.status === "approved" && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-transparent gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                    {detail.isClaimed && (
                      <Badge className="bg-blue-500 hover:bg-blue-500 text-white border-transparent gap-1">
                        <BadgeCheck className="w-3 h-3" /> Claimed
                      </Badge>
                    )}
                    {openStatus === true && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-transparent gap-1">
                        <Clock className="w-3 h-3" /> Open Now
                      </Badge>
                    )}
                    {openStatus === false && (
                      <Badge variant="destructive" className="gap-1">
                        <Clock className="w-3 h-3" /> Closed
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">{business.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {business.municipality}</span>
                    {business.averageRating ? (
                      <span className="flex items-center gap-1.5 text-foreground">
                        <StarRating rating={business.averageRating} size={16} />
                        <span className="font-bold">{business.averageRating.toFixed(1)}</span> ({business.reviewCount} reviews)
                      </span>
                    ) : (
                      <span className="italic">No reviews yet</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <SharePopover businessName={business.name} url={publicUrl} />
                  <Button variant="outline" size="icon" className="rounded-full shrink-0"><Heart className="w-4 h-4" /></Button>
                  {business.phone && (
                    <Button onClick={() => window.location.href = `tel:${business.phone}`} className="flex-1 md:flex-none rounded-full gap-2 shadow-md">
                      <Phone className="w-4 h-4" /> Call Now
                    </Button>
                  )}
                  <Button variant="outline" onClick={scrollToInquiry} className="flex-1 md:flex-none rounded-full gap-2 hidden md:flex">
                    <MessageSquare className="w-4 h-4" /> Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Special Offer Banner */}
        {detail.specialOffer && (
          <div className="mb-8 bg-gradient-to-r from-amber-50 to-teal-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600 fill-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">Special Offer</p>
              <p className="text-foreground font-semibold">{detail.specialOffer}</p>
            </div>
          </div>
        )}

        {detail.menuUrl && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">{detail.menuTitle || "Menu"}</p>
              <a href={detail.menuUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-2">
                  <Globe className="w-4 h-4" /> View Menu
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs */}
            <div className="bg-card rounded-2xl shadow-sm border border-border">
              <div className="flex border-b border-border">
                {(["about", "reviews"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors text-center capitalize ${
                      activeTab === tab
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "reviews" ? `Reviews (${business.reviewCount || 0})` : tab}
                  </button>
                ))}
                {!detail.isClaimed && isAuthenticated && (
                  <button
                    onClick={() => setActiveTab("claim")}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors text-center ${
                      activeTab === "claim"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Claim Business
                  </button>
                )}
              </div>

              <div className="p-6 md:p-8">
                {/* About Tab */}
                {activeTab === "about" && (
                  <section>
                    <h2 className="text-xl font-bold mb-4 font-display">About</h2>
                    {business.description ? (
                      <div
                        className="prose prose-sm max-w-none text-muted-foreground leading-relaxed about-html-content"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(business.description, {
                            ALLOWED_TAGS: ["div", "p", "h1", "h2", "h3", "h4", "span", "ul", "ol", "li", "strong", "em", "br", "section", "article"],
                            ALLOWED_ATTR: ["style"],
                            FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link"],
                            FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "href", "src"],
                          }),
                        }}
                      />
                    ) : (
                      <p className="text-muted-foreground italic">No description provided.</p>
                    )}
                    {Object.keys(hours).length > 0 && <HoursBlock hours={hours} />}
                  </section>
                )}

                {/* Claim Tab */}
                {activeTab === "claim" && !detail.isClaimed && isAuthenticated && (
                  <section>
                    <h2 className="text-xl font-bold mb-4 font-display">Claim This Business</h2>
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Own this business?</p>
                          <p>Click the button below to claim it. You'll be able to manage the listing, update information, and respond to reviews.</p>
                        </div>
                      </div>
                      <div className="space-y-4 pt-4">
                        <div>
                          <h3 className="font-semibold mb-2">Business Name</h3>
                          <p className="text-muted-foreground">{business.name}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Your Account</h3>
                          <p className="text-muted-foreground">{user?.email || user?.username}</p>
                        </div>
                      </div>
                      <Button onClick={() => claimBiz({ id: businessId })} disabled={isClaimingBusiness} size="lg" className="w-full">
                        {isClaimingBusiness ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Claiming...</> : "Claim This Business"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">By claiming, you confirm you are authorized to manage this business.</p>
                    </div>
                  </section>
                )}

                {/* Reviews Tab */}
                {activeTab === "reviews" && (
                  <section id="reviews">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold font-display">Reviews ({business.reviewCount || 0})</h2>
                      {business.averageRating ? (
                        <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-xl">
                          <span className="text-2xl font-bold font-display">{business.averageRating.toFixed(1)}</span>
                          <StarRating rating={business.averageRating} size={20} />
                        </div>
                      ) : null}
                    </div>

                    {isAuthenticated ? (
                      <div className="bg-muted/30 rounded-xl p-6 mb-8 border border-border/50">
                        <h3 className="font-semibold mb-4 text-foreground">Write a Review</h3>
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Your Rating</label>
                            <StarRating rating={rating} onChange={setRating} readonly={false} size={28} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Title (optional)</label>
                            <input
                              type="text"
                              value={reviewTitle}
                              onChange={e => setReviewTitle(e.target.value)}
                              placeholder="Sum up your experience"
                              className="w-full px-4 py-2 rounded-lg border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Review</label>
                            <textarea
                              value={reviewBody}
                              onChange={e => setReviewBody(e.target.value)}
                              placeholder="Share details of your own experience at this place"
                              className="w-full px-4 py-3 rounded-lg border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[120px] resize-y"
                              required
                            />
                          </div>
                          <Button type="submit" disabled={isSubmittingReview || rating === 0} className="w-full sm:w-auto">
                            {isSubmittingReview ? "Submitting..." : "Post Review"}
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <div className="bg-primary/5 rounded-xl p-6 mb-8 border border-primary/10 text-center">
                        <h3 className="font-semibold mb-2 text-foreground">Have you visited {business.name}?</h3>
                        <p className="text-muted-foreground text-sm mb-4">Log in to share your experience with the community.</p>
                        <Button onClick={() => window.location.href = "/api/login"} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">Log in to Review</Button>
                      </div>
                    )}

                    {loadingReviews ? (
                      <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}</div>
                    ) : reviewsData?.reviews?.length ? (
                      <div className="space-y-6">
                        {reviewsData.reviews.map(review => (
                          <div key={review.id} className="border-b border-border/50 last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase overflow-hidden">
                                  {review.authorImage ? <img src={review.authorImage} alt="" className="w-full h-full object-cover" /> : review.authorName?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{review.authorName || "Anonymous User"}</p>
                                  <p className="text-xs text-muted-foreground">{format(new Date(review.createdAt), "MMM d, yyyy")}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <StarRating rating={review.rating} size={14} className="mb-2" />
                              {review.title && <h4 className="font-bold text-foreground mb-1">{review.title}</h4>}
                              <p className="text-muted-foreground text-sm leading-relaxed">{review.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-8">Be the first to review this business!</p>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-5">
            {/* Map */}
            <BusinessMap
              address={business.address}
              municipality={business.municipality}
              businessName={business.name}
              businessId={businessId}
            />

            {/* Contact Info */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
              <h3 className="font-bold mb-4 font-display">Contact Info</h3>

              {/* Primary CTAs */}
              <div className="space-y-2 mb-4">
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="block w-full">
                    <Button className="w-full rounded-xl gap-2">
                      <Phone className="w-4 h-4" /> Call Now
                    </Button>
                  </a>
                )}
                <Button variant="outline" className="w-full rounded-xl gap-2" onClick={scrollToInquiry}>
                  <MessageSquare className="w-4 h-4" /> Send a Message
                </Button>
              </div>

              <ul className="space-y-3">
                {business.address && (
                  <li className="flex gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-foreground font-medium text-sm">{business.address}</span>
                      <span className="text-xs">{business.municipality}, PR</span>
                    </div>
                  </li>
                )}
                {business.phone && (
                  <li className="flex gap-3 items-center text-muted-foreground">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <a href={`tel:${business.phone}`} className="text-foreground text-sm hover:text-primary transition-colors">{business.phone}</a>
                  </li>
                )}
                {business.email && (
                  <li className="flex gap-3 items-center text-muted-foreground">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <a href={`mailto:${business.email}`} className="text-foreground text-sm hover:text-primary transition-colors truncate">{business.email}</a>
                  </li>
                )}
                {business.website && (
                  <li className="flex gap-3 items-center text-muted-foreground">
                    <Globe className="w-4 h-4 text-primary shrink-0" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (businessId > 0) {
                          fetch(`${API_BASE}api/businesses/${businessId}/track-website-click`, { method: "POST" }).catch(() => {});
                        }
                      }}
                      className="text-primary text-sm hover:underline truncate"
                    >
                      Visit Website
                    </a>
                  </li>
                )}
              </ul>

              {/* Social Links */}
              {socialLinks && Object.values(socialLinks).some(Boolean) && (
                <>
                  <hr className="my-4 border-border" />
                  <h3 className="font-bold mb-3 text-sm font-display">Social Media</h3>
                  <div className="flex gap-2 flex-wrap">
                    {socialLinks.facebook && (
                      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        aria-label="Facebook">
                        <FacebookIcon />
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center hover:bg-pink-100 transition-colors"
                        aria-label="Instagram">
                        <InstagramIcon />
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 transition-colors"
                        aria-label="X / Twitter">
                        <TwitterXIcon />
                      </a>
                    )}
                    {socialLinks.youtube && (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors"
                        aria-label="YouTube">
                        <YouTubeIcon />
                      </a>
                    )}
                  </div>
                </>
              )}

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-center">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive text-xs">
                  <Flag className="w-3 h-3" /> Report Listing
                </Button>
              </div>
            </div>

            {/* Inquiry Form */}
            <InquiryForm businessId={businessId} businessName={business.name} />
          </div>

        </div>

        {/* You Might Also Like */}
        <SimilarBusinesses businessId={businessId} />

      </div>

      {/* Sticky Mobile CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-border shadow-2xl px-4 py-2 safe-area-bottom">
        <div className="flex gap-2 max-w-xl mx-auto">
          {business.phone && (
            <a href={`tel:${business.phone}`} className="flex-1">
              <Button size="sm" className="w-full rounded-xl gap-1.5 text-xs py-3">
                <Phone className="w-4 h-4" /> Call
              </Button>
            </a>
          )}
          <Button size="sm" variant="outline" className="flex-1 rounded-xl gap-1.5 text-xs py-3" onClick={scrollToInquiry}>
            <MessageSquare className="w-4 h-4" /> Message
          </Button>
          {business.address && (
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1"
              onClick={() => {
                if (businessId > 0) fetch(`${API_BASE}api/businesses/${businessId}/track-maps-click`, { method: "POST" }).catch(() => {});
              }}
            >
              <Button size="sm" variant="outline" className="w-full rounded-xl gap-1.5 text-xs py-3">
                <MapPin className="w-4 h-4" /> Directions
              </Button>
            </a>
          )}
          {business.website && (
            <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex-1"
              onClick={() => {
                if (businessId > 0) fetch(`${API_BASE}api/businesses/${businessId}/track-website-click`, { method: "POST" }).catch(() => {});
              }}
            >
              <Button size="sm" variant="outline" className="w-full rounded-xl gap-1.5 text-xs py-3">
                <Globe className="w-4 h-4" /> Website
              </Button>
            </a>
          )}
        </div>
      </div>

    </div>
  );
}
