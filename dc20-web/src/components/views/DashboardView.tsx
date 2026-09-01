import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';

const DashboardView: React.FC = () => {
  const { campaignData } = useCampaignStore();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-purple-400 mb-8">{campaignData.title}</h1>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-purple-300 mb-4">Quick Stats</h2>
          <div className="space-y-2 text-gray-300">
            <p>📋 Campaigns: <span className="font-bold">{campaignData.campaigns.length}</span></p>
            <p>⚔️ Combats: <span className="font-bold">{campaignData.combats.length}</span></p>
            <p>👹 Monsters: <span className="font-bold">{campaignData.customMonsters.length}</span></p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-purple-300 mb-4">Campaign Notes</h2>
          <p className="text-gray-300 text-sm line-clamp-4">{campaignData.notes}</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-purple-300 mb-4">Welcome to DC20 Hub</h2>
        <div className="text-gray-300 space-y-3">
          <p>🎲 Manage your DC20 campaigns with ease</p>
          <p>📊 Create and track characters, monsters, and combats</p>
          <p>📚 Access rules, spells, and equipment references</p>
          <p>⚔️ Run encounters and manage combat encounters</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
