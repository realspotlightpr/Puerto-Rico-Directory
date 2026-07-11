import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, DollarSign, LayoutDashboard, Palette, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PERKS = [
  { icon: <DollarSign className="w-5 h-5" />, title: "$1 per paid signup", desc: "Earn $1 for every person who buys a Spotlight Pass through your code." },
  { icon: <DollarSign className="w-5 h-5" />, title: "$10 per 100 free signups", desc: "We also pay you for the free members you bring in." },
  { icon: <LayoutDashboard className="w-5 h-5" />, title: "Your own dashboard", desc: "Track clicks, signups, conversions, and earnings in real time." },
  { icon: <Palette className="w-5 h-5" />, title: "Your own landing page", desc: "A branded page with your name and colors to share with your audience." },
];

export default function Influencers() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [existing, setExisting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [platform, setPlatform] = useState("");
  const [handle, setHandle] = useState("");
  const [otherSocials, setOtherSocials] = useState("");
  const [audience, setAudience] = useState("");
  const [niche, setNiche] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        const { data } = await supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle();
        setExisting(data ?? null);
      }
      setLoading(false);
    })();
  }, [isAuthenticated]);

  const apply = async () => {
    if (!isAuthenticated) { openAuthModal?.(); return; }
    if (!name.trim()) { toast({ title: "Add your name / brand", variant: "destructive" }); return; }
    if (!handle.trim()) { toast({ title: "Add your main social handle", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in first");
      const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "creator";
      const code = (name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "CREATOR") + Math.floor(Math.random() * 90 + 10);
      const slug = base + "-" + Math.floor(Math.random() * 900 + 100);
      const socials: Record<string, string> = {};
      if (handle.trim()) socials[(platform.trim() || "instagram").toLowerCase()] = handle.trim();
      if (otherSocials.trim()) socials.other = otherSocials.trim();
      const { error } = await supabase.from("influencers").insert({
        user_id: user.id, code, slug, display_name: name.trim(),
        email: email.trim() || null, phone: phone.trim() || null,
        primary_platform: platform.trim() || null, audience_size: audience.trim() || null,
        content_niche: niche.trim() || null, website: website.trim() || null,
        bio: bio.trim() || null, social_links: socials, status: "applied",
      });
      if (error) throw error;
      toast({ title: "Application submitted! 🎉", description: "We'll review it and get you set up." });
      const { data } = await supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle();
      setExisting(data ?? null);
    } catch (e: any) { toast({ title: "Couldn't apply", description: e?.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <div className="relative bg-gradient-to-br from-fuchsia-600 via-primary to-emerald-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative container mx-auto px-4 py-14 md:py-20 text-center max-w-2xl">
          <p className="text-white/85 text-sm font-semibold mb-3 flex items-center justify-center gap-1.5"><Megaphone className="w-4 h-4" /> Spotlight Creator Program</p>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-3">Get paid to share Puerto Rico</h1>
          <p className="text-white/90 md:text-lg">Share your code, bring people to Spotlight, and earn on every signup — free or paid. Your own dashboard and branded page included.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10 max-w-4xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PERKS.map((p) => (
            <div key={p.title} className="bg-white rounded-2xl border border-border shadow-sm p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">{p.icon}</div>
              <p className="font-semibold text-sm leading-tight">{p.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-lg">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : existing ? (
          <div className="bg-white rounded-3xl border border-border shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Check className="w-7 h-7" /></div>
            <h2 className="font-display text-xl font-bold mb-1">{existing.status === "approved" ? "You're a Spotlight Creator!" : existing.status === "applied" ? "Application received" : "Application " + existing.status}</h2>
            <p className="text-sm text-muted-foreground mb-4">{existing.status === "approved" ? "Head to your dashboard to grab your code and share your page." : "We're reviewing your application — you'll hear from us soon."}</p>
            {existing.status === "approved" && <Button onClick={() => setLocation("/influencer")}>Go to my dashboard</Button>}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-border shadow-sm p-6 space-y-4">
            <h2 className="font-display text-xl font-bold text-center">Apply to join</h2>
            <p className="text-xs text-center text-muted-foreground">By application &amp; admin approval only. The more you share, the faster we can review.</p>
            <div className="space-y-1.5"><Label>Name / brand *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name or handle" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(787) 555-0123" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Main platform</Label><Input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="Instagram, TikTok, YouTube…" /></div>
              <div className="space-y-1.5"><Label>Audience size</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. 25k followers" /></div>
            </div>
            <div className="space-y-1.5"><Label>Main social handle *</Label><Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle or profile link" /></div>
            <div className="space-y-1.5"><Label>Other social links</Label><Input value={otherSocials} onChange={(e) => setOtherSocials(e.target.value)} placeholder="TikTok, YouTube, etc. (comma separated)" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Content niche</Label><Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Travel, food, lifestyle…" /></div>
              <div className="space-y-1.5"><Label>Website / media kit</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Optional link" /></div>
            </div>
            <div className="space-y-1.5"><Label>Tell us about your audience</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Where you post, who follows you, why you love PR…" className="min-h-[80px]" /></div>
            <Button onClick={apply} disabled={submitting} className="w-full gap-2">{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Submit application</Button>
          </div>
        )}
      </div>
    </div>
  );
}
