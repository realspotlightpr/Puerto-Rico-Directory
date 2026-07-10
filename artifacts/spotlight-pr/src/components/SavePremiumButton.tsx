import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, X, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SavePremiumButton({ label = "Save / Add to itinerary", className = "" }: { label?: string; className?: string }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPass, setIsPass] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsPass(false); return; }
      const { data } = await supabase.from("users").select("plan_id, plan_ends_at").eq("id", user.id).maybeSingle();
      const p = data as any;
      const active = p && (p.plan_id === "spotlight_pass" || p.plan_id === "travel_pass") && (!p.plan_ends_at || new Date(p.plan_ends_at) > new Date());
      setIsPass(!!active);
    })();
  }, [isAuthenticated]);

  const onClick = () => {
    if (isPass) { toast({ title: "Saved to your itinerary ✨" }); return; }
    setOpen(true);
  };

  return (
    <>
      <Button variant="outline" onClick={onClick} className={`gap-2 ${className}`}><Bookmark className="w-4 h-4" /> {label}</Button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-white flex items-center justify-center mx-auto mb-4"><Sparkles className="w-7 h-7" /></div>
            <h3 className="font-display text-xl font-bold mb-1">Save it with Spotlight Pass</h3>
            <p className="text-sm text-muted-foreground mb-4">Saving favorites and building itineraries is a <strong>Spotlight Pass</strong> perk — plus 5% off every experience and a $5 monthly credit.</p>
            <div className="space-y-2">
              <Link href="/pass"><Button className="w-full gap-2"><Check className="w-4 h-4" /> Get the Pass — $20/mo</Button></Link>
              {!isAuthenticated && <button onClick={() => { setOpen(false); openAuthModal?.(); }} className="text-xs text-muted-foreground hover:text-primary">Already a member? Sign in</button>}
              <button onClick={() => setOpen(false)} className="block w-full text-xs text-muted-foreground hover:text-foreground pt-1">Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
