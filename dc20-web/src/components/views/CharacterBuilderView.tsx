import React, { useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
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
  ancestryExpertise,
  applyDerivedCharacter,
  attributeCap,
  classChoiceSelectionLimit,
  classTableTotals,
  defaultBuild,
  deriveCharacter,
  grantedClassLanguageNames,
  grantedClassManeuverNames,
  grantedClassSpellNames,
  masteryCap,
  masteryRank,
  masteryTitle,
  skillMasteryCap,
  selectedAncestryTraits,
  isAutomaticAncestryTrait,
  spellIsAvailableToClass,
  talentSlots,
} from '../../utils/characterRules';
import { toggleInventoryEquipped } from '../../utils/equipmentRules';
import { generateUUID } from '../../utils/gameUtils';

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

function choiceOptions(trait: AncestryTrait, skills: MasteryReference[], trades: MasteryReference[], spells: Array<{ name: string; source: string; school: string; tags: string }>): string[] {
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
  if (trait.name === 'Celestial Magic') return spells.filter(({ source }) => source.split(', ').includes('Divine')).map(({ name }) => name);
  if (trait.name === 'Fiendish Magic') return spells.filter(({ source, school }) => source.split(', ').includes('Arcane') && ['Elemental', 'Enchantment'].includes(school)).map(({ name }) => name);
  if (trait.name === 'Psionic Magic') return spells.filter(({ tags }) => tags.split(', ').some((tag) => ['Psychic', 'Gravity'].includes(tag))).map(({ name }) => name);
  return [];
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
  const [selectedSpells, setSelectedSpells] = useState<string[]>(originalBuild.selectedSpells);
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>(originalBuild.selectedCantrips);
  const [selectedManeuvers, setSelectedManeuvers] = useState<string[]>(originalBuild.selectedManeuvers);
  const [inventoryItems, setInventoryItems] = useState<CharacterInventoryItem[]>(original.inventoryItems ?? []);
  const [notes, setNotes] = useState(original.notes);

  const classReference = reference?.classes.find((entry) => entry.name === className) ?? null;
  const pathLevels = (className === 'Psion' ? [2, 4, 7, 10] : [2, 4, 6, 8]).filter((entry) => entry <= level);
  const preferredPath: CharacterPathChoice = classReference?.path === 'Martial' || classReference?.path === 'Hybrid' ? 'Martial' : 'Spellcaster';
  const effectivePathChoices = Object.fromEntries(pathLevels.map((pathLevel) => [String(pathLevel), storedPathChoices[String(pathLevel)] ?? preferredPath]));
  const pathChoices = effectivePathChoices;
  const selectedRogueLanguage = className === 'Rogue' ? featureChoices['rogue.language']?.[0] : undefined;
  const effectiveLanguageFluencies: Record<string, LanguageFluency> = {
    ...languageFluencies,
    Common: 'Fluent',
    ...(selectedRogueLanguage ? { [selectedRogueLanguage]: 'Fluent' as LanguageFluency } : {}),
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
    languageFluencies: effectiveLanguageFluencies,
    ancestrySecondary: secondaryAncestry,
    selectedAncestryTraitIDs: traitIDs,
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
  const derived = classReference && reference ? deriveCharacter(draft, classReference, reference.ancestryTraits, equipment) : null;
  const classTotals = classReference ? classTableTotals(classReference, level) : null;
  const expertise = reference ? ancestryExpertise(draft, reference.ancestryTraits) : { skills: {}, trades: {} };
  const selectedTraits = reference ? selectedAncestryTraits(draft, reference.ancestryTraits) : [];
  const selectedAncestries = new Set([ancestry, secondaryAncestry].filter((entry): entry is string => Boolean(entry)));
  const automaticTraitIDs = new Set(selectedTraits.filter((trait) => isAutomaticAncestryTrait(trait, selectedAncestries)).map((trait) => trait.id));
  const ancestrySpent = selectedTraits.reduce((sum, trait) => sum + trait.cost, 0);
  const negativePoints = -selectedTraits.filter(({ cost }) => cost < 0).reduce((sum, trait) => sum + trait.cost, 0);
  const minorTraits = selectedTraits.filter(({ countsAsZeroPointTrait }) => countsAsZeroPointTrait).length;
  const skillSpent = masterySpent(skillMasteries);
  const tradeSpent = masterySpent(tradeMasteries);
  const grantedLanguages = grantedClassLanguageNames(draft);
  const languageSpent = fluencySpent(effectiveLanguageFluencies, ['Common', ...grantedLanguages]);
  const advancementAttributePoints = classTotals?.attribute ?? 0;
  const attributeBonusBudget = 2 + advancementAttributePoints + talents.filter((talent) => talent === 'Attribute Increase').length * 2;
  const attributeBonusSpent = ATTRIBUTE_NAMES.reduce((sum, attribute) => sum + (attributeBonusPoints[attribute] ?? 0), 0);
  const pointBuyBudget = 4 + advancementAttributePoints + talents.filter((talent) => talent === 'Attribute Increase').length * 2;
  const pointBuySpent = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  const usesAttributePool = attributeMethod !== 'Point Buy';
  const currentStepIndex = STEPS.findIndex(({ id }) => id === currentStep);
  const availableTalentSlots = talentSlots(className, level, subclass);
  const attributePool = attributeMethod === 'Standard Array' ? STANDARD_ARRAY : rolledResults;
  const assignedCount = new Set(attributeAssignments.filter(Boolean)).size;
  const previewClassReference = reference?.classes.find((entry) => entry.name === classPreviewName) ?? null;
  const featureChoiceGroups = (classReference?.choiceGroups.filter((group) => (
    group.level <= level
    && (!group.requiredSubclass || group.requiredSubclass === subclass)
    && (!group.requiredTalent || talents.includes(group.requiredTalent))
  )) ?? []).map((group) => {
    const options = group.optionsFromGroup
      ? classReference?.choiceGroups.find(({ id }) => id === group.optionsFromGroup)?.options ?? []
      : group.options;
    const resolved = { ...group, options };
    const limit = classChoiceSelectionLimit(resolved, draft);
    return { ...resolved, limit, minimumSelections: group.minimumSelections ?? limit };
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
      setTalents((current) => current.filter((talent) => classReference.talents.some((option) => option.name === talent && option.minimumLevel <= next)).slice(0, talentSlots(classReference.name, next, next >= 3 ? subclass : '')));
    }
    const validPathLevels = new Set((className === 'Psion' ? [2, 4, 7, 10] : [2, 4, 6, 8]).filter((entry) => entry <= next).map(String));
    setPathChoices((current) => Object.fromEntries(Object.entries(current).filter(([pathLevel]) => validPathLevels.has(pathLevel))));
  };
  const setLevel = changeLevel;

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
      setTraitChoices((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== trait.id)));
      return;
    }
    if (trait.countsAsZeroPointTrait && minorTraits >= 1) return;
    if (trait.cost < 0 && negativePoints >= 2) return;
    if (trait.prerequisite && !selectedTraits.some(({ name }) => name === trait.prerequisite)) return;
    setTraitIDs((current) => [...current, trait.id]);
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

  const adjustTalent = (name: string, direction: -1 | 1, isRepeatable: boolean) => {
    setTalents((current) => {
      if (direction < 0) {
        const index = current.lastIndexOf(name);
        return index < 0 ? current : current.filter((_, candidate) => candidate !== index);
      }
      if (current.length >= availableTalentSlots || (!isRepeatable && current.includes(name))) return current;
      return [...current, name];
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
      if (group.id === 'spellblade.disciplines' && subclass === 'Paladin') {
        const paladinChoice = next['spellblade.paladinDiscipline'] ?? [];
        if (!updated.includes('Acolyte')) next['spellblade.paladinDiscipline'] = ['Acolyte'];
        else if (paladinChoice[0] === 'Acolyte' || updated.includes(paladinChoice[0])) next['spellblade.paladinDiscipline'] = [];
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

  const summonerSpellGrantGroups = new Set([
    'summoner.bondedSummon',
    ...(subclass === 'Chimera' ? ['summoner.chimeraSummons'] : []),
    ...(subclass === 'Dread Lord' ? ['summoner.dreadLordSummon'] : []),
    ...(talents.includes('Horde Summoner') ? ['summoner.hordeSummons'] : []),
  ]);
  const classChoiceOptionDisabled = (group: ClassChoiceGroupReference, option: string): boolean => {
    if (className === 'Spellblade' && group.id === 'spellblade.paladinDiscipline') {
      const baseDisciplines = featureChoices['spellblade.disciplines'] ?? [];
      return baseDisciplines.includes('Acolyte')
        ? option === 'Acolyte' || baseDisciplines.includes(option)
        : option !== 'Acolyte';
    }
    if (className !== 'Summoner' || !group.id.startsWith('summoner.')) return false;
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
  const spellcasterPathCount = Object.values(pathChoices).filter((path) => path === 'Spellcaster').length;
  const lacksStartingSpellList = (classTotals?.spells ?? 0) + (classTotals?.cantrips ?? 0) === 0;
  const needsBorrowedSpellList = hasSpells && lacksStartingSpellList && spellcasterPathCount > 0;
  const spellListClasses = reference?.classes.filter((entry) => entry.tableRows.some((row) => (row.spells ?? 0) > 0 || (row.cantrips ?? 0) > 0)) ?? [];
  const spellAccessClassName = needsBorrowedSpellList ? spellListClass : className;
  const spellAccessReference = reference?.classes.find((entry) => entry.name === spellAccessClassName) ?? null;
  const canChooseSpellSource = hasSpells && Boolean(spellAccessReference) && !spellAccessReference?.fixedSpellSource
    && !['Bard', 'Psion', 'Spellblade', 'Summoner', 'Warlock'].includes(spellAccessClassName);
  const spellSchoolChoiceCount = spellAccessReference?.schoolChoiceCount ?? 0;
  const allowedSpells = (() => {
    if (!spellAccessReference || !hasSpells) return [];
    return spells.filter((spell) => spellIsAvailableToClass(
      spellAccessClassName,
      spell,
      spellAccessReference.fixedSpellSource,
      spellSource,
      selectedSpellSchools,
    ));
  })();
  const hasManeuvers = (derived?.maneuverLimit ?? 0) > 0;

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
      || (training.arsenal.includes('Light Weapon') && item.category === 'Weapons' && item.slot === 'One Hand')
      || (training.arsenal.includes('Spell Focus') && item.category === 'Spell Focuses')
      || ((training.arsenal.includes('Shield') || training.arsenal.includes(item.name)) && item.category === 'Shields')
      || (hasWarriorDiscipline && item.category === 'Shields' && item.subtype === 'Heavy Shield')
      || training.arsenal.includes(item.name)
    )).sort((a, b) => a.name.localeCompare(b.name));
    const armor = equipment.filter((item) => item.category === 'Armor' && (
      training.armor.includes(item.name) || (hasWarriorDiscipline && item.subtype === 'Heavy Armor')
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
    if (derived && ancestrySpent > derived.ancestryPointBudget) issues.push('Ancestry traits exceed the available Ancestry Points.');
    if (negativePoints > 2) issues.push('Negative ancestry traits can grant at most 2 points.');
    if (minorTraits > 1) issues.push('Choose at most one 0-point minor ancestry trait.');
    if (className === 'Rogue' && selectedTraits.some(({ name }) => name === 'Skill Expertise')) issues.push('Roguish Finesse already increases every Skill Mastery Limit; replace the Skill Expertise ancestry trait because these increases cannot stack.');
    if (talents.length > availableTalentSlots) issues.push('Too many Talents are selected.');
    if (level >= 3 && classReference?.subclasses.length && !subclass) issues.push('Choose a subclass.');
    if (!classConfirmed) issues.push('Review and confirm a class.');
    if (needsBorrowedSpellList && !spellListClass) issues.push('Choose the Class Spell List granted by Spellcaster Path progression.');
    if (canChooseSpellSource && !spellSource) issues.push('Choose a Spell Source.');
    if (spellSchoolChoiceCount > 0 && selectedSpellSchools.length !== spellSchoolChoiceCount) issues.push(`Choose ${spellSchoolChoiceCount} Spell Schools.`);
    if (derived && selectedSpells.length > derived.spellLimit) issues.push('Too many Spells are selected.');
    if (derived && selectedManeuvers.length > derived.maneuverLimit) issues.push('Too many Maneuvers are selected.');
    for (const group of featureChoiceGroups) {
      const count = (featureChoices[group.id] ?? []).length;
      if (group.options.length > 0 && count < (group.minimumSelections ?? group.limit)) issues.push(`Complete the ${group.title} class feature choice.`);
      if (count > group.limit) issues.push(`Choose no more than ${group.limit} options for ${group.title}.`);
      if (group.id === 'spellblade.paladinDiscipline' && (featureChoices[group.id] ?? []).some((option) => classChoiceOptionDisabled(group, option))) issues.push('Correct the Holy Warrior bonus Discipline choice.');
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
      spells: Array.from(new Set([...selectedSpells, ...grantedSpells])).flatMap((spellName) => {
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
  const visibleTraits = reference.ancestryTraits.filter((trait) => [ancestry, secondaryAncestry].includes(trait.ancestry));
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#4c1d95_0%,#111827_42%,#020617_100%)] p-4 lg:p-7">
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
            <div className="mb-6 grid gap-4 lg:grid-cols-2"><label className="text-sm font-bold text-slate-300">Background Name<input value={backgroundName} onChange={(event) => setBackgroundName(event.target.value)} className={`${fieldClass} mt-2`} placeholder="Scholar, sailor, artisan…" /></label><label className="text-sm font-bold text-slate-300">Background Story<textarea value={backgroundStory} onChange={(event) => setBackgroundStory(event.target.value)} rows={3} className={`${fieldClass} mt-2`} placeholder="Where did this character come from?" /></label></div>
            <div className="mb-6 grid gap-3 sm:grid-cols-3"><label className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-400">Skill → Trade conversions<input type="number" min={0} max={derived?.skillPointBudget ?? 0} value={skillConversion} onChange={(event) => setSkillConversion(Math.max(0, Number(event.target.value)))} className={`${fieldClass} mt-2`} /><span className="mt-2 block text-xs">Each Skill Point becomes 2 Trade Points.</span></label><label className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-400">Trade → Language conversions<input type="number" min={0} value={tradeConversion} onChange={(event) => setTradeConversion(Math.max(0, Number(event.target.value)))} className={`${fieldClass} mt-2`} /><span className="mt-2 block text-xs">Each Trade Point becomes 2 Language Points.</span></label><div className="grid grid-cols-3 gap-2"><Metric label="Skills" value={`${skillSpent}/${derived?.skillPointBudget ?? 0}`} /><Metric label="Trades" value={`${tradeSpent}/${derived?.tradePointBudget ?? 0}`} /><Metric label="Languages" value={`${languageSpent}/${derived?.languagePointBudget ?? 0}`} /></div></div>
            <div className="space-y-5">{reference.skillGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{group.name} Skills</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((skillName) => { const item = reference.skills.find(({ name: candidate }) => candidate === skillName)!; const value = skillMasteries[skillName] ?? 'Untrained'; const pointsAvailable = Math.max(0, (derived?.skillPointBudget ?? 0) - skillSpent + masteryRank(value)); return <InfoDetails key={skillName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{skillName}</span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={Math.min(5, skillMasteryMaximum + (expertise.skills[skillName] ?? 0))} bonus={expertise.skills[skillName] ?? 0} pointsAvailable={pointsAvailable} onChange={(next) => setSkillMasteries((current) => ({ ...current, [skillName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-300">{item.attribute}</p>{item.description}</InfoDetails>; })}</div></div>)}
              {reference.tradeGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-fuchsia-300">{group.name} Trades</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((tradeName) => { const item = reference.trades.find(({ name: candidate }) => candidate === tradeName)!; const value = tradeMasteries[tradeName] ?? 'Untrained'; const pointsAvailable = Math.max(0, (derived?.tradePointBudget ?? 0) - tradeSpent + masteryRank(value)); return <InfoDetails key={tradeName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span className="flex flex-wrap items-center gap-2">{tradeName}<span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-fuchsia-300">{item.attribute}</span></span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={Math.min(5, tradeMasteryMaximum + (expertise.trades[tradeName] ?? 0))} bonus={expertise.trades[tradeName] ?? 0} pointsAvailable={pointsAvailable} onChange={(next) => setTradeMasteries((current) => ({ ...current, [tradeName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-fuchsia-300">{item.attribute} • {item.tool}</p>{item.description}</InfoDetails>; })}</div></div>)}
              {reference.languageGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-sky-300">{group.name} Languages</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((languageName) => { const item = reference.languages.find(({ name: candidate }) => candidate === languageName)!; const value = effectiveLanguageFluencies[languageName] ?? 'Untrained'; const isClassGranted = grantedLanguages.includes(languageName); const isFree = languageName === 'Common' || isClassGranted; const pointsAvailable = Math.max(0, (derived?.languagePointBudget ?? 0) - languageSpent + (isFree ? 0 : fluencyRank(value))); return <InfoDetails key={languageName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{languageName}{isFree && <span className="ml-2 text-xs text-emerald-300">Free • Fluent{isClassGranted ? ' • Cypher Speech' : ''}</span>}</span><span onClick={(event) => event.stopPropagation()}><LanguageFluencyPicker value={isFree ? 'Fluent' : value} pointsAvailable={pointsAvailable} isFree={isFree} onChange={(next) => setLanguageFluencies((current) => ({ ...current, [languageName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-300">Typical speakers: {item.typicalSpeakers}</p><p className="mb-2 text-xs text-slate-500">Limited speakers make a Language Check when precise understanding or communication matters. Fluent speakers read, write, and speak without that check.</p>{item.description}</InfoDetails>; })}</div></div>)}
            </div>
          </section>}

          {currentStep === 'ancestry' && <section>
            {className === 'Rogue' && selectedTraits.some(({ name }) => name === 'Skill Expertise') && <div role="alert" className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"><strong>Skill Expertise conflict:</strong> Roguish Finesse already increases every Skill Mastery Limit. The Beta says a Skill cannot benefit from more than one such increase, so replace the Skill Expertise ancestry trait before finishing.</div>}
            <div className="mb-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-300">Primary Ancestry<select value={ancestry} onChange={(event) => { setAncestry(event.target.value); setTraitIDs([]); setTraitChoices({}); }} className={`${fieldClass} mt-2`}>{reference.ancestries.map((option) => <option key={option}>{option}</option>)}</select></label><label className="text-sm font-bold text-slate-300">Secondary Ancestry (optional)<select value={secondaryAncestry} onChange={(event) => { setSecondaryAncestry(event.target.value); setTraitIDs([]); setTraitChoices({}); }} className={`${fieldClass} mt-2`}><option value="">None</option>{reference.ancestries.filter((option) => option !== ancestry && option !== 'Custom').map((option) => <option key={option}>{option}</option>)}</select></label></div>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Size" value={derived?.size ?? 'Medium'} tone="green" /><Metric label="Ancestry Points" value={`${ancestrySpent}/${derived?.ancestryPointBudget ?? 5}`} /><Metric label="Negative Points" value={`${negativePoints}/2`} /><Metric label="Minor Traits" value={`${minorTraits}/1`} /><Metric label="Traits Chosen" value={selectedTraits.length} /></div>
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h3 className="font-black text-emerald-300">Base Ancestry Statistics</h3><div className="mt-3 grid gap-2 md:grid-cols-3"><InfoDetails summary={`${derived?.size ?? 'Medium'} Size`}>{derived?.size === 'Small' ? 'Your Size is considered Small.' : reference.generalAncestryTraits.find((trait) => trait.name.includes('Medium'))?.description ?? 'Your Size is considered Medium.'}</InfoDetails>{reference.generalAncestryTraits.filter((trait) => !trait.name.includes('Medium')).map((trait) => <InfoDetails key={trait.id} summary={trait.name}>{trait.description}</InfoDetails>)}</div></div>
            <div className="space-y-5">{Array.from(new Set(visibleTraits.map(({ category }) => category))).sort().map((category) => <div key={category}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{category} Traits</h3><div className="grid gap-3 lg:grid-cols-2">{visibleTraits.filter((trait) => trait.category === category).map((trait) => { const selected = selectedTraits.some(({ id }) => id === trait.id); const automatic = automaticTraitIDs.has(trait.id); const options = choiceOptions(trait, reference.skills, reference.trades, spells); const selectedChoice = traitChoices[trait.id]?.[0] ?? ''; const chosenSpell = ['Celestial Magic', 'Fiendish Magic', 'Psionic Magic'].includes(trait.name) ? spells.find(({ name: spellName }) => spellName === selectedChoice) : undefined; return <div key={trait.id} className={`rounded-xl border p-4 ${selected ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/10 bg-slate-950/45'}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-slate-100">{trait.name} <span className="text-sm text-violet-300">({trait.cost > 0 ? '+' : ''}{trait.cost} AP)</span></h4><p className="mt-1 text-xs text-slate-500">{trait.ancestry}{trait.prerequisite ? ` • Requires ${trait.prerequisite}` : ''}{automatic ? ' • Applied by ancestry' : ''}</p></div><button type="button" disabled={automatic} onClick={() => toggleTrait(trait)} className={`rounded-lg px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-70 ${selected ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{automatic ? 'Applied' : selected ? 'Selected' : 'Select'}</button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{trait.description}</p>{selected && options.length > 0 && <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Required choice<select value={selectedChoice} onChange={(event) => setTraitChoices((current) => ({ ...current, [trait.id]: [event.target.value] }))} className={`${fieldClass} mt-2 normal-case tracking-normal`}><option value="">Choose…</option>{options.map((option) => <option key={option} disabled={trait.name === 'Attribute Increase' && attributes[option as DC20Attribute] >= attributeCap(level)}>{option}</option>)}</select></label>}{chosenSpell && <div className="mt-3"><InfoDetails summary={`View ${chosenSpell.name} spell`}><p className="mb-2 text-xs font-bold text-violet-300">{chosenSpell.source} • {chosenSpell.school} • {chosenSpell.cost} • {chosenSpell.range} • {chosenSpell.duration}</p>{chosenSpell.description}{chosenSpell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{chosenSpell.enhancements}</p></>}</InfoDetails></div>}</div>; })}</div></div>)}</div>
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
                <p className="mb-3 text-sm text-slate-500">Only talents whose level prerequisites are met are shown. Talents can be taken multiple times unless their rules say otherwise.</p>
                <div className="grid gap-2 lg:grid-cols-2">{classReference.talents.filter((talent) => talent.minimumLevel <= level).map((talent) => {
                  const count = talents.filter((name) => name === talent.name).length;
                  return <div key={talent.name} className={`rounded-xl border p-3 ${count > 0 ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 bg-slate-950/45'}`}>
                    <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-200">{talent.name}{count > 0 && <span className="ml-2 text-xs text-violet-300">×{count}</span>}</span><div className="flex items-center gap-1"><button type="button" disabled={count === 0} onClick={() => adjustTalent(talent.name, -1, talent.isRepeatable)} className="h-8 w-8 rounded bg-slate-800 text-sm font-black text-slate-200 disabled:opacity-30">−</button><button type="button" disabled={talents.length >= availableTalentSlots || (!talent.isRepeatable && count > 0)} onClick={() => adjustTalent(talent.name, 1, talent.isRepeatable)} className="h-8 w-8 rounded bg-violet-600 text-sm font-black text-white disabled:opacity-30">+</button></div></div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">{talent.description}</p>
                  </div>;
                })}</div>
              </div>}
              {featureChoiceGroups.length > 0 && <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Class Feature Options</h3><div className="space-y-4">{featureChoiceGroups.map((group) => { const selectedCount = (featureChoices[group.id] ?? []).length; const optional = (group.minimumSelections ?? group.limit) === 0; return <div key={`${group.id}-${group.requiredSubclass ?? ''}-${group.requiredTalent ?? ''}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-black text-slate-200">{group.title} <span className="text-xs text-slate-500">({group.feature})</span></h4><p className="mt-1 text-sm text-slate-500">{group.prompt}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${selectedCount >= (group.minimumSelections ?? group.limit) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-violet-500/10 text-violet-200'}`}>{selectedCount}/{group.limit}{optional ? ' optional' : ''}</span></div><div className="mt-3 grid gap-2 md:grid-cols-2">{group.options.map((option) => { const selected = (featureChoices[group.id] ?? []).includes(option.name); const disabled = !selected && (selectedCount >= group.limit || classChoiceOptionDisabled(group, option.name)); return <InfoDetails key={option.name} summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => setFeatureChoice(group, option.name)} />{option.name}</label>}>{option.description}</InfoDetails>; })}</div></div>; })}</div></div>}
              {(hasSpells || hasManeuvers) && <div className={panelClass}>{hasSpells && needsBorrowedSpellList && <label className="mb-4 block text-sm font-bold text-slate-300">Spell List gained from Spellcaster Path<select value={spellListClass} onChange={(event) => { const nextClass = event.target.value; const nextReference = reference.classes.find((entry) => entry.name === nextClass); setSpellListClass(nextClass); setSpellSource(nextReference?.fixedSpellSource ?? ''); setSelectedSpellSchools([]); setSelectedSpells([]); }} className={`${fieldClass} mt-2`}><option value="">Choose a Class Spell List</option>{spellListClasses.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}</select><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">The Beta grants a Class Spell List—not merely a Spell Source—the first time a Class without a Spell List chooses Spellcaster Path.</span></label>}{hasSpells && canChooseSpellSource && <label className="mb-4 block text-sm font-bold text-slate-300">Spell Source<select value={spellSource} onChange={(event) => { setSpellSource(event.target.value); setSelectedSpells([]); }} className={`${fieldClass} mt-2`}><option value="">Choose a source</option>{Array.from(new Set(spells.flatMap((spell) => spell.source.split(', ')))).sort().map((source) => <option key={source}>{source}</option>)}</select></label>}{hasSpells && spellAccessReference?.fixedSpellSource && <div className="mb-4 rounded-lg bg-slate-950/50 px-3 py-2 text-sm font-bold text-violet-200">Spell Source: {spellAccessReference.fixedSpellSource}</div>}{hasSpells && spellSchoolChoiceCount > 0 && <div className="mb-4"><h4 className="text-sm font-bold text-slate-300">Spell Schools ({selectedSpellSchools.length}/{spellSchoolChoiceCount})</h4><div className="mt-2 flex flex-wrap gap-2">{Array.from(new Set(spells.map((spell) => spell.school))).sort().map((school) => { const selected = selectedSpellSchools.includes(school); const disabled = !selected && selectedSpellSchools.length >= spellSchoolChoiceCount; return <button type="button" key={school} disabled={disabled} onClick={() => { setSelectedSpellSchools((current) => selected ? current.filter((entry) => entry !== school) : [...current, school]); setSelectedSpells([]); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${selected ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-slate-700 text-slate-400 disabled:opacity-30'}`}>{school}</button>; })}</div></div>}{spellAccessClassName === 'Summoner' && hasSpells && <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100"><span className="font-black">Summoner Spell Access:</span> All Astromancy, Conjuration, and Transmutation Spells, plus any Spell with the Summoning tag.</div>}
                <div className="mt-4 space-y-3">{hasSpells && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-violet-200">Spells ({selectedSpells.length}/{derived?.spellLimit ?? 0}{grantedSpells.length > 0 ? ` + ${grantedSpells.length} granted` : ''})</summary><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-2 lg:grid-cols-2">{allowedSpells.map((spell) => { const granted = grantedSpells.includes(spell.name); return <InfoDetails key={spell.name} summary={<label className={`flex flex-1 items-center gap-2 ${granted ? 'cursor-default' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={granted || (derived?.spellLimit ?? 0) === 0} checked={granted || selectedSpells.includes(spell.name)} onChange={() => toggleLimited(selectedSpells, spell.name, derived?.spellLimit ?? 0, setSelectedSpells)} />{spell.name}{granted && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">Feature-granted</span>}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-violet-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails>; })}</div></details>}
                  {classTotals && classTotals.cantrips > 0 && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-sky-200">Psion Cantrips ({selectedCantrips.length}/{derived?.cantripLimit ?? 0})</summary><div className="mt-4 grid gap-2 lg:grid-cols-2">{allowedSpells.filter(({ cost }) => cost.includes('0 MP') || !cost.includes('MP')).map((spell) => <label key={spell.name} className="flex items-center gap-2 rounded-lg bg-slate-900 p-3 text-sm text-slate-300"><input type="checkbox" checked={selectedCantrips.includes(spell.name)} onChange={() => toggleLimited(selectedCantrips, spell.name, derived?.cantripLimit ?? 0, setSelectedCantrips)} />{spell.name}</label>)}</div></details>}
                  {hasManeuvers && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-fuchsia-200">Maneuvers ({selectedManeuvers.length}/{derived?.maneuverLimit ?? 0}{grantedManeuvers.length > 0 ? ` + ${grantedManeuvers.length} granted` : ''})</summary><div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-2 lg:grid-cols-2">{maneuvers.map((maneuver) => { const granted = grantedManeuvers.includes(maneuver.name); return <InfoDetails key={maneuver.name} summary={<label className={`flex flex-1 items-center gap-2 ${granted ? 'cursor-default' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={granted || (derived?.maneuverLimit ?? 0) === 0} checked={granted || selectedManeuvers.includes(maneuver.name)} onChange={() => toggleLimited(selectedManeuvers, maneuver.name, derived?.maneuverLimit ?? 0, setSelectedManeuvers)} />{maneuver.name}{granted && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">Granted</span>}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-fuchsia-300">{maneuver.category} • {maneuver.range}{maneuver.requirements ? ` • ${maneuver.requirements}` : ''}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>; })}</div></details>}</div>
              </div>}
            </>}</div></div>
          </section>}

          {currentStep === 'equipment' && classReference && <section><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{classReference.name} Training</p><h2 className="text-2xl font-black text-white">Starting Equipment</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{classReference.startingEquipment.description}</p></div>{equipmentLoading ? <p className="text-slate-400">Loading equipment…</p> : <div className="space-y-6">{([['arsenal', `Arsenal — choose ${classReference.startingEquipment.arsenalCount}`], ['armor', 'Armor — choose 1'], ['tools', `Trade Tools — choose ${classReference.startingEquipment.tradeToolCount}`]] as const).map(([group, title]) => { const limit = group === 'arsenal' ? classReference.startingEquipment.arsenalCount : group === 'armor' ? 1 : classReference.startingEquipment.tradeToolCount; const groupIDs = new Set(startingEquipment[group].map(({ id }) => id)); const selectedCount = inventoryItems.filter((entry) => entry.source === 'startingEquipment' && groupIDs.has(entry.equipmentID)).length; const groupFull = selectedCount >= limit; return <div key={group}><h3 className="mb-3 font-black text-violet-200">{title} <span className={`ml-2 text-xs ${groupFull ? 'text-emerald-300' : 'text-slate-500'}`}>({selectedCount}/{limit})</span></h3><div className="grid gap-2 lg:grid-cols-2">{startingEquipment[group].map((item) => { const selected = inventoryItems.some((entry) => entry.equipmentID === item.id && entry.source === 'startingEquipment'); const disabled = groupFull && !selected; return <div key={item.id} className={disabled ? 'opacity-40' : ''}><InfoDetails summary={<label className={`flex flex-1 items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={disabled} checked={selected} onChange={() => toggleStartingEquipment(item.id, group)} />{item.name}<span className="ml-auto text-xs text-slate-500">{item.slot}</span></label>}><p className="mb-2 font-semibold text-violet-200">{item.summary}</p>{item.mechanics}</InfoDetails></div>; })}</div></div>; })}</div>}<label className="mt-6 block text-sm font-bold text-slate-300">Character Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className={`${fieldClass} mt-2`} placeholder="Goals, bonds, appearance, reminders…" /></label></section>}

          {currentStep === 'summary' && derived && classReference && <section><h2 className="text-2xl font-black text-white">Final Character Summary</h2><p className="mt-2 text-slate-400">All health, resources, defenses, combat values, and saves are calculated from the preceding choices.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Metric label="Maximum HP" value={derived.maxHP} tone="red" /><Metric label="Action Points" value={4} /><Metric label="Stamina" value={derived.maxStamina} tone="blue" /><Metric label="Mana" value={derived.maxMana} tone="blue" /><Metric label="Physical Defense" value={derived.physicalDefense} /><Metric label="Arcane Defense" value={derived.arcaneDefense} /><Metric label="Combat Mastery" value={`+${derived.combatMastery}`} /><Metric label="Prime Modifier" value={`+${derived.primeModifier}`} /><Metric label="Martial Check" value={`+${derived.martialCheck}`} /><Metric label="Spell Check" value={`+${derived.spellCheck}`} /><Metric label="Class Save DC" value={derived.saveDC} /><Metric label="Speed" value={derived.speed} /></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><div className={panelClass}><h3 className="font-black text-violet-200">Identity</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-bold text-slate-200">{name || 'Unnamed'}</dd></div><div><dt className="text-slate-500">Level & Class</dt><dd className="font-bold text-slate-200">Level {level} {className}</dd></div><div><dt className="text-slate-500">Subclass</dt><dd className="font-bold text-slate-200">{subclass || 'Not yet available'}</dd></div><div><dt className="text-slate-500">Ancestry</dt><dd className="font-bold text-slate-200">{ancestry}{secondaryAncestry ? ` / ${secondaryAncestry}` : ''}</dd></div><div><dt className="text-slate-500">Size</dt><dd className="font-bold text-slate-200">{derived.size}</dd></div><div><dt className="text-slate-500">Background</dt><dd className="font-bold text-slate-200">{backgroundName || 'Unnamed background'}</dd></div></dl></div><div className={panelClass}><h3 className="font-black text-violet-200">Attributes & Saves</h3><div className="mt-3 grid grid-cols-2 gap-3">{ATTRIBUTE_NAMES.map((attribute) => <div key={attribute} className="rounded-lg bg-slate-950/50 p-3"><div className="text-xs text-slate-500">{attribute}</div><div className="text-xl font-black text-slate-100">{derived.effectiveAttributes[attribute] >= 0 ? '+' : ''}{derived.effectiveAttributes[attribute]}</div><div className="text-xs text-violet-300">Save +{derived.effectiveAttributes[attribute] + derived.combatMastery}</div></div>)}</div></div><div className={panelClass}><h3 className="font-black text-violet-200">Training</h3><p className="mt-3 text-sm text-slate-400">Skills {skillSpent}/{derived.skillPointBudget} • Trades {tradeSpent}/{derived.tradePointBudget} • Language Points {languageSpent}/{derived.languagePointBudget}</p><p className="mt-2 text-sm text-slate-400">Mastery cap: {masteryTitle(masteryMaximum)}{Object.keys(expertise.skills).length || Object.keys(expertise.trades).length ? ' (expertise bonuses shown in Skills)' : ''}</p></div><div className={panelClass}><h3 className="font-black text-violet-200">Features & Powers</h3><p className="mt-3 text-sm text-slate-400">{classReference.features.filter(({ level: featureLevel }) => featureLevel <= level).reduce((sum, entry) => sum + entry.features.length, 0)} class features • {selectedTraits.length} ancestry traits • {talents.length} talents</p><p className="mt-2 text-sm text-slate-400">{selectedSpells.length} spells • {selectedCantrips.length} cantrips • {selectedManeuvers.length} maneuvers</p></div></div>{validation.length > 0 && <div role="alert" className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><h3 className="font-black text-amber-200">Finish these choices</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/80">{validation.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}</section>}
        </main>

        {(rulesError || powersError) && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{rulesError || powersError}</div>}
        <footer className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={currentStepIndex === 0} onClick={() => setCurrentStep(STEPS[Math.max(0, currentStepIndex - 1)].id)} className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-3 font-bold text-slate-300 disabled:opacity-30">← Previous</button><span className="hidden text-sm text-slate-500 sm:block">Step {currentStepIndex + 1} of {STEPS.length}{powersLoading ? ' • Loading powers…' : ''}</span>{currentStep !== 'summary' ? <button type="button" disabled={(currentStep === 'attributes' && !name.trim()) || (currentStep === 'class' && !classConfirmed)} onClick={() => setCurrentStep(STEPS[Math.min(STEPS.length - 1, currentStepIndex + 1)].id)} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-black text-white disabled:opacity-40">Next →</button> : <button type="button" disabled={validation.length > 0} onClick={finish} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{editingCharacter ? 'Save Character' : 'Finish Character'}</button>}</footer>
      </div>
    </div>
  );
};

export default CharacterBuilderView;
