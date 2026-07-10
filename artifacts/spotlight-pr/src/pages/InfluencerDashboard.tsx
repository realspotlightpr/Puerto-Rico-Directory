import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, DollarSign, Users, Share2, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const SITE = "https://spotlightpuertorico.com";

export default function InfluencerDashboard() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inf, setInf] = useState<any | null>(null);
  const [refs, setRefs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("influencers").select("*").eq("user_id", user.id).maybeSingle();
        setInf(data ?? null);
        if (data) {
          const { data: r } = await supabase.from("influencer_referrals").select("*").eq("influencer_id", data.id).order("created_at", { ascending: false });
          setRefs(r ?? []);
        }
      }
      setLoading(false);
    })();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3"><Megaphone className="w-10 h-10 text-primary" /><Button onClick={() => openAuthModal?.()}>Sign in</Button></div>;
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!inf) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3 px-4">
      <Megaphone className="w-10 h-10 text-primary" />
      <h1 className="font-display text-2xl font-bold">Become a Spotlight Creator</h1>
      <p className="text-muted-foreground max-w-sm">Earn for every signup you bring in, with your own dashboard and branded page.</p>
      <Link href="/influencers"><Button>Apply now</Button></Link>
    </div>
  );
  if (inf.status !== "approved") return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3 px-4">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <h1 className="font-display text-xl font-bold">Application {inf.status === "applied" ? "under review" : inf.status}</h1>
      <p className="text-muted-foreground max-w-sm">{inf.status === "applied" ? "We're reviewing your application — hang tight!" : "Reach out if you have questions."}</p>
    </div>
  );

  const signups = refs.filter((r) => r.kind === "signup").length;
  const paid = refs.filter((r) => r.kind === "paid").length;
  const earned = refs.reduce((s, r) => s + r.amount_cents, 0);
  const link = `${SITE}/i/${inf.slug}`;
  const copy = (t: string, m: string) => { navigator.clipboard.writeText(t).then(() => toast({ title: m })); };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-1">Creator dashboard</h1>
      <p className="text-muted-foreground text-sm mb-6">{inf.display_name}</p>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-fuchsia-600 to-primary text-white rounded-2xl p-4"><p className="text-xs text-white/85 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Earned</p><p className="text-3xl font-bold font-display mt-1">${(earned / 100).toFixed(2)}</p></div>
        <div className="bg-white border rounded-2xl p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Free signups</p><p className="text-2xl font-bold font-display mt-1">{signups}</p></div>
        <div className="bg-white border rounded-2xl p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Paid signups</p><p className="text-2xl font-bold font-display mt-1">{paid}</p></div>
      </div>

      <div className="bg-white border rounded-2xl p-5 mb-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Your code</p>
          <div className="flex items-center gap-2"><code className="flex-1 bg-muted rounded-lg px-3 py-2 font-bold">{inf.code}</code><Button variant="outline" size="sm" onClick={() => copy(inf.code, "Code copied")} className="gap-1"><Copy className="w-4 h-4" /></Button></div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Your landing page</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm truncate">{link}</code>
            <Button variant="outline" size="sm" onClick={() => copy(link, "Link copied")} className="gap-1"><Share2 className="w-4 h-4" /></Button>
            <a href={`/i/${inf.slug}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button></a>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Every signup and Pass purchase through your page or code counts toward your earnings.</p>
        </div>
      </div>

      <h2 className="font-display font-bold mb-2">Recent referrals</h2>
      {refs.length === 0 ? <p className="text-sm text-muted-foreground">No referrals yet — share your link to get started.</p> : (
        <div className="space-y-2">
          {refs.slice(0, 25).map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="capitalize">{r.kind === "paid" ? "💳 Paid signup" : "✨ Free signup"}</span>
              <span className="text-muted-foreground">+${(r.amount_cents / 100).toFixed(2)} · {new Date(r.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
