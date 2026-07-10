import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Loader2, CalendarCheck, Phone, Mail, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUSES = ["requested", "confirmed", "completed", "cancelled"];
const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminBookings() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) setLocation("/");
  }, [authLoading, isAuthenticated, user, setLocation]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("bookings").select("*, services(title, provider)").order("created_at", { ascending: false });
      setRows(data || []);
    } catch { setRows([]); } finally { setLoading(false); }
  };
  useEffect(() => { if (!authLoading && user?.role === "admin") load(); /* eslint-disable-next-line */ }, [authLoading, user]);

  const setStatus = async (id: number, status: string) => {
    setRows((r) => r.map((b) => (b.id === id ? { ...b, status } : b)));
    await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  };

  if (authLoading || user?.role !== "admin") return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const pending = rows.filter((r) => r.status === "requested").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <Link href="/admin"><Button variant="outline" size="sm" className="gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Admin</Button></Link>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2"><CalendarCheck className="w-6 h-6 text-primary" /> Experience Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} total{pending > 0 ? ` · ${pending} awaiting response` : ""}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-14 text-center">
            <CalendarCheck className="w-12 h-12 text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-semibold">No bookings yet</p>
            <p className="text-sm text-muted-foreground">Booking requests from experience pages will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-border shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold font-display">{b.services?.title || "Experience"}</p>
                      {b.services?.provider && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white">✦ {b.services.provider}</span>}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[b.status] || "bg-muted"}`}>{b.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {b.customer_name || "Guest"} · {b.requested_date}{b.requested_time ? ` ${b.requested_time}` : ""}
                      {b.party_size ? <span className="inline-flex items-center gap-1 ml-2"><Users className="w-3.5 h-3.5" />{b.party_size}</span> : null}
                      {b.amount != null ? <span className="ml-2 font-semibold text-foreground">${b.amount}</span> : null}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                      {b.customer_phone && <a href={`tel:${b.customer_phone}`} className="text-primary hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{b.customer_phone}</a>}
                      {b.customer_email && <a href={`mailto:${b.customer_email}`} className="text-primary hover:underline flex items-center gap-1"><Mail className="w-3 h-3" />{b.customer_email}</a>}
                      <Link href={`/profile/${b.guide_id}`} className="text-muted-foreground hover:text-primary">View guide</Link>
                    </div>
                    {b.message && <p className="text-sm text-muted-foreground mt-2 bg-muted/40 rounded-lg px-3 py-2">{b.message}</p>}
                  </div>
                  <select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)} className="text-sm rounded-xl border border-border px-3 py-2 bg-white shrink-0 capitalize">
                    {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Requested {new Date(b.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
