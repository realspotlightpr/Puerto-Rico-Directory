import { Link } from "wouter";
import { MapPin, Phone, ShieldCheck, BadgeCheck } from "lucide-react";
import { Business } from "@workspace/api-client-react";
import { StarRating } from "@/components/ui/star-rating";
import { Badge } from "@/components/ui/badge";

interface BusinessCardProps {
  business: Business;
  featured?: boolean;
}

export function BusinessCard({ business, featured = false }: BusinessCardProps) {
  const isActuallyFeatured = featured || business.featured;
  const isVerified = business.status === "approved";
  const isClaimed = business.isClaimed;
  
  return (
    <Link href={`/businesses/${business.id}`}>
      <div className={`
        group h-full bg-card rounded-2xl overflow-hidden border
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30
        ${isActuallyFeatured ? 'border-secondary/50 shadow-md shadow-secondary/10' : 'border-border/60 shadow-sm'}
      `}>
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          <div className="absolute top-4 left-4 z-10 flex gap-1.5 flex-wrap">
            {isActuallyFeatured && (
              <Badge className="bg-secondary hover:bg-secondary text-white font-semibold shadow-lg">
                Featured
              </Badge>
            )}
            {isVerified && (
              <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white font-semibold shadow-lg flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            )}
            {isClaimed && (
              <Badge className="bg-blue-500 hover:bg-blue-500 text-white font-semibold shadow-lg flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Claimed
              </Badge>
            )}
          </div>
          <img 
            src={business.coverUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt={business.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
            <div className="w-14 h-14 rounded-xl bg-white p-1 shadow-lg shrink-0 overflow-hidden">
              <img 
                src={business.logoUrl || `${import.meta.env.BASE_URL}images/placeholder-logo.png`} 
                alt={`${business.name} logo`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="text-white pb-1 overflow-hidden">
              <h3 className="font-display font-bold text-lg leading-tight truncate">{business.name}</h3>
              <p className="text-white/80 text-sm truncate">{business.categoryName}</p>
            </div>
          </div>
        </div>
        
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium bg-muted px-2.5 py-1 rounded-full w-fit">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {business.municipality}
            </div>
            {business.averageRating && business.averageRating > 0 ? (
              <div className="flex items-center gap-1.5 bg-accent/10 px-2 py-1 rounded-full">
                <StarRating rating={business.averageRating} size={14} />
                <span className="text-xs font-bold text-foreground">
                  {business.averageRating.toFixed(1)} <span className="text-muted-foreground font-normal">({business.reviewCount})</span>
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">No reviews yet</span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {business.description || "No description provided."}
          </p>
          
          <div className="mt-auto pt-4 flex gap-2">
            <button className="flex-1 py-2 rounded-xl bg-primary/5 text-primary text-sm font-semibold hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2">
              View Profile
            </button>
            {business.phone && (
              <button 
                onClick={(e) => { e.preventDefault(); window.location.href = `tel:${business.phone}`; }}
                className="w-10 h-10 rounded-xl bg-muted text-foreground hover:bg-primary hover:text-white transition-colors flex items-center justify-center shrink-0"
                aria-label="Call business"
              >
                <Phone className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
