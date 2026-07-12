import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Saving favorites requires a (free) account. Not logged in -> prompt to create one. */
export function SavePremiumButton({ name, img, kind, label = "Save to favorites", className = "", hrefOverride }: { name?: string; img?: string | null; kind?: string; label?: string; className?: string; hrefOverride?: string }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const href = hrefOverride || (typeof window !== "undefined" ? window.location.pathname : "");

  useEffect(() => {
    (async () => {
      if (!isAuthenticated || !href) { setSaved(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("saved_items").select("id").eq("user_id", user.id).eq("href", href).maybeSingle();
      setSaved(!!data);
    })();
  }, [isAuthenticated, href]);

  const toggle = async () => {
    if (!isAuthenticated) { setOpen(true); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setOpen(true); return; }
    if (saved) {
      await supabase.from("saved_items").delete().eq("user_id", user.id).eq("href", href);
      setSaved(false); toast({ title: "Removed from saved" });
    } else {
      const { error } = await supabase.from("saved_items").insert({ user_id: user.id, href, name: name || document.title, img: img || null, kind: kind || null });
      if (error && !String(error.message).includes("duplicate")) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
      setSaved(true); toast({ title: "Saved 🔖", description: "Find it under Saved." });
    }
  };

  return (
    <>
      <Button variant="default" onClick={toggle} className={`gap-2 shadow-md transition-all ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-to-r from-primary to-teal-600 hover:brightness-105"} ${className}`}>
        {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />} {saved ? "Saved" : label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4"><UserPlus className="w-7 h-7" /></div>
            <h3 className="font-display text-xl font-bold mb-1">Create a free account to save</h3>
            <p className="text-sm text-muted-foreground mb-4">Sign up to save your favorite spots and build your Puerto Rico itinerary.</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => { setOpen(false); openAuthModal?.(); }}>Create free account</Button>
              <button onClick={() => setOpen(false)} className="block w-full text-xs text-muted-foreground hover:text-foreground pt-1">Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
