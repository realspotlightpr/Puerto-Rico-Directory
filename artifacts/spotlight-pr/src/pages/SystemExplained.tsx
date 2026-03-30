import { ArrowRight, CheckCircle2, Zap, Users, BarChart3, MessageSquare, Smartphone, Shield, Rocket, TrendingUp, Lightbulb, Target } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function SystemExplained() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-secondary/5 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary text-white py-20 md:py-32">
        <div className="absolute top-0 left-0 w-96 h-96 bg-secondary/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 mb-6 border border-white/30">
              <Rocket className="w-4 h-4" />
              <span className="text-sm font-semibold">The Complete Business Solution</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              Grow Your Business <span className="text-yellow-300">10X Faster</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-3xl mx-auto">
              The all-in-one CRM platform that brings customers to your door and helps you serve them better
            </p>
            <p className="text-lg text-white/80 mb-10 max-w-3xl mx-auto">
              Just <span className="font-bold text-2xl text-yellow-300">$147/month</span> for everything your business needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/list-your-business">
                <Button size="lg" className="gap-2 bg-white text-primary hover:bg-yellow-300 font-bold text-lg px-8">
                  Start Free Trial Today <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="mailto:info@spotlightpr.com">
                <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/20 font-semibold text-lg px-8">
                  Claim Free Demo Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">10X</div>
              <p className="text-sm text-muted-foreground">Faster Growth</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-display font-bold text-secondary mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">AI Chatbot Support</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">∞</div>
              <p className="text-sm text-muted-foreground">No Hidden Fees</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-display font-bold text-secondary mb-2">1</div>
              <p className="text-sm text-muted-foreground">Simple Price</p>
            </div>
          </div>
        </div>
      </div>

      {/* Package Overview */}
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
                Everything You Need for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">$147/Month</span>
              </h2>
              <p className="text-xl text-muted-foreground">No upsells. No hidden features. Everything included from day one.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">Core Platform</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold">Complete Business Dashboard & CRM</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold">Customer Message Inbox</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold">Form Builder & Lead Capture</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-semibold">Team Member Management</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl p-8 border border-secondary/20 hover:border-secondary/40 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold">Advanced Tools</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-semibold">AI-Powered Business Chatbot</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-semibold">Real-Time Analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-semibold">Review Management & Verified Badge</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-semibold">Media Library & AI Image Generation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRM Benefits Sections */}
      <div className="py-16 md:py-24 bg-gradient-to-b from-white to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
                What You Get Inside the CRM
              </h2>
              <p className="text-xl text-muted-foreground">Powerful tools to attract, engage, and convert customers</p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* 1. Dashboard & Analytics */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-primary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5">
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Real-Time Analytics</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    See exactly how customers find you and what drives results
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>View count tracking from your listing</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Website & map direction clicks</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Review trends & ratings</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 2. AI Chatbot */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-secondary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mb-5">
                    <MessageSquare className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">AI Chatbot (24/7)</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    Never miss a customer inquiry again with intelligent AI
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Powered by GPT-4 technology</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Answer questions in your voice</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Qualify & track conversations</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 3. Message Inbox */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-primary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5">
                    <MessageSquare className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Unified Message Inbox</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    All conversations in one smart dashboard
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>All inquiries in one dashboard</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Status tracking & priorities</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Quick reply system</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 4. Form Builder */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-secondary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mb-5">
                    <Smartphone className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Drag & Drop Forms</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    Build branded forms. No coding required.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Visual form builder</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Customizable fields</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Mobile-optimized</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 5. Team Management */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-primary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Team & Affiliates</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    Manage staff and scale your reach
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Invite team members</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Role-based permissions</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Activity logs</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 6. Review Management */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-secondary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mb-5">
                    <Shield className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Reviews & Reputation</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    Build trust with a verified badge
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Review dashboard</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Rating tracking</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      <span>Verified business badge</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 7. Media Library */}
              <div className="group relative bg-white border border-border rounded-2xl p-8 hover:shadow-2xl hover:border-primary transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-300" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5">
                    <Lightbulb className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Photo Gallery & Media</h3>
                  <p className="text-muted-foreground mb-5 font-medium">
                    Showcase your business visually
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Logo & cover images</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>Photo gallery</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>AI image generation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefit Section 1: Results */}
      <div className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
                See Real Results <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">in Your First Month</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Our clients see an average of <strong className="text-primary">3-5x increase in customer inquiries</strong> within the first 30 days of using Spotlight. 
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                The AI chatbot handles 80% of routine questions automatically, your team responds faster to leads, and your verified badge builds trust instantly. No more lost customers.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <span className="font-semibold text-foreground">More visibility on the directory</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <span className="font-semibold text-foreground">Faster customer response times</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-secondary" />
                  <span className="font-semibold text-foreground">Better online reputation</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 border border-primary/20">
                <div className="bg-white/80 rounded-2xl p-8 text-center">
                  <div className="text-6xl font-display font-bold text-primary mb-2">+300%</div>
                  <p className="text-lg text-muted-foreground mb-4">Average Inquiry Increase</p>
                  <p className="text-sm text-muted-foreground italic">Based on client data from first 30 days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefit Section 2: Simple Setup */}
      <div className="py-16 md:py-24 bg-gradient-to-br from-secondary/5 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl p-8 border border-border shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">1</div>
                    <div>
                      <p className="font-bold text-foreground">Create Account</p>
                      <p className="text-sm text-muted-foreground">Takes 2 minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">2</div>
                    <div>
                      <p className="font-bold text-foreground">Fill Your Info</p>
                      <p className="text-sm text-muted-foreground">Business details & photos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">3</div>
                    <div>
                      <p className="font-bold text-foreground">Go Live</p>
                      <p className="text-sm text-muted-foreground">Start getting customers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
                Get Started in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">3 Simple Steps</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                We've made it dead simple to get your business online and start attracting customers. No technical knowledge required.
              </p>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Most businesses are set up and live within their first hour. Our onboarding team is here to help every step of the way.
              </p>
              <Link href="/list-your-business">
                <Button size="lg" className="gap-2">
                  Start Your Setup Now <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Benefit Section 3: Support */}
      <div className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
                We're Here for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Your Success</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Your success is our success. We don't just give you a tool — we give you a partner committed to growing your business.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">Dedicated Onboarding</p>
                    <p className="text-muted-foreground">We help set everything up perfectly</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">Priority Support</p>
                    <p className="text-muted-foreground">Email & phone support during business hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">Regular Check-Ins</p>
                    <p className="text-muted-foreground">Monthly calls to optimize your results</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">Training & Resources</p>
                    <p className="text-muted-foreground">Video guides, tips, and best practices</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
              <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-12 border border-primary/20">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-2">SPOTLIGHT TEAM</p>
                  <p className="text-2xl font-display font-bold text-foreground mb-4">Always Ready to Help</p>
                  <p className="text-muted-foreground mb-6">
                    Our Puerto Rican team speaks your language and understands your business.
                  </p>
                  <a href="mailto:info@spotlightpr.com" className="inline-block">
                    <Button variant="outline" className="gap-2">
                      Contact Support <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guarantee Section */}
      <div className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 border border-primary/20 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">100% Money-Back Guarantee</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
              Risk-Free Trial
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Try Spotlight for 30 days completely free. No credit card needed. If you're not happy with the results, we'll refund you 100%. We're that confident you'll love it.
            </p>
            
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-secondary text-white py-20 md:py-28">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/20 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight">
              Stop Losing Customers to Your <span className="text-yellow-300">Competitors</span>
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-2xl mx-auto">
              Get found online, engage customers with AI, and manage your entire business from one dashboard.
            </p>
            <p className="text-lg text-white/80 mb-12 max-w-2xl mx-auto">
              Plus, get a <span className="font-bold">30-day free trial</span> — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/list-your-business">
                <Button size="lg" className="gap-2 bg-white text-primary hover:bg-yellow-300 font-bold text-lg px-8">
                  Start My Free Trial <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="mailto:info@spotlightpr.com">
                <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/20 font-semibold text-lg px-8">
                  Claim Free Demo Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
