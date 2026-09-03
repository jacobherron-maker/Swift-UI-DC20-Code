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
    <header className="header-modern flex shrink-0 items-center justify-between gap-2 py-3 pl-16 pr-3 sm:gap-3 sm:px-6 sm:py-4">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-white sm:text-xl">{campaignData.title}</h2>
        <p className="truncate text-xs text-muted sm:text-sm">GM's Companion</p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
        <div className="hidden text-right lg:block">
          <div className="text-xs font-bold text-slate-300">{user?.email ?? (isConfigured ? 'Account unavailable' : 'Cloud setup needed')}</div>
          <div title={error || (lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : '')} className={`text-[10px] font-black uppercase tracking-wider ${status === 'error' ? 'text-red-300' : status === 'synced' ? 'text-emerald-300' : 'text-slate-500'}`}>{syncLabel}</div>
        </div>
        <button
          onClick={() => void save()}
          className="btn-primary min-h-11 min-w-11 font-medium"
          aria-label="Save now"
        >
          ☁️ <span className="hidden sm:inline">Save</span>
        </button>

        {user && <button type="button" onClick={() => void logOut()} aria-label="Sign out" className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"><span className="sm:hidden" aria-hidden="true">↪</span><span className="hidden sm:inline">Sign Out</span></button>}

        <button
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Use light appearance' : 'Use dark appearance'}
          className="min-h-11 min-w-11 rounded-lg bg-gray-800 px-3 py-2 text-gray-200 transition-colors hover:bg-gray-700"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

export default Header;
