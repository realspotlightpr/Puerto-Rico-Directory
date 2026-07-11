import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Loader2, Megaphone, ArrowLeft, Check, X as XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminInfluencers() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { if (!authLoading && (!isAuthenticated || user?.role !== "admin")) setLocation("/"); }, [authLoading, isAuthenticated, user, setLocation]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("influencers").select("*").order("applied_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { if (!authLoading && user?.role === "admin") load(); /* eslint-disable-next-line */ }, [authLoading, user]);

  const setStatus = async (id: number, status: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    await supabase.from("influencers").update({ status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", id);
  };

  if (authLoading || user?.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Link href="/admin"><Button variant="outline" size="sm" className="gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Admin</Button></Link>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Creator applications</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.filter((r) => r.status === "applied").length} awaiting review</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No applications yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold font-display flex items-center gap-2">{r.display_name} <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{r.status}</span></p>
                  <p className="text-sm text-muted-foreground mt-0.5">Code <strong>{r.code}</strong> · /i/{r.slug}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm">
                    {r.email && <a href={`mailto:${r.email}`} className="text-primary hover:underline">{r.email}</a>}
                    {r.phone && <a href={`tel:${r.phone}`} className="text-primary hover:underline">{r.phone}</a>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    {r.primary_platform && <span><strong className="text-foreground">Platform:</strong> {r.primary_platform}</span>}
                    {r.audience_size && <span><strong className="text-foreground">Audience:</strong> {r.audience_size}</span>}
                    {r.content_niche && <span><strong className="text-foreground">Niche:</strong> {r.content_niche}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs">
                    {r.social_links && Object.entries(r.social_links).map(([k, v]: any) => v ? <span key={k} className="text-muted-foreground"><strong className="text-foreground capitalize">{k}:</strong> {String(v)}</span> : null)}
                    {r.website && <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.website}</a>}
                  </div>
                  {r.bio && <p className="text-sm text-muted-foreground mt-2 bg-muted/40 rounded-lg px-3 py-2">{r.bio}</p>}
                </div>
                {r.status !== "approved" && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="gap-1" onClick={() => setStatus(r.id, "approved")}><Check className="w-3.5 h-3.5" /> Approve</Button>
                    {r.status !== "rejected" && <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setStatus(r.id, "rejected")}><XIcon className="w-3.5 h-3.5" /> Reject</Button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
