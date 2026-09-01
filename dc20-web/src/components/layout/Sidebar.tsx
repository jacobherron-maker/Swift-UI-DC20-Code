import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { HubSectionValues } from '../../types/models';
import type { HubSection } from '../../types/models';

const Sidebar: React.FC = () => {
  const { currentSection, setCurrentSection } = useCampaignStore();

  const sections = Object.values(HubSectionValues);

  return (
    <div className="w-64 bg-gray-950 border-r border-gray-700 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-purple-400">DC20 Hub</h1>
        <p className="text-sm text-gray-400 mt-1">TTRPG Assistant</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setCurrentSection(section as HubSection)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all font-medium ${
              currentSection === section
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {section}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-2">
        <button className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm transition-colors">
          ⚙️ Settings
        </button>
        <button className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm transition-colors">
          💾 Export Data
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
