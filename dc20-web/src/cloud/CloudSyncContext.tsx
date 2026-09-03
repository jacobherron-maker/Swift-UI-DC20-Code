import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore/lite';
import { useAuth } from '../auth/AuthContext';
import { firestore } from '../lib/firebase';
import { migratePersistedState, useCampaignStore } from '../store/campaignStore';

/* oxlint-disable react/only-export-components */

export type CloudSyncStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';

interface CloudSyncContextValue {
  status: CloudSyncStatus;
  error: string;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
}

interface HubStateDocument {
  user_id: string;
  payload: Record<string, unknown>;
  updated_at: string;
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null);
const LAST_CLOUD_USER_KEY = 'dc20hub-last-cloud-user';
const SYNC_DELAY_MS = 1200;

function backupPayload(): Record<string, unknown> {
  return JSON.parse(useCampaignStore.getState().exportData()) as Record<string, unknown>;
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { isConfigured, user } = useAuth();
  const [status, setStatus] = useState<CloudSyncStatus>(isConfigured && user ? 'loading' : 'local');
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);

  const syncNow = useCallback(async () => {
    if (!firestore || !user || !isInitialized.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    setStatus('saving');
    setError('');
    const updatedAt = new Date().toISOString();
    try {
      await setDoc(doc(firestore, 'hub_state', user.uid), {
        user_id: user.uid,
        payload: backupPayload(),
        updated_at: updatedAt,
      } satisfies HubStateDocument);
      setLastSyncedAt(updatedAt);
      setStatus('synced');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'The cloud save could not be completed.');
    }
  }, [user]);

  useEffect(() => {
    const database = firestore;
    if (!database || !user) {
      isInitialized.current = false;
      return;
    }

    let disposed = false;
    let unsubscribe: () => void = () => undefined;
    isInitialized.current = false;

    const initialize = async () => {
      try {
        const previousUserID = window.localStorage.getItem(LAST_CLOUD_USER_KEY);
        if (previousUserID && previousUserID !== user.uid) {
          useCampaignStore.setState(migratePersistedState({}));
        }

        const stateReference = doc(database, 'hub_state', user.uid);
        const stateSnapshot = await getDoc(stateReference);
        if (disposed) return;

        if (stateSnapshot.exists()) {
          const data = stateSnapshot.data() as HubStateDocument;
          useCampaignStore.getState().importData(data.payload);
          setLastSyncedAt(data.updated_at ?? null);
        } else {
          const updatedAt = new Date().toISOString();
          await setDoc(stateReference, {
            user_id: user.uid,
            payload: backupPayload(),
            updated_at: updatedAt,
          } satisfies HubStateDocument);
          if (disposed) return;
          setLastSyncedAt(updatedAt);
        }

        window.localStorage.setItem(LAST_CLOUD_USER_KEY, user.uid);
        isInitialized.current = true;
        setStatus('synced');
      } catch (caught) {
        if (disposed) return;
        isInitialized.current = true;
        setStatus('error');
        setError(caught instanceof Error ? caught.message : 'Cloud synchronization could not be started.');
      }

      if (disposed) return;
      unsubscribe = useCampaignStore.subscribe(() => {
        if (!isInitialized.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void syncNow(), SYNC_DELAY_MS);
      });
    };

    void initialize();
    return () => {
      disposed = true;
      isInitialized.current = false;
      unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [syncNow, user]);

  const value = useMemo<CloudSyncContextValue>(() => ({ status, error, lastSyncedAt, syncNow }), [status, error, lastSyncedAt, syncNow]);

  if (isConfigured && user && status === 'loading') {
    return (
      <CloudSyncContext.Provider value={value}>
        <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#4c1d95_0%,#111827_45%,#020617_100%)] p-6 text-center text-slate-100">
          <div><div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-violet-300/20 border-t-violet-400" /><h1 className="mt-5 text-2xl font-black">Opening your DC20 Hub…</h1><p className="mt-2 text-sm text-slate-400">Loading your latest cloud save.</p></div>
        </main>
      </CloudSyncContext.Provider>
    );
  }

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncContextValue {
  const context = useContext(CloudSyncContext);
  if (!context) throw new Error('useCloudSync must be used inside CloudSyncProvider.');
  return context;
}
