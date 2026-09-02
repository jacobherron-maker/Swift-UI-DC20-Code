import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';

const Header: React.FC = () => {
  const { campaignData, isDarkMode, toggleDarkMode, saveCampaign } = useCampaignStore();

  return (
    <div className="header-modern px-6 py-4 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-semibold text-white">{campaignData.title}</h2>
        <p className="text-sm text-muted">GM's Companion</p>
      </div>

      <div className="flex gap-3 items-center">
        <button
          onClick={saveCampaign}
          className="btn-primary font-medium"
        >
          💾 Save
        </button>

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
