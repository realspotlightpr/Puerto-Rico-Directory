import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Menu, X, User as UserIcon, PlusCircle, LayoutDashboard,
  Shield, LogOut, Store, Star,
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

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "business_owner";
  const isUser = user?.role === "user";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/directory", label: "Directory" },
    { href: "/business", label: "For Business" },
  ];

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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.href ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4 border-l border-border/50 pl-6">
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
      )}
    </header>
  );
}
