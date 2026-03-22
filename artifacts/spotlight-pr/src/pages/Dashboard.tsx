import { useAuth } from "@workspace/replit-auth-web";
import { useListMyBusinesses } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusCircle, Store, Clock, CheckCircle2, XCircle, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useListMyBusinesses({ 
    query: { enabled: isAuthenticated } 
  });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>;
  
  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved': return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3"/> Approved</Badge>;
      case 'rejected': return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3"/> Rejected</Badge>;
      case 'pending': default: return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white gap-1"><Clock className="w-3 h-3"/> Pending Review</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-border py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold font-display overflow-hidden border border-primary/20">
              {user?.profileImage ? <img src={user.profileImage} alt="" className="w-full h-full object-cover"/> : user?.firstName?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Welcome back, {user?.firstName}</h1>
              <p className="text-muted-foreground">Manage your businesses and view performance.</p>
            </div>
          </div>
          <Link href="/list-your-business">
            <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
              <PlusCircle className="w-4 h-4" /> Add New Business
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-bold font-display mb-6 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" /> My Listings
        </h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : data?.businesses?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No businesses yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">You haven't added any businesses to Spotlight PR yet. Create your first listing to reach thousands of locals.</p>
            <Link href="/list-your-business">
              <Button className="rounded-xl">Create Listing</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {data?.businesses?.map((business) => (
              <div key={business.id} className="bg-card rounded-2xl border border-border p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 shrink-0 rounded-xl bg-muted overflow-hidden border border-border/50 hidden sm:block">
                  <img src={business.logoUrl || `${import.meta.env.BASE_URL}images/placeholder-logo.png`} alt="" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold font-display truncate text-foreground">{business.name}</h3>
                    {getStatusBadge(business.status)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{business.address ? `${business.address}, ` : ''}{business.municipality}</p>
                  <p className="text-xs text-muted-foreground mt-2">Added on {format(new Date(business.createdAt), 'MMM d, yyyy')}</p>
                </div>
                
                <div className="flex w-full md:w-auto items-center gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border">
                  <Link href={`/businesses/${business.id}`}>
                    <Button variant="outline" size="sm" className="flex-1 md:flex-none rounded-lg gap-2" disabled={business.status !== 'approved'}>
                      <Eye className="w-4 h-4" /> View
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" className="flex-1 md:flex-none rounded-lg gap-2" disabled>
                    <Pencil className="w-4 h-4" /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
