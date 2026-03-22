import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useListMyBusinesses } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  PlusCircle, Store, Clock, CheckCircle2, XCircle, Settings,
  Eye, Star, MessageSquare, ChevronRight, TrendingUp, AlertCircle, Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIAssistant } from "@/components/dashboard/AIAssistant";

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Live</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="w-3 h-3" />Rejected</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs"><Clock className="w-3 h-3" />Pending</Badge>;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusinessId, setAiBusinessId] = useState<number | null>(null);
  const [aiBusinessName, setAiBusinessName] = useState<string>("");

  const { data, isLoading } = useListMyBusinesses({
    query: { enabled: isAuthenticated }
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
    // Regular users have a profile page instead of a business dashboard
    if (!authLoading && isAuthenticated && user?.role === "user") setLocation("/profile");
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading || !isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  const businesses = data?.businesses ?? [];
  const approved = businesses.filter(b => b.status === "approved").length;
  const pending = businesses.filter(b => b.status === "pending").length;
  const rejected = businesses.filter(b => b.status === "rejected").length;
  const totalReviews = businesses.reduce((sum, b) => sum + (b.reviewCount ?? 0), 0);

  function openAI(biz?: { id: number; name: string }) {
    const target = biz ?? businesses[0];
    if (!target) return;
    setAiBusinessId(target.id);
    setAiBusinessName(target.name);
    setAiOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Header ── */}
      <div className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold font-display overflow-hidden border border-primary/20">
                {user?.profileImage
                  ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                  : <span>{user?.firstName?.charAt(0) ?? "U"}</span>
                }
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-foreground">
                  Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {user?.email} · <span className="capitalize text-primary font-medium">{user?.role?.replace("_", " ")}</span>
                </p>
              </div>
            </div>
            <Link href="/list-your-business">
              <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                <PlusCircle className="w-4 h-4" /> Add New Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* ── Stats ── */}
        {businesses.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Listings", value: businesses.length, icon: <Store className="w-5 h-5 text-primary" />, color: "bg-primary/10" },
              { label: "Live", value: approved, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, color: "bg-emerald-50" },
              { label: "Pending Review", value: pending, icon: <Clock className="w-5 h-5 text-amber-600" />, color: "bg-amber-50" },
              { label: "Total Reviews", value: totalReviews, icon: <MessageSquare className="w-5 h-5 text-primary" />, color: "bg-primary/10" },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border p-4 shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Listings ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> My Listings
          </h2>
          {businesses.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAI()}
              className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
            >
              <Bot className="w-4 h-4" /> Ask AI
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-14 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-xl font-bold font-display mb-2">No listings yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
              Add your first business to start reaching customers across Puerto Rico.
            </p>
            <Link href="/list-your-business">
              <Button className="rounded-xl gap-2">
                <PlusCircle className="w-4 h-4" /> Create First Listing
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Logo */}
                  <div className="w-16 h-16 shrink-0 rounded-xl bg-muted overflow-hidden border border-border/50">
                    {business.logoUrl
                      ? <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Store className="w-7 h-7 text-muted-foreground/40" /></div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold font-display text-foreground text-base truncate">{business.name}</h3>
                      <StatusBadge status={business.status} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {business.categoryName && <span className="mr-2">{business.categoryName} ·</span>}
                      {business.municipality}
                      {business.address ? `, ${business.address}` : ""}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      {(business.reviewCount ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {(business.averageRating ?? 0).toFixed(1)} · {business.reviewCount} {business.reviewCount === 1 ? "review" : "reviews"}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">Added {format(new Date(business.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:flex-col sm:gap-2 md:flex-row">
                    {business.status === "approved" && (
                      <Link href={`/businesses/${business.id}`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" className="rounded-lg gap-1.5 w-full">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </Link>
                    )}
                    <Link href={`/manage/${business.id}`} className="flex-1 sm:flex-none">
                      <Button size="sm" className="rounded-lg gap-1.5 w-full shadow-sm shadow-primary/20">
                        <Settings className="w-3.5 h-3.5" /> Manage
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Rejection notice */}
                {business.status === "rejected" && (
                  <div className="border-t border-border bg-red-50 rounded-b-2xl px-5 py-3 flex items-center gap-2 text-destructive text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    This listing was not approved. You can update the details and resubmit by contacting support.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CTA for business owners with no listing ── */}
        {businesses.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-teal-50 to-emerald-50 border border-primary/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <h3 className="font-bold font-display text-foreground mb-1">Have another location?</h3>
              <p className="text-sm text-muted-foreground">You can add as many business listings as you own.</p>
            </div>
            <Link href="/list-your-business">
              <Button variant="outline" className="rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5 shrink-0">
                <PlusCircle className="w-4 h-4" /> Add Another Business
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── AI Assistant Dialog ── */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-5xl w-full p-0 gap-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-5 py-4 border-b border-border flex-row items-center gap-3 space-y-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold leading-none">AI Business Assistant</DialogTitle>
              {aiBusinessName && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{aiBusinessName}</p>
              )}
            </div>
            {businesses.length > 1 && (
              <Select
                value={aiBusinessId?.toString() ?? ""}
                onValueChange={val => {
                  const biz = businesses.find(b => b.id === parseInt(val));
                  if (biz) { setAiBusinessId(biz.id); setAiBusinessName(biz.name); }
                }}
              >
                <SelectTrigger className="w-44 h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Switch business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map(b => (
                    <SelectItem key={b.id} value={b.id.toString()} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </DialogHeader>
          <div className="p-4 bg-gray-50">
            {aiBusinessId && aiBusinessName && (
              <AIAssistant businessId={aiBusinessId} businessName={aiBusinessName} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
