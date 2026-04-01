import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetAdminStats,
  useAdminListBusinesses,
  useApproveBusiness,
  useRejectBusiness,
  useFeatureBusiness,
  useAdminListReviews,
  useAdminDeleteReview,
  useAdminListUsers,
  useAdminCreateUser,
  useAdminUpdateBusiness,
  useAdminUpdateUser,
  useListCategories,
  useAdminGetLeads,
  useAdminCreateLead,
  useAdminUpdateLead,
  useAdminDeleteLead,
  useAdminListTeam,
  useAdminAddTeamMember,
  useAdminUpdateTeamMember,
  useAdminRemoveTeamMember,
  useAdminImportLeads,
  useAdminDeleteBusiness,
  useAdminDeleteUser,
} from "@workspace/api-client-react";
import type { Lead, TeamMember, ScraperRecord } from "@workspace/api-client-react";
import {
  Shield, Users, Store, MessageSquare, Check, X, Star, Trash2, ShieldAlert, Clock,
  LayoutDashboard, Edit2, Edit3, ChevronRight, Search, Save, Loader2, TrendingUp,
  CheckCircle2, Bell, AlertCircle, UserPlus, Building2, ExternalLink, XCircle,
  Target, Plus, Globe, Phone, Mail, MapPin, BadgeCheck, Link, UserCog, Handshake,
  ToggleLeft, ToggleRight, Key, Briefcase, BarChart3,
  Upload, FileJson, CheckCircle, AlertTriangle, Settings, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { MUNICIPALITIES } from "@/lib/constants";

type AdminSection = "dashboard" | "businesses" | "users" | "reviews" | "notifications" | "leads" | "team" | "settings" | "email-logs";
type BusinessTab = "approved" | "pending" | "rejected" | "all";
type UserRole = "all" | "user" | "business_owner" | "admin";

// ── Schemas ───────────────────────────────────────────────────────────────────

const businessEditSchema = z.object({
  name: z.string().min(2, "Name required"),
  description: z.string().min(5, "Description required"),
  categoryId: z.coerce.number().optional(),
  municipality: z.string().min(1, "Municipality required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, hyphens only").optional().or(z.literal("")),
  status: z.enum(["pending", "approved", "rejected"]),
  featured: z.boolean(),
  isClaimed: z.boolean(),
});

const userEditSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.enum(["user", "business_owner", "admin"]),
  emailVerified: z.boolean().optional(),
});

const addUserSchema = z.object({
  email: z.string().email("A valid email is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["user", "business_owner", "admin"]),
});

const leadSchema = z.object({
  name: z.string().min(2, "Business name is required"),
  description: z.string().min(10, "Please add a short description (min 10 chars)"),
  municipality: z.string().min(1, "Municipality is required"),
  categoryId: z.coerce.number().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type BusinessEditValues = z.infer<typeof businessEditSchema>;
type UserEditValues = z.infer<typeof userEditSchema>;
type AddUserValues = z.infer<typeof addUserSchema>;
type LeadValues = z.infer<typeof leadSchema>;

const PERMISSIONS = [
  { key: "add_businesses", label: "Add Businesses", desc: "Can scout and add new business listings" },
  { key: "approve", label: "Approve / Deny", desc: "Can approve or reject business submissions" },
  { key: "verify", label: "Verify / Feature", desc: "Can mark businesses as verified or featured" },
] as const;

type PermissionKey = "add_businesses" | "approve" | "verify";

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; cur += ch; }
    else if (ch === '\n' && !inQ) { lines.push(cur); cur = ""; }
    else { cur += ch; }
  }
  if (cur) lines.push(cur);

  function splitRow(row: string): string[] {
    const cells: string[] = [];
    let cell = "", q = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (q && row[i + 1] === '"') { cell += '"'; i++; }
        else q = !q;
      } else if (ch === ',' && !q) { cells.push(cell); cell = ""; }
      else cell += ch;
    }
    cells.push(cell);
    return cells;
  }

  if (lines.length < 2) return [];
  const headers = splitRow(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = splitRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? "").trim(); });
    return row;
  });
}

// ── GmbImportDialog ───────────────────────────────────────────────────────────

type GmbPreview = {
  placeId: string;
  name: string;
  address: string;
  municipality: string;
  phone: string | null;
  website: string | null;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  extraPhotos: string[];
  hours: Record<string, string> | null;
  mapsUrl: string;
  rating: number | null;
  reviewCount: number | null;
  types: string[];
};

