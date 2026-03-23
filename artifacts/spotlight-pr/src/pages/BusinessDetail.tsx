import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { MapPin, Phone, Globe, Mail, Share2, Heart, Flag, CheckCircle2, BadgeCheck, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetBusiness, useListBusinessReviews, useCreateReview, useClaimBusiness } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { StarRating } from "@/components/ui/star-rating";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { BusinessMap } from "@/components/business/BusinessMap";

const API_BASE = import.meta.env.BASE_URL || "/";

export default function BusinessDetail() {
  const { id } = useParams();
  const businessSlugOrId = id || "";
  const numericId = parseInt(businessSlugOrId, 10);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: business, isLoading: loadingBusiness, refetch: refetchBusiness } = useGetBusiness(businessSlugOrId, { query: { enabled: !!businessSlugOrId } });
  // Reviews still use numeric ID (fetched from business data once loaded)
  const businessId = business?.id ?? (isNaN(numericId) ? 0 : numericId);
  const { data: reviewsData, isLoading: loadingReviews } = useListBusinessReviews(businessId, { query: { enabled: !!businessId } });

  // Track page view on load
  useEffect(() => {
    if (businessId && businessId > 0) {
      fetch(`${API_BASE}api/businesses/${businessId}/track-page-view`, { method: "POST" }).catch(err => console.error("Failed to track page view", err));
    }
  }, [businessId]);

  const [rating, setRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "claim">("about");

  const { mutateAsync: submitReview } = useCreateReview();
  const { mutate: claimBiz, isPending: isClaimingBusiness } = useClaimBusiness({
    mutation: {
      onSuccess: () => {
        toast({ title: "Business claimed!", description: "You can now manage this listing from your dashboard." });
        setActiveTab("about");
        refetchBusiness();
        queryClient.invalidateQueries({ queryKey: [`/api/my/businesses`] });
      },
      onError: (error: any) => {
        toast({ title: "Failed to claim business", description: error.message || "Please try again.", variant: "destructive" });
      },
    },
  });

  if (loadingBusiness) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <h2 className="text-2xl font-bold">Business not found</h2>
      <Link href="/directory"><Button>Return to Directory</Button></Link>
    </div>;
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingReview(true);
    try {
      await submitReview({
        id: businessId,
        data: { rating, title: reviewTitle, body: reviewBody }
      });
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setRating(0);
      setReviewTitle("");
      setReviewBody("");
      // Invalidate queries to refresh list and average rating
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessSlugOrId}`] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Cover Header */}
      <div className="relative h-64 md:h-96 w-full bg-muted overflow-hidden">
        <img 
          src={business.coverUrl || `${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="container px-4 mx-auto relative -mt-20 md:-mt-32">
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-10 mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Logo */}
            <div className="w-24 h-24 md:w-36 md:h-36 shrink-0 rounded-2xl bg-white p-2 shadow-lg border border-border/50 -mt-16 md:-mt-20 relative z-10 overflow-hidden">
              <img 
                src={business.logoUrl || `${import.meta.env.BASE_URL}images/placeholder-logo.png`} 
                alt={`${business.name} logo`}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            {/* Title & Core Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-full px-3">
                      {business.categoryName}
                    </Badge>
                    {business.status === 'approved' && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-transparent gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                    {(business as any).isClaimed && (
                      <Badge className="bg-blue-500 hover:bg-blue-500 text-white border-transparent gap-1">
                        <BadgeCheck className="w-3 h-3" /> Claimed
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-2">{business.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> {business.municipality}</span>
                    {business.averageRating ? (
                      <span className="flex items-center gap-1.5 text-foreground">
                        <StarRating rating={business.averageRating} size={16} /> 
                        <span className="font-bold">{business.averageRating.toFixed(1)}</span> ({business.reviewCount} reviews)
                      </span>
                    ) : (
                      <span className="italic">No reviews yet</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <Button variant="outline" size="icon" className="rounded-full shrink-0"><Share2 className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" className="rounded-full shrink-0"><Heart className="w-4 h-4" /></Button>
                  {business.phone && (
                    <Button onClick={() => window.location.href = `tel:${business.phone}`} className="flex-1 md:flex-none rounded-full gap-2 shadow-md">
                      <Phone className="w-4 h-4" /> Call
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs */}
            <div className="bg-card rounded-2xl shadow-sm border border-border">
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("about")}
                  className={`flex-1 px-6 py-4 font-semibold transition-colors text-center ${
                    activeTab === "about"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  About
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`flex-1 px-6 py-4 font-semibold transition-colors text-center ${
                    activeTab === "reviews"
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Reviews
                </button>
                {!business.isClaimed && isAuthenticated && (
                  <button
                    onClick={() => setActiveTab("claim")}
                    className={`flex-1 px-6 py-4 font-semibold transition-colors text-center ${
                      activeTab === "claim"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Claim Business
                  </button>
                )}
              </div>

              <div className="p-6 md:p-8">
                {/* About Tab */}
                {activeTab === "about" && (
                  <section>
                    <h2 className="text-xl font-bold mb-4 font-display">About</h2>
                    <div className="prose max-w-none text-muted-foreground whitespace-pre-line">
                      {business.description || "No description provided."}
                    </div>
                  </section>
                )}

                {/* Claim Business Tab */}
                {activeTab === "claim" && !business.isClaimed && isAuthenticated && (
                  <section>
                    <h2 className="text-xl font-bold mb-4 font-display">Claim This Business</h2>
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                          <p className="font-semibold mb-1">Own this business?</p>
                          <p>Click the button below to claim it. You'll be able to manage the listing, update information, and respond to reviews.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-4">
                        <div>
                          <h3 className="font-semibold mb-2">Business Name</h3>
                          <p className="text-muted-foreground">{business.name}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Your Account</h3>
                          <p className="text-muted-foreground">{user?.email || user?.username}</p>
                        </div>
                      </div>

                      <Button
                        onClick={() => claimBiz({ id: businessId })}
                        disabled={isClaimingBusiness}
                        size="lg"
                        className="w-full"
                      >
                        {isClaimingBusiness ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Claiming...
                          </>
                        ) : (
                          "Claim This Business"
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        By claiming, you confirm you are authorized to manage this business.
                      </p>
                    </div>
                  </section>
                )}

                {/* Reviews Tab */}
                {activeTab === "reviews" && (
                  <section id="reviews">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold font-display">Reviews ({business.reviewCount || 0})</h2>
                      {business.averageRating && (
                        <div className="flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-xl">
                          <span className="text-2xl font-bold font-display">{business.averageRating.toFixed(1)}</span>
                          <StarRating rating={business.averageRating} size={20} />
                        </div>
                      )}
                    </div>

                    {/* Write Review */}
                    {isAuthenticated ? (
                      <div className="bg-muted/30 rounded-xl p-6 mb-8 border border-border/50">
                        <h3 className="font-semibold mb-4 text-foreground">Write a Review</h3>
                        <form onSubmit={handleReviewSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Your Rating</label>
                            <StarRating rating={rating} onChange={setRating} readonly={false} size={28} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Title (optional)</label>
                            <input 
                              type="text" 
                              value={reviewTitle}
                              onChange={(e) => setReviewTitle(e.target.value)}
                              placeholder="Sum up your experience"
                              className="w-full px-4 py-2 rounded-lg border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Review</label>
                            <textarea 
                              value={reviewBody}
                              onChange={(e) => setReviewBody(e.target.value)}
                              placeholder="Share details of your own experience at this place"
                              className="w-full px-4 py-3 rounded-lg border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[120px] resize-y"
                              required
                            />
                          </div>
                          <Button type="submit" disabled={isSubmittingReview || rating === 0} className="w-full sm:w-auto">
                            {isSubmittingReview ? "Submitting..." : "Post Review"}
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <div className="bg-primary/5 rounded-xl p-6 mb-8 border border-primary/10 text-center">
                        <h3 className="font-semibold mb-2 text-foreground">Have you visited {business.name}?</h3>
                        <p className="text-muted-foreground text-sm mb-4">Log in to share your experience with the community.</p>
                        <Button onClick={() => window.location.href='/api/login'} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">Log in to Review</Button>
                      </div>
                    )}

                    {/* Review List */}
                    {loadingReviews ? (
                      <div className="space-y-4">
                        {[1,2].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
                      </div>
                    ) : reviewsData?.reviews?.length ? (
                      <div className="space-y-6">
                        {reviewsData.reviews.map(review => (
                          <div key={review.id} className="border-b border-border/50 last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase overflow-hidden">
                                  {review.authorImage ? <img src={review.authorImage} alt="" className="w-full h-full object-cover"/> : review.authorName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{review.authorName || 'Anonymous User'}</p>
                                  <p className="text-xs text-muted-foreground">{format(new Date(review.createdAt), 'MMM d, yyyy')}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <StarRating rating={review.rating} size={14} className="mb-2" />
                              {review.title && <h4 className="font-bold text-foreground mb-1">{review.title}</h4>}
                              <p className="text-muted-foreground text-sm leading-relaxed">{review.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-8">Be the first to review this business!</p>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6">
            {/* Map */}
            <BusinessMap
              address={business.address}
              municipality={business.municipality}
              businessName={business.name}
              businessId={businessId}
            />

            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sticky top-24">
              <h3 className="font-bold mb-4 font-display">Contact Info</h3>
              
              <ul className="space-y-4">
                {business.address && (
                  <li className="flex gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-foreground font-medium">{business.address}</span>
                      <span className="text-sm">{business.municipality}, PR</span>
                    </div>
                  </li>
                )}
                {business.phone && (
                  <li className="flex gap-3 items-center text-muted-foreground">
                    <Phone className="w-5 h-5 text-primary shrink-0" />
                    <a href={`tel:${business.phone}`} className="text-foreground hover:text-primary transition-colors">{business.phone}</a>
                  </li>
                )}
                {business.email && (
                  <li className="flex gap-3 items-center text-muted-foreground">
                    <Mail className="w-5 h-5 text-primary shrink-0" />
                    <a href={`mailto:${business.email}`} className="text-foreground hover:text-primary transition-colors truncate">{business.email}</a>
                  </li>
                )}
                {business.website && (
                  <li className="flex gap-3 items-center text-muted-foreground">
                    <Globe className="w-5 h-5 text-primary shrink-0" />
                    <a 
                      href={business.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={() => {
                        if (businessId && businessId > 0) {
                          fetch(`${API_BASE}api/businesses/${businessId}/track-website-click`, { method: "POST" }).catch(err => console.error("Failed to track website click", err));
                        }
                      }}
                      className="text-primary hover:underline truncate"
                    >
                      Visit Website
                    </a>
                  </li>
                )}
              </ul>

              {business.socialLinks && Object.keys(business.socialLinks).length > 0 && (
                <>
                  <hr className="my-6 border-border" />
                  <h3 className="font-bold mb-4 font-display">Social Media</h3>
                  <div className="flex gap-3">
                    {/* Simplified social mapping for prototype */}
                    {Object.entries(business.socialLinks).map(([platform, url]) => {
                       if(!url) return null;
                       return (
                         <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-primary hover:text-white transition-colors capitalize text-xs font-bold">
                           {platform.substring(0,2)}
                         </a>
                       )
                    })}
                  </div>
                </>
              )}
              
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-center text-xs text-muted-foreground">
                <Button variant="ghost" size="sm" className="gap-1.5"><Flag className="w-3 h-3" /> Report Listing</Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
