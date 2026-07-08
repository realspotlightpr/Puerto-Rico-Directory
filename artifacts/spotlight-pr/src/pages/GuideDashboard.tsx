import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { supabase } from "@/lib/supabase";
import { Compass, Plus, Loader2, MapPin, Clock, Users, DollarSign, Trash2, Pause, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const ACTIVITY_TYPES = ["snorkeling", "surfing", "hiking", "cave", "waterfall", "bioluminescent", "diving", "zipline", "scenic", "beach", "other"];

type GuideProfile = { user_id: string; display_name: string | null; bio: string | null; specialties: string[] | null; languages: string[] | null; phone: string | null; municipality: string | null; is_verified: boolean };
type Service = { id: number; title: string; activity_type: string | null; description: string | null; price: number | null; price_unit: string; duration_minutes: number | null; max_group_size: number | null; municipality: string | null; meeting_point: string | null; status: string };

export default function GuideDashboard() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // profile form
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [languages, setLanguages] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcType, setSvcType] = useState("snorkeling");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcUnit, setSvcUnit] = useState("per_person");
  const [svcDuration, setSvcDuration] = useState("");
  const [svcGroup, setSvcGroup] = useState("");
  const [svcMuni, setSvcMuni] = useState("");
  const [svcMeeting, setSvcMeeting] = useState("");
  const [savingSvc, setSavingSvc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUid(user.id);
      const { data: prof } = await supabase.from("guide_profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile((prof as GuideProfile) ?? null);
      if (prof) {
        setDisplayName(prof.display_name ?? ""); setBio(prof.bio ?? "");
        setSpecialties((prof.specialties ?? []).join(", ")); setLanguages((prof.languages ?? []).join(", "));
        setMunicipality(prof.municipality ?? ""); setPhone(prof.phone ?? "");
        const { data: svcs } = await supabase.from("services").select("*").eq("guide_id", user.id).order("created_at", { ascending: false });
        setServices((svcs as Service[]) ?? []);
        const { data: bks } = await supabase.from("bookings").select("*").eq("guide_id", user.id).order("created_at", { ascending: false });
        setBookings(bks ?? []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    if (!uid) return;
    if (!displayName.trim()) { toast({ title: "Add your guide name", variant: "destructive" }); return; }
    setSavingProfile(true);
    try {
      const toArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      const { error } = await supabase.from("guide_profiles").upsert({
        user_id: uid, display_name: displayName.trim(), bio: bio.trim() || null,
        specialties: toArr(specialties), languages: toArr(languages),
        municipality: municipality.trim() || null, phone: phone.trim() || null, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      // opt in to the tour_guide role (allowed for self by the role guard)
      await supabase.from("users").update({ role: "tour_guide" }).eq("id", uid);
      toast({ title: "You're a Spotlight guide! 🧭" });
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't save profile", description: e?.message, variant: "destructive" });
    } finally { setSavingProfile(false); }
  };

  const addService = async () => {
    if (!uid) return;
    if (!svcTitle.trim()) { toast({ title: "Give your experience a title", variant: "destructive" }); return; }
    setSavingSvc(true);
    try {
      const { error } = await supabase.from("services").insert({
        guide_id: uid, title: svcTitle.trim(), activity_type: svcType,
        description: svcDesc.trim() || null,
        price: svcPrice ? Number(svcPrice) : null, price_unit: svcUnit,
        duration_minutes: svcDuration ? Number(svcDuration) : null,
        max_group_size: svcGroup ? Number(svcGroup) : null,
        municipality: svcMuni.trim() || null, meeting_point: svcMeeting.trim() || null,
        status: "active",
      });
      if (error) throw error;
      toast({ title: "Experience listed!" });
      setSvcTitle(""); setSvcDesc(""); setSvcPrice(""); setSvcDuration(""); setSvcGroup(""); setSvcMuni(""); setSvcMeeting("");
      setShowServiceForm(false);
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't list experience", description: e?.message, variant: "destructive" });
    } finally { setSavingSvc(false); }
  };

  const toggleService = async (s: Service) => {
    const next = s.status === "active" ? "paused" : "active";
    await supabase.from("services").update({ status: next }).eq("id", s.id);
    setServices((prev) => prev.map((x) => x.id === s.id ? { ...x, status: next } : x));
  };
  const deleteService = async (s: Service) => {
    await supabase.from("services").delete().eq("id", s.id);
    setServices((prev) => prev.filter((x) => x.id !== s.id));
  };
  const setBookingStatus = async (id: number, status: string) => {
    await supabase.from("bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    toast({ title: status === "confirmed" ? "Booking confirmed" : status === "declined" ? "Booking declined" : "Updated" });
  };
  const svcTitleById = (id: number) => services.find((s) => s.id === id)?.title || "Experience";

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <Compass className="w-12 h-12 text-primary mb-4" />
        <h1 className="font-display text-2xl font-bold mb-2">Become a Spotlight Guide</h1>
        <p className="text-muted-foreground max-w-md mb-6">Sign in to create your guide profile and list snorkeling trips, hikes, cave tours, and experiences for travelers to book.</p>
        <Button onClick={() => openAuthModal?.()}>Sign in to get started</Button>
      </div>
    );
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const inputCls = "";

  // Onboarding (no profile yet)
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-6">
          <Compass className="w-10 h-10 text-primary mx-auto mb-2" />
          <h1 className="font-display text-2xl font-bold">Set up your guide profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Tell travelers who you are. You can list your experiences next.</p>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
          <div className="space-y-1.5"><Label>Guide / business name *</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Coral Coast Adventures" /></div>
          <div className="space-y-1.5"><Label>Short bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Your experience, certifications, what makes your tours special…" className="min-h-[90px]" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Specialties</Label><Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="snorkeling, hiking, caves" /></div>
            <div className="space-y-1.5"><Label>Languages</Label><Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Spanish" /></div>
            <div className="space-y-1.5"><Label>Municipality</Label><Input value={municipality} onChange={(e) => setMunicipality(e.target.value)} placeholder="Rincón" /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(787) 555-1234" /></div>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} className="w-full gap-2">
            {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Create guide profile</>}
          </Button>
        </div>
      </div>
    );
  }

  // Guide dashboard
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">{profile.display_name} {profile.is_verified && <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Verified</span>}</h1>
          <p className="text-muted-foreground text-sm">{profile.municipality}{profile.specialties?.length ? ` · ${profile.specialties.join(", ")}` : ""}</p>
        </div>
        <Button onClick={() => setShowServiceForm((v) => !v)} className="gap-2"><Plus className="w-4 h-4" /> Add experience</Button>
      </div>

      {showServiceForm && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4 mb-6">
          <h2 className="font-display font-bold">List a new experience</h2>
          <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            Listing is <strong>free</strong>. Spotlight keeps a <strong>10% service fee</strong> on completed bookings — you keep 90% of every tour.
          </p>
          <div className="space-y-1.5"><Label>Title *</Label><Input value={svcTitle} onChange={(e) => setSvcTitle(e.target.value)} placeholder="Sunset snorkel tour at Escambrón" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Type</Label>
              <select value={svcType} onChange={(e) => setSvcType(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background capitalize">
                {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Municipality</Label><Input value={svcMuni} onChange={(e) => setSvcMuni(e.target.value)} placeholder="San Juan" /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="What's included, what to expect, what to bring…" className="min-h-[80px]" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5"><Label>Price ($)</Label><Input type="number" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} placeholder="65" /></div>
            <div className="space-y-1.5"><Label>Per</Label>
              <select value={svcUnit} onChange={(e) => setSvcUnit(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background">
                <option value="per_person">person</option><option value="per_group">group</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Minutes</Label><Input type="number" value={svcDuration} onChange={(e) => setSvcDuration(e.target.value)} placeholder="120" /></div>
            <div className="space-y-1.5"><Label>Max group</Label><Input type="number" value={svcGroup} onChange={(e) => setSvcGroup(e.target.value)} placeholder="8" /></div>
          </div>
          <div className="space-y-1.5"><Label>Meeting point</Label><Input value={svcMeeting} onChange={(e) => setSvcMeeting(e.target.value)} placeholder="Escambrón parking lot" /></div>
          <div className="flex gap-2">
            <Button onClick={addService} disabled={savingSvc} className="gap-2">{savingSvc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} List experience</Button>
            <Button variant="outline" onClick={() => setShowServiceForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-lg font-bold mb-3">Booking requests ({bookings.filter((b) => b.status === "requested").length} pending)</h2>
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl border border-border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{svcTitleById(b.service_id)}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : b.status === "requested" ? "bg-amber-100 text-amber-700" : b.status === "declined" || b.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"}`}>{b.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {b.customer_name || "Traveler"} · {b.party_size} {b.party_size === 1 ? "person" : "people"}{b.requested_date ? ` · ${b.requested_date}` : ""}
                    </p>
                    {(b.customer_email || b.customer_phone) && <p className="text-xs text-muted-foreground mt-0.5">{b.customer_email}{b.customer_email && b.customer_phone ? " · " : ""}{b.customer_phone}</p>}
                    {b.message && <p className="text-sm text-muted-foreground mt-1.5 italic">"{b.message}"</p>}
                  </div>
                  {b.status === "requested" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => setBookingStatus(b.id, "confirmed")}>Confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => setBookingStatus(b.id, "declined")}>Decline</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-bold mb-3">Your experiences ({services.length})</h2>
      {services.length === 0 ? (
        <div className="bg-muted/30 border border-dashed rounded-2xl p-10 text-center text-muted-foreground">No experiences yet — add your first to start taking bookings.</div>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-border shadow-sm p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{s.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                  {s.activity_type && <span className="capitalize">{s.activity_type}</span>}
                  {s.municipality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.municipality}</span>}
                  {s.duration_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</span>}
                  {s.max_group_size && <span className="flex items-center gap-1"><Users className="w-3 h-3" />up to {s.max_group_size}</span>}
                  {s.price != null && <span className="flex items-center gap-1 font-semibold text-foreground"><DollarSign className="w-3 h-3" />{s.price}/{s.price_unit === "per_group" ? "group" : "person"}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleService(s)} title={s.status === "active" ? "Pause" : "Activate"} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">{s.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
                <button onClick={() => deleteService(s)} title="Delete" className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
