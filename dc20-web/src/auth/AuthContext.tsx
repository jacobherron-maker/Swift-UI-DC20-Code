import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isCloudConfigured, supabase } from '../lib/supabase';

/* oxlint-disable react/only-export-components */

interface AuthResult {
  error?: string;
  message?: string;
}

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  session: Session | null;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function unavailable(): AuthResult {
  return { error: 'Cloud accounts have not been configured for this deployment yet.' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isCloudConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) return;
      if (!error) setSession(data.session);
      setIsLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) return;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      setIsLoading(false);
    });
    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isConfigured: isCloudConfigured,
    isLoading,
    isPasswordRecovery,
    session,
    user: session?.user ?? null,
    signInWithEmail: async (email, password) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { error: error.message } : {};
    },
    signUpWithEmail: async (email, password) => {
      if (!supabase) return unavailable();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) return { error: error.message };
      return data.session
        ? {}
        : { message: 'Check your email to confirm the account, then return here to sign in.' };
    },
    signInWithGoogle: async () => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      return error ? { error: error.message } : {};
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return error
        ? { error: error.message }
        : { message: 'If an account exists for that address, a reset email is on its way.' };
    },
    updatePassword: async (password) => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: error.message };
      setIsPasswordRecovery(false);
      return { message: 'Your password has been updated.' };
    },
    signOut: async () => {
      if (!supabase) return unavailable();
      const { error } = await supabase.auth.signOut();
      return error ? { error: error.message } : {};
    },
  }), [isLoading, isPasswordRecovery, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
