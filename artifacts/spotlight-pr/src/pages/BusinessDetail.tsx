import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Globe, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ClaimBusinessModal } from "@/components/ClaimBusinessModal";

type BusinessRow = {
  id: number;
  slug: string | null;
  name: string;
  description: string | null;
  category_name: string | null;
  municipality: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  featured: boolean | null;
  status: string | null;
  is_claimed: boolean | null;
  owner_id: string | null;
};

export default function BusinessDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [showClaim, setShowClaim] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const raw = (id || "").trim();
        const numeric = Number(raw);

        let query = supabase.from("businesses").select("*").eq("status", "approved");
        if (!Number.isNaN(numeric) && raw !== "") query = query.eq("id", numeric);
        else query = query.eq("slug", raw);

        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        setBusiness((data as BusinessRow) ?? null);
      } catch (e) {
        console.error("Business detail load failed", e);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h2 className="text-2xl font-bold">Business not found</h2>
        <Link href="/directory"><Button>Return to Directory</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/directory"><Button variant="outline" className="mb-6">← Back to Directory</Button></Link>
      <Card className="overflow-hidden">
        {business.cover_url && <img src={business.cover_url} alt={business.name} className="w-full h-64 object-cover" />}
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            {business.logo_url && <img src={business.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-cover border" />}
            <div>
              <h1 className="text-3xl font-bold">{business.name}</h1>
              <p className="text-muted-foreground">{business.category_name || "Local Business"}</p>
            </div>
          </div>

          {business.description && <p className="text-base leading-relaxed">{business.description}</p>}

          <div className="grid gap-2 text-sm">
            {business.municipality && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {business.municipality}</p>}
            {business.address && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {business.address}</p>}
            {business.phone && <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-primary"><Phone className="w-4 h-4" /> {business.phone}</a>}
            {business.email && <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-primary"><Mail className="w-4 h-4" /> {business.email}</a>}
            {business.website && <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary"><Globe className="w-4 h-4" /> Visit Website</a>}
          </div>

          {!business.is_claimed && !business.owner_id && (
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Is this your business?</p>
                  <p className="text-sm text-muted-foreground">Claim it to manage your page, add photos, and connect with customers — free.</p>
                </div>
              </div>
              <Button onClick={() => setShowClaim(true)} className="shrink-0">Claim this business</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showClaim && (
        <ClaimBusinessModal
          businessId={business.id}
          businessName={business.name}
          onClose={() => setShowClaim(false)}
        />
      )}
    </div>
  );
}
