import React from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import type { HubSection } from '../../types/models';
import { useRulesCrossLink } from '../../rules/useRulesCrossLink';

const DashboardView: React.FC<{ onOpenCreate: () => void; onOpenSearch: () => void; onOpenTools: () => void }> = ({ onOpenCreate, onOpenSearch, onOpenTools }) => {
  const { campaignData, characters, selectedCharacterId, selectedMonsterId, selectedEncounterId, selectedCombatId, selectedCampaignId, setCurrentSection } = useCampaignStore();
  const { registry, pinnedRuleIDs, recentRuleIDs, openRule } = useRulesCrossLink();
  const ruleShelf = Array.from(new Set([...pinnedRuleIDs, ...recentRuleIDs])).map((id) => registry?.byID.get(id)).filter((entry) => Boolean(entry)).slice(0, 8);
  const selectedCampaign = campaignData.campaigns.find(({ id }) => id === selectedCampaignId) ?? campaignData.campaigns[0];
  const resumeItems: Array<{ title: string; detail: string; section: HubSection }> = [];
  const selectedCharacter = characters.find(({ id }) => id === selectedCharacterId);
  const selectedEncounter = campaignData.encounters.find(({ id }) => id === selectedEncounterId);
  const selectedCombat = campaignData.combats.find(({ id }) => id === selectedCombatId);
  const selectedMonster = campaignData.customMonsters.find(({ id }) => id === selectedMonsterId);
  if (selectedCharacter) resumeItems.push({ title: selectedCharacter.name || 'Unnamed Character', detail: `Level ${selectedCharacter.level} ${selectedCharacter.class}`, section: 'Characters' });
  if (selectedEncounter) resumeItems.push({ title: selectedEncounter.name, detail: 'Encounter Builder', section: 'Encounters' });
  if (selectedCombat) resumeItems.push({ title: selectedCombat.name, detail: `Round ${selectedCombat.round} • Live Combat`, section: 'Combat' });
  if (selectedMonster) resumeItems.push({ title: selectedMonster.name, detail: 'Custom Monster', section: 'Monsters' });
  if (selectedCampaign) resumeItems.push({ title: selectedCampaign.name, detail: selectedCampaign.party ? 'Connected Party Hub' : 'Campaign Workspace', section: 'Campaign' });

  const quickActions: Array<{ section: HubSection; icon: string; title: string; detail: string; action: string }> = [
    { section: 'Characters', icon: '🧙', title: 'Characters', detail: `${characters.length} saved`, action: 'Build, manage, or open a sheet' },
    { section: 'Encounters', icon: '⚔', title: 'Encounters', detail: `${campaignData.encounters.length} prepared`, action: 'Build and balance the next scene' },
    { section: 'Library', icon: '📚', title: 'Library', detail: `${campaignData.customMonsters.length} custom monsters`, action: 'Rules, monsters, powers, and equipment' },
    { section: 'Campaign', icon: '🗺', title: 'Campaigns', detail: `${campaignData.campaigns.length} saved`, action: 'Parties, sessions, notes, and inventory' },
  ];

  return <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
    <header><p className="theme-accent-text text-xs font-black uppercase tracking-[0.28em]">Dashboard</p><h1 className="mt-1 break-words text-3xl font-black text-white sm:text-4xl">{campaignData.title}</h1><p className="mt-2 max-w-3xl text-slate-400">Your DC20 command center for preparing the game, resuming current work, and reaching table tools without losing context.</p></header>

    <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Pinned</p><h2 className="text-xl font-black text-white">GM actions</h2></div></div><div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={onOpenCreate} className="btn-primary rounded-2xl p-4 text-left"><span className="text-2xl">＋</span><span className="ml-3 font-black">Create anything</span></button><button type="button" onClick={onOpenSearch} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left hover:bg-white/5"><span className="text-2xl">⌕</span><span className="ml-3 font-black text-white">Search the Hub</span><span className="float-right rounded bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-500">⌘K</span></button><button type="button" onClick={onOpenTools} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left hover:bg-white/5"><span className="text-2xl">⚙</span><span className="ml-3 font-black text-white">Open GM Tools</span></button></div></section>

    {resumeItems.length > 0 && <section><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Recent</p><h2 className="mt-1 text-xl font-black text-white">Resume work</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{resumeItems.map((item) => <button type="button" key={`${item.section}-${item.title}`} onClick={() => setCurrentSection(item.section)} className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-left hover:border-violet-400/30 hover:bg-violet-500/10"><span className="block truncate font-black text-slate-100">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.detail}</span><span className="theme-accent-text mt-3 block text-[10px] font-black uppercase tracking-wider">Resume →</span></button>)}</div></section>}

    {ruleShelf.length > 0 && <section><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Rules at hand</p><h2 className="mt-1 text-xl font-black text-white">Pinned & recently viewed</h2><div className="mt-3 flex gap-3 overflow-x-auto pb-2">{ruleShelf.map((entry) => entry && <button type="button" key={entry.id} onClick={() => openRule(entry.id)} className="min-w-48 rounded-xl border border-violet-400/15 bg-violet-500/[0.07] p-4 text-left hover:border-violet-400/35"><span className="block font-black text-violet-100">{entry.canonicalName}</span><span className="mt-1 block text-xs text-slate-500">{entry.category} • {entry.sourcePage}</span></button>)}</div></section>}

    <section><h2 className="mb-3 text-xl font-black text-white">Workspace</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{quickActions.map((item) => <button type="button" key={item.title} onClick={() => setCurrentSection(item.section)} className="group rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-800/80"><div className="flex items-start justify-between"><span className="text-3xl">{item.icon}</span><span className="theme-accent-text text-xs font-black uppercase tracking-wider">Open →</span></div><h3 className="mt-4 text-lg font-black text-white">{item.title}</h3><p className="mt-1 text-sm font-bold text-slate-500">{item.detail}</p><p className="mt-3 text-sm leading-5 text-slate-400">{item.action}</p></button>)}</div></section>

    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Current Campaign</p><h2 className="mt-1 text-2xl font-black text-white">{selectedCampaign?.name ?? 'No campaign selected'}</h2><p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-400">{selectedCampaign?.notes[0]?.body || campaignData.notes || 'Open Campaigns to create a workspace for sessions, locations, NPCs, and secrets.'}</p>{selectedCampaign && <button type="button" onClick={() => setCurrentSection('Campaign')} className="theme-accent-text mt-4 text-xs font-black uppercase tracking-wider">Open campaign →</button>}</section><section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6"><h2 className="text-xl font-black text-white">At a glance</h2><dl className="mt-4 grid grid-cols-2 gap-3">{[['Campaigns', campaignData.campaigns.length], ['Characters', characters.length], ['Encounters', campaignData.encounters.length], ['Live Combats', campaignData.combats.length], ['Custom Monsters', campaignData.customMonsters.length], ['Custom Items', campaignData.customEquipment.length]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-950/50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-black text-violet-200">{value}</dd></div>)}</dl></section></div>
  </div>;
};

export default DashboardView;
