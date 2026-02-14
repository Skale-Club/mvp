import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { initSupabase } from '@/lib/supabase';

interface AdminSession {
  isAdmin: boolean;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface AuthContextType {
  isAdmin: boolean;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  loading: boolean;
  isSupabaseAuth: boolean;
  signIn: (email?: string, password?: string) => Promise<void>;
  signOut: () => void;
  checkSession: () => Promise<AdminSession | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const _isSupabaseAuth = true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseAuth, setIsSupabaseAuth] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/session', {
        credentials: 'include'
      });
      const data: AdminSession = await response.json();
      setIsAdmin(data.isAdmin);
      setEmail(data.email);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      return data;
    } catch (err) {
      setIsAdmin(false);
      setEmail(null);
      setFirstName(null);
      setLastName(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsSupabaseAuth(true);
      let sess = await checkSession();

      // If Supabase has a browser session (e.g. after OAuth redirect) but the server session
      // is missing, sync it by exchanging the access token for a server-side session.
      if (_isSupabaseAuth && !sess?.email) {
        try {
          const supabase = await initSupabase();
          const { data } = await supabase.auth.getSession();
          const accessToken = data.session?.access_token;

          if (accessToken) {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ accessToken }),
            });

            if (res.ok) {
              sess = await checkSession();
            }
          }
        } catch {
          // Best-effort sync; UI will stay logged out on the server if this fails.
        }
      }

    })();
  }, [checkSession]);

  const signIn = async (emailArg?: string, passwordArg?: string) => {
    const supabase = await initSupabase();

    if (emailArg && passwordArg) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailArg,
        password: passwordArg,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session?.access_token) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accessToken: data.session.access_token }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Login failed');
        }

        await checkSession();
      }

      return;
    }

    throw new Error('Email and password are required');
  };

  const signOut = async () => {
    try {
      const supabase = await initSupabase();
      await supabase.auth.signOut();
    } catch {
      // Ignore supabase signout errors
    }
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setIsAdmin(false);
    setEmail(null);
    setFirstName(null);
    setLastName(null);
    window.location.href = '/admin/login';
  };

  return (
    <AuthContext.Provider value={{ isAdmin, email, firstName, lastName, loading, isSupabaseAuth, signIn, signOut, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AuthProvider');
  }
  return context;
}
