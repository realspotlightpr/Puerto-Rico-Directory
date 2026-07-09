import { useLocation } from "wouter";
import { Home, Compass, Palmtree, Heart, User } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (path: string) => boolean;
  requiresAuth?: boolean;
};

const TABS: Tab[] = [
  { href: "/", label: "Discover", icon: Home, match: (p) => p === "/" },
  { href: "/directory", label: "Businesses", icon: Compass, match: (p) => p.startsWith("/directory") || p.startsWith("/businesses") },
  { href: "/activities", label: "Places", icon: Palmtree, match: (p) => p.startsWith("/activities") },
  { href: "/profile", label: "Saved", icon: Heart, match: (p) => p.startsWith("/profile"), requiresAuth: true },
  { href: "/dashboard", label: "Account", icon: User, match: (p) => p.startsWith("/dashboard"), requiresAuth: true },
];

/**
 * App-style sticky bottom navigation. Mobile only (hidden on md+).
 * Content pages should reserve space with `pb-16` on small screens.
 */
export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, openAuthModal } = useAuth();

  const go = (t: Tab) => {
    if (t.requiresAuth && !isAuthenticated) {
      openAuthModal?.();
      return;
    }
    setLocation(t.href);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-white/90 backdrop-blur-lg shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(location);
          const Icon = t.icon;
          return (
            <button
              key={t.href}
              onClick={() => go(t)}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 active:scale-95 transition-transform"
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
              <span className={`flex items-center justify-center w-11 h-7 rounded-xl transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                <Icon className={`w-[22px] h-[22px] transition-transform ${active ? "scale-110" : ""}`} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={`text-[10px] font-semibold tracking-tight ${active ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
