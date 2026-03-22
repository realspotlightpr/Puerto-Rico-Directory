import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Menu, X, User as UserIcon, PlusCircle, LayoutDashboard, Shield, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/directory", label: "Directory" },
    { href: "/business", label: "For Business" },
  ];

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
                <Link href="/list-your-business">
                  <Button variant="outline" className="hidden lg:flex gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                    <PlusCircle className="w-4 h-4" /> Add Business
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-muted border border-border">
                      {user?.profileImage ? (
                        <img src={user.profileImage} alt={user.firstName || 'User'} className="rounded-full object-cover w-full h-full" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 p-2 rounded-2xl shadow-xl">
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                      <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">{user?.username}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <Link href="/dashboard">
                      <DropdownMenuItem className="cursor-pointer rounded-lg">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/list-your-business">
                      <DropdownMenuItem className="cursor-pointer rounded-lg lg:hidden">
                        <PlusCircle className="w-4 h-4 mr-2" /> Add Business
                      </DropdownMenuItem>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer rounded-lg text-primary focus:text-primary">
                          <Shield className="w-4 h-4 mr-2" /> Admin Panel
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer rounded-lg text-destructive focus:text-destructive" onClick={() => logout()}>
                      <LogOut className="w-4 h-4 mr-2" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={() => openAuthModal()} className="rounded-full px-6 shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
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
        <div className="md:hidden absolute top-16 left-0 w-full glass-panel border-b border-border shadow-xl p-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className="text-lg font-medium p-2 rounded-lg hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <hr className="border-border/50" />
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-lg font-medium p-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <LayoutDashboard className="w-5 h-5 text-muted-foreground" /> Dashboard
              </Link>
              <Link href="/list-your-business" className="text-lg font-medium p-2 rounded-lg hover:bg-muted flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <PlusCircle className="w-5 h-5 text-muted-foreground" /> Add Business
              </Link>
              {user?.role === 'admin' && (
                <Link href="/admin" className="text-lg font-medium p-2 rounded-lg text-primary hover:bg-primary/5 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Shield className="w-5 h-5" /> Admin Panel
                </Link>
              )}
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-lg font-medium p-2 rounded-lg text-destructive hover:bg-destructive/5 flex items-center gap-2 text-left">
                <LogOut className="w-5 h-5" /> Log out
              </button>
            </>
          ) : (
            <Button onClick={() => { openAuthModal(); setMobileMenuOpen(false); }} className="w-full rounded-xl">
              Log in / Sign up
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
