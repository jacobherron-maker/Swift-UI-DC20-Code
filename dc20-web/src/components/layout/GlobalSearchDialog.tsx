import { useMemo, useState } from 'react';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { useRulesCrossLink } from '../../rules/useRulesCrossLink';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import type { ContentFocusRequest } from '../../navigation/appNavigation';
import { useCampaignStore } from '../../store/campaignStore';
import OverlayShell from './OverlayShell';
import { monsterDisplayRole } from '../../utils/monsterRules';

interface SearchResult {
  key: string;
  title: string;
  detail: string;
  category: string;
  keywords: string;
  target: Omit<ContentFocusRequest, 'key'>;
  ruleID?: string;
}

const categoryTone: Record<string, string> = {
  Rule: 'bg-sky-500/10 text-sky-200', Condition: 'bg-orange-500/10 text-orange-200',
  Spell: 'bg-fuchsia-500/10 text-fuchsia-200', Maneuver: 'bg-red-500/10 text-red-200',
  Monster: 'bg-emerald-500/10 text-emerald-200', Character: 'bg-violet-500/10 text-violet-200',
  Encounter: 'bg-amber-500/10 text-amber-200', Campaign: 'bg-cyan-500/10 text-cyan-200',
  NPC: 'bg-rose-500/10 text-rose-200',
  Equipment: 'bg-slate-700 text-slate-200', Homebrew: 'bg-purple-500/10 text-purple-200',
};

