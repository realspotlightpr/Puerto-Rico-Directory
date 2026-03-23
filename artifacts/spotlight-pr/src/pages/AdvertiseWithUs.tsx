import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle, ChevronRight, Zap, TrendingUp, Megaphone,
  BarChart2, Bot, Star, Globe, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

interface PricingCardProps {
  price: string;
  period?: string;
  title: string;
  tagline: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
  delay?: number;
}

function PricingCard({
  price,
  period = "/mo",
  title,
  tagline,
  features,
  cta,
  ctaHref,
  highlighted = false,
  badge,
  delay = 0,
}: PricingCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={delay}
      className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-shadow hover:shadow-lg ${
        highlighted
          ? "border-primary bg-gradient-to-b from-teal-50 to-emerald-50 ring-2 ring-primary/30"
          : "border-border bg-white"
      }`}
    >
      {badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
          <Star className="w-3 h-3" /> {badge}
        </span>
      )}

      <div className="mb-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-1">{title}</p>
        <div className="flex items-end gap-1 mb-2">
          <span className="text-4xl font-display font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground text-sm mb-1">{period}</span>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">{tagline}</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-foreground">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link href={ctaHref}>
        <Button
          className={`w-full rounded-xl text-base font-semibold py-5 ${
            highlighted
              ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-900/30"
              : "bg-primary hover:bg-primary/90 text-white"
          }`}
        >
          {cta}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </motion.div>
  );
}

const GROWTH_PLANS: PricingCardProps[] = [
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
    cta: "Get Started",
    ctaHref: "/list-your-business",
    delay: 0,
  },
  {
    price: "$297",
    title: "Growth Pro",
    tagline: "Everything in Starter Growth, plus cutting-edge AI tools to automate and accelerate your growth.",
    features: [
      "Everything in the $147 Starter Growth plan",
      "AI-powered tools for content & customer engagement",
      "AI automations to save time and drive conversions",
      "Smart lead follow-up sequences",
      "Monthly performance reports",
    ],
    cta: "Get Started",
    ctaHref: "/list-your-business",
    highlighted: true,
    badge: "Most Popular",
    delay: 1,
  },
];

const DOMINATE_PLANS: PricingCardProps[] = [
  {
    price: "$495",
    title: "Area Dominator",
    tagline: "Paid advertising promotion paired with full social media management — your brand everywhere your customers are.",
    features: [
      "Spotlight Business Page paid ads promotion",
      "Full social media management (posting, scheduling, engagement)",
      "Targeted local ad campaigns across Puerto Rico",
      "Monthly creative assets & copy",
      "Dedicated account support",
    ],
    cta: "Contact Us",
    ctaHref: "/list-your-business",
    delay: 0,
  },
  {
    price: "$1,200",
    title: "Market Leader",
    tagline: "The flagship package — included ad spend, premium positioning, and everything we offer to make you the #1 business in your area.",
    features: [
      "Everything in Area Dominator",
      "Included monthly ad spend budget",
      "Premium homepage and category placement",
      "Dedicated account manager",
      "Advanced analytics & competitor tracking",
      "Custom landing page creation",
    ],
    cta: "Contact Us",
    ctaHref: "/list-your-business",
    highlighted: true,
    badge: "Premium",
    delay: 1,
  },
];

export default function AdvertiseWithUs() {
  return (
    <div className="w-full">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-900 text-white py-24 lg:py-36">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 80% 20%, #14b8a6 0%, transparent 50%)",
          }}
        />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <Megaphone className="w-3.5 h-3.5 text-orange-300" /> Advertising Plans for Puerto Rico Businesses
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6"
          >
            Grow Faster with{" "}
            <span className="text-orange-400">Spotlight Ads</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto"
          >
            Choose a plan that fits your ambition. From building your online presence to dominating your local market — we have the tools, reach, and team to make it happen.
          </motion.p>
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#growth">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-8 shadow-lg shadow-orange-900/40 text-base font-semibold">
                See Our Plans
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <Link href="/list-your-business">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 text-base bg-transparent">
                List Your Business Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Why Advertise ─────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: <Globe className="w-7 h-7 text-primary" />,
                title: "Hyper-Local Reach",
                desc: "Put your business in front of customers actively searching across all 78 Puerto Rico municipalities.",
              },
              {
                icon: <TrendingUp className="w-7 h-7 text-primary" />,
                title: "Measurable Growth",
                desc: "Track views, clicks, leads, and conversions with clear reporting every month.",
              },
              {
                icon: <Bot className="w-7 h-7 text-primary" />,
                title: "AI-Powered Advantage",
                desc: "Unlock automations and AI tools that save time and turn leads into loyal customers.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5}
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="font-display font-bold text-base">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Growth Section ────────────────────────────────── */}
      <section id="growth" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <BarChart2 className="w-4 h-4" /> Growth Plans
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-3xl md:text-4xl font-display font-bold mb-4"
            >
              Build Your Presence & Reputation
            </motion.h2>
            <motion.p
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Start strong with tools for CRM, advanced listing features, and reputation management — then supercharge everything with AI.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {GROWTH_PLANS.map((plan, i) => (
              <PricingCard key={i} {...plan} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Dominate Your Area Section ────────────────────── */}
      <section id="dominate" className="py-20 bg-gradient-to-br from-teal-50 to-emerald-50 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                <Zap className="w-4 h-4" /> Dominate Your Area
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-3xl md:text-4xl font-display font-bold mb-4"
            >
              Become the #1 Business in Your Area
            </motion.h2>
            <motion.p
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2}
              className="text-muted-foreground text-lg max-w-2xl mx-auto"
            >
              Paid ads, social media management, and premium placement — everything it takes to own your local market in Puerto Rico.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {DOMINATE_PLANS.map((plan, i) => (
              <PricingCard key={i} {...plan} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-teal-800 to-emerald-800 text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-orange-300" />
            </div>
          </motion.div>
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            className="text-3xl md:text-4xl font-display font-bold mb-4"
          >
            Not Sure Which Plan Is Right for You?
          </motion.h2>
          <motion.p
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2}
            className="text-white/80 text-lg mb-10"
          >
            Our team is happy to walk you through your options and build a custom strategy for your business. Reach out and let's talk.
          </motion.p>
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/list-your-business">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-8 text-base font-semibold shadow-lg shadow-orange-900/40">
                Get Started Today
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/business">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 text-base bg-transparent">
                Learn More About Spotlight PR
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
