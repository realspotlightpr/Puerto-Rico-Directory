import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@workspace/replit-auth-web";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import BusinessDetail from "@/pages/BusinessDetail";
import ListBusiness from "@/pages/ListBusiness";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import ForBusiness from "@/pages/ForBusiness";
import ManageBusiness from "@/pages/ManageBusiness";
import UserProfile from "@/pages/UserProfile";
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

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <AuthTokenWirer />
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/businesses/:id" component={BusinessDetail} />
          <Route path="/list-your-business" component={ListBusiness} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={Admin} />
          <Route path="/business" component={ForBusiness} />
          <Route path="/manage/:id" component={ManageBusiness} />
          <Route path="/profile" component={UserProfile} />
          <Route path="/profile/:id" component={UserProfile} />
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
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
