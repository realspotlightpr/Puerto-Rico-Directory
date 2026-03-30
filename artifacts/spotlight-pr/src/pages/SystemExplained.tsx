import { ArrowRight, CheckCircle2, Zap, Users, BarChart3, MessageSquare, Smartphone, Shield } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function SystemExplained() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-white to-secondary/10 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 text-foreground">
              Spotlight System Explained
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Everything included in the $147/month Spotlight Business CRM Package
            </p>
            <Link href="/list-your-business">
              <Button size="lg" className="gap-2">
                Get Started Today <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Package Overview */}
      <div className="py-16 md:py-24 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold mb-8 text-foreground">
              The $147/Month Package
            </h2>
            <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 md:p-12 border border-primary/20">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-secondary" />
                    Core Features
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Complete Business Dashboard & CRM</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>AI-Powered Business Chatbot</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Message Inbox & Customer Communications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Form Builder & Lead Capture</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Team Member Management</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-secondary" />
                    Advanced Tools
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Analytics & Performance Tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Review Management System</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Media Library & Asset Management</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Mobile-Optimized Interface</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-secondary font-bold mt-1">✓</span>
                      <span>Verified Badge & Trust Building</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="text-center pt-4 border-t border-primary/20">
                <p className="text-muted-foreground mb-4">
                  All features are included in every plan. No hidden fees or feature tiers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRM Benefits Sections */}
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold mb-12 text-center text-foreground">
              What You Get Inside the CRM
            </h2>

            {/* 1. Dashboard & Analytics */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Dashboard & Analytics</h3>
                  <p className="text-muted-foreground">
                    Get real-time insights into your business performance
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>View Count Tracking:</strong> See how many people discover your business listing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Click Analytics:</strong> Track website clicks and map directions clicks from your listing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Review Monitoring:</strong> Monitor all customer reviews, ratings, and feedback in one place</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Performance Metrics:</strong> Understand what's working and optimize accordingly</span>
                </li>
              </ul>
            </div>

            {/* 2. AI Chatbot */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">AI-Powered Business Chatbot</h3>
                  <p className="text-muted-foreground">
                    Engage customers 24/7 with intelligent, context-aware responses
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Instant Customer Support:</strong> Answer FAQs automatically without human intervention</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Conversational AI:</strong> Uses OpenAI GPT-4 to have natural, helpful conversations</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Custom Training:</strong> Train the chatbot with your business info, hours, services, and policies</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Lead Qualification:</strong> Automatically qualify and categorize incoming inquiries</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Conversation History:</strong> Review chat transcripts to understand customer needs better</span>
                </li>
              </ul>
            </div>

            {/* 3. Message Inbox */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Message Inbox & Communication Hub</h3>
                  <p className="text-muted-foreground">
                    Manage all customer conversations in one centralized location
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Unified Inbox:</strong> All form submissions, inquiries, and messages in one dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Message Status Tracking:</strong> Mark messages as read, archived, or priority</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Customer Info:</strong> See sender details and message history at a glance</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Quick Response:</strong> Reply directly to customers without leaving the dashboard</span>
                </li>
              </ul>
            </div>

            {/* 4. Form Builder */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Custom Form Builder</h3>
                  <p className="text-muted-foreground">
                    Create branded forms without any coding
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Drag & Drop Builder:</strong> No coding needed — create forms visually</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Multiple Field Types:</strong> Text, email, phone, textarea, select dropdowns, and more</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Branded Forms:</strong> Match your business colors and style</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Lead Capture:</strong> Automatically save all submissions to your inbox</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Mobile Responsive:</strong> Forms look great on all devices</span>
                </li>
              </ul>
            </div>

            {/* 5. Team Management */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Team Member & Affiliate Management</h3>
                  <p className="text-muted-foreground">
                    Invite staff and manage permissions
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Add Team Members:</strong> Invite staff to help manage your business profile</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Role-Based Access:</strong> Control what each team member can see and edit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Affiliate Program:</strong> Partner with resellers and track their activity</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Activity Logs:</strong> See who made changes and when</span>
                </li>
              </ul>
            </div>

            {/* 6. Review Management */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Review Management & Reputation</h3>
                  <p className="text-muted-foreground">
                    Build trust and manage your online reputation
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Review Dashboard:</strong> See all customer reviews in one place</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Rating Aggregation:</strong> Your average rating and review count displayed prominently</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Verified Business Badge:</strong> Show customers your business is legitimate and verified</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Reputation Building:</strong> Encourage satisfied customers to leave reviews</span>
                </li>
              </ul>
            </div>

            {/* 7. Media Library */}
            <div className="mb-12 bg-white border border-border rounded-2xl p-8 md:p-10 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Media Library & Asset Management</h3>
                  <p className="text-muted-foreground">
                    Organize and showcase your business visuals
                  </p>
                </div>
              </div>
              <ul className="space-y-3 ml-16">
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Logo Upload:</strong> Add your business logo for instant brand recognition</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Cover Image:</strong> Set a professional cover photo for your business page</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Photo Gallery:</strong> Upload multiple images showcasing your products and services</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>AI Image Generation:</strong> Generate professional photos to fill gaps in your gallery</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-secondary mt-1">→</span>
                  <span><strong>Image Organization:</strong> Tag and organize your media library for easy access</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 py-16 md:py-20 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-foreground">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of Puerto Rican businesses already using Spotlight to attract customers, manage reviews, and grow their presence online.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/list-your-business">
                <Button size="lg" className="gap-2">
                  Get Started Now <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="mailto:info@spotlightpr.com">
                <Button size="lg" variant="outline">
                  Have Questions? Contact Us
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
