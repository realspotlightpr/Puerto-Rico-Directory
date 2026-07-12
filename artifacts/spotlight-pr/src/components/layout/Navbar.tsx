import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Menu, X, User as UserIcon, PlusCircle, LayoutDashboard,
  Shield, LogOut, Store, Star, ChevronDown, Compass, Waves,
  Palmtree, Megaphone, Crown, Anchor, Ticket, CalendarHeart, Sparkles, Bookmark, MessageCircle, ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function readLang(): "en" | "es" {
  try {
    const m = document.cookie.match(/googtrans=\/[a-z]+\/([a-z]+)/i);
    return m && m[1].toLowerCase() === "es" ? "es" : "en";
  } catch { return "en"; }
}
function setLang(lang: "en" | "es") {
  const host = window.location.hostname;
  const past = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  if (lang === "en") {
    document.cookie = `googtrans=;path=/;${past}`;
    document.cookie = `googtrans=;path=/;domain=${host};${past}`;
    document.cookie = `googtrans=;path=/;domain=.${host};${past}`;
  } else {
    const v = "/en/es";
    document.cookie = `googtrans=${v};path=/`;
    document.cookie = `googtrans=${v};path=/;domain=${host}`;
    document.cookie = `googtrans=${v};path=/;domain=.${host}`;
  }
  window.location.reload();
}
function LangToggle({ className = "" }: { className?: string }) {
  const current = typeof document !== "undefined" ? readLang() : "en";
  return (
    <div className={`inline-flex items-center rounded-full border border-border overflow-hidden text-xs font-semibold ${className}`}>
      <button type="button" onClick={() => setLang("en")} className={`px-2.5 py-1 transition-colors ${current === "en" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>EN</button>
      <button type="button" onClick={() => setLang("es")} className={`px-2.5 py-1 transition-colors ${current === "es" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>ES</button>
    </div>
  );
}

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"main" | "business">("main");

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "business_owner";
  const isUser = user?.role === "user";

  // Mega-menu groups (desktop)
  const megaGroups: {
    heading: string;
    items: { href: string; label: string; desc: string; icon: any; accent: string }[];
  }[] = [
    {
      heading: "Discover",
      items: [
        { href: "/directory", label: "Businesses", desc: "Shops, food & services", icon: Store, accent: "text-blue-600 bg-blue-50" },
        { href: "/activities", label: "Places", desc: "Beaches, caves, waterfalls", icon: Palmtree, accent: "text-teal-600 bg-teal-50" },
        { href: "/surf", label: "Surf Cams", desc: "Live spots & conditions", icon: Waves, accent: "text-cyan-600 bg-cyan-50" },
        { href: "/experiences", label: "Experiences", desc: "Book local guides", icon: Compass, accent: "text-emerald-600 bg-emerald-50" },
        { href: "/pass", label: "Spotlight Pass", desc: "Perks, discounts & credits", icon: Ticket, accent: "text-amber-600 bg-amber-50" },
        { href: "/date-builder", label: "Date & Trip Builder", desc: "Plan the perfect day", icon: CalendarHeart, accent: "text-rose-600 bg-rose-50" },
        { href: "/discover", label: "Swipe to Discover", desc: "Find spots you'll love", icon: Sparkles, accent: "text-fuchsia-600 bg-fuchsia-50" },
      ],
    },
    {
      heading: "For Business",
      items: [
        { href: "/list-your-business", label: "Add your business", desc: "List free in minutes", icon: PlusCircle, accent: "text-primary bg-primary/10" },
        { href: "/business", label: "Why Spotlight", desc: "Reach locals & visitors", icon: Store, accent: "text-indigo-600 bg-indigo-50" },
        { href: "/spotlight-plus", label: "Spotlight Plus", desc: "Featured placement & more", icon: Crown, accent: "text-amber-600 bg-amber-50" },
        { href: "/advertise", label: "Advertise", desc: "Feature your brand", icon: Megaphone, accent: "text-rose-600 bg-rose-50" },
      ],
    },
    {
      heading: "Guides & Community",
      items: [
        { href: "/for-guides", label: "Become a guide", desc: "Sell tours & experiences", icon: Anchor, accent: "text-emerald-700 bg-emerald-50" },
        { href: "/experiences", label: "Book a guide", desc: "Local-led adventures", icon: Compass, accent: "text-teal-700 bg-teal-50" },
        { href: "/influencers", label: "Creator Program", desc: "Earn by sharing Spotlight", icon: Megaphone, accent: "text-fuchsia-700 bg-fuchsia-50" },
      ],
    },
  ];

  // Admin shortcut — always visible in the top nav when logged in as admin
  const adminNavLinks = isAdmin
    ? [{ href: "/admin", label: "Admin" }]
    : [];

  const showAddBusinessNav = !isAuthenticated || isOwner || isAdmin;

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.username || "My Account";
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-border/40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Spotlight Puerto Rico"
            className="h-14 w-auto object-contain group-hover:scale-105 transition-transform"
            style={{ mixBlendMode: "multiply" }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              Home
            </Link>

            {/* Mega menu */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                Explore <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </button>
              {/* Panel */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-150">
                <div className="w-[640px] bg-white rounded-2xl shadow-2xl border border-border/60 p-5 grid grid-cols-3 gap-5">
                  {megaGroups.map((g) => (
                    <div key={g.heading}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2 px-1">{g.heading}</p>
                      <div className="flex flex-col gap-0.5">
                        {g.items.map((it, i) => (
                          <Link key={g.heading + i} href={it.href} className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted transition-colors">
                            <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${it.accent}`}>
                              <it.icon className="w-4 h-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-tight text-foreground">{it.label}</span>
                              <span className="block text-xs text-muted-foreground leading-tight mt-0.5">{it.desc}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {adminNavLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
                {link.label}
              </Link>
            ))}

            {showAddBusinessNav && (
              <Link href="/list-your-business">
                <Button variant="outline" className="gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                  <Store className="w-4 h-4" /> Add Business
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 border-l border-border/50 pl-6">
            <LangToggle />

            {isAuthenticated ? (
              <>
                {/* Business owner / admin quick add */}
                {(isOwner || isAdmin) && (
                  <Link href="/list-your-business">
                    <Button variant="outline" className="hidden lg:flex gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                      <PlusCircle className="w-4 h-4" /> Add Business
                    </Button>
                  </Link>
                )}

                {/* Avatar dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-muted border border-border p-0 overflow-hidden">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt={displayName} className="rounded-full object-cover w-full h-full" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{initials}</span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 mt-2 p-2 rounded-2xl shadow-xl">
                    <DropdownMenuLabel className="px-2 py-1.5">
                      <p className="font-semibold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{user?.email}</p>
                      <p className="text-xs text-primary font-normal capitalize mt-0.5">{user?.role?.replace("_", " ")}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <Link href="/saved"><DropdownMenuItem className="cursor-pointer rounded-lg gap-2"><Bookmark className="w-4 h-4" /> Saved</DropdownMenuItem></Link>
                    <Link href="/plans"><DropdownMenuItem className="cursor-pointer rounded-lg gap-2"><CalendarHeart className="w-4 h-4" /> My Plans</DropdownMenuItem></Link>
                    <Link href="/messages"><DropdownMenuItem className="cursor-pointer rounded-lg gap-2"><MessageCircle className="w-4 h-4" /> Messages</DropdownMenuItem></Link>
                    <Link href="/guide"><DropdownMenuItem className="cursor-pointer rounded-lg gap-2"><Compass className="w-4 h-4" /> Guide dashboard</DropdownMenuItem></Link>
                    <Link href="/influencer"><DropdownMenuItem className="cursor-pointer rounded-lg gap-2"><Megaphone className="w-4 h-4" /> Creator dashboard</DropdownMenuItem></Link>
                    <DropdownMenuSeparator />

                    {/* Role-based primary links */}
                    {(isOwner || isAdmin) && (
                      <Link href="/dashboard">
                        <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                          <LayoutDashboard className="w-4 h-4" /> My Listings
                        </DropdownMenuItem>
                      </Link>
                    )}

                    {isUser && (
                      <Link href="/profile">
                        <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                          <Star className="w-4 h-4" /> My Profile
                        </DropdownMenuItem>
                      </Link>
                    )}

                    {(isOwner || isAdmin) && (
                      <Link href="/list-your-business">
                        <DropdownMenuItem className="cursor-pointer rounded-lg gap-2 lg:hidden">
                          <PlusCircle className="w-4 h-4" /> Add Business
                        </DropdownMenuItem>
                      </Link>
                    )}

                    {isUser && (
                      <Link href="/directory">
                        <DropdownMenuItem className="cursor-pointer rounded-lg gap-2">
                          <Store className="w-4 h-4" /> Browse & Review
                        </DropdownMenuItem>
                      </Link>
                    )}

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <Link href="/admin">
                          <DropdownMenuItem className="cursor-pointer rounded-lg gap-2 text-purple-700 focus:text-purple-700 focus:bg-purple-50">
                            <Shield className="w-4 h-4" /> Admin Panel
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg gap-2 text-destructive focus:text-destructive focus:bg-destructive/5"
                      onClick={() => logout()}
                    >
                      <LogOut className="w-4 h-4" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button
                onClick={() => openAuthModal()}
                className="rounded-full px-6 shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Log in
              </Button>
            )}
          </div>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileView("main"); }}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full max-h-[calc(100dvh-4rem)] overflow-y-auto glass-panel border-b border-border shadow-xl p-4">
          <div key={mobileView} className={`flex flex-col gap-1 animate-in fade-in duration-200 ${mobileView === "business" ? "slide-in-from-right-4" : "slide-in-from-left-4"}`}>
            {mobileView === "main" ? (
              <>
                <div className="px-3 pb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Explore Puerto Rico</p>
                </div>
                {[
                  { href: "/discover", label: "Swipe to Discover", icon: Sparkles },
                  { href: "/directory", label: "Local Businesses", icon: Store },
                  { href: "/activities", label: "Places", icon: Palmtree },
                  { href: "/experiences", label: "Experiences", icon: Compass },
                  { href: "/date-builder", label: "Trip Builder", icon: CalendarHeart },
                  { href: "/pass", label: "Spotlight Pass", icon: Ticket },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className={`text-base font-medium p-3 rounded-xl hover:bg-muted flex items-center gap-3 ${location === link.href ? "text-primary bg-primary/5" : "text-foreground"}`} onClick={() => setMobileMenuOpen(false)}>
                    <link.icon className="w-5 h-5 text-primary" /> {link.label}
                  </Link>
                ))}

                <button type="button" onClick={() => setMobileView("business")} className="mt-2 text-left p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 to-amber-50 border border-primary/15 flex items-center gap-3 group">
                  <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center"><Store className="w-5 h-5" /></span>
                  <span className="flex-1">
                    <span className="block font-bold text-foreground">For Businesses</span>
                    <span className="block text-xs text-muted-foreground">List free or grow with Spotlight Plus</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-primary transition-transform group-hover:translate-x-1" />
                </button>

                <Link href="/influencers" className="text-sm font-medium p-3 rounded-xl hover:bg-muted flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <Megaphone className="w-5 h-5 text-fuchsia-600" /> Creator Program
                </Link>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setMobileView("main")} className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-muted-foreground hover:text-primary">
                  <ChevronLeft className="w-4 h-4" /> Back to explore
                </button>
                <div className="px-2 py-2">
                  <p className="font-display text-xl font-bold text-foreground">For Businesses</p>
                  <p className="text-sm text-muted-foreground">Start free, then grow when you’re ready.</p>
                </div>
                {megaGroups[1].items.map((item) => (
                  <Link key={item.href + item.label} href={item.href} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                    <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.accent}`}><item.icon className="w-5 h-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.desc}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 mt-3 text-muted-foreground" />
                  </Link>
                ))}
                <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                  <LayoutDashboard className="w-5 h-5 text-muted-foreground" /> <span className="font-semibold">Business dashboard</span>
                </Link>
              </>
            )}

          <div className="flex items-center justify-between px-3 py-2 mt-2 border-t border-border/50 pt-3">
            <span className="text-sm font-medium text-muted-foreground">Language</span>
            <LangToggle />
          </div>

          {isAuthenticated && (
            <>
              <div className="my-1 border-t border-border/50" />

              {/* User identity */}
              <div className="px-3 py-2">
                <p className="font-semibold text-sm text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
              </div>

              {(isOwner || isAdmin) && (
                <Link href="/dashboard" className="text-base font-medium p-3 rounded-xl hover:bg-muted flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <LayoutDashboard className="w-5 h-5 text-muted-foreground" /> My Listings
                </Link>
              )}

              {isUser && (
                <Link href="/profile" className="text-base font-medium p-3 rounded-xl hover:bg-muted flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <Star className="w-5 h-5 text-muted-foreground" /> My Profile
                </Link>
              )}

              {(isOwner || isAdmin) && (
                <Link href="/list-your-business" className="text-base font-medium p-3 rounded-xl hover:bg-muted flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <PlusCircle className="w-5 h-5 text-muted-foreground" /> Add Business
                </Link>
              )}

              {isAdmin && (
                <Link href="/admin" className="text-base font-medium p-3 rounded-xl hover:bg-purple-50 text-purple-700 flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <Shield className="w-5 h-5" /> Admin Panel
                </Link>
              )}

              <div className="my-1 border-t border-border/50" />
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="text-base font-medium p-3 rounded-xl text-destructive hover:bg-destructive/5 flex items-center gap-3 text-left"
              >
                <LogOut className="w-5 h-5" /> Log out
              </button>
            </>
          )}

          {!isAuthenticated && (
            <>
              <div className="my-1 border-t border-border/50" />
              <Button onClick={() => { openAuthModal(); setMobileMenuOpen(false); }} className="w-full rounded-xl">
                Log in / Sign up
              </Button>
            </>
          )}
          </div>
        </div>
      )}
    </header>
  );
}
