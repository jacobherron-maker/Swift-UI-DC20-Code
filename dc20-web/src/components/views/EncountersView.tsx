import { useEffect, useMemo, useState } from 'react';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import type { PartyCharacterEntry } from '../../cloud/PartyCampaignContext';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { useCampaignStore } from '../../store/campaignStore';
import type { Character, Encounter, Monster } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import { RuleAwareText } from '../rules/RuleAwareText';
import {
  combatFromEncounter,
  encounterMetrics,
  monsterBudget,
  monsterDisplayRole,
  monsterLevelLabel,
  partyReadinessMetrics,
  synchronizeEncounterPartyCharacters,
} from '../../utils/monsterRules';
import { CharacterAvatar } from '../character/CharacterAvatar';
import type { ContentFocusRequest } from '../../navigation/appNavigation';

/* Navigation requests intentionally synchronize this view's local selection. */
/* oxlint-disable react-hooks/exhaustive-deps */

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';

function formatBudget(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function budgetColor(difficulty: string): string {
  if (difficulty === 'Deadly') return 'text-red-300 border-red-400/25 bg-red-500/10';
  if (difficulty === 'Very Hard') return 'text-orange-300 border-orange-400/25 bg-orange-500/10';
  if (difficulty === 'Hard') return 'text-amber-300 border-amber-400/25 bg-amber-500/10';
  if (difficulty === 'Medium') return 'text-violet-200 border-violet-400/25 bg-violet-500/10';
  return 'text-emerald-300 border-emerald-400/25 bg-emerald-500/10';
}

function cloneMonsterSnapshot(monster: Monster): Monster {
  return { ...monster, abilities: monster.abilities.map((ability) => ({ ...ability })) };
}

export default function EncountersView({ focusRequest, onFocusHandled }: { focusRequest?: ContentFocusRequest | null; onFocusHandled?: () => void }) {
  const {
    campaignData,
    selectedEncounterId,
    selectEncounter,
    addEncounter,
    updateEncounter,
    removeEncounter,
    addCombat,
    setCurrentSection,
  } = useCampaignStore();
  const { monsters: sourceMonsters } = useSourceMonsters();
  const { parties, partyCharacters } = usePartyCampaigns();
  const customMonsters = campaignData.customMonsters;
  const encounters = campaignData.encounters;
  const selected = encounters.find(({ id }) => id === selectedEncounterId) ?? null;
  const [partyCharacterToAdd, setPartyCharacterToAdd] = useState('');
  const allMonsters = useMemo(() => [...sourceMonsters, ...customMonsters], [sourceMonsters, customMonsters]);
  const gmPartyIDs = useMemo(() => new Set(parties.filter(({ role }) => role === 'gm').map(({ id }) => id)), [parties]);
  const availablePartyCharacters = useMemo(() => partyCharacters.filter(({ partyId }) => gmPartyIDs.has(partyId)), [gmPartyIDs, partyCharacters]);
  const liveSelected = useMemo(() => selected ? synchronizeEncounterPartyCharacters(selected, availablePartyCharacters) : null, [availablePartyCharacters, selected]);

  useEffect(() => {
    if (!selectedEncounterId && encounters[0]) selectEncounter(encounters[0].id);
  }, [encounters, selectEncounter, selectedEncounterId]);

  const createEncounter = () => {
    const encounter: Encounter = {
      id: generateUUID(),
      name: `Encounter ${encounters.length + 1}`,
      partyLevels: [1, 1, 1, 1],
      entries: [],
      notes: '',
    };
    addEncounter(encounter);
  };

  useEffect(() => {
    if (focusRequest?.kind !== 'encounter') return;
    if (focusRequest.id && encounters.some(({ id }) => id === focusRequest.id)) selectEncounter(focusRequest.id);
    else createEncounter();
    onFocusHandled?.();
  }, [encounters, focusRequest, onFocusHandled, selectEncounter]);

  const update = (changes: Partial<Encounter>) => {
    if (selected) updateEncounter({ ...selected, ...changes });
  };

  const addMonster = (monsterID: string) => {
    if (!selected || !monsterID) return;
    const monster = allMonsters.find(({ id }) => id === monsterID);
    if (!monster) return;
    const existing = selected.entries.find(({ monster: entryMonster }) => entryMonster.id === monster.id);
    if (existing) {
      update({ entries: selected.entries.map((entry) => entry.id === existing.id ? { ...entry, count: entry.count + 1 } : entry) });
    } else {
      update({ entries: [...selected.entries, { id: generateUUID(), monster: cloneMonsterSnapshot(monster), count: 1 }] });
    }
  };

  const addPartyCharacter = () => {
    if (!selected || !partyCharacterToAdd) return;
    const partyCharacter = availablePartyCharacters.find(({ partyId, memberId }) => `${partyId}:${memberId}` === partyCharacterToAdd);
    if (!partyCharacter) return;
    const existing = (selected.partyCharacters ?? []).some(({ partyId, memberId }) => partyId === partyCharacter.partyId && memberId === partyCharacter.memberId);
    if (existing) return;
    const hasOnlyDefaultPlaceholders = (selected.partyCharacters ?? []).length === 0
      && selected.partyLevels.length === 4
      && selected.partyLevels.every((level) => level === 1);
    update({
      partyLevels: hasOnlyDefaultPlaceholders ? [] : selected.partyLevels,
      partyCharacters: [...(selected.partyCharacters ?? []), {
        id: generateUUID(),
        partyId: partyCharacter.partyId,
        memberId: partyCharacter.memberId,
        partyName: partyCharacter.partyName,
        memberName: partyCharacter.memberName,
        character: partyCharacter.character,
      }],
    });
    setPartyCharacterToAdd('');
  };

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)] lg:h-full lg:flex-row lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Encounters</h1>
            <p className="text-xs text-slate-500">Build with DC20 encounter budgets</p>
          </div>
          <button type="button" onClick={createEncounter} className="btn-primary text-sm font-bold">+ New</button>
        </div>
        <div className="mt-5 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
          {encounters.length === 0 && (
            <button type="button" onClick={createEncounter} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first encounter</button>
          )}
          {encounters.map((encounter) => {
            const liveEncounter = synchronizeEncounterPartyCharacters(encounter, availablePartyCharacters);
            const metrics = encounterMetrics(liveEncounter);
            return (
              <button
                type="button"
                key={encounter.id}
                onClick={() => selectEncounter(encounter.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedEncounterId === encounter.id ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
              >
                <div className="font-bold text-slate-100">{encounter.name}</div>
                <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{liveEncounter.partyCharacters?.length ?? 0} linked PCs • {encounter.entries.reduce((sum, entry) => sum + entry.count, 0)} creatures</span><span>{metrics.difficulty}</span></div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {!selected && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select an encounter or create a new one.</div>}
        {liveSelected && <EncounterEditor
          encounter={liveSelected}
          sourceMonsters={sourceMonsters}
          customMonsters={customMonsters}
          partyCharacters={availablePartyCharacters}
          partyCharacterToAdd={partyCharacterToAdd}
          onPartyCharacterChoice={setPartyCharacterToAdd}
          onAddMonster={addMonster}
          onAddPartyCharacter={addPartyCharacter}
          onUpdate={update}
          onDelete={() => {
            if (window.confirm(`Delete ${liveSelected.name}? Saved combats created from it will remain.`)) removeEncounter(liveSelected.id);
          }}
          onStartCombat={() => {
            addCombat(combatFromEncounter(liveSelected));
            setCurrentSection('Combat');
          }}
        />}
      </main>
    </div>
  );
}

function percentage(current: number, maximum: number): number {
  if (maximum <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / maximum) * 100)));
}

function characterReadiness(character: Character): { label: string; className: string } {
  const hpRatio = percentage(character.healthPoints, character.maxHealthPoints);
  const resourceRatios = [
    character.maxStamina > 0 ? percentage(character.stamina, character.maxStamina) : 100,
    character.maxManaPoints > 0 ? percentage(character.manaPoints, character.maxManaPoints) : 100,
    character.maxAP > 0 ? percentage(character.currentAP, character.maxAP) : 100,
  ];
  if (character.healthPoints <= 0) return { label: 'Down', className: 'bg-red-500/15 text-red-300' };
  if (hpRatio <= 25) return { label: 'Critical', className: 'bg-red-500/15 text-red-300' };
  if (hpRatio <= 50) return { label: 'Bloodied', className: 'bg-orange-500/15 text-orange-300' };
  if (resourceRatios.some((ratio) => ratio <= 25)) return { label: 'Low Resources', className: 'bg-amber-500/15 text-amber-300' };
  if (hpRatio < 100 || resourceRatios.some((ratio) => ratio < 100)) return { label: 'Partially Spent', className: 'bg-violet-500/15 text-violet-200' };
  return { label: 'Ready', className: 'bg-emerald-500/15 text-emerald-300' };
}

function ReadinessResource({ label, current, maximum, color }: { label: string; current: number; maximum: number; color: string }) {
  const filled = percentage(current, maximum);
  return <div className="min-w-0"><div className="flex items-center justify-between gap-2 text-xs"><span className="font-bold text-slate-400">{label}</span><span className="font-black text-slate-200">{maximum > 0 ? `${current}/${maximum}` : '—'}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${color}`} style={{ width: `${filled}%` }} /></div></div>;
}

function PartyReadinessPanel({ encounter }: { encounter: Encounter }) {
  const linkedCharacters = encounter.partyCharacters ?? [];
  const totals = partyReadinessMetrics(encounter);
  const statuses = linkedCharacters.map(({ character }) => characterReadiness(character));
  const overall = statuses.some(({ label }) => label === 'Down') ? { label: 'Member Down', className: 'bg-red-500/15 text-red-300' }
    : statuses.some(({ label }) => label === 'Critical') ? { label: 'Critical', className: 'bg-red-500/15 text-red-300' }
      : statuses.some(({ label }) => label === 'Bloodied') ? { label: 'Wounded', className: 'bg-orange-500/15 text-orange-300' }
        : statuses.some(({ label }) => label === 'Low Resources') ? { label: 'Low Resources', className: 'bg-amber-500/15 text-amber-300' }
          : statuses.some(({ label }) => label === 'Partially Spent') ? { label: 'Partially Spent', className: 'bg-violet-500/15 text-violet-200' }
            : { label: linkedCharacters.length > 0 ? 'Ready' : 'No Live Sheets', className: linkedCharacters.length > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400' };

  return <section className="rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-950/20 via-slate-900/75 to-slate-950/75 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Live Campaign Data</p><h2 className="mt-1 text-lg font-black text-white">Party Readiness</h2><p className="mt-1 text-sm text-slate-500">Current resources from the campaign characters linked above.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-black ${overall.className}`}>{overall.label}</span></div>
    {linkedCharacters.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Add campaign characters to see live health and resource readiness. Manual PC levels contribute to the official encounter budget but do not contain character-sheet resources.</div> : <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ReadinessResource label="Party HP" current={totals.currentHP} maximum={totals.maxHP} color="bg-rose-500" /><ReadinessResource label="Stamina" current={totals.currentStamina} maximum={totals.maxStamina} color="bg-sky-500" /><ReadinessResource label="Mana" current={totals.currentMana} maximum={totals.maxMana} color="bg-violet-500" /><ReadinessResource label="Action Points" current={totals.currentAP} maximum={totals.maxAP} color="bg-emerald-500" /></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{linkedCharacters.map((partyCharacter, index) => { const character = partyCharacter.character; const status = statuses[index]; return <article key={partyCharacter.id} className="rounded-xl border border-white/8 bg-slate-950/55 p-4"><div className="flex items-center gap-3"><CharacterAvatar image={character.avatarDataURL} name={character.name} className="w-12 shrink-0" /><div className="min-w-0 grow"><div className="truncate font-black text-slate-100">{character.name}</div><div className="text-xs text-slate-500">Level {character.level} {character.class} • {partyCharacter.partyName}</div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${status.className}`}>{status.label}</span></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><ReadinessResource label="HP" current={character.healthPoints} maximum={character.maxHealthPoints} color="bg-rose-500" /><ReadinessResource label="SP" current={character.stamina} maximum={character.maxStamina} color="bg-sky-500" /><ReadinessResource label="MP" current={character.manaPoints} maximum={character.maxManaPoints} color="bg-violet-500" /><ReadinessResource label="AP" current={character.currentAP} maximum={character.maxAP} color="bg-emerald-500" /></div></article>; })}</div>
    </>}
    <p className="mt-4 text-xs leading-5 text-slate-500">Readiness is an advisory snapshot only. The DC20 difficulty thresholds below continue to use party level.</p>
  </section>;
}

function EncounterMonsterCard({ monster, isCustom, currentCount, onAdd }: { monster: Monster; isCustom: boolean; currentCount: number; onAdd: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="min-w-0 rounded-xl border border-white/8 bg-slate-950/55 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-100">{monster.name}</h3>{isCustom && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">Custom</span>}</div><p className="mt-1 text-xs text-slate-500">{monsterLevelLabel(monster.level)} • {monster.type} • {monsterDisplayRole(monster)} • {monster.creatureType || 'Creature'}</p><p className="mt-1 text-xs font-bold text-violet-300">{formatBudget(monsterBudget(monster))} budget each{currentCount > 0 ? ` • ${currentCount} in encounter` : ''}</p></div><button type="button" onClick={onAdd} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-sm font-black text-white hover:bg-violet-500">{currentCount > 0 ? '+ Add Another' : '+ Add'}</button></div>
    <details className="group mt-3 rounded-lg border border-white/5 bg-white/[0.025]" onToggle={(event) => setExpanded(event.currentTarget.open)}><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-black text-slate-300"><span>Preview stat block</span><span className="text-violet-300 group-open:hidden">More</span><span className="hidden text-violet-300 group-open:inline">Less</span></summary>{expanded && <div className="border-t border-white/5 p-3"><div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">{[['HP', monster.hp], ['PD', monster.physicalDefense], ['AD', monster.arcaneDefense], ['Attack', `+${monster.attackBonus}`], ['Save DC', monster.saveDC], ['Speed', monster.speed]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-900 p-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-600">{label}</div><div className="font-black text-slate-200">{value}</div></div>)}</div>{monster.descriptionText && <p className="mt-3 text-sm leading-6 text-slate-400"><RuleAwareText text={monster.descriptionText} /></p>}{monster.abilities.length > 0 && <div className="mt-3 space-y-2">{monster.abilities.map((ability) => <div key={ability.id} className="rounded-lg bg-slate-900/70 p-3"><div className="font-bold text-slate-200">{ability.name}{ability.cost ? <span className="ml-2 text-xs text-violet-300">{ability.cost}</span> : null}</div><p className="mt-1 text-xs leading-5 text-slate-400"><RuleAwareText text={ability.details} references={ability.ruleReferences} /></p></div>)}</div>}</div>}</details>
  </article>;
}

function EncounterEditor({ encounter, sourceMonsters, customMonsters, partyCharacters, partyCharacterToAdd, onPartyCharacterChoice, onAddMonster, onAddPartyCharacter, onUpdate, onDelete, onStartCombat }: {
  encounter: Encounter;
  sourceMonsters: Monster[];
  customMonsters: Monster[];
  partyCharacters: PartyCharacterEntry[];
  partyCharacterToAdd: string;
  onPartyCharacterChoice: (id: string) => void;
  onAddMonster: (monsterID: string) => void;
  onAddPartyCharacter: () => void;
  onUpdate: (changes: Partial<Encounter>) => void;
  onDelete: () => void;
  onStartCombat: () => void;
}) {
  const metrics = encounterMetrics(encounter);
  const [monsterSearch, setMonsterSearch] = useState('');
  const [monsterLevel, setMonsterLevel] = useState('all');
  const [monsterRole, setMonsterRole] = useState('all');
  const [monsterType, setMonsterType] = useState('all');
  const [monsterCollection, setMonsterCollection] = useState('all');
  const browserEntries = useMemo(() => [
    ...sourceMonsters.map((monster) => ({ monster, collection: `source:${monster.sourceBook || 'Sourcebook Monsters'}`, isCustom: false })),
    ...customMonsters.map((monster) => ({ monster, collection: 'custom', isCustom: true })),
  ], [customMonsters, sourceMonsters]);
  const levelOptions = useMemo(() => Array.from(new Set(browserEntries.map(({ monster }) => monster.level))).sort((left, right) => left - right), [browserEntries]);
  const roleOptions = useMemo(() => Array.from(new Set(browserEntries.map(({ monster }) => monsterDisplayRole(monster)))).sort(), [browserEntries]);
  const typeOptions = useMemo(() => Array.from(new Set(browserEntries.map(({ monster }) => monster.type))).sort(), [browserEntries]);
  const sourcebookOptions = useMemo(() => Array.from(new Set(sourceMonsters.map(({ sourceBook }) => sourceBook || 'Sourcebook Monsters'))).sort(), [sourceMonsters]);
  const filteredMonsters = useMemo(() => {
    const query = monsterSearch.trim().toLowerCase();
    return browserEntries.filter(({ monster, collection, isCustom }) => {
      if (monsterLevel !== 'all' && monster.level !== Number(monsterLevel)) return false;
      if (monsterRole !== 'all' && monsterDisplayRole(monster) !== monsterRole) return false;
      if (monsterType !== 'all' && monster.type !== monsterType) return false;
      if (monsterCollection === 'sourcebooks' && isCustom) return false;
      if (!['all', 'sourcebooks'].includes(monsterCollection) && collection !== monsterCollection) return false;
      if (!query) return true;
      return [
        monster.name,
        monster.creatureType,
        monsterDisplayRole(monster),
        monster.type,
        monster.sourceBook ?? '',
        monster.descriptionText,
        monster.tactics,
        monster.lore,
        ...monster.abilities.flatMap(({ name, details }) => [name, details]),
      ].some((value) => value.toLowerCase().includes(query));
    }).sort((left, right) => left.monster.name.localeCompare(right.monster.name));
  }, [browserEntries, monsterCollection, monsterLevel, monsterRole, monsterSearch, monsterType]);
  const filtersActive = Boolean(monsterSearch.trim()) || [monsterLevel, monsterRole, monsterType, monsterCollection].some((value) => value !== 'all');
  const thresholds = [
    ['Easy', metrics.easyBudget],
    ['Medium', metrics.mediumBudget],
    ['Hard', metrics.hardBudget],
    ['Very Hard', metrics.veryHardBudget],
    ['Deadly', metrics.deadlyBudget],
  ] as const;
  const setEntryCount = (id: string, count: number) => onUpdate({
    entries: encounter.entries.map((entry) => entry.id === id ? { ...entry, count: Math.max(1, Math.trunc(count)) } : entry),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 grow basis-64">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Encounter Builder</div>
          <input
            className="mt-1 w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-white outline-none focus:text-violet-100 sm:text-4xl"
            value={encounter.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            aria-label="Encounter name"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onStartCombat} disabled={encounter.entries.length === 0 && (encounter.partyCharacters?.length ?? 0) === 0} className="btn-primary font-bold disabled:cursor-not-allowed disabled:opacity-40">Start Combat</button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-violet-200">Party Composition</h2>
            <p className="text-sm text-slate-500">Connected characters and manual guest levels both contribute to the encounter budget.</p>
          </div>
          <button type="button" onClick={() => onUpdate({ partyLevels: [...encounter.partyLevels, encounter.partyLevels.at(-1) ?? 1] })} className="rounded-lg border border-violet-400/30 px-3 py-2 text-sm font-bold text-violet-300 hover:bg-violet-500/10">+ Manual PC</button>
        </div>
        {partyCharacters.length > 0 && <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-950/15 p-4"><label className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">Add from a campaign you GM</label><div className="mt-2 flex flex-wrap gap-2"><select value={partyCharacterToAdd} onChange={(event) => onPartyCharacterChoice(event.target.value)} className={`${inputClass} min-w-0 grow basis-64`}><option value="">Choose a shared character…</option>{partyCharacters.map((entry) => { const selected = (encounter.partyCharacters ?? []).some(({ partyId, memberId }) => partyId === entry.partyId && memberId === entry.memberId); return <option key={`${entry.partyId}:${entry.memberId}`} value={`${entry.partyId}:${entry.memberId}`} disabled={selected}>{entry.character.name} — Level {entry.character.level} {entry.character.class} • {entry.partyName}{selected ? ' (Added)' : ''}</option>; })}</select><button type="button" onClick={onAddPartyCharacter} disabled={!partyCharacterToAdd} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Add PC</button></div><p className="mt-2 text-xs text-slate-500">Adding the first connected PC replaces untouched four-character level-1 placeholders. Live sheet data is used when combat starts.</p></div>}
        {partyCharacters.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Create or join a connected campaign as GM to select shared player characters here.</p>}
        {(encounter.partyCharacters?.length ?? 0) > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2">{encounter.partyCharacters?.map((partyCharacter) => <article key={partyCharacter.id} className="flex items-center gap-3 rounded-xl border border-emerald-400/15 bg-slate-950/60 p-3"><CharacterAvatar image={partyCharacter.character.avatarDataURL} name={partyCharacter.character.name} className="w-14 shrink-0" /><div className="min-w-0 grow"><div className="truncate font-black text-slate-100">{partyCharacter.character.name}</div><div className="mt-0.5 text-xs text-slate-500">Level {partyCharacter.character.level} {partyCharacter.character.class} • {partyCharacter.partyName}</div><div className="mt-1 text-xs font-bold text-emerald-300">HP {partyCharacter.character.healthPoints}/{partyCharacter.character.maxHealthPoints}</div></div><button type="button" onClick={() => onUpdate({ partyCharacters: encounter.partyCharacters?.filter(({ id }) => id !== partyCharacter.id) ?? [] })} className="rounded-lg px-2 py-1 text-sm font-bold text-red-300 hover:bg-red-500/10" aria-label={`Remove ${partyCharacter.character.name}`}>Remove</button></article>)}</div>}
        <div className="mt-4 flex flex-wrap gap-3">
          {encounter.partyLevels.map((level, index) => (
            <div key={`${index}-${encounter.partyLevels.length}`} className="flex items-center rounded-xl border border-white/8 bg-slate-950/60 p-1">
              <span className="pl-2 text-xs font-bold text-slate-500">Manual PC {index + 1}</span>
              <input
                type="number"
                min={1}
                max={20}
                value={level}
                aria-label={`Party member ${index + 1} level`}
                onChange={(event) => onUpdate({ partyLevels: encounter.partyLevels.map((existing, levelIndex) => levelIndex === index ? Math.min(20, Math.max(1, Number(event.target.value))) : existing) })}
                className="w-14 bg-transparent px-2 py-1 text-center font-black text-violet-200 outline-none"
              />
              <button type="button" onClick={() => onUpdate({ partyLevels: encounter.partyLevels.filter((_, levelIndex) => levelIndex !== index) })} className="rounded-lg px-2 py-1 text-slate-600 hover:bg-red-500/10 hover:text-red-300" aria-label={`Remove party member ${index + 1}`}>×</button>
            </div>
          ))}
        </div>
      </section>

      <PartyReadinessPanel encounter={encounter} />

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className={`rounded-xl border p-4 text-center ${budgetColor(metrics.difficulty)}`}>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em]">Current</div>
          <div className="mt-1 text-2xl font-black">{formatBudget(metrics.monsterBudget)}</div>
          <div className="mt-1 text-xs font-bold">{metrics.difficulty}</div>
        </div>
        {thresholds.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/8 bg-slate-950/55 p-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-black text-slate-200">{formatBudget(value)}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black text-violet-200">Monster Browser</h2><p className="mt-1 text-sm text-slate-500">Search sourcebooks and custom monsters, then preview their statistics before adding them.</p></div><div className="text-xs font-bold text-slate-500">{filteredMonsters.length} of {browserEntries.length} shown</div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-[minmax(220px,2fr)_repeat(4,minmax(120px,1fr))]">
          <label className="sm:col-span-2 2xl:col-span-1"><span className="sr-only">Search monsters</span><input type="search" value={monsterSearch} onChange={(event) => setMonsterSearch(event.target.value)} className={`${inputClass} w-full`} placeholder="Search names, creatures, abilities…" aria-label="Search encounter monsters" /></label>
          <label><span className="sr-only">Monster level</span><select value={monsterLevel} onChange={(event) => setMonsterLevel(event.target.value)} className={`${inputClass} w-full`} aria-label="Filter monsters by level"><option value="all">All levels</option>{levelOptions.map((level) => <option key={level} value={level}>{monsterLevelLabel(level)}</option>)}</select></label>
          <label><span className="sr-only">Monster role</span><select value={monsterRole} onChange={(event) => setMonsterRole(event.target.value)} className={`${inputClass} w-full`} aria-label="Filter monsters by role"><option value="all">All roles</option>{roleOptions.map((role) => <option key={role}>{role}</option>)}</select></label>
          <label><span className="sr-only">Monster type</span><select value={monsterType} onChange={(event) => setMonsterType(event.target.value)} className={`${inputClass} w-full`} aria-label="Filter monsters by type"><option value="all">All types</option>{typeOptions.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span className="sr-only">Monster collection</span><select value={monsterCollection} onChange={(event) => setMonsterCollection(event.target.value)} className={`${inputClass} w-full`} aria-label="Filter monsters by collection"><option value="all">All collections</option><option value="sourcebooks">All sourcebooks</option>{customMonsters.length > 0 && <option value="custom">Custom monsters</option>}<optgroup label="Sourcebooks">{sourcebookOptions.map((sourcebook) => <option key={sourcebook} value={`source:${sourcebook}`}>{sourcebook}</option>)}</optgroup></select></label>
        </div>
        {filtersActive && <div className="mt-3 flex justify-end"><button type="button" onClick={() => { setMonsterSearch(''); setMonsterLevel('all'); setMonsterRole('all'); setMonsterType('all'); setMonsterCollection('all'); }} className="rounded-lg px-3 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/10">Clear filters</button></div>}
        <div className="mt-4 grid gap-3 lg:max-h-[42rem] lg:grid-cols-2 lg:overflow-y-auto lg:pr-2">
          {filteredMonsters.map(({ monster, isCustom }) => <EncounterMonsterCard key={`${isCustom ? 'custom' : 'source'}:${monster.id}`} monster={monster} isCustom={isCustom} currentCount={encounter.entries.find(({ monster: existing }) => existing.id === monster.id)?.count ?? 0} onAdd={() => onAddMonster(monster.id)} />)}
          {filteredMonsters.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500 lg:col-span-2">No monsters match these filters. Clear one or more filters to broaden the browser.</div>}
        </div>

        <div className="mt-6 border-t border-white/8 pt-5"><h3 className="font-black text-violet-200">Encounter Lineup</h3><p className="mt-1 text-xs text-slate-500">Adjust quantities here. Monster snapshots remain stable if the source catalog changes later.</p></div>
        <div className="mt-4 space-y-3">
          {encounter.entries.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Choose creatures from the audited sourcebook library or your custom directory.</div>}
          {encounter.entries.map((entry) => (
            <div key={entry.id} className="grid items-center gap-3 rounded-xl border border-white/8 bg-slate-950/55 p-4 md:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <div className="font-black text-slate-100">{entry.monster.name}</div>
                <div className="mt-1 text-xs text-slate-500">{monsterLevelLabel(entry.monster.level)} • {entry.monster.type} • {monsterDisplayRole(entry.monster)} • {formatBudget(monsterBudget(entry.monster))} budget each</div>
              </div>
              <div className="flex items-center rounded-lg border border-white/8 bg-slate-900 p-1">
                <button type="button" onClick={() => setEntryCount(entry.id, entry.count - 1)} className="h-8 w-8 rounded text-slate-300 hover:bg-white/5">−</button>
                <input type="number" min={1} value={entry.count} onChange={(event) => setEntryCount(entry.id, Number(event.target.value))} className="w-12 bg-transparent text-center font-black text-violet-200 outline-none" aria-label={`${entry.monster.name} count`} />
                <button type="button" onClick={() => setEntryCount(entry.id, entry.count + 1)} className="h-8 w-8 rounded text-slate-300 hover:bg-white/5">+</button>
              </div>
              <div className="min-w-20 text-right text-sm font-bold text-violet-300">{formatBudget(monsterBudget(entry.monster) * entry.count)} pts</div>
              <button type="button" onClick={() => onUpdate({ entries: encounter.entries.filter((existing) => existing.id !== entry.id) })} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <label className="block rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <span className="text-lg font-black text-violet-200">Encounter Notes</span>
        <textarea className={`${inputClass} mt-3 min-h-28 w-full resize-y`} value={encounter.notes} onChange={(event) => onUpdate({ notes: event.target.value })} placeholder="Terrain, objectives, reinforcements, treasure…" />
        {encounter.notes.trim() && <details className="mt-2 rounded-lg border border-violet-400/15 bg-violet-500/5 p-3"><summary className="cursor-pointer text-xs font-black text-violet-200">Rules-aware preview</summary><p className="mt-2 whitespace-pre-wrap text-sm normal-case leading-6 text-slate-300"><RuleAwareText text={encounter.notes} /></p></details>}
      </label>
    </div>
  );
}
