import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Search, MapPin, TrendingUp, Star, Coffee, ShoppingBag, Briefcase, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUNICIPALITIES } from "@/lib/constants";
import { useListBusinesses, useListCategories } from "@workspace/api-client-react";
import { BusinessCard } from "@/components/business/BusinessCard";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [municipality, setMunicipality] = useState("");

  const { data: featuredData, isLoading: featuredLoading } = useListBusinesses({ 
    featured: true, 
    limit: 6 
  });
  
  const { data: recentData, isLoading: recentLoading } = useListBusinesses({ 
    limit: 3 
  });

  const { data: categoriesData } = useListCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (municipality && municipality !== "all") params.set("municipality", municipality);
    setLocation(`/directory?${params.toString()}`);
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'restaurants-food': return <Coffee className="w-6 h-6" />;
      case 'shopping-retail': return <ShoppingBag className="w-6 h-6" />;
      case 'health-beauty': return <Heart className="w-6 h-6" />;
      case 'professional-services': return <Briefcase className="w-6 h-6" />;
      default: return <Star className="w-6 h-6" />;
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-24 lg:py-32 overflow-hidden flex items-center justify-center">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Puerto Rico tropical background" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/60 to-background" />
        </div>

        <div className="container relative z-10 px-4 flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            Discover the best of Puerto Rico
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-extrabold text-white max-w-4xl leading-tight mb-6 drop-shadow-lg"
          >
            Find Local Businesses You Can <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-secondary">Trust</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/90 max-w-2xl mb-12 font-medium drop-shadow"
          >
            Explore restaurants, services, shops, and experiences verified by the local community across all 78 municipalities.
          </motion.p>

          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onSubmit={handleSearch}
            className="w-full max-w-3xl glass-panel p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-2xl"
          >
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-4 text-muted-foreground w-5 h-5" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="What are you looking for?" 
                className="pl-12 h-14 border-none shadow-none text-base rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent"
              />
            </div>
            
            <div className="hidden md:block w-px h-8 bg-border my-auto mx-2" />
            
            <div className="relative flex-1 flex items-center border-t md:border-t-0 border-border pt-2 md:pt-0">
              <MapPin className="absolute left-4 text-muted-foreground w-5 h-5 z-10" />
              <Select value={municipality} onValueChange={setMunicipality}>
                <SelectTrigger className="pl-12 h-14 border-none shadow-none text-base rounded-xl focus:ring-1 focus:ring-primary/50 bg-transparent">
                  <SelectValue placeholder="Any Municipality" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-xl">
                  <SelectItem value="all">Any Municipality</SelectItem>
                  {MUNICIPALITIES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" size="lg" className="h-14 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/25 mt-2 md:mt-0 w-full md:w-auto">
              Search
            </Button>
          </motion.form>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Find exactly what you need from our curated selection of local services and shops.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
            {categoriesData?.categories?.slice(0, 8).map((cat, i) => (
              <Link key={cat.id} href={`/directory?category=${cat.id}`}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card hover:bg-primary/5 border border-border hover:border-primary/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 transition-all duration-300 hover:shadow-lg cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center text-primary transition-colors">
                    {getCategoryIcon(cat.slug)}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border border-border">{cat.businessCount || 0} listings</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-24 bg-muted/50 border-y border-border relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 z-0" />
        
        <div className="container px-4 mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-secondary" />
                <span className="text-secondary font-bold tracking-wider uppercase text-sm">Spotlight</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold">Featured Places</h2>
            </div>
            <Link href="/directory?featured=true">
              <Button variant="outline" className="rounded-full bg-white">View All Featured</Button>
            </Link>
          </div>
          
          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="h-96 bg-card rounded-2xl animate-pulse border border-border" />
              ))}
            </div>
          ) : featuredData?.businesses?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredData.businesses.map((business, i) => (
                <motion.div
                  key={business.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <BusinessCard business={business} featured={true} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">No featured businesses yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-foreground text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/images/tropical-pattern.png')] bg-repeat mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        
        <div className="container px-4 mx-auto relative z-10 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Own a business in Puerto Rico?</h2>
          <p className="text-lg text-white/80 mb-10 leading-relaxed">
            Join thousands of local businesses on Spotlight PR. Claim your listing, manage your reputation, and reach more customers across the island.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/list-your-business">
              <Button size="lg" className="h-14 px-8 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold text-lg w-full sm:w-auto shadow-lg shadow-secondary/25">
                Add Your Business Free
              </Button>
            </Link>
            <Link href="/directory">
              <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl border-white/20 text-foreground bg-white hover:bg-white/90 font-bold text-lg w-full sm:w-auto">
                Explore Directory
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
