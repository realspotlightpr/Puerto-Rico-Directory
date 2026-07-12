import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdConfig = { enabled?: boolean; clientId?: string; slotId?: string };
declare global { interface Window { adsbygoogle?: unknown[] } }

export function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  const [config, setConfig] = useState<AdConfig | null>(null);
  const pushed = useRef(false);
  useEffect(() => {
    (async () => {
      const { data: setting } = await supabase.from("platform_settings").select("value").eq("key", "adsense").maybeSingle();
      const value = (setting as any)?.value as AdConfig | undefined;
      if (!value?.enabled || !value.clientId || !value.slotId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: account } = await supabase.from("users").select("plan_id, plan_ends_at").eq("id", user.id).maybeSingle();
        const activePass = !!account && ["spotlight_pass", "travel_pass"].includes((account as any).plan_id) && (!(account as any).plan_ends_at || new Date((account as any).plan_ends_at) > new Date());
        if (activePass) return;
      }
      setConfig(value);
      if (!document.getElementById("spotlight-adsense-script")) {
        const script = document.createElement("script"); script.id = "spotlight-adsense-script"; script.async = true; script.crossOrigin = "anonymous";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(value.clientId)}`;
        document.head.appendChild(script);
      }
    })();
  }, []);
  useEffect(() => {
    if (!config || pushed.current) return;
    const timer = window.setTimeout(() => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true; } catch { /* not ready */ } }, 500);
    return () => window.clearTimeout(timer);
  }, [config]);
  if (!config) return null;
  return <div className={`my-7 min-h-[90px] rounded-2xl border border-border/50 bg-white/70 p-2 text-center overflow-hidden ${className}`} aria-label="Advertisement" data-ad-placement={placement}><span className="block text-[9px] uppercase tracking-widest text-muted-foreground/60 mb-1">Advertisement</span><ins className="adsbygoogle block" style={{ display: "block" }} data-ad-client={config.clientId} data-ad-slot={config.slotId} data-ad-format="auto" data-full-width-responsive="true" /></div>;
}
