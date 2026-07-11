import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Check, X, Star, TrendingUp, Instagram, MapPin, Eye, Clock,
  ShieldCheck, Zap, ArrowRight, Rocket, Users, BadgeCheck, Sparkles, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CHECKOUT = "https://login.spotlightpuertorico.com/payment-link/6a47d1efa655fa0b802a28f0";
const go = () => window.open(CHECKOUT, "_blank");

function CTA({ label = "Get Promoted — $29 / 3 months", className = "" }: { label?: string; className?: string }) {
  return (
    <Button
      onClick={go}
      className={"rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-900/30 " + className}
    >
      {label}
      <ArrowRight className="w-4 h-4 ml-1.5" />
    </Button>
  );
}

const STACK = [
  { icon: <Eye className="w-5 h-5 text-orange-500" />, title: "Featured placement across the site", desc: "Your business shows up first — on the homepage and at the top of your category — so locals and tourists find you before the competition.", value: "$60/mo value" },
  { icon: <Instagram className="w-5 h-5 text-orange-500" />, title: "A monthly Instagram feature", desc: "One promotional reel every month on our @spotlightpromopr page. A single feature can put you in front of thousands of people in Puerto Rico.", value: "$150 value" },
  { icon: <TrendingUp className="w-5 h-5 text-orange-500" />, title: "More views, calls & clicks", desc: "Built to drive real attention — more profile views, more phone calls, and more clicks to your website or menu.", value: "Priceless" },
  { icon: <Users className="w-5 h-5 text-orange-500" />, title: "Premium business community", desc: "Serious networking with local owners and founders, plus members-only events. Normally $49/mo — included free.", value: "$49/mo value" },
  { icon: <BadgeCheck className="w-5 h-5 text-orange-500" />, title: "Premium listing tools", desc: "Add your menu, extra photos, and higher customization so your page actually sells for you.", value: "$20/mo value" },
];

const COMPARE = [
  { label: "Listed in the directory", free: true, promo: true },
  { label: "Owner dashboard & analytics", free: true, promo: true },
  { label: "Collect customer reviews", free: true, promo: true },
  { label: "Featured on the homepage & category top", free: false, promo: true },
  { label: "Monthly Instagram reel feature", free: false, promo: true },
  { label: "Menu, extra photos & customization", free: false, promo: true },
  { label: "Members-only community & events", free: false, promo: true },
];

const FAQS = [
  { q: "Is it really just $29?", a: "Yes — $29 covers a full 3 months of promotion. That works out to under $10 a month. Your regular listing stays free forever." },
  { q: "What happens after 3 months?", a: "Your promotion renews automatically at the same $29 rate so your featured placement never lapses — no gap, no re-signing. You can turn off renewal anytime from your account." },
  { q: "How fast do I get featured?", a: "Your promotion goes live within 24 hours of signing up." },
  { q: "Do I need a website or a big following?", a: "No. We do the promoting for you — the featured placement and the Instagram reel bring people to your Spotlight page and straight to your phone." },
  { q: "What kind of businesses is this for?", a: "Any legitimate business in Puerto Rico — restaurants, shops, salons, services, tourism, and more. If locals and visitors would want to find you, this works." },
  { q: "Can I cancel?", a: "You can turn off auto-renewal anytime so you won't be billed for the next term. Your promotion stays active through the period you've paid for. Payments already made aren't refundable." },
];

