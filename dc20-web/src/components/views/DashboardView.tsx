import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';

const DashboardView: React.FC = () => {
  const { campaignData, characters, setCurrentSection } = useCampaignStore();

  const quickActions = [
    { section: 'Characters' as const, icon: '🧙', title: 'Characters', detail: `${characters.length} saved`, action: 'Build or open a character' },
    { section: 'Encounters' as const, icon: '🛡️', title: 'Encounters', detail: `${campaignData.encounters.length} saved`, action: 'Prepare the next scene' },
    { section: 'Combat' as const, icon: '⚡', title: 'Combat', detail: `${campaignData.combats.length} saved`, action: 'Run initiative and resources' },
    { section: 'Campaign' as const, icon: '🗺️', title: 'Campaigns', detail: `${campaignData.campaigns.length} saved`, action: 'Open nested campaign notes' },
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <p className="theme-accent-text text-xs font-black uppercase tracking-[0.28em]">Dashboard</p>
      <h1 className="mb-2 mt-1 break-words text-3xl font-black text-white sm:text-4xl">{campaignData.title}</h1>
      <p className="mb-8 text-slate-400">Everything you need to build, prepare, and run DC20 in one place.</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((item) => <button type="button" key={item.section} onClick={() => setCurrentSection(item.section)} className="group rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-800/80">
          <div className="flex items-start justify-between"><span className="text-3xl">{item.icon}</span><span className="theme-accent-text text-xs font-black uppercase tracking-wider">Open →</span></div>
          <h2 className="mt-4 text-lg font-black text-white">{item.title}</h2><p className="mt-1 text-sm font-bold text-slate-500">{item.detail}</p><p className="mt-3 text-sm leading-5 text-slate-400">{item.action}</p>
        </button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-purple-300 mb-4">Quick Stats</h2>
          <div className="space-y-2 text-gray-300">
            <p>📋 Campaigns: <span className="font-bold">{campaignData.campaigns.length}</span></p>
            <p>🧙 Characters: <span className="font-bold">{characters.length}</span></p>
            <p>⚔️ Combats: <span className="font-bold">{campaignData.combats.length}</span></p>
            <p>🛡️ Encounters: <span className="font-bold">{campaignData.encounters.length}</span></p>
            <p>👹 Monsters: <span className="font-bold">{campaignData.customMonsters.length}</span></p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-purple-300 mb-4">Campaign Notes</h2>
          <p className="text-gray-300 text-sm line-clamp-4">{campaignData.notes || 'Open Campaigns to create named notes for sessions, locations, NPCs, and secrets.'}</p>
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
