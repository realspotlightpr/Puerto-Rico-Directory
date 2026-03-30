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

  // Capture the URL hash immediately on mount — Supabase clears it once it processes the token
  useEffect(() => {
    const hash = window.location.hash;
    if (
      hash.includes("type=magiclink") ||
      hash.includes("type=signup")
    ) {
      detectedRef.current = true;
    }
  }, []);

  // Once auth resolves and the user is logged in, show the set-password modal
  useEffect(() => {
    if (detectedRef.current && !isLoading && isAuthenticated) {
      setShowSetPassword(true);
    }
  }, [isLoading, isAuthenticated]);

  if (!showSetPassword) return null;

  return <SetPasswordModal onComplete={() => setShowSetPassword(false)} />;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToTop />
      <AuthTokenWirer />
      <MagicLinkHandler />
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/businesses/:id" component={BusinessDetail} />
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
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
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
