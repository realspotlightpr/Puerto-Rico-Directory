import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";

export default function SignUp() {
  const { openAuthModal } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/?auth=signup", { replace: true });
    openAuthModal?.();
  }, [openAuthModal, setLocation]);

  return <div className="min-h-[60vh] flex items-center justify-center" aria-live="polite"><Loader2 className="w-7 h-7 animate-spin text-primary" /><span className="sr-only">Opening account form</span></div>;
}
