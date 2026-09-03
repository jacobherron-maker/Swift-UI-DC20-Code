import { useEffect, useState } from 'react';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { useCampaignStore } from '../../store/campaignStore';
import type { Combatant, CombatantTeam, SavedCombat } from '../../types/models';
import { CombatantTeamValues } from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import { combatantFromCharacter, combatantFromMonster, combatFromEncounter } from '../../utils/monsterRules';

const inputClass = 'rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';

function newCombat(name: string): SavedCombat {
  return {
    id: generateUUID(),
    name,
    combatants: [],
    round: 1,
    firstTeam: CombatantTeamValues.HEROES,
    notes: '',
  };
}

export default function CombatView() {
  const {
    campaignData,
    characters,
    selectedCombatId,
    selectCombat,
    addCombat,
    updateCombat,
    removeCombat,
  } = useCampaignStore();
  const { monsters: sourceMonsters } = useSourceMonsters();
  const [participantChoice, setParticipantChoice] = useState('');
  const [encounterChoice, setEncounterChoice] = useState('');
  const combats = campaignData.combats;
  const selected = combats.find(({ id }) => id === selectedCombatId) ?? null;

  useEffect(() => {
    if (!selectedCombatId && combats[0]) selectCombat(combats[0].id);
  }, [combats, selectCombat, selectedCombatId]);

  const createCombat = () => addCombat(newCombat(`Combat ${combats.length + 1}`));
  const addParticipant = () => {
    if (!selected || !participantChoice) return;
    const [kind, id] = participantChoice.split(':');
    let combatant: Combatant | null = null;
    if (kind === 'character') {
      const character = characters.find((entry) => entry.id === id);
      if (character) combatant = combatantFromCharacter(character);
    } else {
      const monster = (kind === 'source' ? sourceMonsters : campaignData.customMonsters)
        .find((entry) => entry.id === id);
      if (monster) {
        const existingCount = selected.combatants.filter(({ sourceMonsterID }) => sourceMonsterID === id).length;
        combatant = combatantFromMonster(monster, existingCount > 0 ? `${monster.name} ${existingCount + 1}` : monster.name);
      }
    }
    if (combatant) updateCombat({ ...selected, combatants: [...selected.combatants, combatant] });
  };

  const launchEncounter = () => {
    const encounter = campaignData.encounters.find(({ id }) => id === encounterChoice);
    if (encounter) addCombat(combatFromEncounter(encounter));
  };

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)] lg:h-full lg:flex-row lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Combat</h1>
            <p className="text-xs text-slate-500">Persistent live combat trackers</p>
          </div>
          <button type="button" onClick={createCombat} className="btn-primary text-sm font-bold">+ New</button>
        </div>
        {campaignData.encounters.length > 0 && (
          <div className="mt-5 rounded-xl border border-violet-400/15 bg-violet-500/5 p-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300">Start from Encounter</label>
            <select className={`${inputClass} mt-2 w-full`} value={encounterChoice} onChange={(event) => setEncounterChoice(event.target.value)}>
              <option value="">Choose encounter…</option>
              {campaignData.encounters.map((encounter) => <option key={encounter.id} value={encounter.id}>{encounter.name}</option>)}
            </select>
            <button type="button" disabled={!encounterChoice} onClick={launchEncounter} className="mt-2 w-full rounded-lg bg-violet-500/20 px-3 py-2 text-sm font-bold text-violet-200 hover:bg-violet-500/30 disabled:opacity-40">Create Combat</button>
          </div>
        )}
        <div className="mt-5 max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1 lg:max-h-none">
          {combats.length === 0 && <button type="button" onClick={createCombat} className="w-full rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first combat</button>}
          {combats.map((combat) => (
            <button
              type="button"
              key={combat.id}
              onClick={() => selectCombat(combat.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${combat.id === selectedCombatId ? 'border-violet-400/70 bg-violet-500/15' : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.05]'}`}
            >
              <div className="flex justify-between gap-3"><span className="font-bold text-slate-100">{combat.name}</span><span className="text-xs font-bold text-violet-300">Round {combat.round}</span></div>
              <div className="mt-1 text-xs text-slate-500">{combat.combatants.length} combatants</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {!selected && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select a saved combat or create a new one.</div>}
        {selected && (
          <CombatEditor
            combat={selected}
            participantChoice={participantChoice}
            setParticipantChoice={setParticipantChoice}
            sourceMonsters={sourceMonsters}
            customMonsters={campaignData.customMonsters}
            characters={characters}
            onAddParticipant={addParticipant}
            onUpdate={updateCombat}
            onDelete={() => {
              if (window.confirm(`Delete ${selected.name}?`)) removeCombat(selected.id);
            }}
          />
        )}
      </main>
    </div>
  );
}

function CombatEditor({ combat, participantChoice, setParticipantChoice, sourceMonsters, customMonsters, characters, onAddParticipant, onUpdate, onDelete }: {
  combat: SavedCombat;
  participantChoice: string;
  setParticipantChoice: (value: string) => void;
  sourceMonsters: ReturnType<typeof useSourceMonsters>['monsters'];
  customMonsters: ReturnType<typeof useCampaignStore.getState>['campaignData']['customMonsters'];
  characters: ReturnType<typeof useCampaignStore.getState>['characters'];
  onAddParticipant: () => void;
  onUpdate: (combat: SavedCombat) => void;
  onDelete: () => void;
}) {
  const update = (changes: Partial<SavedCombat>) => onUpdate({ ...combat, ...changes });
  const updateCombatant = (changed: Combatant) => update({
    combatants: combat.combatants.map((combatant) => combatant.id === changed.id ? changed : combatant),
  });
  const teams = Object.values(CombatantTeamValues);
  const nextRound = () => update({
    round: combat.round + 1,
    combatants: combat.combatants.map((combatant) => ({
      ...combatant,
      hasActed: false,
      ap: combatant.maxAP,
      currentReactionPoints: combatant.reactionPoints,
    })),
  });

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 grow basis-64">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Combat Tracker</div>
          <input className="mt-1 w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-white outline-none focus:text-violet-100 sm:text-4xl" value={combat.name} onChange={(event) => update({ name: event.target.value })} aria-label="Combat name" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => update({ round: Math.max(1, combat.round - 1) })} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-bold text-slate-200 hover:bg-white/10">←</button>
          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-5 py-2 text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300">Round</div>
            <div className="text-2xl font-black text-white">{combat.round}</div>
          </div>
          <button type="button" onClick={nextRound} className="btn-primary font-bold">Next Round →</button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <div className="flex flex-wrap gap-3">
          <select className={`${inputClass} min-w-0 grow basis-64`} value={participantChoice} onChange={(event) => setParticipantChoice(event.target.value)}>
            <option value="">Add a character or monster…</option>
            {characters.length > 0 && <optgroup label="Characters">
              {characters.map((character) => <option key={character.id} value={`character:${character.id}`}>{character.name || 'Unnamed Character'} — Level {character.level} {character.class}</option>)}
            </optgroup>}
            <optgroup label="Sourcebook Monsters">
              {sourceMonsters.map((monster) => <option key={monster.id} value={`source:${monster.id}`}>{monster.name} — Level {monster.level} {monster.role}</option>)}
            </optgroup>
            {customMonsters.length > 0 && <optgroup label="Custom Monsters">
              {customMonsters.map((monster) => <option key={monster.id} value={`custom:${monster.id}`}>{monster.name} — Level {monster.level} {monster.role}</option>)}
            </optgroup>}
          </select>
          <button type="button" onClick={onAddParticipant} disabled={!participantChoice} className="btn-primary shrink-0 font-bold disabled:opacity-40">+ Add Combatant</button>
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-400">
            First team
            <select className="bg-transparent py-2 font-bold text-slate-200 outline-none" value={combat.firstTeam} onChange={(event) => update({ firstTeam: event.target.value as CombatantTeam })}>
              {teams.map((team) => <option key={team}>{team}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="grid items-start gap-5 2xl:grid-cols-3">
        {teams.map((team) => {
          const combatants = combat.combatants.filter((combatant) => combatant.team === team);
          return (
            <section key={team} className={`rounded-2xl border bg-slate-900/60 p-4 ${team === CombatantTeamValues.HEROES ? 'border-blue-400/20' : team === CombatantTeamValues.ENEMIES ? 'border-red-400/20' : 'border-amber-400/20'}`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className={`text-lg font-black ${team === CombatantTeamValues.HEROES ? 'text-blue-300' : team === CombatantTeamValues.ENEMIES ? 'text-red-300' : 'text-amber-300'}`}>{team}</h2>
                <span className="text-xs text-slate-600">{combatants.length}</span>
              </div>
              <div className="space-y-3">
                {combatants.length === 0 && <div className="rounded-xl border border-dashed border-white/8 p-5 text-center text-sm text-slate-600">No {team.toLowerCase()} yet</div>}
                {combatants.map((combatant) => (
                  <CombatantCard
                    key={combatant.id}
                    combatant={combatant}
                    onChange={updateCombatant}
                    onRemove={() => update({ combatants: combat.combatants.filter(({ id }) => id !== combatant.id) })}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <label className="block rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <span className="text-lg font-black text-violet-200">Combat Notes</span>
        <textarea className={`${inputClass} mt-3 min-h-24 w-full resize-y`} value={combat.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Objectives, hazards, reminders…" />
      </label>
    </div>
  );
}

function ResourceControl({ label, value, max, min = 0, onChange }: {
  label: string;
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-slate-950/60 p-2">
      <div className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 grid grid-cols-[1.5rem_1fr_1.5rem] items-center">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="rounded text-slate-400 hover:bg-white/5 hover:text-white">−</button>
        <input type="number" value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} className="w-full bg-transparent text-center font-black text-slate-100 outline-none" aria-label={`${label} current value`} />
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="rounded text-slate-400 hover:bg-white/5 hover:text-white">+</button>
      </div>
      <div className="text-center text-[10px] text-slate-600">of {max}</div>
    </div>
  );
}

function CombatantCard({ combatant, onChange, onRemove }: {
  combatant: Combatant;
  onChange: (combatant: Combatant) => void;
  onRemove: () => void;
}) {
  const [condition, setCondition] = useState('');
  const teamOptions = Object.values(CombatantTeamValues);
  const healthPercent = Math.max(0, Math.min(100, combatant.hp / Math.max(1, combatant.maxHP) * 100));
  const addCondition = () => {
    const trimmed = condition.trim();
    if (!trimmed) return;
    onChange({ ...combatant, conditions: [...combatant.conditions, trimmed] });
    setCondition('');
  };

  return (
    <article className={`overflow-hidden rounded-xl border bg-slate-950/65 ${combatant.hasActed ? 'border-white/5 opacity-65' : 'border-white/10'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 grow">
            <input value={combatant.name} onChange={(event) => onChange({ ...combatant, name: event.target.value })} className="w-full bg-transparent font-black text-slate-100 outline-none focus:text-violet-200" aria-label="Combatant name" />
            <select value={combatant.team} onChange={(event) => onChange({ ...combatant, team: event.target.value as CombatantTeam })} className="mt-1 bg-transparent text-xs text-slate-500 outline-none">
              {teamOptions.map((team) => <option key={team}>{team}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-400">
            <input type="checkbox" checked={combatant.hasActed} onChange={(event) => onChange({ ...combatant, hasActed: event.target.checked })} className="accent-violet-500" /> Acted
          </label>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={`h-full ${healthPercent <= 25 ? 'bg-red-500' : healthPercent <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${healthPercent}%` }} /></div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ResourceControl label="HP" value={combatant.hp} max={combatant.maxHP} min={-20} onChange={(hp) => onChange({ ...combatant, hp })} />
          <ResourceControl label="AP" value={combatant.ap} max={combatant.maxAP} onChange={(ap) => onChange({ ...combatant, ap })} />
          <ResourceControl label="RP" value={combatant.currentReactionPoints} max={combatant.reactionPoints} onChange={(currentReactionPoints) => onChange({ ...combatant, currentReactionPoints })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {combatant.conditions.map((entry, index) => (
            <button type="button" key={`${entry}-${index}`} onClick={() => onChange({ ...combatant, conditions: combatant.conditions.filter((_, conditionIndex) => conditionIndex !== index) })} className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-200" title="Remove condition">{entry} ×</button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={condition} onChange={(event) => setCondition(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addCondition(); }} className="min-w-0 grow rounded-lg border border-white/8 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-400/50" placeholder="Add condition…" aria-label="New condition" />
          <button type="button" onClick={addCondition} className="rounded-lg bg-white/5 px-2 text-sm font-bold text-slate-300 hover:bg-white/10">+</button>
        </div>
      </div>
      <details className="border-t border-white/5">
        <summary className="cursor-pointer px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-violet-300">Stats & Abilities</summary>
        <div className="space-y-3 border-t border-white/5 p-4 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center">
            {combatant.physicalDefense !== undefined && <MiniStat label="PD" value={combatant.physicalDefense} />}
            {combatant.arcaneDefense !== undefined && <MiniStat label="AD" value={combatant.arcaneDefense} />}
            {combatant.attackBonus !== undefined && <MiniStat label="Attack" value={`+${combatant.attackBonus}`} />}
            {combatant.saveDC !== undefined && <MiniStat label="Save DC" value={combatant.saveDC} />}
            {combatant.speed !== undefined && <MiniStat label="Speed" value={combatant.speed} />}
          </div>
          {combatant.monsterAbilities?.map((ability) => (
            <div key={ability.id} className="rounded-lg bg-white/[0.035] p-3">
              <div className="font-bold text-slate-200">{ability.name} {ability.cost && <span className="text-xs text-violet-300">• {ability.cost}</span>}</div>
              <p className="mt-1 leading-5 text-slate-400">{ability.details}</p>
            </div>
          ))}
          <button type="button" onClick={onRemove} className="w-full rounded-lg px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/10">Remove from Combat</button>
        </div>
      </details>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-white/[0.04] p-2"><div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{label}</div><div className="font-black text-slate-200">{value}</div></div>;
}
