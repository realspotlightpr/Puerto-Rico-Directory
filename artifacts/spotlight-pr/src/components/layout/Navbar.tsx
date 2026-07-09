import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Menu, X, User as UserIcon, PlusCircle, LayoutDashboard,
  Shield, LogOut, Store, Star, ChevronDown, Compass, Waves,
  Palmtree, Megaphone, Crown, Anchor,
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "business_owner";
  const isUser = user?.role === "user";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/directory", label: "Businesses" },
    { href: "/activities", label: "Places" },
    { href: "/surf", label: "Surf" },
    { href: "/experiences", label: "Experiences" },
    { href: "/business", label: "For Business" },
  ];

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
      ],
    },
    {
      heading: "For Business",
      items: [
        { href: "/list-your-business", label: "Add your business", desc: "List free in minutes", icon: PlusCircle, accent: "text-primary bg-primary/10" },
        { href: "/business", label: "Why Spotlight", desc: "Reach locals & visitors", icon: Store, accent: "text-indigo-600 bg-indigo-50" },
        { href: "/business", label: "Go Premium", desc: "Menus, analytics & more", icon: Crown, accent: "text-amber-600 bg-amber-50" },
        { href: "/advertise", label: "Advertise", desc: "Feature your brand", icon: Megaphone, accent: "text-rose-600 bg-rose-50" },
      ],
    },
    {
      heading: "Guides & Community",
      items: [
        { href: "/guide", label: "Become a guide", desc: "Sell tours & experiences", icon: Anchor, accent: "text-emerald-700 bg-emerald-50" },
        { href: "/experiences", label: "Book a guide", desc: "Local-led adventures", icon: Compass, accent: "text-teal-700 bg-teal-50" },
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
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full glass-panel border-b border-border shadow-xl p-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-base font-medium p-3 rounded-xl hover:bg-muted ${location === link.href ? "text-primary bg-primary/5" : "text-foreground"}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <div className="flex items-center justify-between px-3 py-2 mt-1 border-t border-border/50 pt-3">
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
              <Link href="/list-your-business" className="text-base font-medium p-3 rounded-xl hover:bg-muted flex items-center gap-3 text-primary" onClick={() => setMobileMenuOpen(false)}>
                <Store className="w-5 h-5" /> Add Business
              </Link>
              <Button onClick={() => { openAuthModal(); setMobileMenuOpen(false); }} className="w-full rounded-xl">
                Log in / Sign up
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
