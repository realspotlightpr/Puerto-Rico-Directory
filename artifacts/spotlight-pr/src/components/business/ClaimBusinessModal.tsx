import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, Phone, ShieldCheck, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClaimBusinessModalProps { businessId: number; businessName: string; onClose: () => void; }

export function ClaimBusinessModal({ businessId, businessName, onClose }: ClaimBusinessModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("owner");
  const [proofMethod, setProofMethod] = useState("business_email");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setEmail(current => current || data.user?.email || "");
      setName(current => current || data.user?.user_metadata?.full_name || "");
    }).catch(() => undefined);
  }, []);

  function continueToVerification() {
    setError(null);
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    setStep(2);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const context = [`Relationship: ${relationship.replaceAll("_", " ")}`, `Preferred proof: ${proofMethod.replaceAll("_", " ")}`, message.trim()].filter(Boolean).join(". ");
      const { data, error: fnErr } = await supabase.functions.invoke("claims", { body: { action: "submit", businessId, name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), message: context } });
      if (fnErr) throw fnErr;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(/already|duplicate/i.test(text) ? "A claim for this business is already in review. Check your email for updates or contact support." : text);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="claim-title">
      <button className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" onClick={onClose} aria-label="Close claim form" />
      <div className="relative bg-white w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 text-white/80 hover:text-white p-2" aria-label="Close"><X className="w-5 h-5" /></button>
        <header className="bg-primary px-6 py-7 text-white">
          <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></span><div><p className="text-xs uppercase tracking-[.18em] text-white/70">Free ownership verification</p><h2 id="claim-title" className="text-xl font-bold mt-1">Claim {businessName}</h2></div></div>
          {!done && <div className="mt-6"><div className="flex justify-between text-xs font-semibold"><span>Contact</span><span>Verification</span></div><div className="h-1.5 bg-white/20 rounded-full mt-2"><div className="h-full bg-white rounded-full transition-all" style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>}
        </header>

        <div className="p-6">
          {done ? <div className="py-5 text-center"><CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" /><h3 className="text-xl font-bold">Claim received</h3><p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">We sent the next steps to <strong>{email}</strong>. Our team will review your proof and notify you when the listing is connected to your owner dashboard.</p><div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm"><p className="font-semibold">What happens next</p><ol className="mt-2 space-y-1 text-muted-foreground list-decimal pl-5"><li>Complete the verification request.</li><li>Our team reviews the business connection.</li><li>Approved owners receive dashboard access.</li></ol></div><Button className="mt-6 w-full h-12" onClick={onClose}>Done</Button></div> :
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div role="alert" className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>}
            {step === 1 ? <>
              <div><h3 className="font-bold text-lg">How can we reach you?</h3><p className="text-sm text-muted-foreground mt-1">Use an email you check regularly. Business-domain email is fastest when available.</p></div>
              <Field label="Full name" icon={<User className="w-4 h-4" />}><Input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Ana García" className="pl-10 h-12" autoFocus /></Field>
              <Field label="Email" icon={<Mail className="w-4 h-4" />}><Input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@business.com" className="pl-10 h-12" /></Field>
              <Field label="Mobile number (optional)" icon={<Phone className="w-4 h-4" />}><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="(787) 555-0123" className="pl-10 h-12" /></Field>
              <Button type="button" onClick={continueToVerification} className="w-full h-12">Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </> : <>
              <div><h3 className="font-bold text-lg">Confirm your connection</h3><p className="text-sm text-muted-foreground mt-1">Choose the closest match. No documents are uploaded on this screen.</p></div>
              <div className="space-y-2"><Label htmlFor="relationship">Your role</Label><select id="relationship" value={relationship} onChange={e => setRelationship(e.target.value)} className="w-full h-12 rounded-md border border-input bg-background px-3 text-sm"><option value="owner">Owner</option><option value="manager">Manager</option><option value="authorized_representative">Authorized representative</option></select></div>
              <fieldset className="space-y-2"><legend className="text-sm font-medium">Best way to verify</legend>{[["business_email","Email at the business domain"],["business_phone","Call the public business number"],["document_review","Review a business document"]].map(([value,label]) => <label key={value} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${proofMethod === value ? "border-primary bg-primary/5" : "border-border"}`}><input type="radio" name="proof" value={value} checked={proofMethod === value} onChange={() => setProofMethod(value)} /><span className="text-sm font-medium">{label}</span></label>)}</fieldset>
              <div className="space-y-2"><Label htmlFor="claim-note">Helpful context <span className="font-normal text-muted-foreground">(optional)</span></Label><textarea id="claim-note" value={message} onChange={e => setMessage(e.target.value)} placeholder="Example: I manage this location and can answer the published phone number." rows={3} className="w-full rounded-xl border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button><Button type="submit" className="h-12 flex-1" disabled={loading}>{loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit for review"}</Button></div>
              <p className="text-xs text-muted-foreground text-center">We only use these details to verify ownership and manage this claim.</p>
            </>}
          </form>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>{children}</div></div>;
}
