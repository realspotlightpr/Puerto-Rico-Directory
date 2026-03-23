import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, MapPin, Filter, SlidersHorizontal, ChevronDown, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUNICIPALITIES } from "@/lib/constants";
import { useListBusinesses, useListCategories } from "@workspace/api-client-react";
import { BusinessCard } from "@/components/business/BusinessCard";
import { useDebounce } from "@/hooks/use-debounce";

interface QuickFilter {
  label: string;
  emoji: string;
  category?: string;
  municipality?: string;
  featured?: string;
  search?: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { label: "All", emoji: "✨" },
  { label: "Restaurants", emoji: "🍽", category: "restaurants-food" },
  { label: "Shopping", emoji: "🛍", category: "shopping-retail" },
  { label: "Health & Beauty", emoji: "💆", category: "health-beauty" },
  { label: "Services", emoji: "🔧", category: "professional-services" },
  { label: "Cafés", emoji: "☕", search: "coffee" },
  { label: "Featured", emoji: "🌟", featured: "true" },
  { label: "San Juan", emoji: "🏙", municipality: "San Juan" },
  { label: "Ponce", emoji: "🎭", municipality: "Ponce" },
  { label: "Mayagüez", emoji: "🌊", municipality: "Mayagüez" },
];

export default function Directory() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [municipality, setMunicipality] = useState(searchParams.get("municipality") || "all");
  const [featured, setFeatured] = useState(searchParams.get("featured") || "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [surpriseMeLoading, setSurpriseMeLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category && category !== "all") params.set("category", category);
    if (municipality && municipality !== "all") params.set("municipality", municipality);
    if (featured) params.set("featured", featured);
    if (page > 1) params.set("page", page.toString());
    
    const newUrl = `/directory${params.toString() ? `?${params.toString()}` : ''}`;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [debouncedSearch, category, municipality, featured, page]);

  const { data: categoriesData } = useListCategories();
  
  const { data, isLoading, isError } = useListBusinesses({
    search: debouncedSearch || undefined,
    category: category !== "all" ? category : undefined,
    municipality: municipality !== "all" ? municipality : undefined,
    featured: featured === "true" ? true : undefined,
    page,
    limit: 12
  });

  const handleSurpriseMe = async () => {
    setSurpriseMeLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/businesses/random`);
      if (res.ok) {
        const business = await res.json();
        setLocation(`/businesses/${business.slug || business.id}`);
      }
    } catch {
      // silent fail
    } finally {
      setSurpriseMeLoading(false);
    }
  };

  const getActiveQuickFilter = () => {
    return QUICK_FILTERS.find(f => {
      if (!f.category && !f.municipality && !f.featured && !f.search) {
        return category === "all" && municipality === "all" && !featured && !debouncedSearch;
      }
      if (f.category) return category === f.category;
      if (f.municipality) return municipality === f.municipality;
      if (f.featured) return featured === f.featured;
      if (f.search) return debouncedSearch === f.search;
      return false;
    });
  };

  const applyQuickFilter = (f: QuickFilter) => {
    setSearch(f.search || "");
    setCategory(f.category || "all");
    setMunicipality(f.municipality || "all");
    setFeatured(f.featured || "");
    setPage(1);
  };

  const activeFilter = getActiveQuickFilter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Area */}
      <div className="bg-white border-b border-border py-8 md:py-12">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Discover Puerto Rico</h1>
              <p className="text-muted-foreground text-lg max-w-2xl">From hidden gem restaurants in the mountains to professional services in San Juan.</p>
            </div>
            <button
              onClick={handleSurpriseMe}
              disabled={surpriseMeLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary text-sm font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-60 shrink-0 self-start md:self-auto"
            >
              <Shuffle className={`w-4 h-4 ${surpriseMeLoading ? "animate-spin" : ""}`} />
              {surpriseMeLoading ? "Finding…" : "Surprise Me 🎲"}
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {QUICK_FILTERS.map(f => {
              const isActive = activeFilter?.label === f.label;
              return (
                <button
                  key={f.label}
                  onClick={() => applyQuickFilter(f)}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0
                    ${isActive
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                      : "bg-white text-foreground border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                    }
                  `}
                >
                  <span>{f.emoji}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container px-4 mx-auto py-8 flex-1">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Mobile Filter Toggle */}
          <Button 
            variant="outline" 
            className="lg:hidden w-full flex items-center justify-between rounded-xl h-12"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <span className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
          </Button>

          {/* Sidebar Filters */}
          <aside className={`lg:w-72 shrink-0 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm sticky top-24">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Filters</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      placeholder="Keywords..." 
                      className="pl-9 rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                    <SelectTrigger className="w-full rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-white">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categoriesData?.categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Municipality</label>
                  <Select value={municipality} onValueChange={(v) => { setMunicipality(v); setPage(1); }}>
                    <SelectTrigger className="w-full rounded-xl bg-muted/50 border-transparent focus:border-primary focus:bg-white">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Anywhere" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] rounded-xl">
                      <SelectItem value="all">Anywhere in PR</SelectItem>
                      {MUNICIPALITIES.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">Show</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setFeatured(featured === "true" ? "" : "true"); setPage(1); }}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${featured === "true" ? "bg-primary text-white border-primary" : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"}`}
                    >
                      🌟 Featured only
                    </button>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                    setMunicipality("all");
                    setFeatured("");
                    setPage(1);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Results Area */}
          <main className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{data?.total || 0}</span> results
                {activeFilter && activeFilter.label !== "All" && (
                  <span className="ml-2 text-primary font-medium">for "{activeFilter.emoji} {activeFilter.label}"</span>
                )}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-96 bg-card rounded-2xl animate-pulse border border-border" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-destructive/20 text-destructive">
                <p>Failed to load businesses. Please try again.</p>
              </div>
            ) : data?.businesses?.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-border flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">We couldn't find any businesses matching your current filters. Try adjusting them or searching for something else.</p>
                <Button 
                  variant="outline" 
                  className="rounded-full"
                  onClick={() => { setSearch(""); setCategory("all"); setMunicipality("all"); setFeatured(""); }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data?.businesses?.map((business) => (
                    <BusinessCard key={business.id} business={business} />
                  ))}
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="mt-12 flex justify-center items-center gap-2">
                    <Button 
                      variant="outline" 
                      disabled={page === 1}
                      onClick={() => { setPage(p => p - 1); window.scrollTo(0,0); }}
                      className="rounded-lg"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 mx-4 text-sm font-medium">
                      Page {page} of {data.totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      disabled={page === data.totalPages}
                      onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }}
                      className="rounded-lg"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
