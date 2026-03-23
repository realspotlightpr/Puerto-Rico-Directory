import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store, MapPin, Phone, Globe, Upload, Star, MessageSquare,
  ArrowLeft, CheckCircle2, Clock, XCircle, Save, Instagram,
  Facebook, Twitter, ChevronRight, Loader2, User, Bot, Link2, BarChart3, Tag, Youtube,
} from "lucide-react";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import {
  useGetBusiness,
  useUpdateBusiness,
  useListBusinessReviews,
  useListCategories,
} from "@workspace/api-client-react";
import { MUNICIPALITIES } from "@/lib/constants";
import { format } from "date-fns";

const detailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().min(10, "Description is too short."),
  categoryId: z.coerce.number().min(1, "Please select a category."),
  municipality: z.string().min(1, "Please select a municipality."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  specialOffer: z.string().max(160, "Special offer must be 160 characters or fewer.").optional().or(z.literal("")),
  slug: z.string()
    .min(2, "URL must be at least 2 characters.")
    .max(100, "URL is too long.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use only lowercase letters, numbers, and hyphens (e.g. my-business).")
    .optional()
    .or(z.literal("")),
});

function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

const mediaSchema = z.object({
  logoUrl: z.string().optional().or(z.literal("")),
  coverUrl: z.string().optional().or(z.literal("")),
});

