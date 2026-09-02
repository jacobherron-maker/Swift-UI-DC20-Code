import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { HubSectionValues } from '../../types/models';
import type { HubSection } from '../../types/models';

const Sidebar: React.FC = () => {
  const { currentSection, setCurrentSection } = useCampaignStore();

  const sections = Object.values(HubSectionValues);

  return (
    <div className="w-72 sidebar flex flex-col overflow-hidden">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">DC20 Hub</h1>
        <p className="text-sm text-muted mt-1">TTRPG Assistant</p>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-2">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setCurrentSection(section as HubSection)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium flex items-center gap-3 ${
              currentSection === section
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="grow">{section}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-30">
              <path fill="currentColor" d="M10 17l5-5-5-5v10z" />
            </svg>
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-2">
        <button className="w-full btn-primary text-sm">⚙️ Settings</button>
        <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm py-2">💾 Export Data</button>
      </div>
    </div>
  );
};

export default Sidebar;
