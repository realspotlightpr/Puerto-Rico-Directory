import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  createElement,
} from "react";
import type { SupabaseClient, Session, User as SupabaseUser } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  role: "user" | "business_owner" | "admin";
  emailVerified: boolean;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  supabaseUser: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  showAuthModal: false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  logout: async () => {},
  getToken: async () => null,
});

async function fetchAppUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.isAuthenticated ? (data.user as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
  supabase,
}: {
  children: ReactNode;
  supabase: SupabaseClient;
}) {
  const [appUser, setAppUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.access_token) {
        const u = await fetchAppUser(s.access_token);
        setAppUser(u);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setSupabaseUser(s?.user ?? null);
        if (s?.access_token) {
          const u = await fetchAppUser(s.access_token);
          setAppUser(u);
        } else {
          setAppUser(null);
        }
        setIsLoading(false);
        if (s) setShowAuthModal(false);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    setSession(null);
    setSupabaseUser(null);
  }, [supabase]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  const openAuthModal = useCallback(() => setShowAuthModal(true), []);
  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  const value: AuthState = {
    user: appUser,
    supabaseUser,
    session,
    isLoading,
    isAuthenticated: !!appUser,
    showAuthModal,
    openAuthModal,
    closeAuthModal,
    logout,
    getToken,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
