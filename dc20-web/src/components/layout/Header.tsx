import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useCloudSync } from '../../cloud/CloudSyncContext';
import { useCampaignStore } from '../../store/campaignStore';
import { primaryDestinationForSection } from '../../navigation/appNavigation';
import { RULES_VERSION_OPTIONS } from '../../data/rulesVersions';
import type { RulesVersion } from '../../data/rulesVersions';

interface HeaderProps {
  onOpenCreate: () => void;
  onOpenSearch: () => void;
  onOpenTools: () => void;
  rulesVersion: RulesVersion;
  onRulesVersionChange: (version: RulesVersion) => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenCreate, onOpenSearch, onOpenTools, rulesVersion, onRulesVersionChange }) => {
  const { campaignData, currentSection, isDarkMode, toggleDarkMode, saveCampaign } = useCampaignStore();
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
    <header className="header-modern flex shrink-0 items-center justify-between gap-2 py-3 pl-16 pr-3 sm:gap-3 sm:px-6 sm:py-3">
      <div className="hidden min-w-0 sm:block">
        <p className="theme-accent-text text-[10px] font-black uppercase tracking-[0.18em]">{primaryDestinationForSection(currentSection)}</p>
        <h2 className="truncate text-base font-semibold text-white lg:text-lg">{campaignData.title}</h2>
      </div>

      <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
        <label className="shrink-0 sm:hidden" title="DC20 rules version">
          <span className="sr-only">Rules version</span>
          <select value={rulesVersion} onChange={(event) => onRulesVersionChange(event.target.value as RulesVersion)} aria-label="Rules version" className="min-h-11 w-[3.75rem] rounded-lg border border-violet-400/25 bg-slate-950 px-1.5 text-xs font-black text-violet-200 outline-none focus:border-violet-300">
            {RULES_VERSION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.shortLabel}</option>)}
          </select>
        </label>
        <label className="hidden shrink-0 sm:block" title="DC20 rules version">
          <span className="sr-only">Rules version</span>
          <select value={rulesVersion} onChange={(event) => onRulesVersionChange(event.target.value as RulesVersion)} aria-label="Rules version" className="min-h-11 min-w-[8.5rem] rounded-lg border border-violet-400/25 bg-slate-950 px-3 text-xs font-black text-violet-200 outline-none focus:border-violet-300">
            {RULES_VERSION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <div className="hidden text-right lg:block">
          <div className="text-xs font-bold text-slate-300">{user?.email ?? (isConfigured ? 'Account unavailable' : 'Cloud setup needed')}</div>
          <div title={error || (lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : '')} className={`text-[10px] font-black uppercase tracking-wider ${status === 'error' ? 'text-red-300' : status === 'synced' ? 'text-emerald-300' : 'text-slate-500'}`}>{syncLabel}</div>
        </div>
        <button type="button" onClick={onOpenSearch} className="min-h-11 min-w-11 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10" aria-label="Open global search" title="Search (Command or Control K)">⌕ <span className="hidden xl:inline">Search</span></button>
        <button type="button" onClick={onOpenCreate} className="btn-primary min-h-11 min-w-11 font-black" aria-label="Create something"><span aria-hidden="true">＋</span> <span className="hidden md:inline">Create</span></button>
        <button type="button" onClick={onOpenTools} className="min-h-11 min-w-11 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800" aria-label="Open GM Tools" title="GM Tools">⚙ <span className="hidden xl:inline">Tools</span></button>
        <button
          onClick={() => void save()}
          className="btn-primary min-h-11 min-w-11 font-medium"
          aria-label="Save now"
        >
          ☁️ <span className="hidden xl:inline">Save</span>
        </button>

        {user && <button type="button" onClick={() => void logOut()} aria-label="Sign out" className="hidden min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 lg:block">Sign Out</button>}

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
