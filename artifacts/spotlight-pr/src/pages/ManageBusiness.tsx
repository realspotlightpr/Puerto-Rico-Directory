import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DOMPurify from "dompurify";
import {
  Store, MapPin, Phone, Globe, Upload, Star, MessageSquare,
  ArrowLeft, CheckCircle2, Clock, XCircle, Save, Instagram,
  Facebook, Twitter, ChevronRight, Loader2, User, Bot, Link2, BarChart3, Tag, Youtube,
  Wand2, Eye, Code, RefreshCw, Check, X,
  Image as ImageIcon, Sparkles, Calendar, Download, Trash2, LayoutGrid,
  Inbox, FormInput, Mail, MailOpen, Plus, GripVertical, ToggleLeft, ToggleRight,
} from "lucide-react";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { ImageStudio } from "@/components/dashboard/ImageStudio";
import { SocialPlanner } from "@/components/dashboard/SocialPlanner";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetBusiness,
  useUpdateBusiness,
  useListBusinessReviews,
  useListCategories,
  useGetDashboardFormConfig,
  useUpdateFormConfig,
  useGetBusinessMessages,
  useMarkMessageRead,
  useDeleteMessage,
} from "@workspace/api-client-react";
import type { BusinessDetail, UpdateBusinessBody, FormFieldConfig } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MUNICIPALITIES } from "@/lib/constants";
import { format } from "date-fns";

const detailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().min(10, "Description is too short."),
  categoryId: z.coerce.number().min(1, "Please select a category."),
  municipality: z.string().min(1, "Please select a municipality."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  specialOffer: z.string().max(160, "Special offer must be 160 characters or fewer.").optional().or(z.literal("")),
  slug: z.string()
    .min(2, "URL must be at least 2 characters.")
    .max(100, "URL is too long.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use only lowercase letters, numbers, and hyphens (e.g. my-business).")
    .optional()
    .or(z.literal("")),
});

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const mediaSchema = z.object({
  logoUrl: z.string().optional().or(z.literal("")),
  coverUrl: z.string().optional().or(z.literal("")),
});

const socialSchema = z.object({
  facebook: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" />Live</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1"><Clock className="w-3 h-3" />Pending Review</Badge>;
}

const API_BASE = import.meta.env.BASE_URL || "/";

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["div", "p", "h1", "h2", "h3", "h4", "span", "ul", "ol", "li", "strong", "em", "br", "section", "article"],
    ALLOWED_ATTR: ["style"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "link"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "href", "src"],
  });
}

