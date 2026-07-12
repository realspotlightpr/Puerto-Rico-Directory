import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Star, MessageSquare, MapPin, CalendarDays, Award,
  ThumbsUp, Store, Loader2, User as UserIcon, ChevronRight, Compass, Camera, Sparkles,
  Bookmark, CalendarHeart, Trash2, Shield, Instagram, Facebook, Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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
  if (role === "guide") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Guide</Badge>;
  return <Badge variant="secondary">Community Member</Badge>;
}

function AccountSettings() {
  const { toast } = useToast();
  const { logout } = useAuth();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [uploadingAv, setUploadingAv] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      setInstagram(user?.user_metadata?.social_links?.instagram || "");
      setFacebook(user?.user_metadata?.social_links?.facebook || "");
      if (user?.id) {
        const { data } = await supabase.from("users").select("phone, profile_image_url").eq("id", user.id).maybeSingle();
        setPhone((data as any)?.phone || "");
        setAvatar((data as any)?.profile_image_url || "");
      }
    })();
  }, []);

  async function saveInfo() {
    setSavingInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke("profile", { body: { email: email.trim(), phone: phone.trim() } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Account updated", description: (data as any)?.emailChanged ? "Check your new email inbox to confirm the change." : "Your contact info was saved and synced." });
    } catch (e: any) {
      toast({ title: "Update failed", description: e?.message, variant: "destructive" });
    } finally {
      setSavingInfo(false);
    }
  }

  async function savePw() {
    if (pw.length < 8) { toast({ title: "Password must be at least 8 characters.", variant: "destructive" }); return; }
    if (pw !== pw2) { toast({ title: "Passwords don't match.", variant: "destructive" }); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw(""); setPw2("");
      toast({ title: "Password changed" });
    } catch (e: any) {
      toast({ title: "Couldn't change password", description: e?.message, variant: "destructive" });
    } finally {
      setSavingPw(false);
    }
  }

  async function saveSocial() {
    setSavingSocial(true);
    const { error } = await supabase.auth.updateUser({ data: { social_links: { instagram: instagram.trim(), facebook: facebook.trim() } } });
    setSavingSocial(false);
    if (error) toast({ title: "Social links could not be saved", description: error.message, variant: "destructive" });
    else toast({ title: "Social links saved" });
  }

  const onAvatar = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAv(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `avatars/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("business-media").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("business-media").getPublicUrl(path).data.publicUrl;
      await supabase.from("users").update({ profile_image_url: url, updated_at: new Date().toISOString() }).eq("id", user.id);
      try { await supabase.auth.updateUser({ data: { avatar_url: url } }); } catch { /* ignore */ }
      setAvatar(url);
      toast({ title: "Photo updated \ud83d\udcf8" });
    } catch (err: any) { toast({ title: "Upload failed", description: err?.message, variant: "destructive" }); }
    finally { setUploadingAv(false); }
  };

  const deleteAccount = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("profile", { body: { action: "delete-account", confirmation: "DELETE" } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await logout();
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Account could not be deleted", description: e?.message || "Contact support for help.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-5">
      <h2 className="font-bold font-display text-sm text-muted-foreground uppercase tracking-wide">Account Settings</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted overflow-hidden border border-border shrink-0">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera className="w-5 h-5 text-muted-foreground/40" /></div>}
        </div>
        <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <input type="file" accept="image/*" className="hidden" onChange={onAvatar} disabled={uploadingAv} />
          {uploadingAv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} {avatar ? "Change photo" : "Upload photo"}
        </label>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="acct-email">Email</Label>
          <Input id="acct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acct-phone">Phone</Label>
          <Input id="acct-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (787) 555-0123" />
        </div>
        <Button onClick={saveInfo} disabled={savingInfo} size="sm" className="w-full rounded-xl">
          {savingInfo ? "Saving…" : "Save contact info"}
        </Button>
        <p className="text-xs text-muted-foreground">Changes also update your contact in our CRM.</p>
      </div>
      <div className="border-t pt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="acct-pw">New Password</Label>
          <Input id="acct-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acct-pw2">Confirm Password</Label>
          <Input id="acct-pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <Button onClick={savePw} disabled={savingPw} size="sm" variant="outline" className="w-full rounded-xl">
          {savingPw ? "Saving…" : "Change password"}
        </Button>
      </div>
      <div className="border-t pt-4 space-y-3">
        <p className="font-semibold text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Social profiles</p>
        <div className="relative"><Instagram className="absolute left-3 top-3 w-4 h-4 text-pink-500" /><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Instagram profile URL" className="pl-9" /></div>
        <div className="relative"><Facebook className="absolute left-3 top-3 w-4 h-4 text-blue-600" /><Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="Facebook profile URL" className="pl-9" /></div>
        <Button variant="outline" size="sm" className="w-full" onClick={saveSocial} disabled={savingSocial}>{savingSocial ? "Saving…" : "Save social links"}</Button>
      </div>
      <div className="border-t border-red-100 pt-4">
        <button type="button" onClick={() => setDeleteOpen(true)} className="w-full flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-100">
          <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete account</span><ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {deleteOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4"><Trash2 className="w-6 h-6" /></div>
            <h3 className="font-display text-xl font-bold">Permanently delete your account?</h3>
            <p className="text-sm text-muted-foreground mt-2">Your profile, saved items, plans, and account access will be removed. This cannot be undone.</p>
            <Label htmlFor="delete-confirm" className="block mt-5 mb-1.5">Type <strong>DELETE</strong> to confirm</Label>
            <Input id="delete-confirm" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteText(""); }}>Keep account</Button>
              <Button variant="destructive" disabled={deleteText !== "DELETE" || deleting} onClick={deleteAccount}>{deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete forever"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserProfile() {
  const [, ownParams] = useRoute("/profile");
  const [, params] = useRoute("/profile/:id");
  const { user: authUser, isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<any[]>([]);
  const [offered, setOffered] = useState<any[]>([]);

  const isOwnProfile = ownParams !== null || (params?.id && authUser && params.id === authUser.id);
  const targetId = params?.id ?? null;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user: au } } = await supabase.auth.getUser();
        const targetUserId = targetId || au?.id || null;
        if (!targetUserId) { setLoading(false); return; }

        // Only request fields intended for public profiles. Selecting private account
        // columns can cause the entire anonymous request to be rejected by Supabase.
        const { data: u, error: userError } = await supabase
          .from("users")
          .select("id, first_name, last_name, username, profile_image_url, role, created_at")
          .eq("id", targetUserId)
          .maybeSingle();
        if (userError) throw userError;
        if (!u) throw new Error("Profile not found");

        const { data: rv } = await supabase
          .from("reviews")
          .select("id, rating, title, body, created_at, businesses(id, name, slug, logo_url, municipality)")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false });

        const reviews = (rv || []).map((r: any) => ({
          id: r.id,
          rating: r.rating,
          title: r.title || undefined,
          body: r.body || undefined,
          createdAt: r.created_at,
          business: r.businesses ? {
            id: r.businesses.id,
            name: r.businesses.name,
            slug: r.businesses.slug,
            logoUrl: r.businesses.logo_url || undefined,
            municipality: r.businesses.municipality || undefined,
          } : null,
        }));
        const { data: ob } = await supabase.from("businesses").select("id, name, slug, logo_url, municipality").eq("owner_id", targetUserId).eq("status", "approved").order("name");
        setOwned(ob || []);
        const { data: gs } = await supabase.from("services").select("id, title, slug, price, price_unit, images, activity_type").eq("guide_id", targetUserId).eq("status", "active").order("title");
        setOffered(gs || []);

        const totalReviews = reviews.length;
        const avg = totalReviews ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / totalReviews : 0;

        setProfile({
          user: {
            id: (u as any).id,
            firstName: (u as any).first_name || undefined,
            lastName: (u as any).last_name || undefined,
            username: (u as any).username || undefined,
            profileImage: (u as any).profile_image_url || undefined,
            role: (u as any).role || "user",
            createdAt: (u as any).created_at,
          },
          stats: { totalReviews, averageRatingGiven: avg },
          reviews,
        });
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

      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-white text-3xl font-bold font-display shrink-0 shadow-lg overflow-hidden border-4 border-white ring-2 ring-primary/20">
              {user.profileImage
                ? <img src={user.profileImage} alt={displayName} className="w-full h-full object-cover" />
                : <span>{initials}</span>
              }
            </div>

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

          <div className="space-y-4">

            {isOwnProfile && (
              <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-sm p-4">
                <p className="text-[11px] uppercase tracking-wider font-bold text-white/50 mb-3">Your account</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { href: "/saved", label: "Saved", icon: Bookmark },
                    { href: "/plans", label: "My plans", icon: CalendarHeart },
                    { href: "/messages", label: "Messages", icon: MessageSquare },
                    { href: "/discover", label: "Personal feed", icon: Compass },
                  ].map((item) => <Link key={item.href} href={item.href}><div className="rounded-xl bg-white/10 hover:bg-white/15 p-3 text-sm font-semibold flex items-center gap-2"><item.icon className="w-4 h-4 text-secondary" />{item.label}</div></Link>)}
                </div>
                {authUser?.role === "admin" && <Link href="/admin"><div className="mt-2 rounded-xl bg-purple-500/20 border border-purple-300/20 p-3 text-sm font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-purple-300" /> Open admin area <ChevronRight className="w-4 h-4 ml-auto" /></div></Link>}
              </div>
            )}

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

            {isOwnProfile && <AccountSettings />}

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

          <div className="lg:col-span-2 space-y-4">
            {owned.length > 0 && (
              <div>
                <h2 className="font-bold font-display text-lg flex items-center gap-2 mb-3">
                  <Store className="w-5 h-5 text-primary" /> {isOwnProfile ? "My businesses" : "Businesses"}
                  <span className="text-sm font-normal text-muted-foreground">({owned.length})</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {owned.map((b) => (
                    <Link key={b.id} href={`/businesses/${b.slug || b.id}`}>
                      <div className="flex items-center gap-3 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-3 cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50">
                          {b.logo_url ? <img src={b.logo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Store className="w-5 h-5 text-muted-foreground/40" /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{b.name}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{b.municipality || "Puerto Rico"}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {offered.length > 0 && (
              <div>
                <h2 className="font-bold font-display text-lg flex items-center gap-2 mb-3">
                  <Compass className="w-5 h-5 text-primary" /> {isOwnProfile ? "My experiences" : "Experiences offered"}
                  <span className="text-sm font-normal text-muted-foreground">({offered.length})</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {offered.map((sv) => {
                    const img = Array.isArray(sv.images) && sv.images[0] ? sv.images[0] : null;
                    const price = sv.price ? `$${sv.price}${sv.price_unit ? " / " + String(sv.price_unit).replace("_", " ") : ""}` : null;
                    return (
                      <Link key={sv.id} href="/experiences">
                        <div className="flex items-center gap-3 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-3 cursor-pointer">
                          <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/50">
                            {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{sv.title}</p>
                            <p className="text-xs text-muted-foreground truncate capitalize">{price || sv.activity_type}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
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

      {!isAuthenticated && targetId && (
        <div className="fixed bottom-20 md:bottom-5 left-3 right-3 z-40 mx-auto max-w-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="rounded-2xl border border-white/30 bg-slate-950/95 text-white shadow-2xl shadow-slate-950/25 backdrop-blur-xl p-3.5 sm:p-4 flex items-center gap-3">
            <div className="hidden sm:flex w-11 h-11 shrink-0 rounded-xl bg-primary/20 items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-sm sm:text-base text-white">Join the Spotlight community</p>
              <p className="text-xs sm:text-sm text-white/65">Save favorites, follow local voices, and share reviews. It’s quick and free.</p>
            </div>
            <Button onClick={() => openAuthModal()} size="sm" className="shrink-0 rounded-xl px-4">
              Sign up free
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
