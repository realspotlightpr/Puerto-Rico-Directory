import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, Mail, Phone, CheckCircle2, XCircle, Building2, Clock } from "lucide-react";

type Claim = {
  id: number;
  business_id: number;
  claimant_name: string;
  claimant_email: string;
  claimant_phone: string | null;
  message: string | null;
  status: string;
  proof_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  businesses?: { name: string | null; municipality: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700",
  proof_requested: "bg-blue-100 text-blue-700",
  under_review: "bg-violet-100 text-violet-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export function ClaimsSection() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("open");
  const [reviewing, setReviewing] = useState<{ claim: Claim; action: "approve" | "reject" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_claims")
        .select("*, businesses(name, municipality)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setClaims((data as Claim[]) ?? []);
    } catch (err: any) {
      toast({ title: "Couldn't load claims", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function act(claim: Claim, action: "approve" | "reject", reason?: string) {
    setBusyId(claim.id);
    try {
      const { data, error } = await supabase.functions.invoke("claims", {
        body: { action, claimId: claim.id, reason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: action === "approve" ? "Claim approved ✓" : "Claim rejected",
        description: action === "approve"
          ? "Owner account created and login emailed to the claimant."
          : "The claimant has been notified.",
      });
      await load();
      setReviewing(null);
      setDecisionNote("");
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  const visible = claims.filter((c) =>
    filter === "all" ? true : filter === "open" ? !["approved", "rejected"].includes(c.status) : c.status === filter
  );
  const openCount = claims.filter((c) => !["approved", "rejected"].includes(c.status)).length;

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Business Ownership Claims</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When someone claims a business, they're asked (by email + SMS) to send proof of ownership. Verify the proof in
            GoHighLevel, then <strong>Approve</strong> here to auto-create their owner account, email their login, and start the welcome flow.
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: "open", label: `Needs Review (${openCount})` },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" },
          { id: "all", label: "All" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${filter === f.id ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-slate-50"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading claims…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-bold font-display mb-2">No claims here</h3>
          <p className="text-muted-foreground text-sm">When owners claim their listings, they'll show up here for review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => {
            const isOpen = !["approved", "rejected"].includes(c.status);
            return (
              <div key={c.id} className="bg-white border border-border rounded-2xl shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{c.businesses?.name || `Business #${c.business_id}`}</span>
                      {c.businesses?.municipality && <span className="text-xs text-muted-foreground">· {c.businesses.municipality}</span>}
                      <Badge className={`text-xs ${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-700"}`}>{c.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <span className="font-medium">{c.claimant_name}</span>
                      <a href={`mailto:${c.claimant_email}`} className="flex items-center gap-1 text-primary"><Mail className="w-3.5 h-3.5" />{c.claimant_email}</a>
                      {c.claimant_phone && <a href={`tel:${c.claimant_phone}`} className="flex items-center gap-1 text-primary"><Phone className="w-3.5 h-3.5" />{c.claimant_phone}</a>}
                    </div>
                    {c.message && <p className="text-sm text-muted-foreground italic">"{c.message}"</p>}
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />Submitted {new Date(c.created_at).toLocaleString()}</p>
                  </div>

                  {isOpen && (
                    <div className="flex gap-2 shrink-0">
                      <Button onClick={() => { setReviewing({ claim: c, action: "approve" }); setDecisionNote(""); }} disabled={busyId === c.id} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Review approval
                      </Button>
                      <Button onClick={() => { setReviewing({ claim: c, action: "reject" }); setDecisionNote(""); }} disabled={busyId === c.id} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <XCircle className="w-4 h-4 mr-1" /> Review rejection
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <button className="absolute inset-0 bg-slate-950/60" onClick={() => setReviewing(null)} aria-label="Close review" />
          <section className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Final review</p>
            <h3 className="font-display text-2xl font-bold mt-2">{reviewing.action === "approve" ? "Approve ownership claim" : "Reject ownership claim"}</h3>
            <p className="text-sm text-muted-foreground mt-2">{reviewing.claim.claimant_name} · {reviewing.claim.claimant_email}<br />{reviewing.claim.businesses?.name || `Business #${reviewing.claim.business_id}`}</p>
            <div className={`mt-5 rounded-xl p-4 text-sm ${reviewing.action === "approve" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
              {reviewing.action === "approve" ? "Approval creates or connects the owner account, assigns the listing, and sends login instructions." : "Rejection closes the claim and notifies the claimant. Add a clear reason so they know what to correct."}
            </div>
            <label className="block mt-5 text-sm font-medium" htmlFor="decision-note">{reviewing.action === "approve" ? "Internal verification note (optional)" : "Reason sent to claimant"}</label>
            <textarea id="decision-note" value={decisionNote} onChange={event => setDecisionNote(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-border p-3 text-sm" placeholder={reviewing.action === "approve" ? "Example: matched business-domain email and public phone." : "Explain what proof is missing or why the claim cannot be approved."} />
            <div className="mt-5 flex gap-2"><Button variant="outline" onClick={() => setReviewing(null)} className="h-11">Cancel</Button><Button disabled={busyId === reviewing.claim.id || (reviewing.action === "reject" && decisionNote.trim().length < 5)} onClick={() => act(reviewing.claim, reviewing.action, decisionNote.trim() || undefined)} className={`h-11 flex-1 ${reviewing.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>{busyId === reviewing.claim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : reviewing.action === "approve" ? "Confirm approval" : "Confirm rejection"}</Button></div>
          </section>
        </div>
      )}
    </div>
  );
}
