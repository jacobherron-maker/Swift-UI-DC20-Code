import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { firebaseAuth, isCloudConfigured } from '../lib/firebase';

/* oxlint-disable react/only-export-components */

interface AuthResult {
  error?: string;
  message?: string;
}

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function unavailable(): AuthResult {
  return { error: 'Cloud accounts have not been configured for this deployment yet.' };
}

function authErrorMessage(caught: unknown): string {
  const code = caught && typeof caught === 'object' && 'code' in caught
    ? String(caught.code)
    : '';
  const friendlyMessages: Record<string, string> = {
    'auth/account-exists-with-different-credential': 'An account already exists for this email with a different sign-in method.',
    'auth/email-already-in-use': 'An account already exists for this email address.',
    'auth/invalid-credential': 'The email address or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-blocked': 'The browser blocked the Google sign-in window. Allow popups for this site and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled before it finished.',
    'auth/too-many-requests': 'Too many attempts were made. Wait a moment and try again.',
    'auth/unauthorized-domain': 'This site has not been added to Firebase Authentication’s authorized domains.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  };
  if (friendlyMessages[code]) return friendlyMessages[code];
  return caught instanceof Error ? caught.message : 'The account request could not be completed.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isCloudConfigured);

  useEffect(() => {
    if (!firebaseAuth) return;
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isConfigured: isCloudConfigured,
    isLoading,
    user,
    signInWithEmail: async (email, password) => {
      if (!firebaseAuth) return unavailable();
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        return {};
      } catch (caught) {
        return { error: authErrorMessage(caught) };
      }
    },
    signUpWithEmail: async (email, password) => {
      if (!firebaseAuth) return unavailable();
      try {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
        return { message: 'Your account has been created.' };
      } catch (caught) {
        return { error: authErrorMessage(caught) };
      }
    },
    signInWithGoogle: async () => {
      if (!firebaseAuth) return unavailable();
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(firebaseAuth, provider);
        return {};
      } catch (caught) {
        return { error: authErrorMessage(caught) };
      }
    },
    sendPasswordReset: async (email) => {
      if (!firebaseAuth) return unavailable();
      try {
        await sendPasswordResetEmail(firebaseAuth, email, { url: window.location.origin });
        return { message: 'If an account exists for that address, a reset email is on its way.' };
      } catch (caught) {
        return { error: authErrorMessage(caught) };
      }
    },
    signOut: async () => {
      if (!firebaseAuth) return unavailable();
      try {
        await firebaseSignOut(firebaseAuth);
        return {};
      } catch (caught) {
        return { error: authErrorMessage(caught) };
      }
    },
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
