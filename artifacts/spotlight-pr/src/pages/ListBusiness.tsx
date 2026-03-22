import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, MapPin, Phone, Globe, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUNICIPALITIES } from "@/lib/constants";
import { useListCategories, useCreateBusiness } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().min(10, "Please provide a slightly longer description."),
  categoryId: z.coerce.number().min(1, "Please select a category."),
  municipality: z.string().min(1, "Please select a municipality."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal("")),
  website: z.string().url("Invalid URL. Must include http:// or https://").optional().or(z.literal("")),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  coverUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function ListBusiness() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const { toast } = useToast();
  
  const { data: categoriesData } = useListCategories();
  const { mutateAsync: createBusiness, isPending } = useCreateBusiness();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", description: "", categoryId: 0, municipality: "",
      address: "", phone: "", email: "", website: "", logoUrl: "", coverUrl: ""
    }
  });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>;
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center">
          <Store className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold font-display mb-2">Claim Your Spot</h2>
          <p className="text-muted-foreground mb-8">You need to log in to add your business to the Spotlight Puerto Rico directory.</p>
          <Button onClick={() => login()} size="lg" className="w-full rounded-xl">Log In or Sign Up</Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    try {
      await createBusiness({ data });
      toast({ 
        title: "Success!", 
        description: "Your business has been submitted and is pending review by our team.",
      });
      setLocation("/dashboard");
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to submit business. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Add Your Business</h1>
          <p className="text-muted-foreground text-lg">Join the premier directory for Puerto Rico businesses.</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Store className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg font-display">Basic Information</h3>
                </div>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="E.g., Cafe El Morro" className="rounded-xl" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl">
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
                      <Textarea placeholder="Tell customers about what makes your business special..." className="resize-y min-h-[120px] rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Location */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-2 pt-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg font-display">Location</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="municipality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipality <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select town" />
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

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Input placeholder="E.g., 123 Calle Fortaleza" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-2 pt-4">
                  <Phone className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg font-display">Contact & Web</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="(787) 555-0123" className="rounded-xl" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" placeholder="hello@yourbusiness.com" className="rounded-xl" {...field} /></FormControl>
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
                        <Input placeholder="https://www.yourwebsite.com" className="pl-9 rounded-xl" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Media */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-2 pt-4">
                  <Upload className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-lg font-display">Media (URLs)</h3>
                </div>

                <FormField control={form.control} name="logoUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Image URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com/logo.jpg" className="rounded-xl" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Square image recommended.</p>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="coverUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com/cover.jpg" className="rounded-xl" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Wide landscape image recommended.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="pt-6 border-t border-border flex items-center justify-end gap-4">
                <Button type="button" variant="ghost" onClick={() => setLocation("/")}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="rounded-xl px-8 shadow-lg shadow-primary/25">
                  {isPending ? "Submitting..." : "Submit Listing"}
                </Button>
              </div>

            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
