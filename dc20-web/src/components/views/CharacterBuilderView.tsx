import React, { useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog, type ManeuverReference } from '../../hooks/usePowerCatalog';
import { useCampaignStore } from '../../store/campaignStore';
import { CharacterAvatarEditor } from '../character/CharacterAvatar';
import type {
  AncestryTrait,
  AttributeSelectionMethod,
  Character,
  CharacterBuildData,
  CharacterInventoryItem,
  CharacterPathChoice,
  ClassChoiceGroupReference,
  ClassReference,
  DC20Attribute,
  LanguageFluency,
  MasteryLevel,
  MasteryReference,
} from '../../types/models';
import {
  ATTRIBUTE_NAMES,
  MASTERY_TITLES,
  accessibleAncestryNames,
  ancestryExpertise,
  ancestryTraitPointTotals,
  ancestryTraitPrerequisiteMet,
  ancestryTraitRulesTags,
  ancestryTraitSelectionCount,
  ancestryTraitSource,
  applyDerivedCharacter,
  attributeCap,
  canAddAncestryTraitCopy,
  classChoiceSelectionLimit,
  classPathProgressionLevels,
  classTableTotals,
  defaultBuild,
  deriveCharacter,
  grantedClassLanguageNames,
  grantedClassManeuverNames,
  grantedClassSpellNames,
  masteryCap,
  masteryRank,
  masteryTitle,
  ordinaryTalentSlots,
  paragonTalentSlotClasses,
  skillMasteryCap,
  selectedAncestryTraits,
  isAutomaticAncestryTrait,
  sorcererOriginAncestryBonuses,
  spellIsAvailableToClass,
  wizardSchoolSpellGrantLimit,
  wizardSchoolSpellSelectionKey,
} from '../../utils/characterRules';
import { toggleInventoryEquipped } from '../../utils/equipmentRules';
import { generateUUID } from '../../utils/gameUtils';
import {
  MULTICLASS_SELECTION_KEYS,
  isMulticlassTalentName,
  multiclassChoiceIsValid,
  multiclassTalentOptions,
  ownedClassFeatures,
  talentByName,
  talentDefinitions,
  talentEligibility,
  type MulticlassTalentName,
  type TalentDefinition,
} from '../../utils/talentRules';

type BuilderStep = 'attributes' | 'skills' | 'ancestry' | 'class' | 'equipment' | 'summary';
const STEPS: Array<{ id: BuilderStep; title: string }> = [
  { id: 'attributes', title: 'Attributes' },
  { id: 'skills', title: 'Skills' },
  { id: 'ancestry', title: 'Ancestry' },
  { id: 'class', title: 'Class' },
  { id: 'equipment', title: 'Equipment' },
  { id: 'summary', title: 'Summary' },
];

const DEFAULT_ATTRIBUTES: Record<DC20Attribute, number> = {
  Might: 3,
  Agility: 1,
  Charisma: 0,
  Intelligence: 0,
};
const EMPTY_ATTRIBUTES: Record<DC20Attribute, number> = { Might: 0, Agility: 0, Charisma: 0, Intelligence: 0 };
const STANDARD_ARRAY = [3, 1, 0, -2];
const LANGUAGE_FLUENCIES: LanguageFluency[] = ['Untrained', 'Limited', 'Fluent'];
const MARTIAL_EXPANSION_REGEN = 'talent.martialExpansion.staminaRegen';
const SPELLCASTING_EXPANSION_MODE = 'talent.spellcastingExpansion.mode';
const SPELLCASTING_EXPANSION_SOURCE = 'talent.spellcastingExpansion.source';
const SPELLCASTING_EXPANSION_SCHOOLS = 'talent.spellcastingExpansion.schools';

const fieldClass = 'w-full rounded-lg border border-slate-600 bg-slate-950/70 px-3 py-2 text-slate-100 outline-none focus:border-violet-400';
const panelClass = 'rounded-2xl border border-white/10 bg-slate-900/65 p-5 shadow-xl shadow-black/10';

function InfoDetails({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-white/10 bg-slate-950/45 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-200">
        {summary}<span className="text-xs text-violet-300 group-open:hidden">More</span><span className="hidden text-xs text-violet-300 group-open:inline">Less</span>
      </summary>
      <div className="mt-4 whitespace-pre-wrap border-t border-white/5 pt-4 text-sm leading-6 text-slate-400">{children}</div>
    </details>
  );
}

function FeatureSpellPicker({
  title,
  description,
  selected,
  limit,
  options,
  knownOutside,
  onToggle,
}: {
  title: string;
  description: string;
  selected: string[];
  limit: number;
  options: Array<{ name: string; source: string; school: string; cost: string; range: string; duration: string; description: string; enhancements: string }>;
  knownOutside: ReadonlySet<string>;
  onToggle: (name: string) => void;
}) {
  return <details className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4"><summary className="cursor-pointer font-black text-fuchsia-200">{title} ({selected.length}/{limit})</summary><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{options.map((spell) => { const isSelected = selected.includes(spell.name); const disabled = !isSelected && (selected.length >= limit || knownOutside.has(spell.name)); return <InfoDetails key={spell.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={isSelected} onChange={() => onToggle(spell.name)} />{spell.name}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-fuchsia-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails>; })}</div>{options.length === 0 && <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100">No eligible spell is published in the current Beta spell catalog.</p>}</details>;
}

function FeatureManeuverPicker({
  title,
  description,
  selected,
  limit,
  options,
  knownOutside,
  onToggle,
}: {
  title: string;
  description: string;
  selected: string[];
  limit: number;
  options: ManeuverReference[];
  knownOutside: ReadonlySet<string>;
  onToggle: (name: string) => void;
}) {
  return <details className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-4"><summary className="cursor-pointer font-black text-amber-200">{title} ({selected.length}/{limit})</summary><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{options.map((maneuver) => { const isSelected = selected.includes(maneuver.name); const disabled = !isSelected && (selected.length >= limit || knownOutside.has(maneuver.name)); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={isSelected} onChange={() => onToggle(maneuver.name)} />{maneuver.name}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-amber-300">{maneuver.category} • {maneuver.range}{maneuver.requirements ? ` • ${maneuver.requirements}` : ''}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>;
}

function Metric({ label, value, tone = 'violet' }: { label: string; value: React.ReactNode; tone?: 'violet' | 'red' | 'blue' | 'green' }) {
  const colors = { violet: 'text-violet-300', red: 'text-red-300', blue: 'text-sky-300', green: 'text-emerald-300' };
  return <div className="rounded-xl border border-white/10 bg-slate-950/55 p-3"><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div><div className={`mt-1 text-xl font-black ${colors[tone]}`}>{value}</div></div>;
}