function HtmlDescriptionEditor({
  value,
  onChange,
  businessId,
}: {
  value: string;
  onChange: (v: string) => void;
  businessId: number;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [brief, setBrief] = useState("");
  const [aiHtml, setAiHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const generate = async () => {
    if (!brief.trim()) return;
    setIsGenerating(true);
    setAiHtml("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}api/openai/generate-about-html`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ businessId, brief }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const data = await res.json();
      setAiHtml(data.html || "");
    } catch {
      toast({ title: "Error", description: "Could not generate design. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptAi = () => {
    onChange(aiHtml);
    setShowAiPanel(false);
    setAiHtml("");
    setBrief("");
    toast({ title: "Design applied!", description: "The AI-generated HTML has been placed in the editor." });
  };

  const sanitized = sanitizeHtml(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mode === "edit" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Code className="w-3.5 h-3.5" /> Edit HTML
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${mode === "preview" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => setShowAiPanel(v => !v)}
        >
          <Wand2 className="w-3.5 h-3.5" /> AI Design
        </Button>
      </div>

      {mode === "edit" ? (
        <textarea
          className="w-full min-h-[160px] rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Enter your description here. You can type plain text or use HTML with inline styles."
          spellCheck={false}
        />
      ) : (
        <div
          className="min-h-[160px] rounded-xl border border-border bg-white p-4 text-sm leading-relaxed text-foreground overflow-auto about-html-preview"
          dangerouslySetInnerHTML={{ __html: sanitized || "<p class='text-muted-foreground italic'>Preview will appear here…</p>" }}
        />
      )}

      {showAiPanel && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-emerald-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm text-foreground">AI Design Generator</h4>
            </div>
            <button type="button" onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Describe the look and feel you want for your about section. Be specific about colors, style, what to highlight, etc.</p>
          <textarea
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder={`e.g. "Modern coffee shop vibe, warm teal and brown tones, highlight our specialty drinks and cozy atmosphere"`}
            value={brief}
            onChange={e => setBrief(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-lg gap-1.5"
              onClick={generate}
              disabled={isGenerating || !brief.trim()}
            >
              {isGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</> : <><Wand2 className="w-3.5 h-3.5" /> Generate</>}
            </Button>
            {aiHtml && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg gap-1.5"
                onClick={generate}
                disabled={isGenerating}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </Button>
            )}
          </div>

          {aiHtml && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">AI Preview:</p>
              <div
                className="rounded-xl border border-border bg-white p-4 text-sm leading-relaxed overflow-auto max-h-64 about-html-preview"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(aiHtml) }}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" className="rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={acceptAi}>
                  <Check className="w-3.5 h-3.5" /> Accept & Use This Design
                </Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => setAiHtml("")}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MediaItem {
  id: number;
  url: string;
  prompt?: string;
  size?: string;
  createdAt: string;
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────────
function InboxTab({ businessId }: { businessId: number }) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading, refetch } = useGetBusinessMessages(businessId);
  const { mutate: markRead } = useMarkMessageRead();
  const { mutate: deleteMsg } = useDeleteMessage();

  const messages = data?.messages ?? [];
  const unread = data?.unreadCount ?? 0;

  function handleExpand(id: number, isRead: boolean) {
    setExpandedId(prev => (prev === id ? null : id));
    if (!isRead) {
      markRead(
        { businessId, msgId: id },
        { onSuccess: () => { refetch(); } }
      );
    }
  }

  function handleDelete(id: number) {
    deleteMsg(
      { businessId, msgId: id },
      {
        onSuccess: () => {
          toast({ title: "Message deleted" });
          refetch();
          if (expandedId === id) setExpandedId(null);
        },
      }
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold font-display flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" /> Messages Inbox
          {unread > 0 && (
            <span className="ml-1 bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">{unread} new</span>
          )}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No messages yet</p>
          <p className="text-sm mt-1">Messages from your business page contact form will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`rounded-xl border transition-all ${msg.isRead ? "border-border bg-white" : "border-primary/30 bg-primary/5"}`}
            >
              <button
                className="w-full text-left px-4 py-3 flex items-center gap-3"
                onClick={() => handleExpand(msg.id, msg.isRead)}
              >
                <div className="shrink-0">
                  {msg.isRead ? (
                    <MailOpen className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Mail className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm truncate ${!msg.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                      {msg.senderName}
                    </span>
                    {!msg.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate block">
                    {msg.senderEmail} · {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedId === msg.id ? "rotate-90" : ""}`} />
              </button>
              {expandedId === msg.id && (
                <div className="border-t border-border px-4 py-4 space-y-3">
                  <div className="space-y-2">
                    {Object.entries(msg.data).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{key}</span>
                        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive gap-2"
                      onClick={() => handleDelete(msg.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
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

// ── Form Builder Tab ──────────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
] as const;

function FormBuilderTab({ businessId }: { businessId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: config, isLoading } = useGetDashboardFormConfig(businessId);
  const { mutate: saveConfig, isPending: saving } = useUpdateFormConfig();

  const [title, setTitle] = useState("Send a Message");
  const [submitText, setSubmitText] = useState("Send Message");
  const [fields, setFields] = useState<FormFieldConfig[]>([]);

  useEffect(() => {
    if (config) {
      setTitle(config.title);
      setSubmitText(config.submitButtonText);
      setFields(config.fields);
    }
  }, [config]);

  function toggleEnabled(id: string) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  }

  function toggleRequired(id: string) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, required: !f.required } : f));
  }

  function updateLabel(id: string, label: string) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, label } : f));
  }

  function updatePlaceholder(id: string, placeholder: string) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, placeholder } : f));
  }

  function addCustomField() {
    const newField: FormFieldConfig = {
      id: `custom_${Date.now()}`,
      label: "New Field",
      type: "text",
      placeholder: "",
      required: false,
      enabled: true,
    };
    setFields(prev => [...prev, newField]);
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id));
  }

  function updateFieldType(id: string, type: FormFieldConfig["type"]) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  }

  function moveField(index: number, direction: "up" | "down") {
    setFields(prev => {
      const next = [...prev];
      const swap = direction === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  function handleSave() {
    saveConfig(
      { id: businessId, data: { title, submitButtonText: submitText, fields } },
      {
        onSuccess: () => {
          toast({ title: "Form saved!", description: "Your contact form has been updated." });
          queryClient.invalidateQueries({ queryKey: [`/api/dashboard/businesses/${businessId}/form-config`] });
          queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/form-config`] });
        },
        onError: () => {
          toast({ title: "Failed to save", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Settings */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
        <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
          <FormInput className="w-5 h-5 text-primary" /> Contact Form Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Form Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Send a Message"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Submit Button Text</label>
            <input
              type="text"
              value={submitText}
              onChange={e => setSubmitText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Send Message"
            />
          </div>
        </div>

        {/* Fields List */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Form Fields</h3>
            <Button size="sm" variant="outline" onClick={addCustomField} className="gap-1.5 rounded-lg h-8 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Field
            </Button>
          </div>

          {fields.map((field, idx) => (
            <div
              key={field.id}
              className={`rounded-xl border p-4 space-y-3 transition-all ${field.enabled ? "border-border bg-white" : "border-border/50 bg-muted/30 opacity-60"}`}
            >
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveField(idx, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <GripVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Toggle enabled */}
                <button onClick={() => toggleEnabled(field.id)} className="shrink-0">
                  {field.enabled
                    ? <ToggleRight className="w-7 h-7 text-primary" />
                    : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
                </button>

                {/* Label input */}
                <input
                  type="text"
                  value={field.label}
                  onChange={e => updateLabel(field.id, e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />

                {/* Type select */}
                <select
                  value={field.type}
                  onChange={e => updateFieldType(field.id, e.target.value as FormFieldConfig["type"])}
                  className="px-2 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:border-primary"
                >
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                {/* Required toggle */}
                <button
                  onClick={() => toggleRequired(field.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium ${field.required ? "bg-amber-50 border-amber-300 text-amber-700" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
                >
                  {field.required ? "Required" : "Optional"}
                </button>

                {/* Delete (only custom fields) */}
                {!["name", "email", "message"].includes(field.id) && (
                  <button onClick={() => removeField(field.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Placeholder input */}
              {field.enabled && (
                <input
                  type="text"
                  value={field.placeholder ?? ""}
                  onChange={e => updatePlaceholder(field.id, e.target.value)}
                  placeholder={`Placeholder text for "${field.label}"…`}
                  className="w-full px-3 py-1.5 rounded-lg border border-border/60 text-xs text-muted-foreground focus:outline-none focus:border-primary bg-muted/20"
                />
              )}
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="border border-dashed border-border rounded-xl p-4 mb-6 bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Live Preview</p>
          <div className="bg-card rounded-xl border border-border p-4 max-w-sm">
            <p className="font-bold text-sm mb-3 font-display flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> {title || "Send a Message"}
            </p>
            <div className="space-y-2">
              {fields.filter(f => f.enabled).map(field => (
                <div key={field.id}>
                  <label className="text-xs text-muted-foreground block mb-0.5">
                    {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <div className="w-full h-12 px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground/50 bg-white">
                      {field.placeholder || "…"}
                    </div>
                  ) : (
                    <div className="w-full h-7 px-2 py-1 rounded-lg border border-border text-xs text-muted-foreground/50 bg-white">
                      {field.placeholder || "…"}
                    </div>
                  )}
                </div>
              ))}
              <button className="w-full bg-primary text-white text-xs font-semibold rounded-lg py-2 mt-1">
                {submitText || "Send Message"}
              </button>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Form"}
        </Button>
      </div>
    </div>
  );
}

export default function ManageBusiness() {
  const [, params] = useRoute("/manage/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading, getToken } = useAuth();
  const { toast } = useToast();
  const id = parseInt(params?.id ?? "0");

  const { data: businessData, isLoading: bizLoading, refetch } = useGetBusiness(id, {
    query: { enabled: !!id && isAuthenticated },
  });
  const { data: reviewsData, isLoading: reviewsLoading } = useListBusinessReviews(id, {
    query: { enabled: !!id && isAuthenticated },
  });
  const { data: categoriesData } = useListCategories();
  const { mutateAsync: updateBusiness, isPending: isSaving } = useUpdateBusiness();

  const business = businessData;

  // Hours state
  const [hours, setHours] = useState<Record<string, string>>({});

  // Media Library state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);

  const loadMediaItems = useCallback(async () => {
    if (!id || !isAuthenticated) return;
    setMediaLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/media/items?businessId=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.items ?? []);
      }
    } catch {}
    finally { setMediaLoading(false); }
  }, [id, isAuthenticated, getToken]);

  useEffect(() => { loadMediaItems(); }, [loadMediaItems]);

  const deleteMediaItem = async (itemId: number) => {
    setDeletingMediaId(itemId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/media/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setMediaItems(prev => prev.filter(i => i.id !== itemId));
      toast({ title: "Image deleted from Media Library." });
    } catch {
      toast({ title: "Error", description: "Failed to delete image", variant: "destructive" });
    } finally {
      setDeletingMediaId(null);
    }
  };

  const useImageAs = async (url: string, field: "logoUrl" | "coverUrl") => {
    try {
      const payload: any = { [field]: url };
      await updateBusiness({ id, data: payload });
      refetch();
      toast({ title: field === "logoUrl" ? "Logo updated!" : "Cover photo updated!", description: "Your listing has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  // Redirect if not owner
  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
    if (business && user && business.ownerId !== user.id && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, business, user, setLocation]);

  // Sync hours from business data
  useEffect(() => {
    if (business?.hours) setHours(business.hours as Record<string, string>);
  }, [business]);

  // ── Details form ──────────────────────────────────────
  const detailsForm = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", description: "", categoryId: 0, municipality: "", address: "", phone: "", email: "", website: "", specialOffer: "", slug: "" },
  });

  const mediaForm = useForm({
    resolver: zodResolver(mediaSchema),
    defaultValues: { logoUrl: "", coverUrl: "" },
  });

  const socialForm = useForm({
    resolver: zodResolver(socialSchema),
    defaultValues: { facebook: "", instagram: "", twitter: "" },
  });

  // Populate forms when business loads
  useEffect(() => {
    if (!business) return;
    const detail = business as BusinessDetail;
    detailsForm.reset({
      name: business.name ?? "",
      description: business.description ?? "",
      categoryId: business.categoryId ?? 0,
      municipality: business.municipality ?? "",
      address: business.address ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
      specialOffer: detail.specialOffer ?? "",
      slug: business.slug ?? "",
    });
    mediaForm.reset({
      logoUrl: business.logoUrl ?? "",
      coverUrl: business.coverUrl ?? "",
    });
    const sl = detail.socialLinks;
    socialForm.reset({
      facebook: sl?.facebook ?? "",
      instagram: sl?.instagram ?? "",
      twitter: sl?.twitter ?? "",
      youtube: sl?.youtube ?? "",
    });
  }, [business]);

  const saveDetails = async (data: z.infer<typeof detailsSchema>) => {
    try {
      const payload: UpdateBusinessBody = {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        municipality: data.municipality,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        specialOffer: data.specialOffer,
        slug: data.slug || undefined,
      };
      await updateBusiness({ id, data: payload });
      refetch();
      toast({ title: "Details saved!", description: "Your listing has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    }
  };

  const saveMedia = async (data: z.infer<typeof mediaSchema>) => {
    try {
      const payload: UpdateBusinessBody = {
        logoUrl: data.logoUrl,
        coverUrl: data.coverUrl,
      };
      await updateBusiness({ id, data: payload });
      refetch();
      toast({ title: "Media saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const saveSocial = async (data: z.infer<typeof socialSchema>) => {
    try {
      const payload: UpdateBusinessBody = {
        socialLinks: {
          facebook: data.facebook,
          instagram: data.instagram,
          twitter: data.twitter,
          youtube: data.youtube,
        },
      };
      await updateBusiness({ id, data: payload });
      refetch();
      toast({ title: "Social links saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const saveHours = async () => {
    try {
      const payload: UpdateBusinessBody = { hours };
      await updateBusiness({ id, data: payload });
      refetch();
      toast({ title: "Hours saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Business not found</h2>
          <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const avgRating = business.averageRating ?? 0;
  const reviewCount = business.reviewCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold font-display text-foreground leading-tight">{business.name}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={business.status} />
                {business.status === "approved" && (
                  <Link href={`/businesses/${business.slug || String(business.id)}`}>
                    <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      View public listing <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-xl font-bold font-display text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Rating</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold font-display text-foreground">{reviewCount}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending notice ── */}
      {business.status === "pending" && (
        <div className="bg-amber-50 border-b border-amber-200 py-3">
          <div className="container mx-auto px-4 flex items-center gap-2 text-amber-800 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <p>Your listing is <strong>pending review</strong>. Our team will approve it within 24 hours. You can still update your details while you wait.</p>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="details">
          <TabsList className="w-full mb-8 bg-white border border-border rounded-xl p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="details" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Store className="w-4 h-4" /> Details
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Star className="w-4 h-4" /> Reviews {reviewCount > 0 && `(${reviewCount})`}
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Clock className="w-4 h-4" /> Hours
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Upload className="w-4 h-4" /> Media
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-emerald-500 data-[state=active]:text-white gap-2 py-2">
              <Bot className="w-4 h-4" /> AI Assistant
            </TabsTrigger>
            <TabsTrigger value="image-studio" className="flex-1 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white gap-2 py-2">
              <Sparkles className="w-4 h-4" /> Image Studio
            </TabsTrigger>
            <TabsTrigger value="media-library" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <LayoutGrid className="w-4 h-4" /> Media Library {mediaItems.length > 0 && `(${mediaItems.length})`}
            </TabsTrigger>
            <TabsTrigger value="social-planner" className="flex-1 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white gap-2 py-2">
              <Calendar className="w-4 h-4" /> Social Planner
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <BarChart3 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Globe className="w-4 h-4" /> Social Links
            </TabsTrigger>
            <TabsTrigger value="inbox" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Inbox className="w-4 h-4" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="form-builder" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <FormInput className="w-4 h-4" /> Form Builder
            </TabsTrigger>
          </TabsList>

          {/* ── DETAILS ── */}
          <TabsContent value="details">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> Business Information
              </h2>
              <Form {...detailsForm}>
                <form onSubmit={detailsForm.handleSubmit(saveDetails)} className="space-y-6">
                  <FormField control={detailsForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={detailsForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <HtmlDescriptionEditor
                          value={field.value}
                          onChange={field.onChange}
                          businessId={id}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={detailsForm.control} name="categoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {categoriesData?.categories?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={detailsForm.control} name="municipality" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipality <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select town" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[280px] rounded-xl">
                            {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={detailsForm.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Street Address</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="123 Calle Principal" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={detailsForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Business Phone</FormLabel>
                        <FormControl><Input className="rounded-xl" placeholder="(787) 555-0123" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={detailsForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl><Input type="email" className="rounded-xl" placeholder="hello@mybusiness.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={detailsForm.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://www.mybusiness.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* ── Special Offer ── */}
                  <FormField control={detailsForm.control} name="specialOffer" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" /> Special Offer / Promotion
                        <span className="text-xs font-normal text-muted-foreground ml-1">(optional · max 160 chars)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="rounded-xl resize-none min-h-[72px]"
                          placeholder="e.g. 10% off for new customers this month! Mention Spotlight PR."
                          maxLength={160}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">{(field.value || "").length}/160 — Displayed as a highlighted banner on your public listing.</p>
                    </FormItem>
                  )} />

                  {/* ── Custom URL slug ── */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-sm text-foreground">Custom Listing URL</p>
                    </div>
                    <FormField control={detailsForm.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center rounded-xl border border-border bg-white overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r border-border select-none whitespace-nowrap">
                              spotlightpuertorico.com/businesses/
                            </span>
                            <input
                              {...field}
                              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-mono"
                              placeholder="my-business-name"
                              onChange={e => field.onChange(toSlug(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Only lowercase letters, numbers, and hyphens. This is your public listing URL.
                        </p>
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={isSaving} className="rounded-xl gap-2 px-8">
                      {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ── REVIEWS ── */}
          <TabsContent value="reviews">
            <div className="space-y-4">
              {/* Summary card */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold font-display text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</p>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {reviewCount === 0
                    ? "No reviews yet. Once customers discover your listing, their reviews will appear here."
                    : "Reviews help new customers trust your business. Respond to feedback by contacting customers directly."}
                </div>
              </div>

              {reviewsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-border animate-pulse" />)}</div>
              ) : reviewsData?.reviews?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No reviews yet</p>
                  <p className="text-sm mt-1">Share your listing to get your first review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsData?.reviews?.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Customer</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      {r.title && <p className="font-semibold text-foreground mt-3">{r.title}</p>}
                      {r.body && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── HOURS ── */}
          <TabsContent value="hours">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Business Hours
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Leave a day blank to mark it as closed.</p>
              <div className="space-y-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <span className="w-28 text-sm font-medium text-foreground flex-shrink-0">{day}</span>
                    <Input
                      className="rounded-xl text-sm flex-1"
                      placeholder="e.g. 9:00 AM – 6:00 PM  or  Closed"
                      value={hours[day] ?? ""}
                      onChange={e => setHours(prev => ({ ...prev, [day]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-6 mt-6 border-t border-border">
                <Button onClick={saveHours} disabled={isSaving} className="rounded-xl gap-2 px-8">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Hours</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── MEDIA ── */}
          <TabsContent value="media">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Logo & Cover Photo
              </h2>

              <Form {...mediaForm}>
                <form onSubmit={mediaForm.handleSubmit(saveMedia)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <FormField control={mediaForm.control} name="logoUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploadField
                            value={field.value}
                            onChange={field.onChange}
                            label="Business Logo"
                            hint="Square image · PNG or JPG recommended"
                            aspectRatio="square"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={mediaForm.control} name="coverUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploadField
                            value={field.value}
                            onChange={field.onChange}
                            label="Cover / Header Photo"
                            hint="Wide landscape image · 16:9 ratio ideal"
                            aspectRatio="wide"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={isSaving} className="rounded-xl gap-2 px-8">
                      {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Media</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-8 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Performance Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Page Views Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-900">Page Views</p>
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{business?.pageViews || 0}</p>
                  <p className="text-xs text-blue-700 mt-2">Total times your spotlight page was viewed</p>
                </div>

                {/* Website Clicks Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-emerald-900">Website Clicks</p>
                    <Globe className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">{business?.websiteClicks || 0}</p>
                  <p className="text-xs text-emerald-700 mt-2">Visitors clicked on your website link</p>
                </div>

                {/* Maps Clicks Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">Map Clicks</p>
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{business?.mapsClicks || 0}</p>
                  <p className="text-xs text-purple-700 mt-2">Visitors clicked on map/directions</p>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">How we track analytics</p>
                  <p>We automatically track when someone views your business page, clicks the "Visit Website" link, or clicks on map/directions buttons. This helps you understand customer interest and engagement.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── SOCIAL ── */}
          <TabsContent value="social">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Social Media Links
              </h2>
              <Form {...socialForm}>
                <form onSubmit={socialForm.handleSubmit(saveSocial)} className="space-y-6">
                  <FormField control={socialForm.control} name="facebook" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> Facebook</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://facebook.com/yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={socialForm.control} name="instagram" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500" /> Instagram</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://instagram.com/yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={socialForm.control} name="twitter" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Twitter className="w-4 h-4 text-sky-500" /> X / Twitter</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://x.com/yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={socialForm.control} name="youtube" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" /> YouTube</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://youtube.com/@yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={isSaving} className="rounded-xl gap-2 px-8">
                      {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Links</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="ai">
            <AIAssistant businessId={business.id} businessName={business.name} />
          </TabsContent>

          {/* ── IMAGE STUDIO ── */}
          <TabsContent value="image-studio">
            <ImageStudio
              businessId={business.id}
              businessName={business.name}
              onImageSaved={loadMediaItems}
            />
          </TabsContent>

          {/* ── MEDIA LIBRARY ── */}
          <TabsContent value="media-library">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold font-display flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-primary" /> Media Library
                </h2>
                <Badge variant="secondary" className="rounded-full">
                  {mediaItems.length} {mediaItems.length === 1 ? "image" : "images"}
                </Badge>
              </div>

              {mediaLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-14 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8 text-primary/40" />
                  </div>
                  <h3 className="text-lg font-bold font-display mb-2">No images yet</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
                    Generate AI images in the Image Studio tab and save them here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaItems.map(item => (
                    <div key={item.id} className="group relative rounded-xl overflow-hidden border border-border shadow-sm">
                      <img src={item.url} alt={item.prompt ?? ""} className="w-full aspect-square object-cover" />

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        {/* Download */}
                        <a
                          href={item.url}
                          download={`ai-image-${item.id}.png`}
                          className="flex items-center gap-1.5 text-xs bg-white text-foreground rounded-lg px-3 py-1.5 font-medium hover:bg-muted transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                        {/* Use as Logo */}
                        <button
                          onClick={() => useImageAs(item.url, "logoUrl")}
                          className="flex items-center gap-1.5 text-xs bg-primary text-white rounded-lg px-3 py-1.5 font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Store className="w-3 h-3" /> Use as Logo
                        </button>
                        {/* Use as Cover */}
                        <button
                          onClick={() => useImageAs(item.url, "coverUrl")}
                          className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" /> Use as Cover
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => deleteMediaItem(item.id)}
                          disabled={deletingMediaId === item.id}
                          className="flex items-center gap-1.5 text-xs bg-destructive text-white rounded-lg px-3 py-1.5 font-medium hover:bg-destructive/90 transition-colors"
                        >
                          {deletingMediaId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete
                        </button>
                      </div>

                      {/* Prompt badge */}
                      {item.prompt && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                          <p className="text-xs text-white truncate">{item.prompt}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── SOCIAL PLANNER ── */}
          <TabsContent value="social-planner">
            <SocialPlanner
              businessId={business.id}
              businessName={business.name}
            />
          </TabsContent>

          {/* ── INBOX ── */}
          <TabsContent value="inbox">
            <InboxTab businessId={business.id} />
          </TabsContent>

          {/* ── FORM BUILDER ── */}
          <TabsContent value="form-builder">
            <FormBuilderTab businessId={business.id} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
