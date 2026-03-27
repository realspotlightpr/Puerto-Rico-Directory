import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle, ChevronRight, Zap, Code, Share2, TrendingUp,
  Clock, Users, Briefcase, Sparkles, ArrowRight,
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

const SERVICES = [
  {
    icon: <Code className="w-8 h-8 text-primary" />,
    title: "Website Design & Development",
    desc: "Custom, conversion-focused websites that make your business look credible and generate leads.",
    features: [
      "Professional custom design",
      "Mobile-first responsive",
      "Built for conversions",
      "Fast loading & SEO ready",
    ],
    price: "Starting at $1,200",
  },
  {
    icon: <Share2 className="w-8 h-8 text-primary" />,
    title: "Social Media Management",
    desc: "Consistent, strategic content that keeps your business active, professional, and top of mind.",
    features: [
      "Monthly content planning",
      "Daily posting & engagement",
      "Community management",
      "Performance tracking",
    ],
    price: "Starting at $495/month",
  },
];

const BENEFITS = [
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: "More Leads",
    desc: "A professional online presence turns visitors into customers.",
  },
  {
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    title: "Build Credibility",
    desc: "Stand out from competition and build trust with your audience.",
  },
  {
    icon: <Clock className="w-6 h-6 text-primary" />,
    title: "Save Time",
    desc: "Let us handle the technical work while you focus on your business.",
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: "Stronger Presence",
    desc: "Be visible where your customers are looking for services.",
  },
];

const PROCESS = [
  {
    num: "01",
    title: "Let's Talk",
    desc: "We understand your goals, business, and what success looks like for you.",
  },
  {
    num: "02",
    title: "We Plan",
    desc: "We create a custom strategy tailored to your business needs and budget.",
  },
  {
    num: "03",
    title: "We Build",
    desc: "Our team delivers high-quality work with clear timelines and communication.",
  },
  {
    num: "04",
    title: "You Grow",
    desc: "You get results — more leads, visibility, and a stronger online presence.",
  },
];

export default function AdditionalServices() {
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
              <Briefcase className="w-3.5 h-3.5 text-orange-300" /> Professional Services for PR Businesses
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6 text-white"
          >
            Grow Your Business with{" "}
            <span className="text-orange-400">Professional Services</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto"
          >
            Build a credible online presence and reach more customers with website design and social media management tailored to your business.
          </motion.p>
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#services" className="inline-block">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-12 py-6 shadow-xl shadow-orange-900/40 text-lg font-bold ring-4 ring-orange-400/30">
                Explore Services
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <a href="#contact" className="inline-block">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 text-base bg-transparent">
                Get in Touch
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Services ──────────────────────────────────────── */}
      <section id="services" className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              Services Built for Your Success
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We offer the services your business needs to thrive online and reach more customers.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SERVICES.map((service, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2}
                className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-8 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  {service.icon}
                </div>
                <h3 className="font-bold text-xl font-display mb-3">{service.title}</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">{service.desc}</p>
                <ul className="space-y-3 mb-8">
                  {service.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-2xl font-bold font-display text-primary mb-4">{service.price}</p>
                <a href="#contact" className="inline-block">
                  <Button className="w-full rounded-xl gap-2">
                    Get Started
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Work With Us ──────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              Why Businesses Choose Us
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2}
                className="bg-white rounded-xl p-6 border border-border shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-bold font-display mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground text-sm">{benefit.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ───────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-14">
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-3xl md:text-4xl font-display font-bold mb-4">
              How We Work
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
              className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Simple, transparent, and results-focused. Here's how we help you succeed.
            </motion.p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS.map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2}
                className="relative flex flex-col items-start"
              >
                {i < PROCESS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px border-t-2 border-dashed border-primary/30" />
                )}
                <div className="relative z-10 w-12 h-12 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center mb-4 shadow-md">
                  {step.num}
                </div>
                <h3 className="font-bold text-base font-display mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ───────────────────────────────────── */}
      <section id="contact" className="py-20 bg-gradient-to-r from-teal-800 to-emerald-800 text-white">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <motion.h2
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-3xl md:text-4xl font-display font-bold mb-4"
          >
            Ready to Get Started?
          </motion.h2>
          <motion.p
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
            className="text-white/80 text-lg mb-10 max-w-2xl mx-auto"
          >
            Let's discuss how we can help your business grow. Reach out today and we'll create a plan tailored to your goals.
          </motion.p>
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a href="mailto:info@spotlightpuertorico.com" className="inline-block">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-8 text-base font-semibold shadow-lg shadow-orange-900/40">
                Contact Us
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
            <Link href="/">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 text-base bg-transparent">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
