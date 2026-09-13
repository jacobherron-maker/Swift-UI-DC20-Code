import { useEffect, useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { useSourceMonsters } from '../../hooks/useSourceMonsters';
import { useCampaignStore } from '../../store/campaignStore';
import type { ContentFocusRequest } from '../../navigation/appNavigation';

/* Navigation requests intentionally synchronize this view's local workspace state. */
/* oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps */
import type { Maneuver, Monster, MonsterAbility, MonsterAbilityKind, MonsterAbilityMechanics, MonsterRole, MonsterType, Spell } from '../../types/models';
import {
  MonsterAbilityKindValues,
  MonsterRoleValues,
  MonsterTypeValues,
} from '../../types/models';
import { generateUUID } from '../../utils/gameUtils';
import { ExplicitRuleLink, RuleAwareText } from '../rules/RuleAwareText';
import RuleLinkInspector from '../rules/RuleLinkInspector';
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
  monsterDisplayRole,
  monsterLevelLabel,
  monsterAbilityMechanicsSummary,
  monsterTraitValueSpent,
} from '../../utils/monsterRules';
import { MonsterImageEditor, MonsterToken } from '../monster/MonsterArtwork';

const fieldClass = 'w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/20';
const labelClass = 'mb-1 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400';

interface SelectOptionGroup {
  label: string;
  options: Array<{ label: string; value: string }>;
}

interface MonsterPowerOption {
  key: string;
  group: 'Custom GM Vault Spells' | 'Published Spells' | 'Custom GM Vault Maneuvers' | 'Published Maneuvers';
  name: string;
  cost: string;
  details: string;
  sourcePower: NonNullable<MonsterAbility['sourcePower']>;
}

const PRIMARY_SPEED_TYPES = ['Ground', 'Burrow', 'Climb', 'Fly', 'Hover', 'Swim', 'Truewalk', 'Incorporeal'];
const OTHER_SPEED_OPTIONS: SelectOptionGroup[] = [{
  label: 'Movement Modes',
  options: [
    ['Ground Speed', 'Ground Speed'], ['Burrow Speed', 'Burrow Speed'], ['Climb Speed', 'Climb Speed'],
    ['Fly Speed', 'Fly Speed'], ['Hover Speed', 'Hover Speed'], ['Swim Speed', 'Swim Speed'],
    ['Truewalk', 'Truewalk'], ['Incorporeal Movement', 'Incorporeal Movement'],
  ].map(([label, value]) => ({ label, value })),
}];
const SENSE_OPTIONS: SelectOptionGroup[] = [{
  label: 'Special Senses',
  options: ['Darkvision', 'Blindsight', 'Tremorsense', 'Truesight', 'Telepathy', 'Passive Awareness']
    .map((value) => ({ label: value, value })),
}];
const DAMAGE_TYPE_GROUPS: SelectOptionGroup[] = [
  { label: 'Physical Damage', options: ['Bludgeoning', 'Piercing', 'Slashing'].map((value) => ({ label: value, value })) },
  { label: 'Elemental Damage', options: ['Cold', 'Corrosion', 'Fire', 'Lightning', 'Poison'].map((value) => ({ label: value, value })) },
  { label: 'Mystical Damage', options: ['Psychic', 'Radiant', 'Umbral'].map((value) => ({ label: value, value })) },
  { label: 'Damage Categories', options: ['Physical', 'Elemental', 'Mystical'].map((value) => ({ label: value, value })) },
];
const CONDITION_OPTIONS = [
  'Bleeding', 'Blinded', 'Burning', 'Charmed', 'Dazed', 'Deafened', 'Disoriented', 'Doomed', 'Exhaustion',
  'Exposed', 'Frightened', 'Hindered', 'Immobilized', 'Impaired', 'Incapacitated', 'Intimidated', 'Invisible',
  'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned', 'Surprised', 'Taunted',
  'Terrified', 'Tethered', 'Unconscious', 'Weakened',
];

function appendCatalogValue(current: string, value: string): string {
  if (!value) return current;
  const entries = current.split(/[,;|]/).map((entry) => entry.trim()).filter(Boolean);
  if (entries.some((entry) => entry.toLocaleLowerCase() === value.toLocaleLowerCase())) return current;
  return current.trim() ? `${current.trim()}, ${value}` : value;
}

function CatalogTextField({ label, value, onChange, groups, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  groups: SelectOptionGroup[];
  placeholder: string;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <select
        className={fieldClass}
        value=""
        aria-label={`Add ${label}`}
        onChange={(event) => onChange(appendCatalogValue(value, event.target.value))}
      >
        <option value="">Add from the rules catalog…</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => <option key={`${group.label}-${option.value}`} value={option.value}>{option.label}</option>)}
          </optgroup>
        ))}
      </select>
      <input
        className={`${fieldClass} mt-2`}
        value={value}
        aria-label={`${label} details`}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mt-1 block text-[10px] leading-4 text-slate-600">Choose a standard option above, then add ranges, bonuses, mastery, or custom details here.</span>
    </div>
  );
}

function defenseOptions(suffixes: string[], includeConditions = true): SelectOptionGroup[] {
  const damageGroups = DAMAGE_TYPE_GROUPS.map((group) => ({
    ...group,
    options: group.options.flatMap((option) => suffixes.map((suffix) => ({
      label: suffix ? `${option.label} (${suffix})` : option.label,
      value: suffix ? `${option.value} (${suffix})` : option.value,
    }))),
  }));
  return includeConditions
    ? [...damageGroups, { label: 'Conditions', options: CONDITION_OPTIONS.map((value) => ({ label: value, value })) }]
    : damageGroups;
}

function formatSpellAbility(spell: Spell): string {
  const metadata = [
    spell.source && `Source: ${spell.source}`,
    spell.school && `School: ${spell.school}`,
    spell.tags && `Tags: ${spell.tags}`,
    spell.range && `Range: ${spell.range}`,
    spell.duration && `Duration: ${spell.duration}`,
    spell.resolution && spell.resolution !== 'None' && `Resolution: ${spell.resolution}`,
  ].filter(Boolean).join('\n');
  return [metadata, spell.description, spell.enhancements?.trim() ? `Enhancements\n${spell.enhancements.trim()}` : ''].filter(Boolean).join('\n\n');
}

function formatManeuverAbility(maneuver: Maneuver): string {
  const metadata = [
    maneuver.category && `Category: ${maneuver.category}`,
    maneuver.range && `Range: ${maneuver.range}`,
    maneuver.requirements && `Requirements: ${maneuver.requirements}`,
    maneuver.resolution && maneuver.resolution !== 'None' && `Resolution: ${maneuver.resolution}`,
  ].filter(Boolean).join('\n');
  return [metadata, maneuver.description, maneuver.enhancements?.trim() ? `Enhancements\n${maneuver.enhancements.trim()}` : ''].filter(Boolean).join('\n\n');
}

