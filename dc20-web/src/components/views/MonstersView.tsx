import { useEffect, useState } from 'react';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { useCampaignStore } from '../../store/campaignStore';
import type { Monster, MonsterAbility, MonsterAbilityKind, MonsterRole, MonsterType } from '../../types/models';
import {
  MonsterAbilityKindValues,
  MonsterRoleValues,
  MonsterTypeValues,
} from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import {
  applyMonsterRecommendation,
  cloneMonsterAsCustom,
  createCustomMonster,
  getMonsterRecommendation,
  makeTraitAbility,
  MONSTER_ROLE_GUIDANCE,
  MONSTER_TRAIT_CATALOG,
  MONSTER_TYPE_GUIDANCE,
  monsterBudget,
  monsterLevelLabel,
  monsterTraitValueSpent,
} from '../../utils/monsterRules';

const fieldClass = 'w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400';

function NumberField({ label, value, onChange, step = 1, min }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={fieldClass}
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input className={fieldClass} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/55 p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-violet-200">{value}</div>
      {detail && <div className="mt-1 text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
}

function MonsterListButton({ monster, active, onClick }: {
  monster: Monster;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition ${active
        ? 'border-violet-400/70 bg-violet-500/15 shadow-lg shadow-violet-950/20'
        : 'border-white/5 bg-white/[0.025] hover:border-violet-400/30 hover:bg-white/[0.05]'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-bold text-slate-100">{monster.name}</div>
        <div className="shrink-0 text-xs font-semibold text-violet-300">{monsterLevelLabel(monster.level)}</div>
      </div>
      <div className="mt-1 text-xs text-slate-400">{monster.type} • {monster.role} • {monster.creatureType || 'Creature'}</div>
    </button>
  );
}

function SourceMonsterDetail({ monster, onDuplicate }: { monster: Monster; onDuplicate: () => void }) {
  const groupedAbilities = Object.values(MonsterAbilityKindValues)
    .map((kind) => ({ kind, entries: monster.abilities.filter((ability) => ability.kind === kind) }))
    .filter(({ entries }) => entries.length > 0);
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Sourcebook Monster</div>
            <h2 className="mt-1 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{monster.name}</h2>
            <p className="mt-2 text-slate-300">{monster.size} {monster.creatureType} • {monsterLevelLabel(monster.level)} • {monster.publishedRole || monster.role}</p>
            <p className="mt-1 text-xs text-slate-500">{monster.sourceBook}{monster.sourcePage ? ` • Page ${monster.sourcePage}` : ''}</p>
          </div>
          <button type="button" onClick={onDuplicate} className="btn-primary font-semibold">Duplicate as Custom</button>
        </div>
        {monster.descriptionText && <p className="mt-5 max-w-3xl leading-7 text-slate-300">{monster.descriptionText}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <StatTile label="HP" value={monster.hp} />
        <StatTile label="PD" value={monster.physicalDefense} detail={`${monster.physicalDefense + 5} / ${monster.physicalDefense + 10}`} />
        <StatTile label="AD" value={monster.arcaneDefense} detail={`${monster.arcaneDefense + 5} / ${monster.arcaneDefense + 10}`} />
        <StatTile label="Attack" value={`+${monster.attackBonus}`} />
        <StatTile label="Save DC" value={monster.saveDC} />
        <StatTile label="Damage" value={monster.damage} />
        <StatTile label="AP / RP" value={`${monster.actionPoints ?? 4} / ${monster.reactionPoints ?? 0}`} />
        <StatTile label="Speed" value={monster.speed} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {monster.tactics && <InfoPanel title="Tactics" body={monster.tactics} />}
        {monster.lore && <InfoPanel title="Lore" body={monster.lore} />}
      </div>

      <div className="rounded-2xl border border-white/8 bg-slate-900/70 p-5">
        <h3 className="text-lg font-black text-violet-200">Creature Details</h3>
        <div className="mt-4 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          <DetailLine label="Attributes" value={`Might ${signed(monster.might)} • Agility ${signed(monster.agility)} • Charisma ${signed(monster.charisma)} • Intelligence ${signed(monster.intelligence)}`} />
          <DetailLine label="Prime / Mastery" value={`${signed(monster.primeModifier)} / ${monster.combatMastery}`} />
          <DetailLine label="Skills" value={monster.skills} />
          <DetailLine label="Senses" value={monster.senses} />
          <DetailLine label="Languages" value={monster.languages} />
          <DetailLine label="Other Speeds" value={monster.otherSpeeds} />
          <DetailLine label="Reductions" value={monster.reductions} />
          <DetailLine label="Resistances" value={monster.resistances} />
          <DetailLine label="Vulnerabilities" value={monster.vulnerabilities} />
          <DetailLine label="Immunities" value={monster.immunities} />
        </div>
      </div>

      {groupedAbilities.map(({ kind, entries }) => (
        <details key={kind} open className="rounded-2xl border border-white/8 bg-slate-900/70">
          <summary className="cursor-pointer px-5 py-4 text-lg font-black text-violet-200">{kind} <span className="text-sm font-medium text-slate-500">({entries.length})</span></summary>
          <div className="space-y-3 border-t border-white/5 p-5">
            {entries.map((ability) => <AbilityDisplay key={ability.id} ability={ability} />)}
          </div>
        </details>
      ))}
    </div>
  );
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-slate-900/70 p-5">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-violet-300">{title}</h3>
      <p className="mt-2 leading-7 text-slate-300">{body}</p>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return <div><span className="font-bold text-slate-300">{label}:</span> <span className="text-slate-400">{value}</span></div>;
}

function AbilityDisplay({ ability }: { ability: MonsterAbility }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-black text-slate-100">{ability.name}</h4>
        {ability.cost && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300">{ability.cost}</span>}
        {ability.traitValue !== undefined && <span className="text-xs text-amber-300">Trait Value {signed(ability.traitValue)}</span>}
      </div>
      <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-300">{ability.details}</p>
    </div>
  );
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function CustomMonsterEditor({ monster, onChange, onDelete, onDuplicate }: {
  monster: Monster;
  onChange: (monster: Monster) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const recommendation = getMonsterRecommendation(monster.level, monster.type, monster.role);
  const traitSpent = monsterTraitValueSpent(monster);
  const update = <K extends keyof Monster>(key: K, value: Monster[K]) => onChange({ ...monster, [key]: value });
  const updateAbility = (changed: MonsterAbility) => update('abilities', monster.abilities.map((ability) => ability.id === changed.id ? changed : ability));
  const addAbility = (kind: MonsterAbilityKind) => update('abilities', [...monster.abilities, {
    id: generateUUID(),
    kind,
    name: 'New Ability',
    cost: '',
    details: '',
    traitValue: kind === MonsterAbilityKindValues.TRAIT ? 0 : undefined,
  }]);
  const removeAbility = (id: string) => update('abilities', monster.abilities.filter((ability) => ability.id !== id));

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Custom Monster Builder</div>
          <h2 className="mt-1 text-3xl font-black text-white">{monster.name || 'Unnamed Monster'}</h2>
          <div className="mt-2 text-sm text-slate-400">Budget {monsterBudget(monster)} • Changes save automatically</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onDuplicate} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">Duplicate</button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20">Delete</button>
        </div>
      </div>

      <section className="rounded-2xl border border-violet-400/15 bg-slate-900/75 p-5">
        <h3 className="text-lg font-black text-violet-200">Identity & Baseline</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField label="Name" value={monster.name} onChange={(value) => update('name', value)} />
          <TextField label="Creature Type" value={monster.creatureType} onChange={(value) => update('creatureType', value)} placeholder="Beast, Undead…" />
          <TextField label="Size" value={monster.size} onChange={(value) => update('size', value)} />
          <label>
            <span className={labelClass}>Level</span>
            <select className={fieldClass} value={monster.level} onChange={(event) => update('level', Number(event.target.value))}>
              {Array.from({ length: 22 }, (_, index) => index - 1).map((level) => <option key={level} value={level}>{monsterLevelLabel(level)}</option>)}
            </select>
          </label>
          <label className="md:col-span-1 xl:col-span-2">
            <span className={labelClass}>Monster Type</span>
            <select className={fieldClass} value={monster.type} onChange={(event) => update('type', event.target.value as MonsterType)}>
              {Object.values(MonsterTypeValues).map((type) => <option key={type}>{type}</option>)}
            </select>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{MONSTER_TYPE_GUIDANCE[monster.type]}</span>
          </label>
          <label className="md:col-span-1 xl:col-span-2">
            <span className={labelClass}>Combat Role</span>
            <select className={fieldClass} value={monster.role} onChange={(event) => update('role', event.target.value as MonsterRole)}>
              {Object.values(MonsterRoleValues).map((role) => <option key={role}>{role}</option>)}
            </select>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{MONSTER_ROLE_GUIDANCE[monster.role]}</span>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
          <div className="grow text-sm text-amber-100/80">Recommended: {recommendation.hp} HP • {recommendation.physicalDefense} defenses • +{recommendation.attack} attack • DC {recommendation.save} • {recommendation.damage} damage</div>
          <button type="button" onClick={() => onChange(applyMonsterRecommendation(monster))} className="rounded-lg bg-amber-400/15 px-3 py-2 text-sm font-bold text-amber-200 hover:bg-amber-400/25">Apply Recommended Stats</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-slate-900/75 p-5">
        <h3 className="text-lg font-black text-violet-200">Core Statistics</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
          <NumberField label="HP" value={monster.hp} min={1} onChange={(value) => update('hp', value)} />
          <NumberField label="Physical Defense" value={monster.physicalDefense} onChange={(value) => update('physicalDefense', value)} />
          <NumberField label="Arcane Defense" value={monster.arcaneDefense} onChange={(value) => update('arcaneDefense', value)} />
          <NumberField label="Attack Bonus" value={monster.attackBonus} onChange={(value) => update('attackBonus', value)} />
          <NumberField label="Save DC" value={monster.saveDC} onChange={(value) => update('saveDC', value)} />
          <NumberField label="Damage" value={monster.damage} step={0.25} min={0} onChange={(value) => update('damage', value)} />
          <NumberField label="Action Points" value={monster.actionPoints ?? 4} min={0} onChange={(value) => update('actionPoints', value)} />
          <NumberField label="Reaction Points" value={monster.reactionPoints ?? 0} min={0} onChange={(value) => update('reactionPoints', value)} />
          <NumberField label="Speed" value={monster.speed} min={0} onChange={(value) => update('speed', value)} />
          <NumberField label="Prime Modifier" value={monster.primeModifier} onChange={(value) => update('primeModifier', value)} />
          <NumberField label="Combat Mastery" value={monster.combatMastery} min={0} onChange={(value) => update('combatMastery', value)} />
          <div className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-3 text-center">
            <div className={labelClass}>Trait Value</div>
            <div className={`text-xl font-black ${traitSpent > recommendation.traits ? 'text-red-300' : 'text-violet-200'}`}>{traitSpent} / {recommendation.traits}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <NumberField label="Might" value={monster.might} onChange={(value) => update('might', value)} />
          <NumberField label="Agility" value={monster.agility} onChange={(value) => update('agility', value)} />
          <NumberField label="Charisma" value={monster.charisma} onChange={(value) => update('charisma', value)} />
          <NumberField label="Intelligence" value={monster.intelligence} onChange={(value) => update('intelligence', value)} />
        </div>
      </section>

      <details open className="rounded-2xl border border-white/8 bg-slate-900/75">
        <summary className="cursor-pointer px-5 py-4 text-lg font-black text-violet-200">Description, Tactics & Lore</summary>
        <div className="grid gap-4 border-t border-white/5 p-5">
          {(['descriptionText', 'tactics', 'lore', 'notes'] as const).map((key) => (
            <label key={key}>
              <span className={labelClass}>{key === 'descriptionText' ? 'Description' : key[0].toUpperCase() + key.slice(1)}</span>
              <textarea className={`${fieldClass} min-h-24 resize-y`} value={monster[key]} onChange={(event) => update(key, event.target.value)} />
            </label>
          ))}
        </div>
      </details>

      <details className="rounded-2xl border border-white/8 bg-slate-900/75">
        <summary className="cursor-pointer px-5 py-4 text-lg font-black text-violet-200">Movement, Training & Defenses</summary>
        <div className="grid gap-4 border-t border-white/5 p-5 md:grid-cols-2">
          {([
            ['skills', 'Skills'], ['senses', 'Senses'], ['languages', 'Languages'], ['otherSpeeds', 'Other Speeds'],
            ['reductions', 'Damage Reductions'], ['resistances', 'Resistances'], ['vulnerabilities', 'Vulnerabilities'], ['immunities', 'Immunities'],
          ] as const).map(([key, label]) => <TextField key={key} label={label} value={monster[key]} onChange={(value) => update(key, value)} />)}
        </div>
      </details>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-violet-200">Abilities</h3>
            <p className="text-sm text-slate-500">Traits, features, actions, reactions, and boss round actions.</p>
          </div>
          <label className="min-w-0 grow basis-64">
            <span className={labelClass}>Quick Add Published Trait</span>
            <select
              className={fieldClass}
              value=""
              onChange={(event) => {
                const template = MONSTER_TRAIT_CATALOG.find(({ name }) => name === event.target.value);
                if (template) update('abilities', [...monster.abilities, makeTraitAbility(template)]);
              }}
            >
              <option value="">Choose a trait…</option>
              {MONSTER_TRAIT_CATALOG.map((trait) => <option key={trait.name} value={trait.name}>{trait.category} • {trait.name} ({signed(trait.value)})</option>)}
            </select>
          </label>
        </div>

        {Object.values(MonsterAbilityKindValues).map((kind) => {
          const entries = monster.abilities.filter((ability) => ability.kind === kind);
          return (
            <details key={kind} open={entries.length > 0} className="rounded-2xl border border-white/8 bg-slate-900/75">
              <summary className="cursor-pointer px-5 py-4 text-lg font-black text-violet-200">{kind} <span className="text-sm font-medium text-slate-500">({entries.length})</span></summary>
              <div className="space-y-4 border-t border-white/5 p-5">
                {entries.map((ability) => (
                  <AbilityEditor key={ability.id} ability={ability} onChange={updateAbility} onRemove={() => removeAbility(ability.id)} />
                ))}
                <button type="button" onClick={() => addAbility(kind)} className="rounded-lg border border-dashed border-violet-400/40 px-3 py-2 text-sm font-bold text-violet-300 hover:bg-violet-500/10">+ Add {kind.slice(0, -1)}</button>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}

function AbilityEditor({ ability, onChange, onRemove }: {
  ability: MonsterAbility;
  onChange: (ability: MonsterAbility) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/60 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_10rem_auto]">
        <TextField label="Name" value={ability.name} onChange={(value) => onChange({ ...ability, name: value })} />
        <TextField label="Cost" value={ability.cost} onChange={(value) => onChange({ ...ability, cost: value })} placeholder="1 AP" />
        <button type="button" onClick={onRemove} className="self-end rounded-lg px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10">Remove</button>
      </div>
      {ability.traitValue !== undefined && (
        <div className="mt-3 max-w-40"><NumberField label="Trait Value" value={ability.traitValue} onChange={(value) => onChange({ ...ability, traitValue: value })} /></div>
      )}
      <label className="mt-3 block">
        <span className={labelClass}>Full Rules Text</span>
        <textarea className={`${fieldClass} min-h-24 resize-y`} value={ability.details} onChange={(event) => onChange({ ...ability, details: event.target.value })} />
      </label>
    </div>
  );
}

export default function MonstersView() {
  const {
    campaignData,
    selectedMonsterId,
    selectMonster,
    addCustomMonster,
    updateCustomMonster,
    removeCustomMonster,
  } = useCampaignStore();
  const { monsters: sourceMonsters, isLoading, error } = useSourceMonsters();
  const [search, setSearch] = useState('');
  const [customMonstersExpanded, setCustomMonstersExpanded] = useState(true);
  const [monsterWorkspaceExpanded, setMonsterWorkspaceExpanded] = useState(true);
  const customMonsters = campaignData.customMonsters;
  const selected = sourceMonsters.find(({ id }) => id === selectedMonsterId)
    ?? customMonsters.find(({ id }) => id === selectedMonsterId)
    ?? null;
  const isCustom = selected ? customMonsters.some(({ id }) => id === selected.id) : false;

  useEffect(() => {
    if (!selectedMonsterId && sourceMonsters[0]) selectMonster(sourceMonsters[0].id);
  }, [selectMonster, selectedMonsterId, sourceMonsters]);

  const filterMonster = (monster: Monster) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [monster.name, monster.creatureType, monster.role, monster.type, ...monster.abilities.map(({ name }) => name)]
      .some((value) => value.toLowerCase().includes(query));
  };
  const filteredSources = sourceMonsters.filter(filterMonster);
  const filteredCustom = customMonsters.filter(filterMonster);

  const duplicate = (monster: Monster) => {
    const copy = cloneMonsterAsCustom(monster);
    addCustomMonster(copy);
    setMonsterWorkspaceExpanded(true);
  };
  const createMonster = () => {
    addCustomMonster(createCustomMonster());
    setMonsterWorkspaceExpanded(true);
  };
  const openMonster = (id: string) => {
    selectMonster(id);
    setMonsterWorkspaceExpanded(true);
  };

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top_right,rgba(109,40,217,0.12),transparent_35%)] lg:h-full lg:flex-row lg:overflow-hidden">
      <aside className="w-full shrink-0 border-b border-white/5 bg-slate-950/45 p-4 lg:w-[22rem] lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Monsters</h1>
            <p className="text-xs text-slate-500">Sourcebooks & custom creations</p>
          </div>
          <button type="button" onClick={createMonster} className="btn-primary text-sm font-bold">+ New</button>
        </div>
        <input
          className={`${fieldClass} mt-4`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search names, roles, traits…"
          aria-label="Search monsters"
        />
        <div className="mt-5 max-h-80 space-y-5 overflow-y-auto overscroll-contain pr-1 lg:max-h-none lg:overflow-visible">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Sourcebook Monsters</h2>
              <span className="text-xs text-slate-600">{filteredSources.length}</span>
            </div>
            {isLoading && <p className="rounded-xl border border-white/5 p-3 text-sm text-slate-500">Loading audited library…</p>}
            {error && <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1 lg:max-h-[42vh]">
              {filteredSources.map((monster) => <MonsterListButton key={monster.id} monster={monster} active={monster.id === selectedMonsterId} onClick={() => openMonster(monster.id)} />)}
            </div>
          </section>
          <section>
            <button type="button" onClick={() => setCustomMonstersExpanded((expanded) => !expanded)} aria-expanded={customMonstersExpanded} className="mb-2 flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left hover:bg-white/5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Custom Monsters</span>
              <span className="flex items-center gap-2 text-xs text-slate-600"><span>{filteredCustom.length}</span><span aria-hidden="true" className={`text-amber-300 transition-transform ${customMonstersExpanded ? 'rotate-90' : ''}`}>›</span></span>
            </button>
            {customMonstersExpanded && <div className="max-h-40 space-y-2 overflow-y-auto pr-1 lg:max-h-[32vh]">
              {filteredCustom.length === 0 && <button type="button" onClick={createMonster} className="w-full rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first custom monster</button>}
              {filteredCustom.map((monster) => <MonsterListButton key={monster.id} monster={monster} active={monster.id === selectedMonsterId} onClick={() => openMonster(monster.id)} />)}
            </div>}
          </section>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {!selected && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select a monster or create a custom one.</div>}
        {selected && <section className="min-h-full">
          <button type="button" onClick={() => setMonsterWorkspaceExpanded((expanded) => !expanded)} aria-expanded={monsterWorkspaceExpanded} className="sticky top-0 z-20 flex min-h-14 w-full items-center justify-between gap-4 border-b border-white/10 bg-slate-950/90 px-4 py-3 text-left shadow-lg backdrop-blur sm:px-6 lg:px-8">
            <span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">{isCustom ? 'Custom Monster Builder' : 'Monster Stat Block'}</span><span className="block truncate font-black text-white">{selected.name || 'Unnamed Monster'}</span></span>
            <span className="shrink-0 rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-200">{monsterWorkspaceExpanded ? 'Collapse' : 'Expand'} <span aria-hidden="true">{monsterWorkspaceExpanded ? '▴' : '▾'}</span></span>
          </button>
          {monsterWorkspaceExpanded && <>
            {!isCustom && <SourceMonsterDetail monster={selected} onDuplicate={() => duplicate(selected)} />}
            {isCustom && <CustomMonsterEditor
              monster={selected}
              onChange={updateCustomMonster}
              onDuplicate={() => duplicate(selected)}
              onDelete={() => {
                if (window.confirm(`Delete ${selected.name}? Existing encounter and combat snapshots will remain available.`)) {
                  removeCustomMonster(selected.id);
                }
              }}
            />}
          </>}
        </section>}
      </main>
    </div>
  );
}
