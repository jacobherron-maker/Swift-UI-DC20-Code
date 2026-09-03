import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useCloudSync } from '../../cloud/CloudSyncContext';
import { useCampaignStore } from '../../store/campaignStore';

const Header: React.FC = () => {
  const { campaignData, isDarkMode, toggleDarkMode, saveCampaign } = useCampaignStore();
  const { isConfigured, user, signOut } = useAuth();
  const { status, error, lastSyncedAt, syncNow } = useCloudSync();
  const syncLabel = status === 'saving' ? 'Saving…'
    : status === 'synced' ? 'Cloud saved'
      : status === 'error' ? 'Sync issue'
        : 'Local only';

  const save = async () => {
    saveCampaign();
    await syncNow();
  };

  const logOut = async () => {
    await syncNow();
    await signOut();
  };

  return (
    <div className="header-modern flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{campaignData.title}</h2>
        <p className="text-sm text-muted">GM's Companion</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        <div className="hidden text-right lg:block">
          <div className="text-xs font-bold text-slate-300">{user?.email ?? (isConfigured ? 'Account unavailable' : 'Cloud setup needed')}</div>
          <div title={error || (lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : '')} className={`text-[10px] font-black uppercase tracking-wider ${status === 'error' ? 'text-red-300' : status === 'synced' ? 'text-emerald-300' : 'text-slate-500'}`}>{syncLabel}</div>
        </div>
        <button
          onClick={() => void save()}
          className="btn-primary font-medium"
        >
          ☁️ Save
        </button>

        {user && <button type="button" onClick={() => void logOut()} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">Sign Out</button>}

        <button
          onClick={toggleDarkMode}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
};

export default Header;
