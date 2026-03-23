import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Star, MessageSquare, MapPin, CalendarDays, Award,
  ThumbsUp, Store, Loader2, User as UserIcon, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";

interface ProfileData {
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    profileImage?: string;
    role: string;
    createdAt: string;
  };
  stats: {
    totalReviews: number;
    averageRatingGiven: number;
  };
  reviews: Array<{
    id: number;
    rating: number;
    title?: string;
    body?: string;
    createdAt: string;
    business: {
      id: number;
      name: string;
      slug: string;
      logoUrl?: string;
      municipality?: string;
    } | null;
  }>;
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${cls} ${s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/25"}`} />
      ))}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Admin</Badge>;
  if (role === "business_owner") return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Business Owner</Badge>;
  return <Badge variant="secondary">Community Member</Badge>;
}

export default function UserProfile() {
  const [, ownParams] = useRoute("/profile");
  const [, params] = useRoute("/profile/:id");
  const { user: authUser, isAuthenticated, isLoading: authLoading, getToken } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = ownParams !== null || (params?.id && authUser && params.id === authUser.id);
  const targetId = params?.id ?? null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let url: string;
        let headers: Record<string, string> = {};

        if (isOwnProfile && isAuthenticated) {
          const token = await getToken();
          url = "/api/my/profile";
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } else if (targetId) {
          url = `/api/users/${targetId}/profile`;
        } else if (!authLoading && isAuthenticated && authUser) {
          const token = await getToken();
          url = "/api/my/profile";
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } else {
          setLoading(false);
          return;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error("Profile not found");
        const data = await res.json();
        setProfile(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) load();
  }, [authLoading, isAuthenticated, authUser, targetId, isOwnProfile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated && !targetId) {
    const { openAuthModal } = useAuth();
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-emerald-50/30">
        <div className="bg-white rounded-3xl shadow-2xl border border-border p-8 md:p-12 max-w-sm w-full space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <UserIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-display mb-2 text-foreground">See Your Profile</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Track your reviews, build your reputation, and become a trusted community voice on Spotlight PR.</p>
          </div>
          <Button onClick={() => openAuthModal()} size="lg" className="w-full rounded-xl gap-2">
            Sign In or Create Account
          </Button>
          <p className="text-xs text-muted-foreground">It's free and takes less than a minute</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Profile not found</h2>
          <Link href="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const { user, stats, reviews } = profile;
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.username || "Community Member";
  const initials = displayName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Profile Header ── */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-3xl font-bold font-display shrink-0 shadow-lg overflow-hidden border-4 border-white ring-2 ring-primary/20">
              {user.profileImage
                ? <img src={user.profileImage} alt={displayName} className="w-full h-full object-cover" />
                : <span>{initials}</span>
              }
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <h1 className="text-2xl font-bold font-display text-foreground">{displayName}</h1>
                <RoleBadge role={user.role} />
              </div>
              {user.username && <p className="text-sm text-muted-foreground mb-3">@{user.username}</p>}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  Member since {format(new Date(user.createdAt), "MMMM yyyy")}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Puerto Rico
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left sidebar: Stats ── */}
          <div className="space-y-4">

            {/* Stats card */}
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <h2 className="font-bold font-display text-sm text-muted-foreground uppercase tracking-wide mb-4">Community Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-foreground leading-none">{stats.totalReviews}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stats.totalReviews === 1 ? "Review Written" : "Reviews Written"}</p>
                  </div>
                </div>

                {stats.totalReviews > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display text-foreground leading-none">{stats.averageRatingGiven.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Avg Rating Given</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reputation badge */}
            {stats.totalReviews >= 1 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-sm text-amber-800">Reputation</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { min: 20, label: "Top Reviewer", color: "text-purple-700 bg-purple-100" },
                    { min: 10, label: "Veteran Reviewer", color: "text-blue-700 bg-blue-100" },
                    { min: 5, label: "Active Reviewer", color: "text-emerald-700 bg-emerald-100" },
                    { min: 1, label: "Community Member", color: "text-amber-700 bg-amber-100" },
                  ].filter(b => stats.totalReviews >= b.min).slice(0, 1).map(badge => (
                    <span key={badge.label} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                      <ThumbsUp className="w-3 h-3" /> {badge.label}
                    </span>
                  ))}
                  {stats.totalReviews < 20 && (
                    <p className="text-xs text-amber-700 mt-2">
                      {20 - stats.totalReviews} more {stats.totalReviews === 19 ? "review" : "reviews"} to reach Top Reviewer
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* CTA to browse */}
            {isOwnProfile && (
              <div className="bg-white rounded-2xl border border-dashed border-border p-5 text-center">
                <Store className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">Discover Businesses</p>
                <p className="text-xs text-muted-foreground mb-3">Browse the directory and leave your first review.</p>
                <Link href="/directory">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs w-full">
                    Browse Directory <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ── Right: Review Feed ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold font-display text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {isOwnProfile ? "My Reviews" : `${user.firstName ?? "Their"}'s Reviews`}
              {stats.totalReviews > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({stats.totalReviews})</span>
              )}
            </h2>

            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-border p-14 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
                <h3 className="font-bold font-display mb-1">No reviews yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {isOwnProfile
                    ? "Start exploring local businesses and share your experiences with the community."
                    : "This member hasn't left any reviews yet."}
                </p>
                {isOwnProfile && (
                  <Link href="/directory">
                    <Button className="mt-4 rounded-xl gap-2" size="sm">
                      <Store className="w-4 h-4" /> Find Businesses
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-5">
                    {/* Business header */}
                    {review.business && (
                      <Link href={`/businesses/${(review.business as any).slug || review.business.id}`}>
                        <div className="flex items-center gap-3 mb-4 group cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                            {review.business.logoUrl
                              ? <img src={review.business.logoUrl} alt={review.business.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Store className="w-4 h-4 text-muted-foreground/50" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate flex items-center gap-1">
                              {review.business.name}
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            {review.business.municipality && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {review.business.municipality}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </Link>
                    )}

                    {/* Review content */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <StarRow rating={review.rating} />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        {review.title && (
                          <p className="font-semibold text-foreground text-sm mb-1">{review.title}</p>
                        )}
                        {review.body && (
                          <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
