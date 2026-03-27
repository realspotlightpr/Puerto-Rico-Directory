import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Star, MapPin, BarChart2, MessageSquare, CheckCircle, TrendingUp,
  Users, Zap, Shield, Globe, ChevronRight, Building2, Eye, ThumbsUp,
  Phone, Clock, Rocket, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const FEATURES = [
  {
    icon: <MapPin className="w-7 h-7 text-primary" />,
    title: "Hyper-Local Reach",
    desc: "Appear in front of customers across all 78 Puerto Rico municipalities who are actively searching for what you offer.",
  },
  {
    icon: <Star className="w-7 h-7 text-primary" />,
    title: "Verified Customer Reviews",
    desc: "Build an authentic reputation with real reviews from your customers — the #1 driver of trust and new business.",
  },
  {
    icon: <Eye className="w-7 h-7 text-primary" />,
    title: "Featured Listings",
    desc: "Rise to the top of search results and category pages so your business gets seen before the competition.",
  },
  {
    icon: <BarChart2 className="w-7 h-7 text-primary" />,
    title: "Owner Dashboard",
    desc: "Manage your listing, track how many people are finding your business, and keep your info always up to date.",
  },
  {
    icon: <MessageSquare className="w-7 h-7 text-primary" />,
    title: "Community Engagement",
    desc: "Connect directly with the local community — respond to reviews and build long-lasting customer relationships.",
  },
  {
    icon: <Shield className="w-7 h-7 text-primary" />,
    title: "Admin-Verified Listings",
    desc: "Every business goes through our review process so customers know they can trust what they find on Spotlight PR.",
  },
];

const STEPS = [
  {
    num: "01",
    icon: <Building2 className="w-8 h-8 text-primary" />,
    title: "Create Your Account",
    desc: "Sign up for free in seconds. All you need is an email address to get started.",
  },
  {
    num: "02",
    icon: <Globe className="w-8 h-8 text-primary" />,
    title: "Submit Your Listing",
    desc: "Fill in your business details — name, category, location, contact info, and a description that sells.",
  },
  {
    num: "03",
    icon: <CheckCircle className="w-8 h-8 text-primary" />,
    title: "Get Approved",
    desc: "Our team reviews your submission quickly to ensure quality. Most listings go live within 24 hours.",
  },
  {
    num: "04",
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    title: "Start Growing",
    desc: "You're live! Customers across Puerto Rico can now discover you, read reviews, and reach out directly.",
  },
];

const STATS = [
  { value: "78", label: "Municipalities Covered", icon: <MapPin className="w-5 h-5" /> },
  { value: "Free", label: "To List Your Business", icon: <Zap className="w-5 h-5" /> },
  { value: "100%", label: "Puerto Rico Focused", icon: <ThumbsUp className="w-5 h-5" /> },
  { value: "24h", label: "Average Approval Time", icon: <CheckCircle className="w-5 h-5" /> },
];

const FAQS = [
  {
    q: "Is it free to list my business?",
    a: "Yes! Submitting and maintaining your listing on Spotlight Puerto Rico is completely free. We believe every local business deserves visibility.",
  },
  {
    q: "How long does approval take?",
    a: "Our team typically reviews and approves new listings within 24 hours. You'll get access to your owner dashboard as soon as your listing goes live.",
  },
  {
    q: "Who can leave reviews on my listing?",
    a: "Any registered user of Spotlight Puerto Rico can leave a review. Our system is designed to keep reviews authentic and trustworthy.",
  },
  {
    q: "Can I update my listing after it's approved?",
    a: "Absolutely. From your owner dashboard you can update your business description, contact information, hours, photos, and more at any time.",
  },
  {
    q: "What types of businesses can be listed?",
    a: "Any legitimate business operating in Puerto Rico is welcome — restaurants, retail shops, professional services, health & beauty, tourism, and much more.",
  },
];