export default function GlobalSearchDialog({ onClose, onNavigate }: { onClose: () => void; onNavigate: (target: Omit<ContentFocusRequest, 'key'>) => void }) {
  const { registry, isLoading: rulesLoading, openRule } = useRulesCrossLink();
  const { spells, maneuvers, isLoading: powersLoading } = usePowerCatalog();
  const { monsters: sourceMonsters, isLoading: monstersLoading } = useSourceMonsters();
  const { equipment, isLoading: equipmentLoading } = useEquipmentCatalog();
  const { campaignData, characters, selectedCharacterId, selectedMonsterId, selectedEncounterId, selectedCampaignId } = useCampaignStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const allResults = useMemo<SearchResult[]>(() => {
    const rules = (registry?.entries ?? []).filter(({ ruleReference }) => ruleReference.kind !== 'Spell' && ruleReference.kind !== 'Maneuver').map((entry) => ({
      key: `rule:${entry.id}`, title: entry.canonicalName, detail: `${entry.category} • ${entry.sourcePage}`,
      category: entry.category === 'Condition' ? 'Condition' : 'Rule', keywords: `${entry.shortDefinition} ${entry.ruleReference.text} ${entry.ruleReference.keywords} ${entry.aliases.map(({ text }) => text).join(' ')}`,
      target: { kind: 'rule' as const, id: entry.ruleEntryID, name: entry.canonicalName }, ruleID: entry.id,
    }));
    const powerResults: SearchResult[] = [
      ...spells.map((spell) => ({ key: `spell:${spell.name}`, title: spell.name, detail: `${spell.source} • ${spell.school} • ${spell.cost}`, category: 'Spell', keywords: `${spell.tags} ${spell.description} ${spell.enhancements}`, target: { kind: 'power' as const, name: spell.name, powerKind: 'Spell' as const } })),
      ...maneuvers.map((maneuver) => ({ key: `maneuver:${maneuver.name}`, title: maneuver.name, detail: `${maneuver.category} • ${maneuver.cost || 'Base Action'} • ${maneuver.range}`, category: 'Maneuver', keywords: `${maneuver.requirements} ${maneuver.description} ${maneuver.enhancements}`, target: { kind: 'power' as const, name: maneuver.name, powerKind: 'Maneuver' as const } })),
    ];
    const monsterResults = [...sourceMonsters, ...campaignData.customMonsters].map((monster) => ({ key: `monster:${monster.id}`, title: monster.name, detail: `Level ${monster.level} ${monster.type} ${monsterDisplayRole(monster)} • ${monster.creatureType}`, category: campaignData.customMonsters.some(({ id }) => id === monster.id) ? 'Homebrew' : 'Monster', keywords: `${monster.role} ${monster.publishedRole ?? ''} ${monster.descriptionText} ${monster.tactics} ${monster.lore} ${monster.abilities.map(({ name, details }) => `${name} ${details}`).join(' ')}`, target: { kind: 'monster' as const, id: monster.id, name: monster.name } }));
    const characterResults = characters.map((character) => ({ key: `character:${character.id}`, title: character.name || 'Unnamed Character', detail: `Level ${character.level} ${character.ancestry} ${character.class}`, category: 'Character', keywords: `${character.background} ${character.subclass} ${character.notes}`, target: { kind: 'character' as const, id: character.id, name: character.name } }));
    const encounterResults = campaignData.encounters.map((encounter) => ({ key: `encounter:${encounter.id}`, title: encounter.name, detail: `${encounter.entries.reduce((sum, entry) => sum + entry.count, 0)} monsters • ${encounter.partyCharacters?.length ?? 0} linked PCs`, category: 'Encounter', keywords: `${encounter.notes} ${encounter.entries.map(({ monster }) => monster.name).join(' ')}`, target: { kind: 'encounter' as const, id: encounter.id, name: encounter.name } }));
    const campaignResults = campaignData.campaigns.map((campaign) => ({ key: `campaign:${campaign.id}`, title: campaign.name, detail: `${campaign.party ? 'Connected party' : 'Solo campaign'} • ${campaign.notes.length} local notes`, category: 'Campaign', keywords: campaign.notes.map(({ title, body }) => `${title} ${body}`).join(' '), target: { kind: 'campaign' as const, id: campaign.id, name: campaign.name } }));
    const npcResults = campaignData.campaigns.flatMap((campaign) => campaign.notes.filter(({ title }) => /^NPC\b|^NPC\s*[—:-]/i.test(title.trim())).map((note) => ({ key: `npc:${campaign.id}:${note.id}`, title: note.title.replace(/^NPC\s*[—:-]?\s*/i, '') || 'Unnamed NPC', detail: `${campaign.name} • Campaign NPC`, category: 'NPC', keywords: note.body, target: { kind: 'campaign' as const, id: campaign.id, noteId: note.id, name: note.title } })));
    const equipmentResults = [...equipment, ...campaignData.customEquipment].map((item) => ({ key: `equipment:${item.id}`, title: item.name, detail: `${item.category} • ${item.subtype} • ${item.sourcePage}`, category: campaignData.customEquipment.some(({ id }) => id === item.id) ? 'Homebrew' : 'Equipment', keywords: `${item.summary} ${item.mechanics} ${item.properties.join(' ')}`, target: { kind: 'equipment' as const, id: item.id, name: item.name } }));
    return [...characterResults, ...encounterResults, ...campaignResults, ...npcResults, ...monsterResults, ...powerResults, ...equipmentResults, ...rules];
  }, [campaignData.campaigns, campaignData.customEquipment, campaignData.customMonsters, campaignData.encounters, characters, equipment, maneuvers, registry, sourceMonsters, spells]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      const recentKeys = [`character:${selectedCharacterId}`, `encounter:${selectedEncounterId}`, `campaign:${selectedCampaignId}`, `monster:${selectedMonsterId}`];
      return recentKeys.flatMap((key) => allResults.filter((result) => result.key === key)).slice(0, 8);
    }
    const terms = normalized.split(/\s+/).filter(Boolean);
    return allResults.map((result) => {
      const title = result.title.toLowerCase();
      const haystack = `${result.title} ${result.detail} ${result.category} ${result.keywords}`.toLowerCase();
      const matches = terms.every((term) => haystack.includes(term));
      const score = title === normalized ? 0 : title.startsWith(normalized) ? 1 : title.includes(normalized) ? 2 : 3;
      return { result, matches, score };
    }).filter(({ matches }) => matches).sort((left, right) => left.score - right.score || left.result.title.localeCompare(right.result.title)).slice(0, 80).map(({ result }) => result);
  }, [allResults, query, selectedCampaignId, selectedCharacterId, selectedEncounterId, selectedMonsterId]);

  const choose = (result: SearchResult | undefined) => {
    if (!result) return;
    if (result.ruleID) openRule(result.ruleID);
    else onNavigate(result.target);
    onClose();
  };
  const loading = rulesLoading || powersLoading || monstersLoading || equipmentLoading;

  return <OverlayShell title="Search DC20 Hub" eyebrow="Command palette • ⌘K / Ctrl+K" onClose={onClose} size="max-w-4xl">
    <div className="border-b border-white/10 p-4 sm:p-5"><div className="flex items-center gap-3 rounded-2xl border border-violet-400/25 bg-slate-900 px-4 py-3 focus-within:border-violet-400"><span className="text-xl text-violet-300" aria-hidden="true">⌕</span><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(results.length - 1, index + 1)); } else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); } else if (event.key === 'Enter') { event.preventDefault(); choose(results[activeIndex]); } }} placeholder="Search rules, monsters, characters, encounters, campaigns, spells…" className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600" /><span className="hidden rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-500 sm:block">ESC</span></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-600"><span>Rules</span><span>Monsters</span><span>Characters</span><span>Encounters</span><span>Campaigns</span><span>NPCs</span><span>Spells</span><span>Conditions</span><span>Homebrew</span></div></div>
    <div className="max-h-[65vh] p-3 sm:p-4">{loading && <p className="p-4 text-sm text-slate-500">Indexing the Hub…</p>}{!loading && !query.trim() && results.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Start typing to search the entire Hub. Recent selections will appear here once you have opened content.</p>}{!loading && query.trim() && results.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No content matches “{query}”.</p>}<div className="space-y-1">{results.map((result, index) => <button type="button" key={result.key} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(result)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${index === activeIndex ? 'border-violet-400/35 bg-violet-500/10' : 'border-transparent hover:bg-white/5'}`}><span className={`mt-0.5 shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${categoryTone[result.category] ?? categoryTone.Rule}`}>{result.category}</span><span className="min-w-0"><span className="block break-words font-black text-slate-100">{result.title}</span><span className="mt-1 block truncate text-xs text-slate-500">{result.detail}</span></span><span className="ml-auto shrink-0 text-slate-700" aria-hidden="true">↗</span></button>)}</div></div>
  </OverlayShell>;
}
