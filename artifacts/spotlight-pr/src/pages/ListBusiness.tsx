import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Store, MapPin, Globe, User, Image as ImageIcon,
  ChevronRight, ChevronLeft, CheckCircle2, Loader2, Mail, KeyRound, MapOff, ChevronDown, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUNICIPALITIES } from "@/lib/constants";
import { useListCategories, useCreateBusiness } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  ownerName: z.string().min(2, "Please enter your full name."),
  ownerPhone: z.string().min(7, "Please enter a valid phone number."),
  ownerContactEmail: z.string().email("Please enter a valid email address."),
  name: z.string().min(2, "Business name must be at least 2 characters."),
  description: z.string().min(10, "Please provide a slightly longer description."),
  categoryId: z.coerce.number().min(1, "Please select a category."),
  municipality: z.string().min(1, "Please select an operating municipality."),
  hasPhysicalLocation: z.boolean().default(true),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  website: z.string().url("Invalid URL. Must include http:// or https://").optional().or(z.literal("")),
  logoUrl: z.string().optional().or(z.literal("")),
  coverUrl: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "About You",                icon: User,         fields: ["ownerName", "ownerContactEmail", "ownerPhone"] as const },
  { id: 2, title: "Business",                 icon: Store,        fields: ["name", "categoryId", "description"] as const },
  { id: 3, title: "Operating Municipality",  icon: MapPin,       fields: ["municipality"] as const },
  { id: 4, title: "Physical Location",       icon: MapPin,       fields: ["address", "phone", "email", "website"] as const },
  { id: 5, title: "Photos",                  icon: ImageIcon,    fields: ["logoUrl", "coverUrl"] as const },
  { id: 6, title: "Review",                  icon: CheckCircle2, fields: [] as const },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm
                ${done ? "bg-primary text-white shadow-md shadow-primary/30"
                  : active ? "bg-primary text-white ring-4 ring-primary/20 shadow-md shadow-primary/30"
                  : "bg-muted text-muted-foreground"}
              `}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : done ? "text-primary/60" : "text-muted-foreground"}`}>
                {step.title}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-12 mx-1 mb-5 transition-colors duration-300 ${done ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type SuccessInfo = {
  businessName: string;
  ownerEmail: string;
  accountCreated: boolean;
};

function SuccessScreen({ info, onGoHome }: { info: SuccessInfo; onGoHome: () => void }) {
  const { openAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50/30 py-16 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6 text-center">
        {/* Big checkmark */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-200">
            <CheckCircle2 className="w-14 h-14 text-emerald-600" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-display font-bold mb-2 text-foreground">You're All Set!</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            <strong className="text-foreground">"{info.businessName}"</strong> has been submitted and is pending review. Our team will approve it shortly.
          </p>
        </div>

        {info.accountCreated ? (
          <div className="bg-white border border-border rounded-2xl p-6 shadow-lg text-left space-y-4">
            <h2 className="font-bold font-display text-lg text-foreground flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Your Account Was Created
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We created a Spotlight Puerto Rico account for you. Check your inbox at:
            </p>
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-primary text-sm">{info.ownerEmail}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Your email contains:</p>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Your <strong>temporary password</strong> to log in</li>
                <li>An <strong>email verification link</strong> (from Supabase)</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Please log in and change your temporary password from your account settings. You'll also need to verify your email to unlock full dashboard access.
            </p>
            <Button onClick={() => openAuthModal()} className="w-full rounded-xl gap-2">
              Log In to Your Dashboard
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-2xl p-6 shadow-lg text-left">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We'll notify you at <strong className="text-foreground">{info.ownerEmail}</strong> once your listing is approved and live.
            </p>
          </div>
        )}

        <Button variant="outline" onClick={onGoHome} className="rounded-xl gap-2 px-6">
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}

export default function ListBusiness() {
  const [step, setStep] = useState(1);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [advancedAnswers, setAdvancedAnswers] = useState({
    targetAudience: "",
    mainServices: "",
    uniqueFeature: "",
    yearsInBusiness: "",
    staffSize: "",
  });

  const { data: categoriesData } = useListCategories();
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ownerName: "", ownerPhone: "", ownerContactEmail: "",
      name: "", description: "", categoryId: 0, municipality: "",
      hasPhysicalLocation: true,
      address: "", phone: "", email: "", website: "", logoUrl: "", coverUrl: "",
    },
    mode: "onTouched",
  });

  // Pre-fill the owner fields if the user is already logged in
  useEffect(() => {
    if (user) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
      if (fullName) form.setValue("ownerName", fullName, { shouldValidate: false });
      if (user.email) form.setValue("ownerContactEmail", user.email, { shouldValidate: false });
    }
  }, [user, form]);

  if (successInfo) {
    return <SuccessScreen info={successInfo} onGoHome={() => setLocation("/")} />;
  }

  const currentStep = STEPS[step - 1];

  const goNext = async () => {
    const fieldsToValidate = currentStep.fields as string[];
    if (fieldsToValidate.length > 0) {
      const valid = await form.trigger(fieldsToValidate as any);
      if (!valid) return;
    }
    setStep(s => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateEnhancedDescription = async () => {
    const currentDescription = form.getValues("description");
    const businessName = form.getValues("name");
    
    if (!currentDescription || !businessName || !advancedAnswers.targetAudience) {
      toast({ title: "Please fill in the questions first", variant: "destructive" });
      return;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/openai/enhance-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          currentDescription,
          targetAudience: advancedAnswers.targetAudience,
          mainServices: advancedAnswers.mainServices,
          uniqueFeature: advancedAnswers.uniqueFeature,
          yearsInBusiness: advancedAnswers.yearsInBusiness,
          staffSize: advancedAnswers.staffSize,
        }),
      });

      if (res.ok) {
        const { description } = await res.json();
        form.setValue("description", description, { shouldValidate: true });
        toast({ title: "Description enhanced! Review and adjust as needed." });
        setAdvancedExpanded(false);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to enhance description", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to enhance description:", err);
      toast({ title: "Error", description: "Failed to enhance description. Try again.", variant: "destructive" });
    }
  };

  const onSubmit = async (data: FormValues) => {
    // Only allow submission from step 5 (review page)
    if (step !== STEPS.length) {
      return;
    }
    try {
      const result = await createBusiness({ data: data as any });

      // For authenticated users: redirect as before
      if (isAuthenticated) {
        toast({
          title: "Listing submitted!",
          description: "Your business is pending review. We'll be in touch soon.",
        });
        setLocation("/dashboard");
        return;
      }

      // For guest users: show the success screen
      setSuccessInfo({
        businessName: data.name,
        ownerEmail: data.ownerContactEmail,
        accountCreated: (result as any)?.accountCreated ?? true,
      });
    } catch (err: any) {
      const body = (err?.data ?? null) as any;

      if (body?.code === "ACCOUNT_EXISTS") {
        toast({
          title: "Account already exists",
          description: "An account with this email already exists. Please log in to submit your business.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      toast({
        title: "Submission failed",
        description: body?.error ?? "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const values = form.watch();
  const categoryName = categoriesData?.categories?.find(c => c.id === Number(values.categoryId))?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-emerald-50/30 py-10">
      <div className="container max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Add Your Business</h1>
          <p className="text-muted-foreground">Step {step} of {STEPS.length} — {currentStep.title}</p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>

            {/* ── STEP 1: About You ── */}
            {step === 1 && (
              <div className="bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-1">
                    <User className="w-5 h-5 text-primary" /> Your Contact Information
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isAuthenticated
                      ? "Your account info has been pre-filled. Update anything that's changed."
                      : "This is how we'll reach you — and where we'll send your login credentials."}
                  </p>
                </div>

                <FormField control={form.control} name="ownerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="Jane Doe" className="rounded-xl h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ownerContactEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="rounded-xl h-11"
                        readOnly={isAuthenticated && !!user?.email}
                        {...field}
                      />
                    </FormControl>
                    {!isAuthenticated && (
                      <p className="text-xs text-muted-foreground mt-1">
                        An account will be created at this email so you can manage your listing.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ownerPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Phone Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="(787) 555-0100" className="rounded-xl h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── STEP 2: Business Info ── */}
            {step === 2 && (
              <div className="bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-1">
                    <Store className="w-5 h-5 text-primary" /> Business Details
                  </h2>
                  <p className="text-sm text-muted-foreground">Tell customers about your business.</p>
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="E.g., Cafe El Morro" className="rounded-xl h-11" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {categoriesData?.categories?.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell customers what makes your business special — services, atmosphere, specialties..."
                        className="resize-y min-h-[140px] rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">{(field.value ?? "").length} characters</p>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* ── ADVANCED: Enhance Description ── */}
                <div className="border border-border rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdvancedExpanded(!advancedExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-sm text-foreground">Advanced: Generate Better Description</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${advancedExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {advancedExpanded && (
                    <div className="border-t border-border px-4 py-4 bg-muted/30 space-y-4">
                      <p className="text-xs text-muted-foreground">Answer these questions to help us generate a more compelling description for your business.</p>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Target Audience *</label>
                          <Input
                            placeholder="e.g., Families, young professionals, tourists, health-conscious people"
                            value={advancedAnswers.targetAudience}
                            onChange={(e) => setAdvancedAnswers({ ...advancedAnswers, targetAudience: e.target.value })}
                            className="rounded-lg text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Main Services or Products</label>
                          <Input
                            placeholder="e.g., Coffee, pastries, WiFi, outdoor seating"
                            value={advancedAnswers.mainServices}
                            onChange={(e) => setAdvancedAnswers({ ...advancedAnswers, mainServices: e.target.value })}
                            className="rounded-lg text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">What Makes You Unique?</label>
                          <Input
                            placeholder="e.g., Locally sourced ingredients, award-winning chef, sustainable practices"
                            value={advancedAnswers.uniqueFeature}
                            onChange={(e) => setAdvancedAnswers({ ...advancedAnswers, uniqueFeature: e.target.value })}
                            className="rounded-lg text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Years in Business</label>
                            <Input
                              type="number"
                              placeholder="e.g., 5"
                              value={advancedAnswers.yearsInBusiness}
                              onChange={(e) => setAdvancedAnswers({ ...advancedAnswers, yearsInBusiness: e.target.value })}
                              className="rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Team Size</label>
                            <Input
                              placeholder="e.g., 2-5 people"
                              value={advancedAnswers.staffSize}
                              onChange={(e) => setAdvancedAnswers({ ...advancedAnswers, staffSize: e.target.value })}
                              className="rounded-lg text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={generateEnhancedDescription}
                        className="w-full rounded-xl gap-2"
                      >
                        <Sparkles className="w-4 h-4" /> Generate Enhanced Description
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: Operating Municipality ── */}
            {step === 3 && (
              <div className="bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-primary" /> Operating Municipality
                  </h2>
                  <p className="text-sm text-muted-foreground">Select the main municipality where your business operates. This is how we organize listings in the directory.</p>
                </div>

                <FormField control={form.control} name="municipality" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Municipality <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select a municipality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px] rounded-xl">
                        {MUNICIPALITIES.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── STEP 4: Physical Location ── */}
            {step === 4 && (
              <div className="bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-1">
                    <MapPin className="w-5 h-5 text-primary" /> Physical Location
                  </h2>
                  <p className="text-sm text-muted-foreground">Tell customers where to find you and how to contact your business. All fields below are optional.</p>
                </div>

                <FormField control={form.control} name="hasPhysicalLocation" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="rounded"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>This business has a physical location</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        If unchecked, you can skip adding an address (e.g., for online-only businesses).
                      </p>
                    </div>
                  </FormItem>
                )} />

                {form.watch("hasPhysicalLocation") && (
                  <>
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input placeholder="123 Calle Fortaleza" className="rounded-xl h-11" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Phone</FormLabel>
                      <FormControl><Input placeholder="(787) 555-0123" className="rounded-xl h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Email</FormLabel>
                      <FormControl><Input type="email" placeholder="hello@yourbusiness.com" className="rounded-xl h-11" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="https://www.yourwebsite.com" className="pl-9 rounded-xl h-11" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── STEP 5: Photos ── */}
            {step === 5 && (
              <div className="bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-1">
                    <ImageIcon className="w-5 h-5 text-primary" /> Business Photos
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Great photos make listings stand out. Both are optional — you can add or update them later from your dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <FormField control={form.control} name="logoUrl" render={({ field }) => (
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

                  <FormField control={form.control} name="coverUrl" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ImageUploadField
                          value={field.value}
                          onChange={field.onChange}
                          label="Cover / Header Image"
                          hint="Wide landscape image · 16:9 ratio ideal"
                          aspectRatio="wide"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* ── STEP 6: Review & Submit ── */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="bg-white rounded-3xl shadow-xl border border-border p-6 md:p-8">
                  <h2 className="text-xl font-bold font-display flex items-center gap-2 mb-6">
                    <CheckCircle2 className="w-5 h-5 text-primary" /> Review Your Listing
                  </h2>

                  {/* Preview card */}
                  <div className="rounded-2xl border border-border overflow-hidden mb-6">
                    <div className="relative h-36 bg-muted">
                      {values.coverUrl
                        ? <img src={values.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground/40" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-end gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white shadow-lg overflow-hidden border-2 border-white shrink-0">
                          {values.logoUrl
                            ? <img src={values.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-muted flex items-center justify-center"><Store className="w-5 h-5 text-muted-foreground/50" /></div>
                          }
                        </div>
                        <div className="text-white pb-0.5">
                          <p className="font-bold text-base leading-tight">{values.name || "Your Business Name"}</p>
                          <p className="text-white/80 text-xs">{categoryName || "Category"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <ReviewRow label="Contact Name" value={values.ownerName} />
                    <ReviewRow label="Contact Email" value={values.ownerContactEmail} />
                    <ReviewRow label="Contact Phone" value={values.ownerPhone} />
                    <ReviewRow label="Municipality" value={values.municipality} />
                    {values.address && <ReviewRow label="Address" value={values.address} />}
                    {values.phone && <ReviewRow label="Business Phone" value={values.phone} />}
                    {values.email && <ReviewRow label="Business Email" value={values.email} />}
                    {values.website && <ReviewRow label="Website" value={values.website} />}
                  </div>

                  {values.description && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Description</p>
                      <p className="text-sm text-foreground leading-relaxed">{values.description}</p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-border space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Your listing will be reviewed by our team before going live. We'll notify you via email once it's approved.
                    </p>
                    {!isAuthenticated && (
                      <p className="text-xs text-primary font-medium">
                        A free account will be created at <strong>{values.ownerContactEmail}</strong> — check your inbox for your login credentials.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={step === 1 ? () => setLocation("/") : goBack}
                className="rounded-xl gap-2 px-5"
              >
                <ChevronLeft className="w-4 h-4" />
                {step === 1 ? "Cancel" : "Back"}
              </Button>

              {step < STEPS.length ? (
                <Button type="button" onClick={goNext} className="rounded-xl gap-2 px-6 shadow-md shadow-primary/20">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl px-8 shadow-lg shadow-primary/25 gap-2"
                >
                  {isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Submit Listing</>
                  }
                </Button>
              )}
            </div>

          </form>
        </Form>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="bg-muted/50 rounded-xl px-3 py-2.5">
      <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}