function PowerAbilityPicker({ kind, options, isLoading, error, onAdd }: {
  kind: MonsterAbilityKind;
  options: MonsterPowerOption[];
  isLoading: boolean;
  error: string | null;
  onAdd: (option: MonsterPowerOption) => void;
}) {
  const groups: MonsterPowerOption['group'][] = [
    'Custom GM Vault Spells', 'Published Spells', 'Custom GM Vault Maneuvers', 'Published Maneuvers',
  ];
  const singularKind = kind.slice(0, -1);
  return (
    <div className="rounded-xl border border-cyan-400/15 bg-cyan-950/10 p-3">
      <label>
        <span className={labelClass}>Add Spell or Maneuver as {singularKind}</span>
        <select
          className={fieldClass}
          value=""
          disabled={isLoading}
          aria-label={`Add spell or maneuver as ${singularKind}`}
          onChange={(event) => {
            const option = options.find(({ key }) => key === event.target.value);
            if (option) onAdd(option);
          }}
        >
          <option value="">{isLoading ? 'Loading powers…' : 'Choose a power…'}</option>
          {groups.map((group) => {
            const grouped = options.filter((option) => option.group === group);
            return grouped.length > 0 && <optgroup key={group} label={group}>{grouped.map((option) => (
              <option key={option.key} value={option.key}>{option.name}{option.cost ? ` • ${option.cost}` : ''}</option>
            ))}</optgroup>;
          })}
        </select>
      </label>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <p className="mt-2 text-[10px] leading-4 text-slate-600">The full power text is copied into the monster, so it remains editable and self-contained. GM Vault spells and future custom maneuvers are kept in separate catalog groups.</p>
    </div>
  );
}

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

function StatTile({ label, value, detail, ruleID }: { label: string; value: string | number; detail?: string; ruleID?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/55 p-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{ruleID ? <ExplicitRuleLink ruleID={ruleID}>{label}</ExplicitRuleLink> : label}</div>
      <div className="mt-1 text-xl font-black text-violet-200">{value}</div>
      {detail && <div className="mt-1 text-[10px] text-slate-500">{detail}</div>}
    </div>
  );
}

function MonsterListButton({ monster, active, favorite, onClick, onFavorite }: {
  monster: Monster;
  active: boolean;
  favorite: boolean;
  onClick: () => void;
  onFavorite: () => void;
}) {
  return (
    <div className={`relative w-full rounded-xl border transition ${active
        ? 'border-violet-400/70 bg-violet-500/15 shadow-lg shadow-violet-950/20'
        : 'border-white/5 bg-white/[0.025] hover:border-violet-400/30 hover:bg-white/[0.05]'}`}>
      <button type="button" onClick={onClick} className="flex min-h-16 w-full items-center gap-3 p-3 pr-10 text-left">
        <MonsterToken image={monster.tokenDataURL} name={monster.name} className="w-10 text-xs" />
        <span className="min-w-0 grow"><span className="flex items-start justify-between gap-3"><span className="truncate font-bold text-slate-100">{monster.name}</span><span className="shrink-0 text-xs font-semibold text-violet-300">{monsterLevelLabel(monster.level)}</span></span><span className="mt-1 block truncate text-xs text-slate-400">{monster.type} • {monsterDisplayRole(monster)} • {monster.creatureType || 'Creature'}</span></span>
      </button>
      <button type="button" onClick={onFavorite} aria-label={`${favorite ? 'Remove' : 'Add'} ${monster.name} ${favorite ? 'from' : 'to'} favorites`} className={`absolute right-2 top-2 rounded-lg p-1.5 text-lg ${favorite ? 'text-amber-300' : 'text-slate-600 hover:text-amber-300'}`}>{favorite ? '★' : '☆'}</button>
    </div>
  );
}

