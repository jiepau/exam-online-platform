import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/permissions";

interface StaffProfile {
  full_name: string;
  nip?: string | null;
  nuptk?: string | null;
  subject?: string | null;
}

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  profile: StaffProfile | null;
  loading: boolean;
  roleError: string | null;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Fetch role with a single retry on transient failure.
  const fetchRole = async (userId: string): Promise<{ role: AppRole | null; error: string | null }> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error) return { role: (data?.role as AppRole) ?? null, error: null };
      // Retry once after a short delay for transient errors
      await new Promise((r) => setTimeout(r, 800));
    }
    return { role: null, error: "Gagal memuat hak akses. Silakan muat ulang halaman." };
  };

  const fetchUserData = async (userId: string) => {
    const [roleRes, profileRes] = await Promise.all([
      fetchRole(userId),
      supabase.from("profiles").select("full_name, nip, nuptk, subject").eq("user_id", userId).maybeSingle(),
    ]);

    setRole(roleRes.role);
    setRoleError(roleRes.error);
    setProfile((profileRes.data as StaffProfile) ?? null);
  };

  useEffect(() => {
    let mounted = true;
    // Tracks the user whose role/profile has already been loaded so that
    // TOKEN_REFRESHED / USER_UPDATED for the SAME user don't re-trigger the
    // global loading state (which would unmount StaffRoute pages and lose
    // unsaved form input). Runs in the auth callback, so a ref is required
    // instead of React state.
    let loadedUserId: string | null = null;

    // onAuthStateChange fires INITIAL_SESSION on subscribe — it is the single
    // source of truth for session init, so no separate loadSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Same user, session already loaded (e.g. background TOKEN_REFRESHED
        // or USER_UPDATED): update the session silently in the background.
        // Never flip the global loading flag here — that would remount
        // protected pages and wipe unsaved form state.
        if (loadedUserId === currentUser.id) return;

        setLoading(true);
        setRoleError(null);
        // Defer to avoid Supabase auth callback deadlocks
        setTimeout(async () => {
          if (!mounted) return;
          await fetchUserData(currentUser.id);
          if (mounted) {
            loadedUserId = currentUser.id;
            setLoading(false);
          }
        }, 0);
      } else {
        loadedUserId = null;
        setRole(null);
        setProfile(null);
        setRoleError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };

    // Assign role
    if (data.user) {
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role,
      });
      if (roleError) return { error: roleError.message };
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setProfile(null);
    setRoleError(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, roleError, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