const socialSchema = z.object({
  facebook: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="w-3 h-3" />Live</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1"><Clock className="w-3 h-3" />Pending Review</Badge>;
}

export default function ManageBusiness() {
  const [, params] = useRoute("/manage/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const id = parseInt(params?.id ?? "0");

  const { data: businessData, isLoading: bizLoading, refetch } = useGetBusiness(id, {
    query: { enabled: !!id && isAuthenticated },
  });
  const { data: reviewsData, isLoading: reviewsLoading } = useListBusinessReviews(id, {
    query: { enabled: !!id && isAuthenticated },
  });
  const { data: categoriesData } = useListCategories();
  const { mutateAsync: updateBusiness, isPending: isSaving } = useUpdateBusiness();

  const business = businessData;

  // Hours state
  const [hours, setHours] = useState<Record<string, string>>({});

  // Redirect if not owner
  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
    if (business && user && business.ownerId !== user.id && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, business, user, setLocation]);

  // Sync hours from business data
  useEffect(() => {
    if (business?.hours) setHours(business.hours as Record<string, string>);
  }, [business]);

  // ── Details form ──────────────────────────────────────
  const detailsForm = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", description: "", categoryId: 0, municipality: "", address: "", phone: "", email: "", website: "", specialOffer: "", slug: "" },
  });

  const mediaForm = useForm({
    resolver: zodResolver(mediaSchema),
    defaultValues: { logoUrl: "", coverUrl: "" },
  });

  const socialForm = useForm({
    resolver: zodResolver(socialSchema),
    defaultValues: { facebook: "", instagram: "", twitter: "" },
  });

  // Populate forms when business loads
  useEffect(() => {
    if (!business) return;
    detailsForm.reset({
      name: business.name ?? "",
      description: business.description ?? "",
      categoryId: business.categoryId ?? 0,
      municipality: business.municipality ?? "",
      address: business.address ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
      specialOffer: (business as any).specialOffer ?? "",
      slug: (business as any).slug ?? "",
    });
    mediaForm.reset({
      logoUrl: business.logoUrl ?? "",
      coverUrl: business.coverUrl ?? "",
    });
    const sl = business.socialLinks as any;
    socialForm.reset({
      facebook: sl?.facebook ?? "",
      instagram: sl?.instagram ?? "",
      twitter: sl?.twitter ?? "",
      youtube: sl?.youtube ?? "",
    });
  }, [business]);

  const saveDetails = async (data: z.infer<typeof detailsSchema>) => {
    try {
      await updateBusiness({ id, data: data as any });
      refetch();
      toast({ title: "Details saved!", description: "Your listing has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    }
  };

  const saveMedia = async (data: z.infer<typeof mediaSchema>) => {
    try {
      await updateBusiness({ id, data: data as any });
      refetch();
      toast({ title: "Media saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const saveSocial = async (data: z.infer<typeof socialSchema>) => {
    try {
      await updateBusiness({ id, data: { socialLinks: data } as any });
      refetch();
      toast({ title: "Social links saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const saveHours = async () => {
    try {
      await updateBusiness({ id, data: { hours } as any });
      refetch();
      toast({ title: "Hours saved!" });
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Business not found</h2>
          <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const avgRating = business.averageRating ?? 0;
  const reviewCount = business.reviewCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold font-display text-foreground leading-tight">{business.name}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={business.status} />
                {business.status === "approved" && (
                  <Link href={`/businesses/${(business as any).slug || business.id}`}>
                    <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      View public listing <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-xl font-bold font-display text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Rating</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold font-display text-foreground">{reviewCount}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending notice ── */}
      {business.status === "pending" && (
        <div className="bg-amber-50 border-b border-amber-200 py-3">
          <div className="container mx-auto px-4 flex items-center gap-2 text-amber-800 text-sm">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <p>Your listing is <strong>pending review</strong>. Our team will approve it within 24 hours. You can still update your details while you wait.</p>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="details">
          <TabsList className="w-full mb-8 bg-white border border-border rounded-xl p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="details" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Store className="w-4 h-4" /> Details
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Star className="w-4 h-4" /> Reviews {reviewCount > 0 && `(${reviewCount})`}
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Clock className="w-4 h-4" /> Hours
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Upload className="w-4 h-4" /> Media
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex-1 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-emerald-500 data-[state=active]:text-white gap-2 py-2">
              <Bot className="w-4 h-4" /> AI Assistant
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <BarChart3 className="w-4 h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-2 py-2">
              <Globe className="w-4 h-4" /> Social
            </TabsTrigger>
          </TabsList>

          {/* ── DETAILS ── */}
          <TabsContent value="details">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> Business Information
              </h2>
              <Form {...detailsForm}>
                <form onSubmit={detailsForm.handleSubmit(saveDetails)} className="space-y-6">
                  <FormField control={detailsForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={detailsForm.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Textarea className="rounded-xl min-h-[140px] resize-y" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={detailsForm.control} name="categoryId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            {categoriesData?.categories?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={detailsForm.control} name="municipality" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipality <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select town" /></SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[280px] rounded-xl">
                            {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={detailsForm.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Street Address</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="123 Calle Principal" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={detailsForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Business Phone</FormLabel>
                        <FormControl><Input className="rounded-xl" placeholder="(787) 555-0123" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={detailsForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Email</FormLabel>
                        <FormControl><Input type="email" className="rounded-xl" placeholder="hello@mybusiness.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={detailsForm.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Website</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://www.mybusiness.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* ── Special Offer ── */}
                  <FormField control={detailsForm.control} name="specialOffer" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" /> Special Offer / Promotion
                        <span className="text-xs font-normal text-muted-foreground ml-1">(optional · max 160 chars)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="rounded-xl resize-none min-h-[72px]"
                          placeholder="e.g. 10% off for new customers this month! Mention Spotlight PR."
                          maxLength={160}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">{(field.value || "").length}/160 — Displayed as a highlighted banner on your public listing.</p>
                    </FormItem>
                  )} />

                  {/* ── Custom URL slug ── */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-primary" />
                      <p className="font-semibold text-sm text-foreground">Custom Listing URL</p>
                    </div>
                    <FormField control={detailsForm.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center rounded-xl border border-border bg-white overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 border-r border-border select-none whitespace-nowrap">
                              spotlightpuertorico.com/businesses/
                            </span>
                            <input
                              {...field}
                              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none font-mono"
                              placeholder="my-business-name"
                              onChange={e => field.onChange(toSlug(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground">
                          Only lowercase letters, numbers, and hyphens. This is your public listing URL.
                        </p>
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={isSaving} className="rounded-xl gap-2 px-8">
                      {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Changes</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ── REVIEWS ── */}
          <TabsContent value="reviews">
            <div className="space-y-4">
              {/* Summary card */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-5xl font-bold font-display text-foreground">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</p>
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  {reviewCount === 0
                    ? "No reviews yet. Once customers discover your listing, their reviews will appear here."
                    : "Reviews help new customers trust your business. Respond to feedback by contacting customers directly."}
                </div>
              </div>

              {reviewsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-border animate-pulse" />)}</div>
              ) : reviewsData?.reviews?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No reviews yet</p>
                  <p className="text-sm mt-1">Share your listing to get your first review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsData?.reviews?.map((r) => (
                    <div key={r.id} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Customer</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      {r.title && <p className="font-semibold text-foreground mt-3">{r.title}</p>}
                      {r.body && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.body}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── HOURS ── */}
          <TabsContent value="hours">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> Business Hours
              </h2>
              <p className="text-sm text-muted-foreground mb-6">Leave a day blank to mark it as closed.</p>
              <div className="space-y-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-4">
                    <span className="w-28 text-sm font-medium text-foreground flex-shrink-0">{day}</span>
                    <Input
                      className="rounded-xl text-sm flex-1"
                      placeholder="e.g. 9:00 AM – 6:00 PM  or  Closed"
                      value={hours[day] ?? ""}
                      onChange={e => setHours(prev => ({ ...prev, [day]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-6 mt-6 border-t border-border">
                <Button onClick={saveHours} disabled={isSaving} className="rounded-xl gap-2 px-8">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Hours</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* ── MEDIA ── */}
          <TabsContent value="media">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Logo & Cover Photo
              </h2>

              <Form {...mediaForm}>
                <form onSubmit={mediaForm.handleSubmit(saveMedia)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <FormField control={mediaForm.control} name="logoUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploadField
                            value={field.value}
                            onChange={field.onChange}
                            label="Business Logo"
                            hint="Square image · PNG or JPG recommended"
                            aspectRatio="square"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={mediaForm.control} name="coverUrl" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUploadField
                            value={field.value}
                            onChange={field.onChange}
                            label="Cover / Header Photo"
                            hint="Wide landscape image · 16:9 ratio ideal"
                            aspectRatio="wide"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={isSaving} className="rounded-xl gap-2 px-8">
                      {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Media</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-8 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Performance Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Page Views Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-900">Page Views</p>
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{business?.pageViews || 0}</p>
                  <p className="text-xs text-blue-700 mt-2">Total times your spotlight page was viewed</p>
                </div>

                {/* Website Clicks Card */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-emerald-900">Website Clicks</p>
                    <Globe className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">{business?.websiteClicks || 0}</p>
                  <p className="text-xs text-emerald-700 mt-2">Visitors clicked on your website link</p>
                </div>

                {/* Maps Clicks Card */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900">Map Clicks</p>
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{business?.mapsClicks || 0}</p>
                  <p className="text-xs text-purple-700 mt-2">Visitors clicked on map/directions</p>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">How we track analytics</p>
                  <p>We automatically track when someone views your business page, clicks the "Visit Website" link, or clicks on map/directions buttons. This helps you understand customer interest and engagement.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── SOCIAL ── */}
          <TabsContent value="social">
            <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-bold font-display mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> Social Media Links
              </h2>
              <Form {...socialForm}>
                <form onSubmit={socialForm.handleSubmit(saveSocial)} className="space-y-6">
                  <FormField control={socialForm.control} name="facebook" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> Facebook</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://facebook.com/yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={socialForm.control} name="instagram" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-500" /> Instagram</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://instagram.com/yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={socialForm.control} name="twitter" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Twitter className="w-4 h-4 text-sky-500" /> X / Twitter</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://x.com/yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={socialForm.control} name="youtube" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500" /> YouTube</FormLabel>
                      <FormControl><Input className="rounded-xl" placeholder="https://youtube.com/@yourbusiness" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={isSaving} className="rounded-xl gap-2 px-8">
                      {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Links</>}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="ai">
            <AIAssistant businessId={business.id} businessName={business.name} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