function MasteryPicker({
  value,
  maximum,
  bonus = 0,
  pointsAvailable,
  onChange,
}: {
  value: MasteryLevel;
  maximum: number;
  bonus?: number;
  pointsAvailable: number;
  onChange: (value: MasteryLevel) => void;
}) {
  const effective = Math.min(5, masteryRank(value) + bonus);
  const selectableMaximum = Math.max(0, maximum - bonus);
  return (
    <div className="flex items-center gap-2">
      <select value={value} onChange={(event) => onChange(event.target.value as MasteryLevel)} className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200">
        {MASTERY_TITLES.slice(0, selectableMaximum + 1).map((title, rank) => <option key={title} value={title} disabled={rank > pointsAvailable}>{title} (+{rank * 2})</option>)}
      </select>
      {bonus > 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">Effective: {masteryTitle(effective)} (+{effective * 2})</span>}
    </div>
  );
}

function LanguageFluencyPicker({
  value,
  pointsAvailable,
  isFree = false,
  onChange,
}: {
  value: LanguageFluency;
  pointsAvailable: number;
  isFree?: boolean;
  onChange: (value: LanguageFluency) => void;
}) {
  return (
    <select
      value={value}
      disabled={isFree}
      onChange={(event) => onChange(event.target.value as LanguageFluency)}
      className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {LANGUAGE_FLUENCIES.map((fluency, cost) => <option key={fluency} value={fluency} disabled={!isFree && cost > pointsAvailable}>{fluency}{fluency === 'Limited' ? ' (1 point)' : fluency === 'Fluent' ? ' (2 points)' : ''}</option>)}
    </select>
  );
}

function ClassProgressionCards({ classReference, currentLevel }: { classReference: ClassReference; currentLevel?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {classReference.tableRows.map((row) => (
        <div key={row.level} className={`min-w-0 rounded-xl border p-4 ${row.level === currentLevel ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/10 bg-slate-950/45'}`}>
          <h4 className="font-black text-violet-200">Level {row.level}</h4>
          <dl className="mt-3 space-y-2 text-sm">
            {classReference.tableColumns.filter((column) => column !== 'level').map((column) => {
              const value = row[column as keyof typeof row];
              const display = value === undefined || value === '' ? '—' : typeof value === 'number' ? `+${value}` : value;
              return <div key={column} className="grid min-w-0 grid-cols-[minmax(90px,0.4fr)_minmax(0,1fr)] gap-2"><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{column}</dt><dd className="min-w-0 break-words text-slate-300">{display}</dd></div>;
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

function emptyCharacter(): Character {
  return {
    id: generateUUID(),
    name: '',
    level: 1,
    ancestry: 'Human',
    class: 'Champion',
    background: '',
    alignment: '',
    attributes: Object.fromEntries(ATTRIBUTE_NAMES.map((name) => [name, { name, score: 0, modifier: 0 }])) as Character['attributes'],
    primeModifier: 0,
    skillMasteries: {},
    tradeMasteries: {},
    languages: ['Common'],
    healthPoints: 1,
    maxHealthPoints: 1,
    stamina: 0,
    maxStamina: 0,
    manaPoints: 0,
    maxManaPoints: 0,
    currentAP: 4,
    maxAP: 4,
    physicalDefense: 10,
    arcaneDefense: 10,
    combatMastery: 1,
    speed: 5,
    defense: 10,
    injuries: [],
    skills: [],
    equipment: [],
    inventoryItems: [],
    spells: [],
    maneuvers: [],
    notes: '',
    build: defaultBuild(),
  };
}

function masterySpent(values: Record<string, MasteryLevel>, freeNames: string[] = []): number {
  const free = new Set(freeNames);
  return Object.entries(values).reduce((sum, [name, value]) => sum + (free.has(name) ? 0 : masteryRank(value)), 0);
}

function fluencyRank(value: LanguageFluency): number {
  return Math.max(0, LANGUAGE_FLUENCIES.indexOf(value));
}

function fluencySpent(values: Record<string, LanguageFluency>, freeNames: string[] = []): number {
  const free = new Set(freeNames);
  return Object.entries(values).reduce((sum, [name, value]) => sum + (free.has(name) ? 0 : fluencyRank(value)), 0);
}

function trimMasteriesToBudget(
  values: Record<string, MasteryLevel>,
  budget: number,
  displayOrder: string[],
): Record<string, MasteryLevel> {
  const next = { ...values };
  let spent = masterySpent(next);
  const removalOrder = [...displayOrder].reverse();
  while (spent > Math.max(0, budget)) {
    const name = removalOrder.find((candidate) => masteryRank(next[candidate]) > 0);
    if (!name) break;
    const rank = masteryRank(next[name]);
    next[name] = masteryTitle(rank - 1);
    spent -= 1;
  }
  return next;
}

function trimLanguagesToBudget(
  values: Record<string, LanguageFluency>,
  budget: number,
  freeNames: string[],
  displayOrder: string[],
): Record<string, LanguageFluency> {
  const next = { ...values };
  const free = new Set(freeNames);
  let spent = fluencySpent(next, freeNames);
  const removalOrder = [...displayOrder].reverse();
  while (spent > Math.max(0, budget)) {
    const name = removalOrder.find((candidate) => !free.has(candidate) && fluencyRank(next[candidate] ?? 'Untrained') > 0);
    if (!name) break;
    const rank = fluencyRank(next[name]);
    next[name] = LANGUAGE_FLUENCIES[rank - 1] ?? 'Untrained';
    spent -= 1;
  }
  return next;
}

function ConversionStepper({
  label,
  value,
  description,
  decrementDisabled,
  incrementDisabled,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  description: string;
  decrementDisabled: boolean;
  incrementDisabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3"><div className="text-sm font-bold text-slate-300">{label}</div><div className="mt-3 flex items-center justify-between gap-3"><button type="button" aria-label={`Decrease ${label}`} disabled={decrementDisabled} onClick={onDecrement} className="h-10 w-10 rounded-lg bg-slate-800 text-lg font-black text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35">−</button><span className="min-w-10 text-center text-2xl font-black text-violet-200" aria-live="polite">{value}</span><button type="button" aria-label={`Increase ${label}`} disabled={incrementDisabled} onClick={onIncrement} className="h-10 w-10 rounded-lg bg-violet-700 text-lg font-black text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-35">+</button></div><span className="mt-2 block text-xs leading-5 text-slate-500">{description}</span></div>;
}

function assignedAttributes(
  pool: number[],
  assignments: Array<DC20Attribute | null>,
  bonuses: Partial<Record<DC20Attribute, number>>,
): Record<DC20Attribute, number> {
  const result = { ...EMPTY_ATTRIBUTES };
  assignments.forEach((attribute, index) => {
    if (attribute && pool[index] !== undefined) result[attribute] = pool[index] + (bonuses[attribute] ?? 0);
  });
  return result;
}

function choiceOptions(trait: AncestryTrait, skills: MasteryReference[], trades: MasteryReference[], spells: Array<{ name: string; source: string; school: string; tags: string; description?: string }>, ancestryChoices: Record<string, string[]> = {}): string[] {
  if (['Attribute Increase', 'Attribute Decrease'].includes(trait.name)) return ATTRIBUTE_NAMES;
  if (trait.name === 'Skill Expertise') return skills.map(({ name }) => name);
  if (trait.name === 'Trade Expertise') {
    if (trait.ancestry === 'Dwarf') return trades.filter(({ group }) => ['Crafting', 'Services'].includes(group)).map(({ name }) => name);
    if (trait.ancestry === 'Gnome') return trades.filter(({ group }) => ['Crafting', 'Subterfuge'].includes(group)).map(({ name }) => name);
    return trades.map(({ name }) => name);
  }
  if (trait.name === 'Draconic Origin') return ['Cold', 'Corrosion', 'Fire', 'Lightning', 'Poison', 'Psychic', 'Radiant', 'Umbral'];
  if (trait.name === 'Fiendish Origin') return ['Cold', 'Corrosion', 'Fire', 'Poison', 'Umbral'];
  if (trait.name === 'Keen Sense') return ['Hearing', 'Sight', 'Smell'];
  if (trait.name === 'Hazardous Hide') return ['Corrosion', 'Piercing', 'Poison'];
  if (trait.name === 'Natural Weapon') return ['Bludgeoning', 'Piercing', 'Slashing'];
  if (trait.name === 'Natural Weapon Style') return ['Axe', 'Bow', 'Crossbow', 'Fist', 'Hammer', 'Pick', 'Sling', 'Spear', 'Staff', 'Sword', 'Whip'];
  if (trait.name === 'Celestial Magic') return spells.filter(({ source }) => source.split(', ').includes('Divine')).map(({ name }) => name);
  if (trait.name === 'Fiendish Magic') {
    const origin = ancestryChoices['Fiendborn|Fiendish Origin']?.[0]?.toLowerCase();
    return spells.filter(({ source, school, tags, description }) => {
      if (!source.split(', ').includes('Arcane') || !['Elemental', 'Enchantment'].includes(school)) return false;
      const dealsDamage = /\b(?:takes?|deals?)\s+\d+[^.]*\bdamage\b/i.test(description ?? '');
      return !dealsDamage || !origin || tags.split(', ').some((tag) => tag.toLowerCase() === origin);
    }).map(({ name }) => name);
  }
  if (trait.name === 'Psionic Magic') return spells.filter(({ tags }) => tags.split(', ').some((tag) => ['Psychic', 'Gravity'].includes(tag))).map(({ name }) => name);
  return [];
}

function ancestryRequirementLabel(trait: AncestryTrait): string | undefined {
  if (trait.prerequisite) return trait.prerequisite;
  if (['Draconic Resistance', 'Draconic Breath Weapon', 'Draconic Affinity', 'Draconic Ward'].includes(trait.name)) return 'Draconic Origin';
  if (['Fiendish Resistance', 'Fiendish Magic', 'Fiendish Aura'].includes(trait.name)) return 'Fiendish Origin';
  return undefined;
}

const CharacterBuilderView: React.FC<{
  character?: Character | null;
  onCompleted?: (character: Character) => void;
}> = ({ character: editingCharacter, onCompleted }) => {
  const { addCharacter, updateCharacter, selectCharacter } = useCampaignStore();
  const { reference, isLoading: rulesLoading, error: rulesError } = useCharacterReference();
  const { equipment, isLoading: equipmentLoading } = useEquipmentCatalog();
  const { spells, maneuvers, isLoading: powersLoading, error: powersError } = usePowerCatalog();
  const original = useMemo(() => editingCharacter ?? emptyCharacter(), [editingCharacter]);
  const originalBuild = useMemo<CharacterBuildData>(() => {
    const saved = original.build;
    const defaults = defaultBuild();
    const legacyFluencies = Object.fromEntries(Object.entries(saved?.languageMasteries ?? {}).map(([language, mastery]) => [
      language,
      language === 'Common' ? 'Fluent' : mastery === 'Untrained' ? 'Untrained' : 'Limited',
    ])) as Record<string, LanguageFluency>;
    return {
      ...defaults,
      ...(saved ?? {}),
      languageFluencies: {
        ...(saved?.languageFluencies ?? (Object.keys(legacyFluencies).length > 0 ? legacyFluencies : defaults.languageFluencies)),
        Common: 'Fluent',
      },
    };
  }, [original]);

  const initialAssignments = useMemo<Array<DC20Attribute | null>>(() => {
    if (originalBuild.attributeAssignments.length === 4) return originalBuild.attributeAssignments;
    if (editingCharacter && originalBuild.attributeMethod !== 'Point Buy') return [...ATTRIBUTE_NAMES];
    return [];
  }, [editingCharacter, originalBuild]);
  const initialBonusPoints = useMemo<Partial<Record<DC20Attribute, number>>>(() => {
    if (Object.keys(originalBuild.attributeBonusPoints).length > 0) return originalBuild.attributeBonusPoints;
    if (!editingCharacter || originalBuild.attributeMethod === 'Point Buy') return {};
    const pool = originalBuild.attributeMethod === 'Rolled' ? originalBuild.rolledAttributeResults : STANDARD_ARRAY;
    return Object.fromEntries(ATTRIBUTE_NAMES.map((attribute, index) => [
      attribute,
      Math.max(0, (original.attributes[attribute]?.score ?? pool[index] ?? 0) - (pool[index] ?? 0)),
    ]));
  }, [editingCharacter, original, originalBuild]);

  const [currentStep, setCurrentStep] = useState<BuilderStep>('attributes');
  const [name, setName] = useState(original.name);
  const [avatarDataURL, setAvatarDataURL] = useState(original.avatarDataURL);
  const [level, setLevelState] = useState(Math.min(10, original.level));
  const [attributeMethod, setAttributeMethod] = useState<AttributeSelectionMethod>(originalBuild.attributeMethod);
  const [attributes, setAttributes] = useState<Record<DC20Attribute, number>>(Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, original.attributes[attribute]?.score ?? DEFAULT_ATTRIBUTES[attribute]])) as Record<DC20Attribute, number>);
  const [rolledResults, setRolledResults] = useState(originalBuild.rolledAttributeResults);
  const [attributeAssignments, setAttributeAssignments] = useState<Array<DC20Attribute | null>>(initialAssignments);
  const [attributeBonusPoints, setAttributeBonusPoints] = useState<Partial<Record<DC20Attribute, number>>>(initialBonusPoints);
  const [backgroundName, setBackgroundName] = useState(originalBuild.backgroundName || original.background);
  const [backgroundStory, setBackgroundStory] = useState(originalBuild.backgroundStory);
  const [skillMasteries, setSkillMasteries] = useState<Record<string, MasteryLevel>>(original.skillMasteries ?? {});
  const [tradeMasteries, setTradeMasteries] = useState<Record<string, MasteryLevel>>(original.tradeMasteries ?? {});
  const [languageFluencies, setLanguageFluencies] = useState<Record<string, LanguageFluency>>(originalBuild.languageFluencies);
  const [skillConversion, setSkillConversion] = useState(originalBuild.skillPointsConvertedToTrades);
  const [tradeConversion, setTradeConversion] = useState(originalBuild.tradePointsConvertedToLanguages);
  const [ancestry, setAncestry] = useState(original.ancestry || 'Human');
  const [secondaryAncestry, setSecondaryAncestry] = useState(originalBuild.ancestrySecondary);
  const [traitIDs, setTraitIDs] = useState<string[]>(originalBuild.selectedAncestryTraitIDs);
  const [traitCounts, setTraitCounts] = useState<Record<string, number>>(originalBuild.ancestryTraitCounts ?? {});
  const [traitChoices, setTraitChoices] = useState<Record<string, string[]>>(originalBuild.ancestryTraitChoices);
  const [className, setClassName] = useState(original.class || 'Champion');
  const [classPreviewName, setClassPreviewName] = useState(original.class || 'Champion');
  const [classConfirmed, setClassConfirmed] = useState(Boolean(editingCharacter));
  const [subclass, setSubclass] = useState(original.subclass ?? '');
  const [talents, setTalents] = useState<string[]>(originalBuild.selectedTalents);
  const [storedPathChoices, setPathChoices] = useState<Record<string, CharacterPathChoice>>(originalBuild.pathProgressionChoices);
  const [featureChoices, setFeatureChoices] = useState<Record<string, string[]>>(originalBuild.classFeatureSelections);
  const [spellListClass, setSpellListClass] = useState(originalBuild.selectedSpellListClass);
  const [spellSource, setSpellSource] = useState(originalBuild.selectedSpellSource);
  const [selectedSpellSchools, setSelectedSpellSchools] = useState(originalBuild.selectedSpellSchools);
  const [selectedSpells, setSelectedSpells] = useState<string[]>(originalBuild.selectedSpells.filter((spell) => original.class !== 'Psion' || spell !== 'Psi Bolt'));
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>(originalBuild.selectedCantrips.filter((spell) => original.class !== 'Psion' || spell !== 'Psi Bolt'));
  const [selectedManeuvers, setSelectedManeuvers] = useState<string[]>(originalBuild.selectedManeuvers);
  const [inventoryItems, setInventoryItems] = useState<CharacterInventoryItem[]>(original.inventoryItems ?? []);
  const [notes, setNotes] = useState(original.notes);

  const classReference = reference?.classes.find((entry) => entry.name === className) ?? null;
  const pathLevels = classPathProgressionLevels(className, level);
  const preferredPath: CharacterPathChoice = classReference?.path === 'Martial' || classReference?.path === 'Hybrid' ? 'Martial' : 'Spellcaster';
  const effectivePathChoices = Object.fromEntries(pathLevels.map((pathLevel) => [String(pathLevel), storedPathChoices[String(pathLevel)] ?? preferredPath]));
  const pathChoices = effectivePathChoices;
  const selectedRogueLanguage = className === 'Rogue' ? featureChoices['rogue.language']?.[0] : undefined;
  const warlockLanguage = className === 'Warlock' && subclass === 'Eldritch' ? 'Deep Speech' : undefined;
  const sorcererLanguage = className === 'Sorcerer'
    ? featureChoices[subclass === 'Angelic' ? 'sorcerer.celestialLanguage' : subclass === 'Draconic' ? 'sorcerer.draconicLanguage' : '']?.[0]
    : undefined;
  const effectiveLanguageFluencies: Record<string, LanguageFluency> = {
    ...languageFluencies,
    Common: 'Fluent',
    ...(selectedRogueLanguage ? { [selectedRogueLanguage]: 'Fluent' as LanguageFluency } : {}),
    ...(warlockLanguage ? { [warlockLanguage]: 'Fluent' as LanguageFluency } : {}),
    ...(sorcererLanguage ? {
      [sorcererLanguage]: LANGUAGE_FLUENCIES[Math.min(2, fluencyRank(languageFluencies[sorcererLanguage] ?? 'Untrained') + 1)],
    } : {}),
  };
  const build: CharacterBuildData = {
    ...originalBuild,
    attributeMethod,
    rolledAttributeResults: rolledResults,
    attributeAssignments,
    attributeBonusPoints,
    backgroundName,
    backgroundStory,
    skillPointsConvertedToTrades: skillConversion,
    tradePointsConvertedToLanguages: tradeConversion,
    languageFluencies,
    ancestrySecondary: secondaryAncestry,
    selectedAncestryTraitIDs: traitIDs,
    ancestryTraitCounts: traitCounts,
    ancestryTraitChoices: traitChoices,
    selectedTalents: talents,
    pathProgressionChoices: effectivePathChoices,
    classFeatureSelections: featureChoices,
    selectedSpellListClass: spellListClass,
    selectedSpellSource: spellSource,
    selectedSpellSchools,
    selectedSpells,
    selectedCantrips,
    selectedManeuvers,
    isFinalized: false,
  };
  const draft: Character = {
    ...original,
    name,
    avatarDataURL,
    level,
    ancestry,
    class: className,
    subclass: subclass || undefined,
    background: backgroundName,
    attributes: Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, { name: attribute, score: attributes[attribute], modifier: attributes[attribute] }])) as Character['attributes'],
    skillMasteries,
    tradeMasteries,
    languages: Object.entries(effectiveLanguageFluencies).filter(([, fluency]) => fluencyRank(fluency) > 0).map(([language]) => language),
    inventoryItems,
    notes,
    build,
  };
  const ownedFeatures = reference ? ownedClassFeatures(draft, reference) : [];
  const ownsClassFeature = (owner: string, feature: string) => ownedFeatures.some(({ className: featureClass, name: featureName }) => (
    featureClass === owner && featureName === feature
  ));
  const allTalentDefinitions = reference ? talentDefinitions(reference) : [];
  const talentClassNames = new Set(ownedFeatures.map(({ className: owner }) => owner));
  const presentedTalents = allTalentDefinitions.filter((talent) => (
    talent.category !== 'Class' || talent.className === className || talentClassNames.has(talent.className ?? '')
  ));
  const derived = classReference && reference ? deriveCharacter(draft, classReference, reference.ancestryTraits, equipment) : null;
  const classTotals = classReference ? classTableTotals(classReference, level) : null;
  const expertise = reference ? ancestryExpertise(draft, reference.ancestryTraits) : { skills: {}, trades: {} };
  const selectedTraits = reference ? selectedAncestryTraits(draft, reference.ancestryTraits) : [];
  const accessibleAncestries = reference ? accessibleAncestryNames(draft, reference.ancestryTraits) : new Set<string>();
  const selectedAncestries = new Set([ancestry, secondaryAncestry].filter((entry): entry is string => Boolean(entry)));
  const automaticTraitIDs = new Set(selectedTraits.filter((trait) => isAutomaticAncestryTrait(trait, selectedAncestries)).map((trait) => trait.id));
  const ancestryTotals = ancestryTraitPointTotals(draft, selectedTraits);
  const ancestrySpent = ancestryTotals.spent;
  const negativePoints = ancestryTotals.negativePoints;
  const minorTraits = ancestryTotals.zeroPointTraits;
  const sorcererOriginBonuses = sorcererOriginAncestryBonuses(draft);
  const sorcererRestrictedAncestries = Object.entries(sorcererOriginBonuses)
    .filter(([, points]) => points > 0)
    .map(([traitAncestry]) => traitAncestry);
  const sorcererOriginBonusTotal = Object.values(sorcererOriginBonuses).reduce((sum, points) => sum + points, 0);
  const ancestrySpentByList = selectedTraits.reduce<Record<string, number>>((totals, trait) => ({
    ...totals,
    [trait.ancestry]: (totals[trait.ancestry] ?? 0) + trait.cost * ancestryTraitSelectionCount(draft, trait),
  }), {});
  const sorcererOriginBonusUsed = Object.entries(sorcererOriginBonuses).reduce((sum, [traitAncestry, points]) => (
    sum + Math.min(points, Math.max(0, ancestrySpentByList[traitAncestry] ?? 0))
  ), 0);
  const skillSpent = masterySpent(skillMasteries);
  const tradeSpent = masterySpent(tradeMasteries);
  const grantedLanguages = grantedClassLanguageNames(draft);
  const languageSpent = fluencySpent(languageFluencies, ['Common', ...grantedLanguages]);
  const advancementAttributePoints = classTotals?.attribute ?? 0;
  const attributeBonusBudget = 2 + advancementAttributePoints + talents.filter((talent) => talent === 'Attribute Increase').length * 2;
  const attributeBonusSpent = ATTRIBUTE_NAMES.reduce((sum, attribute) => sum + (attributeBonusPoints[attribute] ?? 0), 0);
  const pointBuyBudget = 4 + advancementAttributePoints + talents.filter((talent) => talent === 'Attribute Increase').length * 2;
  const pointBuySpent = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  const usesAttributePool = attributeMethod !== 'Point Buy';
  const currentStepIndex = STEPS.findIndex(({ id }) => id === currentStep);
  const paragonTalentClasses = paragonTalentSlotClasses(draft);
  const availableTalentSlots = ordinaryTalentSlots(className, level) + paragonTalentClasses.length;
  const attributePool = attributeMethod === 'Standard Array' ? STANDARD_ARRAY : rolledResults;
  const assignedCount = new Set(attributeAssignments.filter(Boolean)).size;
  const previewClassReference = reference?.classes.find((entry) => entry.name === classPreviewName) ?? null;
  const wizardSchools = ownsClassFeature('Wizard', 'Spell School Initiate') ? featureChoices['wizard.school'] ?? [] : [];
  const wizardSchoolSpellLimit = ownsClassFeature('Wizard', 'Expert Wizard') ? 3 : wizardSchoolSpellGrantLimit(level);
  const wizardSchoolSpellGroups = wizardSchools.map((school) => [
    wizardSchoolSpellSelectionKey(school),
    featureChoices[wizardSchoolSpellSelectionKey(school)] ?? [],
  ] as const);
  const wizardCovenSpell = ownedFeatures.some(({ className: owner, name: feature }) => owner === 'Wizard' && feature === 'Coven’s Gift')
    ? featureChoices['wizard.witchCurseSpell'] ?? [] : [];
  const wizardFeatureSpellNames = wizardSchoolSpellGroups.flatMap(([, names]) => names).concat(wizardCovenSpell);
  const wizardKnownSpellNames = new Set([...selectedSpells, ...wizardFeatureSpellNames]);
  const wizardPreparedLimit = ownsClassFeature('Wizard', 'Expert Wizard') ? 2 : 1;
  const featureChoiceGroups = (reference?.classes.flatMap((ownerReference) => ownerReference.choiceGroups
    .filter((group) => {
      const nativeFeature = ownerReference.name === className && group.level <= level;
      const grantedFeature = ownedFeatures.some(({ className: owner, name: feature, subclass: featureSubclass }) => (
        owner === ownerReference.name
        && feature === group.feature
        && (!group.requiredSubclass || featureSubclass === group.requiredSubclass)
      ));
      const talentFeature = Boolean(group.requiredTalent && talents.includes(group.requiredTalent)
        && talentClassNames.has(ownerReference.name));
      // Multiclass rules require choosing a referenced damage type even when the
      // Feature that normally establishes it was not also gained (Beta p.191).
      const referencedMulticlassChoice = group.id === 'cleric.divineDamage'
        && ownsClassFeature('Cleric', 'Channel Divinity');
      return (nativeFeature || grantedFeature || talentFeature || referencedMulticlassChoice)
        && (!group.requiredSubclass || group.requiredSubclass === subclass
          || ownedFeatures.some(({ className: owner, subclass: ownedSubclass }) => owner === ownerReference.name && ownedSubclass === group.requiredSubclass))
        && (!group.requiredTalent || talents.includes(group.requiredTalent))
        && (group.id !== 'hunter.forestSkills' || (featureChoices['hunter.terrain'] ?? []).includes('Forest'))
        && (group.id !== 'hunter.urbanSkills' || (featureChoices['hunter.terrain'] ?? []).includes('Urban'));
    })
    .map((group) => ({ group, ownerReference }))) ?? []).map(({ group, ownerReference }) => {
    const options: ClassChoiceGroupReference['options'] = group.id === 'wizard.preparedSpells'
      ? Array.from(wizardKnownSpellNames).sort().flatMap((name) => {
        const spell = spells.find(({ name: candidate }) => candidate === name);
        return spell ? [{
          name: spell.name,
          description: `${spell.source} • ${spell.school} • ${spell.cost} • ${spell.range} • ${spell.duration}\n\n${spell.description}${spell.enhancements ? `\n\nEnhancements: ${spell.enhancements}` : ''}`,
          pointCost: 1,
          isRepeatable: false,
        }] : [];
      })
      : group.optionsFromGroup
      ? ownerReference.choiceGroups.find(({ id }) => id === group.optionsFromGroup)?.options ?? []
      : group.options;
    const resolved = { ...group, options };
    const limit = classChoiceSelectionLimit(resolved, draft);
    const hunterTerrainSkillAllocation = ['hunter.forestSkills', 'hunter.urbanSkills'].includes(group.id);
    const alreadyHasDraconicOrigin = group.id === 'sorcerer.draconicOrigin'
      && selectedTraits.some(({ ancestry: traitAncestry, name }) => traitAncestry === 'Dragonborn' && name === 'Draconic Origin');
    return { ...resolved, limit, minimumSelections: alreadyHasDraconicOrigin ? 0 : hunterTerrainSkillAllocation ? limit : group.minimumSelections ?? limit };
  });
  const grantedManeuvers = grantedClassManeuverNames(draft);
  const grantedSpells = grantedClassSpellNames(draft);

  const changeLevel = (nextLevel: number) => {
    const next = Math.min(10, Math.max(1, Math.trunc(nextLevel)));
    setLevelState(next);
    if (attributeMethod === 'Point Buy') {
      setAttributes((current) => Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, Math.min(attributeCap(next), current[attribute])])) as Record<DC20Attribute, number>);
    } else {
      setAttributeBonusPoints((current) => {
        const nextBonuses = Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => {
          const slot = attributeAssignments.findIndex((entry) => entry === attribute);
          const base = slot >= 0 ? attributePool[slot] ?? 0 : 0;
          return [attribute, Math.min(current[attribute] ?? 0, Math.max(0, attributeCap(next) - base))];
        })) as Partial<Record<DC20Attribute, number>>;
        setAttributes(assignedAttributes(attributePool, attributeAssignments, nextBonuses));
        return nextBonuses;
      });
    }
    if (next < 3) setSubclass('');
    if (classReference) {
      setTalents((current) => current.filter((talent) => (
        allTalentDefinitions.some((option) => option.name === talent && option.minimumLevel <= next)
      )).slice(0, ordinaryTalentSlots(classReference.name, next) + paragonTalentSlotClasses({
        ...draft,
        level: next,
        subclass: next >= 3 ? subclass : undefined,
      }).length));
    }
    const validPathLevels = new Set(classPathProgressionLevels(className, next).map(String));
    setPathChoices((current) => Object.fromEntries(Object.entries(current).filter(([pathLevel]) => validPathLevels.has(pathLevel))));
  };
  const setLevel = changeLevel;

  const adjustSkillConversion = (direction: -1 | 1) => {
    if (!derived || !reference) return;
    if (direction > 0) {
      if (skillSpent >= derived.skillPointBudget) return;
      setSkillConversion((current) => current + 1);
      return;
    }
    if (skillConversion <= 0) return;

    const nextSkillConversion = skillConversion - 1;
    const nextTradePoolBeforeConversion = Math.max(0, derived.tradePointBudget + tradeConversion - 2);
    const nextTradeConversion = Math.min(tradeConversion, nextTradePoolBeforeConversion);
    const nextTradeBudget = Math.max(0, nextTradePoolBeforeConversion - nextTradeConversion);
    setSkillConversion(nextSkillConversion);
    setTradeConversion(nextTradeConversion);
    setTradeMasteries((current) => trimMasteriesToBudget(current, nextTradeBudget, reference.trades.map(({ name: tradeName }) => tradeName)));
    if (nextTradeConversion < tradeConversion) {
      setLanguageFluencies((current) => trimLanguagesToBudget(
        current,
        2 + nextTradeConversion * 2,
        ['Common', ...grantedLanguages],
        reference.languages.map(({ name: languageName }) => languageName),
      ));
    }
  };

  const adjustTradeConversion = (direction: -1 | 1) => {
    if (!derived || !reference) return;
    if (direction > 0) {
      if (tradeSpent >= derived.tradePointBudget) return;
      setTradeConversion((current) => current + 1);
      return;
    }
    if (tradeConversion <= 0) return;

    const nextTradeConversion = tradeConversion - 1;
    setTradeConversion(nextTradeConversion);
    setLanguageFluencies((current) => trimLanguagesToBudget(
      current,
      Math.max(0, derived.languagePointBudget - 2),
      ['Common', ...grantedLanguages],
      reference.languages.map(({ name: languageName }) => languageName),
    ));
  };

  const choosePathProgression = (pathLevel: number, path: CharacterPathChoice) => {
    const next = { ...pathChoices, [String(pathLevel)]: path };
    setPathChoices(next);
    if (lacksStartingSpellList && !Object.values(next).includes('Spellcaster')) {
      setSpellListClass('');
      setSelectedSpells([]);
      if (!classReference?.fixedSpellSource) setSpellSource('');
      setSelectedSpellSchools([]);
    }
  };

  const setAttribute = (attribute: DC20Attribute, next: number) => {
    const clamped = Math.max(-2, Math.min(attributeCap(level), Math.trunc(next)));
    setAttributes((current) => {
      const nextTotal = Object.entries(current).reduce((sum, [key, value]) => sum + (key === attribute ? clamped : value), 0);
      return nextTotal <= pointBuyBudget ? { ...current, [attribute]: clamped } : current;
    });
  };

  const assignAttribute = (slot: number, attribute: DC20Attribute | '') => {
    setAttributeAssignments((current) => {
      const next = Array.from({ length: 4 }, (_, index) => current[index] ?? null);
      if (attribute) {
        for (let index = 0; index < next.length; index += 1) if (next[index] === attribute) next[index] = null;
        next[slot] = attribute;
      } else {
        next[slot] = null;
      }
      setAttributes(assignedAttributes(attributePool, next, attributeBonusPoints));
      return next;
    });
  };

  const adjustAssignedAttribute = (attribute: DC20Attribute, direction: -1 | 1) => {
    if (!attributeAssignments.includes(attribute)) return;
    setAttributeBonusPoints((current) => {
      const currentValue = current[attribute] ?? 0;
      const nextValue = currentValue + direction;
      const slot = attributeAssignments.findIndex((entry) => entry === attribute);
      const base = attributePool[slot] ?? 0;
      if (nextValue < 0 || base + nextValue > attributeCap(level)) return current;
      if (direction > 0 && attributeBonusSpent >= attributeBonusBudget) return current;
      const next = { ...current, [attribute]: nextValue };
      setAttributes(assignedAttributes(attributePool, attributeAssignments, next));
      return next;
    });
  };

  const changeAttributeMethod = (method: AttributeSelectionMethod) => {
    setAttributeMethod(method);
    setRolledResults([]);
    setAttributeAssignments([]);
    setAttributeBonusPoints({});
    setAttributes(method === 'Point Buy'
      ? { Might: -2, Agility: -2, Charisma: -2, Intelligence: -2 }
      : EMPTY_ATTRIBUTES);
  };

  const rollAttributes = () => {
    const results = ATTRIBUTE_NAMES.map(() => Math.floor(Math.random() * 6) - 2);
    setRolledResults(results);
    setAttributeAssignments([]);
    setAttributeBonusPoints({});
    setAttributes(EMPTY_ATTRIBUTES);
  };

  const toggleTrait = (trait: AncestryTrait) => {
    if (automaticTraitIDs.has(trait.id)) return;
    const selected = traitIDs.includes(trait.id);
    if (selected) {
      setTraitIDs((current) => current.filter((id) => id !== trait.id));
      setTraitCounts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== trait.id)));
      setTraitChoices((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== trait.id)));
      return;
    }
    if (trait.countsAsZeroPointTrait && minorTraits >= 1) return;
    if (trait.cost < 0 && negativePoints - trait.cost > 2) return;
    if (!ancestryTraitPrerequisiteMet(draft, trait, selectedTraits)) return;
    if (!trait.isRepeatable && selectedTraits.some((selectedTrait) => selectedTrait.name === trait.name)) return;
    if (!canAddAncestryTraitCopy(draft, selectedTraits, trait)) return;
    setTraitIDs((current) => [...current, trait.id]);
    setTraitCounts((current) => ({ ...current, [trait.id]: 1 }));
  };

  const adjustRepeatableTrait = (trait: AncestryTrait, direction: -1 | 1) => {
    if (!trait.isRepeatable || automaticTraitIDs.has(trait.id)) return;
    const count = ancestryTraitSelectionCount(draft, trait);
    if (direction < 0) {
      if (count <= 1) { toggleTrait(trait); return; }
      setTraitCounts((current) => ({ ...current, [trait.id]: count - 1 }));
      setTraitChoices((current) => ({ ...current, [trait.id]: (current[trait.id] ?? []).slice(0, count - 1) }));
      return;
    }
    const maximum = trait.name === 'Keen Sense' ? 3
      : trait.name === 'Capable Limb'
        ? selectedTraits.filter(({ ancestry: traitAncestry, name }) => traitAncestry === 'Beastborn' && name === 'Additional Limb')
          .reduce((sum, entry) => sum + ancestryTraitSelectionCount(draft, entry), 0)
        : Number.POSITIVE_INFINITY;
    if (count >= maximum || !ancestryTraitPrerequisiteMet(draft, trait, selectedTraits)) return;
    if (trait.countsAsZeroPointTrait && minorTraits >= 1) return;
    if (trait.cost < 0 && negativePoints - trait.cost > 2) return;
    if (!canAddAncestryTraitCopy(draft, selectedTraits, trait)) return;
    if (count === 0) setTraitIDs((current) => [...current, trait.id]);
    setTraitCounts((current) => ({ ...current, [trait.id]: Math.max(1, count + 1) }));
    if (trait.name === 'Keen Sense') setTraitChoices((current) => ({ ...current, [trait.id]: [...(current[trait.id] ?? []), ''] }));
  };

  const setClass = (next: string) => {
    setClassName(next);
    setSubclass('');
    setTalents([]);
    setFeatureChoices({});
    setSelectedSpells([]);
    setSelectedCantrips([]);
    setSelectedManeuvers([]);
    setSpellListClass('');
    const nextReference = reference?.classes.find(({ name: candidate }) => candidate === next);
    setSpellSource(nextReference?.fixedSpellSource ?? '');
    setSelectedSpellSchools([]);
    setPathChoices({});
  };

  const confirmClass = () => {
    if (!previewClassReference) return;
    if (previewClassReference.name !== className) setClass(previewClassReference.name);
    setClassConfirmed(true);
  };

  const toggleLimited = (values: string[], value: string, limit: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(values.includes(value) ? values.filter((entry) => entry !== value) : values.length < limit ? [...values, value] : values);
  };

  const adjustTalent = (talent: TalentDefinition, direction: -1 | 1) => {
    const name = talent.name;
    if (direction > 0 && reference && !talentEligibility(talent, draft, reference).available) return;
    if (direction < 0 && isMulticlassTalentName(name)) {
      const key = MULTICLASS_SELECTION_KEYS[name];
      const nextCount = Math.max(0, talents.filter((candidate) => candidate === name).length - 1);
      setFeatureChoices((current) => ({ ...current, [key]: (current[key] ?? []).slice(0, nextCount) }));
    }
    if (direction < 0 && name === 'Martial Expansion') {
      setFeatureChoices((current) => { const next = { ...current }; delete next[MARTIAL_EXPANSION_REGEN]; return next; });
    }
    if (direction < 0 && name === 'Spellcasting Expansion') {
      setFeatureChoices((current) => {
        const next = { ...current };
        delete next[SPELLCASTING_EXPANSION_MODE];
        delete next[SPELLCASTING_EXPANSION_SOURCE];
        delete next[SPELLCASTING_EXPANSION_SCHOOLS];
        return next;
      });
    }
    setTalents((current) => {
      if (direction < 0) {
        const index = current.lastIndexOf(name);
        return index < 0 ? current : current.filter((_, candidate) => candidate !== index);
      }
      if (current.length >= availableTalentSlots || (!talent.isRepeatable && current.includes(name))) return current;
      return [...current, name];
    });
  };

  const setMulticlassChoice = (talentName: MulticlassTalentName, index: number, choice: string) => {
    const key = MULTICLASS_SELECTION_KEYS[talentName];
    setFeatureChoices((current) => {
      const next = [...(current[key] ?? [])];
      next[index] = choice;
      return { ...current, [key]: next };
    });
  };

  const setFeatureChoice = (group: ClassChoiceGroupReference, option: string) => {
    const wasSelected = (featureChoices[group.id] ?? []).includes(option);
    setFeatureChoices((current) => {
      const selected = current[group.id] ?? [];
      const updated = selected.includes(option)
        ? selected.filter((entry) => entry !== option)
        : group.limit === 1 ? [option] : selected.length < group.limit ? [...selected, option] : selected;
      const next = { ...current, [group.id]: updated };
      if (group.id === 'spellblade.disciplines' && ownedFeatures.some(({ className: owner, name: feature }) => owner === 'Spellblade' && feature === 'Holy Warrior')) {
        const paladinChoice = next['spellblade.paladinDiscipline'] ?? [];
        if (!updated.includes('Acolyte')) next['spellblade.paladinDiscipline'] = ['Acolyte'];
        else if (paladinChoice[0] === 'Acolyte' || updated.includes(paladinChoice[0])) next['spellblade.paladinDiscipline'] = [];
      }
      if (group.id === 'hunter.terrain' && wasSelected) {
        if (option === 'Forest') delete next['hunter.forestSkills'];
        if (option === 'Urban') delete next['hunter.urbanSkills'];
      }
      if (group.id === 'wizard.school' && wasSelected) {
        delete next[wizardSchoolSpellSelectionKey(option)];
        delete next['wizard.preparedSpells'];
      }
      return next;
    });
    if (group.id === 'barbarian.guardianManeuver' && !wasSelected) {
      setSelectedManeuvers((current) => current.filter((name) => name !== option));
    }
    if (group.id.startsWith('summoner.') && group.id !== 'summoner.creatureSpecialistSpell' && !wasSelected) {
      setSelectedSpells((current) => current.filter((name) => name !== option));
    }
  };

  const toggleStoredFeatureChoice = (groupID: string, option: string, limit: number) => {
    setFeatureChoices((current) => {
      const selected = current[groupID] ?? [];
      const updated = selected.includes(option)
        ? selected.filter((entry) => entry !== option)
        : selected.length < limit ? [...selected, option] : selected;
      return { ...current, [groupID]: updated };
    });
  };

  const setStoredFeatureChoiceAtIndex = (groupID: string, index: number, value: string) => {
    setFeatureChoices((current) => {
      const updated = [...(current[groupID] ?? [])];
      updated[index] = value;
      return { ...current, [groupID]: updated };
    });
  };

  const setClericMagicDomainTag = (index: number, value: string) => {
    setFeatureChoices((current) => {
      const tags = [...(current['cleric.magicDomainTags'] ?? [])];
      const domainSpells = [...(current['cleric.magicDomainSpells'] ?? [])];
      tags[index] = value;
      domainSpells[index] = '';
      return { ...current, 'cleric.magicDomainTags': tags, 'cleric.magicDomainSpells': domainSpells };
    });
  };

  const adjustRepeatableFeatureChoice = (group: ClassChoiceGroupReference, option: string, direction: -1 | 1) => {
    setFeatureChoices((current) => {
      const selected = current[group.id] ?? [];
      const optionReference = group.options.find(({ name }) => name === option);
      const optionCount = selected.filter((entry) => entry === option).length;
      if (direction < 0) {
        const index = selected.lastIndexOf(option);
        return index < 0 ? current : { ...current, [group.id]: selected.filter((_, candidate) => candidate !== index) };
      }
      if (optionReference?.maximumCount !== undefined && optionCount >= optionReference.maximumCount) return current;
      return selected.length >= group.limit ? current : { ...current, [group.id]: [...selected, option] };
    });
    if (group.id === 'cleric.domains' && option === 'Magic') setSelectedSpells([]);
  };

  const summonerSpellGrantGroups = new Set([
    'summoner.bondedSummon',
    ...(ownedFeatures.some(({ className: owner, name: feature }) => owner === 'Summoner' && feature === 'Summon Chimera') ? ['summoner.chimeraSummons'] : []),
    ...(ownedFeatures.some(({ className: owner, name: feature }) => owner === 'Summoner' && feature === 'Unending March') ? ['summoner.dreadLordSummon'] : []),
    ...(talents.includes('Horde Summoner') ? ['summoner.hordeSummons'] : []),
  ]);
  const classChoiceOptionDisabled = (group: ClassChoiceGroupReference, option: string): boolean => {
    if (group.id === 'spellblade.paladinDiscipline') {
      const baseDisciplines = featureChoices['spellblade.disciplines'] ?? [];
      return baseDisciplines.includes('Acolyte')
        ? option === 'Acolyte' || baseDisciplines.includes(option)
        : option !== 'Acolyte';
    }
    if (group.id === 'wizard.witchCurseSpell') {
      return selectedSpells.includes(option)
        || wizardSchoolSpellGroups.some(([, names]) => names.includes(option));
    }
    if (!group.id.startsWith('summoner.')) return false;
    const knownOutsideGroup = new Set([
      ...selectedSpells,
      ...Array.from(summonerSpellGrantGroups)
        .filter((groupID) => groupID !== group.id)
        .flatMap((groupID) => featureChoices[groupID] ?? []),
    ]);
    if (group.id === 'summoner.creatureSpecialistSpell') return !knownOutsideGroup.has(option);
    if (group.id === 'summoner.dreadLordSummon') {
      const alreadyKnowsUndead = knownOutsideGroup.has('Summon Undead');
      return alreadyKnowsUndead ? option === 'Summon Undead' || knownOutsideGroup.has(option) : option !== 'Summon Undead';
    }
    return knownOutsideGroup.has(option);
  };

  const hasSpells = (derived?.spellLimit ?? 0) > 0 || (derived?.cantripLimit ?? 0) > 0;
  const hasMartialExpansion = talents.includes('Martial Expansion');
  const hasSpellcastingExpansion = talents.includes('Spellcasting Expansion');
  const spellcastingExpansionMode = featureChoices[SPELLCASTING_EXPANSION_MODE]?.[0] ?? '';
  const spellcastingExpansionSource = featureChoices[SPELLCASTING_EXPANSION_SOURCE]?.[0] ?? '';
  const spellcastingExpansionSchools = featureChoices[SPELLCASTING_EXPANSION_SCHOOLS] ?? [];
  const martialExpansionRegenOptions = [
    ...(reference?.classes.filter(({ pathDetails }) => pathDetails.includes('Stamina Regen:')).map(({ name: option }) => option) ?? []),
    'Spellcaster Path',
  ];
  const martialExpansionRegen = featureChoices[MARTIAL_EXPANSION_REGEN]?.[0] ?? '';
  const martialExpansionRegenText = martialExpansionRegen === 'Spellcaster Path'
    ? 'Once per round, you regain up to half your maximum SP when you use a Spell Enhancement.'
    : reference?.classes.find(({ name: option }) => option === martialExpansionRegen)?.pathDetails.split('Stamina Regen:')[1]?.trim() ?? '';
  const spellcasterPathCount = Object.values(pathChoices).filter((path) => path === 'Spellcaster').length;
  const lacksStartingSpellList = (classTotals?.spells ?? 0) + (classTotals?.cantrips ?? 0) === 0;
  const needsBorrowedSpellList = hasSpells && lacksStartingSpellList && spellcasterPathCount > 0;
  const spellListClasses = reference?.classes.filter((entry) => entry.tableRows.some((row) => (row.spells ?? 0) > 0 || (row.cantrips ?? 0) > 0)) ?? [];
  const spellAccessClassName = needsBorrowedSpellList ? spellListClass : className;
  const spellAccessReference = reference?.classes.find((entry) => entry.name === spellAccessClassName) ?? null;
  const spellAccessHasPublishedList = Boolean(needsBorrowedSpellList || spellAccessReference?.tableRows.some((row) => (
    (row.spells ?? 0) > 0 || (row.cantrips ?? 0) > 0
  )));
  const canChooseSpellSource = hasSpells && spellAccessHasPublishedList && Boolean(spellAccessReference) && !spellAccessReference?.fixedSpellSource
    && !['Bard', 'Psion', 'Spellblade', 'Summoner', 'Warlock'].includes(spellAccessClassName);
  const spellSchoolChoiceCount = spellAccessReference?.schoolChoiceCount ?? 0;
  const clericDomains = ownsClassFeature('Cleric', 'Cleric Order') ? featureChoices['cleric.domains'] ?? [] : [];
  const clericMagicDomainCount = clericDomains.filter((domain) => domain === 'Magic').length;
  const clericMagicDomainTags = (featureChoices['cleric.magicDomainTags'] ?? []).slice(0, clericMagicDomainCount);
  const clericMagicDomainSpells = (featureChoices['cleric.magicDomainSpells'] ?? []).slice(0, clericMagicDomainCount);
  const clericHasWarDomain = clericDomains.includes('War');
  const clericHasPeaceDomain = clericDomains.includes('Peace');
  const clericHasKnowledgeDomain = clericDomains.includes('Knowledge');
  const clericSpellTags = Array.from(new Set(spells.flatMap(({ tags }) => (tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)))).sort();
  const clericAttackManeuvers = maneuvers.filter(({ category }) => category === 'Attack');
  const clericDefenseManeuvers = maneuvers.filter(({ category }) => category === 'Defense');
  const allowedSpells = (() => {
    if (!spellAccessReference || !hasSpells) return [];
    return spells.filter((spell) => {
      const classSpell = spellAccessHasPublishedList && spellIsAvailableToClass(
        spellAccessClassName,
        spell,
        spellAccessReference.fixedSpellSource,
        spellSource,
        selectedSpellSchools,
        subclass,
        clericMagicDomainTags,
      );
      const expansionSpell = hasSpellcastingExpansion && (spellcastingExpansionMode === 'Source'
        ? spell.source.split(', ').includes(spellcastingExpansionSource)
        : spellcastingExpansionMode === 'Schools' && spellcastingExpansionSchools.includes(spell.school));
      return classSpell || expansionSpell;
    });
  })();
  const psionCantripOptions = className === 'Psion'
    ? allowedSpells.filter(({ cost }) => cost.includes('0 MP') || !cost.includes('MP'))
    : [];
  const hasManeuvers = (derived?.maneuverLimit ?? 0) > 0 || grantedManeuvers.length > 0;
  const warlockBoons = new Set(ownsClassFeature('Warlock', 'Pact Boon') ? featureChoices['warlock.boon'] ?? [] : []);
  const hasPactWeapon = warlockBoons.has('Pact Weapon');
  const hasPactArmor = warlockBoons.has('Pact Armor');
  const hasPactSpell = warlockBoons.has('Pact Spell');
  const warlockGrantedManeuverLimit = ownsClassFeature('Warlock', 'Expert Warlock') ? 3 : 2;
  const warlockAttackManeuvers = maneuvers.filter(({ category }) => category === 'Attack');
  const warlockDefenseManeuvers = maneuvers.filter(({ category }) => category === 'Defense');
  const warlockExpertSpells = featureChoices['warlock.expertSpells'] ?? [];
  const warlockPactSpells = featureChoices['warlock.pactSpells'] ?? [];
  const warlockPactSpellLimit = ownsClassFeature('Warlock', 'Expert Warlock') ? 2 : 1;
  const pactBaneCount = talents.filter((talent) => talent === 'Pact Bane').length;
  const pactBaneSpells = featureChoices['warlock.pactBaneSpells'] ?? [];
  const baneKnownOutsideTalent = selectedSpells.includes('Bane')
    || warlockExpertSpells.includes('Bane');
  const warlockKnownSpellNames = new Set([...selectedSpells, ...grantedSpells]);
  const warlockKnownBeforeExpert = new Set([
    ...selectedSpells,
    ...grantedSpells.filter((spell) => !warlockExpertSpells.includes(spell)),
  ]);
  const pactBaneOptions = Array.from(new Set(['Bane', ...allowedSpells.map(({ name }) => name)]))
    .flatMap((name) => spells.filter((spell) => spell.name === name));
  const bardMagicalSecrets = ownsClassFeature('Bard', 'Remarkable Repertoire') ? featureChoices['bard.magicalSecrets'] ?? [] : [];
  const bardExpertSecrets = ownsClassFeature('Bard', 'Expert Bard') ? featureChoices['bard.expertSecrets'] ?? [] : [];
  const bardExpandedSecrets = ownsClassFeature('Bard', 'Remarkable Repertoire') && talents.includes('Expanded Repertoire')
    ? featureChoices['bard.expandedRepertoireSpells'] ?? [] : [];
  const bardHasEloquence = ownedFeatures.some(({ className: owner, name: feature }) => owner === 'Bard' && feature === 'Beguiling Presence');
  const bardEnthrallSpell = bardHasEloquence
    ? featureChoices['bard.enthrallSpell'] ?? [] : [];
  const bardFeatureSpellGroups = [
    ['bard.magicalSecrets', bardMagicalSecrets],
    ...(ownsClassFeature('Bard', 'Expert Bard') ? [['bard.expertSecrets', bardExpertSecrets] as const] : []),
    ...(talents.includes('Expanded Repertoire')
      ? [['bard.expandedRepertoireSpells', bardExpandedSecrets] as const] : []),
    ...(bardHasEloquence ? [['bard.enthrallSpell', bardEnthrallSpell] as const] : []),
  ] as Array<readonly [string, string[]]>;
  const bardKnownOutside = (groupID: string) => new Set([
    ...selectedSpells,
    ...bardFeatureSpellGroups.filter(([candidate]) => candidate !== groupID).flatMap(([, names]) => names),
  ]);
  const bardKnownBeforeEnthrall = bardKnownOutside('bard.enthrallSpell');
  const bardEnthrallOptions = bardKnownBeforeEnthrall.has('Charm')
    ? spells.filter(({ name, tags }) => name !== 'Charm' && (tags ?? '').split(',').some((tag) => tag.trim().toLowerCase() === 'charmed'))
    : spells.filter(({ name }) => name === 'Charm');
  const championMasterAtArmsManeuver = ownsClassFeature('Champion', 'Master-at-Arms')
    ? featureChoices['champion.masterAtArmsManeuver'] ?? [] : [];
  const championExpertManeuvers = ownsClassFeature('Champion', 'Expert Champion')
    ? featureChoices['champion.expertManeuvers'] ?? [] : [];
  const championKnownOutside = (groupID: string) => new Set([
    ...selectedManeuvers,
    ...(groupID === 'champion.masterAtArmsManeuver' ? championExpertManeuvers : championMasterAtArmsManeuver),
  ]);

  const startingEquipment = (() => {
    if (!classReference) return { arsenal: [], armor: [], tools: [] };
    const training = classReference.startingEquipment;
    const hasWarriorDiscipline = className === 'Spellblade'
      && [
        ...(featureChoices['spellblade.disciplines'] ?? []),
        ...(featureChoices['spellblade.paladinDiscipline'] ?? []),
      ].includes('Warrior');
    const arsenal = equipment.filter((item) => (
      (training.arsenal.includes('Weapon') && item.category === 'Weapons')
      || (hasPactWeapon && item.category === 'Weapons')
      || (training.arsenal.includes('Light Weapon') && item.category === 'Weapons' && item.slot === 'One Hand')
      || (training.arsenal.includes('Spell Focus') && item.category === 'Spell Focuses')
      || ((training.arsenal.includes('Shield') || training.arsenal.includes(item.name)) && item.category === 'Shields')
      || (hasWarriorDiscipline && item.category === 'Shields' && item.subtype === 'Heavy Shield')
      || (clericHasPeaceDomain && item.category === 'Shields' && item.subtype === 'Heavy Shield')
      || training.arsenal.includes(item.name)
    )).sort((a, b) => a.name.localeCompare(b.name));
    const armor = equipment.filter((item) => item.category === 'Armor' && (
      training.armor.includes(item.name) || (hasWarriorDiscipline && item.subtype === 'Heavy Armor')
      || (hasPactArmor && item.subtype === 'Heavy Armor')
      || (clericHasPeaceDomain && item.subtype === 'Heavy Armor')
    )).sort((a, b) => a.name.localeCompare(b.name));
    const tools = equipment.filter((item) => item.category === 'Trade Tools' && training.tradeTools.some((tool) => item.name.includes(tool) || item.subtype.includes(tool))).sort((a, b) => a.name.localeCompare(b.name));
    return { arsenal, armor, tools };
  })();

  const toggleStartingEquipment = (equipmentID: string, group: 'arsenal' | 'armor' | 'tools') => {
    const existing = inventoryItems.find((entry) => entry.equipmentID === equipmentID && entry.source === 'startingEquipment');
    if (existing) {
      setInventoryItems((current) => current.filter(({ id }) => id !== existing.id));
      return;
    }
    const limits = { arsenal: classReference?.startingEquipment.arsenalCount ?? 0, armor: 1, tools: classReference?.startingEquipment.tradeToolCount ?? 0 };
    const groupIDs = new Set(startingEquipment[group].map(({ id }) => id));
    if (inventoryItems.filter((entry) => entry.source === 'startingEquipment' && groupIDs.has(entry.equipmentID)).length >= limits[group]) return;
    const next: CharacterInventoryItem = { id: generateUUID(), equipmentID, quantity: 1, isEquipped: false, source: 'startingEquipment' };
    const withItem = [...inventoryItems, next];
    setInventoryItems(toggleInventoryEquipped(withItem, next.id, equipment));
  };

  const validation = (() => {
    const issues: string[] = [];
    if (!name.trim()) issues.push('Enter a character name.');
    if (!derived) issues.push('Character rules are still loading.');
    if (usesAttributePool && (attributePool.length !== 4 || assignedCount !== 4)) issues.push('Assign every Standard Array or rolled value to an Attribute.');
    if (usesAttributePool && attributeBonusSpent !== attributeBonusBudget) issues.push(`Spend all Attribute Points (${attributeBonusBudget - attributeBonusSpent} remaining).`);
    if (!usesAttributePool && pointBuySpent !== pointBuyBudget) issues.push(`Spend all Attribute Points (${pointBuyBudget - pointBuySpent} remaining).`);
    if (derived && skillSpent > derived.skillPointBudget) issues.push('Skill mastery exceeds the available Skill Points.');
    if (derived && tradeSpent > derived.tradePointBudget) issues.push('Trade mastery exceeds the available Trade Points.');
    if (derived && languageSpent > derived.languagePointBudget) issues.push('Language fluency exceeds the available Language Points.');
    if (derived && ancestrySpent !== derived.ancestryPointBudget) issues.push(ancestrySpent < derived.ancestryPointBudget
      ? `Spend all Ancestry Points (${derived.ancestryPointBudget - ancestrySpent} remaining).`
      : `Ancestry traits exceed the available Ancestry Points by ${ancestrySpent - derived.ancestryPointBudget}.`);
    if (negativePoints > 2) issues.push('Negative ancestry traits can grant at most 2 points.');
    if (sorcererOriginBonusTotal > 0 && derived
      && ancestrySpent - sorcererOriginBonusUsed > derived.ancestryPointBudget - sorcererOriginBonusTotal) {
      issues.push(`Sorcerous Origin bonus Ancestry Points must be spent on ${sorcererRestrictedAncestries.join(' and ')} Traits.`);
    }
    if (minorTraits > 1) issues.push('Choose at most one 0-point minor ancestry trait.');
    const duplicateTraitNames = selectedTraits.filter((trait, index) => !trait.isRepeatable && selectedTraits.findIndex(({ name }) => name === trait.name) !== index).map(({ name }) => name);
    if (duplicateTraitNames.length > 0) issues.push(`Remove duplicate Ancestry Traits: ${Array.from(new Set(duplicateTraitNames)).join(', ')}.`);
    selectedTraits.forEach((trait) => {
      if (!accessibleAncestries.has(trait.ancestry)) issues.push(`${trait.name} is no longer available from the selected Ancestry Lists.`);
      if (!ancestryTraitPrerequisiteMet(draft, trait, selectedTraits)) issues.push(`${trait.name} requires ${ancestryRequirementLabel(trait)}.`);
      const options = choiceOptions(trait, reference?.skills ?? [], reference?.trades ?? [], spells, traitChoices);
      const count = ancestryTraitSelectionCount(draft, trait);
      const choices = traitChoices[trait.id] ?? [];
      if (trait.name === 'Beastkind' && !choices[0]?.trim()) issues.push('Name the Beastborn Origin granted by Beastkind.');
      if (options.length > 0 && trait.name !== 'Keen Sense' && !choices[0]) issues.push(`Complete the required choice for ${trait.name}.`);
      if (options.length > 0 && trait.name !== 'Keen Sense' && choices[0] && !options.includes(choices[0])) issues.push(`Choose a valid option for ${trait.name}.`);
      if (trait.name === 'Keen Sense' && (choices.slice(0, count).filter(Boolean).length !== count || new Set(choices.slice(0, count)).size !== count)) issues.push('Choose a different sense for every copy of Keen Sense.');
      if (trait.name === 'Capable Limb') {
        const additionalLimb = selectedTraits.find(({ ancestry: traitAncestry, name }) => traitAncestry === 'Beastborn' && name === 'Additional Limb');
        const additionalCount = additionalLimb ? ancestryTraitSelectionCount(draft, additionalLimb) : 0;
        if (count > additionalCount) issues.push('Capable Limb can only be selected once per Additional Limb.');
      }
    });
    if (ownsClassFeature('Rogue', 'Roguish Finesse') && selectedTraits.some(({ name }) => name === 'Skill Expertise')) issues.push('Roguish Finesse already increases every Skill Mastery Limit; replace the Skill Expertise ancestry trait because these increases cannot stack.');
    if (talents.length > availableTalentSlots) issues.push('Too many Talents are selected.');
    const paragonSlotsByClass = paragonTalentClasses.reduce<Record<string, number>>((counts, talentClass) => ({
      ...counts,
      [talentClass]: (counts[talentClass] ?? 0) + 1,
    }), {});
    const paragonCoveredTalents = reference ? Object.entries(paragonSlotsByClass).reduce((covered, [talentClass, slots]) => {
      const matching = talents.filter((name) => talentByName(reference, name)?.category === 'Class'
        && talentByName(reference, name)?.className === talentClass).length;
      return covered + Math.min(slots, matching);
    }, 0) : 0;
    if (reference && talents.length - paragonCoveredTalents > ordinaryTalentSlots(className, level)) {
      issues.push('Each Paragon Talent slot must be used for a Class Talent from the Class that granted that Paragon Feature.');
    }
    for (const talentName of new Set(talents)) {
      const talent = reference ? talentByName(reference, talentName) : undefined;
      if (!talent) {
        issues.push(`${talentName} is not present in the audited Talent catalog.`);
        continue;
      }
      const eligibility = talentEligibility(talent, draft, reference!);
      if (!eligibility.available) issues.push(`${talentName}: ${eligibility.reason}`);
      if (!talent.isRepeatable && talents.filter((name) => name === talentName).length > 1) {
        issues.push(`${talentName} can only be gained once.`);
      }
      if (isMulticlassTalentName(talentName)) {
        const choices = featureChoices[MULTICLASS_SELECTION_KEYS[talentName]] ?? [];
        const count = talents.filter((name) => name === talentName).length;
        if (choices.slice(0, count).filter(Boolean).length !== count) issues.push(`Choose the Class Feature granted by every copy of ${talentName}.`);
        choices.slice(0, count).forEach((choice) => {
          if (!multiclassChoiceIsValid(talentName, choice, draft, reference!)) issues.push(`Replace an invalid or duplicate ${talentName} Feature choice.`);
        });
      }
    }
    if (hasMartialExpansion && !martialExpansionRegenOptions.includes(martialExpansionRegen)) {
      issues.push('Choose the Stamina Regen granted by Martial Expansion.');
    }
    if (hasSpellcastingExpansion) {
      if (!['Source', 'Schools'].includes(spellcastingExpansionMode)) issues.push('Choose whether Spellcasting Expansion adds 1 Spell Source or 3 Spell Schools.');
      if (spellcastingExpansionMode === 'Source' && !spellcastingExpansionSource) issues.push('Choose the Spell Source granted by Spellcasting Expansion.');
      if (spellcastingExpansionMode === 'Schools' && spellcastingExpansionSchools.length !== 3) issues.push('Choose exactly 3 Spell Schools for Spellcasting Expansion.');
    }
    if (level >= 3 && classReference?.subclasses.length && !subclass) issues.push('Choose a subclass.');
    if (!classConfirmed) issues.push('Review and confirm a class.');
    if (needsBorrowedSpellList && !spellListClass) issues.push('Choose the Class Spell List granted by Spellcaster Path progression.');
    if (canChooseSpellSource && !spellSource) issues.push('Choose a Spell Source.');
    if (spellSchoolChoiceCount > 0 && selectedSpellSchools.length !== spellSchoolChoiceCount) issues.push(`Choose ${spellSchoolChoiceCount} Spell Schools.`);
    if (derived && selectedSpells.length > derived.spellLimit) issues.push('Too many Spells are selected.');
    if (derived && selectedManeuvers.length > derived.maneuverLimit) issues.push('Too many Maneuvers are selected.');
    if (className === 'Psion' && derived) {
      if (selectedSpells.length !== derived.spellLimit) issues.push(`Choose exactly ${derived.spellLimit} Psion Class Table Spells.`);
      if (selectedCantrips.length !== derived.cantripLimit) issues.push(`Choose exactly ${derived.cantripLimit} Psion Class Table Cantrips.`);
      if (selectedSpells.some((spell) => !allowedSpells.some(({ name: option }) => option === spell))) issues.push('Remove Spells that are no longer on the Psion Spell List.');
      if (selectedCantrips.some((spell) => !psionCantripOptions.some(({ name: option }) => option === spell))) issues.push('Remove Cantrips that are no longer available to the Psion.');
      const duplicatePsionPowers = [...selectedSpells, ...selectedCantrips, ...grantedSpells]
        .filter((spell, index, all) => all.indexOf(spell) !== index);
      if (duplicatePsionPowers.length > 0) issues.push(`A Psion power can only be learned once: ${Array.from(new Set(duplicatePsionPowers)).join(', ')}.`);
    }
    for (const group of featureChoiceGroups) {
      const count = (featureChoices[group.id] ?? []).length;
      if (group.options.length > 0 && count < (group.minimumSelections ?? group.limit)) issues.push(`Complete the ${group.title} class feature choice.`);
      if (count > group.limit) issues.push(`Choose no more than ${group.limit} options for ${group.title}.`);
      if (group.id === 'spellblade.paladinDiscipline' && (featureChoices[group.id] ?? []).some((option) => classChoiceOptionDisabled(group, option))) issues.push('Correct the Holy Warrior bonus Discipline choice.');
    }
    if (className === 'Hunter') {
      for (const groupID of ['hunter.forestSkills', 'hunter.urbanSkills']) {
        const allocations = featureChoices[groupID] ?? [];
        for (const skillName of new Set(allocations)) {
          const allocatedPoints = allocations.filter((name) => name === skillName).length;
          if (masteryRank(skillMasteries[skillName]) < allocatedPoints) {
            issues.push(`Apply ${allocatedPoints} ${groupID.includes('forest') ? 'Forest' : 'Urban'} Skill Point${allocatedPoints === 1 ? '' : 's'} to ${skillName} on the Skills step.`);
          }
        }
      }
    }
    if (ownsClassFeature('Bard', 'Remarkable Repertoire')) {
      if (bardMagicalSecrets.length !== 2) issues.push('Choose the 2 Spells from any Spell List granted by Magical Secrets.');
      if (ownsClassFeature('Bard', 'Expert Bard') && bardExpertSecrets.length !== 2) issues.push('Choose the 2 additional Spells from any Spell List granted by Expert Bard.');
      if (talents.includes('Expanded Repertoire') && bardExpandedSecrets.length !== 2) issues.push('Choose the 2 Spells from any Spell List granted by Expanded Repertoire.');
      if (bardHasEloquence && bardEnthrallOptions.length > 0 && bardEnthrallSpell.length !== 1) issues.push('Choose the Spell granted by Enthrall.');
      if (!bardKnownBeforeEnthrall.has('Charm') && bardEnthrallSpell[0] && bardEnthrallSpell[0] !== 'Charm') issues.push('Enthrall grants Charm unless it is already known.');
      const allBardSpells = [...selectedSpells, ...bardFeatureSpellGroups.flatMap(([, names]) => names)];
      if (new Set(allBardSpells).size !== allBardSpells.length) issues.push('A Bard Spell can only be learned once across the class table and Repertoire Features.');
      if (selectedSpells.some((spell) => !allowedSpells.some(({ name }) => name === spell))) issues.push('Remove Spells that are no longer on the Bard Spell List.');
    }
    if (ownsClassFeature('Champion', 'Master-at-Arms')) {
      if (championMasterAtArmsManeuver.length !== 1) issues.push('Choose the Maneuver granted by Master-at-Arms.');
      if (ownsClassFeature('Champion', 'Expert Champion') && championExpertManeuvers.length !== 2) issues.push('Choose the 2 additional Maneuvers granted by Expert Champion.');
      const allChampionManeuvers = [...selectedManeuvers, ...championMasterAtArmsManeuver, ...championExpertManeuvers];
      if (new Set(allChampionManeuvers).size !== allChampionManeuvers.length) issues.push('A Champion Maneuver can only be learned once across the class table and Master-at-Arms.');
    }
    if (ownsClassFeature('Cleric', 'Cleric Order')) {
      const warManeuvers = featureChoices['cleric.warManeuver'] ?? [];
      const peaceManeuvers = featureChoices['cleric.peaceManeuver'] ?? [];
      if (clericHasWarDomain && warManeuvers.length !== 1) issues.push('Choose the Attack Maneuver granted by the War Domain.');
      if (clericHasPeaceDomain && peaceManeuvers.length !== 1) issues.push('Choose the Defense Maneuver granted by the Peace Domain.');
      if (clericMagicDomainTags.length !== clericMagicDomainCount || clericMagicDomainTags.some((tag) => !tag)) issues.push('Choose a Spell Tag for each Magic Domain.');
      if (clericMagicDomainSpells.length !== clericMagicDomainCount || clericMagicDomainSpells.some((spell) => !spell)) issues.push('Choose the Spell granted by each Magic Domain.');
      if (new Set(clericMagicDomainSpells).size !== clericMagicDomainSpells.length) issues.push('Each Magic Domain must grant a different Spell.');
      clericMagicDomainSpells.forEach((spellName, index) => {
        const spell = spells.find(({ name: candidate }) => candidate === spellName);
        const tag = clericMagicDomainTags[index];
        if (spell && tag && !(spell.tags ?? '').split(',').some((candidate) => candidate.trim().toLowerCase() === tag.toLowerCase())) issues.push(`${spellName} must match the ${tag} tag chosen for Magic Domain ${index + 1}.`);
      });
      if (selectedSpells.some((spell) => !allowedSpells.some(({ name }) => name === spell))) issues.push('Remove Spells that are no longer on the Cleric Spell List.');
    }
    if (className === 'Sorcerer') {
      const metaMagic = featureChoices['sorcerer.metaMagic'] ?? [];
      if (subclass === 'Angelic' && !metaMagic.includes('Careful Spell')) issues.push('Celestial Protection grants Careful Spell; include it among the known Meta Magic options.');
      if (subclass === 'Draconic' && !metaMagic.includes('Transmuted Spell')) issues.push('Draconic Transmutation grants Transmuted Spell; include it among the known Meta Magic options.');
      const appearanceLanguage = subclass === 'Angelic' ? { native: 'Celestial', choice: featureChoices['sorcerer.celestialLanguage']?.[0] }
        : subclass === 'Draconic' ? { native: 'Draconic', choice: featureChoices['sorcerer.draconicLanguage']?.[0] } : null;
      if (appearanceLanguage?.choice) {
        const fluencyBeforeAppearance = (language: string) => language === 'Common' || grantedLanguages.includes(language)
          ? 2 : fluencyRank(languageFluencies[language] ?? 'Untrained');
        const nativeIsFluent = fluencyBeforeAppearance(appearanceLanguage.native) >= 2;
        if (!nativeIsFluent && appearanceLanguage.choice !== appearanceLanguage.native) {
          issues.push(`${subclass} Appearance must increase ${appearanceLanguage.native} unless the character is already Fluent in it.`);
        }
        if (nativeIsFluent && appearanceLanguage.choice === appearanceLanguage.native) {
          issues.push(`${subclass} Appearance must increase another Language because the character is already Fluent in ${appearanceLanguage.native}.`);
        }
        if (appearanceLanguage.choice !== appearanceLanguage.native && fluencyBeforeAppearance(appearanceLanguage.choice) >= 2) {
          issues.push(`${subclass} Appearance must increase a Language that is not already Fluent.`);
        }
      }
    }
    if (ownsClassFeature('Wizard', 'Spell School Initiate')) {
      if (className === 'Wizard' && derived && selectedSpells.length !== derived.spellLimit) issues.push(`Choose exactly ${derived.spellLimit} Wizard Class Table Spells.`);
      if (className === 'Wizard' && selectedSpells.some((spell) => !allowedSpells.some(({ name }) => name === spell))) issues.push('Remove Spells that are no longer on the Wizard Spell List.');
      for (const [groupID, schoolSpells] of wizardSchoolSpellGroups) {
        const school = groupID.slice('wizard.schoolSpells.'.length);
        if (schoolSpells.length !== wizardSchoolSpellLimit) issues.push(`Choose ${wizardSchoolSpellLimit} Arcane ${school} Spells granted by Spell School Initiate.`);
        for (const spellName of schoolSpells) {
          const spell = spells.find(({ name }) => name === spellName);
          if (!spell || spell.school !== school || !spell.source.split(', ').includes('Arcane')) issues.push(`${spellName} is not an Arcane ${school} Spell.`);
        }
      }
      const allWizardSpells = [...selectedSpells, ...wizardFeatureSpellNames];
      if (new Set(allWizardSpells).size !== allWizardSpells.length) issues.push('A Wizard Spell can only be learned once across the Class Table, School Magic, and Coven’s Gift.');
      const preparedSpells = featureChoices['wizard.preparedSpells'] ?? [];
      if (ownsClassFeature('Wizard', 'Prepared Spell') && preparedSpells.length !== wizardPreparedLimit) issues.push(`Choose ${wizardPreparedLimit} Prepared Spell${wizardPreparedLimit === 1 ? '' : 's'}.`);
      if (preparedSpells.some((spell) => !wizardKnownSpellNames.has(spell))) issues.push('Every Prepared Spell must be a Spell you know.');
    }
    if (ownsClassFeature('Warlock', 'Pact Boon')) {
      const weaponManeuvers = featureChoices['warlock.pactWeaponManeuvers'] ?? [];
      const armorManeuvers = featureChoices['warlock.pactArmorManeuvers'] ?? [];
      if (hasPactWeapon && weaponManeuvers.length !== warlockGrantedManeuverLimit) issues.push(`Choose ${warlockGrantedManeuverLimit} Pact Weapon Attack Maneuvers.`);
      if (hasPactArmor && armorManeuvers.length !== warlockGrantedManeuverLimit) issues.push(`Choose ${warlockGrantedManeuverLimit} Pact Armor Defensive Maneuvers.`);
      if (weaponManeuvers.some((maneuver) => armorManeuvers.includes(maneuver))) issues.push('A Maneuver can only be learned once across your Pact Boons.');
      if (hasPactSpell && warlockPactSpells.length !== warlockPactSpellLimit) issues.push(`Choose ${warlockPactSpellLimit} known Pact ${warlockPactSpellLimit === 1 ? 'Spell' : 'Spells'}.`);
      if (hasPactSpell && warlockPactSpells.some((spell) => !warlockKnownSpellNames.has(spell))) issues.push('Every Pact Spell must be a Spell you know.');
      if (hasPactSpell && ownsClassFeature('Warlock', 'Expert Warlock') && warlockExpertSpells.length !== 2) issues.push('Choose the 2 Spells from any Spell Source granted by Expert Warlock.');
      if (hasPactSpell && ownsClassFeature('Warlock', 'Expert Warlock') && warlockExpertSpells.some((spell) => selectedSpells.includes(spell))) issues.push('Expert Warlock must grant Spells you do not already know.');
      if (pactBaneCount > 0 && pactBaneSpells.length !== pactBaneCount) issues.push(`Choose ${pactBaneCount} Spell${pactBaneCount === 1 ? '' : 's'} granted by Pact Bane.`);
      if (pactBaneCount > 0 && !baneKnownOutsideTalent && !pactBaneSpells.includes('Bane')) issues.push('Pact Bane must grant Bane unless you already know it.');
    }
    return issues;
  })();

  const finish = () => {
    if (!reference || !classReference || !derived || validation.length > 0) return;
    const finalizedBuild = { ...build, isFinalized: true };
    const isNew = !editingCharacter;
    let finalized = applyDerivedCharacter({
      ...draft,
      build: finalizedBuild,
      spells: Array.from(new Set([...selectedSpells, ...selectedCantrips, ...grantedSpells])).flatMap((spellName) => {
        const spell = spells.find(({ name: candidate }) => candidate === spellName);
        return spell ? [{ id: `spell|${spell.name}`, ...spell }] : [];
      }),
      maneuvers: Array.from(new Set([...selectedManeuvers, ...grantedManeuvers])).flatMap((maneuverName) => {
        const maneuver = maneuvers.find(({ name: candidate }) => candidate === maneuverName);
        return maneuver ? [{ id: `maneuver|${maneuver.name}`, type: maneuver.category, ...maneuver }] : [];
      }),
    }, derived);
    if (isNew) finalized = { ...finalized, healthPoints: derived.maxHP, stamina: derived.maxStamina, manaPoints: derived.maxMana };
    if (isNew) addCharacter(finalized); else updateCharacter(finalized);
    selectCharacter(finalized.id);
    onCompleted?.(finalized);
  };

  if (rulesLoading || !reference) {
    return <div className="p-10 text-slate-300">{rulesError ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">{rulesError}</div> : 'Loading the DC20 character reference…'}</div>;
  }

  const masteryMaximum = skillMasteryCap(draft);
  const skillMasteryMaximum = masteryMaximum;
  const tradeMasteryMaximum = masteryCap(level);
  const visibleTraits = reference.ancestryTraits.filter((trait) => accessibleAncestries.has(trait.ancestry));
  return (
    <div className="character-builder min-h-full p-4 lg:p-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">DC20 Beta 0.10.5</p><h1 className="mt-1 text-3xl font-black text-white lg:text-4xl">{editingCharacter ? `Edit ${editingCharacter.name}` : 'Build a Character'}</h1></div>
          <div className="flex flex-wrap gap-2"><Metric label="Level" value={level} /><Metric label={className === 'Rogue' ? 'Skill Mastery Cap' : 'Mastery Cap'} value={masteryTitle(skillMasteryMaximum)} /><Metric label="Attribute Cap" value={`+${attributeCap(level)}`} /></div>
        </header>

        <nav className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Character builder steps">
          {STEPS.map((step, index) => <button type="button" key={step.id} onClick={() => setCurrentStep(step.id)} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${currentStep === step.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-950' : index < currentStepIndex ? 'bg-violet-500/10 text-violet-200 hover:bg-violet-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><span className="mr-2 text-xs opacity-60">{index + 1}</span>{step.title}</button>)}
        </nav>

        <main className={`${panelClass} min-h-[620px]`}>
          {currentStep === 'attributes' && <section>
            <div className="mb-6 grid items-start gap-5 lg:grid-cols-[180px_minmax(0,1fr)]"><div><p className="mb-2 text-center text-sm font-bold text-slate-300 lg:text-left">Character Avatar</p><CharacterAvatarEditor image={avatarDataURL} name={name} onChange={setAvatarDataURL} className="mx-auto w-40 lg:mx-0" /></div><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]"><label className="text-sm font-bold text-slate-300">Player Character Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={`${fieldClass} mt-2 text-lg`} placeholder="Character name" /></label><label className="text-sm font-bold text-slate-300">Character Level<input type="number" min={1} max={10} value={level} onChange={(event) => setLevel(Math.min(10, Math.max(1, Number(event.target.value))))} className={`${fieldClass} mt-2`} /></label></div></div>
            <div className="mb-6 grid gap-3 md:grid-cols-3">{(['Standard Array', 'Point Buy', 'Rolled'] as AttributeSelectionMethod[]).map((method) => <button type="button" key={method} onClick={() => changeAttributeMethod(method)} className={`rounded-xl border p-4 text-left ${attributeMethod === method ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}><div className="font-black">{method}</div><div className="mt-1 text-xs text-slate-500">{method === 'Standard Array' ? '3, 1, 0, −2, then 2 additional points.' : method === 'Point Buy' ? 'Start at −2 and spend 12 points.' : 'Roll 1d6−3 four times, then add 2 points.'}</div></button>)}</div>
            {attributeMethod === 'Rolled' && <button type="button" onClick={rollAttributes} className="mb-6 rounded-xl bg-fuchsia-600 px-5 py-3 font-black text-white hover:bg-fuchsia-500">🎲 Roll The Dice! <span className="ml-2 font-normal">{rolledResults.length === 4 ? 'Roll again' : '1d6−3 × 4'}</span></button>}
            {usesAttributePool && attributePool.length === 4 && <div className="mb-6 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4"><h3 className="font-black text-violet-200">Assign each {attributeMethod === 'Rolled' ? 'roll' : 'array value'}</h3><p className="mt-1 text-sm text-slate-500">Each value can be assigned once. Pick the Attribute that receives it, then allocate the additional Attribute Points below.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{attributePool.map((result, index) => <label key={`${result}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/55 p-3 text-sm font-bold text-slate-300"><span className="mb-2 block text-2xl font-black text-fuchsia-200">{result >= 0 ? '+' : ''}{result}</span><select value={attributeAssignments[index] ?? ''} onChange={(event) => assignAttribute(index, event.target.value as DC20Attribute | '')} className={fieldClass}><option value="">Choose Attribute…</option>{ATTRIBUTE_NAMES.map((attribute) => <option key={attribute} value={attribute} disabled={attributeAssignments.some((entry, slot) => entry === attribute && slot !== index)}>{attribute}</option>)}</select></label>)}</div></div>}
            {usesAttributePool && attributeMethod === 'Rolled' && attributePool.length !== 4 && <div className="mb-6 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-sm text-fuchsia-100">Roll four results before assigning Attributes.</div>}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => { const assigned = !usesAttributePool || attributeAssignments.includes(attribute); const bonus = attributeBonusPoints[attribute] ?? 0; const atCap = attributes[attribute] >= attributeCap(level); const noPoints = usesAttributePool ? attributeBonusSpent >= attributeBonusBudget : pointBuySpent >= pointBuyBudget; return <div key={attribute} className={`rounded-2xl border border-white/10 bg-slate-950/55 p-5 ${assigned ? '' : 'opacity-50'}`}><div className="flex items-center justify-between"><div><h3 className="font-black text-violet-200">{attribute}</h3>{usesAttributePool && <span className="text-xs text-slate-500">{assigned ? `Base + ${bonus} added` : 'Unassigned'}</span>}</div><span className="text-3xl font-black text-white">{assigned ? `${attributes[attribute] >= 0 ? '+' : ''}${attributes[attribute]}` : '—'}</span></div><div className="mt-5 flex items-center justify-center gap-3"><button type="button" disabled={usesAttributePool ? bonus <= 0 : attributes[attribute] <= -2} onClick={() => usesAttributePool ? adjustAssignedAttribute(attribute, -1) : setAttribute(attribute, attributes[attribute] - 1)} className="h-10 w-10 rounded-lg bg-slate-800 text-xl text-slate-200 disabled:cursor-not-allowed disabled:opacity-30">−</button><button type="button" disabled={!assigned || atCap || noPoints} onClick={() => usesAttributePool ? adjustAssignedAttribute(attribute, 1) : setAttribute(attribute, attributes[attribute] + 1)} className="h-10 w-10 rounded-lg bg-violet-600 text-xl text-white disabled:cursor-not-allowed disabled:opacity-30">+</button></div></div>; })}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label={usesAttributePool ? 'Additional Points' : 'Allocation Total'} value={usesAttributePool ? `${attributeBonusSpent} / ${attributeBonusBudget}` : `${pointBuySpent} / ${pointBuyBudget}`} tone={(usesAttributePool ? attributeBonusSpent === attributeBonusBudget : pointBuySpent === pointBuyBudget) ? 'green' : 'violet'} /><Metric label="Prime Modifier" value={`${Math.max(...Object.values(attributes)) >= 0 ? '+' : ''}${Math.max(...Object.values(attributes))}`} /><Metric label="Combat Mastery" value={`+${derived?.combatMastery ?? 1}`} /></div>
            <div className="mt-6 overflow-auto"><table className="w-full min-w-[650px] text-center text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-2">Level</th>{[1,5,10,15,20].map((entry) => <th key={entry} className="p-2">{entry}</th>)}</tr></thead><tbody><tr className="border-t border-white/10"><th className="p-3 text-left text-slate-300">Attribute Cap</th>{[1,5,10,15,20].map((entry) => <td key={entry} className={`p-3 font-black ${level >= entry && (entry === 20 || level < [5,10,15,20].find((candidate) => candidate > entry)!) ? 'text-violet-300' : 'text-slate-400'}`}>+{attributeCap(entry)}</td>)}</tr></tbody></table></div>
          </section>}

          {currentStep === 'skills' && <section>
            {className === 'Rogue' && <div className="mb-6 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100"><strong>Roguish Finesse — Skill Expertise:</strong> your Skill Mastery Limit is {masteryTitle(skillMasteryMaximum)} (+{skillMasteryMaximum * 2}), one stage above the normal level cap. Trade Mastery remains capped at {masteryTitle(tradeMasteryMaximum)} (+{tradeMasteryMaximum * 2}).</div>}
            {clericHasKnowledgeDomain && <div className="mb-6 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"><strong>Knowledge Domain:</strong> you have 2 additional Skill Points, and the Mastery Limit of every Knowledge Trade is one stage higher. It does not stack with another Feature that raises the same Trade’s limit.</div>}
            <div className="mb-6 grid gap-4 lg:grid-cols-2"><label className="text-sm font-bold text-slate-300">Background Name<input value={backgroundName} onChange={(event) => setBackgroundName(event.target.value)} className={`${fieldClass} mt-2`} placeholder="Scholar, sailor, artisan…" /></label><label className="text-sm font-bold text-slate-300">Background Story<textarea value={backgroundStory} onChange={(event) => setBackgroundStory(event.target.value)} rows={3} className={`${fieldClass} mt-2`} placeholder="Where did this character come from?" /></label></div>
            <div className="mb-6 grid gap-3 sm:grid-cols-3"><ConversionStepper label="Skill → Trade conversions" value={skillConversion} description="Each Skill Point becomes 2 Trade Points. Decreasing this automatically releases Trade selections that no longer fit." decrementDisabled={skillConversion <= 0} incrementDisabled={!derived || skillSpent >= derived.skillPointBudget} onDecrement={() => adjustSkillConversion(-1)} onIncrement={() => adjustSkillConversion(1)} /><ConversionStepper label="Trade → Language conversions" value={tradeConversion} description="Each Trade Point becomes 2 Language Points. Decreasing this automatically releases Language fluency that no longer fits." decrementDisabled={tradeConversion <= 0} incrementDisabled={!derived || tradeSpent >= derived.tradePointBudget} onDecrement={() => adjustTradeConversion(-1)} onIncrement={() => adjustTradeConversion(1)} /><div className="grid grid-cols-3 gap-2"><Metric label="Skills" value={`${skillSpent}/${derived?.skillPointBudget ?? 0}`} /><Metric label="Trades" value={`${tradeSpent}/${derived?.tradePointBudget ?? 0}`} /><Metric label="Languages" value={`${languageSpent}/${derived?.languagePointBudget ?? 0}`} /></div></div>
            <div className="space-y-5">{reference.skillGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{group.name} Skills</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((skillName) => { const item = reference.skills.find(({ name: candidate }) => candidate === skillName)!; const value = skillMasteries[skillName] ?? 'Untrained'; const pointsAvailable = Math.max(0, (derived?.skillPointBudget ?? 0) - skillSpent + masteryRank(value)); return <InfoDetails key={skillName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{skillName}</span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={Math.min(5, skillMasteryMaximum + (expertise.skills[skillName] ?? 0))} bonus={expertise.skills[skillName] ?? 0} pointsAvailable={pointsAvailable} onChange={(next) => setSkillMasteries((current) => ({ ...current, [skillName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-300">{item.attribute}</p>{item.description}</InfoDetails>; })}</div></div>)}
              {reference.tradeGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-fuchsia-300">{group.name} Trades</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((tradeName) => { const item = reference.trades.find(({ name: candidate }) => candidate === tradeName)!; const value = tradeMasteries[tradeName] ?? 'Untrained'; const pointsAvailable = Math.max(0, (derived?.tradePointBudget ?? 0) - tradeSpent + masteryRank(value)); return <InfoDetails key={tradeName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span className="flex flex-wrap items-center gap-2">{tradeName}<span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-fuchsia-300">{item.attribute}</span></span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={Math.min(5, tradeMasteryMaximum + Math.max(expertise.trades[tradeName] ?? 0, clericHasKnowledgeDomain && group.name === 'Knowledge' ? 1 : 0))} bonus={expertise.trades[tradeName] ?? 0} pointsAvailable={pointsAvailable} onChange={(next) => setTradeMasteries((current) => ({ ...current, [tradeName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-fuchsia-300">{item.attribute} • {item.tool}</p>{item.description}</InfoDetails>; })}</div></div>)}
              {reference.languageGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-sky-300">{group.name} Languages</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((languageName) => { const item = reference.languages.find(({ name: candidate }) => candidate === languageName)!; const value = effectiveLanguageFluencies[languageName] ?? 'Untrained'; const paidValue = languageFluencies[languageName] ?? 'Untrained'; const isClassGranted = grantedLanguages.includes(languageName); const isSorcererIncrease = sorcererLanguage === languageName; const isFree = languageName === 'Common' || isClassGranted; const pointsAvailable = Math.max(0, (derived?.languagePointBudget ?? 0) - languageSpent + (isFree ? 0 : fluencyRank(paidValue))); const classGrantName = className === 'Rogue' ? 'Cypher Speech' : className === 'Warlock' ? 'Alien Comprehension' : 'Class Feature'; return <InfoDetails key={languageName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{languageName}{isFree && <span className="ml-2 text-xs text-emerald-300">Free • Fluent{isClassGranted ? ` • ${classGrantName}` : ''}</span>}{isSorcererIncrease && <span className="ml-2 text-xs text-fuchsia-300">+1 Fluency Stage • Sorcerer Appearance</span>}</span><span onClick={(event) => event.stopPropagation()}><LanguageFluencyPicker value={isFree ? 'Fluent' : value} pointsAvailable={pointsAvailable} isFree={isFree} onChange={(next) => setLanguageFluencies((current) => ({ ...current, [languageName]: isSorcererIncrease ? LANGUAGE_FLUENCIES[Math.max(0, fluencyRank(next) - 1)] : next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-300">Typical speakers: {item.typicalSpeakers}</p><p className="mb-2 text-xs text-slate-500">Limited speakers make a Language Check when precise understanding or communication matters. Fluent speakers read, write, and speak without that check.</p>{item.description}</InfoDetails>; })}</div></div>)}
            </div>
          </section>}

          {currentStep === 'ancestry' && <section>
            {className === 'Rogue' && selectedTraits.some(({ name }) => name === 'Skill Expertise') && <div role="alert" className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"><strong>Skill Expertise conflict:</strong> Roguish Finesse already increases every Skill Mastery Limit. The Beta says a Skill cannot benefit from more than one such increase, so replace the Skill Expertise ancestry trait before finishing.</div>}
            <div className="mb-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-300">Primary Ancestry<select value={ancestry} onChange={(event) => { setAncestry(event.target.value); setSecondaryAncestry(''); setTraitIDs([]); setTraitCounts({}); setTraitChoices({}); }} className={`${fieldClass} mt-2`}>{reference.ancestries.map((option) => <option key={option}>{option}</option>)}</select></label><label className="text-sm font-bold text-slate-300">Secondary Ancestry (optional)<select disabled={ancestry === 'Custom'} value={secondaryAncestry} onChange={(event) => { setSecondaryAncestry(event.target.value); setTraitIDs([]); setTraitCounts({}); setTraitChoices({}); }} className={`${fieldClass} mt-2 disabled:cursor-not-allowed disabled:opacity-40`}><option value="">{ancestry === 'Custom' ? 'Custom already accesses every list' : 'None'}</option>{reference.ancestries.filter((option) => option !== ancestry && option !== 'Custom').map((option) => <option key={option}>{option}</option>)}</select></label></div>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Size" value={derived?.size ?? 'Medium'} tone="green" /><Metric label="Ancestry Points" value={`${ancestrySpent}/${derived?.ancestryPointBudget ?? 5}`} /><Metric label="Negative Points" value={`${negativePoints}/2`} /><Metric label="Minor Traits" value={`${minorTraits}/1`} /><Metric label="Trait Copies" value={ancestryTotals.traitCopies} /></div>
            {ancestry === 'Custom' && <div className="mb-6 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-4 text-sm leading-6 text-fuchsia-100"><strong>Custom Ancestry variant:</strong> every published Ancestry List is available, with the Beta’s reduced 4-point starting budget. Duplicate, Minor Trait, Negative Trait, and prerequisite rules still apply.</div>}
            {(selectedTraits.some(({ name }) => name === 'Fallen') || selectedTraits.some(({ name }) => name === 'Redeemed')) && <div className="mb-6 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm leading-6 text-violet-100"><strong>Ancestry access unlocked:</strong> {selectedTraits.some(({ name }) => name === 'Fallen') && 'Fallen grants access to Fiendborn Traits. '}{selectedTraits.some(({ name }) => name === 'Redeemed') && 'Redeemed grants access to Angelborn Traits.'}</div>}
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h3 className="font-black text-emerald-300">Base Ancestry Statistics</h3><div className="mt-3 grid gap-2 md:grid-cols-3"><InfoDetails summary={`${derived?.size ?? 'Medium'} Size`}>{derived?.size === 'Small' ? 'Your Size is considered Small.' : reference.generalAncestryTraits.find((trait) => trait.name.includes('Medium'))?.description ?? 'Your Size is considered Medium.'}</InfoDetails>{reference.generalAncestryTraits.filter((trait) => !trait.name.includes('Medium')).map((trait) => <InfoDetails key={trait.id} summary={trait.name}>{trait.description}</InfoDetails>)}</div></div>
            <div className="space-y-5">{Array.from(new Set(visibleTraits.map(({ category }) => category))).sort((left, right) => ['Origin', 'Default', 'Minor', 'Expanded', 'Negative', 'Senses', 'Mobility', 'Jumping', 'Flying', 'Body', 'Natural Weapons', 'Miscellaneous'].indexOf(left) - ['Origin', 'Default', 'Minor', 'Expanded', 'Negative', 'Senses', 'Mobility', 'Jumping', 'Flying', 'Body', 'Natural Weapons', 'Miscellaneous'].indexOf(right)).map((category) => <div key={category}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{category} Traits</h3><div className="grid gap-3 lg:grid-cols-2">{visibleTraits.filter((trait) => trait.category === category).map((trait) => {
              const selected = selectedTraits.some(({ id }) => id === trait.id);
              const automatic = automaticTraitIDs.has(trait.id);
              const count = ancestryTraitSelectionCount(draft, trait);
              const options = choiceOptions(trait, reference.skills, reference.trades, spells, traitChoices);
              const choices = traitChoices[trait.id] ?? [];
              const selectedChoice = choices[0] ?? '';
              const source = ancestryTraitSource(trait);
              const tags = ancestryTraitRulesTags(trait);
              const sourceRequirement = ancestryRequirementLabel(trait);
              const sourcePrerequisiteMet = ancestryTraitPrerequisiteMet(draft, trait, selectedTraits);
              const duplicateSelected = !selected && !trait.isRepeatable && selectedTraits.some((entry) => entry.name === trait.name);
              const negativeLimitReached = !selected && trait.cost < 0 && negativePoints - trait.cost > 2;
              const minorLimitReached = !selected && trait.countsAsZeroPointTrait && minorTraits >= 1;
              const canAffordCopy = canAddAncestryTraitCopy(draft, selectedTraits, trait);
              const ancestryPointLimitReached = !selected && trait.cost > 0 && !canAffordCopy;
              const totalPointLimitReached = ancestryPointLimitReached && ancestrySpent + trait.cost > (derived?.ancestryPointBudget ?? 5);
              const requirement = !sourcePrerequisiteMet ? sourceRequirement
                : totalPointLimitReached ? `${trait.cost} available Ancestry Point${trait.cost === 1 ? '' : 's'}`
                  : ancestryPointLimitReached ? `the remaining Sorcerous Origin bonus points to be spent on ${sorcererRestrictedAncestries.join(' and ')} Traits`
                    : sourceRequirement;
              const prerequisiteMet = sourcePrerequisiteMet && !ancestryPointLimitReached;
              const unavailable = !prerequisiteMet || duplicateSelected || negativeLimitReached || minorLimitReached || ancestryPointLimitReached;
              const additionalLimbCount = selectedTraits.filter(({ ancestry: traitAncestry, name }) => traitAncestry === 'Beastborn' && name === 'Additional Limb').reduce((sum, entry) => sum + ancestryTraitSelectionCount(draft, entry), 0);
              const rulesRepeatMaximum = trait.name === 'Keen Sense' ? 3 : trait.name === 'Capable Limb' ? additionalLimbCount : Number.POSITIVE_INFINITY;
              const repeatMaximum = canAffordCopy ? rulesRepeatMaximum : count;
              const chosenSpell = ['Celestial Magic', 'Fiendish Magic', 'Psionic Magic'].includes(trait.name) ? spells.find(({ name: spellName }) => spellName === selectedChoice) : undefined;
              return <div key={trait.id} className={`rounded-xl border p-4 ${selected ? 'border-violet-400/60 bg-violet-500/10' : unavailable ? 'border-white/5 bg-slate-950/30 opacity-55' : 'border-white/10 bg-slate-950/45'}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-slate-100">{trait.name} <span className="text-sm text-violet-300">({trait.cost > 0 ? '+' : ''}{trait.cost} AP{count > 1 ? ` × ${count}` : ''})</span></h4><p className="mt-1 text-xs text-slate-500">{trait.ancestry} • {source.title}, p. {source.page}{requirement ? ` • Requires ${requirement}` : ''}{automatic ? ' • Applied by ancestry' : ''}</p></div>{trait.isRepeatable && selected ? <div className="flex items-center gap-2"><button type="button" onClick={() => adjustRepeatableTrait(trait, -1)} className="h-9 w-9 rounded-lg bg-slate-800 font-black text-slate-200">−</button><span className="min-w-5 text-center font-black text-violet-200">{count}</span><button type="button" disabled={count >= repeatMaximum} onClick={() => adjustRepeatableTrait(trait, 1)} className="h-9 w-9 rounded-lg bg-violet-700 font-black text-white disabled:cursor-not-allowed disabled:opacity-35">+</button></div> : <button type="button" disabled={automatic || unavailable} onClick={() => toggleTrait(trait)} className={`rounded-lg px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{automatic ? 'Applied' : selected ? 'Selected' : unavailable ? 'Locked' : 'Select'}</button>}</div><div className="mt-3 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">{tag}</span>)}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{trait.description}</p>{unavailable && !selected && <p className="mt-2 text-xs font-bold text-amber-300">{!prerequisiteMet ? `Requires ${requirement}.` : duplicateSelected ? 'A Trait with this name is already selected; the Beta forbids duplicate Traits.' : negativeLimitReached ? 'This would exceed the 2-point Negative Trait limit.' : 'Only one 0-point Minor Trait can be selected.'}</p>}{selected && trait.name === 'Beastkind' && <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Beastborn origin<input value={selectedChoice} onChange={(event) => setTraitChoices((current) => ({ ...current, [trait.id]: [event.target.value] }))} className={`${fieldClass} mt-2 normal-case tracking-normal`} placeholder="Frog, lion, spider, turtle…" /></label>}{selected && trait.name === 'Keen Sense' && Array.from({ length: count }, (_, index) => <label key={index} className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Keen Sense {index + 1}<select value={choices[index] ?? ''} onChange={(event) => setTraitChoices((current) => { const next = [...(current[trait.id] ?? [])]; next[index] = event.target.value; return { ...current, [trait.id]: next }; })} className={`${fieldClass} mt-2 normal-case tracking-normal`}><option value="">Choose…</option>{options.map((option) => <option key={option} disabled={choices.some((choice, choiceIndex) => choice === option && choiceIndex !== index)}>{option}</option>)}</select></label>)}{selected && trait.name !== 'Keen Sense' && trait.name !== 'Beastkind' && options.length > 0 && <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Required choice<select value={selectedChoice} onChange={(event) => setTraitChoices((current) => ({ ...current, [trait.id]: [event.target.value] }))} className={`${fieldClass} mt-2 normal-case tracking-normal`}><option value="">Choose…</option>{options.map((option) => <option key={option} disabled={trait.name === 'Attribute Increase' && attributes[option as DC20Attribute] >= attributeCap(level)}>{option}</option>)}</select></label>}{chosenSpell && <div className="mt-3"><InfoDetails summary={`View ${chosenSpell.name} spell`}><p className="mb-2 text-xs font-bold text-violet-300">{chosenSpell.source} • {chosenSpell.school} • {chosenSpell.cost} • {chosenSpell.range} • {chosenSpell.duration}</p>{chosenSpell.description}{chosenSpell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{chosenSpell.enhancements}</p></>}</InfoDetails></div>}</div>;
            })}</div></div>)}</div>
          </section>}

          {currentStep === 'class' && classReference && <section>
            <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_180px]"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">Class Builder</p><h2 className="text-2xl font-black text-white">Choose a class and level</h2></div><label className="text-sm font-bold text-slate-300">Character Level<input type="number" min={1} max={10} value={level} onChange={(event) => setLevel(Number(event.target.value))} className={`${fieldClass} mt-2`} /></label></div>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[270px_minmax(0,1fr)]"><aside className="space-y-2 lg:max-h-[760px] lg:overflow-y-auto lg:pr-2">{reference.classes.map((entry) => <button type="button" key={entry.name} onClick={() => { setClassPreviewName(entry.name); if (entry.name !== className) setClassConfirmed(false); }} className={`w-full rounded-xl border p-3 text-left ${entry.name === classPreviewName ? 'border-violet-400 bg-violet-500/15' : entry.name === className && classConfirmed ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/10 bg-slate-950/45 hover:bg-slate-800'}`}><div className="font-black text-slate-100">{entry.name}</div><div className="mt-1 text-xs text-slate-500">{entry.path} • {entry.levelOneResource}</div><p className="mt-2 text-xs leading-5 text-slate-400">{entry.summary}</p></button>)}</aside><div className="min-w-0 space-y-5">{(!classConfirmed || classPreviewName !== className) && previewClassReference ? <><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{previewClassReference.path} Path</p><h2 className="text-3xl font-black text-white">{previewClassReference.name}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{previewClassReference.description}</p></div><InfoDetails summary={<span>{previewClassReference.pathTitle}</span>}>{previewClassReference.pathDetails}</InfoDetails><div className={panelClass}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black text-violet-200">Class Progression Table</h3><p className="text-xs text-slate-500">{previewClassReference.tableSource}</p></div></div><ClassProgressionCards classReference={previewClassReference} currentLevel={level} /></div><div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Features by Level</h3><div className="space-y-4">{previewClassReference.features.map((entry) => <div key={entry.level}><h4 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300">Level {entry.level}</h4><div className="space-y-2">{entry.features.map((feature) => <InfoDetails key={`${entry.level}-${feature.name}`} summary={feature.name}>{feature.description}</InfoDetails>)}</div></div>)}</div></div><button type="button" onClick={confirmClass} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-lg font-black text-white">Confirm {previewClassReference.name}</button></> : <><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{classReference.path} Path • Confirmed</p><h2 className="text-3xl font-black text-white">{classReference.name}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{classReference.description}</p></div>
              <InfoDetails summary={<span>{classReference.pathTitle}</span>}>{classReference.pathDetails}</InfoDetails>
              {pathLevels.length > 0 && <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Path Progression Choices</h3><div className="grid gap-3 sm:grid-cols-2">{pathLevels.map((pathLevel) => <div key={pathLevel} className="rounded-xl bg-slate-950/50 p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Level {pathLevel}</div><div className="flex gap-2">{(['Martial', 'Spellcaster'] as CharacterPathChoice[]).map((path) => <button type="button" key={path} onClick={() => choosePathProgression(pathLevel, path)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${pathChoices[String(pathLevel)] === path ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{path}</button>)}</div></div>)}</div></div>}
              {level >= 3 && classReference.subclasses.length > 0 && <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Subclass</h3><div className="grid gap-2 sm:grid-cols-3">{classReference.subclasses.map((option) => <button type="button" key={option} onClick={() => { setSubclass(option); setFeatureChoices((current) => Object.fromEntries(Object.entries(current).filter(([groupID]) => { const group = classReference.choiceGroups.find(({ id }) => id === groupID); return !group?.requiredSubclass || group.requiredSubclass === option; }))); }} className={`rounded-lg border px-3 py-3 text-sm font-bold ${subclass === option ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-slate-700 text-slate-400'}`}>{option}</button>)}</div>{subclass && <div className="mt-4 space-y-2">{(classReference.subclassFeatures[subclass] ?? []).filter((feature) => feature.level === undefined || feature.level <= level).map((feature) => <InfoDetails key={feature.name} summary={<span>{feature.name}{feature.level !== undefined && <span className="ml-2 text-xs font-normal text-slate-500">Level {feature.level}</span>}</span>}>{feature.description}</InfoDetails>)}</div>}</div>}
              <div className={panelClass}><div className="mb-3 flex items-center justify-between"><h3 className="font-black text-violet-200">Class Progression Table</h3><span className="text-xs text-slate-500">{classReference.tableSource}</span></div><ClassProgressionCards classReference={classReference} currentLevel={level} /></div>
              <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Features Gained at Level {level}</h3><div className="space-y-3">{classReference.features.filter((entry) => entry.level === level).map((entry) => <div key={entry.level}><div className="space-y-2">{entry.features.map((feature) => <InfoDetails key={`${entry.level}-${feature.name}`} summary={feature.name}>{feature.description}</InfoDetails>)}</div></div>)}{!classReference.features.some((entry) => entry.level === level) && <p className="text-sm text-slate-500">No new class features are listed at this level.</p>}</div></div>
              {availableTalentSlots > 0 && <div className={panelClass}>
                <h3 className="mb-1 font-black text-violet-200">Talents ({talents.length}/{availableTalentSlots})</h3>
                <p className="mb-3 text-sm text-slate-500">General, eligible Class, and Multiclass Talents are checked against every published requirement. Locked choices show what is still required.</p>
                {paragonTalentClasses.length > 0 && <p className="mb-3 rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100"><strong>Paragon Talent {paragonTalentClasses.length === 1 ? 'slot' : 'slots'}:</strong> {paragonTalentClasses.join(', ')}. Each of these bonus slots must contain a Class Talent from the named Class.</p>}
                <div className="grid gap-2 lg:grid-cols-2">{presentedTalents.map((talent) => {
                  const count = talents.filter((name) => name === talent.name).length;
                  const eligibility = reference ? talentEligibility(talent, draft, reference) : { available: false, reason: 'Reference data is loading.' };
                  const locked = !eligibility.available;
                  const multiclassTalentName = isMulticlassTalentName(talent.name) ? talent.name : null;
                  return <div key={talent.name} className={`rounded-xl border p-3 ${count > 0 ? 'border-violet-400/50 bg-violet-500/10' : locked ? 'border-white/5 bg-slate-950/30 opacity-60' : 'border-white/10 bg-slate-950/45'}`}>
                    <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-200">{talent.name}{talent.className && <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-slate-500">{talent.className}</span>}{count > 0 && <span className="ml-2 text-xs text-violet-300">×{count}</span>}</span><div className="flex items-center gap-1"><button type="button" disabled={count === 0} onClick={() => adjustTalent(talent, -1)} className="h-8 w-8 rounded bg-slate-800 text-sm font-black text-slate-200 disabled:opacity-30">−</button><button type="button" disabled={locked || talents.length >= availableTalentSlots || (!talent.isRepeatable && count > 0)} onClick={() => adjustTalent(talent, 1)} className="h-8 w-8 rounded bg-violet-600 text-sm font-black text-white disabled:opacity-30">+</button></div></div>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">{talent.category} Talent • {talent.isRepeatable ? 'Repeatable' : 'Once only'}</p>
                    {locked && <p className="mt-2 text-xs font-bold text-amber-300">{eligibility.reason}</p>}
                    <details className="mt-3 rounded-lg border border-white/5 bg-slate-950/35 p-3"><summary className="cursor-pointer text-xs font-black text-slate-300">Full Talent text</summary><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-400">{talent.description}</p></details>
                    {reference && multiclassTalentName && count > 0 && <div className="mt-3 space-y-3 border-t border-white/5 pt-3">{Array.from({ length: count }, (_, index) => {
                      const key = MULTICLASS_SELECTION_KEYS[multiclassTalentName];
                      const currentChoice = featureChoices[key]?.[index] ?? '';
                      const options = multiclassTalentOptions(multiclassTalentName, draft, reference, currentChoice);
                      const selectedOption = options.find(({ id }) => id === currentChoice);
                      return <label key={`${talent.name}-${index}`} className="block text-xs font-bold text-slate-400">Granted Feature {index + 1}<select value={currentChoice} onChange={(event) => setMulticlassChoice(multiclassTalentName, index, event.target.value)} className={`${fieldClass} mt-1 text-xs`}><option value="">Choose a published option…</option>{options.map((choice) => <option key={choice.id} value={choice.id}>{choice.title}</option>)}</select>{selectedOption && <InfoDetails summary={`Review ${selectedOption.title}`}>{selectedOption.description}</InfoDetails>}</label>;
                    })}</div>}
                  </div>;
                })}</div>
                {(hasMartialExpansion || hasSpellcastingExpansion) && <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 lg:grid-cols-2">{hasMartialExpansion && <div className="rounded-xl border border-amber-400/20 bg-amber-950/15 p-4"><h4 className="font-black text-amber-200">Martial Expansion Configuration</h4><p className="mt-1 text-xs leading-5 text-slate-500">Weapon, Heavy Armor, all Shield training, and 2 Maneuvers are applied automatically. Choose the single Stamina Regen you can trigger once per Round.</p><select value={martialExpansionRegen} onChange={(event) => setFeatureChoices((current) => ({ ...current, [MARTIAL_EXPANSION_REGEN]: [event.target.value] }))} className={`${fieldClass} mt-3 text-xs`}><option value="">Choose Stamina Regen…</option>{martialExpansionRegenOptions.map((option) => <option key={option}>{option}</option>)}</select>{martialExpansionRegenText && <InfoDetails summary={`Review ${martialExpansionRegen} Stamina Regen`}>{martialExpansionRegenText}</InfoDetails>}</div>}{hasSpellcastingExpansion && <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/15 p-4"><h4 className="font-black text-fuchsia-200">Spellcasting Expansion Configuration</h4><p className="mt-1 text-xs leading-5 text-slate-500">Spell Focus training and 3 Spells Known are applied automatically. Add either 1 Spell Source or 3 Spell Schools to your Spell List.</p><div className="mt-3 grid grid-cols-2 gap-2">{(['Source', 'Schools'] as const).map((mode) => <button type="button" key={mode} onClick={() => setFeatureChoices((current) => ({ ...current, [SPELLCASTING_EXPANSION_MODE]: [mode], [SPELLCASTING_EXPANSION_SOURCE]: [], [SPELLCASTING_EXPANSION_SCHOOLS]: [] }))} className={`rounded-lg px-3 py-2 text-xs font-black ${spellcastingExpansionMode === mode ? 'bg-fuchsia-700 text-white' : 'bg-slate-800 text-slate-400'}`}>{mode === 'Source' ? '1 Spell Source' : '3 Spell Schools'}</button>)}</div>{spellcastingExpansionMode === 'Source' && <select value={spellcastingExpansionSource} onChange={(event) => { setFeatureChoices((current) => ({ ...current, [SPELLCASTING_EXPANSION_SOURCE]: [event.target.value] })); setSelectedSpells([]); }} className={`${fieldClass} mt-3 text-xs`}><option value="">Choose Spell Source…</option>{Array.from(new Set(spells.flatMap((spell) => spell.source.split(', ')))).sort().map((source) => <option key={source}>{source}</option>)}</select>}{spellcastingExpansionMode === 'Schools' && <div className="mt-3 flex flex-wrap gap-2">{Array.from(new Set(spells.map(({ school }) => school))).sort().map((school) => { const selected = spellcastingExpansionSchools.includes(school); return <button type="button" key={school} disabled={!selected && spellcastingExpansionSchools.length >= 3} onClick={() => { setFeatureChoices((current) => ({ ...current, [SPELLCASTING_EXPANSION_SCHOOLS]: selected ? spellcastingExpansionSchools.filter((entry) => entry !== school) : [...spellcastingExpansionSchools, school] })); setSelectedSpells([]); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-fuchsia-400 bg-fuchsia-500/15 text-fuchsia-200' : 'border-slate-700 text-slate-400 disabled:opacity-30'}`}>{school}</button>; })}</div>}</div>}</div>}
              </div>}
              {featureChoiceGroups.length > 0 && <div className={panelClass}>
                <h3 className="mb-3 font-black text-violet-200">Class Feature Options</h3>
                <div className="space-y-4">{featureChoiceGroups.map((group) => {
                  const selectedCount = (featureChoices[group.id] ?? []).length;
                  const optional = (group.minimumSelections ?? group.limit) === 0;
                  return <div key={`${group.id}-${group.requiredSubclass ?? ''}-${group.requiredTalent ?? ''}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-black text-slate-200">{group.title} <span className="text-xs text-slate-500">({group.feature})</span></h4><p className="mt-1 text-sm text-slate-500">{group.prompt}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${selectedCount >= (group.minimumSelections ?? group.limit) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-violet-500/10 text-violet-200'}`}>{selectedCount}/{group.limit}{optional ? ' optional' : ''}</span></div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">{group.options.map((option) => {
                      const optionCount = (featureChoices[group.id] ?? []).filter((name) => name === option.name).length;
                      const selected = optionCount > 0;
                      const disabled = !selected && (selectedCount >= group.limit || classChoiceOptionDisabled(group, option.name));
                      if (option.isRepeatable) {
                        return <InfoDetails key={option.name} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{option.name}{optionCount > 0 && <span className="ml-2 text-xs text-violet-300">×{optionCount}</span>}</span><span className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}><button type="button" disabled={optionCount === 0} onClick={() => adjustRepeatableFeatureChoice(group, option.name, -1)} className="h-7 w-7 rounded bg-slate-800 text-sm font-black text-slate-200 disabled:opacity-30">−</button><button type="button" disabled={selectedCount >= group.limit || (option.maximumCount !== undefined && optionCount >= option.maximumCount)} onClick={() => adjustRepeatableFeatureChoice(group, option.name, 1)} className="h-7 w-7 rounded bg-violet-600 text-sm font-black text-white disabled:opacity-30">+</button></span></div>}>{option.description}</InfoDetails>;
                      }
                      return <InfoDetails key={option.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => setFeatureChoice(group, option.name)} />{option.name}</label>}>{option.description}</InfoDetails>;
                    })}</div>
                  </div>;
                })}</div>
              </div>}
              {wizardSchools.length > 0 && <div className={panelClass}>
                <div className="mb-4"><h3 className="font-black text-fuchsia-200">Spell School Initiate</h3><p className="mt-1 text-sm leading-6 text-slate-500">Each chosen School grants 2 Arcane Spells in addition to the Wizard Class Table. Expert Wizard grants 1 more Spell from every chosen School and improves each Signature School reduction from 1 MP to 2 MP.</p></div>
                <div className="space-y-4">{wizardSchoolSpellGroups.map(([groupID, schoolSpells]) => {
                  const school = groupID.slice('wizard.schoolSpells.'.length);
                  const knownOutside = new Set([
                    ...selectedSpells,
                    ...wizardCovenSpell,
                    ...wizardSchoolSpellGroups.filter(([candidate]) => candidate !== groupID).flatMap(([, names]) => names),
                  ]);
                  const options = spells.filter((spell) => spell.school === school && spell.source.split(', ').includes('Arcane'));
                  return <FeatureSpellPicker key={groupID} title={`School Magic — ${school}`} description={`Learn ${wizardSchoolSpellLimit} Arcane ${school} Spells. Signature School can reduce the MP cost of a ${school} Spell by ${level >= 5 ? 2 : 1} once per Long Rest, and refreshes when Initiative is rolled.`} selected={schoolSpells} limit={wizardSchoolSpellLimit} options={options} knownOutside={knownOutside} onToggle={(spell) => toggleStoredFeatureChoice(groupID, spell, wizardSchoolSpellLimit)} />;
                })}</div>
              </div>}
              {className === 'Hunter' && <div className={panelClass}><h3 className="font-black text-emerald-200">Favored Terrain Benefits</h3><p className="mt-2 text-sm leading-6 text-slate-400">The selected terrain benefits are routed into the character: Grassland raises Speed by 1; Forest and Urban each add 2 restricted Skill Points. Use the matching allocation choices above, then raise those Skills on the Skills step. The character sheet lists every resistance, movement, sense, and situational benefit for the selected terrains.</p><div className="mt-3 flex flex-wrap gap-2">{(featureChoices['hunter.terrain'] ?? []).map((terrain) => <span key={terrain} className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-200">{terrain}</span>)}</div></div>}
              {className === 'Monk' && <div className={panelClass}><h3 className="font-black text-amber-200">Monk Training & Stances</h3><p className="mt-2 text-sm leading-6 text-slate-400">Iron Palm starts with 1 Melee Weapon Style and Monk Stance starts with 2 Stances. Expert Monk adds 1 of each at level 5, while each Expanded Stances Talent adds 2 Stances. Patient Defense and Step of the Wind are calculated automatically; Ki, Stances, Reactions, subclass actions, and Monk Talents are available in the live character-sheet controls.</p><div className="mt-3 flex flex-wrap gap-2">{(featureChoices['monk.stances'] ?? []).map((stance) => <span key={stance} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">{stance}</span>)}</div></div>}
              {ownsClassFeature('Champion', 'Master-at-Arms') && <div className={panelClass}>
                <div className="mb-4"><h3 className="font-black text-amber-200">Master-at-Arms Maneuvers</h3><p className="mt-1 text-sm leading-6 text-slate-500">Maneuver Master grants Maneuvers in addition to the Champion Class Table. They are kept separate here so the table allowance remains accurate.</p></div>
                <div className="space-y-4">
                  <FeatureManeuverPicker title="Maneuver Master" description="At level 1, learn 1 Maneuver of your choice. Once per Round when you perform a Maneuver, you can reduce its SP cost by 1." selected={championMasterAtArmsManeuver} limit={1} options={maneuvers} knownOutside={championKnownOutside('champion.masterAtArmsManeuver')} onToggle={(maneuver) => toggleStoredFeatureChoice('champion.masterAtArmsManeuver', maneuver, 1)} />
                  {ownsClassFeature('Champion', 'Expert Champion') && <FeatureManeuverPicker title="Expert Champion — Master-at-Arms" description="Learn 2 additional Maneuvers of your choice." selected={championExpertManeuvers} limit={2} options={maneuvers} knownOutside={championKnownOutside('champion.expertManeuvers')} onToggle={(maneuver) => toggleStoredFeatureChoice('champion.expertManeuvers', maneuver, 2)} />}
                </div>
              </div>}
              {ownsClassFeature('Bard', 'Remarkable Repertoire') && <div className={panelClass}>
                <div className="mb-4"><h3 className="font-black text-fuchsia-200">Remarkable Repertoire</h3><p className="mt-1 text-sm leading-6 text-slate-500">Magical Secrets and its upgrades grant Spells separately from the Bard Class Table. These pickers use the entire published spell catalog, while the ordinary Spells picker remains limited to the Bard Spell List.</p></div>
                <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><div className="rounded-xl bg-violet-500/10 p-3 text-xs leading-5 text-violet-100"><strong>Jack of All Trades:</strong> +2 Skill Points{level >= 5 ? ', plus +2 from Expert Bard' : ''}.</div>{talents.includes('Expanded Repertoire') && <div className="rounded-xl bg-fuchsia-500/10 p-3 text-xs leading-5 text-fuchsia-100"><strong>Expanded Repertoire:</strong> +2 Skill Points, 2 any-list Spells, and both manners of Magical Expression.</div>}<div className="rounded-xl bg-sky-500/10 p-3 text-xs leading-5 text-sky-100"><strong>Magical Expression:</strong> {(featureChoices['bard.expression'] ?? []).join(' and ') || 'choose above'}.</div></div>
                <div className="space-y-4">
                  <FeatureSpellPicker title="Magical Secrets" description="Learn any 2 Spells of your choice from any Spell List." selected={bardMagicalSecrets} limit={2} options={spells} knownOutside={bardKnownOutside('bard.magicalSecrets')} onToggle={(spell) => toggleStoredFeatureChoice('bard.magicalSecrets', spell, 2)} />
                  {ownsClassFeature('Bard', 'Expert Bard') && <FeatureSpellPicker title="Expert Bard — Magical Secrets" description="Remarkable Repertoire grants 2 additional Spells of your choice from any Spell List." selected={bardExpertSecrets} limit={2} options={spells} knownOutside={bardKnownOutside('bard.expertSecrets')} onToggle={(spell) => toggleStoredFeatureChoice('bard.expertSecrets', spell, 2)} />}
                  {talents.includes('Expanded Repertoire') && <FeatureSpellPicker title="Expanded Repertoire Spells" description="Learn 2 additional Spells of your choice from any Spell List. The Talent also grants both manners of Magical Expression." selected={bardExpandedSecrets} limit={2} options={spells} knownOutside={bardKnownOutside('bard.expandedRepertoireSpells')} onToggle={(spell) => toggleStoredFeatureChoice('bard.expandedRepertoireSpells', spell, 2)} />}
                  {bardHasEloquence && <FeatureSpellPicker title="Enthrall" description={bardKnownBeforeEnthrall.has('Charm') ? 'Because Charm is already known, Enthrall grants another Spell with the Charmed Tag. The current Beta catalog does not publish an alternate if none appears below.' : 'Learn Charm. When cast through Enthrall, it does not end as a result of the target taking damage.'} selected={bardEnthrallSpell} limit={1} options={bardEnthrallOptions} knownOutside={bardKnownBeforeEnthrall} onToggle={(spell) => toggleStoredFeatureChoice('bard.enthrallSpell', spell, 1)} />}
                </div>
              </div>}
              {clericDomains.length > 0 && <div className={panelClass}>
                <div className="mb-4"><h3 className="font-black text-amber-200">Divine Domain Configuration</h3><p className="mt-1 text-sm text-slate-500">Domain-granted Spells and Maneuvers are added separately from the Cleric Class Table allowances.</p></div>
                <div className="space-y-4">
                  {clericMagicDomainCount > 0 && <details open className="rounded-xl border border-violet-400/20 bg-violet-950/20 p-4"><summary className="cursor-pointer font-black text-violet-200">Magic Domain Choices ({clericMagicDomainCount})</summary><div className="mt-4 space-y-3">{Array.from({ length: clericMagicDomainCount }, (_, index) => { const selectedTag = clericMagicDomainTags[index] ?? ''; const selectedSpell = clericMagicDomainSpells[index] ?? ''; const spellOptions = selectedTag ? spells.filter(({ tags }) => (tags ?? '').split(',').some((tag) => tag.trim().toLowerCase() === selectedTag.toLowerCase())) : []; const spell = spells.find(({ name }) => name === selectedSpell); return <div key={index} className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><h4 className="font-black text-slate-200">Magic Domain {index + 1}</h4><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Spell Tag<select value={selectedTag} onChange={(event) => { setClericMagicDomainTag(index, event.target.value); setSelectedSpells([]); }} className={`${fieldClass} mt-2 normal-case tracking-normal`}><option value="">Choose a Spell Tag…</option>{clericSpellTags.map((tag) => <option key={tag}>{tag}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Granted Spell<select value={selectedSpell} disabled={!selectedTag} onChange={(event) => setStoredFeatureChoiceAtIndex('cleric.magicDomainSpells', index, event.target.value)} className={`${fieldClass} mt-2 normal-case tracking-normal disabled:opacity-40`}><option value="">Choose a matching Spell…</option>{spellOptions.map(({ name }) => <option key={name} disabled={selectedSpells.includes(name) || clericMagicDomainSpells.some((chosen, chosenIndex) => chosenIndex !== index && chosen === name)}>{name}</option>)}</select></label></div>{spell && <div className="mt-3"><InfoDetails summary={`View ${spell.name}`}><p className="mb-2 text-xs font-bold text-violet-300">{spell.source} • {spell.school} • {spell.cost} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails></div>}<p className="mt-3 text-xs text-violet-100">+1 maximum MP. This tag is also added to your Spell List.</p></div>; })}</div></details>}
                  {clericHasWarDomain && <details className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-4"><summary className="cursor-pointer font-black text-rose-200">War Domain Attack Maneuver ({(featureChoices['cleric.warManeuver'] ?? []).length}/1)</summary><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{clericAttackManeuvers.map((maneuver) => { const selected = (featureChoices['cleric.warManeuver'] ?? []).includes(maneuver.name); const disabled = !selected && ((featureChoices['cleric.warManeuver'] ?? []).length >= 1 || selectedManeuvers.includes(maneuver.name)); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('cleric.warManeuver', maneuver.name, 1)} />{maneuver.name}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-rose-300">{maneuver.category} • {maneuver.range}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                  {clericHasPeaceDomain && <details className="rounded-xl border border-sky-400/20 bg-sky-950/20 p-4"><summary className="cursor-pointer font-black text-sky-200">Peace Domain Defense Maneuver ({(featureChoices['cleric.peaceManeuver'] ?? []).length}/1)</summary><p className="mt-3 text-sm text-slate-400">Heavy Armor and Heavy Shields are also added to your starting equipment options.</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{clericDefenseManeuvers.map((maneuver) => { const selected = (featureChoices['cleric.peaceManeuver'] ?? []).includes(maneuver.name); const disabled = !selected && ((featureChoices['cleric.peaceManeuver'] ?? []).length >= 1 || selectedManeuvers.includes(maneuver.name)); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('cleric.peaceManeuver', maneuver.name, 1)} />{maneuver.name}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-sky-300">{maneuver.category} • {maneuver.range}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{clericHasKnowledgeDomain && <div className="rounded-xl bg-fuchsia-500/10 p-3 text-xs leading-5 text-fuchsia-100"><strong>Knowledge:</strong> +2 Skill Points and +1 Knowledge Trade Mastery Limit.</div>}{clericDomains.includes('Ancestral') && <div className="rounded-xl bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-100"><strong>Ancestral:</strong> +2 Ancestry Points usable on Traits from any Ancestry.</div>}{clericDomains.includes('Divine Damage Expansion') && <div className="rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-100"><strong>Divine Damage Expansion:</strong> Resistance (1) to your selected Divine Damage.</div>}</div>
                </div>
              </div>}
              {(hasPactWeapon || hasPactArmor || hasPactSpell || pactBaneCount > 0 || warlockBoons.has('Pact Familiar')) && <div className={panelClass}><div className="mb-4"><h3 className="font-black text-violet-200">Pact Configuration</h3><p className="mt-1 text-sm text-slate-500">These choices are granted by the selected Pact Boons and do not consume the normal Spells Known or Maneuvers Known allowances.</p></div><div className="space-y-4">
                {hasPactWeapon && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-rose-200">Pact Weapon Maneuvers ({(featureChoices['warlock.pactWeaponManeuvers'] ?? []).length}/{warlockGrantedManeuverLimit})</summary><p className="mt-3 text-sm text-slate-500">Learn {warlockGrantedManeuverLimit} Attack Maneuvers{level >= 5 ? ', including the additional Maneuver from Expert Warlock' : ''}.</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{warlockAttackManeuvers.map((maneuver) => { const selected = (featureChoices['warlock.pactWeaponManeuvers'] ?? []).includes(maneuver.name); const learnedElsewhere = selectedManeuvers.includes(maneuver.name) || (featureChoices['warlock.pactArmorManeuvers'] ?? []).includes(maneuver.name); const disabled = !selected && (learnedElsewhere || (featureChoices['warlock.pactWeaponManeuvers'] ?? []).length >= warlockGrantedManeuverLimit); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('warlock.pactWeaponManeuvers', maneuver.name, warlockGrantedManeuverLimit)} />{maneuver.name}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-rose-300">{maneuver.category} • {maneuver.range}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                {hasPactArmor && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-sky-200">Pact Armor Maneuvers ({(featureChoices['warlock.pactArmorManeuvers'] ?? []).length}/{warlockGrantedManeuverLimit})</summary><p className="mt-3 text-sm text-slate-500">Learn {warlockGrantedManeuverLimit} Defensive Maneuvers{level >= 5 ? ', including the additional Maneuver from Expert Warlock' : ''}. Mystical Armor’s +1 AD and MDR apply while your Pact Armor is equipped.</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{warlockDefenseManeuvers.map((maneuver) => { const selected = (featureChoices['warlock.pactArmorManeuvers'] ?? []).includes(maneuver.name); const learnedElsewhere = selectedManeuvers.includes(maneuver.name) || (featureChoices['warlock.pactWeaponManeuvers'] ?? []).includes(maneuver.name); const disabled = !selected && (learnedElsewhere || (featureChoices['warlock.pactArmorManeuvers'] ?? []).length >= warlockGrantedManeuverLimit); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('warlock.pactArmorManeuvers', maneuver.name, warlockGrantedManeuverLimit)} />{maneuver.name}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-sky-300">{maneuver.category} • {maneuver.range}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                {warlockBoons.has('Pact Familiar') && <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4"><h4 className="font-black text-emerald-200">Pact Familiar</h4><p className="mt-2 text-sm leading-6 text-emerald-50/80">Call Familiar is learned automatically. Its Familiar gains 3 additional Familiar Traits for free, increased by another 3 points of Familiar or Beast Traits at level 5.</p></div>}
                {hasPactSpell && level >= 5 && <details className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-950/20 p-4"><summary className="cursor-pointer font-black text-fuchsia-200">Expert Warlock Spells ({warlockExpertSpells.length}/2)</summary><p className="mt-3 text-sm text-slate-400">Learn 2 new Spells from any Spell Source. They are granted separately from the Warlock Class Table.</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{spells.map((spell) => { const selected = warlockExpertSpells.includes(spell.name); const disabled = !selected && (warlockExpertSpells.length >= 2 || warlockKnownBeforeExpert.has(spell.name)); return <InfoDetails key={spell.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('warlock.expertSpells', spell.name, 2)} />{spell.name}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-fuchsia-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                {hasPactSpell && <details className="rounded-xl border border-violet-400/20 bg-violet-950/20 p-4"><summary className="cursor-pointer font-black text-violet-200">Pact {warlockPactSpellLimit === 1 ? 'Spell' : 'Spells'} ({warlockPactSpells.length}/{warlockPactSpellLimit})</summary><p className="mt-3 text-sm text-slate-400">Choose {warlockPactSpellLimit} Spell{warlockPactSpellLimit === 1 ? '' : 's'} you know. Each gains Death’s Toll and Range Increase; Patron’s Favor remains once per Round.</p><div className="mt-3 grid gap-2 md:grid-cols-2">{Array.from(warlockKnownSpellNames).sort().map((name) => { const spell = spells.find(({ name: candidate }) => candidate === name); const selected = warlockPactSpells.includes(name); const disabled = !selected && warlockPactSpells.length >= warlockPactSpellLimit; return <InfoDetails key={name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('warlock.pactSpells', name, warlockPactSpellLimit)} />{name}</label>}>{spell ? <><p className="mb-2 text-xs font-bold text-violet-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}</> : 'Spell details are unavailable.'}</InfoDetails>; })}</div>{warlockKnownSpellNames.size === 0 && <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100">Choose your known Spells below, then return here to bind your Pact Spell.</p>}</details>}
                {pactBaneCount > 0 && <details className="rounded-xl border border-red-400/20 bg-red-950/20 p-4"><summary className="cursor-pointer font-black text-red-200">Pact Bane Spells ({pactBaneSpells.length}/{pactBaneCount})</summary><p className="mt-3 text-sm text-slate-400">Learn Bane, or a different Spell from your Spell List if Bane is already known. Each selected copy of this Talent grants one Spell.</p><div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-2 md:grid-cols-2">{pactBaneOptions.map((spell) => { const selected = pactBaneSpells.includes(spell.name); const knownOutside = baneKnownOutsideTalent ? warlockKnownBeforeExpert.has(spell.name) || warlockExpertSpells.includes(spell.name) : spell.name !== 'Bane' && !pactBaneSpells.includes('Bane'); const disabled = !selected && (pactBaneSpells.length >= pactBaneCount || (spell.name === 'Bane' ? baneKnownOutsideTalent : knownOutside)); return <InfoDetails key={spell.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStoredFeatureChoice('warlock.pactBaneSpells', spell.name, pactBaneCount)} />{spell.name}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-red-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}</InfoDetails>; })}</div></details>}
              </div></div>}
              {(hasSpells || hasManeuvers) && <div className={panelClass}>{hasSpells && needsBorrowedSpellList && <label className="mb-4 block text-sm font-bold text-slate-300">Spell List gained from Spellcaster Path<select value={spellListClass} onChange={(event) => { const nextClass = event.target.value; const nextReference = reference.classes.find((entry) => entry.name === nextClass); setSpellListClass(nextClass); setSpellSource(nextReference?.fixedSpellSource ?? ''); setSelectedSpellSchools([]); setSelectedSpells([]); }} className={`${fieldClass} mt-2`}><option value="">Choose a Class Spell List</option>{spellListClasses.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}</select><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">The Beta grants a Class Spell List—not merely a Spell Source—the first time a Class without a Spell List chooses Spellcaster Path.</span></label>}{hasSpells && canChooseSpellSource && <label className="mb-4 block text-sm font-bold text-slate-300">Spell Source<select value={spellSource} onChange={(event) => { setSpellSource(event.target.value); setSelectedSpells([]); }} className={`${fieldClass} mt-2`}><option value="">Choose a source</option>{Array.from(new Set(spells.flatMap((spell) => spell.source.split(', ')))).sort().map((source) => <option key={source}>{source}</option>)}</select></label>}{hasSpells && spellAccessReference?.fixedSpellSource && <div className="mb-4 rounded-lg bg-slate-950/50 px-3 py-2 text-sm font-bold text-violet-200">Spell Source: {spellAccessReference.fixedSpellSource}</div>}{hasSpells && spellSchoolChoiceCount > 0 && <div className="mb-4"><h4 className="text-sm font-bold text-slate-300">Spell Schools ({selectedSpellSchools.length}/{spellSchoolChoiceCount})</h4><div className="mt-2 flex flex-wrap gap-2">{Array.from(new Set(spells.map((spell) => spell.school))).sort().map((school) => { const selected = selectedSpellSchools.includes(school); const disabled = !selected && selectedSpellSchools.length >= spellSchoolChoiceCount; return <button type="button" key={school} disabled={disabled} onClick={() => { setSelectedSpellSchools((current) => selected ? current.filter((entry) => entry !== school) : [...current, school]); setSelectedSpells([]); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-slate-700 text-slate-400 disabled:opacity-30'}`}>{school}</button>; })}</div></div>}{spellAccessClassName === 'Summoner' && hasSpells && <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100"><span className="font-black">Summoner Spell Access:</span> All Astromancy, Conjuration, and Transmutation Spells, plus any Spell with the Summoning tag.</div>}{spellAccessClassName === 'Psion' && hasSpells && <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm leading-6 text-cyan-100"><span className="font-black">Psion Spell Access:</span> Psychic or Gravity tagged Spells, plus Divination, Enchantment, Illusion, or Protection Spells. For the Beta 0.10.5 catalog, Illusion is a tag and Protection maps to Nullification. Psi Bolt is granted separately by Psionic Mind.</div>}
                <div className="mt-4 space-y-3">{hasSpells && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-violet-200">Spells ({selectedSpells.length}/{derived?.spellLimit ?? 0}{grantedSpells.length > 0 ? ` + ${grantedSpells.length} granted` : ''})</summary><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-2 lg:grid-cols-2">{allowedSpells.map((spell) => { const selected = selectedSpells.includes(spell.name); const granted = grantedSpells.includes(spell.name); const chosenAsCantrip = className === 'Psion' && selectedCantrips.includes(spell.name); const disabled = (!selected && (granted || chosenAsCantrip)) || (derived?.spellLimit ?? 0) === 0; return <InfoDetails key={spell.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={granted || selected} onChange={() => toggleLimited(selectedSpells, spell.name, derived?.spellLimit ?? 0, setSelectedSpells)} />{spell.name}{granted && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">Feature-granted</span>}{chosenAsCantrip && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-sky-300">Chosen as Cantrip</span>}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-violet-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                  {classTotals && classTotals.cantrips > 0 && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-sky-200">Psion Cantrips ({selectedCantrips.length}/{derived?.cantripLimit ?? 0} + Psi Bolt)</summary><p className="mt-3 text-xs leading-5 text-slate-500">The Psion v2 Cantrip tag predates Beta 0.10.5. Eligible Psion Spells without an MP cost are shown here as the compatible cantrip list.</p><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-2 lg:grid-cols-2">{psionCantripOptions.filter(({ name: spellName }) => !grantedSpells.includes(spellName)).map((spell) => { const selected = selectedCantrips.includes(spell.name); const chosenAsSpell = selectedSpells.includes(spell.name); const disabled = (!selected && chosenAsSpell) || (derived?.cantripLimit ?? 0) === 0; return <InfoDetails key={spell.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleLimited(selectedCantrips, spell.name, derived?.cantripLimit ?? 0, setSelectedCantrips)} />{spell.name}{chosenAsSpell && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-violet-300">Chosen as Spell</span>}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-sky-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                  {hasManeuvers && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-fuchsia-200">Maneuvers ({selectedManeuvers.length}/{derived?.maneuverLimit ?? 0}{grantedManeuvers.length > 0 ? ` + ${grantedManeuvers.length} granted` : ''})</summary><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-2 lg:grid-cols-2">{maneuvers.map((maneuver) => { const granted = grantedManeuvers.includes(maneuver.name); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${granted ? 'cursor-default' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={granted || (derived?.maneuverLimit ?? 0) === 0} checked={granted || selectedManeuvers.includes(maneuver.name)} onChange={() => toggleLimited(selectedManeuvers, maneuver.name, derived?.maneuverLimit ?? 0, setSelectedManeuvers)} />{maneuver.name}{granted && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">Granted</span>}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-fuchsia-300">{maneuver.category} • {maneuver.range}{maneuver.requirements ? ` • ${maneuver.requirements}` : ''}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>}</div>
              </div>}
            </>}</div></div>
          </section>}

          {currentStep === 'equipment' && classReference && <section><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{classReference.name} Training</p><h2 className="text-2xl font-black text-white">Starting Equipment</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{classReference.startingEquipment.description}</p></div>{equipmentLoading ? <p className="text-slate-400">Loading equipment…</p> : <div className="space-y-6">{([['arsenal', `Arsenal — choose ${classReference.startingEquipment.arsenalCount}`], ['armor', 'Armor — choose 1'], ['tools', `Trade Tools — choose ${classReference.startingEquipment.tradeToolCount}`]] as const).map(([group, title]) => { const limit = group === 'arsenal' ? classReference.startingEquipment.arsenalCount : group === 'armor' ? 1 : classReference.startingEquipment.tradeToolCount; const groupIDs = new Set(startingEquipment[group].map(({ id }) => id)); const selectedCount = inventoryItems.filter((entry) => entry.source === 'startingEquipment' && groupIDs.has(entry.equipmentID)).length; const groupFull = selectedCount >= limit; return <div key={group}><h3 className="mb-3 font-black text-violet-200">{title} <span className={`ml-2 text-xs ${groupFull ? 'text-emerald-300' : 'text-slate-500'}`}>({selectedCount}/{limit})</span></h3><div className="grid gap-2 lg:grid-cols-2">{startingEquipment[group].map((item) => { const selected = inventoryItems.some((entry) => entry.equipmentID === item.id && entry.source === 'startingEquipment'); const disabled = groupFull && !selected; return <div key={item.id} className={disabled ? 'opacity-40' : ''}><InfoDetails summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStartingEquipment(item.id, group)} />{item.name}<span className="ml-auto text-xs text-slate-500">{item.slot}</span></label>}><p className="mb-2 font-semibold text-violet-200">{item.summary}</p>{item.mechanics}</InfoDetails></div>; })}</div></div>; })}</div>}<label className="mt-6 block text-sm font-bold text-slate-300">Character Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className={`${fieldClass} mt-2`} placeholder="Goals, bonds, appearance, reminders…" /></label></section>}

          {currentStep === 'summary' && derived && classReference && <section><h2 className="text-2xl font-black text-white">Final Character Summary</h2><p className="mt-2 text-slate-400">All health, resources, defenses, combat values, and saves are calculated from the preceding choices.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Metric label="Maximum HP" value={derived.maxHP} tone="red" /><Metric label="Action Points" value={4} /><Metric label="Stamina" value={derived.maxStamina} tone="blue" /><Metric label="Mana" value={derived.maxMana} tone="blue" /><Metric label="Physical Defense" value={derived.physicalDefense} /><Metric label="Area Defense" value={derived.arcaneDefense} /><Metric label="Combat Mastery" value={`+${derived.combatMastery}`} /><Metric label="Prime Modifier" value={`+${derived.primeModifier}`} /><Metric label="Martial Check" value={`+${derived.martialCheck}`} /><Metric label="Spell Check" value={`+${derived.spellCheck}`} /><Metric label="Class Save DC" value={derived.saveDC} /><Metric label="Speed" value={derived.speed} /><Metric label="PDR" value={derived.physicalDR ? 'Resistance (Half)' : '—'} /><Metric label="EDR" value={derived.elementalDR ? 'Resistance (Half)' : '—'} /><Metric label="MDR" value={derived.mysticalDR ? 'Resistance (Half)' : '—'} /></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><div className={panelClass}><h3 className="font-black text-violet-200">Identity</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-bold text-slate-200">{name || 'Unnamed'}</dd></div><div><dt className="text-slate-500">Level & Class</dt><dd className="font-bold text-slate-200">Level {level} {className}</dd></div><div><dt className="text-slate-500">Subclass</dt><dd className="font-bold text-slate-200">{subclass || 'Not yet available'}</dd></div><div><dt className="text-slate-500">Ancestry</dt><dd className="font-bold text-slate-200">{ancestry}{secondaryAncestry ? ` / ${secondaryAncestry}` : ''}</dd></div><div><dt className="text-slate-500">Size</dt><dd className="font-bold text-slate-200">{derived.size}</dd></div><div><dt className="text-slate-500">Background</dt><dd className="font-bold text-slate-200">{backgroundName || 'Unnamed background'}</dd></div></dl></div><div className={panelClass}><h3 className="font-black text-violet-200">Attributes & Saves</h3><div className="mt-3 grid grid-cols-2 gap-3">{ATTRIBUTE_NAMES.map((attribute) => <div key={attribute} className="rounded-lg bg-slate-950/50 p-3"><div className="text-xs text-slate-500">{attribute}</div><div className="text-xl font-black text-slate-100">{derived.effectiveAttributes[attribute] >= 0 ? '+' : ''}{derived.effectiveAttributes[attribute]}</div><div className="text-xs text-violet-300">Save +{derived.effectiveAttributes[attribute] + derived.combatMastery}</div></div>)}</div></div><div className={panelClass}><h3 className="font-black text-violet-200">Training</h3><p className="mt-3 text-sm text-slate-400">Skills {skillSpent}/{derived.skillPointBudget} • Trades {tradeSpent}/{derived.tradePointBudget} • Language Points {languageSpent}/{derived.languagePointBudget}</p><p className="mt-2 text-sm text-slate-400">Mastery cap: {masteryTitle(masteryMaximum)}{Object.keys(expertise.skills).length || Object.keys(expertise.trades).length ? ' (expertise bonuses shown in Skills)' : ''}</p></div><div className={panelClass}><h3 className="font-black text-violet-200">Features & Powers</h3><p className="mt-3 text-sm text-slate-400">{classReference.features.filter(({ level: featureLevel }) => featureLevel <= level).reduce((sum, entry) => sum + entry.features.length, 0)} class features • {selectedTraits.length} ancestry traits • {talents.length} talents</p><p className="mt-2 text-sm text-slate-400">{selectedSpells.length + grantedSpells.length} spells ({grantedSpells.length} feature-granted) • {selectedCantrips.length} cantrips • {selectedManeuvers.length + grantedManeuvers.length} maneuvers</p></div></div>{validation.length > 0 && <div role="alert" className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><h3 className="font-black text-amber-200">Finish these choices</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/80">{validation.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}</section>}
        </main>

        {(rulesError || powersError) && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{rulesError || powersError}</div>}
        <footer className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={currentStepIndex === 0} onClick={() => setCurrentStep(STEPS[Math.max(0, currentStepIndex - 1)].id)} className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-3 font-bold text-slate-300 disabled:opacity-30">← Previous</button><span className="hidden text-sm text-slate-500 sm:block">Step {currentStepIndex + 1} of {STEPS.length}{powersLoading ? ' • Loading powers…' : ''}</span>{currentStep !== 'summary' ? <button type="button" disabled={(currentStep === 'attributes' && !name.trim()) || (currentStep === 'class' && !classConfirmed)} onClick={() => setCurrentStep(STEPS[Math.min(STEPS.length - 1, currentStepIndex + 1)].id)} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-black text-white disabled:opacity-40">Next →</button> : <button type="button" disabled={validation.length > 0} onClick={finish} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{editingCharacter ? 'Save Character' : 'Finish Character'}</button>}</footer>
      </div>
    </div>
  );
};

export default CharacterBuilderView;
