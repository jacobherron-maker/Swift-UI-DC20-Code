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

  return (
    <aside className="sidebar flex w-72 shrink-0 flex-col overflow-hidden max-lg:w-20 max-lg:px-3">
      <div className="mb-4">
        <h1 className="hub-logo text-2xl font-extrabold max-lg:text-center max-lg:text-xl"><span className="lg:hidden">D20</span><span className="max-lg:hidden">DC20 Hub</span></h1>
        <p className="text-muted mt-1 text-sm max-lg:hidden">TTRPG Assistant</p>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-2">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setCurrentSection(section as HubSection)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium flex items-center gap-3 ${
              currentSection === section
                ? 'nav-item-active text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
            title={sectionLabels[section] ?? section}
          >
            <span aria-hidden="true" className="w-5 text-center">{sectionSymbols[section as HubSection]}</span>
            <span className="grow max-lg:hidden">{sectionLabels[section] ?? section}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-30 max-lg:hidden">
              <path fill="currentColor" d="M10 17l5-5-5-5v10z" />
            </svg>
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-2">
        <button type="button" onClick={() => setShowCustomize(true)} className="btn-primary w-full text-sm" title="Customize">🎨 <span className="max-lg:hidden">Customize</span></button>
        <button type="button" onClick={() => downloadHubBackup(exportData())} className="w-full rounded-lg bg-gray-800 py-2 text-sm text-gray-200 hover:bg-gray-700" title="Export Data">💾 <span className="max-lg:hidden">Export Data</span></button>
      </div>
      {showCustomize && <CustomizeDialog onClose={() => setShowCustomize(false)} />}
    </aside>
  );
};

export default Sidebar;
