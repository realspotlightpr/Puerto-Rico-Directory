import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2, X, Upload, Waves, Palmtree, Compass, ArrowLeft, Star, Image as ImageIcon } from "lucide-react";

const ACT_TYPES = ["beach", "snorkeling", "surfing", "waterfall", "cave", "bioluminescent", "hiking", "scenic", "zipline", "diving"];
const slugify = (s: string) => (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function uid(): Promise<string | null> {
  try { const { data } = await supabase.auth.getUser(); return data.user?.id ?? null; } catch { return null; }
}
async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
  const { error } = await supabase.storage.from("business-media").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return supabase.storage.from("business-media").getPublicUrl(path).data.publicUrl;
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-5 py-3 flex items-center justify-between z-10">
          <h3 className="font-display font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }: any) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function PhotoField({ value, onChange, folder }: { value: string; onChange: (v: string) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const onFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadPhoto(file, folder)); }
    catch (err: any) { toast({ title: "Upload failed", description: err?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <Label>Photo</Label>
      {value ? <img src={value} alt="" className="w-full h-40 object-cover rounded-xl border" /> : <div className="w-full h-40 rounded-xl border border-dashed flex items-center justify-center text-muted-foreground text-sm"><ImageIcon className="w-5 h-5 mr-2" /> No photo yet</div>}
      <div className="flex gap-2">
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Paste image URL…" className="flex-1" />
        <label className="shrink-0">
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer text-sm font-medium hover:bg-muted">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload</span>
        </label>
      </div>
    </div>
  );
}

function ActivityEditor({ row, surf, onClose, onSaved }: any) {
  const { toast } = useToast();
  const [f, setF] = useState<any>(() => ({
    name: "", activity_type: surf ? "surfing" : "beach", municipality: "", region: "", description: "",
    highlights: "", image_url: "", difficulty: "", best_season: "", is_free: true, featured: false,
    status: "approved", provider: "", latitude: "", longitude: "", live_feed_url: "", live_feed_type: "iframe",
    feed_partner: "", wave_summary: "", ...(row || {}),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.name?.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: f.name.trim(), activity_type: f.activity_type, municipality: f.municipality || null, region: f.region || null,
        description: f.description || null, highlights: f.highlights || null, image_url: f.image_url || null,
        difficulty: f.difficulty || null, best_season: f.best_season || null, is_free: !!f.is_free, featured: !!f.featured,
        status: f.status || "approved", provider: f.provider || null,
        latitude: f.latitude === "" || f.latitude == null ? null : Number(f.latitude),
        longitude: f.longitude === "" || f.longitude == null ? null : Number(f.longitude),
        live_feed_url: f.live_feed_url || null, live_feed_type: f.live_feed_type || null,
        feed_partner: f.feed_partner || null, wave_summary: f.wave_summary || null,
      };
      let error;
      if (row?.id) {
        ({ error } = await supabase.from("activities").update(payload).eq("id", row.id));
      } else {
        payload.slug = slugify(f.name) + "-" + Math.random().toString(36).slice(2, 6);
        payload.created_by = await uid();
        ({ error } = await supabase.from("activities").insert(payload));
      }
      if (error) throw error;
      toast({ title: row?.id ? "Saved" : "Created" });
      onSaved();
    } catch (e: any) { toast({ title: "Save failed", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={(row?.id ? "Edit" : "New") + (surf ? " surf cam" : " place")} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name *"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Type">
          <select value={f.activity_type} onChange={(e) => set("activity_type", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background capitalize">
            {ACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Municipality"><Input value={f.municipality || ""} onChange={(e) => set("municipality", e.target.value)} /></Field>
        <Field label="Region"><Input value={f.region || ""} onChange={(e) => set("region", e.target.value)} /></Field>
      </div>
      <Field label="Description"><Textarea value={f.description || ""} onChange={(e) => set("description", e.target.value)} className="min-h-[80px]" /></Field>
      <Field label="Highlights / good to know"><Textarea value={f.highlights || ""} onChange={(e) => set("highlights", e.target.value)} className="min-h-[60px]" /></Field>
      <PhotoField value={f.image_url} onChange={(v) => set("image_url", v)} folder="activities" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Difficulty"><Input value={f.difficulty || ""} onChange={(e) => set("difficulty", e.target.value)} placeholder="easy…" /></Field>
        <Field label="Best season"><Input value={f.best_season || ""} onChange={(e) => set("best_season", e.target.value)} /></Field>
        <Field label="Latitude"><Input value={f.latitude ?? ""} onChange={(e) => set("latitude", e.target.value)} /></Field>
        <Field label="Longitude"><Input value={f.longitude ?? ""} onChange={(e) => set("longitude", e.target.value)} /></Field>
      </div>
      {f.activity_type === "surfing" && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 space-y-3">
          <p className="text-sm font-semibold text-cyan-800 flex items-center gap-1.5"><Waves className="w-4 h-4" /> Live surf cam</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Live feed URL"><Input value={f.live_feed_url || ""} onChange={(e) => set("live_feed_url", e.target.value)} placeholder="https://…" /></Field>
            <Field label="Feed type">
              <select value={f.live_feed_type || "iframe"} onChange={(e) => set("live_feed_type", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background">
                <option value="iframe">Embed (iframe)</option>
                <option value="image">Image / snapshot</option>
              </select>
            </Field>
            <Field label="Camera partner"><Input value={f.feed_partner || ""} onChange={(e) => set("feed_partner", e.target.value)} /></Field>
            <Field label="Wave summary"><Input value={f.wave_summary || ""} onChange={(e) => set("wave_summary", e.target.value)} /></Field>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <Field label="Status">
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background">
            <option value="approved">Approved (live)</option>
            <option value="pending">Pending</option>
            <option value="rejected">Hidden</option>
          </select>
        </Field>
        <Field label="Provider"><Input value={f.provider || ""} onChange={(e) => set("provider", e.target.value)} placeholder="e.g. Spotlight Puerto Rico" /></Field>
        <div className="flex items-center gap-4 pb-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.is_free} onChange={(e) => set("is_free", e.target.checked)} /> Free</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured</label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</Button>
      </div>
    </Modal>
  );
}

function ServiceEditor({ row, onClose, onSaved }: any) {
  const { toast } = useToast();
  const [f, setF] = useState<any>(() => ({
    title: "", activity_type: "snorkeling", description: "", price: "", price_unit: "per_person",
    duration_minutes: "", max_group_size: "", municipality: "", meeting_point: "", status: "active",
    provider: "Spotlight Puerto Rico", images: [], ...(row || {}),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const img0 = (f.images && f.images[0]) || "";
  const save = async () => {
    if (!f.title?.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: f.title.trim(), activity_type: f.activity_type || null, description: f.description || null,
        price: f.price === "" || f.price == null ? null : Number(f.price), price_unit: f.price_unit || "per_person",
        duration_minutes: f.duration_minutes ? Number(f.duration_minutes) : null,
        max_group_size: f.max_group_size ? Number(f.max_group_size) : null,
        municipality: f.municipality || null, meeting_point: f.meeting_point || null,
        status: f.status || "active", provider: f.provider || null,
        images: f.images && f.images.length ? f.images : null,
      };
      let error;
      if (row?.id) {
        ({ error } = await supabase.from("services").update(payload).eq("id", row.id));
      } else {
        payload.slug = slugify(f.title) + "-" + Math.random().toString(36).slice(2, 6);
        payload.guide_id = await uid();
        ({ error } = await supabase.from("services").insert(payload));
      }
      if (error) throw error;
      toast({ title: row?.id ? "Saved" : "Created" });
      onSaved();
    } catch (e: any) { toast({ title: "Save failed", description: e?.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={(row?.id ? "Edit" : "New") + " experience"} onClose={onClose}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title *"><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Type">
          <select value={f.activity_type} onChange={(e) => set("activity_type", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background capitalize">
            {ACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description"><Textarea value={f.description || ""} onChange={(e) => set("description", e.target.value)} className="min-h-[80px]" /></Field>
      <PhotoField value={img0} onChange={(v) => set("images", v ? [v] : [])} folder="experiences" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Price ($)"><Input type="number" value={f.price ?? ""} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="Per">
          <select value={f.price_unit} onChange={(e) => set("price_unit", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background">
            <option value="per_person">person</option><option value="per_group">group</option>
          </select>
        </Field>
        <Field label="Duration (min)"><Input type="number" value={f.duration_minutes ?? ""} onChange={(e) => set("duration_minutes", e.target.value)} /></Field>
        <Field label="Max group"><Input type="number" value={f.max_group_size ?? ""} onChange={(e) => set("max_group_size", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Municipality"><Input value={f.municipality || ""} onChange={(e) => set("municipality", e.target.value)} /></Field>
        <Field label="Meeting point"><Input value={f.meeting_point || ""} onChange={(e) => set("meeting_point", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Status">
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm bg-background">
            <option value="active">Active (live)</option>
            <option value="paused">Paused</option>
          </select>
        </Field>
        <Field label="Provider"><Input value={f.provider || ""} onChange={(e) => set("provider", e.target.value)} placeholder="e.g. Spotlight Puerto Rico" /></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving} className="gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Save</Button>
      </div>
    </Modal>
  );
}

export default function AdminContent() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const [tab, setTab] = useState<"places" | "surf" | "experiences">(() => { const t = new URLSearchParams(window.location.search).get("tab"); return t === "surf" ? "surf" : t === "experiences" ? "experiences" : "places"; });
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "experiences") {
        const { data } = await supabase.from("services").select("*").order("created_at", { ascending: false });
        setRows(data || []);
      } else {
        const { data } = await supabase.from("activities").select("*").order("featured", { ascending: false }).order("name");
        const all = data || [];
        setRows(tab === "surf" ? all.filter((a: any) => a.activity_type === "surfing") : all.filter((a: any) => a.activity_type !== "surfing"));
      }
    } catch { setRows([]); } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const del = async (id: number) => {
    if (!confirm("Delete this permanently?")) return;
    const table = tab === "experiences" ? "services" : "activities";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Deleted" }); load();
  };

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3"><p className="font-semibold">Admins only.</p><Link href="/"><Button variant="outline">Home</Button></Link></div>;

  const TABS = [
    { id: "places", label: "Places", icon: Palmtree },
    { id: "surf", label: "Surf Cams", icon: Waves },
    { id: "experiences", label: "Experiences", icon: Compass },
  ];
  const newLabel = tab === "experiences" ? "experience" : tab === "surf" ? "surf cam" : "place";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <Link href="/admin"><Button variant="outline" size="sm" className="gap-1"><ArrowLeft className="w-4 h-4" /> Admin</Button></Link>
            <h1 className="font-display text-xl font-bold">Places &amp; Experiences</h1>
          </div>
          <Button onClick={() => setEditing({ type: tab, row: null })} className="gap-2"><Plus className="w-4 h-4" /> New {newLabel}</Button>
        </div>

        <div className="flex gap-2 mb-5 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)} className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${active ? "bg-primary text-white" : "bg-white border text-foreground hover:bg-muted"}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {loading ? <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div> : (
          <div className="grid grid-cols-1 gap-3">
            {rows.length === 0 && <p className="text-muted-foreground text-center py-10">Nothing here yet. Tap "New {newLabel}".</p>}
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border shadow-sm p-3 flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {(r.image_url || (r.images && r.images[0])) ? <img src={r.image_url || r.images[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{r.name || r.title}</p>
                    {r.featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                    {r.provider && <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">{r.provider}</span>}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${["approved", "active"].includes(r.status) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.activity_type}{r.municipality ? " · " + r.municipality : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="outline" onClick={() => setEditing({ type: tab, row: r })}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => del(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && editing.type !== "experiences" && (
        <ActivityEditor row={editing.row} surf={editing.type === "surf"} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {editing && editing.type === "experiences" && (
        <ServiceEditor row={editing.row} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}
