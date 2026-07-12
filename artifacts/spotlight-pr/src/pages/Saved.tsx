import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Loader2, Bookmark, Trash2, ArrowRight, Compass, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Saved() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { const { data } = await supabase.from("saved_items").select("*").order("created_at", { ascending: false }); setItems(data || []); }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isAuthenticated]);
  const del = async (id: number) => { setItems((x) => x.filter((i) => i.id !== id)); await supabase.from("saved_items").delete().eq("id", id); };

  if (!isAuthenticated) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
      <Bookmark className="w-10 h-10 text-primary" />
      <h1 className="font-display text-2xl font-bold">Your saved spots</h1>
      <p className="text-muted-foreground max-w-sm">Create a free account to save places, businesses, and experiences.</p>
      <Button onClick={() => openAuthModal?.()}>Create free account</Button>
    </div>
  );
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const kinds = Array.from(new Set(items.map((item) => String(item.kind || "other").toLowerCase())));
  const visibleItems = filter === "all" ? items : items.filter((item) => String(item.kind || "other").toLowerCase() === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24 md:pb-10">
      <div className="bg-gradient-to-br from-slate-950 via-teal-950 to-primary text-white">
        <div className="container mx-auto px-4 py-9 max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Your Puerto Rico shortlist</p>
          <div className="flex items-end justify-between gap-4 mt-2"><div><h1 className="font-display text-3xl font-bold text-white">Saved favorites</h1><p className="text-white/70 mt-1">Everything you want to eat, see, and experience—kept in one place.</p></div><div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 items-center justify-center"><Heart className="w-7 h-7 text-rose-300 fill-rose-300" /></div></div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-7 max-w-5xl">
      {items.length === 0 ? (
        <div className="bg-white border border-dashed rounded-2xl p-12 text-center">
          <Bookmark className="w-10 h-10 text-primary/40 mx-auto mb-3" />
          <p className="font-semibold mb-1">Nothing saved yet</p>
          <p className="text-sm text-muted-foreground mb-4">Tap “Save” on any place, business, or experience.</p>
          <Link href="/directory"><Button className="gap-2"><Compass className="w-4 h-4" /> Explore</Button></Link>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-5"><div className="flex gap-2 overflow-x-auto pb-1"><button onClick={() => setFilter("all")} className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold ${filter === "all" ? "bg-primary text-white" : "bg-white border"}`}>All {items.length}</button>{kinds.map((kind) => <button key={kind} onClick={() => setFilter(kind)} className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold capitalize ${filter === kind ? "bg-primary text-white" : "bg-white border"}`}>{kind}</button>)}</div><Link href="/discover"><Button size="sm" className="hidden sm:flex gap-1.5"><Sparkles className="w-4 h-4" /> Find more</Button></Link></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((it) => (
            <div key={it.id} className="group bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all">
              <Link href={it.href}>
                <div className="h-36 bg-muted overflow-hidden relative">{it.img ? <img src={it.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-gradient-to-br from-teal-400 to-cyan-600" />}<span className="absolute top-3 left-3 rounded-full bg-black/55 text-white text-[10px] font-bold uppercase px-2.5 py-1 backdrop-blur capitalize">{it.kind || "favorite"}</span></div>
                <div className="p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-display font-bold truncate">{it.name || "Saved item"}</p><p className="text-xs text-primary font-semibold mt-1">Open details</p></div><ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" /></div>
              </Link>
              <button onClick={() => del(it.id)} className="mx-4 mb-4 text-xs text-muted-foreground hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
            </div>
          ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
