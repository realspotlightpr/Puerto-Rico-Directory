import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@workspace/replit-auth-web";
import { setBaseUrl } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import BusinessDetail from "@/pages/BusinessDetail";
import ListBusiness from "@/pages/ListBusiness";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// For Replit environment routing
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
setBaseUrl(basePath);

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/directory" component={Directory} />
          <Route path="/businesses/:id" component={BusinessDetail} />
          <Route path="/list-your-business" component={ListBusiness} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
