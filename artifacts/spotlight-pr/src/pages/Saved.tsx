import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Loader2, Bookmark, Trash2, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Saved() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2"><Bookmark className="w-6 h-6 text-primary" /> Saved</h1>
      {items.length === 0 ? (
        <div className="bg-white border border-dashed rounded-2xl p-12 text-center">
          <Bookmark className="w-10 h-10 text-primary/40 mx-auto mb-3" />
          <p className="font-semibold mb-1">Nothing saved yet</p>
          <p className="text-sm text-muted-foreground mb-4">Tap “Save” on any place, business, or experience.</p>
          <Link href="/directory"><Button className="gap-2"><Compass className="w-4 h-4" /> Explore</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="bg-white rounded-2xl border border-border shadow-sm p-3 flex items-center gap-3">
              <Link href={it.href} className="flex items-center gap-3 flex-1 min-w-0 group">
                <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">{it.img ? <img src={it.img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-teal-400 to-cyan-600" />}</div>
                <div className="min-w-0 flex-1"><p className="font-semibold text-sm truncate">{it.name || "Saved item"}</p>{it.kind && <p className="text-xs text-muted-foreground capitalize">{it.kind}</p>}</div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
              </Link>
              <button onClick={() => del(it.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
