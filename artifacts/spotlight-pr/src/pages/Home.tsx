import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Search, MapPin, TrendingUp, Shuffle, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUNICIPALITIES } from "@/lib/constants";
import { useListBusinesses } from "@workspace/api-client-react";
import { BusinessCard } from "@/components/business/BusinessCard";
import { motion } from "framer-motion";

function TownTile({ town, index }: { town: typeof FEATURED_TOWNS[0]; index: number }) {
  const { data } = useListBusinesses({ municipality: town.name, limit: 1 });
  const count = data?.total ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <Link href={`/directory?municipality=${encodeURIComponent(town.name)}`}>
        <div className="group bg-card border border-border hover:border-primary/40 hover:bg-primary/5 rounded-2xl p-4 md:p-5 text-center cursor-pointer transition-all duration-300 hover:shadow-lg">
          <div className="text-3xl mb-2">{town.emoji}</div>
          <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">{town.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{town.region} PR</p>
          {count !== null ? (
            <p className="mt-1.5 text-xs font-semibold text-primary/80">
              {count} {count === 1 ? "business" : "businesses"}
            </p>
          ) : (
            <div className="mt-1.5 h-3 w-12 mx-auto bg-muted rounded animate-pulse" />
          )}
          <div className="mt-2 text-xs text-primary/70 font-medium group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1">
            Browse <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const VIBE_CARDS = [
  {
    emoji: "🌙",
    label: "Date Night",
    tagline: "Romantic spots for two",
    href: "/directory?category=restaurants-food",
    gradient: "from-violet-600 to-fuchsia-500",
    shadowColor: "shadow-violet-500/30",
    bgHover: "hover:from-violet-700 hover:to-fuchsia-600",
  },
  {
    emoji: "👨‍👩‍👧",
    label: "Family Fun",
    tagline: "Everyone's invited",
    href: "/directory?category=entertainment",
    gradient: "from-orange-500 to-amber-400",
    shadowColor: "shadow-orange-400/30",
    bgHover: "hover:from-orange-600 hover:to-amber-500",
  },
  {
    emoji: "☕",
    label: "Morning Fuel",
    tagline: "Cafés & breakfast spots",
    href: "/directory?search=coffee",
    gradient: "from-amber-700 to-yellow-500",
    shadowColor: "shadow-amber-500/30",
    bgHover: "hover:from-amber-800 hover:to-yellow-600",
  },
  {
    emoji: "💎",
    label: "Hidden Gems",
    tagline: "Our community's favorites",
    href: "/directory?featured=true",
    gradient: "from-emerald-500 to-teal-400",
    shadowColor: "shadow-emerald-400/30",
    bgHover: "hover:from-emerald-600 hover:to-teal-500",
  },
  {
    emoji: "🔧",
    label: "Get It Done",
    tagline: "Services & professionals",
    href: "/directory?category=professional-services",
    gradient: "from-blue-600 to-indigo-500",
    shadowColor: "shadow-blue-500/30",
    bgHover: "hover:from-blue-700 hover:to-indigo-600",
  },
  {
    emoji: "🌴",
    label: "Explore the Island",
    tagline: "Discover something new",
    href: "/directory",
    gradient: "from-green-500 to-emerald-400",
    shadowColor: "shadow-green-400/30",
    bgHover: "hover:from-green-600 hover:to-emerald-500",
  },
];

const FEATURED_TOWNS = [
  { name: "San Juan", region: "Metro", emoji: "🏙" },
  { name: "Bayamón", region: "Metro", emoji: "🌆" },
  { name: "Ponce", region: "South", emoji: "🎭" },
  { name: "Mayagüez", region: "West", emoji: "🌊" },
  { name: "Caguas", region: "Central", emoji: "⛰" },
  { name: "Arecibo", region: "North", emoji: "🔭" },
  { name: "Humacao", region: "East", emoji: "🌺" },
  { name: "Aguadilla", region: "West", emoji: "🏄" },
];

const HERO_IMAGES = [
  { city: "San Juan", region: "Metro", path: "hero-bg.png" },
  { city: "Ponce", region: "South", path: "hero-ponce.png" },
  { city: "Mayagüez", region: "West", path: "hero-mayaguez.png" },
  { city: "Arecibo", region: "North", path: "hero-arecibo.png" },
  { city: "Culebra", region: "Island", path: "hero-culebra.png" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [surpriseMeLoading, setSurpriseMeLoading] = useState(false);
  const [heroImageIndex, setHeroImageIndex] = useState(0);

  const { data: featuredData, isLoading: featuredLoading } = useListBusinesses({ 
    featured: true, 
    limit: 6 
  });

  // Cycle through hero images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextHeroImage = () => {
    setHeroImageIndex(prev => (prev + 1) % HERO_IMAGES.length);
  };

  const prevHeroImage = () => {
    setHeroImageIndex(prev => (prev - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (municipality && municipality !== "all") params.set("municipality", municipality);
    setLocation(`/directory?${params.toString()}`);
  };

  const handleSurpriseMe = async () => {
    setSurpriseMeLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/businesses/random`);
      if (res.ok) {
        const business = await res.json();
        setLocation(`/businesses/${business.slug || business.id}`);
      }
    } catch {
      // silent fail — just do nothing
    } finally {
      setSurpriseMeLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-24 lg:py-32 overflow-hidden flex items-center justify-center group">
        <div className="absolute inset-0 z-0">
          {/* Image carousel */}
          {HERO_IMAGES.map((img, idx) => (
            <motion.img
              key={idx}
              src={`${import.meta.env.BASE_URL}images/${img.path}`}
              alt={`${img.city}, ${img.region} - Puerto Rico`}
              initial={{ opacity: 0 }}
              animate={{ opacity: idx === heroImageIndex ? 0.9 : 0 }}
              transition={{ duration: 0.8 }}
              className="absolute w-full h-full object-cover"
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/80 via-foreground/60 to-background" />
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prevHeroImage}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextHeroImage}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Indicator dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {HERO_IMAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setHeroImageIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === heroImageIndex ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* City label */}
        <div className="absolute top-6 right-6 z-20 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-medium">
          {HERO_IMAGES[heroImageIndex].city}, {HERO_IMAGES[heroImageIndex].region}
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
            className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 font-medium drop-shadow"
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

          {/* Surprise Me */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-5 flex items-center gap-3"
          >
            <span className="text-white/60 text-sm">or</span>
            <button
              onClick={handleSurpriseMe}
              disabled={surpriseMeLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold backdrop-blur-md transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Shuffle className={`w-4 h-4 ${surpriseMeLoading ? "animate-spin" : ""}`} />
              {surpriseMeLoading ? "Finding a surprise…" : "Surprise Me 🎲"}
            </button>
          </motion.div>
        </div>
      </section>

      {/* What's Your Vibe? */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">What's Your Vibe?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Pick a mood and we'll find the perfect spot for you.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto">
            {VIBE_CARDS.map((vibe, i) => (
              <motion.div
                key={vibe.label}
                initial={{ opacity: 0, scale: 0.93 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <Link href={vibe.href}>
                  <div className={`
                    relative group overflow-hidden rounded-2xl p-5 md:p-6 cursor-pointer
                    bg-gradient-to-br ${vibe.gradient} ${vibe.bgHover}
                    shadow-lg ${vibe.shadowColor}
                    transition-all duration-300
                  `}>
                    <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors" />
                    <div className="relative z-10">
                      <div className="text-3xl md:text-4xl mb-3">{vibe.emoji}</div>
                      <h3 className="text-white font-display font-bold text-lg md:text-xl leading-tight">{vibe.label}</h3>
                      <p className="text-white/75 text-xs md:text-sm mt-1">{vibe.tagline}</p>
                      <div className="mt-3 flex items-center gap-1 text-white/90 text-xs font-semibold">
                        Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore by Town */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Explore by Town</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">From mountain towns to coastal cities — find businesses across the island.</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
            {FEATURED_TOWNS.map((town, i) => (
              <TownTile key={town.name} town={town} index={i} />
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/directory">
              <Button variant="outline" className="rounded-full">View all 78 municipalities</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-24 bg-muted/50 border-y border-border relative overflow-hidden">
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
      <section className="py-24 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />

        <div className="container px-4 mx-auto relative z-10 text-center max-w-3xl">
          <p className="text-white/80 font-semibold tracking-widest uppercase text-sm mb-4">For Business Owners</p>
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6 text-white drop-shadow">
            Own a business in Puerto Rico?
          </h2>
          <p className="text-lg text-white/90 mb-10 leading-relaxed max-w-xl mx-auto">
            Get listed, manage your reputation, and connect with customers across all 78 municipalities — completely free.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/list-your-business">
              <Button size="lg" className="h-14 px-8 rounded-xl bg-white text-primary hover:bg-white/90 font-bold text-lg w-full sm:w-auto shadow-xl">
                Add Your Business Free
              </Button>
            </Link>
            <Link href="/postcard-marketing">
              <Button size="lg" className="h-14 px-8 rounded-xl bg-secondary/90 text-white hover:bg-secondary font-bold text-lg w-full sm:w-auto shadow-xl">
                📬 Postcard Marketing
              </Button>
            </Link>
            <Link href="/directory">
              <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl border-white/40 text-white hover:bg-white/10 font-bold text-lg w-full sm:w-auto">
                Explore Directory
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
