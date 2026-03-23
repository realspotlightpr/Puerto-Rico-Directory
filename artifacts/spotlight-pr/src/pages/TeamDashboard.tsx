import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetTeamMe,
  useGetTeamStats,
  useGetTeamMySubmissions,
  useGetTeamPendingReviews,
  useAddTeamBusiness,
  useApproveTeamBusiness,
  useRejectTeamBusiness,
  useVerifyTeamBusiness,
  useListCategories,
} from "@workspace/api-client-react";
import {
  Store, TrendingUp, Clock, Check, X, CheckCircle2, Users,
  Plus, Search, Star, Building2, Globe, Phone, Mail, MapPin,
  BadgeCheck, ChevronRight, Loader2, Save, LayoutDashboard, Target,
  Shield, ExternalLink, RefreshCw,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { MUNICIPALITIES } from "@/lib/constants";

const addBusinessSchema = z.object({
  name: z.string().min(2, "Business name required"),
  description: z.string().min(10, "Description required (at least 10 chars)"),
  municipality: z.string().min(1, "Municipality required"),
  categoryId: z.coerce.number().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  website: z.string().url("Valid URL required").optional().or(z.literal("")),
});

type AddBusinessValues = z.infer<typeof addBusinessSchema>;
type Section = "dashboard" | "my-listings" | "pending-reviews";

const PERMISSION_LABELS: Record<string, { label: string; color: string }> = {
  add_businesses: { label: "Add Businesses", color: "bg-blue-100 text-blue-700" },
  approve: { label: "Approve/Deny", color: "bg-amber-100 text-amber-700" },
  verify: { label: "Verify Listings", color: "bg-emerald-100 text-emerald-700" },
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Live</Badge>;
  if (status === "rejected") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1 text-xs"><X className="w-3 h-3" />Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold font-display">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function TeamDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [addingBusiness, setAddingBusiness] = useState(false);

  const { data: teamMe, isLoading: meLoading } = useGetTeamMe({ query: { enabled: isAuthenticated, retry: false } });
  const { data: stats } = useGetTeamStats({ query: { enabled: isAuthenticated && !!teamMe } });
  const { data: submissionsData, refetch: refetchSubmissions } = useGetTeamMySubmissions({ query: { enabled: isAuthenticated && !!teamMe } });
  const { data: pendingData, refetch: refetchPending } = useGetTeamPendingReviews({ query: { enabled: isAuthenticated && !!teamMe && (teamMe?.permissions ?? []).includes("approve") } });
  const { data: categoriesData } = useListCategories();

  const permissions: string[] = (teamMe as any)?.permissions ?? [];
  const canAddBusinesses = permissions.includes("add_businesses");
  const canApprove = permissions.includes("approve");
  const canVerify = permissions.includes("verify");

  const addForm = useForm<AddBusinessValues>({
    resolver: zodResolver(addBusinessSchema),
    defaultValues: { name: "", description: "", municipality: "", address: "", phone: "", email: "", website: "" },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/team/my-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/team/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/team/pending-reviews"] });
  };

  const { mutate: addBusiness, isPending: isAdding } = useAddTeamBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: "Business added!", description: "It has been added to the directory." });
        setAddingBusiness(false);
        addForm.reset();
        invalidateAll();
      },
      onError: (e: any) => toast({ title: "Failed to add", description: e?.message, variant: "destructive" }),
    },
  });

  const { mutate: approveBusiness } = useApproveTeamBusiness({
    mutation: {
      onSuccess: () => { toast({ title: "Business approved" }); invalidateAll(); refetchPending(); },
      onError: () => toast({ title: "Failed to approve", variant: "destructive" }),
    },
  });

  const { mutate: rejectBusiness } = useRejectTeamBusiness({
    mutation: {
      onSuccess: () => { toast({ title: "Business rejected" }); invalidateAll(); refetchPending(); },
      onError: () => toast({ title: "Failed to reject", variant: "destructive" }),
    },
  });

  const { mutate: verifyBusiness } = useVerifyTeamBusiness({
    mutation: {
      onSuccess: () => { toast({ title: "Business verification updated" }); invalidateAll(); refetchSubmissions(); },
      onError: () => toast({ title: "Failed to verify", variant: "destructive" }),
    },
  });

  if (authLoading || meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (!teamMe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Shield className="w-16 h-16 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold font-display">Access Restricted</h1>
        <p className="text-muted-foreground text-center max-w-sm">You are not a team member. Ask an admin to add you to the team.</p>
        <Button variant="outline" onClick={() => setLocation("/")} className="rounded-xl">Return Home</Button>
      </div>
    );
  }

  const categories = categoriesData?.categories ?? [];
  const submissions = (submissionsData?.businesses ?? []).filter(b => {
    if (!searchTerm) return true;
    return b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.municipality?.toLowerCase().includes(searchTerm.toLowerCase());
  });
  const pendingBusinesses = pendingData?.businesses ?? [];

  const navItems: { id: Section; label: string; icon: any; badge?: number }[] = [
    { id: "dashboard", label: "My Dashboard", icon: LayoutDashboard },
    { id: "my-listings", label: "My Submissions", icon: Target, badge: submissions.length || undefined },
    ...(canApprove ? [{ id: "pending-reviews" as Section, label: "Pending Reviews", icon: Clock, badge: pendingBusinesses.length || undefined }] : []),
  ];

  const memberName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.username || "Team Member";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Sidebar ── */}
      <div className="w-64 bg-white border-r border-border shadow-sm flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
              {user?.profileImage
                ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                : <span className="font-bold text-primary">{(user?.firstName?.[0] ?? user?.username?.[0] ?? "T").toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold font-display truncate">{memberName}</p>
              <p className="text-xs text-muted-foreground capitalize">{(teamMe as any).type?.replace("_", " ") ?? "Team Member"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {permissions.map(p => (
              <span key={p} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PERMISSION_LABELS[p]?.color ?? "bg-muted text-muted-foreground"}`}>
                {PERMISSION_LABELS[p]?.label ?? p}
              </span>
            ))}
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
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-muted-foreground"}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge ? (
                  <span className={`text-xs min-w-[20px] h-5 px-1.5 rounded-full font-bold flex items-center justify-center ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                    {item.badge}
                  </span>
                ) : active ? <ChevronRight className="w-3 h-3 text-white/60" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          {canAddBusinesses && (
            <Button onClick={() => setAddingBusiness(true)} className="w-full rounded-xl gap-2" size="sm">
              <Plus className="w-4 h-4" /> Add Business
            </Button>
          )}
          <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-border sticky top-0 z-10 px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-display">
              {section === "dashboard" && "My Dashboard"}
              {section === "my-listings" && "My Submissions"}
              {section === "pending-reviews" && "Pending Reviews"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {section === "dashboard" && "Your contributions at a glance"}
              {section === "my-listings" && `${stats?.totalAdded ?? 0} businesses you've scouted`}
              {section === "pending-reviews" && `${pendingBusinesses.length} business${pendingBusinesses.length !== 1 ? "es" : ""} awaiting review`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {section === "my-listings" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" />
              </div>
            )}
            {section === "pending-reviews" && (
              <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => refetchPending()}>
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            )}
          </div>
        </div>

        <div className="p-8 space-y-6">

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Store} label="Total Scouted" value={stats?.totalAdded ?? 0} color="bg-primary/10 text-primary" />
                <StatCard icon={CheckCircle2} label="Live Listings" value={stats?.approved ?? 0} color="bg-emerald-50 text-emerald-600" />
                <StatCard icon={Clock} label="Pending Review" value={stats?.pending ?? 0} color="bg-amber-50 text-amber-600" />
                <StatCard icon={BadgeCheck} label="Claimed" value={stats?.claimed ?? 0} color="bg-violet-50 text-violet-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-base font-bold font-display mb-4">Your Permissions</h3>
                  <div className="space-y-3">
                    {(["add_businesses", "approve", "verify"] as const).map(perm => (
                      <div key={perm} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${permissions.includes(perm) ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20 opacity-50"}`}>
                        {permissions.includes(perm)
                          ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          : <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-medium">{PERMISSION_LABELS[perm]?.label ?? perm}</p>
                          <p className="text-xs text-muted-foreground">
                            {perm === "add_businesses" && "Scout and add new businesses to the directory"}
                            {perm === "approve" && "Approve or deny new business submissions"}
                            {perm === "verify" && "Mark businesses as verified/featured"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <h3 className="text-base font-bold font-display mb-4">Recent Activity</h3>
                  {submissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No businesses scouted yet</p>
                      {canAddBusinesses && (
                        <Button onClick={() => setAddingBusiness(true)} className="mt-4 rounded-xl gap-2" size="sm">
                          <Plus className="w-4 h-4" /> Scout First Business
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submissions.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Store className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.municipality}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                      ))}
                      {submissions.length > 5 && (
                        <Button variant="ghost" size="sm" className="w-full rounded-xl" onClick={() => setSection("my-listings")}>
                          View all {submissions.length} →
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── MY SUBMISSIONS ── */}
          {section === "my-listings" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {[
                    { label: "All", value: "all", count: submissionsData?.total ?? 0 },
                    { label: "Live", value: "approved" },
                    { label: "Pending", value: "pending" },
                    { label: "Rejected", value: "rejected" },
                  ].map(tab => (
                    <div key={tab.value} className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg">
                      {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
                    </div>
                  ))}
                </div>
                {canAddBusinesses && (
                  <Button onClick={() => setAddingBusiness(true)} className="rounded-xl gap-2" size="sm">
                    <Plus className="w-4 h-4" /> Scout Business
                  </Button>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border p-16 text-center shadow-sm">
                  <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
                  <h3 className="text-lg font-bold font-display mb-2">No businesses yet</h3>
                  <p className="text-muted-foreground text-sm mb-4">Start scouting businesses in your area</p>
                  {canAddBusinesses && (
                    <Button onClick={() => setAddingBusiness(true)} className="rounded-xl gap-2">
                      <Plus className="w-4 h-4" /> Scout First Business
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {submissions.map(b => (
                    <div key={b.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {b.logoUrl
                          ? <img src={b.logoUrl} alt={b.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-border" />
                          : <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><Store className="w-7 h-7 text-primary" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base">{b.name}</h3>
                            <StatusBadge status={b.status} />
                            {b.isClaimed && <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Claimed</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {b.municipality && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{b.municipality}</span>}
                            {b.categoryName && <span className="text-xs text-muted-foreground">{b.categoryName}</span>}
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {canVerify && b.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className={`rounded-xl gap-1 text-xs ${b.featured ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}
                              onClick={() => verifyBusiness({ id: b.id })}
                            >
                              <Star className={`w-3 h-3 ${b.featured ? "fill-amber-500 text-amber-500" : ""}`} />
                              {b.featured ? "Featured" : "Feature"}
                            </Button>
                          )}
                          <a href={`/businesses/${b.slug ?? b.id}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="rounded-xl gap-1 text-xs">
                              <ExternalLink className="w-3 h-3" /> View
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── PENDING REVIEWS ── */}
          {section === "pending-reviews" && canApprove && (
            <>
              {pendingBusinesses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-border p-16 text-center shadow-sm">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
                  <h3 className="text-lg font-bold font-display mb-2">All caught up!</h3>
                  <p className="text-muted-foreground text-sm">No businesses are waiting for review right now.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingBusinesses.map((b: any) => (
                    <div key={b.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base">{b.name}</h3>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>
                            {b.source === "spotlight_rep" && <Badge variant="outline" className="text-xs gap-1"><Target className="w-3 h-3" />Scouted</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{b.description}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            {b.municipality && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{b.municipality}</span>}
                            {b.categoryName && <span className="text-xs text-muted-foreground">{b.categoryName}</span>}
                            {b.addedByRepName && <span className="text-xs text-muted-foreground">Scouted by {b.addedByRepName}</span>}
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" className="rounded-xl gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => approveBusiness({ id: b.id })}>
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl gap-1 border-red-200 text-red-600 hover:bg-red-50 text-xs" onClick={() => rejectBusiness({ id: b.id })}>
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Add Business Dialog ── */}
      {canAddBusinesses && (
        <Dialog open={addingBusiness} onOpenChange={open => !open && setAddingBusiness(false)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Scout a New Business</DialogTitle></DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(values => addBusiness({ data: values }))} className="space-y-4">
                <FormField control={addForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Business Name *</FormLabel><FormControl><Input className="rounded-xl" placeholder="e.g. La Placita Café" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={addForm.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea className="rounded-xl min-h-[80px]" placeholder="What does this business offer?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="municipality" render={({ field }) => (
                    <FormItem><FormLabel>Municipality *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-[200px]">{MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addForm.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel>
                      <Select onValueChange={v => field.onChange(Number(v))} value={field.value?.toString() ?? ""}>
                        <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                        <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select><FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={addForm.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input className="rounded-xl" placeholder="Street address" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input className="rounded-xl" placeholder="(787) 555-0000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addForm.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input className="rounded-xl" type="email" placeholder="info@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={addForm.control} name="website" render={({ field }) => (
                  <FormItem><FormLabel>Website</FormLabel><FormControl><Input className="rounded-xl" placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter className="pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setAddingBusiness(false)} className="rounded-xl">Cancel</Button>
                  <Button type="submit" disabled={isAdding} className="rounded-xl gap-2">
                    {isAdding ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4" /> Add Business</>}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
