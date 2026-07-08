import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@workspace/replit-auth-web";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SetPasswordModal } from "@/components/auth/SetPasswordModal";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import BusinessDetail from "@/pages/BusinessDetail";
import SignUp from "@/pages/SignUp";
import { BottomNav } from "@/components/layout/BottomNav";
import Activities from "@/pages/Activities";
import Surf from "@/pages/Surf";
import ListBusiness from "@/pages/ListBusiness";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import ForBusiness from "@/pages/ForBusiness";
import AdvertiseWithUs from "@/pages/AdvertiseWithUs";
import AdditionalServices from "@/pages/AdditionalServices";
import ManageBusiness from "@/pages/ManageBusiness";
import UserProfile from "@/pages/UserProfile";
import VerifyEmail from "@/pages/VerifyEmail";
import TeamDashboard from "@/pages/TeamDashboard";
import { SystemExplained } from "@/pages/SystemExplained";
import Terms from "@/pages/Terms";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(basePath);

function AuthTokenWirer() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(getToken);
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

// Detects when the user has arrived via a magic link and prompts them to set a password
function MagicLinkHandler() {
  const { isLoading, isAuthenticated } = useAuth();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const detectedRef = useRef(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (
      hash.includes("type=magiclink") ||
      hash.includes("type=signup")
    ) {
      detectedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (detectedRef.current && !isLoading && isAuthenticated) {
      setShowSetPassword(true);
    }
  }, [isLoading, isAuthenticated]);

  if (!showSetPassword) return null;

  return <SetPasswordModal onComplete={() => setShowSetPassword(false)} />;
}

// Forces a password reset for accounts created with a temporary password
// (claim approvals, guest business submissions).
function ForcePasswordGate() {
  const { isLoading, isAuthenticated } = useAuth();
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setMustChange(false);
      return;
    }
    (async () => {
      const { data } = await supabase.auth.getUser();
      setMustChange(!!data.user?.user_metadata?.must_change_password);
    })();
  }, [isLoading, isAuthenticated]);

  if (!mustChange) return null;

  return (
    <SetPasswordModal
      onComplete={async () => {
        try {
          await supabase.auth.updateUser({ data: { must_change_password: false } });
        } catch {
          /* non-blocking */
        }
        setMustChange(false);
      }}
    />
  );
}

// Persistent bar shown while an admin is signed in as another user
function ImpersonationBar() {
  const [active, setActive] = useState<{ name?: string } | null>(null);
  useEffect(() => {
    try {
      const a = localStorage.getItem("imp_active");
      if (a) setActive(JSON.parse(a));
    } catch { /* ignore */ }
  }, []);
  if (!active) return null;
  const returnToAdmin = async () => {
    try {
      const raw = localStorage.getItem("imp_admin");
      if (raw) {
        const t = JSON.parse(raw);
        await supabase.auth.setSession({ access_token: t.access_token, refresh_token: t.refresh_token });
      }
    } catch { /* ignore */ }
    localStorage.removeItem("imp_active");
    localStorage.removeItem("imp_admin");
    window.location.href = "/admin";
  };
  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-center gap-3 sticky top-0 z-[60]">
      <span>👁️ Viewing as <strong>{active.name}</strong></span>
      <button onClick={returnToAdmin} className="underline font-semibold hover:text-amber-100">Return to my account</button>
    </div>
  );
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <AuthTokenWirer />
      <MagicLinkHandler />
      <ForcePasswordGate />
      <ImpersonationBar />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/businesses/:id" component={BusinessDetail} />
          <Route path="/signup" component={SignUp} />
          <Route path="/sign-up" component={SignUp} />
          <Route path="/activities" component={Activities} />
          <Route path="/surf" component={Surf} />
          <Route path="/list-your-business" component={ListBusiness} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/team" component={TeamDashboard} />
          <Route path="/business" component={ForBusiness} />
          <Route path="/negocio" component={() => <Redirect to="/business" />} />
          <Route path="/advertise" component={AdvertiseWithUs} />
          <Route path="/services" component={AdditionalServices} />
          <Route path="/spotlight-system" component={SystemExplained} />
          <Route path="/manage/:id" component={ManageBusiness} />
          <Route path="/profile" component={UserProfile} />
          <Route path="/profile/:id" component={UserProfile} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <BottomNav />
      <AuthModal />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider supabase={supabase}>
        <LanguageProvider>
          <TooltipProvider>
            <WouterRouter base={basePath}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
