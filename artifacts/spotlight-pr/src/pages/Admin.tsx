import { useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { 
  useGetAdminStats, 
  useAdminListBusinesses, 
  useApproveBusiness, 
  useRejectBusiness, 
  useFeatureBusiness,
  useAdminListReviews,
  useAdminDeleteReview,
  useAdminListUsers,
  useUpdateUserRole
} from "@workspace/api-client-react";
import {
  Shield, Users, Store, MessageSquare, Check, X, Star, Trash2, ShieldAlert, Clock,
  LayoutDashboard, Edit2, ChevronRight, Plus, Search, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AdminSection = "dashboard" | "businesses" | "users" | "reviews";

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [businessStatus, setBusinessStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats } = useGetAdminStats({ query: { enabled: isAuthenticated && user?.role === 'admin' } });
  
  const { data: businessesData } = useAdminListBusinesses(
    { status: businessStatus },
    { query: { enabled: isAuthenticated && user?.role === 'admin' } }
  );

  const { data: usersData } = useAdminListUsers({}, { query: { enabled: isAuthenticated && user?.role === 'admin' } });
  const { data: reviewsData } = useAdminListReviews({}, { query: { enabled: isAuthenticated && user?.role === 'admin' } });

  const { mutate: approve } = useApproveBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: "Business approved" });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/businesses`] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/stats`] });
      }
    }
  });

  const { mutate: reject } = useRejectBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: "Business rejected", variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/businesses`] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/stats`] });
      }
    }
  });

  const { mutate: feature } = useFeatureBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: "Featured status toggled" });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/businesses`] });
      }
    }
  });

  const { mutate: updateRole } = useUpdateUserRole({
    mutation: {
      onSuccess: () => {
        toast({ title: "User role updated" });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/users`] });
      }
    }
  });

  const { mutate: deleteReview } = useAdminDeleteReview({
    mutation: {
      onSuccess: () => {
        toast({ title: "Review deleted" });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/reviews`] });
      }
    }
  });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>;
  
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">You must be an administrator to view this page.</p>
        <Button onClick={() => setLocation("/")}>Return Home</Button>
      </div>
    );
  }

  const filteredBusinesses = businessesData?.businesses?.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b as any).ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredUsers = usersData?.users?.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const navItems: { id: AdminSection; label: string; icon: any; color: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-primary" },
    { id: "businesses", label: "Business Listings", icon: Store, color: "text-blue-500" },
    { id: "users", label: "Users & Owners", icon: Users, color: "text-purple-500" },
    { id: "reviews", label: "Reviews", icon: MessageSquare, color: "text-indigo-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-lg font-bold font-display">Admin</h1>
              <p className="text-xs text-muted-foreground">Management Panel</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  section === item.id
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className={`w-5 h-5 ${section === item.id ? item.color : "text-muted-foreground"}`} />
                <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
                {section === item.id && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 bg-gradient-to-t from-primary/5 border-t border-border">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation("/")}>
            Exit Admin
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-border sticky top-0 z-10">
          <div className="px-8 py-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold font-display capitalize">
                {navItems.find(item => item.id === section)?.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {section === "dashboard" && "System overview and analytics"}
                {section === "businesses" && "Manage business listings, approval status, and verification"}
                {section === "users" && "Manage user accounts and roles"}
                {section === "reviews" && "Monitor and moderate user reviews"}
              </p>
            </div>
            {section !== "dashboard" && (
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* Dashboard Section */}
          {section === "dashboard" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  icon={Store}
                  label="Total Businesses"
                  value={stats?.totalBusinesses || 0}
                  color="text-blue-500"
                />
                <StatCard
                  icon={Clock}
                  label="Pending Review"
                  value={stats?.pendingBusinesses || 0}
                  color="text-amber-500"
                  highlight
                />
                <StatCard
                  icon={Users}
                  label="Total Users"
                  value={stats?.totalUsers || 0}
                  color="text-purple-500"
                />
                <StatCard
                  icon={MessageSquare}
                  label="Total Reviews"
                  value={stats?.totalReviews || 0}
                  color="text-indigo-500"
                />
              </div>

              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <h3 className="text-lg font-bold mb-4">Quick Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-700 mb-1">Approval Rate</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats?.totalBusinesses ? Math.round(((stats?.approvedBusinesses || 0) / stats.totalBusinesses) * 100) : 0}%
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <p className="text-sm text-purple-700 mb-1">Avg Business per User</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats?.totalUsers && stats?.totalBusinesses ? (stats.totalBusinesses / stats.totalUsers).toFixed(1) : 0}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-sm text-indigo-700 mb-1">Avg Rating</p>
                    <p className="text-2xl font-bold text-indigo-900">4.5/5</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Businesses Section */}
          {section === "businesses" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-border">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={businessStatus} onValueChange={(v: any) => setBusinessStatus(v)}>
                  <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0">
                    <SelectValue placeholder="Status filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All Businesses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-4 font-medium">Business</th>
                        <th className="p-4 font-medium">Owner</th>
                        <th className="p-4 font-medium">Location</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Verified</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredBusinesses.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">{b.categoryName}</p>
                          </td>
                          <td className="p-4">
                            {(b as any).ownerName ? (
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium text-foreground">{(b as any).ownerName}</p>
                                <a href={`mailto:${(b as any).ownerContactEmail}`} className="text-xs text-primary hover:underline block">
                                  {(b as any).ownerContactEmail}
                                </a>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not provided</span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">{b.municipality}</td>
                          <td className="p-4">
                            {b.status === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>}
                            {b.status === 'approved' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>}
                            {b.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              {b.status === "approved" && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">✓ Verified</Badge>}
                              {(b as any).isClaimed && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">✓ Claimed</Badge>}
                            </div>
                          </td>
                          <td className="p-4 flex items-center justify-end gap-2">
                            <Button size="icon" variant="ghost" className={b.featured ? "text-secondary" : "text-muted-foreground"} onClick={() => feature({id: b.id})} title="Toggle Featured">
                              <Star className={`w-4 h-4 ${b.featured ? "fill-current" : ""}`} />
                            </Button>
                            {b.status !== 'approved' && (
                              <Button size="icon" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => approve({id: b.id})} title="Approve">
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {b.status !== 'rejected' && (
                              <Button size="icon" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => reject({id: b.id})} title="Reject">
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary" title="View Details">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filteredBusinesses.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No businesses found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Section */}
          {section === "users" && (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-4 font-medium">User</th>
                        <th className="p-4 font-medium">Username</th>
                        <th className="p-4 font-medium">Joined</th>
                        <th className="p-4 font-medium">Role</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {u.profileImage ? <img src={u.profileImage} alt="" className="w-full h-full object-cover"/> : <Users className="w-4 h-4 text-primary"/>}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{u.firstName} {u.lastName}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">@{u.username}</td>
                          <td className="p-4 text-muted-foreground text-sm">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                          <td className="p-4">
                            <Select 
                              value={u.role} 
                              onValueChange={(val: any) => updateRole({id: u.id, data: {role: val}})}
                            >
                              <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Regular User</SelectItem>
                                <SelectItem value="business_owner">Business Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4 text-right">
                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Section */}
          {section === "reviews" && (
            <div className="space-y-6">
              <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-4 font-medium">Author</th>
                        <th className="p-4 font-medium">Business</th>
                        <th className="p-4 font-medium">Rating</th>
                        <th className="p-4 font-medium">Content</th>
                        <th className="p-4 font-medium">Posted</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reviewsData?.reviews?.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-medium text-sm">{r.authorName}</td>
                          <td className="p-4 text-muted-foreground text-sm">Business #{r.businessId}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-secondary">
                              <Star className="w-4 h-4 fill-current"/>
                              <span className="font-bold text-foreground">{r.rating}</span>
                            </div>
                          </td>
                          <td className="p-4 max-w-xs truncate text-sm text-foreground" title={r.body}>{r.body}</td>
                          <td className="p-4 text-muted-foreground text-sm">{format(new Date(r.createdAt || new Date()), 'MMM d, yyyy')}</td>
                          <td className="p-4 text-right">
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteReview({id: r.id})}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {reviewsData?.reviews?.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No reviews found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, highlight }: any) {
  return (
    <div className={`bg-white rounded-2xl p-6 border transition-all ${highlight ? "border-amber-200 shadow-md shadow-amber-100" : "border-border shadow-sm"}`}>
      <Icon className={`w-6 h-6 ${color} mb-3`} />
      <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold font-display ${highlight ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
