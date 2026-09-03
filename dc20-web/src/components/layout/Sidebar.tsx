import React, { useState } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { HubSectionValues } from '../../types/models';
import type { HubSection } from '../../types/models';
import CustomizeDialog from './CustomizeDialog';
import { downloadHubBackup } from '../../utils/dataBackup';

const sectionSymbols: Record<HubSection, string> = {
  Dashboard: '✦', Rules: '📚', 'Spells & Maneuvers': '✨', 'Dice Roller': '🎲', Encounters: '◈', Monsters: '🐾', Characters: '🧙', Equipment: '🎒', Combat: '⚡', Campaign: '🗺',
};

const sections: HubSection[] = [
  HubSectionValues.DASHBOARD,
  HubSectionValues.RULES,
  HubSectionValues.CHARACTERS,
  HubSectionValues.DICE,
  HubSectionValues.EQUIPMENT,
  HubSectionValues.POWERS,
  HubSectionValues.MONSTERS,
  HubSectionValues.ENCOUNTERS,
  HubSectionValues.COMBAT,
  HubSectionValues.CAMPAIGN,
];

const sectionLabels: Partial<Record<HubSection, string>> = {
  'Spells & Maneuvers': 'Spells and Maneuvers',
  Campaign: 'Campaigns',
};

const Sidebar: React.FC = () => {
  const { currentSection, setCurrentSection, exportData } = useCampaignStore();
  const [showCustomize, setShowCustomize] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const chooseSection = (section: HubSection) => {
    setCurrentSection(section);
    setMobileOpen(false);
  };

  const navigation = () => (
    <nav aria-label="DC20 Hub sections" className="flex-1 space-y-2 overflow-y-auto overscroll-contain">
      {sections.map((section) => (
        <button
          key={section}
          onClick={() => chooseSection(section)}
          className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-medium transition-all ${
            currentSection === section
              ? 'nav-item-active text-white shadow-lg'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
          title={sectionLabels[section] ?? section}
        >
          <span aria-hidden="true" className="w-5 shrink-0 text-center">{sectionSymbols[section]}</span>
          <span className="min-w-0 grow truncate">{sectionLabels[section] ?? section}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-30" aria-hidden="true">
            <path fill="currentColor" d="M10 17l5-5-5-5v10z" />
          </svg>
        </button>
      ))}
    </nav>
  );

  const utilityButtons = () => (
    <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
      <button type="button" onClick={() => { setShowCustomize(true); setMobileOpen(false); }} className="btn-primary min-h-11 w-full text-sm" title="Customize">🎨 Customize</button>
      <button type="button" onClick={() => downloadHubBackup(exportData())} className="min-h-11 w-full rounded-lg bg-gray-800 py-2 text-sm text-gray-200 hover:bg-gray-700" title="Export Data">💾 Export Data</button>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation"
        className="mobile-menu-trigger fixed z-40 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/90 text-xl text-violet-200 shadow-xl backdrop-blur lg:hidden"
      >
        <span aria-hidden="true">☰</span>
      </button>

      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <aside
          id="mobile-navigation"
          className="sidebar mobile-drawer absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col overflow-hidden shadow-2xl"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="hub-logo text-2xl font-extrabold">DC20 Hub</h1>
              <p className="text-muted mt-1 text-sm">TTRPG Assistant</p>
            </div>
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-800 text-xl text-slate-200">×</button>
          </div>
          {navigation()}
          {utilityButtons()}
        </aside>
      </div>}

      <aside className="sidebar hidden w-72 shrink-0 flex-col overflow-hidden lg:flex">
        <div className="mb-4">
          <h1 className="hub-logo text-2xl font-extrabold">DC20 Hub</h1>
          <p className="text-muted mt-1 text-sm">TTRPG Assistant</p>
        </div>
        {navigation()}
        {utilityButtons()}
      </aside>
      {showCustomize && <CustomizeDialog onClose={() => setShowCustomize(false)} />}
    </>
  );
};

export default Sidebar;