function SourceMonsterDetail({ monster, onDuplicate }: { monster: Monster; onDuplicate: () => void }) {
  const groupedAbilities = Object.values(MonsterAbilityKindValues)
    .map((kind) => ({ kind, entries: monster.abilities.filter((ability) => ability.kind === kind) }))
    .filter(({ entries }) => entries.length > 0);
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6 lg:space-y-6 lg:p-8">
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/50 via-slate-900 to-slate-950 p-4 sm:p-6">
        {monster.artworkDataURL && <img src={monster.artworkDataURL} alt={`${monster.name} artwork`} className="mb-5 aspect-video w-full rounded-xl border border-white/10 object-cover" />}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <MonsterToken image={monster.tokenDataURL} name={monster.name} className="w-16 text-lg" />
            <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Sourcebook Monster</div>
            <h2 className="mt-1 break-words text-3xl font-black tracking-tight text-white sm:text-4xl">{monster.name}</h2>
            <p className="mt-2 text-slate-300">{monster.size} {monster.creatureType} • {monsterLevelLabel(monster.level)} • {monsterDisplayRole(monster)}</p>
            <p className="mt-1 text-xs text-slate-500">{monster.sourceBook}{monster.sourcePage ? ` • Page ${monster.sourcePage}` : ''}</p>
            </div>
          </div>
          <button type="button" onClick={onDuplicate} className="btn-primary font-semibold">Duplicate as Custom</button>
        </div>
        {monster.descriptionText && <p className="mt-5 max-w-3xl leading-7 text-slate-300"><RuleAwareText text={monster.descriptionText} /></p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <StatTile label="HP" value={monster.hp} />
        <StatTile label="PD" ruleID="defense.precisionDefense" value={monster.physicalDefense} detail={`${monster.physicalDefense + 5} / ${monster.physicalDefense + 10}`} />
        <StatTile label="AD" ruleID="defense.areaDefense" value={monster.arcaneDefense} detail={`${monster.arcaneDefense + 5} / ${monster.arcaneDefense + 10}`} />
        <StatTile label="Attack" value={`+${monster.attackBonus}`} />
        <StatTile label="Save DC" value={monster.saveDC} />
        <StatTile label="Baseline Damage" value={monster.damage} detail="Derived reference; individual attacks vary" />
        <StatTile label="AP / RP" value={`${monster.actionPoints ?? 4} / ${monster.reactionPoints ?? 0}`} />
        <StatTile label={monster.speedType ? `${monster.speedType} Speed` : 'Speed'} value={monster.speed} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {monster.tactics && <InfoPanel title="Tactics" body={monster.tactics} />}
        {monster.lore && <InfoPanel title="Lore" body={monster.lore} />}
        {monster.notes && <InfoPanel title="Related Rules" body={monster.notes} />}
      </div>

      <div className="rounded-2xl border border-white/8 bg-slate-900/70 p-5">
        <h3 className="text-lg font-black text-violet-200">Creature Details</h3>
        <div className="mt-4 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          <DetailLine label="Attributes" value={`Might ${signed(monster.might)} • Agility ${signed(monster.agility)} • Charisma ${signed(monster.charisma)} • Intelligence ${signed(monster.intelligence)}`} />
          <DetailLine label="Prime / Mastery" value={`${signed(monster.primeModifier)} / ${monster.combatMastery}`} />
          <DetailLine label="Training" value={monster.training} />
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
            {entries.map((ability) => <AbilityDisplay key={ability.id} ability={ability} rulesVersion={monster.sourceBook?.match(/\d+\.\d+\.\d+/)?.[0]} />)}
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
      <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-300"><RuleAwareText text={body} /></p>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return <div><span className="font-bold text-slate-300">{label}:</span> <span className="text-slate-400"><RuleAwareText text={value} /></span></div>;
}

function AbilityDisplay({ ability, rulesVersion }: { ability: MonsterAbility; rulesVersion?: string }) {
  const mechanics = monsterAbilityMechanicsSummary(ability);
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h4 className="font-black text-slate-100">{ability.name}</h4>
        {ability.cost && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300"><RuleAwareText text={ability.cost} /></span>}
        {ability.sourcePower && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-200">{ability.sourcePower.custom ? 'Custom ' : ''}{ability.sourcePower.kind} • {ability.sourcePower.source}</span>}
        {ability.traitValue !== undefined && <span className="text-xs text-amber-300">Trait Value {signed(ability.traitValue)}</span>}
      </div>
      {mechanics.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{mechanics.map((entry) => <span key={entry} className="rounded-lg border border-cyan-400/15 bg-cyan-950/20 px-2 py-1 text-xs font-bold text-cyan-100">{entry}</span>)}</div>}
      <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-300"><RuleAwareText text={ability.details} references={ability.ruleReferences} rulesVersion={rulesVersion} /></p>
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
  const vaultEntries = useCampaignStore((state) => state.campaignData.vaultEntries);
  const { reference, isLoading: referenceLoading, error: referenceError } = useCharacterReference();
  const { equipment, isLoading: equipmentLoading, error: equipmentError } = useEquipmentCatalog();
  const { spells, maneuvers, isLoading: powersLoading, error: powersError } = usePowerCatalog();
  const recommendation = getMonsterRecommendation(monster.level, monster.type, monster.role);
  const traitSpent = monsterTraitValueSpent(monster);
  const skillOptions = useMemo<SelectOptionGroup[]>(() => [
    {
      label: 'Skills',
      options: (reference?.skills ?? []).map(({ name, attribute }) => ({ label: attribute ? `${name} • ${attribute}` : name, value: name })),
    },
    {
      label: 'Trades',
      options: (reference?.trades ?? []).map(({ name, attribute }) => ({ label: attribute ? `${name} • ${attribute}` : name, value: name })),
    },
  ], [reference]);
  const languageOptions = useMemo<SelectOptionGroup[]>(() => {
    const groups = (reference?.languageGroups ?? []).map((group) => ({
      label: `${group.name} Languages`,
      options: group.options.map((value) => ({ label: value, value })),
    }));
    return [...groups, { label: 'Special Communication', options: ['All Languages', 'Telepathy', 'Understands but cannot speak'].map((value) => ({ label: value, value })) }];
  }, [reference]);
  const combatTrainingOptions = useMemo<SelectOptionGroup[]>(() => {
    const categoryOptions = (category: string, prefix: string) => Array.from(new Set(
      equipment.filter((item) => item.category === category).map(({ subtype }) => subtype).filter(Boolean),
    )).sort((left, right) => left.localeCompare(right)).map((value) => ({ label: value, value: `${prefix}: ${value}` }));
    return [
      { label: 'Weapons', options: [{ label: 'All Weapons', value: 'Weapons: All' }, ...categoryOptions('Weapons', 'Weapon')] },
      { label: 'Armor', options: [{ label: 'All Armor', value: 'Armor: All' }, ...categoryOptions('Armor', 'Armor')] },
      { label: 'Shields', options: [{ label: 'All Shields', value: 'Shields: All' }, ...categoryOptions('Shields', 'Shield')] },
      { label: 'Spell Focuses', options: [{ label: 'All Spell Focuses', value: 'Spell Focuses: All' }, ...categoryOptions('Spell Focuses', 'Spell Focus')] },
    ];
  }, [equipment]);
  const powerOptions = useMemo<MonsterPowerOption[]>(() => {
    const publishedSpells: MonsterPowerOption[] = spells.map((spell) => {
      const snapshot: Spell = { id: `published-spell-${spell.name}`, ...spell };
      return {
        key: `published-spell-${spell.name}`,
        group: 'Published Spells',
        name: spell.name,
        cost: spell.cost,
        details: formatSpellAbility(snapshot),
        sourcePower: { kind: 'Spell', id: snapshot.id, source: `DC20 Beta 0.10.5 • ${spell.source}`, custom: false },
      };
    });
    const publishedManeuvers: MonsterPowerOption[] = maneuvers.map((maneuver) => {
      const snapshot: Maneuver = { id: `published-maneuver-${maneuver.name}`, ...maneuver };
      return {
        key: `published-maneuver-${maneuver.name}`,
        group: 'Published Maneuvers',
        name: maneuver.name,
        cost: maneuver.cost,
        details: formatManeuverAbility(snapshot),
        sourcePower: { kind: 'Maneuver', id: snapshot.id, source: 'DC20 Beta 0.10.5', custom: false },
      };
    });
    const customSpells: MonsterPowerOption[] = vaultEntries.flatMap((entry) => entry.spell ? [{
      key: `custom-spell-${entry.id}-${entry.spell.id}`,
      group: 'Custom GM Vault Spells' as const,
      name: entry.spell.name,
      cost: entry.spell.cost ?? '',
      details: formatSpellAbility(entry.spell),
      sourcePower: { kind: 'Spell' as const, id: entry.spell.id, source: 'GM Vault', custom: true },
    }] : []);
    const customManeuvers: MonsterPowerOption[] = vaultEntries.flatMap((entry) => entry.maneuver ? [{
      key: `custom-maneuver-${entry.id}-${entry.maneuver.id}`,
      group: 'Custom GM Vault Maneuvers' as const,
      name: entry.maneuver.name,
      cost: entry.maneuver.cost ?? '',
      details: formatManeuverAbility(entry.maneuver),
      sourcePower: { kind: 'Maneuver' as const, id: entry.maneuver.id, source: 'GM Vault', custom: true },
    }] : []);
    return [...customSpells, ...publishedSpells, ...customManeuvers, ...publishedManeuvers];
  }, [maneuvers, spells, vaultEntries]);
  const update = <K extends keyof Monster>(key: K, value: Monster[K]) => onChange({ ...monster, [key]: value });
  const updateAbility = (changed: MonsterAbility) => update('abilities', monster.abilities.map((ability) => ability.id === changed.id ? changed : ability));
  const addAbility = (kind: MonsterAbilityKind) => update('abilities', [...monster.abilities, {
    id: generateUUID(),
    kind,
    name: 'New Ability',
    cost: '',
    details: '',
    traitValue: kind === MonsterAbilityKindValues.FEATURE ? 0 : undefined,
  }]);
  const addPowerAbility = (kind: MonsterAbilityKind, option: MonsterPowerOption) => update('abilities', [...monster.abilities, {
    id: generateUUID(),
    kind,
    name: option.name,
    cost: option.cost,
    details: option.details,
    traitValue: kind === MonsterAbilityKindValues.FEATURE ? 0 : undefined,
    sourcePower: option.sourcePower,
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

      <details className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04]">
        <summary className="cursor-pointer px-5 py-4 text-lg font-black text-amber-200">Strong & Simple Monster Guidance</summary>
        <div className="grid gap-4 border-t border-amber-400/10 p-5 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
            <h3 className="font-black text-slate-100">1. Reflavor</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Start with a simple monster that is mechanically close to your idea, then make only the necessary size, defense, resistance, vulnerability, feature, and damage-type adjustments.</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
            <h3 className="font-black text-slate-100">2. Simplify</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Remove or replace complicated Actions and Reactions when their power is accounted for. Replace Features instead of simply removing them so the monster’s Trait Value remains balanced.</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-950/45 p-4">
            <h3 className="font-black text-slate-100">3. Level Up</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Raise a weaker simple monster to the intended level, rebalance its Actions, and add straightforward Monster Traits as needed. Dune Beast is the volume’s worked example.</p>
          </div>
          <p className="text-xs leading-5 text-slate-500 md:col-span-3">Source: DC20 Magazine 25, page 3. Use the Monster Collection baselines and Trait Values shown elsewhere in this builder for final balancing.</p>
        </div>
      </details>

      <details className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-950/10">
        <summary className="cursor-pointer px-5 py-4 text-lg font-black text-fuchsia-200">Token & Artwork</summary>
        <div className="grid gap-6 border-t border-fuchsia-400/10 p-5 md:grid-cols-[12rem_1fr]">
          <div><h4 className={labelClass}>Combat Token</h4><MonsterImageEditor shape="token" image={monster.tokenDataURL} name={monster.name} onChange={(image) => update('tokenDataURL', image)} /></div>
          <div><h4 className={labelClass}>Stat Block Artwork</h4><MonsterImageEditor shape="artwork" image={monster.artworkDataURL} name={monster.name} onChange={(image) => update('artworkDataURL', image)} /></div>
          <p className="text-xs leading-5 text-slate-500 md:col-span-2">Images are center-cropped and compressed for dependable local and cloud saves. Tokens follow this monster into new encounters and combats.</p>
        </div>
      </details>

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
          <NumberField label="Area Defense" value={monster.arcaneDefense} onChange={(value) => update('arcaneDefense', value)} />
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
        <div className="space-y-6 border-t border-white/5 p-5">
          <section>
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-300">Movement</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label>
                <span className={labelClass}>Primary Speed Type</span>
                <select className={fieldClass} value={monster.speedType ?? ''} onChange={(event) => update('speedType', event.target.value)}>
                  <option value="">Choose a movement type…</option>
                  {monster.speedType && !PRIMARY_SPEED_TYPES.includes(monster.speedType) && <option value={monster.speedType}>{monster.speedType} • Custom</option>}
                  {PRIMARY_SPEED_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <CatalogTextField label="Other Speeds & Movement" value={monster.otherSpeeds} onChange={(value) => update('otherSpeeds', value)} groups={OTHER_SPEED_OPTIONS} placeholder="Example: Fly 5, Climb 3" />
            </div>
          </section>

          <section className="border-t border-white/5 pt-5">
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-sky-300">Training & Communication</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <CatalogTextField label="Combat Training" value={monster.training} onChange={(value) => update('training', value)} groups={combatTrainingOptions} placeholder="Example: Weapons: All, Armor: Light Armor" />
              <CatalogTextField label="Skills & Trades" value={monster.skills} onChange={(value) => update('skills', value)} groups={skillOptions} placeholder="Example: Awareness +5, Athletics +4" />
              <CatalogTextField label="Languages" value={monster.languages} onChange={(value) => update('languages', value)} groups={languageOptions} placeholder="Example: Common, Giant; cannot speak" />
            </div>
          </section>

          <section className="border-t border-white/5 pt-5">
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-amber-300">Defenses & Senses</h4>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <CatalogTextField label="Senses" value={monster.senses} onChange={(value) => update('senses', value)} groups={SENSE_OPTIONS} placeholder="Example: Darkvision 10, Tremorsense 5" />
              <CatalogTextField label="Damage Reductions" value={monster.reductions} onChange={(value) => update('reductions', value)} groups={[{ label: 'Damage Reduction', options: ['PDR', 'EDR', 'MDR'].map((value) => ({ label: value, value })) }]} placeholder="Example: PDR, EDR" />
              <CatalogTextField label="Resistances" value={monster.resistances} onChange={(value) => update('resistances', value)} groups={defenseOptions(['1', '2', 'Half'])} placeholder="Example: Fire (Half), Poisoned" />
              <CatalogTextField label="Vulnerabilities" value={monster.vulnerabilities} onChange={(value) => update('vulnerabilities', value)} groups={defenseOptions(['1', '2', 'Double'])} placeholder="Example: Radiant (2), Slowed" />
              <CatalogTextField label="Immunities" value={monster.immunities} onChange={(value) => update('immunities', value)} groups={defenseOptions([''])} placeholder="Example: Poison, Bleeding" />
            </div>
          </section>

          {(referenceLoading || equipmentLoading) && <p className="text-xs text-slate-500">Loading character and equipment choices…</p>}
          {(referenceError || equipmentError) && <p className="text-xs text-red-300">{referenceError || equipmentError}</p>}
        </div>
      </details>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-violet-200">Abilities</h3>
            <p className="text-sm text-slate-500">Features now include monster traits and share one Trait Value budget. Actions, reactions, and boss round actions remain separate.</p>
          </div>
          <label className="min-w-0 grow basis-64">
            <span className={labelClass}>Quick Add Published Feature</span>
            <select
              className={fieldClass}
              value=""
              onChange={(event) => {
                const template = MONSTER_TRAIT_CATALOG.find(({ name }) => name === event.target.value);
                if (template) update('abilities', [...monster.abilities, { ...makeTraitAbility(template), kind: MonsterAbilityKindValues.FEATURE }]);
              }}
            >
              <option value="">Choose a feature…</option>
              {MONSTER_TRAIT_CATALOG.map((trait) => <option key={trait.name} value={trait.name}>{trait.category} • {trait.name} ({signed(trait.value)})</option>)}
            </select>
          </label>
        </div>

        {([MonsterAbilityKindValues.FEATURE, MonsterAbilityKindValues.ACTION, MonsterAbilityKindValues.REACTION, MonsterAbilityKindValues.ROUND_ACTION] as const).map((kind) => {
          const entries = monster.abilities.filter((ability) => kind === MonsterAbilityKindValues.FEATURE
            ? ability.kind === MonsterAbilityKindValues.FEATURE || ability.kind === MonsterAbilityKindValues.TRAIT
            : ability.kind === kind);
          return (
            <details key={kind} open={entries.length > 0} className="rounded-2xl border border-white/8 bg-slate-900/75">
              <summary className="cursor-pointer px-5 py-4 text-lg font-black text-violet-200">{kind} <span className="text-sm font-medium text-slate-500">({entries.length})</span></summary>
              <div className="space-y-4 border-t border-white/5 p-5">
                <PowerAbilityPicker kind={kind} options={powerOptions} isLoading={powersLoading} error={powersError} onAdd={(option) => addPowerAbility(kind, option)} />
                {entries.map((ability) => (
                  <AbilityEditor key={ability.id} ability={ability} siblingAbilities={monster.abilities.filter((entry) => entry.id !== ability.id)} showTraitValue={kind === MonsterAbilityKindValues.FEATURE} onChange={updateAbility} onRemove={() => removeAbility(ability.id)} />
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

function AbilityEditor({ ability, siblingAbilities, showTraitValue, onChange, onRemove }: {
  ability: MonsterAbility;
  siblingAbilities: MonsterAbility[];
  showTraitValue: boolean;
  onChange: (ability: MonsterAbility) => void;
  onRemove: () => void;
}) {
  const mechanics = ability.mechanics ?? {};
  const updateMechanic = <K extends keyof MonsterAbilityMechanics>(key: K, value: MonsterAbilityMechanics[K]) => onChange({ ...ability, mechanics: { ...mechanics, [key]: value } });
  const mechanicsSummary = monsterAbilityMechanicsSummary(ability);
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/60 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_10rem_auto]">
        <TextField label="Name" value={ability.name} onChange={(value) => onChange({ ...ability, name: value })} />
        <TextField label="Cost" value={ability.cost} onChange={(value) => onChange({ ...ability, cost: value })} placeholder="1 AP" />
        <button type="button" onClick={onRemove} className="self-end rounded-lg px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10">Remove</button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {showTraitValue && <div className="max-w-40"><NumberField label="Trait Value" value={ability.traitValue ?? 0} onChange={(value) => onChange({ ...ability, kind: MonsterAbilityKindValues.FEATURE, traitValue: value })} /></div>}
        {ability.sourcePower && <span className="rounded-full bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200">Linked from {ability.sourcePower.custom ? 'Custom ' : ''}{ability.sourcePower.kind} • {ability.sourcePower.source}</span>}
      </div>
      <label className="mt-3 block">
        <span className={labelClass}>Full Rules Text</span>
        <textarea className={`${fieldClass} min-h-24 resize-y`} value={ability.details} onChange={(event) => onChange({ ...ability, details: event.target.value })} />
      </label>
      <details className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-950/10">
        <summary className="cursor-pointer px-4 py-3 text-sm font-black text-cyan-200">Advanced Mechanics Builder</summary>
        <div className="space-y-4 border-t border-cyan-400/10 p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <NumberField label="AP Cost" value={mechanics.actionPointCost ?? 0} min={0} onChange={(value) => updateMechanic('actionPointCost', value)} />
            <NumberField label="RP Cost" value={mechanics.reactionPointCost ?? 0} min={0} onChange={(value) => updateMechanic('reactionPointCost', value)} />
            <NumberField label="SP Cost" value={mechanics.staminaCost ?? 0} min={0} onChange={(value) => updateMechanic('staminaCost', value)} />
            <NumberField label="MP Cost" value={mechanics.manaCost ?? 0} min={0} onChange={(value) => updateMechanic('manaCost', value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="Attack / Check Type" value={mechanics.attackType ?? ''} onChange={(value) => updateMechanic('attackType', value)} placeholder="Martial Attack, Spell Check…" />
            <label><span className={labelClass}>Targets</span><select className={fieldClass} value={mechanics.targetDefense ?? 'None'} onChange={(event) => updateMechanic('targetDefense', event.target.value as MonsterAbilityMechanics['targetDefense'])}>{['None', 'PD', 'AD', 'Save'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <TextField label="Save Type" value={mechanics.saveType ?? ''} onChange={(value) => updateMechanic('saveType', value)} placeholder="Physical, Mental, Might…" />
            <NumberField label="Damage" value={mechanics.damage ?? 0} min={0} step={0.5} onChange={(value) => updateMechanic('damage', value)} />
            <TextField label="Damage Type" value={mechanics.damageType ?? ''} onChange={(value) => updateMechanic('damageType', value)} placeholder="Fire, Piercing…" />
            <TextField label="Condition" value={mechanics.condition ?? ''} onChange={(value) => updateMechanic('condition', value)} placeholder="Slowed, Burning…" />
            <TextField label="Range" value={mechanics.range ?? ''} onChange={(value) => updateMechanic('range', value)} placeholder="10 Spaces" />
            <TextField label="Area" value={mechanics.area ?? ''} onChange={(value) => updateMechanic('area', value)} placeholder="3 Space Burst" />
            <TextField label="Duration" value={mechanics.duration ?? ''} onChange={(value) => updateMechanic('duration', value)} placeholder="1 Round" />
            <TextField label="Recharge" value={mechanics.recharge ?? ''} onChange={(value) => updateMechanic('recharge', value)} placeholder="Short Rest, roll 5–6…" />
            <NumberField label="Maximum Uses" value={mechanics.maximumUses ?? 0} min={0} onChange={(value) => updateMechanic('maximumUses', value)} />
          </div>
          {siblingAbilities.length > 0 && <div className="grid gap-3 md:grid-cols-2">
            <label><span className={labelClass}>Grants Ability</span><select className={fieldClass} value={mechanics.grantsAbilityID ?? ''} onChange={(event) => updateMechanic('grantsAbilityID', event.target.value || undefined)}><option value="">None</option>{siblingAbilities.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
            <label><span className={labelClass}>Modifies Ability</span><select className={fieldClass} value={mechanics.modifiesAbilityID ?? ''} onChange={(event) => updateMechanic('modifiesAbilityID', event.target.value || undefined)}><option value="">None</option>{siblingAbilities.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
          </div>}
          <div className="rounded-xl border border-white/8 bg-slate-950/60 p-3"><div className={labelClass}>Generated Stat-Block Summary</div>{mechanicsSummary.length > 0 ? <div className="flex flex-wrap gap-2">{mechanicsSummary.map((entry) => <span key={entry} className="rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-100">{entry}</span>)}</div> : <p className="text-xs text-slate-600">Add mechanics above to generate a clean reference summary. Your full rules text remains independently editable.</p>}</div>
        </div>
      </details>
      <RuleLinkInspector text={ability.details} references={ability.ruleReferences ?? []} onChange={(ruleReferences) => onChange({ ...ability, ruleReferences })} />
    </div>
  );
}

function CompactMonsterDetail({ monster }: { monster: Monster }) {
  const grouped = Object.values(MonsterAbilityKindValues)
    .map((kind) => ({ kind, abilities: monster.abilities.filter((ability) => ability.kind === kind) }))
    .filter(({ abilities }) => abilities.length > 0);
  return <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
    <section className="overflow-hidden rounded-2xl border border-violet-400/25 bg-slate-900/80">
      {monster.artworkDataURL && <img src={monster.artworkDataURL} alt={`${monster.name} artwork`} className="aspect-[3/1] w-full object-cover" />}
      <div className="p-5"><div className="flex items-start gap-4"><MonsterToken image={monster.tokenDataURL} name={monster.name} className="w-16 text-lg" /><div className="min-w-0"><h2 className="text-3xl font-black text-white">{monster.name}</h2><p className="text-sm text-slate-400">{monster.size} {monster.creatureType || 'Creature'} • {monsterLevelLabel(monster.level)} • {monsterDisplayRole(monster)}</p></div></div>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">{[['HP', monster.hp], ['PD', monster.physicalDefense], ['AD', monster.arcaneDefense], ['Attack', signed(monster.attackBonus)], ['DC', monster.saveDC], ['Damage', monster.damage], ['AP/RP', `${monster.actionPoints ?? 4}/${monster.reactionPoints ?? 0}`], ['Speed', monster.speed]].map(([label, value]) => <StatTile key={label} label={String(label)} value={value} />)}</div>
        <p className="mt-4 text-sm leading-6 text-slate-400">{[monster.reductions && `Reductions: ${monster.reductions}`, monster.resistances && `Resistances: ${monster.resistances}`, monster.vulnerabilities && `Vulnerabilities: ${monster.vulnerabilities}`, monster.immunities && `Immunities: ${monster.immunities}`].filter(Boolean).join(' • ')}</p>
      </div>
    </section>
    {grouped.map(({ kind, abilities }) => <section key={kind} className="rounded-2xl border border-white/8 bg-slate-900/70 p-4"><h3 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{kind}</h3><div className="space-y-2">{abilities.map((ability) => <AbilityDisplay key={ability.id} ability={ability} />)}</div></section>)}
  </div>;
}

function PrintableMonster({ monster }: { monster: Monster }) {
  return <article data-monster-print className="monster-print-sheet hidden bg-white p-8 text-black">
    <header className="border-b-4 border-black pb-3"><div className="flex items-start justify-between gap-5"><div><h1 className="text-4xl font-black">{monster.name}</h1><p>{monster.size} {monster.creatureType || 'Creature'} • {monsterLevelLabel(monster.level)} • {monsterDisplayRole(monster)}</p></div>{monster.tokenDataURL && <img src={monster.tokenDataURL} alt="" className="h-20 w-20 rounded-full object-cover" />}</div></header>
    <div className="my-4 grid grid-cols-8 gap-2 border-y-2 border-black py-3 text-center">{[['HP', monster.hp], ['PD', monster.physicalDefense], ['AD', monster.arcaneDefense], ['Attack', signed(monster.attackBonus)], ['Save DC', monster.saveDC], ['Damage', monster.damage], ['AP/RP', `${monster.actionPoints ?? 4}/${monster.reactionPoints ?? 0}`], ['Speed', monster.speed]].map(([label, value]) => <div key={label}><strong className="block text-xs uppercase">{label}</strong><span className="text-lg font-black">{value}</span></div>)}</div>
    <p className="text-sm"><strong>Attributes:</strong> Might {signed(monster.might)} • Agility {signed(monster.agility)} • Charisma {signed(monster.charisma)} • Intelligence {signed(monster.intelligence)}</p>
    {[['Training', monster.training], ['Skills', monster.skills], ['Senses', monster.senses], ['Languages', monster.languages], ['Movement', monster.otherSpeeds], ['Reductions', monster.reductions], ['Resistances', monster.resistances], ['Vulnerabilities', monster.vulnerabilities], ['Immunities', monster.immunities]].map(([label, value]) => value && <p key={label} className="mt-1 text-sm"><strong>{label}:</strong> {value}</p>)}
    {Object.values(MonsterAbilityKindValues).map((kind) => { const abilities = monster.abilities.filter((ability) => ability.kind === kind); return abilities.length > 0 && <section key={kind} className="mt-4 break-inside-avoid"><h2 className="border-b border-black text-xl font-black">{kind}</h2>{abilities.map((ability) => <div key={ability.id} className="mt-2 break-inside-avoid text-sm"><strong>{ability.name}{ability.cost ? ` (${ability.cost})` : ''}.</strong>{monsterAbilityMechanicsSummary(ability).length > 0 && <span> {monsterAbilityMechanicsSummary(ability).join(' • ')}.</span>} <span className="whitespace-pre-wrap">{ability.details}</span></div>)}</section>; })}
    {monster.sourceBook && <footer className="mt-6 border-t border-black pt-2 text-xs">{monster.sourceBook}{monster.sourcePage ? ` • Page ${monster.sourcePage}` : ''}</footer>}
  </article>;
}

function printMonster() {
  const cleanup = () => document.body.classList.remove('monster-print-mode');
  document.body.classList.add('monster-print-mode');
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  window.setTimeout(cleanup, 1500);
}

function MonsterOrganizationPanel({ favorites, tags, folder, campaignIDs, campaigns, onFavorite, onTags, onFolder, onCampaigns }: {
  favorites: boolean;
  tags: string[];
  folder: string;
  campaignIDs: string[];
  campaigns: Array<{ id: string; name: string }>;
  onFavorite: () => void;
  onTags: (tags: string[]) => void;
  onFolder: (folder: string) => void;
  onCampaigns: (ids: string[]) => void;
}) {
  return <details className="mx-auto mt-4 max-w-5xl rounded-2xl border border-amber-400/15 bg-amber-950/10 px-4 sm:px-5">
    <summary className="cursor-pointer py-3 text-sm font-black text-amber-200">Organize this monster</summary>
    <div className="grid gap-4 border-t border-amber-400/10 py-4 md:grid-cols-2">
      <button type="button" onClick={onFavorite} className={`rounded-xl border px-4 py-3 text-left text-sm font-black ${favorites ? 'border-amber-400/30 bg-amber-500/15 text-amber-200' : 'border-white/10 text-slate-300'}`}>{favorites ? '★ Favorited' : '☆ Add to Favorites'}</button>
      <TextField label="Folder" value={folder} onChange={onFolder} placeholder="Example: Undead, City Watch…" />
      <label className="md:col-span-2"><span className={labelClass}>Tags / Environments</span><input className={fieldClass} value={tags.join(', ')} onChange={(event) => onTags(event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean))} placeholder="forest, boss, fire, session 12…" /></label>
      {campaigns.length > 0 && <fieldset className="md:col-span-2"><legend className={labelClass}>Campaign Collections</legend><div className="flex flex-wrap gap-2">{campaigns.map((campaign) => <label key={campaign.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/8 bg-slate-950/55 px-3 py-2 text-sm text-slate-300"><input type="checkbox" checked={campaignIDs.includes(campaign.id)} onChange={(event) => onCampaigns(event.target.checked ? [...campaignIDs, campaign.id] : campaignIDs.filter((id) => id !== campaign.id))} />{campaign.name}</label>)}</div></fieldset>}
    </div>
  </details>;
}

export default function MonstersView({ focusRequest, onFocusHandled }: { focusRequest?: ContentFocusRequest | null; onFocusHandled?: () => void }) {
  const {
    campaignData,
    selectedMonsterId,
    selectMonster,
    addCustomMonster,
    updateCustomMonster,
    removeCustomMonster,
    updateMonsterLibrary,
  } = useCampaignStore();
  const { monsters: sourceMonsters, isLoading, error } = useSourceMonsters();
  const [search, setSearch] = useState('');
  const [customMonstersExpanded, setCustomMonstersExpanded] = useState(true);
  const [monsterWorkspaceExpanded, setMonsterWorkspaceExpanded] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [movementFilter, setMovementFilter] = useState('all');
  const [damageFilter, setDamageFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const customMonsters = campaignData.customMonsters;
  const library = campaignData.monsterLibrary;
  const allMonsters = [...sourceMonsters, ...customMonsters];
  const selected = sourceMonsters.find(({ id }) => id === selectedMonsterId)
    ?? customMonsters.find(({ id }) => id === selectedMonsterId)
    ?? null;
  const isCustom = selected ? customMonsters.some(({ id }) => id === selected.id) : false;
  const folderOptions = Array.from(new Set(Object.values(library.folderByMonsterID).filter(Boolean))).sort();
  const levelOptions = Array.from(new Set(allMonsters.map(({ level }) => level))).sort((left, right) => left - right);
  const roleOptions = Array.from(new Set(allMonsters.map(monsterDisplayRole))).sort();
  const typeOptions = Array.from(new Set(allMonsters.map(({ creatureType }) => creatureType).filter(Boolean))).sort();
  const sourceOptions = Array.from(new Set(sourceMonsters.map(({ sourceBook }) => sourceBook).filter((value): value is string => Boolean(value)))).sort();

  const changeLibrary = (changes: Partial<typeof library>) => updateMonsterLibrary({ ...library, ...changes });
  const toggleFavorite = (id: string) => changeLibrary({ favoriteIDs: library.favoriteIDs.includes(id)
    ? library.favoriteIDs.filter((entry) => entry !== id)
    : [...library.favoriteIDs, id] });

  useEffect(() => {
    if (!selectedMonsterId && sourceMonsters[0]) selectMonster(sourceMonsters[0].id);
  }, [selectMonster, selectedMonsterId, sourceMonsters]);

  const filterMonster = (monster: Monster) => {
    const query = search.trim().toLowerCase();
    if (libraryFilter === 'favorites' && !library.favoriteIDs.includes(monster.id)) return false;
    if (libraryFilter === 'recent' && !library.recentIDs.includes(monster.id)) return false;
    if (libraryFilter.startsWith('folder:') && library.folderByMonsterID[monster.id] !== libraryFilter.slice(7)) return false;
    if (libraryFilter.startsWith('campaign:') && !(library.campaignIDsByMonsterID[monster.id] ?? []).includes(libraryFilter.slice(9))) return false;
    if (levelFilter !== 'all' && monster.level !== Number(levelFilter)) return false;
    if (roleFilter !== 'all' && monsterDisplayRole(monster) !== roleFilter) return false;
    if (typeFilter !== 'all' && monster.creatureType !== typeFilter) return false;
    if (sourceFilter !== 'all' && (monster.sourceBook || 'Custom') !== sourceFilter) return false;
    const movement = `${monster.speedType ?? ''} ${monster.otherSpeeds}`.toLowerCase();
    if (movementFilter !== 'all' && !movement.includes(movementFilter.toLowerCase())) return false;
    const abilitiesText = monster.abilities.map((ability) => `${ability.name} ${ability.details} ${ability.mechanics?.damageType ?? ''} ${ability.mechanics?.condition ?? ''}`).join(' ');
    if (damageFilter.trim() && !`${abilitiesText} ${monster.resistances} ${monster.vulnerabilities} ${monster.immunities}`.toLowerCase().includes(damageFilter.trim().toLowerCase())) return false;
    if (conditionFilter.trim() && !abilitiesText.toLowerCase().includes(conditionFilter.trim().toLowerCase())) return false;
    const tags = [...(monster.tags ?? []), ...(monster.environments ?? []), ...(library.tagsByMonsterID[monster.id] ?? [])].join(' ').toLowerCase();
    if (environmentFilter.trim() && !tags.includes(environmentFilter.trim().toLowerCase())) return false;
    return !query || [monster.name, monster.creatureType, monster.role, monster.publishedRole ?? '', monster.type, monster.sourceBook ?? '', monster.training, monster.skills, monster.languages, abilitiesText, tags]
      .some((value) => value.toLowerCase().includes(query));
  };
  const sortRecent = (monsters: Monster[]) => libraryFilter === 'recent'
    ? [...monsters].sort((left, right) => library.recentIDs.indexOf(left.id) - library.recentIDs.indexOf(right.id))
    : monsters;
  const filteredSources = sortRecent(sourceMonsters.filter(filterMonster));
  const filteredCustom = sortRecent(customMonsters.filter(filterMonster));

  const duplicate = (monster: Monster) => {
    const copy = cloneMonsterAsCustom(monster);
    addCustomMonster(copy);
    setMonsterWorkspaceExpanded(true);
  };
  const createMonster = () => {
    addCustomMonster(createCustomMonster());
    setMonsterWorkspaceExpanded(true);
  };

  useEffect(() => {
    if (focusRequest?.kind !== 'monster') return;
    if (focusRequest.id) {
      selectMonster(focusRequest.id);
      setMonsterWorkspaceExpanded(true);
    } else createMonster();
    onFocusHandled?.();
  }, [focusRequest, onFocusHandled, selectMonster]);
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
        <details className="mt-3 rounded-xl border border-white/8 bg-slate-900/55 p-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-violet-300">Advanced filters</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select aria-label="Monster collection" className={fieldClass} value={libraryFilter} onChange={(event) => setLibraryFilter(event.target.value)}><option value="all">All monsters</option><option value="favorites">★ Favorites</option><option value="recent">Recently viewed</option>{folderOptions.map((folder) => <option key={folder} value={`folder:${folder}`}>Folder: {folder}</option>)}{campaignData.campaigns.map((campaign) => <option key={campaign.id} value={`campaign:${campaign.id}`}>Campaign: {campaign.name}</option>)}</select>
            <select aria-label="Monster level" className={fieldClass} value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">Any level</option>{levelOptions.map((level) => <option key={level} value={level}>{monsterLevelLabel(level)}</option>)}</select>
            <select aria-label="Monster role" className={fieldClass} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Any role</option>{roleOptions.map((role) => <option key={role}>{role}</option>)}</select>
            <select aria-label="Creature type" className={fieldClass} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Any creature type</option>{typeOptions.map((type) => <option key={type}>{type}</option>)}</select>
            <select aria-label="Monster source" className={fieldClass} value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">Any source</option><option value="Custom">Custom</option>{sourceOptions.map((source) => <option key={source}>{source}</option>)}</select>
            <select aria-label="Movement type" className={fieldClass} value={movementFilter} onChange={(event) => setMovementFilter(event.target.value)}><option value="all">Any movement</option>{PRIMARY_SPEED_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
            <input aria-label="Damage type filter" className={fieldClass} value={damageFilter} onChange={(event) => setDamageFilter(event.target.value)} placeholder="Damage type" />
            <input aria-label="Condition filter" className={fieldClass} value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)} placeholder="Condition" />
            <input aria-label="Tag or environment filter" className={`${fieldClass} col-span-2`} value={environmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value)} placeholder="Tag or environment" />
          </div>
        </details>
        <div className="mt-5 max-h-80 space-y-5 overflow-y-auto overscroll-contain pr-1 lg:max-h-none lg:overflow-visible">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Sourcebook Monsters</h2>
              <span className="text-xs text-slate-600">{filteredSources.length}</span>
            </div>
            {isLoading && <p className="rounded-xl border border-white/5 p-3 text-sm text-slate-500">Loading audited library…</p>}
            {error && <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-sm text-red-300">{error}</p>}
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1 lg:max-h-[42vh]">
              {filteredSources.map((monster) => <MonsterListButton key={monster.id} monster={monster} favorite={library.favoriteIDs.includes(monster.id)} active={monster.id === selectedMonsterId} onClick={() => openMonster(monster.id)} onFavorite={() => toggleFavorite(monster.id)} />)}
            </div>
          </section>
          <section>
            <button type="button" onClick={() => setCustomMonstersExpanded((expanded) => !expanded)} aria-expanded={customMonstersExpanded} className="mb-2 flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left hover:bg-white/5">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Custom Monsters</span>
              <span className="flex items-center gap-2 text-xs text-slate-600"><span>{filteredCustom.length}</span><span aria-hidden="true" className={`text-amber-300 transition-transform ${customMonstersExpanded ? 'rotate-90' : ''}`}>›</span></span>
            </button>
            {customMonstersExpanded && <div className="max-h-40 space-y-2 overflow-y-auto pr-1 lg:max-h-[32vh]">
              {filteredCustom.length === 0 && <button type="button" onClick={createMonster} className="w-full rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500 hover:border-violet-400/30 hover:text-violet-300">Create your first custom monster</button>}
              {filteredCustom.map((monster) => <MonsterListButton key={monster.id} monster={monster} favorite={library.favoriteIDs.includes(monster.id)} active={monster.id === selectedMonsterId} onClick={() => openMonster(monster.id)} onFavorite={() => toggleFavorite(monster.id)} />)}
            </div>}
          </section>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:overflow-y-auto">
        {!selected && <div className="grid min-h-full place-items-center p-8 text-center text-slate-500">Select a monster or create a custom one.</div>}
        {selected && <section className="min-h-full">
          <div className="sticky top-0 z-20 flex min-h-14 w-full flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3 shadow-lg backdrop-blur sm:px-6 lg:px-8">
            <span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">{isCustom ? 'Custom Monster Builder' : 'Monster Stat Block'}</span><span className="block truncate font-black text-white">{selected.name || 'Unnamed Monster'}</span></span>
            <span className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleFavorite(selected.id)} className={`rounded-lg px-3 py-2 text-xs font-black ${library.favoriteIDs.includes(selected.id) ? 'bg-amber-500/15 text-amber-200' : 'bg-white/5 text-slate-300'}`}>{library.favoriteIDs.includes(selected.id) ? '★ Favorite' : '☆ Favorite'}</button><button type="button" onClick={() => setCompactMode((value) => !value)} className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-200">{compactMode ? 'Full Layout' : 'Compact Layout'}</button><button type="button" onClick={printMonster} className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-200">Print</button><button type="button" onClick={() => setMonsterWorkspaceExpanded((expanded) => !expanded)} aria-expanded={monsterWorkspaceExpanded} className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-200">{monsterWorkspaceExpanded ? 'Collapse ▴' : 'Expand ▾'}</button></span>
          </div>
          {monsterWorkspaceExpanded && <>
            <MonsterOrganizationPanel favorites={library.favoriteIDs.includes(selected.id)} tags={library.tagsByMonsterID[selected.id] ?? []} folder={library.folderByMonsterID[selected.id] ?? ''} campaignIDs={library.campaignIDsByMonsterID[selected.id] ?? []} campaigns={campaignData.campaigns} onFavorite={() => toggleFavorite(selected.id)} onTags={(tags) => changeLibrary({ tagsByMonsterID: { ...library.tagsByMonsterID, [selected.id]: tags } })} onFolder={(folder) => changeLibrary({ folderByMonsterID: { ...library.folderByMonsterID, [selected.id]: folder } })} onCampaigns={(ids) => changeLibrary({ campaignIDsByMonsterID: { ...library.campaignIDsByMonsterID, [selected.id]: ids } })} />
            {compactMode && <CompactMonsterDetail monster={selected} />}
            {!compactMode && !isCustom && <SourceMonsterDetail monster={selected} onDuplicate={() => duplicate(selected)} />}
            {!compactMode && isCustom && <CustomMonsterEditor
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
          <PrintableMonster monster={selected} />
        </section>}
      </main>
    </div>
  );
}
