import { useMemo } from 'react';
import App from './App';
import { useAuth } from './auth/AuthContext';
import { CloudSyncProvider } from './cloud/CloudSyncContext';
import { PartyCampaignProvider } from './cloud/PartyCampaignContext';
import AuthScreen from './components/auth/AuthScreen';
import { useCampaignStore } from './store/campaignStore';

export default function ApplicationRoot() {
  const { isConfigured, isLoading, user } = useAuth();
  const campaigns = useCampaignStore(({ campaignData }) => campaignData.campaigns);
  const partyLinks = useMemo(() => campaigns.flatMap(({ party }) => party ? [party] : []), [campaigns]);

  if (isConfigured && isLoading) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-200"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-violet-300/20 border-t-violet-400" /><p className="mt-4 font-bold">Checking your account…</p></div></main>;
  }
  if (isConfigured && !user) return <AuthScreen />;
  return <CloudSyncProvider><PartyCampaignProvider links={partyLinks}><App /></PartyCampaignProvider></CloudSyncProvider>;
}
