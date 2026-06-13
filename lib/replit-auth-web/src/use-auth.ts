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

async function fetchAppUser(
  supabase: SupabaseClient,
  supabaseUser: SupabaseUser,
): Promise<AuthUser | null> {
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    const meta = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? undefined,
      username: (profile?.username as string) ?? undefined,
      firstName: (profile?.first_name as string) ?? (meta.first_name as string) ?? undefined,
      lastName: (profile?.last_name as string) ?? (meta.last_name as string) ?? undefined,
      profileImage: (profile?.profile_image_url as string) ?? undefined,
      role: (profile?.role as AuthUser["role"]) ?? "user",
      emailVerified: Boolean(supabaseUser.email_confirmed_at),
      createdAt: (profile?.created_at as string) ?? supabaseUser.created_at,
    };
  } catch {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? undefined,
      role: "user",
      emailVerified: Boolean(supabaseUser.email_confirmed_at),
    };
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

  const refreshAppUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const sUser = data.session?.user;
    if (sUser) {
      const u = await fetchAppUser(supabase, sUser);
      if (u) setAppUser(u);
    }
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.user) {
        const u = await fetchAppUser(supabase, s.user);
        setAppUser(u);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setSupabaseUser(s?.user ?? null);
        if (s?.user) {
          const u = await fetchAppUser(supabase, s.user);
          setAppUser(u);
        } else {
          setAppUser(null);
        }
        setIsLoading(false);
        if (s) setShowAuthModal(false);
      },
    );

    const handleVisibilityChange = () => {
      if (!document.hidden) refreshAppUser();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [supabase, refreshAppUser]);

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
