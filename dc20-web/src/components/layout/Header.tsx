import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';

const Header: React.FC = () => {
  const { campaignData, isDarkMode, toggleDarkMode, saveCampaign } = useCampaignStore();

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
      <div>
        <h2 className="text-xl font-bold text-white">{campaignData.title}</h2>
        <p className="text-sm text-gray-400">GM's Companion</p>
      </div>

      <div className="flex gap-4 items-center">
        <button
          onClick={saveCampaign}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          💾 Save
        </button>

        <button
          onClick={toggleDarkMode}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
};

export default Header;
