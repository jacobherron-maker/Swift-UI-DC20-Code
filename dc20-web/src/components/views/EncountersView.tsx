import { useEffect, useMemo, useState } from 'react';
import { usePartyCampaigns } from '../../cloud/PartyCampaignContext';
import type { PartyCharacterEntry } from '../../cloud/PartyCampaignContext';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { useCampaignStore } from '../../store/campaignStore';
import type { Encounter, Monster } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import { combatFromEncounter, encounterMetrics, monsterBudget, monsterLevelLabel } from '../../utils/monsterRules';
import { CharacterAvatar } from '../character/CharacterAvatar';

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

function withLivePartyCharacters(encounter: Encounter, availableCharacters: PartyCharacterEntry[]): Encounter {
  return {
    ...encounter,
    partyCharacters: (encounter.partyCharacters ?? []).map((partyCharacter) => {
      const live = availableCharacters.find(({ partyId, memberId }) => partyId === partyCharacter.partyId && memberId === partyCharacter.memberId);
      return live ? {
        ...partyCharacter,
        partyName: live.partyName,
        memberName: live.memberName,
        character: live.character,
      } : partyCharacter;
    }),
  };
}

export default function EncountersView() {
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
  const [monsterToAdd, setMonsterToAdd] = useState('');
  const [partyCharacterToAdd, setPartyCharacterToAdd] = useState('');
  const allMonsters = useMemo(() => [...sourceMonsters, ...customMonsters], [sourceMonsters, customMonsters]);
  const gmPartyIDs = useMemo(() => new Set(parties.filter(({ role }) => role === 'gm').map(({ id }) => id)), [parties]);
  const availablePartyCharacters = useMemo(() => partyCharacters.filter(({ partyId }) => gmPartyIDs.has(partyId)), [gmPartyIDs, partyCharacters]);
  const liveSelected = useMemo(() => selected ? withLivePartyCharacters(selected, availablePartyCharacters) : null, [availablePartyCharacters, selected]);

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

  const update = (changes: Partial<Encounter>) => {
    if (selected) updateEncounter({ ...selected, ...changes });
  };

  const addMonster = () => {
    if (!selected || !monsterToAdd) return;
    const monster = allMonsters.find(({ id }) => id === monsterToAdd);
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
            const liveEncounter = withLivePartyCharacters(encounter, availablePartyCharacters);
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
          monsterToAdd={monsterToAdd}
          partyCharacters={availablePartyCharacters}
          partyCharacterToAdd={partyCharacterToAdd}
          onMonsterChoice={setMonsterToAdd}
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

function EncounterEditor({ encounter, sourceMonsters, customMonsters, monsterToAdd, partyCharacters, partyCharacterToAdd, onMonsterChoice, onPartyCharacterChoice, onAddMonster, onAddPartyCharacter, onUpdate, onDelete, onStartCombat }: {
  encounter: Encounter;
  sourceMonsters: Monster[];
  customMonsters: Monster[];
  monsterToAdd: string;
  partyCharacters: PartyCharacterEntry[];
  partyCharacterToAdd: string;
  onMonsterChoice: (id: string) => void;
  onPartyCharacterChoice: (id: string) => void;
  onAddMonster: () => void;
  onAddPartyCharacter: () => void;
  onUpdate: (changes: Partial<Encounter>) => void;
  onDelete: () => void;
  onStartCombat: () => void;
}) {
  const metrics = encounterMetrics(encounter);
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
        <h2 className="text-lg font-black text-violet-200">Add Monsters</h2>
        <div className="mt-4 flex gap-3">
          <select className={`${inputClass} min-w-0 grow`} value={monsterToAdd} onChange={(event) => onMonsterChoice(event.target.value)}>
            <option value="">Choose a monster…</option>
            <optgroup label="Sourcebook Monsters">
              {sourceMonsters.map((monster) => <option key={monster.id} value={monster.id}>{monster.name} — {monsterLevelLabel(monster.level)} {monster.type} {monster.role}</option>)}
            </optgroup>
            {customMonsters.length > 0 && <optgroup label="Custom Monsters">
              {customMonsters.map((monster) => <option key={monster.id} value={monster.id}>{monster.name} — {monsterLevelLabel(monster.level)} {monster.type} {monster.role}</option>)}
            </optgroup>}
          </select>
          <button type="button" onClick={onAddMonster} disabled={!monsterToAdd} className="btn-primary shrink-0 font-bold disabled:cursor-not-allowed disabled:opacity-40">Add</button>
        </div>

        <div className="mt-5 space-y-3">
          {encounter.entries.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Choose creatures from the audited sourcebook library or your custom directory.</div>}
          {encounter.entries.map((entry) => (
            <div key={entry.id} className="grid items-center gap-3 rounded-xl border border-white/8 bg-slate-950/55 p-4 md:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <div className="font-black text-slate-100">{entry.monster.name}</div>
                <div className="mt-1 text-xs text-slate-500">{monsterLevelLabel(entry.monster.level)} • {entry.monster.type} • {entry.monster.role} • {formatBudget(monsterBudget(entry.monster))} budget each</div>
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
      </label>
    </div>
  );
}