export default function ForBusiness() {
  const { isAuthenticated, openAuthModal } = useAuth();

  return (
    <div className="w-full">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 text-white py-24 lg:py-36">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 80% 20%, #14b8a6 0%, transparent 50%)" }}
        />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <Zap className="w-3.5 h-3.5 text-orange-300" /> Built for Puerto Rico Business Owners
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6"
          >
            Put Your Business on the{" "}
            <span className="text-orange-400">Spotlight</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto"
          >
            Spotlight Puerto Rico is the premier local business directory connecting thousands of customers across all 78 municipalities with the best local businesses on the island.
          </motion.p>
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/list-your-business">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-12 py-6 shadow-xl shadow-orange-900/40 text-lg font-bold ring-4 ring-orange-400/30">
                List Your Business for Free
                <Rocket className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────── */}
      <section className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="flex flex-col items-center text-center gap-1"
              >
                <div className="flex items-center gap-2 text-primary mb-1">{s.icon}</div>
                <p className="text-3xl font-display font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything You Need to Get Found
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From your first listing to growing a loyal local following — Spotlight PR has the tools to help your business thrive.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5}
                className="bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg font-display mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              Up & Running in Minutes
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-muted-foreground text-lg max-w-xl mx-auto">
              Getting your business on Spotlight Puerto Rico is quick, simple, and completely free.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5}
                className="relative flex flex-col items-center text-center"
              >
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px border-t-2 border-dashed border-primary/20" />
                )}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-white">
                  {s.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow">{i + 1}</span>
                </div>
                <h3 className="font-bold text-base font-display mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why PR Businesses Need This ───────────────────── */}
      <section className="py-20 bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 leading-tight">
                Puerto Rico's Customers Are Looking for You Online
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Over 90% of consumers search online before visiting a local business. Without a strong online presence, you're invisible to potential customers who are ready to buy right now.
              </p>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Spotlight Puerto Rico gives you a trusted, locally-focused platform to showcase your business — not buried among mainland directories, but front and center for the community that matters most to you.
              </p>
              <ul className="space-y-3">
                {[
                  "100% focused on Puerto Rico — no mainland noise",
                  "Customers actively searching for local businesses",
                  "Build credibility with verified reviews",
                  "Free to get started — no credit card required",
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="bg-white rounded-2xl shadow-xl border border-border p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold font-display text-lg">Ready to grow?</p>
                  <p className="text-sm text-muted-foreground">Join the local business community</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                {[
                  { icon: <Star className="w-4 h-4 text-amber-500" />, text: "Collect trusted customer reviews" },
                  { icon: <MapPin className="w-4 h-4 text-primary" />, text: "Appear in local municipality searches" },
                  { icon: <BarChart2 className="w-4 h-4 text-primary" />, text: "Manage your listing anytime" },
                  { icon: <Phone className="w-4 h-4 text-primary" />, text: "Let customers contact you directly" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-border flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
              <Link href="/list-your-business">
                <Button className="w-full rounded-xl text-base py-5 shadow-lg shadow-primary/20">
                  List My Business — Free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground mt-3">No credit card required · Approval within 24h</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why Start with Free Listing ────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              Get Found By Customers Today — Completely Free
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-muted-foreground text-lg max-w-3xl mx-auto">
              No hidden fees. No credit card required. No long-term commitments. Just instant visibility across Puerto Rico.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: <Rocket className="w-8 h-8 text-orange-500" />,
                title: "Instant Visibility",
                desc: "Go live within 24 hours. Your business appears in search results across all 78 municipalities."
              },
              {
                icon: <Users className="w-8 h-8 text-orange-500" />,
                title: "Real Customer Connections",
                desc: "Connect directly with customers who are actively searching for your type of business."
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-orange-500" />,
                title: "Track Your Impact",
                desc: "See how many people view your listing, click your website, and reach out directly."
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.3}
                className="bg-white rounded-2xl border border-border p-8 shadow-sm hover:shadow-md transition-shadow text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-bold text-lg font-display mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/list-your-business">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-10 py-6 text-lg font-semibold shadow-lg shadow-orange-900/30">
                List Your Business Now
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              Frequently Asked Questions
            </motion.h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.3}
                className="bg-gray-50 rounded-2xl p-6 border border-border"
              >
                <h3 className="font-bold text-base font-display mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Plans ──────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
                <Award className="w-3.5 h-3.5 text-orange-300" /> Ready to Grow Faster?
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-3xl md:text-4xl font-display font-bold leading-tight mb-4"
            >
              Upgrade to Premium Features
            </motion.h2>
            <motion.p
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2}
              className="text-white/80 text-lg max-w-2xl mx-auto"
            >
              Your free listing gets you discovered. Our paid plans help you dominate your market with AI tools, ads, and dedicated support.
            </motion.p>
          </div>

          {/* Growth Plans */}
          <div className="max-w-3xl mx-auto">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wide text-center mb-6">Optional Premium Features</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  price: "$147",
                  title: "Starter Growth",
                  tagline: "Everything you need to build a strong local presence and manage your reputation online.",
                  features: [
                    "Full CRM tool to manage your customer relationships",
                    "Advanced Spotlight Business Page features",
                    "Reputation management dashboard",
                    "Priority listing in search results",
                    "Access to customer review analytics",
                  ],
                  highlighted: false,
                },
                {
                  price: "$297",
                  title: "Growth Pro",
                  tagline: "Everything in Starter Growth, plus cutting-edge AI tools to automate and accelerate your growth.",
                  features: [
                    "Everything in the Starter Growth plan",
                    "AI-powered tools for content & customer engagement",
                    "AI automations to save time and drive conversions",
                    "Smart lead follow-up sequences",
                    "Monthly performance reports",
                  ],
                  highlighted: true,
                  badge: "Most Popular",
                },
              ].map((plan, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2}
                  className={`relative flex flex-col rounded-xl border p-5 ${
                    plan.highlighted
                      ? "border-orange-400 bg-gradient-to-b from-orange-500/20 to-orange-600/10 ring-2 ring-orange-400/30"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow text-nowrap">
                      <Star className="w-2.5 h-2.5" /> {plan.badge}
                    </span>
                  )}
                  <div className="mb-4">
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">{plan.title}</p>
                    <div className="flex items-end gap-1 mb-1.5">
                      <span className="text-3xl font-display font-bold text-white">{plan.price}</span>
                      <span className="text-white/60 text-xs mb-0.5">/mo</span>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{plan.tagline}</p>
                  </div>
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-white/90">
                        <CheckCircle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/list-your-business">
                    <Button
                      className={`w-full rounded-xl text-sm font-semibold py-2.5 ${
                        plan.highlighted
                          ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-900/30"
                          : "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                      }`}
                    >
                      Get Started
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3}
            className="text-center mt-8"
          >
            <p className="text-white/60 text-sm mb-4">Want premium features?</p>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 text-base bg-transparent"
              onClick={() => window.open("/advertise-with-us", "_blank")}
            >
              View All Plans
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
