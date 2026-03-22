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
import { Shield, Users, Store, MessageSquare, Check, X, Star, Trash2, ShieldAlert, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [businessStatus, setBusinessStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-foreground text-white py-8 border-b border-primary/20">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold font-display">Admin Console</h1>
            <p className="text-white/60 text-sm">System management and moderation</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <Store className="w-6 h-6 text-primary mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Total Businesses</p>
            <p className="text-3xl font-bold font-display">{stats?.totalBusinesses || 0}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <Clock className="w-6 h-6 text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Pending Review</p>
            <p className="text-3xl font-bold font-display text-amber-600">{stats?.pendingBusinesses || 0}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <Users className="w-6 h-6 text-secondary mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Total Users</p>
            <p className="text-3xl font-bold font-display">{stats?.totalUsers || 0}</p>
          </div>
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <MessageSquare className="w-6 h-6 text-indigo-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Total Reviews</p>
            <p className="text-3xl font-bold font-display">{stats?.totalReviews || 0}</p>
          </div>
        </div>

        <Tabs defaultValue="businesses" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-14 p-0 mb-6 gap-6">
            <TabsTrigger value="businesses" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2">
              <Store className="w-4 h-4 mr-2" /> Businesses
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2">
              <Users className="w-4 h-4 mr-2" /> Users
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-2">
              <MessageSquare className="w-4 h-4 mr-2" /> Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="businesses" className="space-y-4">
            <div className="flex justify-between items-center bg-card p-2 rounded-xl border border-border">
              <Select value={businessStatus} onValueChange={(v: any) => setBusinessStatus(v)}>
                <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
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

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 font-medium">Business</th>
                      <th className="p-4 font-medium">Owner / Lead</th>
                      <th className="p-4 font-medium">Location</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Date</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {businessesData?.businesses?.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/20">
                        <td className="p-4">
                          <p className="font-bold text-foreground">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.categoryName}</p>
                        </td>
                        <td className="p-4">
                          {(b as any).ownerName ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-foreground">{(b as any).ownerName}</p>
                              {(b as any).ownerContactEmail && (
                                <a href={`mailto:${(b as any).ownerContactEmail}`} className="text-xs text-primary hover:underline block">{(b as any).ownerContactEmail}</a>
                              )}
                              {(b as any).ownerPhone && (
                                <p className="text-xs text-muted-foreground">{(b as any).ownerPhone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not provided</span>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground">{b.municipality}</td>
                        <td className="p-4">
                          {b.status === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>}
                          {b.status === 'approved' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>}
                          {b.status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                        </td>
                        <td className="p-4 text-muted-foreground">{format(new Date(b.createdAt), 'MMM d, yyyy')}</td>
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
                        </td>
                      </tr>
                    ))}
                    {businessesData?.businesses?.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No businesses found matching this status.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 font-medium">User</th>
                      <th className="p-4 font-medium">Joined</th>
                      <th className="p-4 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersData?.users?.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/20">
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {u.profileImage ? <img src={u.profileImage} alt="" className="w-full h-full object-cover"/> : <Users className="w-4 h-4 text-primary"/>}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-muted-foreground">{u.username}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                        <td className="p-4">
                          <Select 
                            value={u.role} 
                            onValueChange={(val: any) => updateRole({id: u.id, data: {role: val}})}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Regular User</SelectItem>
                              <SelectItem value="business_owner">Business Owner</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-4 font-medium">Author</th>
                      <th className="p-4 font-medium">Business ID</th>
                      <th className="p-4 font-medium">Rating</th>
                      <th className="p-4 font-medium">Content</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reviewsData?.reviews?.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="p-4 font-medium">{r.authorName}</td>
                        <td className="p-4 text-muted-foreground">#{r.businessId}</td>
                        <td className="p-4">
                          <div className="flex text-secondary"><Star className="w-4 h-4 fill-current"/> <span className="ml-1 font-bold text-foreground">{r.rating}</span></div>
                        </td>
                        <td className="p-4 max-w-xs truncate" title={r.body}>{r.body}</td>
                        <td className="p-4 text-right">
                          <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => deleteReview({id: r.id})}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {reviewsData?.reviews?.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No reviews found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