export default function GetPromoted() {
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > 520);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="w-full">

      {/* Sticky claim bar */}
      <div className={"fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 " + (showBar ? "translate-y-0" : "translate-y-full")}>
        <div className="bg-slate-900/95 backdrop-blur border-t border-white/10 px-4 py-3">
          <div className="container mx-auto max-w-4xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-bold text-sm sm:text-base leading-tight">Get featured across Puerto Rico</p>
              <p className="text-white/60 text-xs">
                <span className="line-through">$87</span> <span className="text-emerald-400 font-semibold">$29 / 3 months</span> · launch price
              </p>
            </div>
            <CTA label="Claim $29 offer" className="px-4 py-3 text-sm shrink-0" />
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden text-white py-20 lg:py-28">
        <div className="absolute inset-0" style={{ backgroundImage: "url(/images/hero-business-bg.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-black/90" />
        <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 text-orange-300" /> For Puerto Rico business owners
          </span>
          <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-5">
            Get your business in front of <span className="text-orange-400">thousands</span> of locals & tourists
          </h1>
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            For less than <span className="font-bold text-white">$10 a month</span>, Spotlight Puerto Rico features you across the island — on our site and on Instagram — so the right customers find you first.
          </p>
          <div className="flex items-end justify-center gap-2 mb-2">
            <span className="text-white/40 text-2xl font-display line-through mb-1.5">$87</span>
            <span className="text-6xl font-display font-bold text-white">$29</span>
            <span className="text-white/70 text-lg mb-2">/ 3 months</span>
          </div>
          <p className="text-emerald-300 text-sm font-semibold mb-8">Limited-time launch price — save $58</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTA className="px-10 py-6 text-lg" />
          </div>
          <p className="text-white/50 text-xs mt-4 flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> 100% Puerto Rico focused</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Featured within 24 hours</span>
            <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Cancel renewal anytime</span>
          </p>
        </div>
      </section>

      {/* Problem / agitate */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">Your next customers are searching right now</h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Over 90% of people check online before they visit a local business. If they can't find you — or they find your competitor first — that sale is gone. Word of mouth is great, but it can only reach so far.
          </p>
          <p className="text-foreground text-lg font-semibold">
            Spotlight puts you where locals and tourists are already looking — and keeps you there.
          </p>
        </div>
      </section>

      {/* Offer stack */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Everything you get for $29</h2>
            <p className="text-muted-foreground text-lg">One flat price. Three full months of getting found.</p>
          </div>
          <div className="space-y-4">
            {STACK.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border shadow-sm p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">{s.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold font-display">{s.title}</h3>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5 shrink-0 hidden sm:inline">{s.value}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-center text-white">
            <p className="text-white/70 text-sm">Real value over 3 months</p>
            <p className="text-3xl font-display font-bold line-through decoration-orange-400/70 decoration-2">$450+</p>
            <p className="text-white/80 mt-2">Your launch price today</p>
            <p className="text-5xl font-display font-bold text-orange-400 mb-5">$29</p>
            <CTA className="px-8 py-5 text-base" />
          </div>
        </div>
      </section>

      {/* Instagram spotlight */}
      <section className="py-20 bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <Instagram className="w-10 h-10 mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">A reel just for your business — every month</h2>
          <p className="text-white/90 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
            Every month we produce and post a promotional reel featuring your business on <span className="font-bold">@spotlightpromopr</span>. One good feature can reach thousands of people across Puerto Rico — the kind of exposure that usually costs hundreds to buy.
          </p>
          <CTA label="Feature my business — $29" className="px-8 py-5 text-base bg-white text-slate-900 hover:bg-white/90 shadow-lg" />
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Free vs. Promoted</h2>
            <p className="text-muted-foreground text-lg">Listing is always free. Promoted is how you actually get found.</p>
          </div>
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto] bg-slate-900 text-white text-sm font-semibold">
              <div className="px-4 py-3">What you get</div>
              <div className="px-4 py-3 text-center w-20">Free</div>
              <div className="px-4 py-3 text-center w-24 bg-orange-500">Promoted</div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={i} className={"grid grid-cols-[1fr_auto_auto] items-center text-sm " + (i % 2 ? "bg-gray-50" : "bg-white")}>
                <div className="px-4 py-3 text-foreground">{row.label}</div>
                <div className="px-4 py-3 text-center w-20">{row.free ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />}</div>
                <div className="px-4 py-3 text-center w-24">{row.promo ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8"><CTA className="px-8 py-5 text-base" /></div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Up and featured in 24 hours</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Rocket className="w-7 h-7 text-orange-500" />, n: "1", t: "Claim the $29 offer", d: "Tap the button and check out securely. It takes about a minute." },
              { icon: <Sparkles className="w-7 h-7 text-orange-500" />, n: "2", t: "We feature you", d: "Within 24 hours you're featured across the site and queued for your Instagram reel." },
              { icon: <Phone className="w-7 h-7 text-orange-500" />, n: "3", t: "Customers reach out", d: "Locals and tourists discover you, view your page, and contact you directly." },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center relative">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">{s.icon}</div>
                <span className="absolute top-4 right-5 text-4xl font-display font-bold text-orange-100">{s.n}</span>
                <h3 className="font-bold font-display mb-2">{s.t}</h3>
                <p className="text-muted-foreground text-sm">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-2xl font-display font-bold mb-3">One price. Island-wide exposure.</h2>
            <p className="text-foreground/80 leading-relaxed">
              $29 covers 3 full months of promotion — featured placement across the site plus a monthly Instagram reel that can reach thousands. It renews automatically so you never lose your spot, and your free listing stays live no matter what.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-display font-bold">Questions? Answered.</h2></div>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-border">
                <h3 className="font-bold font-display mb-2">{f.q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-24 text-white text-center">
        <div className="absolute inset-0" style={{ backgroundImage: "url(/images/hero-business-bg.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/90 to-slate-950/90" />
        <div className="container mx-auto px-4 relative z-10 max-w-2xl">
          <MapPin className="w-9 h-9 mx-auto mb-4 text-orange-200" />
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-5">Get found across Puerto Rico today</h2>
          <p className="text-white/85 text-lg mb-2">Launch pricing won't last. Lock in 3 months of promotion for one flat $29.</p>
          <div className="flex items-end justify-center gap-2 my-6">
            <span className="text-white/40 text-xl font-display line-through mb-1">$87</span>
            <span className="text-5xl font-display font-bold">$29</span>
            <span className="text-white/70 mb-1.5">/ 3 months</span>
          </div>
          <CTA className="px-12 py-6 text-lg" />
          <p className="text-white/60 text-sm mt-5">
            Prefer to talk to a person first?{" "}
            <Link href="/advertise"><span className="underline hover:text-white cursor-pointer">Talk to a rep</span></Link>.
          </p>
        </div>
      </section>

      <div className="h-20 md:h-0" />
    </div>
  );
}
