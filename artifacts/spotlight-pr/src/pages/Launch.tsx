import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Store, Palmtree, Waves, Compass, Star, Heart, Globe, Search,
  ArrowRight, MapPin, Sparkles, BadgeCheck, Smartphone,
} from "lucide-react";

const TILES = [
  { href: "/directory", label: "Local Businesses", desc: "Shops, food, services & more", img: "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/24.jpg", grad: "from-blue-700 to-cyan-700" },
  { href: "/activities", label: "Places", desc: "Beaches, waterfalls, caves & bio bays", img: "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/1.jpg", grad: "from-teal-700 to-emerald-700" },
  { href: "/surf", label: "Surf Cams", desc: "Live spots & conditions", img: "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/7.jpg", grad: "from-cyan-800 to-blue-900" },
  { href: "/experiences", label: "Experiences", desc: "Book local guides & tours", img: "https://zswvumzbtikzvwgtpprw.supabase.co/storage/v1/object/public/business-media/places/18.jpg", grad: "from-emerald-700 to-teal-800" },
];

const BENEFITS = [
  { icon: Store, title: "Every local business, one place", desc: "Discover and support businesses across all 78 municipalities — with real info, hours, menus and photos." },
  { icon: MapPin, title: "Find hidden gems", desc: "The island's best beaches, waterfalls, caves, and bioluminescent bays — with maps and directions." },
  { icon: Waves, title: "Live surf cams", desc: "Check real-time conditions at surf spots before you go, powered by local camera partners." },
  { icon: Compass, title: "Book experiences with locals", desc: "Snorkel trips, hikes, cave tours and more — led by verified local guides who know the island." },
  { icon: Star, title: "Real reviews you can trust", desc: "See honest reviews from real users, and share your own to help others discover great spots." },
  { icon: Heart, title: "Save your favorites", desc: "Build your own list of places and businesses to visit — and never lose track of a great find." },
];

export default function Launch() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden text-white bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 py-20 lg:py-28">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 15% 25%, white 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div className="relative container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" /> 🇵🇷 Now live across Puerto Rico
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5">Puerto Rico,<br /> all in one place.</h1>
          <p className="text-lg md:text-xl text-white/90 mb-9 max-w-2xl mx-auto">
            Discover the best local businesses, hidden beaches, surf breaks, waterfalls, and guided experiences across the island — and book it all from your phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/directory"><Button size="lg" className="bg-white text-cyan-700 hover:bg-white/90 rounded-xl px-10 py-6 text-lg font-bold shadow-xl">Start exploring <Search className="w-5 h-5 ml-2" /></Button></Link>
            <Link href="/signup"><Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-xl px-8 py-6 text-lg bg-transparent">Create free account</Button></Link>
          </div>
        </div>
      </section>

      {/* Discovery tiles */}
      <section className="container mx-auto px-4 -mt-8 relative z-10 max-w-5xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href}>
              <div className="group relative cursor-pointer rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-full min-h-[120px]">
                <img src={t.img} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-br ${t.grad} opacity-75`} />
                <div className="relative p-5 text-white">
                  <p className="font-display font-bold leading-tight text-lg drop-shadow">{t.label}</p>
                  <p className="text-white/90 text-xs mt-0.5 drop-shadow">{t.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Everything the island has to offer</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Whether you live here or you're just visiting, Spotlight is your guide to Puerto Rico.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center mb-4"><Icon className="w-6 h-6 text-teal-600" /></div>
                <h3 className="font-display font-bold text-lg mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-slate-50 border-y border-border py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2"><BadgeCheck className="w-7 h-7 text-emerald-500" /><p className="font-semibold">100% free to use</p><p className="text-sm text-muted-foreground">No fees to browse, review, or save.</p></div>
            <div className="flex flex-col items-center gap-2"><Globe className="w-7 h-7 text-cyan-500" /><p className="font-semibold">English & Español</p><p className="text-sm text-muted-foreground">Switch languages anytime.</p></div>
            <div className="flex flex-col items-center gap-2"><Smartphone className="w-7 h-7 text-primary" /><p className="font-semibold">Built for your phone</p><p className="text-sm text-muted-foreground">Discover and book on the go.</p></div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden text-white bg-gradient-to-r from-teal-500 to-cyan-600 py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Palmtree className="w-8 h-8 mx-auto mb-4 text-white/90" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Start discovering Puerto Rico</h2>
          <p className="text-white/90 mb-8 text-lg">Join free and unlock the whole island — businesses, places, surf, and experiences.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup"><Button size="lg" className="bg-white text-cyan-700 hover:bg-white/90 rounded-xl px-10 py-6 text-lg font-bold shadow-xl">Create free account <ArrowRight className="w-5 h-5 ml-2" /></Button></Link>
            <Link href="/directory"><Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-xl px-8 py-6 text-lg bg-transparent">Browse first</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
