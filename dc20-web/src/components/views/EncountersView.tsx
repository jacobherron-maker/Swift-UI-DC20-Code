import { useEffect, useMemo, useState } from 'react';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { useCampaignStore } from '../../store/campaignStore';
import type { Encounter, Monster } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import { combatFromEncounter, encounterMetrics, monsterBudget, monsterLevelLabel } from '../../utils/monsterRules';

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
  const customMonsters = campaignData.customMonsters;
  const encounters = campaignData.encounters;
  const selected = encounters.find(({ id }) => id === selectedEncounterId) ?? null;
  const [monsterToAdd, setMonsterToAdd] = useState('');
  const allMonsters = useMemo(() => [...sourceMonsters, ...customMonsters], [sourceMonsters, customMonsters]);

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

  return (
    <div className="flex min-h-full bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)]">
      <aside className="w-80 shrink-0 border-r border-white/5 bg-slate-950/45 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Encounters</h1>
            <p className="text-xs text-slate-500">Build with DC20 encounter budgets</p>
          </div>
          <button type="button" onClick={createEncounter} className="btn-primary text-sm font-bold">+ New</button>
        </div>
        <div className="mt-5 space-y-2">
          {encounters.length === 0 && (
            <button type="button" onClick={createEncounter} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first encounter</button>
          )}
          {encounters.map((encounter) => {
            const metrics = encounterMetrics(encounter);
            return (
              <button
                type="button"
                key={encounter.id}
                onClick={() => selectEncounter(encounter.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedEncounterId === encounter.id ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
              >
                <div className="font-bold text-slate-100">{encounter.name}</div>
                <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{encounter.entries.reduce((sum, entry) => sum + entry.count, 0)} creatures</span><span>{metrics.difficulty}</span></div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        {!selected && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select an encounter or create a new one.</div>}
        {selected && <EncounterEditor
          encounter={selected}
          sourceMonsters={sourceMonsters}
          customMonsters={customMonsters}
          monsterToAdd={monsterToAdd}
          onMonsterChoice={setMonsterToAdd}
          onAddMonster={addMonster}
          onUpdate={update}
          onDelete={() => {
            if (window.confirm(`Delete ${selected.name}? Saved combats created from it will remain.`)) removeEncounter(selected.id);
          }}
          onStartCombat={() => {
            addCombat(combatFromEncounter(selected));
            setCurrentSection('Combat');
          }}
        />}
      </main>
    </div>
  );
}

function EncounterEditor({ encounter, sourceMonsters, customMonsters, monsterToAdd, onMonsterChoice, onAddMonster, onUpdate, onDelete, onStartCombat }: {
  encounter: Encounter;
  sourceMonsters: Monster[];
  customMonsters: Monster[];
  monsterToAdd: string;
  onMonsterChoice: (id: string) => void;
  onAddMonster: () => void;
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
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-72 grow">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Encounter Builder</div>
          <input
            className="mt-1 w-full border-0 bg-transparent p-0 text-4xl font-black tracking-tight text-white outline-none focus:text-violet-100"
            value={encounter.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            aria-label="Encounter name"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onStartCombat} disabled={encounter.entries.length === 0} className="btn-primary font-bold disabled:cursor-not-allowed disabled:opacity-40">Start Combat</button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-violet-200">Party Levels</h2>
            <p className="text-sm text-slate-500">Each character level contributes directly to the encounter budget.</p>
          </div>
          <button type="button" onClick={() => onUpdate({ partyLevels: [...encounter.partyLevels, encounter.partyLevels.at(-1) ?? 1] })} className="rounded-lg border border-violet-400/30 px-3 py-2 text-sm font-bold text-violet-300 hover:bg-violet-500/10">+ Party Member</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {encounter.partyLevels.map((level, index) => (
            <div key={`${index}-${encounter.partyLevels.length}`} className="flex items-center rounded-xl border border-white/8 bg-slate-950/60 p-1">
              <span className="pl-2 text-xs font-bold text-slate-500">PC {index + 1}</span>
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