function GmbImportDialog({
  open, onClose, onSave, categories,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  categories: { id: number; name: string }[];
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GmbPreview | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setUrl("");
    setError(null);
    setPreview(null);
    setSelectedLogo(null);
    setSelectedCover(null);
    setCategoryId("");
    setSaving(false);
  }

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const { customFetch } = await import("@workspace/api-client-react");
      const data = await customFetch<GmbPreview>("/api/admin/leads/gmb-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        credentials: "include",
      });
      setPreview(data);
      setSelectedLogo(data.logoUrl);
      setSelectedCover(data.coverUrl);
    } catch (e: any) {
      setError(e.message || "Failed to fetch business data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      onSave({
        name: preview.name,
        description: preview.description,
        municipality: preview.municipality,
        address: preview.address,
        phone: preview.phone,
        website: preview.website,
        logoUrl: selectedLogo,
        coverUrl: selectedCover,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const allPhotos = preview
    ? [preview.logoUrl, preview.coverUrl, ...preview.extraPhotos].filter(Boolean) as string[]
    : [];

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            Import from Google My Business
          </DialogTitle>
          <DialogDescription>
            Paste a Google Maps or Google My Business link and we'll automatically pull in all the business details including photos, hours, and contact info.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* URL input */}
          <div className="flex gap-2">
            <Input
              placeholder="https://maps.google.com/maps?place_id=... or https://goo.gl/maps/..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFetch()}
              className="flex-1 rounded-xl"
              disabled={loading}
            />
            <Button onClick={handleFetch} disabled={loading || !url.trim()} className="rounded-xl gap-2 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Fetching…" : "Lookup"}
            </Button>
          </div>

          {/* Hint */}
          {!preview && !error && !loading && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 space-y-1">
              <p className="font-semibold">How to get the link:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-emerald-700">
                <li>Search for the business on Google Maps</li>
                <li>Click "Share" → "Copy link"</li>
                <li>Paste the link above and click Lookup</li>
              </ol>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Could not fetch business</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
                <Button size="sm" variant="outline" className="mt-2 rounded-lg h-7 text-xs" onClick={() => setError(null)}>Try again</Button>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              {/* Business header */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-4">
                {selectedLogo && (
                  <img src={selectedLogo} alt={preview.name} className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{preview.name}</p>
                  {preview.address && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{preview.address}</p>}
                  {preview.phone && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{preview.phone}</p>}
                  {preview.website && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Globe className="w-3 h-3" />{preview.website}</p>}
                  {preview.rating && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Star className="w-3 h-3 fill-current" />{preview.rating} ({preview.reviewCount} reviews)</p>}
                </div>
              </div>

              {/* Description */}
              {preview.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</p>
                  <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-xl p-3">{preview.description}</p>
                </div>
              )}

              {/* Photo picker */}
              {allPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photos from Google Maps</p>
                  <p className="text-xs text-muted-foreground mb-2">Click to select logo photo and cover photo (first click = logo, second click on different = cover)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {allPhotos.map((photo, i) => {
                      const isLogo = selectedLogo === photo;
                      const isCover = selectedCover === photo;
                      return (
                        <div
                          key={i}
                          className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isLogo ? "border-emerald-500" : isCover ? "border-blue-500" : "border-transparent hover:border-border"}`}
                          onClick={() => {
                            if (isLogo) { setSelectedLogo(null); }
                            else if (isCover) { setSelectedCover(null); }
                            else if (!selectedLogo) { setSelectedLogo(photo); }
                            else if (!selectedCover) { setSelectedCover(photo); }
                            else { setSelectedLogo(photo); }
                          }}
                        >
                          <img src={photo} alt="" className="w-full h-24 object-cover" />
                          {isLogo && <span className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5">Logo</span>}
                          {isCover && <span className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5">Cover</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Category</p>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hours preview */}
              {preview.hours && Object.keys(preview.hours).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Business Hours</p>
                  <div className="bg-muted/30 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(preview.hours).map(([day, time]) => (
                      <div key={day} className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">{day}</span>
                        <span className="text-muted-foreground">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {preview && (
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => { reset(); onClose(); }} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save to Directory
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoogleMapsImportDialog({
  open, onClose, onImport, isImporting,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (records: ScraperRecord[]) => void;
  isImporting: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [records, setRecords] = useState<ScraperRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function reset() {
    setRecords([]);
    setParseError(null);
    setFileName(null);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          setRecords(arr);
        } else if (file.name.endsWith(".csv")) {
          const rows = parseCSV(text);
          setRecords(rows as ScraperRecord[]);
        } else {
          try {
            const arr = JSON.parse(text);
            setRecords(Array.isArray(arr) ? arr : [arr]);
          } catch {
            setParseError("Unsupported format. Please upload a .json or .csv file from the Google Maps Scraper.");
          }
        }
      } catch {
        setParseError("Could not parse file. Make sure it's valid JSON or CSV output from the Google Maps Scraper.");
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const preview = records.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-violet-500" /> Import from Google Maps Scraper
          </DialogTitle>
          <DialogDescription>
            Upload the JSON or CSV output from{" "}
            <a href="https://github.com/gosom/google-maps-scraper" target="_blank" rel="noopener noreferrer" className="underline text-violet-600">gosom/google-maps-scraper</a>.
            Businesses will be imported as unclaimed listings attributed to Spotlight PR. Up to 500 records per import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Usage hint */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 font-mono">
            <p className="font-semibold text-slate-700 font-sans text-sm">How to run the scraper:</p>
            <p>docker run --rm -v $PWD:/queries gosom/google-maps-scraper \</p>
            <p>&nbsp;&nbsp;-input /queries/queries.txt -json \</p>
            <p>&nbsp;&nbsp;-exit-on-inactivity 3m &gt; results.json</p>
            <p className="font-sans text-slate-500 pt-1">Then upload the <strong>results.json</strong> file below.</p>
          </div>

          {/* Drop zone */}
          {records.length === 0 && !parseError && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-violet-400 bg-violet-50" : "border-border hover:border-violet-300 hover:bg-violet-50/50"}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("gm-import-file")?.click()}
            >
              <Upload className="w-8 h-8 text-violet-400 mx-auto mb-3" />
              <p className="font-semibold text-sm">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .json or .csv from Google Maps Scraper</p>
              <input id="gm-import-file" type="file" accept=".json,.csv" className="hidden" onChange={handleInputChange} />
            </div>
          )}

          {/* Error */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Parse error</p>
                <p className="text-xs text-red-600 mt-0.5">{parseError}</p>
                <Button size="sm" variant="outline" className="mt-3 rounded-lg h-7 text-xs" onClick={reset}>Try another file</Button>
              </div>
            </div>
          )}

          {/* Parsed result */}
          {records.length > 0 && (
            <div className="space-y-3">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-violet-500" />
                  <div>
                    <p className="font-semibold text-sm text-violet-900">{fileName}</p>
                    <p className="text-xs text-violet-700">{records.length} businesses parsed and ready to import</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="rounded-lg text-xs h-7" onClick={reset}>Clear</Button>
              </div>

              {/* Preview table */}
              <div className="border border-border rounded-xl overflow-hidden text-sm">
                <div className="bg-muted/40 px-4 py-2 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview (first {Math.min(5, records.length)} of {records.length})</p>
                </div>
                <div className="divide-y divide-border">
                  {preview.map((r, i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="font-semibold truncate">{r.title || r.name || "(no name)"}</p>
                        <p className="text-muted-foreground truncate">{r.category || "—"}</p>
                      </div>
                      <div>
                        <p className="truncate text-muted-foreground">{r.address || "—"}</p>
                        <p className="text-muted-foreground">{r.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="truncate text-muted-foreground">{r.website || "—"}</p>
                        {r.review_rating ? <p className="text-amber-600">★ {r.review_rating}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">Cancel</Button>
          <Button
            type="button"
            disabled={records.length === 0 || isImporting}
            className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700"
            onClick={() => onImport(records)}
          >
            {isImporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
              : <><Upload className="w-4 h-4" /> Import {records.length > 0 ? `${records.length} Businesses` : "Businesses"}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTeamMemberDialog({
  open, onClose, onAdd, isAdding, users, teamMemberUserIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  isAdding: boolean;
  users: any[];
  teamMemberUserIds: string[];
}) {
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [type, setType] = useState<"team_member" | "affiliate">("team_member");
  const [permissions, setPermissions] = useState<PermissionKey[]>(["add_businesses"]);
  const [notes, setNotes] = useState("");

  const availableUsers = users.filter(u =>
    !teamMemberUserIds.includes(u.id) && (
      userSearch === "" ||
      `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  function togglePermission(perm: PermissionKey) {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  }

  function handleSubmit() {
    if (!selectedUserId) return;
    onAdd({ userId: selectedUserId, type, permissions, notes: notes || undefined });
  }

  function handleClose() {
    setSelectedUserId(""); setUserSearch(""); setType("team_member"); setPermissions(["add_businesses"]); setNotes("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-teal-600" /> Add Team Member</DialogTitle>
          <DialogDescription>Select a user and configure their role and permissions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">Select User</p>
            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center font-bold text-teal-700">
                  {(selectedUser.firstName?.[0] ?? selectedUser.username[0]).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{selectedUser.firstName ? `${selectedUser.firstName} ${selectedUser.lastName ?? ""}`.trim() : selectedUser.username}</p>
                  <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUserId("")} className="text-muted-foreground"><X className="w-4 h-4" /></Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 rounded-xl" />
                </div>
                <div className="border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
                  ) : availableUsers.slice(0, 10).map(u => (
                    <button key={u.id} onClick={() => setSelectedUserId(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm flex-shrink-0">
                        {(u.firstName?.[0] ?? u.username[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.username}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Member Type</p>
            <div className="grid grid-cols-2 gap-3">
              {(["team_member", "affiliate"] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${type === t ? "border-teal-500 bg-teal-50" : "border-border hover:border-muted-foreground"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {t === "affiliate" ? <Briefcase className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                    <span className="text-sm font-semibold capitalize">{t === "team_member" ? "Team Member" : "Affiliate"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t === "team_member" ? "Internal staff with direct access" : "External partner with limited access"}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Permissions</p>
            <div className="space-y-2">
              {PERMISSIONS.map(p => (
                <button key={p.key} onClick={() => togglePermission(p.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${permissions.includes(p.key) ? "border-teal-500 bg-teal-50" : "border-border hover:border-muted-foreground"}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${permissions.includes(p.key) ? "bg-teal-500 border-teal-500" : "border-muted-foreground"}`}>
                    {permissions.includes(p.key) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Notes (optional)</p>
            <Input placeholder="e.g. Ponce region affiliate" value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || isAdding} className="rounded-xl gap-2 bg-teal-600 hover:bg-teal-700">
            {isAdding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><UserPlus className="w-4 h-4" /> Add to Team</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTeamMemberDialog({
  open, member, onClose, onSave, isSaving,
}: {
  open: boolean;
  member: TeamMember;
  onClose: () => void;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [type, setType] = useState<"team_member" | "affiliate">(member.type as any ?? "team_member");
  const [permissions, setPermissions] = useState<PermissionKey[]>((member.permissions ?? []) as PermissionKey[]);
  const [notes, setNotes] = useState(member.notes ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(member.status as any ?? "active");

  function togglePermission(perm: PermissionKey) {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-teal-600" /> Edit Team Member</DialogTitle>
          <DialogDescription>
            {member.user?.firstName ? `${member.user.firstName} ${member.user.lastName ?? ""}`.trim() : member.user?.username}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">Member Type</p>
            <div className="grid grid-cols-2 gap-3">
              {(["team_member", "affiliate"] as const).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${type === t ? "border-teal-500 bg-teal-50" : "border-border hover:border-muted-foreground"}`}>
                  <div className="flex items-center gap-2">
                    {t === "affiliate" ? <Briefcase className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                    <span className="text-sm font-semibold">{t === "team_member" ? "Team Member" : "Affiliate"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Status</p>
            <div className="grid grid-cols-2 gap-3">
              {(["active", "inactive"] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${status === s ? (s === "active" ? "border-emerald-500 bg-emerald-50" : "border-slate-400 bg-slate-50") : "border-border hover:border-muted-foreground"}`}>
                  <span className="text-sm font-semibold capitalize">{s}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Permissions</p>
            <div className="space-y-2">
              {PERMISSIONS.map(p => (
                <button key={p.key} onClick={() => togglePermission(p.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${permissions.includes(p.key) ? "border-teal-500 bg-teal-50" : "border-border hover:border-muted-foreground"}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${permissions.includes(p.key) ? "bg-teal-500 border-teal-500" : "border-muted-foreground"}`}>
                    {permissions.includes(p.key) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Notes</p>
            <Input placeholder="e.g. Ponce region affiliate" value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl" />
          </div>
        </div>
        <DialogFooter className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={() => onSave({ type, permissions, notes: notes || undefined, status })} disabled={isSaving} className="rounded-xl gap-2 bg-teal-600 hover:bg-teal-700">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [section, setSection] = useState<AdminSection>("dashboard");
  const [businessTab, setBusinessTab] = useState<BusinessTab>("approved");
  const [userRole, setUserRole] = useState<UserRole>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [addingLead, setAddingLead] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showGmbDialog, setShowGmbDialog] = useState(false);
  const [showMapSearchDialog, setShowMapSearchDialog] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchMunicipality, setMapSearchMunicipality] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSelectedPlace, setMapSelectedPlace] = useState<any | null>(null);
  const [statsBusinessId, setStatsBusinessId] = useState<number | null>(null);

  const [addingUser, setAddingUser] = useState(false);
  const [addingTeamMember, setAddingTeamMember] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);
  const [teamMemberSearch, setTeamMemberSearch] = useState("");
  const [teamUserSearch, setTeamUserSearch] = useState("");

  const [deletingBusiness, setDeletingBusiness] = useState<{ id: number; name: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string; businessCount: number } | null>(null);
  const [assigningOwner, setAssigningOwner] = useState<{ id: number; name: string } | null>(null);
  const [assignOwnerSearch, setAssignOwnerSearch] = useState("");
  const [assignOwnerLoading, setAssignOwnerLoading] = useState(false);

  const [impersonationSession, setImpersonationSession] = useState<any | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(null);

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogsTotal, setEmailLogsTotal] = useState(0);
  const [emailLogsOffset, setEmailLogsOffset] = useState(0);
  const [emailLogsStatusFilter, setEmailLogsStatusFilter] = useState<"" | "sent" | "failed">("");
  const [emailLogsTypeFilter, setEmailLogsTypeFilter] = useState("");

  const isAdmin = isAuthenticated && user?.role === "admin";

  // ── Queries ──
  const { data: stats } = useGetAdminStats({ query: { enabled: isAdmin } });
  const { data: categoriesData } = useListCategories();
  const { data: approvedData } = useAdminListBusinesses({ status: "approved" }, { query: { enabled: isAdmin } });
  const { data: pendingData } = useAdminListBusinesses({ status: "pending" }, { query: { enabled: isAdmin } });
  const { data: rejectedData } = useAdminListBusinesses({ status: "rejected" }, { query: { enabled: isAdmin } });
  const { data: allData } = useAdminListBusinesses({ status: "all" }, { query: { enabled: isAdmin && businessTab === "all" } });
  const { data: usersData } = useAdminListUsers({}, { query: { enabled: isAdmin } });
  const { data: reviewsData } = useAdminListReviews({}, { query: { enabled: isAdmin } });
  const { data: leadsData, refetch: refetchLeads } = useAdminGetLeads(
    leadSearch ? { search: leadSearch } : undefined,
    { query: { enabled: isAdmin } },
  );
  const { data: teamData, refetch: refetchTeam } = useAdminListTeam({ query: { enabled: isAdmin } });

  const pendingCount = pendingData?.total ?? stats?.pendingBusinesses ?? 0;
  const leadsCount = leadsData?.total ?? 0;
  const unclaimedLeads = leadsData?.leads?.filter(l => !l.isClaimed).length ?? 0;
  const claimedLeads = leadsData?.leads?.filter(l => l.isClaimed).length ?? 0;
  const totalNotifications = pendingCount;

  const tabBusinesses = {
    approved: approvedData?.businesses ?? [],
    pending: pendingData?.businesses ?? [],
    rejected: rejectedData?.businesses ?? [],
    all: allData?.businesses ?? [],
  }[businessTab];

  const filteredBusinesses = tabBusinesses.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b as any).ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.municipality?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = (usersData?.users ?? []).filter(u => {
    const matchesSearch = 
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u as any).email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = userRole === "all" || u.role === userRole;
    return matchesSearch && matchesRole;
  });

  // ── Mutations ──
  const invalidateBusinesses = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/businesses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/admin/stats`] });
  };
  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: [`/api/admin/leads`] });

  const { getToken } = useAuth();

  const handleAssignOwner = async (userId: string) => {
    if (!assigningOwner) return;
    setAssignOwnerLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/businesses/${assigningOwner.id}/assign-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to assign owner");
      toast({ title: "Owner assigned!", description: data.message });
      invalidateBusinesses();
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users`] });
      setAssigningOwner(null);
      setAssignOwnerSearch("");
    } catch (err: any) {
      toast({ title: "Failed to assign owner", description: err.message, variant: "destructive" });
    } finally {
      setAssignOwnerLoading(false);
    }
  };

  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    setMapSearchLoading(true);
    setMapSearchResults([]);
    setMapSelectedPlace(null);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const params = new URLSearchParams({ query: mapSearchQuery });
      if (mapSearchMunicipality) params.set("municipality", mapSearchMunicipality);
      const res = await fetch(`${baseUrl}/api/admin/leads/map-search?${params}`);
      const data = await res.json();
      if (res.ok) {
        setMapSearchResults(data.results ?? []);
        if ((data.results ?? []).length === 0) {
          toast({ title: "No results found", description: "Try a different search or municipality." });
        }
      } else {
        toast({ title: "Search failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setMapSearchLoading(false);
    }
  };

  const handleSelectMapPlace = (place: any) => {
    const muniMatch = MUNICIPALITIES.find(m =>
      place.address.toLowerCase().includes(m.toLowerCase())
    );
    addLeadForm.setValue("name", place.name ?? "");
    addLeadForm.setValue("description", `${place.name} is a business located at ${place.address}.`);
    addLeadForm.setValue("address", place.address ?? "");
    addLeadForm.setValue("municipality", muniMatch ?? "San Juan");
    setShowMapSearchDialog(false);
    setMapSearchResults([]);
    setMapSearchQuery("");
    setMapSearchMunicipality("");
    setMapSelectedPlace(null);
    setAddingLead(true);
  };

  const { mutate: approve } = useApproveBusiness({ mutation: { onSuccess: () => { toast({ title: "Business approved" }); invalidateBusinesses(); } } });
  const { mutate: reject } = useRejectBusiness({ mutation: { onSuccess: () => { toast({ title: "Business rejected" }); invalidateBusinesses(); } } });
  const { mutate: deleteBusiness, isPending: isDeletingBusiness } = useAdminDeleteBusiness({
    mutation: {
      onSuccess: () => { toast({ title: "Business deleted", description: "The listing has been permanently removed." }); invalidateBusinesses(); setDeletingBusiness(null); },
      onError: () => toast({ title: "Failed to delete business", variant: "destructive" }),
    },
  });
  const { mutate: deleteUser, isPending: isDeletingUser } = useAdminDeleteUser({
    mutation: {
      onSuccess: () => { toast({ title: "User deleted", description: "Their business listings have been marked as unclaimed." }); queryClient.invalidateQueries({ queryKey: [`/api/admin/users`] }); setDeletingUser(null); },
      onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
    },
  });
  const { mutate: feature } = useFeatureBusiness({ mutation: { onSuccess: () => { toast({ title: "Featured status toggled" }); queryClient.invalidateQueries({ queryKey: [`/api/admin/businesses`] }); } } });
  const { mutate: deleteReview } = useAdminDeleteReview({ mutation: { onSuccess: () => { toast({ title: "Review deleted" }); queryClient.invalidateQueries({ queryKey: [`/api/admin/reviews`] }); } } });
  const { mutate: adminUpdateBusiness, isPending: isSavingBusiness } = useAdminUpdateBusiness({
    mutation: {
      onSuccess: () => { toast({ title: "Business updated" }); invalidateBusinesses(); setEditingBusiness(null); },
      onError: () => toast({ title: "Failed to update business", variant: "destructive" }),
    },
  });
  const { mutate: adminUpdateUser, isPending: isSavingUser } = useAdminUpdateUser({
    mutation: {
      onSuccess: () => { toast({ title: "User updated" }); queryClient.invalidateQueries({ queryKey: [`/api/admin/users`] }); setEditingUser(null); },
      onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
    },
  });

  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const handleSendPasswordReset = async () => {
    if (!editingUser) return;
    setSendingPasswordReset(true);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/admin/users/${editingUser.id}/send-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to send password reset");
      }
      toast({ title: "Password reset email sent", description: `Temporary password sent to ${editingUser.email}` });
    } catch (err: any) {
      toast({ title: "Failed to send password reset", description: err.message, variant: "destructive" });
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const { mutate: adminCreateUser, isPending: isCreatingUser } = useAdminCreateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User created", description: "A welcome email has been sent to the new user." });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users`] });
        setAddingUser(false);
        addUserForm.reset();
      },
      onError: (e: any) => toast({ title: "Failed to create user", description: e?.message ?? "An error occurred", variant: "destructive" }),
    },
  });
  const { mutate: createLead, isPending: isCreatingLead } = useAdminCreateLead({
    mutation: {
      onSuccess: () => { toast({ title: "Lead added to directory", description: "Listed as scouted by your team and unclaimed." }); invalidateLeads(); setAddingLead(false); addLeadForm.reset(); },
      onError: () => toast({ title: "Failed to add lead", variant: "destructive" }),
    },
  });
  const { mutate: updateLead, isPending: isUpdatingLead } = useAdminUpdateLead({
    mutation: {
      onSuccess: () => { toast({ title: "Lead updated" }); invalidateLeads(); setEditingLead(null); },
      onError: () => toast({ title: "Failed to update lead", variant: "destructive" }),
    },
  });
  const { mutate: deleteLead } = useAdminDeleteLead({
    mutation: {
      onSuccess: () => { toast({ title: "Lead removed" }); invalidateLeads(); },
      onError: () => toast({ title: "Failed to remove lead", variant: "destructive" }),
    },
  });
  const { mutate: importLeads, isPending: isImportingLeads } = useAdminImportLeads({
    mutation: {
      onSuccess: (result) => {
        toast({ title: `Imported ${result.imported} businesses`, description: result.skipped > 0 ? `${result.skipped} skipped (already exist or invalid)` : undefined });
        invalidateLeads();
        setShowImportDialog(false);
      },
      onError: () => toast({ title: "Import failed", variant: "destructive" }),
    },
  });

  const invalidateTeam = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
  const { mutate: addTeamMember, isPending: isAddingTeamMember } = useAdminAddTeamMember({
    mutation: {
      onSuccess: () => { toast({ title: "Team member added" }); invalidateTeam(); setAddingTeamMember(false); },
      onError: (e: any) => toast({ title: "Failed to add member", description: e?.message, variant: "destructive" }),
    },
  });
  const { mutate: updateTeamMember, isPending: isUpdatingTeamMember } = useAdminUpdateTeamMember({
    mutation: {
      onSuccess: () => { toast({ title: "Team member updated" }); invalidateTeam(); setEditingTeamMember(null); },
      onError: () => toast({ title: "Failed to update member", variant: "destructive" }),
    },
  });
  const { mutate: removeTeamMember } = useAdminRemoveTeamMember({
    mutation: {
      onSuccess: () => { toast({ title: "Team member removed" }); invalidateTeam(); },
      onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
    },
  });

  // ── Forms ──
  const businessForm = useForm<BusinessEditValues>({
    resolver: zodResolver(businessEditSchema),
    defaultValues: { name: "", description: "", municipality: "", address: "", phone: "", email: "", website: "", slug: "", status: "pending", featured: false, isClaimed: false },
  });

  const userForm = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", role: "user" },
  });

  const addUserForm = useForm<AddUserValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { email: "", firstName: "", lastName: "", role: "user" },
  });

  const addLeadForm = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", description: "", municipality: "", address: "", phone: "", email: "", website: "" },
  });

  const editLeadForm = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", description: "", municipality: "", address: "", phone: "", email: "", website: "" },
  });

  const openBusinessEdit = (b: any) => {
    setEditingBusiness(b);
    businessForm.reset({
      name: b.name ?? "", description: b.description ?? "", categoryId: b.categoryId ?? undefined,
      municipality: b.municipality ?? "", address: b.address ?? "", phone: b.phone ?? "",
      email: b.email ?? "", website: b.website ?? "", slug: b.slug ?? "",
      status: b.status ?? "pending", featured: b.featured ?? false, isClaimed: b.isClaimed ?? false,
    });
  };

  const openUserEdit = (u: any) => {
    setEditingUser(u);
    userForm.reset({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", email: u.email ?? "", phone: u.phone ?? "", role: u.role ?? "user", emailVerified: (u as any).emailVerified ?? false });
  };

  const openLeadEdit = (l: Lead) => {
    setEditingLead(l);
    editLeadForm.reset({
      name: l.name ?? "", description: l.description ?? "", municipality: l.municipality ?? "",
      categoryId: l.categoryId ?? undefined, address: l.address ?? "", phone: l.phone ?? "",
      email: l.email ?? "", website: l.website ?? "",
    });
  };

  const loginAsUser = async (userId: string, userData: any) => {
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/admin/users/${userId}/impersonate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to impersonate user");
      }
      const session = await res.json();
      setImpersonationSession(session);
      setImpersonatedUser(userData);
      toast({ title: `Logged in as ${userData.firstName || userData.username}` });
    } catch (err: any) {
      toast({ title: "Failed to login as user", description: err.message, variant: "destructive" });
    }
  };

  const switchBackToAdmin = async () => {
    if (!impersonationSession) return;
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/admin/impersonate/exit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: impersonationSession.sessionId }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to exit impersonation");
      }
      setImpersonationSession(null);
      setImpersonatedUser(null);
      toast({ title: "Switched back to admin account" });
    } catch (err: any) {
      toast({ title: "Failed to switch back", description: err.message, variant: "destructive" });
    }
  };

  // ── Auth guard ──
  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-6">You must be an administrator to view this page.</p>
      <Button onClick={() => setLocation("/")}>Return Home</Button>
    </div>
  );

  const teamMembers = teamData?.members ?? [];
  const activeTeamCount = teamMembers.filter(m => m.status === "active").length;

  const navItems: { id: AdminSection; label: string; icon: any; badge?: number; badgeColor?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "leads", label: "Leads", icon: Target, badge: unclaimedLeads || undefined, badgeColor: "bg-violet-500" },
    { id: "businesses", label: "Business Listings", icon: Store },
    { id: "users", label: "Users & Owners", icon: Users },
    { id: "reviews", label: "Reviews", icon: MessageSquare },
    { id: "team", label: "Team & Affiliates", icon: Handshake, badge: activeTeamCount || undefined, badgeColor: "bg-teal-500" },
    { id: "email-logs", label: "Email Logs", icon: Mail },
    { id: "settings", label: "Page Settings", icon: Settings },
  ];

  const businessTabs: { id: BusinessTab; label: string; count: number; color: string; activeColor: string }[] = [
    { id: "approved", label: "Active Listings", count: approvedData?.total ?? 0, color: "text-emerald-600", activeColor: "bg-emerald-600 text-white" },
    { id: "pending", label: "Pending Review", count: pendingData?.total ?? 0, color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
    { id: "rejected", label: "Rejected", count: rejectedData?.total ?? 0, color: "text-red-600", activeColor: "bg-red-500 text-white" },
    { id: "all", label: "All", count: stats?.totalBusinesses ?? 0, color: "text-muted-foreground", activeColor: "bg-slate-700 text-white" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ── */}
      <div className="w-64 bg-white border-r border-border shadow-sm flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Spotlight Puerto Rico</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            const isLeads = item.id === "leads";
            
            if (isLeads) {
              return (
                <button
                  key={item.id}
                  onClick={() => { setSection(item.id); setSearchTerm(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium border-2 ${active ? "bg-violet-50 text-violet-700 border-violet-500 shadow-md shadow-violet-500/20" : "text-violet-600 border-violet-300 hover:bg-violet-50 hover:border-violet-400"}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 text-violet-600" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span className={`text-xs min-w-[20px] h-5 px-1.5 rounded-full font-bold flex items-center justify-center ${active ? "bg-violet-600 text-white" : "bg-violet-500 text-white"}`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            }
            
            return (
              <button
                key={item.id}
                onClick={() => { setSection(item.id); setSearchTerm(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? "bg-primary text-white shadow-md shadow-primary/20" : "text-foreground hover:bg-muted/60"}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-muted-foreground"}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span className={`text-xs min-w-[20px] h-5 px-1.5 rounded-full font-bold flex items-center justify-center ${active ? "bg-white/20 text-white" : `${item.badgeColor ?? "bg-amber-100"} text-white`}`}>
                    {item.badge}
                  </span>
                ) : active ? <ChevronRight className="w-3 h-3 text-white/60" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setLocation("/")}>Exit Admin</Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-border sticky top-0 z-10 px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display">{navItems.find(i => i.id === section)?.label}</h2>
            <p className="text-sm text-muted-foreground">
              {section === "dashboard" && "System overview and live analytics"}
              {section === "businesses" && `${stats?.totalBusinesses ?? 0} total listings · ${pendingCount} pending approval`}
              {section === "leads" && `${leadsCount} scouted · ${claimedLeads} claimed · ${unclaimedLeads} unclaimed`}
              {section === "users" && `${usersData?.total ?? 0} registered users`}
              {section === "reviews" && `${reviewsData?.total ?? 0} reviews`}
              {section === "notifications" && `${totalNotifications} item${totalNotifications !== 1 ? "s" : ""} need attention`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalNotifications > 0 && (
              <Button onClick={() => setSection("notifications")} variant="outline" className="rounded-xl gap-2 border-rose-200 text-rose-600 hover:bg-rose-50" title="View pending items">
                <Bell className="w-4 h-4" /> {totalNotifications} Pending
              </Button>
            )}
            {section === "leads" && (
              <>
                <Button variant="outline" onClick={() => setShowGmbDialog(true)} className="rounded-xl gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Globe className="w-4 h-4" /> Import from GMB Link
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(true)} className="rounded-xl gap-2 border-violet-200 text-violet-700 hover:bg-violet-50">
                  <Upload className="w-4 h-4" /> Import from Google Maps
                </Button>
                <Button variant="outline" onClick={() => { setShowMapSearchDialog(true); setMapSearchResults([]); setMapSearchQuery(""); setMapSearchMunicipality(""); setMapSelectedPlace(null); }} className="rounded-xl gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <MapPin className="w-4 h-4" /> Search on Map
                </Button>
                <Button onClick={() => setAddingLead(true)} className="rounded-xl gap-2">
                  <Plus className="w-4 h-4" /> Scout a Business
                </Button>
              </>
            )}
            {section === "users" && (
              <Button onClick={() => setAddingUser(true)} className="rounded-xl gap-2">
                <UserPlus className="w-4 h-4" /> Add User
              </Button>
            )}
            {(section === "users" || section === "reviews") && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" />
              </div>
            )}
          </div>
        </div>

        {/* Impersonation Banner */}
        {impersonationSession && impersonatedUser && (
          <div className="bg-blue-50 border-b-2 border-blue-200 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCog className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Logged in as: <span className="font-bold">{impersonatedUser.firstName || impersonatedUser.username}</span></p>
                <p className="text-sm text-blue-700">You are impersonating this user. Actions will be recorded under their account.</p>
              </div>
            </div>
            <Button onClick={switchBackToAdmin} variant="outline" className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 border-blue-600">
              Switch Back to Admin
            </Button>
          </div>
        )}

        <div className="p-8 space-y-6">

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Store} label="Total Businesses" value={stats?.totalBusinesses ?? 0} color="blue" />
                <StatCard icon={Clock} label="Pending Review" value={pendingCount} color="amber" highlight onClick={() => { setSection("businesses"); setBusinessTab("pending"); }} />
                <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} color="purple" />
                <StatCard icon={Target} label="Scouted Leads" value={leadsCount} color="violet" onClick={() => setSection("leads")} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="Approval Rate" value={stats?.totalBusinesses ? `${Math.round(((stats.approvedBusinesses || 0) / stats.totalBusinesses) * 100)}%` : "0%"} sub={`${stats?.approvedBusinesses ?? 0} of ${stats?.totalBusinesses ?? 0} approved`} color="bg-emerald-50 border-emerald-100 text-emerald-800" icon={CheckCircle2} />
                <MetricCard label="Avg Rating" value={stats?.avgRating ? stats.avgRating.toFixed(1) : "—"} sub={`across ${stats?.totalReviews ?? 0} reviews`} color="bg-amber-50 border-amber-100 text-amber-800" icon={Star} />
                <MetricCard label="Leads Claimed" value={leadsCount ? `${Math.round((claimedLeads / leadsCount) * 100)}%` : "0%"} sub={`${claimedLeads} of ${leadsCount} scouted`} color="bg-violet-50 border-violet-100 text-violet-800" icon={Target} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-4">Status Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Approved", value: stats?.approvedBusinesses ?? 0, color: "bg-emerald-500" },
                      { label: "Pending", value: stats?.pendingBusinesses ?? 0, color: "bg-amber-500" },
                      { label: "Rejected", value: Math.max(0, (stats?.totalBusinesses ?? 0) - (stats?.approvedBusinesses ?? 0) - (stats?.pendingBusinesses ?? 0)), color: "bg-red-400" },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1"><span className="font-medium">{item.label}</span><span className="text-muted-foreground">{item.value}</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${stats?.totalBusinesses ? (item.value / stats.totalBusinesses) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => { setSection("businesses"); setBusinessTab("pending"); }}>
                      <Clock className="w-4 h-4 text-amber-500" /> Review {pendingCount} pending listings
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setSection("leads")}>
                      <Target className="w-4 h-4 text-violet-500" /> Manage {leadsCount} scouted leads
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setSection("notifications")}>
                      <Bell className="w-4 h-4 text-rose-500" /> View {totalNotifications} notification{totalNotifications !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── LEADS ── */}
          {section === "leads" && (
            <div className="space-y-4">
              {/* Info banner */}
              <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Target className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-violet-900">Spotlight Puerto Rico Scouted Listings</p>
                  <p className="text-xs text-violet-700 mt-0.5">
                    These businesses were added by a Spotlight PR representative and are visible in the public directory.
                    They are marked as <strong>Unclaimed</strong> until a business owner verifies and claims their listing.
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-border rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold font-display text-violet-600">{leadsCount}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Total Scouted</p>
                </div>
                <div className="bg-white border border-border rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold font-display text-amber-600">{unclaimedLeads}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Unclaimed</p>
                </div>
                <div className="bg-white border border-border rounded-xl p-4 shadow-sm text-center">
                  <p className="text-2xl font-bold font-display text-emerald-600">{claimedLeads}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">Claimed</p>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search scouted businesses…"
                  value={leadSearch}
                  onChange={e => { setLeadSearch(e.target.value); setTimeout(() => refetchLeads(), 300); }}
                  className="pl-10 rounded-xl"
                />
              </div>

              {/* Leads table */}
              {(leadsData?.leads?.length ?? 0) > 0 ? (
                <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="p-4 font-medium">Business</th>
                          <th className="p-4 font-medium">Location & Contact</th>
                          <th className="p-4 font-medium">Scouted By</th>
                          <th className="p-4 font-medium">Added</th>
                          <th className="p-4 font-medium">Status</th>
                          <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leadsData?.leads?.map(lead => (
                          <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {lead.logoUrl ? (
                                  <img src={lead.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-border flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-5 h-5 text-violet-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-foreground">{lead.name}</p>
                                  <p className="text-xs text-muted-foreground">{lead.categoryName ?? "Uncategorized"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.municipality}</div>
                                {lead.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</div>}
                                {lead.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</div>}
                                {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="w-3 h-3" /> Website</a>}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                  <Shield className="w-3.5 h-3.5 text-violet-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-xs text-foreground">{lead.addedByRepName ?? "Spotlight Rep"}</p>
                                  <p className="text-xs text-muted-foreground">Spotlight PR</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-xs text-muted-foreground">{format(new Date(lead.createdAt), "MMM d, yyyy")}</td>
                            <td className="p-4">
                              {lead.isClaimed ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                                  <BadgeCheck className="w-3 h-3" /> Claimed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Unclaimed</Badge>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" title="View listing" asChild>
                                  <a href={`/businesses/${lead.slug}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                  </a>
                                </Button>
                                <Button size="icon" variant="outline" title="Edit" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => openLeadEdit(lead)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Delete" className="text-destructive hover:bg-destructive/10" onClick={() => { if (confirm(`Remove "${lead.name}" from the directory?`)) deleteLead({ id: lead.id }); }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-violet-400" />
                  </div>
                  <p className="text-lg font-bold font-display mb-2">{leadSearch ? "No results found" : "No leads yet"}</p>
                  <p className="text-muted-foreground text-sm mb-5">
                    {leadSearch ? `No scouted businesses match "${leadSearch}"` : "Start scouting businesses in Puerto Rico to grow the directory."}
                  </p>
                  {!leadSearch && (
                    <Button onClick={() => setAddingLead(true)} className="rounded-xl gap-2">
                      <Plus className="w-4 h-4" /> Scout Your First Business
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── BUSINESSES ── */}
          {section === "businesses" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-white border border-border rounded-2xl p-2 shadow-sm">
                {businessTabs.map(tab => {
                  const active = businessTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setBusinessTab(tab.id); setSearchTerm(""); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${active ? `${tab.activeColor} shadow-sm` : `hover:bg-muted/60 ${tab.color}`}`}
                    >
                      {tab.label}
                      <span className={`text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 font-bold ${active ? "bg-white/25 text-inherit" : tab.id === "pending" && tab.count > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
                <div className="relative ml-auto w-56">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search listings…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 rounded-xl border-border text-sm" />
                </div>
              </div>

              {businessTab === "pending" && pendingCount > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="font-semibold text-sm">{pendingCount} listing{pendingCount !== 1 ? "s" : ""} waiting for your review</p>
                    <p className="text-xs text-amber-700 mt-0.5">Approve or reject each submission. Approved listings go live immediately.</p>
                  </div>
                </div>
              )}

              {businessTab === "approved" && filteredBusinesses.length === 0 && !searchTerm && (
                <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm">
                  <Store className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-semibold text-muted-foreground">No approved listings yet</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-xl gap-2" onClick={() => setBusinessTab("pending")}>
                    <Clock className="w-4 h-4" /> Go to Pending Review
                  </Button>
                </div>
              )}

              {filteredBusinesses.length > 0 && (
                <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="p-4 font-medium">Business</th>
                          <th className="p-4 font-medium">Owner</th>
                          <th className="p-4 font-medium">Location</th>
                          {businessTab !== "approved" && <th className="p-4 font-medium">Status</th>}
                          <th className="p-4 font-medium">Badges</th>
                          <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredBusinesses.map(b => (
                          <tr key={b.id} className={`hover:bg-muted/20 transition-colors ${businessTab === "pending" ? "bg-amber-50/30" : ""}`}>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {(b as any).logoUrl ? (
                                  <img src={(b as any).logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-border flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Store className="w-4 h-4 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold">{b.name}</p>
                                  <p className="text-xs text-muted-foreground">{(b as any).categoryName ?? "—"} · #{b.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {(b as any).ownerName ? (
                                <div>
                                  <p className="font-medium text-sm">{(b as any).ownerName}</p>
                                  <a href={`mailto:${(b as any).ownerContactEmail}`} className="text-xs text-primary hover:underline">{(b as any).ownerContactEmail}</a>
                                </div>
                              ) : <span className="text-xs text-muted-foreground italic">No owner</span>}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">{b.municipality ?? "—"}</td>
                            {businessTab !== "approved" && (
                              <td className="p-4">
                                {b.status === "pending" && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>}
                                {b.status === "approved" && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>}
                                {b.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                              </td>
                            )}
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {b.status === "approved" && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">✓ Verified</Badge>}
                                {(b as any).isClaimed && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">✓ Claimed</Badge>}
                                {b.featured && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">⭐ Featured</Badge>}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                {!(b as any).isClaimed && (
                                  <Button size="icon" variant="outline" title="Assign Business Owner" className="text-violet-600 border-violet-200 hover:bg-violet-50" onClick={() => { setAssigningOwner({ id: b.id, name: b.name }); setAssignOwnerSearch(""); }}>
                                    <UserPlus className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" title="Toggle Featured" className={b.featured ? "text-amber-500" : "text-muted-foreground"} onClick={() => feature({ id: b.id })}>
                                  <Star className={`w-4 h-4 ${b.featured ? "fill-current" : ""}`} />
                                </Button>
                                {b.status !== "approved" && (
                                  <Button size="icon" variant="outline" title="Approve" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => approve({ id: b.id })}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                {b.status !== "rejected" && (
                                  <Button size="icon" variant="outline" title="Reject" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => reject({ id: b.id })}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="icon" variant="outline" title="Edit" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => openBusinessEdit(b)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="outline" title="View Stats" className="text-violet-600 border-violet-200 hover:bg-violet-50" onClick={() => setStatsBusinessId(b.id)}>
                                  <BarChart3 className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="outline" title="View Business" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => window.open(`/businesses/${b.slug || b.id}`, "_blank")}>
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="outline" title="Manage Listing" className="text-cyan-600 border-cyan-200 hover:bg-cyan-50" onClick={() => setLocation(`/manage/${b.id}`)}>
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="outline" title="Delete Business" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeletingBusiness({ id: b.id, name: b.name })}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {filteredBusinesses.length === 0 && searchTerm && (
                <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm">
                  <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="font-semibold text-muted-foreground">No results for "{searchTerm}"</p>
                </div>
              )}
            </div>
          )}

          {/* ── USERS ── */}
          {section === "users" && (
            <div className="space-y-4">
              {/* Role Tabs */}
              <div className="flex gap-2 border-b border-border pb-0 overflow-x-auto">
                {["all", "user", "business_owner", "admin"].map(role => {
                  const roleLabels = {
                    "all": "All Users",
                    "user": "Regular Users",
                    "business_owner": "Business Owners",
                    "admin": "Admins",
                  };
                  const roleCounts = {
                    "all": (usersData?.users ?? []).length,
                    "user": (usersData?.users ?? []).filter(u => u.role === "user").length,
                    "business_owner": (usersData?.users ?? []).filter(u => u.role === "business_owner").length,
                    "admin": (usersData?.users ?? []).filter(u => u.role === "admin").length,
                  };
                  return (
                    <button
                      key={role}
                      onClick={() => setUserRole(role as UserRole)}
                      className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                        userRole === role
                          ? "border-b-primary text-primary"
                          : "border-b-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {roleLabels[role as keyof typeof roleLabels]} <span className="text-xs ml-1">({roleCounts[role as keyof typeof roleCounts]})</span>
                    </button>
                  );
                })}
              </div>

              {/* Users Table */}
              <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-4 font-medium">User</th>
                        <th className="p-4 font-medium">Email</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Role</th>
                        <th className="p-4 font-medium">Joined</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {u.profileImage ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary">{(u.firstName?.[0] ?? u.username?.[0] ?? "?").toUpperCase()}</span>}
                              </div>
                              <div>
                                <p className="font-semibold">{u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.username}</p>
                                <p className="text-xs text-muted-foreground">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{(u as any).email ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {(u as any).emailVerified ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Unverified</Badge>
                            )}
                          </td>
                          <td className="p-4"><RoleBadge role={u.role} /></td>
                          <td className="p-4 text-muted-foreground text-sm">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" variant="outline" title="Login As This User" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => loginAsUser(u.id, u)}>
                                <UserCog className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="outline" title="Edit User" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => openUserEdit(u)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                title="Delete User" 
                                className="text-red-600 border-red-200 hover:bg-red-50" 
                                onClick={() => {
                                  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username;
                                  const ownedBusinesses = (usersData?.users ?? []).reduce((count, user) => {
                                    // In a real scenario, we'd count businesses per user from the API
                                    return count;
                                  }, 0);
                                  setDeletingUser({ id: u.id, name, businessCount: ownedBusinesses });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No users found in this role.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── REVIEWS ── */}
          {section === "reviews" && (
            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 font-medium">Author</th>
                      <th className="p-4 font-medium">Business</th>
                      <th className="p-4 font-medium">Rating</th>
                      <th className="p-4 font-medium">Review</th>
                      <th className="p-4 font-medium">Posted</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reviewsData?.reviews?.map(r => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-sm">{r.authorName}</td>
                        <td className="p-4 text-sm">{(r as any).businessName ? <span className="font-medium">{(r as any).businessName}</span> : <span className="text-muted-foreground">#{r.businessId}</span>}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "text-amber-400 fill-current" : "text-muted-foreground/30"}`} />)}</div>
                        </td>
                        <td className="p-4 max-w-xs text-sm">
                          {r.title && <p className="font-medium mb-0.5">{r.title}</p>}
                          <p className="text-muted-foreground line-clamp-2">{r.body}</p>
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">{format(new Date((r as any).createdAt || new Date()), "MMM d, yyyy")}</td>
                        <td className="p-4 text-right">
                          <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteReview({ id: r.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(reviewsData?.reviews?.length ?? 0) === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No reviews found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {section === "notifications" && (
            <div className="space-y-4">
              {totalNotifications === 0 && (
                <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold font-display mb-2">All caught up!</p>
                  <p className="text-muted-foreground text-sm">No pending actions at this time.</p>
                </div>
              )}

              {pendingCount > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Listing Approvals <span className="text-amber-600">({pendingCount})</span></h3>
                  </div>
                  <div className="space-y-2">
                    {(pendingData?.businesses ?? []).map(b => (
                      <div key={b.id} className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Building2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{b.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{(b as any).categoryName ?? "Uncategorized"} · {b.municipality}{(b as any).ownerName ? ` · ${(b as any).ownerName}` : ""}</p>
                          {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5" onClick={() => reject({ id: b.id })}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                          <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => approve({ id: b.id })}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => { setSection("businesses"); setBusinessTab("pending"); }}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Delete Business" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={() => setDeletingBusiness({ id: b.id, name: b.name })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(usersData?.users?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 mt-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Recent Registrations</h3>
                  </div>
                  <div className="space-y-2">
                    {(usersData?.users ?? []).slice(0, 5).map(u => (
                      <div key={u.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {u.profileImage ? <img src={u.profileImage} alt="" className="w-full h-full object-cover" /> : <UserPlus className="w-4 h-4 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.username}</p>
                          <p className="text-xs text-muted-foreground">@{u.username} · joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</p>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EMAIL LOGS ── */}
          {section === "email-logs" && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Email Activity Log</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    View all outbound emails sent by the system including verifications, notifications, and password resets.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Select value={emailLogsStatusFilter} onValueChange={(v: any) => { setEmailLogsStatusFilter(v); setEmailLogsOffset(0); }}>
                  <SelectTrigger className="w-40 rounded-xl">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={emailLogsTypeFilter} onValueChange={(v: any) => { setEmailLogsTypeFilter(v); setEmailLogsOffset(0); }}>
                  <SelectTrigger className="w-48 rounded-xl">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                    <SelectItem value="welcome_new_user">Welcome New User</SelectItem>
                    <SelectItem value="password_reset">Password Reset</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {emailLogsLoading ? (
                <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 text-muted-foreground animate-spin" />
                  <p className="text-muted-foreground">Loading email logs...</p>
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-lg font-bold font-display mb-2">No Email Logs</h3>
                  <p className="text-muted-foreground text-sm">No emails found matching your filters.</p>
                </div>
              ) : (
                <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-border">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Recipient</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Subject</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Sent At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emailLogs.map((log: any, idx: number) => (
                          <tr key={idx} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">{log.recipientName || log.recipientEmail}</p>
                                <p className="text-xs text-muted-foreground">{log.recipientEmail}</p>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-xs" variant="secondary">
                                {log.emailType.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-sm text-foreground">{log.subject}</p>
                            </td>
                            <td className="px-5 py-3">
                              <Badge className={`text-xs ${log.status === "sent" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}>
                                {log.status === "sent" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                {log.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 text-sm text-muted-foreground">
                              {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="px-5 py-4 border-t border-border flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Showing {emailLogs.length} of {emailLogsTotal} emails</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEmailLogsOffset(Math.max(0, emailLogsOffset - 50))}
                        disabled={emailLogsOffset === 0}
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => setEmailLogsOffset(emailLogsOffset + 50)}
                        disabled={emailLogsOffset + 50 >= emailLogsTotal}
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TEAM & AFFILIATES ── */}
          {section === "settings" && (
            <SliderSettingsSection />
          )}

          {section === "team" && (
            <div className="space-y-6">
              <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Handshake className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-teal-900">Team & Affiliate Management</p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    Add users as team members or affiliates and assign them specific permissions.
                    Team members can access their own dashboard at <strong>/team</strong> to track their submissions.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search team members..." value={teamMemberSearch} onChange={e => setTeamMemberSearch(e.target.value)} className="pl-10 rounded-xl" />
                </div>
                <Button onClick={() => setAddingTeamMember(true)} className="rounded-xl gap-2">
                  <UserPlus className="w-4 h-4" /> Add Member
                </Button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="bg-white border border-border rounded-2xl p-16 text-center shadow-sm">
                  <Handshake className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-lg font-bold font-display mb-2">No Team Members Yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">Start building your team by adding users as members or affiliates.</p>
                  <Button onClick={() => setAddingTeamMember(true)} className="rounded-xl gap-2">
                    <UserPlus className="w-4 h-4" /> Add First Member
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {teamMembers
                    .filter(m => {
                      if (!teamMemberSearch) return true;
                      const fullName = `${m.user?.firstName ?? ""} ${m.user?.lastName ?? ""}`.toLowerCase();
                      return fullName.includes(teamMemberSearch.toLowerCase()) ||
                        m.user?.username?.toLowerCase().includes(teamMemberSearch.toLowerCase()) ||
                        m.user?.email?.toLowerCase().includes(teamMemberSearch.toLowerCase());
                    })
                    .map(member => (
                    <div key={member.id} className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden border-2 border-teal-200 flex-shrink-0">
                          {member.user?.profileImageUrl
                            ? <img src={member.user.profileImageUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="font-bold text-teal-700 text-lg">{((member.user?.firstName?.[0] ?? member.user?.username?.[0] ?? "T")).toUpperCase()}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">
                              {member.user?.firstName ? `${member.user.firstName} ${member.user.lastName ?? ""}`.trim() : member.user?.username ?? "Unknown"}
                            </p>
                            <Badge className={`text-xs ${member.type === "affiliate" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-teal-100 text-teal-700 hover:bg-teal-100"} gap-1`}>
                              {member.type === "affiliate" ? <Briefcase className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                              {member.type === "affiliate" ? "Affiliate" : "Team Member"}
                            </Badge>
                            <Badge className={`text-xs ${member.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}`}>
                              {member.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            @{member.user?.username} · {member.user?.email ?? "No email"}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(["add_businesses", "approve", "verify"] as const).map(perm => {
                              const has = (member.permissions ?? []).includes(perm);
                              const labels: Record<string, string> = { add_businesses: "Add Businesses", approve: "Approve/Deny", verify: "Verify" };
                              return (
                                <span key={perm} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${has ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-muted/50 text-muted-foreground border-border line-through"}`}>
                                  {labels[perm]}
                                </span>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            <span className="font-medium text-teal-700">{member.businessesAdded ?? 0}</span> businesses added
                            {member.notes && <span> · {member.notes}</span>}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => setEditingTeamMember(member)}>
                            <Edit2 className="w-3 h-3" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => {
                            if (confirm(`Remove ${member.user?.firstName ?? member.user?.username} from the team?`)) {
                              removeTeamMember({ id: member.id });
                            }
                          }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Delete Business Confirmation Dialog ── */}
      <Dialog open={!!deletingBusiness} onOpenChange={open => !open && setDeletingBusiness(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete Business Listing
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deletingBusiness?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-border gap-2">
            <Button variant="outline" onClick={() => setDeletingBusiness(null)} className="rounded-xl" disabled={isDeletingBusiness}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-xl gap-2"
              disabled={isDeletingBusiness}
              onClick={() => deletingBusiness && deleteBusiness({ id: deletingBusiness.id })}
            >
              {isDeletingBusiness ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete User Dialog ── */}
      <Dialog open={!!deletingUser} onOpenChange={open => !open && setDeletingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deletingUser?.name}</strong>'s account?
            </DialogDescription>
          </DialogHeader>
          {deletingUser && deletingUser.businessCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">⚠️ Unclaimed Listings</p>
                  <p className="text-amber-800">
                    This user owns <strong>{deletingUser.businessCount}</strong> business listing{deletingUser.businessCount !== 1 ? 's' : ''}. Their {deletingUser.businessCount !== 1 ? 'listings will' : 'listing will'} become <strong>unclaimed</strong> but remain in the system.
                  </p>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter className="pt-4 border-t border-border gap-2">
            <Button variant="outline" onClick={() => setDeletingUser(null)} className="rounded-xl" disabled={isDeletingUser}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-xl gap-2"
              disabled={isDeletingUser}
              onClick={() => deletingUser && deleteUser({ id: deletingUser.id })}
            >
              {isDeletingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete User</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Team Member Dialog ── */}
      <AddTeamMemberDialog
        open={addingTeamMember}
        onClose={() => setAddingTeamMember(false)}
        onAdd={(data) => addTeamMember({ data })}
        isAdding={isAddingTeamMember}
        users={usersData?.users ?? []}
        teamMemberUserIds={teamMembers.map(m => m.userId)}
      />

      {/* ── Edit Team Member Dialog ── */}
      {editingTeamMember && (
        <EditTeamMemberDialog
          open={!!editingTeamMember}
          member={editingTeamMember}
          onClose={() => setEditingTeamMember(null)}
          onSave={(data) => updateTeamMember({ id: editingTeamMember.id, data })}
          isSaving={isUpdatingTeamMember}
        />
      )}

      {/* ── GMB Link Import Dialog ── */}
      <GmbImportDialog
        open={showGmbDialog}
        onClose={() => setShowGmbDialog(false)}
        categories={categoriesData?.categories ?? []}
        onSave={(data) => {
          createLead({ data });
          setShowGmbDialog(false);
        }}
      />

      {/* ── Google Maps Import Dialog ── */}
      <GoogleMapsImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={(records) => importLeads({ data: { records } })}
        isImporting={isImportingLeads}
      />

      {/* ── Add Lead Dialog ── */}
      <Dialog open={addingLead} onOpenChange={open => { if (!open) { setAddingLead(false); addLeadForm.reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" /> Scout a Business
            </DialogTitle>
            <DialogDescription>
              Add a business you've scouted. It will appear in the directory as an unclaimed listing, attributed to Spotlight Puerto Rico.
            </DialogDescription>
          </DialogHeader>
          <Form {...addLeadForm}>
            <form onSubmit={addLeadForm.handleSubmit(values => createLead({ data: values }))} className="space-y-4">
              <LeadFormFields form={addLeadForm} categories={categoriesData?.categories ?? []} />
              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setAddingLead(false); addLeadForm.reset(); }} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isCreatingLead} className="rounded-xl gap-2 bg-violet-600 hover:bg-violet-700">
                  {isCreatingLead ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4" /> Add to Directory</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Map Search Dialog ── */}
      <Dialog open={showMapSearchDialog} onOpenChange={open => { if (!open) { setShowMapSearchDialog(false); setMapSearchResults([]); setMapSelectedPlace(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" /> Search Businesses on Map
            </DialogTitle>
            <DialogDescription>
              Search for businesses in Puerto Rico using Google Maps. Select one to import it as a lead.
            </DialogDescription>
          </DialogHeader>

          {/* Search inputs */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="e.g. bakery, restaurant, plumber…"
                value={mapSearchQuery}
                onChange={e => setMapSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleMapSearch()}
                className="rounded-xl"
              />
            </div>
            <div className="w-44">
              <Select value={mapSearchMunicipality} onValueChange={setMapSearchMunicipality}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Any municipality" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="">Any municipality</SelectItem>
                  {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleMapSearch} disabled={mapSearchLoading || !mapSearchQuery.trim()} className="rounded-xl gap-2 shrink-0">
              {mapSearchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>

          {/* Results */}
          {mapSearchResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium">{mapSearchResults.length} result{mapSearchResults.length !== 1 ? "s" : ""} found in Puerto Rico</p>

              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {mapSearchResults.map((place) => (
                  <div
                    key={place.placeId}
                    onClick={() => setMapSelectedPlace(mapSelectedPlace?.placeId === place.placeId ? null : place)}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      mapSelectedPlace?.placeId === place.placeId
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-border hover:border-blue-200 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.address}</p>
                      {place.rating && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                          {place.rating.toFixed(1)}
                          {place.userRatingsTotal > 0 && <span className="text-muted-foreground">({place.userRatingsTotal} reviews)</span>}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleSelectMapPlace(place); }}
                      className="rounded-lg shrink-0 gap-1 text-xs"
                    >
                      Import <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Mini Map Preview */}
              {mapSelectedPlace?.lat && mapSelectedPlace?.lng && (
                <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                  <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {mapSelectedPlace.name}
                    </p>
                    <a
                      href={`https://maps.google.com/?q=${mapSelectedPlace.lat},${mapSelectedPlace.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Open in Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <iframe
                    title="Location preview"
                    src={`https://maps.google.com/maps?q=${mapSelectedPlace.lat},${mapSelectedPlace.lng}&z=16&output=embed`}
                    className="w-full h-56 border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}

          {mapSearchResults.length === 0 && !mapSearchLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Enter a business name or type above and click Search</p>
              <p className="text-xs mt-1 opacity-70">Results are filtered to Puerto Rico only</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Lead Dialog ── */}
      <Dialog open={!!editingLead} onOpenChange={open => !open && setEditingLead(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead — {editingLead?.name}</DialogTitle>
            <DialogDescription>Update the scouted business information.</DialogDescription>
          </DialogHeader>
          <Form {...editLeadForm}>
            <form onSubmit={editLeadForm.handleSubmit(values => updateLead({ id: editingLead!.id, data: values }))} className="space-y-4">
              <LeadFormFields form={editLeadForm} categories={categoriesData?.categories ?? []} />
              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingLead(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isUpdatingLead} className="rounded-xl gap-2">
                  {isUpdatingLead ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Business Edit Dialog ── */}
      <Dialog open={!!editingBusiness} onOpenChange={open => !open && setEditingBusiness(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Business — {editingBusiness?.name}</DialogTitle></DialogHeader>
          <Form {...businessForm}>
            <form onSubmit={businessForm.handleSubmit(values => adminUpdateBusiness({ id: editingBusiness.id, data: values }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={businessForm.control} name="name" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Business Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={businessForm.control} name="slug" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5" /> Custom URL Slug</FormLabel>
                    <FormControl>
                      <div className="flex items-center rounded-xl border border-border overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                        <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r border-border select-none whitespace-nowrap">/businesses/</span>
                        <input {...field} className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-mono" placeholder="my-business-name" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={businessForm.control} name="description" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea className="rounded-xl min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={businessForm.control} name="categoryId" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString() ?? ""}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>{categoriesData?.categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={businessForm.control} name="municipality" render={({ field }) => (
                  <FormItem><FormLabel>Municipality</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select municipality" /></SelectTrigger></FormControl>
                      <SelectContent className="max-h-[200px]">{MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={businessForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={businessForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={businessForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={businessForm.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={businessForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex gap-6 pt-2">
                <FormField control={businessForm.control} name="featured" render={({ field }) => (<FormItem className="flex items-center gap-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0 cursor-pointer">⭐ Featured</FormLabel></FormItem>)} />
                <FormField control={businessForm.control} name="isClaimed" render={({ field }) => (<FormItem className="flex items-center gap-3"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="!mt-0 cursor-pointer">✓ Claimed</FormLabel></FormItem>)} />
              </div>
              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingBusiness(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSavingBusiness} className="rounded-xl gap-2">
                  {isSavingBusiness ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Add User Dialog ── */}
      <Dialog open={addingUser} onOpenChange={open => { if (!open) { setAddingUser(false); addUserForm.reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account. A role-specific welcome email with login instructions will be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <Form {...addUserForm}>
            <form onSubmit={addUserForm.handleSubmit(values => adminCreateUser({ data: values }))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={addUserForm.control} name="firstName" render={({ field }) => (
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input className="rounded-xl" placeholder="María" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addUserForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input className="rounded-xl" placeholder="García" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={addUserForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="email" className="rounded-xl" placeholder="user@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={addUserForm.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="user">Regular User — browse &amp; review businesses</SelectItem>
                      <SelectItem value="business_owner">Business Owner — manage listings</SelectItem>
                      <SelectItem value="admin">Admin — full platform access</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                <Mail className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                A welcome email will be sent to this address with login instructions tailored to their role.
              </div>
              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => { setAddingUser(false); addUserForm.reset(); }} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isCreatingUser} className="rounded-xl gap-2">
                  {isCreatingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create User</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── User Edit Dialog ── */}
      <Dialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          {editingUser && (
            <>
              <DialogHeader><DialogTitle>Edit User — @{editingUser?.username}</DialogTitle></DialogHeader>
              <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(values => adminUpdateUser({ id: editingUser.id, data: values }))} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {editingUser?.profileImage ? <img src={editingUser.profileImage} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-primary">{(editingUser?.firstName?.[0] ?? editingUser?.username?.[0] ?? "?").toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{editingUser?.firstName} {editingUser?.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{editingUser?.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{editingUser?.email}</p>
                </div>
                {(editingUser as any).emailVerified ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0">Unverified</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={userForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={userForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={userForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" className="rounded-xl" placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={userForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" className="rounded-xl" placeholder="+1 (555) 000-0000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={userForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="user">Regular User</SelectItem><SelectItem value="business_owner">Business Owner</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="emailVerified" render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border p-3 bg-muted/20">
                  <div><FormLabel className="cursor-pointer">Mark Email as Verified</FormLabel></div>
                  <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2 sm:mr-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendPasswordReset}
                    disabled={sendingPasswordReset}
                    className="rounded-xl gap-1.5 text-amber-600 border-amber-300/50 hover:bg-amber-50"
                  >
                    {sendingPasswordReset ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <>📧 Send Password Reset</>}
                  </Button>
                </div>
                <div className="flex gap-2 ml-auto w-full sm:w-auto">
                  <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="rounded-xl flex-1 sm:flex-none">Cancel</Button>
                  <Button type="submit" disabled={isSavingUser} className="rounded-xl gap-2 flex-1 sm:flex-none">
                    {isSavingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── BUSINESS STATS MODAL ── */}
      <Dialog open={statsBusinessId !== null} onOpenChange={open => !open && setStatsBusinessId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-600" />
              Business Statistics
            </DialogTitle>
            <DialogDescription>
              {filteredBusinesses.find(b => b.id === statsBusinessId)?.name || "Loading..."}
            </DialogDescription>
          </DialogHeader>

          {statsBusinessId && filteredBusinesses.find(b => b.id === statsBusinessId) && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* Page Views Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-900">Page Views</p>
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{filteredBusinesses.find(b => b.id === statsBusinessId)?.pageViews || 0}</p>
                </div>

                {/* Website Clicks Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-emerald-900">Website</p>
                    <Globe className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{filteredBusinesses.find(b => b.id === statsBusinessId)?.websiteClicks || 0}</p>
                </div>

                {/* Maps Clicks Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-purple-900">Maps</p>
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{filteredBusinesses.find(b => b.id === statsBusinessId)?.mapsClicks || 0}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                <p className="font-semibold mb-1">Metrics explained:</p>
                <ul className="space-y-1 text-slate-600">
                  <li>• <strong>Page Views:</strong> Times the business spotlight page was visited</li>
                  <li>• <strong>Website Clicks:</strong> Clicks on the "Visit Website" link</li>
                  <li>• <strong>Maps Clicks:</strong> Clicks on map/directions buttons</li>
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Assign Business Owner Dialog ── */}
      <Dialog open={!!assigningOwner} onOpenChange={open => { if (!open) { setAssigningOwner(null); setAssignOwnerSearch(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600" /> Assign Business Owner
            </DialogTitle>
            <DialogDescription>
              Search for a user to become the owner of <strong>{assigningOwner?.name}</strong>. The business will be marked as claimed and the user's role will be updated to Business Owner if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 rounded-xl"
                placeholder="Search by name or email…"
                value={assignOwnerSearch}
                onChange={e => setAssignOwnerSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border divide-y">
              {(() => {
                const q = assignOwnerSearch.toLowerCase().trim();
                const filtered = (usersData?.users ?? []).filter(u => {
                  if (!q) return true;
                  const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
                  return fullName.includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.username ?? "").toLowerCase().includes(q);
                });
                if (filtered.length === 0) {
                  return (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {assignOwnerSearch ? `No users found matching "${assignOwnerSearch}"` : "No users yet. Create one below."}
                    </div>
                  );
                }
                return filtered.slice(0, 20).map(u => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(u.firstName?.[0] ?? u.username?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.email ?? "No email"}</p>
                    </div>
                    <RoleBadge role={u.role ?? undefined} />
                    <Button
                      size="sm"
                      className="rounded-xl shrink-0"
                      disabled={assignOwnerLoading}
                      onClick={() => handleAssignOwner(u.id)}
                    >
                      {assignOwnerLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign"}
                    </Button>
                  </div>
                ));
              })()}
            </div>

            <div className="border-t pt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Can't find them?</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
                onClick={() => { setAssigningOwner(null); setAddingUser(true); }}
              >
                <UserPlus className="w-4 h-4" /> Create New User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Shared Lead Form Fields ───────────────────────────────────────────────────

function LeadFormFields({ form, categories }: { form: any; categories: any[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField control={form.control} name="name" render={({ field }: any) => (
        <FormItem className="col-span-2"><FormLabel>Business Name *</FormLabel><FormControl><Input className="rounded-xl" placeholder="e.g. La Placita Bakery" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="description" render={({ field }: any) => (
        <FormItem className="col-span-2"><FormLabel>Description *</FormLabel><FormControl><Textarea className="rounded-xl min-h-[80px]" placeholder="Briefly describe what this business offers…" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="categoryId" render={({ field }: any) => (
        <FormItem>
          <FormLabel>Category</FormLabel>
          <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString() ?? ""}>
            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
            <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="municipality" render={({ field }: any) => (
        <FormItem>
          <FormLabel>Municipality *</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select municipality" /></SelectTrigger></FormControl>
            <SelectContent className="max-h-[200px]">{MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="address" render={({ field }: any) => (
        <FormItem className="col-span-2"><FormLabel>Street Address</FormLabel><FormControl><Input className="rounded-xl" placeholder="123 Calle Luna, San Juan" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="phone" render={({ field }: any) => (
        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="rounded-xl" placeholder="(787) 000-0000" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="email" render={({ field }: any) => (
        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" className="rounded-xl" placeholder="info@business.com" {...field} /></FormControl><FormMessage /></FormItem>
      )} />
      <FormField control={form.control} name="website" render={({ field }: any) => (
        <FormItem className="col-span-2">
          <FormLabel className="flex items-center gap-1"><Link className="w-3.5 h-3.5" /> Website</FormLabel>
          <FormControl><Input className="rounded-xl" placeholder="https://www.business.com" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
}

// ── Slider Settings Section ──────────────────────────────────────────────────

interface SliderImage {
  id: number;
  imageUrl: string;
  city: string;
  region: string;
  sortOrder: number;
}

function SliderSettingsSection() {
  const [sliders, setSliders] = useState<SliderImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SliderImage | null>(null);
  const [editForm, setEditForm] = useState({ city: "", region: "", imageUrl: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchSliders();
  }, []);

  useEffect(() => {
    if (section === "email-logs" && isAdmin) {
      fetchEmailLogs();
    }
  }, [section, emailLogsOffset, emailLogsStatusFilter, emailLogsTypeFilter]);

  const fetchSliders = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/slider-settings`);
      if (res.ok) {
        const { sliders: data } = await res.json();
        setSliders(data.sort((a: SliderImage, b: SliderImage) => a.sortOrder - b.sortOrder));
      }
    } catch (err) {
      console.error("Failed to fetch sliders:", err);
      toast({ title: "Error loading slider settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true);
    try {
      const token = useAuth().getToken ? await useAuth().getToken() : "";
      const params = new URLSearchParams({ limit: "50", offset: emailLogsOffset.toString() });
      if (emailLogsStatusFilter) params.append("status", emailLogsStatusFilter);
      if (emailLogsTypeFilter) params.append("emailType", emailLogsTypeFilter);
      
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/email-logs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const { logs, total } = await res.json();
        setEmailLogs(logs);
        setEmailLogsTotal(total);
      }
    } catch (err) {
      console.error("Failed to fetch email logs:", err);
      toast({ title: "Error loading email logs", variant: "destructive" });
    } finally {
      setEmailLogsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing || !editForm.city || !editForm.region || !editForm.imageUrl) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/slider-settings/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast({ title: "Slider updated successfully" });
        setEditing(null);
        fetchSliders();
      }
    } catch (err) {
      console.error("Failed to update slider:", err);
      toast({ title: "Failed to update slider", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this slider image?")) return;

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/slider-settings/${id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        toast({ title: "Slider deleted successfully" });
        fetchSliders();
      }
    } catch (err) {
      console.error("Failed to delete slider:", err);
      toast({ title: "Failed to delete slider", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-blue-900">Homepage Slider Settings</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Manage the hero image carousel displayed on the homepage. Edit city labels and image URLs.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-border rounded-2xl p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40 animate-spin" />
          <p className="text-muted-foreground">Loading slider settings...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sliders.map(slider => (
            <div key={slider.id} className={`bg-white border-2 rounded-2xl p-5 shadow-sm ${editing?.id === slider.id ? "border-blue-400 bg-blue-50" : "border-border hover:border-border-light"}`}>
              {editing?.id === slider.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">City Name</label>
                      <Input
                        value={editForm.city}
                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="e.g. Aguadilla"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">Region</label>
                      <Input
                        value={editForm.region}
                        onChange={e => setEditForm({ ...editForm, region: e.target.value })}
                        placeholder="e.g. West"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2 block">Image URL (relative path)</label>
                    <Input
                      value={editForm.imageUrl}
                      onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })}
                      placeholder="e.g. images/hero-crash-boat.png"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdate} className="rounded-xl gap-2">
                      <Check className="w-4 h-4" /> Save Changes
                    </Button>
                    <Button onClick={() => setEditing(null)} variant="outline" className="rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={`${import.meta.env.BASE_URL}${slider.imageUrl}`}
                      alt={`${slider.city}, ${slider.region}`}
                      className="w-24 h-24 rounded-lg object-cover border border-border"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{slider.city}, {slider.region}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{slider.imageUrl}</p>
                      <p className="text-xs text-muted-foreground">Sort Order: {slider.sortOrder}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditing(slider);
                        setEditForm({ city: slider.city, region: slider.region, imageUrl: slider.imageUrl });
                      }}
                      variant="outline"
                      className="rounded-xl gap-2"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(slider.id)}
                      variant="outline"
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, highlight, onClick }: { icon: any; label: string; value: number; color: string; highlight?: boolean; onClick?: () => void }) {
  const colors: Record<string, string> = { blue: "text-blue-500", amber: "text-amber-500", purple: "text-purple-500", indigo: "text-indigo-500", violet: "text-violet-500" };
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl p-5 border shadow-sm ${highlight ? "border-amber-200" : "border-border"} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}>
      <Icon className={`w-5 h-5 ${colors[color]} mb-3`} />
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold font-display ${highlight ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub: string; color: string; icon: any }) {
  return (
    <div className={`rounded-2xl p-5 border ${color} flex items-start gap-4`}>
      <Icon className="w-5 h-5 mt-0.5 opacity-70" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-bold font-display">{value}</p>
        <p className="text-xs opacity-60 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role?: string }) {
  if (role === "admin") return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Admin</Badge>;
  if (role === "business_owner") return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Business Owner</Badge>;
  return <Badge variant="secondary">User</Badge>;
}
