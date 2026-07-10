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
import ActivityDetail from "@/pages/ActivityDetail";
import Surf from "@/pages/Surf";
import Experiences from "@/pages/Experiences";
import ExperienceDetail from "@/pages/ExperienceDetail";
import SpotlightPass from "@/pages/SpotlightPass";
import DateBuilder from "@/pages/DateBuilder";
import PassSuccess from "@/pages/PassSuccess";
import BusinessSuccess from "@/pages/BusinessSuccess";
import DiscoverSwipe from "@/pages/DiscoverSwipe";
import Influencers from "@/pages/Influencers";
import InfluencerDashboard from "@/pages/InfluencerDashboard";
import InfluencerLanding from "@/pages/InfluencerLanding";
import AdminInfluencers from "@/pages/AdminInfluencers";
import Messages from "@/pages/Messages";
import AdminBookings from "@/pages/AdminBookings";
import GuideDashboard from "@/pages/GuideDashboard";
import ListBusiness from "@/pages/ListBusiness";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import AdminContent from "@/pages/AdminContent";
import ForGuides from "@/pages/ForGuides";
import Launch from "@/pages/Launch";
import Welcome from "@/pages/Welcome";
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
      hash.includes("type=signup") ||
      hash.includes("type=recovery")
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

// Soft, dismissible reminder shown to users whose email hasn't been confirmed yet.
// Confirmation isn't required to use the app — this is just a nudge.
function EmailReminderBanner() {
  const { isAuthenticated, supabaseUser } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  if (!isAuthenticated || dismissed) return null;
  const needsConfirm = (supabaseUser as any)?.user_metadata?.email_confirmed === false;
  if (!needsConfirm) return null;
  const email = (supabaseUser as any)?.email;
  const name = (supabaseUser as any)?.user_metadata?.full_name;
  const send = async () => {
    if (!email) return;
    setSending(true);
    try {
      await supabase.functions.invoke("send-verify-email", { body: { email, name } });
      setSent(true);
    } catch { /* ignore */ } finally { setSending(false); }
  };
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 flex items-center justify-center gap-3 text-center">
      <span>📧 Your email isn't confirmed yet.</span>
      {sent
        ? <span className="font-medium">Check your inbox for the link.</span>
        : <button onClick={send} disabled={sending} className="font-semibold underline hover:text-amber-900 disabled:opacity-60">{sending ? "Sending…" : "Send confirmation link"}</button>}
      <button onClick={() => setDismissed(true)} className="ml-1 text-amber-500 hover:text-amber-700" aria-label="Dismiss">✕</button>
    </div>
  );
}

function ReferralCapture() {
  const [loc] = useLocation();
  useEffect(() => {
    try { const p = new URLSearchParams(window.location.search); const ref = p.get("ref"); if (ref) localStorage.setItem("sp_ref", ref); } catch { /* ignore */ }
  }, [loc]);
  return null;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <AuthTokenWirer />
      <MagicLinkHandler />
      <ForcePasswordGate />
      <ImpersonationBar />
      <EmailReminderBanner />
      <ReferralCapture />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/businesses/:id" component={BusinessDetail} />
          <Route path="/signup" component={SignUp} />
          <Route path="/sign-up" component={SignUp} />
          <Route path="/activities" component={Activities} />
          <Route path="/activities/:slug" component={ActivityDetail} />
          <Route path="/surf" component={Surf} />
          <Route path="/experiences" component={Experiences} />
          <Route path="/experiences/:slug" component={ExperienceDetail} />
          <Route path="/pass" component={SpotlightPass} />
          <Route path="/date-builder" component={DateBuilder} />
          <Route path="/discover" component={DiscoverSwipe} />
          <Route path="/influencers" component={Influencers} />
          <Route path="/influencer" component={InfluencerDashboard} />
          <Route path="/i/:slug" component={InfluencerLanding} />
          <Route path="/admin/influencers" component={AdminInfluencers} />
          <Route path="/messages" component={Messages} />
          <Route path="/pass/success" component={PassSuccess} />
          <Route path="/business/success" component={BusinessSuccess} />
          <Route path="/guide" component={GuideDashboard} />
          <Route path="/for-guides" component={ForGuides} />
          <Route path="/launch" component={Launch} />
          <Route path="/welcome" component={Welcome} />
          <Route path="/list-your-business" component={ListBusiness} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/content" component={AdminContent} />
          <Route path="/admin/bookings" component={AdminBookings} />
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
