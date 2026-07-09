import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Anchor, DollarSign, Compass, CalendarCheck, Megaphone, ShieldCheck,
  Users, Sparkles, ArrowRight, CheckCircle, Rocket, MapPin, MessageSquare,
} from "lucide-react";

const BENEFITS = [
  { icon: DollarSign, title: "Keep 90% of every booking", desc: "Listing is free. Spotlight keeps a flat 10% service fee on completed bookings — no monthly cost, no hidden fees." },
  { icon: MapPin, title: "Reach travelers & locals", desc: "Get in front of thousands of people discovering Puerto Rico across all 78 municipalities, every day." },
  { icon: Compass, title: "Your own guide profile & experiences", desc: "Build a professional profile and list unlimited experiences — snorkel trips, hikes, cave tours, and more." },
  { icon: CalendarCheck, title: "Bookings on autopilot", desc: "Travelers request to book, you confirm the date. You stay in control of your schedule and your pricing." },
  { icon: Megaphone, title: "Built-in marketing & exposure", desc: "Featured placement, promo reels on our @spotlightpromopr Instagram, and a platform that markets you 24/7." },
  { icon: ShieldCheck, title: "A verified badge people trust", desc: "Earn a verified-guide badge so travelers book with confidence — trust that turns into more bookings." },
];

const STEPS = [
  { num: "01", icon: Rocket, title: "Sign up free", desc: "Create your account in seconds — all you need is your email and phone." },
  { num: "02", icon: Compass, title: "Build your profile & experiences", desc: "Tell travelers who you are, add photos, and list what you offer with your own prices." },
  { num: "03", icon: MessageSquare, title: "Get booking requests", desc: "You're notified by email and text the moment someone wants to book you." },
  { num: "04", icon: DollarSign, title: "Confirm & get paid", desc: "Confirm the date, host an amazing experience, and keep 90% of every booking." },
];

const STATS = [
  { value: "90%", label: "You keep per booking" },
  { value: "Free", label: "To join & list" },
  { value: "78", label: "Municipalities reached" },
  { value: "24/7", label: "We market you" },
];

export default function ForGuides() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden text-white bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 py-20 lg:py-28">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div className="relative container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Anchor className="w-4 h-4" /> For local guides
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5">Share what you love.<br /> Get paid for it.</h1>
          <p className="text-lg md:text-xl text-white/90 mb-9 max-w-2xl mx-auto">
            Turn your local knowledge into income. List your tours and experiences on Spotlight Puerto Rico, reach travelers and locals across the island, and keep 90% of every booking.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/guide"><Button size="lg" className="bg-white text-emerald-700 hover:bg-white/90 rounded-xl px-10 py-6 text-lg font-bold shadow-xl">Become a guide <ArrowRight className="w-5 h-5 ml-2" /></Button></Link>
            <a href="#how" className="text-white/90 hover:text-white font-semibold text-sm underline underline-offset-4">See how it works</a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-display font-bold text-emerald-600">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Why guide with Spotlight?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to run and grow your own experiences — with none of the overhead.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-emerald-600" /></div>
                <h3 className="font-display font-bold text-lg mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-slate-50 border-y border-border py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Start guiding in 4 steps</h2>
            <p className="text-muted-foreground text-lg">From sign-up to your first booking — it's simple.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative rounded-2xl bg-white border border-border p-6 shadow-sm">
                  <span className="absolute top-4 right-5 text-3xl font-display font-bold text-emerald-100">{s.num}</span>
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-white" /></div>
                  <h3 className="font-display font-bold mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 p-8 md:p-10 text-center">
          <Users className="w-10 h-10 text-teal-600 mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Join a real community</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-2">
            Guides on Spotlight get access to our premium Puerto Rico business community — serious networking with local owners and founders, plus members-only events.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-5 text-sm">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> No monthly fees</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> You set your prices</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Marketing included</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden text-white bg-gradient-to-r from-emerald-600 to-teal-700 py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-white/90" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Ready to start guiding?</h2>
          <p className="text-white/90 mb-8 text-lg">It's free to join. Build your first experience today and start taking bookings.</p>
          <Link href="/guide"><Button size="lg" className="bg-white text-emerald-700 hover:bg-white/90 rounded-xl px-10 py-6 text-lg font-bold shadow-xl">Become a guide <ArrowRight className="w-5 h-5 ml-2" /></Button></Link>
        </div>
      </section>
    </div>
  );
}
