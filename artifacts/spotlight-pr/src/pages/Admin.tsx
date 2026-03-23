import { useState } from "react";
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
  useAdminUpdateBusiness,
  useAdminUpdateUser,
  useListCategories,
  useAdminGetLeads,
  useAdminCreateLead,
  useAdminUpdateLead,
  useAdminDeleteLead,
} from "@workspace/api-client-react";
import type { Lead } from "@workspace/api-client-react";
import {
  Shield, Users, Store, MessageSquare, Check, X, Star, Trash2, ShieldAlert, Clock,
  LayoutDashboard, Edit2, ChevronRight, Search, Save, Loader2, TrendingUp,
  CheckCircle2, Bell, AlertCircle, UserPlus, Building2, ExternalLink, XCircle,
  Target, Plus, Globe, Phone, Mail, MapPin, BadgeCheck, Link,
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

type AdminSection = "dashboard" | "businesses" | "users" | "reviews" | "notifications" | "leads";
type BusinessTab = "approved" | "pending" | "rejected" | "all";

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
  status: z.enum(["pending", "approved", "rejected"]),
  featured: z.boolean(),
  isClaimed: z.boolean(),
});

const userEditSchema = z.object({
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
type LeadValues = z.infer<typeof leadSchema>;

// ── Main Component ────────────────────────────────────────────────────────────

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [section, setSection] = useState<AdminSection>("dashboard");
  const [businessTab, setBusinessTab] = useState<BusinessTab>("approved");
  const [searchTerm, setSearchTerm] = useState("");
  const [leadSearch, setLeadSearch] = useState("");

  const [editingBusiness, setEditingBusiness] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [addingLead, setAddingLead] = useState(false);

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

  const filteredUsers = (usersData?.users ?? []).filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Mutations ──
  const invalidateBusinesses = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/businesses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/admin/stats`] });
  };
  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: [`/api/admin/leads`] });

  const { mutate: approve } = useApproveBusiness({ mutation: { onSuccess: () => { toast({ title: "Business approved" }); invalidateBusinesses(); } } });
  const { mutate: reject } = useRejectBusiness({ mutation: { onSuccess: () => { toast({ title: "Business rejected" }); invalidateBusinesses(); } } });
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

  // ── Forms ──
  const businessForm = useForm<BusinessEditValues>({
    resolver: zodResolver(businessEditSchema),
    defaultValues: { name: "", description: "", municipality: "", address: "", phone: "", email: "", website: "", status: "pending", featured: false, isClaimed: false },
  });

  const userForm = useForm<UserEditValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { firstName: "", lastName: "", role: "user" },
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
      email: b.email ?? "", website: b.website ?? "", status: b.status ?? "pending",
      featured: b.featured ?? false, isClaimed: b.isClaimed ?? false,
    });
  };

  const openUserEdit = (u: any) => {
    setEditingUser(u);
    userForm.reset({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", role: u.role ?? "user" });
  };

  const openLeadEdit = (l: Lead) => {
    setEditingLead(l);
    editLeadForm.reset({
      name: l.name ?? "", description: l.description ?? "", municipality: l.municipality ?? "",
      categoryId: l.categoryId ?? undefined, address: l.address ?? "", phone: l.phone ?? "",
      email: l.email ?? "", website: l.website ?? "",
    });
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

  const navItems: { id: AdminSection; label: string; icon: any; badge?: number; badgeColor?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "businesses", label: "Business Listings", icon: Store },
    { id: "leads", label: "Leads", icon: Target, badge: unclaimedLeads || undefined, badgeColor: "bg-violet-500" },
    { id: "users", label: "Users & Owners", icon: Users },
    { id: "reviews", label: "Reviews", icon: MessageSquare },
    { id: "notifications", label: "Notifications", icon: Bell, badge: totalNotifications || undefined, badgeColor: "bg-rose-500" },
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
            return (
              <button
                key={item.id}
                onClick={() => { setSection(item.id); setSearchTerm(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? "bg-primary text-white shadow-md shadow-primary/20" : "text-foreground hover:bg-muted/60"}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : item.id === "notifications" && totalNotifications > 0 ? "text-rose-500" : item.id === "leads" ? "text-violet-500" : "text-muted-foreground"}`} />
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
            {section === "leads" && (
              <Button onClick={() => setAddingLead(true)} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Scout a Business
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
            <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 font-medium">User</th>
                      <th className="p-4 font-medium">Username</th>
                      <th className="p-4 font-medium">Joined</th>
                      <th className="p-4 font-medium">Role</th>
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
                              <p className="font-semibold">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-muted-foreground">{(u as any).email ?? ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">@{u.username}</td>
                        <td className="p-4 text-muted-foreground text-sm">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                        <td className="p-4"><RoleBadge role={u.role} /></td>
                        <td className="p-4 text-right">
                          <Button size="icon" variant="outline" title="Edit User" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => openUserEdit(u)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-muted-foreground">No users found.</td></tr>}
                  </tbody>
                </table>
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
        </div>
      </div>

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

      {/* ── User Edit Dialog ── */}
      <Dialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit User — @{editingUser?.username}</DialogTitle></DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(values => adminUpdateUser({ id: editingUser.id, data: values }))} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {editingUser?.profileImage ? <img src={editingUser.profileImage} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-primary">{(editingUser?.firstName?.[0] ?? editingUser?.username?.[0] ?? "?").toUpperCase()}</span>}
                </div>
                <div>
                  <p className="font-medium text-sm">{editingUser?.firstName} {editingUser?.lastName}</p>
                  <p className="text-xs text-muted-foreground">@{editingUser?.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={userForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={userForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={userForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="user">Regular User</SelectItem><SelectItem value="business_owner">Business Owner</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isSavingUser} className="rounded-xl gap-2">
                  {isSavingUser ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
