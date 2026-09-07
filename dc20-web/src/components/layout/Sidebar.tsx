import React, { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { PRIMARY_DESTINATIONS, primaryDestinationForSection } from '../../navigation/appNavigation';
import CustomizeDialog from './CustomizeDialog';
import { downloadHubBackup } from '../../utils/dataBackup';

interface SidebarProps {
  onOpenCreate: () => void;
  onOpenSearch: () => void;
  onOpenTools: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenCreate, onOpenSearch, onOpenTools }) => {
  const { currentSection, setCurrentSection, exportData } = useCampaignStore();
  const [showCustomize, setShowCustomize] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentDestination = primaryDestinationForSection(currentSection);

  const runAndClose = (action: () => void) => {
    action();
    setMobileOpen(false);
  };

  const workspaceActions = () => (
    <div className="mb-5 space-y-2">
      <button type="button" onClick={() => runAndClose(onOpenCreate)} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 text-sm font-black shadow-xl"><span aria-hidden="true" className="text-lg">＋</span> Create</button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => runAndClose(onOpenSearch)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-bold text-slate-200 hover:bg-white/10" title="Global Search (Command or Control K)">⌕ Search</button>
        <button type="button" onClick={() => runAndClose(onOpenTools)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-bold text-slate-200 hover:bg-white/10">⚙ GM Tools</button>
      </div>
    </div>
  );

  const navigation = () => (
    <nav aria-label="Primary DC20 Hub destinations" className="flex-1 space-y-2 overflow-y-auto overscroll-contain">
      <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Workspace</p>
      {PRIMARY_DESTINATIONS.map((destination) => (
        <button type="button" key={destination.id} onClick={() => runAndClose(() => setCurrentSection(destination.defaultSection))} className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${currentDestination === destination.id ? 'nav-item-active text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`} aria-current={currentDestination === destination.id ? 'page' : undefined} title={destination.id}>
          <span aria-hidden="true" className="w-6 shrink-0 text-center text-lg">{destination.icon}</span>
          <span className="min-w-0 grow"><span className="block truncate font-black">{destination.id}</span><span className={`mt-0.5 block truncate text-[10px] ${currentDestination === destination.id ? 'text-white/65' : 'text-slate-600'}`}>{destination.description}</span></span>
          <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-30" aria-hidden="true"><path fill="currentColor" d="M10 17l5-5-5-5v10z" /></svg>
        </button>
      ))}
    </nav>
  );

  const utilityButtons = () => (
    <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
      <button type="button" onClick={() => runAndClose(() => setShowCustomize(true))} className="min-h-11 w-full rounded-lg bg-gray-800 py-2 text-sm text-gray-200 hover:bg-gray-700" title="Customize">🎨 Customize</button>
      <button type="button" onClick={() => downloadHubBackup(exportData())} className="min-h-11 w-full rounded-lg bg-gray-800 py-2 text-sm text-gray-200 hover:bg-gray-700" title="Export Data">💾 Export Data</button>
    </div>
  );

  const contents = () => <>{workspaceActions()}{navigation()}{utilityButtons()}</>;

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation" className="mobile-menu-trigger fixed z-40 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-xl text-violet-200 shadow-xl backdrop-blur lg:hidden"><span aria-hidden="true">☰</span></button>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
        <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <aside id="mobile-navigation" className="sidebar mobile-drawer absolute inset-y-0 left-0 flex w-[min(88vw,21rem)] flex-col overflow-hidden shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4"><div><img src="/DC20-Logo.png" alt="DC20 Hub" className="h-16 w-auto" /><p className="text-muted mt-1 text-sm">TTRPG Assistant</p></div><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-800 text-xl text-slate-200">×</button></div>
          {contents()}
        </aside>
      </div>}
      <aside className="sidebar hidden w-72 shrink-0 flex-col overflow-hidden lg:flex">
        <div className="mb-4"><img src="/DC20-Logo.png" alt="DC20 Hub" className="h-20 w-auto" /><p className="text-muted mt-1 text-sm">TTRPG Assistant</p></div>
        {contents()}
      </aside>
      {showCustomize && <CustomizeDialog onClose={() => setShowCustomize(false)} />}
    </>
  );
};

export default Sidebar;
