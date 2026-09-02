import React, { useMemo, useState } from 'react';
import { useCharacterReference } from '../../hooks/useCharacterReference';
import { useEquipmentCatalog } from '../../hooks/useEquipmentCatalog';
import { usePowerCatalog } from '../../hooks/usePowerCatalog';
import { useCampaignStore } from '../../store/campaignStore';
import type {
  AncestryTrait,
  AttributeSelectionMethod,
  Character,
  CharacterBuildData,
  CharacterInventoryItem,
  CharacterPathChoice,
  ClassChoiceGroupReference,
  DC20Attribute,
  MasteryLevel,
  MasteryReference,
} from '../../types/models';
import {
  ATTRIBUTE_NAMES,
  MASTERY_TITLES,
  ancestryExpertise,
  applyDerivedCharacter,
  attributeCap,
  classTableTotals,
  defaultBuild,
  deriveCharacter,
  masteryCap,
  masteryRank,
  masteryTitle,
  selectedAncestryTraits,
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
  onChange,
}: {
  value: MasteryLevel;
  maximum: number;
  bonus?: number;
  onChange: (value: MasteryLevel) => void;
}) {
  const effective = Math.min(5, masteryRank(value) + bonus);
  const selectableMaximum = Math.max(0, maximum - bonus);
  return (
    <div className="flex items-center gap-2">
      <select value={value} onChange={(event) => onChange(event.target.value as MasteryLevel)} className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-200">
        {MASTERY_TITLES.slice(0, selectableMaximum + 1).map((title) => <option key={title}>{title}</option>)}
      </select>
      {bonus > 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-300">Effective: {masteryTitle(effective)}</span>}
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
    attributes: Object.fromEntries(ATTRIBUTE_NAMES.map((name) => [name, { name, score: DEFAULT_ATTRIBUTES[name], modifier: DEFAULT_ATTRIBUTES[name] }])) as Character['attributes'],
    primeModifier: 3,
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
  const originalBuild = useMemo(() => ({ ...defaultBuild(), ...(original.build ?? {}) }), [original]);

  const [currentStep, setCurrentStep] = useState<BuilderStep>('attributes');
  const [name, setName] = useState(original.name);
  const [level, setLevelState] = useState(Math.min(10, original.level));
  const [attributeMethod, setAttributeMethod] = useState<AttributeSelectionMethod>(originalBuild.attributeMethod);
  const [attributes, setAttributes] = useState<Record<DC20Attribute, number>>(Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, original.attributes[attribute]?.score ?? DEFAULT_ATTRIBUTES[attribute]])) as Record<DC20Attribute, number>);
  const [rolledResults, setRolledResults] = useState(originalBuild.rolledAttributeResults);
  const [backgroundName, setBackgroundName] = useState(originalBuild.backgroundName || original.background);
  const [backgroundStory, setBackgroundStory] = useState(originalBuild.backgroundStory);
  const [skillMasteries, setSkillMasteries] = useState<Record<string, MasteryLevel>>(original.skillMasteries ?? {});
  const [tradeMasteries, setTradeMasteries] = useState<Record<string, MasteryLevel>>(original.tradeMasteries ?? {});
  const [languageMasteries, setLanguageMasteries] = useState<Record<string, MasteryLevel>>(originalBuild.languageMasteries);
  const [skillConversion, setSkillConversion] = useState(originalBuild.skillPointsConvertedToTrades);
  const [tradeConversion, setTradeConversion] = useState(originalBuild.tradePointsConvertedToLanguages);
  const [ancestry, setAncestry] = useState(original.ancestry || 'Human');
  const [secondaryAncestry, setSecondaryAncestry] = useState(originalBuild.ancestrySecondary);
  const [traitIDs, setTraitIDs] = useState<string[]>(originalBuild.selectedAncestryTraitIDs);
  const [traitChoices, setTraitChoices] = useState<Record<string, string[]>>(originalBuild.ancestryTraitChoices);
  const [className, setClassName] = useState(original.class || 'Champion');
  const [subclass, setSubclass] = useState(original.subclass ?? '');
  const [talents, setTalents] = useState<string[]>(originalBuild.selectedTalents);
  const [storedPathChoices, setPathChoices] = useState<Record<string, CharacterPathChoice>>(originalBuild.pathProgressionChoices);
  const [featureChoices, setFeatureChoices] = useState<Record<string, string[]>>(originalBuild.classFeatureSelections);
  const [spellSource, setSpellSource] = useState(originalBuild.selectedSpellSource);
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
  const build: CharacterBuildData = {
    ...originalBuild,
    attributeMethod,
    rolledAttributeResults: rolledResults,
    backgroundName,
    backgroundStory,
    skillPointsConvertedToTrades: skillConversion,
    tradePointsConvertedToLanguages: tradeConversion,
    languageMasteries,
    ancestrySecondary: secondaryAncestry,
    selectedAncestryTraitIDs: traitIDs,
    ancestryTraitChoices: traitChoices,
    selectedTalents: talents,
    pathProgressionChoices: effectivePathChoices,
    classFeatureSelections: featureChoices,
    selectedSpellSource: spellSource,
    selectedSpells,
    selectedCantrips,
    selectedManeuvers,
    isFinalized: false,
  };
  const draft: Character = {
    ...original,
    name,
    level,
    ancestry,
    class: className,
    subclass: subclass || undefined,
    background: backgroundName,
    attributes: Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, { name: attribute, score: attributes[attribute], modifier: attributes[attribute] }])) as Character['attributes'],
    skillMasteries,
    tradeMasteries,
    languages: Object.entries(languageMasteries).filter(([, mastery]) => masteryRank(mastery) > 0).map(([language]) => language),
    inventoryItems,
    notes,
    build,
  };
  const derived = classReference && reference ? deriveCharacter(draft, classReference, reference.ancestryTraits, equipment) : null;
  const classTotals = classReference ? classTableTotals(classReference, level) : null;
  const expertise = reference ? ancestryExpertise(draft, reference.ancestryTraits) : { skills: {}, trades: {} };
  const selectedTraits = reference ? selectedAncestryTraits(draft, reference.ancestryTraits) : [];
  const ancestrySpent = selectedTraits.reduce((sum, trait) => sum + trait.cost, 0);
  const negativePoints = -selectedTraits.filter(({ cost }) => cost < 0).reduce((sum, trait) => sum + trait.cost, 0);
  const minorTraits = selectedTraits.filter(({ countsAsZeroPointTrait }) => countsAsZeroPointTrait).length;
  const skillSpent = masterySpent(skillMasteries);
  const tradeSpent = masterySpent(tradeMasteries);
  const languageSpent = masterySpent(languageMasteries, ['Common']);
  const advancementAttributePoints = classTotals?.attribute ?? 0;
  const rolledBase = rolledResults.length === 4 ? rolledResults.reduce((sum, value) => sum + value, 0) : 2;
  const attributeBudget = (attributeMethod === 'Rolled' ? rolledBase + 2 : 4) + advancementAttributePoints + talents.filter((talent) => talent === 'Attribute Increase').length * 2;
  const attributeSpent = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  const currentStepIndex = STEPS.findIndex(({ id }) => id === currentStep);
  const availableTalentSlots = talentSlots(className, level, subclass);

  const changeLevel = (nextLevel: number) => {
    const next = Math.min(10, Math.max(1, Math.trunc(nextLevel)));
    setLevelState(next);
    setAttributes((current) => Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, Math.min(attributeCap(next), current[attribute])])) as Record<DC20Attribute, number>);
    if (next < 3) setSubclass('');
    if (classReference) {
      setTalents((current) => current.filter((talent) => classReference.talents.some((option) => option.name === talent && option.minimumLevel <= next)).slice(0, talentSlots(classReference.name, next, next >= 3 ? subclass : '')));
    }
    const validPathLevels = new Set((className === 'Psion' ? [2, 4, 7, 10] : [2, 4, 6, 8]).filter((entry) => entry <= next).map(String));
    setPathChoices((current) => Object.fromEntries(Object.entries(current).filter(([pathLevel]) => validPathLevels.has(pathLevel))));
  };
  const setLevel = changeLevel;

  const setAttribute = (attribute: DC20Attribute, next: number) => {
    const clamped = Math.max(-2, Math.min(attributeCap(level), Math.trunc(next)));
    setAttributes((current) => {
      const nextTotal = Object.entries(current).reduce((sum, [key, value]) => sum + (key === attribute ? clamped : value), 0);
      return nextTotal <= attributeBudget ? { ...current, [attribute]: clamped } : current;
    });
  };

  const changeAttributeMethod = (method: AttributeSelectionMethod) => {
    setAttributeMethod(method);
    setRolledResults([]);
    setAttributes(method === 'Point Buy'
      ? { Might: -2, Agility: -2, Charisma: -2, Intelligence: -2 }
      : DEFAULT_ATTRIBUTES);
  };

  const rollAttributes = () => {
    const results = ATTRIBUTE_NAMES.map(() => Math.floor(Math.random() * 6) - 2);
    setRolledResults(results);
    setAttributes(Object.fromEntries(ATTRIBUTE_NAMES.map((attribute, index) => [attribute, results[index]])) as Record<DC20Attribute, number>);
  };

  const toggleTrait = (trait: AncestryTrait) => {
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
    const nextReference = reference?.classes.find(({ name: candidate }) => candidate === next);
    setSpellSource(nextReference?.fixedSpellSource ?? '');
    setPathChoices({});
  };

  const toggleLimited = (values: string[], value: string, limit: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(values.includes(value) ? values.filter((entry) => entry !== value) : values.length < limit ? [...values, value] : values);
  };

  const setFeatureChoice = (group: ClassChoiceGroupReference, option: string) => {
    setFeatureChoices((current) => {
      const selected = current[group.id] ?? [];
      const updated = selected.includes(option)
        ? selected.filter((entry) => entry !== option)
        : group.limit === 1 ? [option] : selected.length < group.limit ? [...selected, option] : selected;
      return { ...current, [group.id]: updated };
    });
  };

  const allowedSpells = (() => {
    if (!classReference) return [];
    if (className === 'Psion') return spells.filter((spell) => {
      const tags = spell.tags.split(', ').map((tag) => tag.trim());
      return tags.some((tag) => ['Psychic', 'Gravity', 'Illusion'].includes(tag)) || ['Divination', 'Enchantment', 'Nullification'].includes(spell.school);
    });
    if (className === 'Bard') return spells;
    const source = classReference.fixedSpellSource ?? spellSource;
    return source ? spells.filter((spell) => spell.source.split(', ').includes(source)) : spells;
  })();

  const startingEquipment = (() => {
    if (!classReference) return { arsenal: [], armor: [], tools: [] };
    const training = classReference.startingEquipment;
    const arsenal = equipment.filter((item) => (
      (training.arsenal.includes('Weapon') && item.category === 'Weapons')
      || (training.arsenal.includes('Light Weapon') && item.category === 'Weapons' && item.slot === 'One Hand')
      || (training.arsenal.includes('Spell Focus') && item.category === 'Spell Focuses')
      || ((training.arsenal.includes('Shield') || training.arsenal.includes(item.name)) && item.category === 'Shields')
      || training.arsenal.includes(item.name)
    )).sort((a, b) => a.name.localeCompare(b.name));
    const armor = equipment.filter((item) => item.category === 'Armor' && training.armor.includes(item.name)).sort((a, b) => a.name.localeCompare(b.name));
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
    if (attributeSpent !== attributeBudget) issues.push(`Spend all Attribute Points (${attributeBudget - attributeSpent} remaining).`);
    if (derived && skillSpent > derived.skillPointBudget) issues.push('Skill mastery exceeds the available Skill Points.');
    if (derived && tradeSpent > derived.tradePointBudget) issues.push('Trade mastery exceeds the available Trade Points.');
    if (derived && languageSpent > derived.languagePointBudget) issues.push('Language mastery exceeds the available Language Points.');
    if (derived && ancestrySpent > derived.ancestryPointBudget) issues.push('Ancestry traits exceed the available Ancestry Points.');
    if (negativePoints > 2) issues.push('Negative ancestry traits can grant at most 2 points.');
    if (minorTraits > 1) issues.push('Choose at most one 0-point minor ancestry trait.');
    if (talents.length > availableTalentSlots) issues.push('Too many Talents are selected.');
    if (level >= 3 && classReference?.subclasses.length && !subclass) issues.push('Choose a subclass.');
    if (derived && selectedSpells.length > derived.spellLimit) issues.push('Too many Spells are selected.');
    if (derived && selectedManeuvers.length > derived.maneuverLimit) issues.push('Too many Maneuvers are selected.');
    return issues;
  })();

  const finish = () => {
    if (!reference || !classReference || !derived || validation.length > 0) return;
    const finalizedBuild = { ...build, isFinalized: true };
    const isNew = !editingCharacter;
    let finalized = applyDerivedCharacter({
      ...draft,
      build: finalizedBuild,
      spells: selectedSpells.flatMap((spellName) => {
        const spell = spells.find(({ name: candidate }) => candidate === spellName);
        return spell ? [{ id: `spell|${spell.name}`, ...spell }] : [];
      }),
      maneuvers: selectedManeuvers.flatMap((maneuverName) => {
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

  const masteryMaximum = masteryCap(level);
  const visibleTraits = reference.ancestryTraits.filter((trait) => [ancestry, secondaryAncestry].includes(trait.ancestry));
  const featureChoiceGroups = classReference?.choiceGroups.filter((group) => group.level <= level && (!group.requiredSubclass || group.requiredSubclass === subclass)) ?? [];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#4c1d95_0%,#111827_42%,#020617_100%)] p-4 lg:p-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">DC20 Beta 0.10.5</p><h1 className="mt-1 text-3xl font-black text-white lg:text-4xl">{editingCharacter ? `Edit ${editingCharacter.name}` : 'Build a Character'}</h1></div>
          <div className="flex gap-2"><Metric label="Level" value={level} /><Metric label="Mastery Cap" value={masteryTitle(masteryMaximum)} /><Metric label="Attribute Cap" value={`+${attributeCap(level)}`} /></div>
        </header>

        <nav className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-2 lg:grid-cols-6" aria-label="Character builder steps">
          {STEPS.map((step, index) => <button type="button" key={step.id} onClick={() => setCurrentStep(step.id)} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${currentStep === step.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-950' : index < currentStepIndex ? 'bg-violet-500/10 text-violet-200 hover:bg-violet-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><span className="mr-2 text-xs opacity-60">{index + 1}</span>{step.title}</button>)}
        </nav>

        <main className={`${panelClass} min-h-[620px]`}>
          {currentStep === 'attributes' && <section>
            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_160px]"><label className="text-sm font-bold text-slate-300">Player Character Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={`${fieldClass} mt-2 text-lg`} placeholder="Character name" /></label><label className="text-sm font-bold text-slate-300">Character Level<input type="number" min={1} max={10} value={level} onChange={(event) => setLevel(Math.min(10, Math.max(1, Number(event.target.value))))} className={`${fieldClass} mt-2`} /></label></div>
            <div className="mb-6 grid gap-3 md:grid-cols-3">{(['Standard Array', 'Point Buy', 'Rolled'] as AttributeSelectionMethod[]).map((method) => <button type="button" key={method} onClick={() => changeAttributeMethod(method)} className={`rounded-xl border p-4 text-left ${attributeMethod === method ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-slate-700 bg-slate-950/50 text-slate-300'}`}><div className="font-black">{method}</div><div className="mt-1 text-xs text-slate-500">{method === 'Standard Array' ? '3, 1, 0, −2, then 2 additional points.' : method === 'Point Buy' ? 'Start at −2 and spend 12 points.' : 'Roll 1d6−3 four times, then add 2 points.'}</div></button>)}</div>
            {attributeMethod === 'Rolled' && <button type="button" onClick={rollAttributes} className="mb-6 rounded-xl bg-fuchsia-600 px-5 py-3 font-black text-white hover:bg-fuchsia-500">🎲 Roll The Dice! <span className="ml-2 font-normal">{rolledResults.length === 4 ? rolledResults.join(', ') : '1d6−3 × 4'}</span></button>}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{ATTRIBUTE_NAMES.map((attribute) => <div key={attribute} className="rounded-2xl border border-white/10 bg-slate-950/55 p-5"><div className="flex items-center justify-between"><h3 className="font-black text-violet-200">{attribute}</h3><span className="text-3xl font-black text-white">{attributes[attribute] >= 0 ? '+' : ''}{attributes[attribute]}</span></div><div className="mt-5 flex items-center justify-center gap-3"><button type="button" onClick={() => setAttribute(attribute, attributes[attribute] - 1)} className="h-10 w-10 rounded-lg bg-slate-800 text-xl text-slate-200">−</button><button type="button" onClick={() => setAttribute(attribute, attributes[attribute] + 1)} className="h-10 w-10 rounded-lg bg-violet-600 text-xl text-white">+</button></div></div>)}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3"><Metric label="Allocation Total" value={`${attributeSpent} / ${attributeBudget}`} tone={attributeSpent === attributeBudget ? 'green' : 'violet'} /><Metric label="Prime Modifier" value={`+${Math.max(...Object.values(attributes))}`} /><Metric label="Combat Mastery" value={`+${derived?.combatMastery ?? 1}`} /></div>
            <div className="mt-6 overflow-auto"><table className="w-full min-w-[650px] text-center text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-2">Level</th>{[1,5,10,15,20].map((entry) => <th key={entry} className="p-2">{entry}</th>)}</tr></thead><tbody><tr className="border-t border-white/10"><th className="p-3 text-left text-slate-300">Attribute Cap</th>{[1,5,10,15,20].map((entry) => <td key={entry} className={`p-3 font-black ${level >= entry && (entry === 20 || level < [5,10,15,20].find((candidate) => candidate > entry)!) ? 'text-violet-300' : 'text-slate-400'}`}>+{attributeCap(entry)}</td>)}</tr></tbody></table></div>
          </section>}

          {currentStep === 'skills' && <section>
            <div className="mb-6 grid gap-4 lg:grid-cols-2"><label className="text-sm font-bold text-slate-300">Background Name<input value={backgroundName} onChange={(event) => setBackgroundName(event.target.value)} className={`${fieldClass} mt-2`} placeholder="Scholar, sailor, artisan…" /></label><label className="text-sm font-bold text-slate-300">Background Story<textarea value={backgroundStory} onChange={(event) => setBackgroundStory(event.target.value)} rows={3} className={`${fieldClass} mt-2`} placeholder="Where did this character come from?" /></label></div>
            <div className="mb-6 grid gap-3 sm:grid-cols-3"><label className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-400">Skill → Trade conversions<input type="number" min={0} max={derived?.skillPointBudget ?? 0} value={skillConversion} onChange={(event) => setSkillConversion(Math.max(0, Number(event.target.value)))} className={`${fieldClass} mt-2`} /><span className="mt-2 block text-xs">Each Skill Point becomes 2 Trade Points.</span></label><label className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-400">Trade → Language conversions<input type="number" min={0} value={tradeConversion} onChange={(event) => setTradeConversion(Math.max(0, Number(event.target.value)))} className={`${fieldClass} mt-2`} /><span className="mt-2 block text-xs">Each Trade Point becomes 2 Language Points.</span></label><div className="grid grid-cols-3 gap-2"><Metric label="Skills" value={`${skillSpent}/${derived?.skillPointBudget ?? 0}`} /><Metric label="Trades" value={`${tradeSpent}/${derived?.tradePointBudget ?? 0}`} /><Metric label="Languages" value={`${languageSpent}/${derived?.languagePointBudget ?? 0}`} /></div></div>
            <div className="space-y-5">{reference.skillGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{group.name} Skills</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((skillName) => { const item = reference.skills.find(({ name: candidate }) => candidate === skillName)!; const value = skillMasteries[skillName] ?? 'Untrained'; return <InfoDetails key={skillName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{skillName}</span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={Math.min(5, masteryMaximum + (expertise.skills[skillName] ?? 0))} bonus={expertise.skills[skillName] ?? 0} onChange={(next) => setSkillMasteries((current) => ({ ...current, [skillName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-violet-300">{item.attribute}</p>{item.description}</InfoDetails>; })}</div></div>)}
              {reference.tradeGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-fuchsia-300">{group.name} Trades</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((tradeName) => { const item = reference.trades.find(({ name: candidate }) => candidate === tradeName)!; const value = tradeMasteries[tradeName] ?? 'Untrained'; return <InfoDetails key={tradeName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{tradeName}</span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={Math.min(5, masteryMaximum + (expertise.trades[tradeName] ?? 0))} bonus={expertise.trades[tradeName] ?? 0} onChange={(next) => setTradeMasteries((current) => ({ ...current, [tradeName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-fuchsia-300">{item.attribute} • {item.tool}</p>{item.description}</InfoDetails>; })}</div></div>)}
              {reference.languageGroups.map((group) => <div key={group.name}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-sky-300">{group.name} Languages</h3><div className="grid gap-2 lg:grid-cols-2">{group.options.map((languageName) => { const item = reference.languages.find(({ name: candidate }) => candidate === languageName)!; const value = languageMasteries[languageName] ?? 'Untrained'; return <InfoDetails key={languageName} summary={<div className="flex flex-1 items-center justify-between gap-3"><span>{languageName}{languageName === 'Common' && <span className="ml-2 text-xs text-emerald-300">Free</span>}</span><span onClick={(event) => event.stopPropagation()}><MasteryPicker value={value} maximum={masteryMaximum} onChange={(next) => setLanguageMasteries((current) => ({ ...current, [languageName]: next }))} /></span></div>}><p className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-300">Typical speakers: {item.typicalSpeakers}</p>{item.description}</InfoDetails>; })}</div></div>)}
            </div>
          </section>}

          {currentStep === 'ancestry' && <section>
            <div className="mb-6 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-300">Primary Ancestry<select value={ancestry} onChange={(event) => { setAncestry(event.target.value); setTraitIDs([]); setTraitChoices({}); }} className={`${fieldClass} mt-2`}>{reference.ancestries.map((option) => <option key={option}>{option}</option>)}</select></label><label className="text-sm font-bold text-slate-300">Secondary Ancestry (optional)<select value={secondaryAncestry} onChange={(event) => { setSecondaryAncestry(event.target.value); setTraitIDs([]); setTraitChoices({}); }} className={`${fieldClass} mt-2`}><option value="">None</option>{reference.ancestries.filter((option) => option !== ancestry && option !== 'Custom').map((option) => <option key={option}>{option}</option>)}</select></label></div>
            <div className="mb-6 grid gap-3 sm:grid-cols-4"><Metric label="Ancestry Points" value={`${ancestrySpent}/${derived?.ancestryPointBudget ?? 5}`} /><Metric label="Negative Points" value={`${negativePoints}/2`} /><Metric label="Minor Traits" value={`${minorTraits}/1`} /><Metric label="Traits Chosen" value={traitIDs.length} /></div>
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h3 className="font-black text-emerald-300">Traits shared by every ancestry</h3><div className="mt-3 grid gap-2 md:grid-cols-3">{reference.generalAncestryTraits.map((trait) => <InfoDetails key={trait.id} summary={trait.name}>{trait.description}</InfoDetails>)}</div></div>
            <div className="space-y-5">{Array.from(new Set(visibleTraits.map(({ category }) => category))).sort().map((category) => <div key={category}><h3 className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-violet-300">{category} Traits</h3><div className="grid gap-3 lg:grid-cols-2">{visibleTraits.filter((trait) => trait.category === category).map((trait) => { const selected = traitIDs.includes(trait.id); const options = choiceOptions(trait, reference.skills, reference.trades, spells); return <div key={trait.id} className={`rounded-xl border p-4 ${selected ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/10 bg-slate-950/45'}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-black text-slate-100">{trait.name} <span className="text-sm text-violet-300">({trait.cost > 0 ? '+' : ''}{trait.cost} AP)</span></h4><p className="mt-1 text-xs text-slate-500">{trait.ancestry}{trait.prerequisite ? ` • Requires ${trait.prerequisite}` : ''}</p></div><button type="button" onClick={() => toggleTrait(trait)} className={`rounded-lg px-3 py-2 text-xs font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}>{selected ? 'Selected' : 'Select'}</button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{trait.description}</p>{selected && options.length > 0 && <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Required choice<select value={traitChoices[trait.id]?.[0] ?? ''} onChange={(event) => setTraitChoices((current) => ({ ...current, [trait.id]: [event.target.value] }))} className={`${fieldClass} mt-2 normal-case tracking-normal`}><option value="">Choose…</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>}</div>; })}</div></div>)}</div>
          </section>}

          {currentStep === 'class' && classReference && <section>
            <div className="grid gap-5 xl:grid-cols-[310px_1fr]"><aside className="space-y-2 xl:max-h-[760px] xl:overflow-auto xl:pr-2">{reference.classes.map((entry) => <button type="button" key={entry.name} onClick={() => setClass(entry.name)} className={`w-full rounded-xl border p-3 text-left ${entry.name === className ? 'border-violet-400 bg-violet-500/15' : 'border-white/10 bg-slate-950/45 hover:bg-slate-800'}`}><div className="font-black text-slate-100">{entry.name}</div><div className="mt-1 text-xs text-slate-500">{entry.path} • {entry.levelOneResource}</div><p className="mt-2 text-xs leading-5 text-slate-400">{entry.summary}</p></button>)}</aside><div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{classReference.path} Path</p><h2 className="text-3xl font-black text-white">{classReference.name}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{classReference.description}</p></div>
              <InfoDetails summary={<span>{classReference.pathTitle}</span>}>{classReference.pathDetails}</InfoDetails>
              {pathLevels.length > 0 && <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Path Progression Choices</h3><div className="grid gap-3 sm:grid-cols-2">{pathLevels.map((pathLevel) => <div key={pathLevel} className="rounded-xl bg-slate-950/50 p-3"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Level {pathLevel}</div><div className="flex gap-2">{(['Martial', 'Spellcaster'] as CharacterPathChoice[]).map((path) => <button type="button" key={path} onClick={() => setPathChoices((current) => ({ ...current, [String(pathLevel)]: path }))} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${pathChoices[String(pathLevel)] === path ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{path}</button>)}</div></div>)}</div></div>}
              {level >= 3 && classReference.subclasses.length > 0 && <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Subclass</h3><div className="grid gap-2 sm:grid-cols-3">{classReference.subclasses.map((option) => <button type="button" key={option} onClick={() => { setSubclass(option); setFeatureChoices({}); }} className={`rounded-lg border px-3 py-3 text-sm font-bold ${subclass === option ? 'border-violet-400 bg-violet-500/15 text-violet-200' : 'border-slate-700 text-slate-400'}`}>{option}</button>)}</div>{subclass && <div className="mt-4 space-y-2">{(classReference.subclassFeatures[subclass] ?? []).map((feature) => <InfoDetails key={feature.name} summary={feature.name}>{feature.description}</InfoDetails>)}</div>}</div>}
              <div className={panelClass}><div className="mb-3 flex items-center justify-between"><h3 className="font-black text-violet-200">Class Progression Table</h3><span className="text-xs text-slate-500">{classReference.tableSource}</span></div><div className="overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr>{classReference.tableColumns.map((column) => <th key={column} className="border-b border-white/10 p-2 text-left text-[10px] uppercase tracking-wider text-slate-500">{column}</th>)}</tr></thead><tbody>{classReference.tableRows.map((row) => <tr key={row.level} className={row.level === level ? 'bg-violet-500/10 text-violet-100' : 'text-slate-400'}>{classReference.tableColumns.map((column) => <td key={column} className="border-b border-white/5 p-2">{column === 'level' ? row.level : column === 'features' ? row.features : row[column as keyof typeof row] === undefined ? '—' : `+${row[column as keyof typeof row]}`}</td>)}</tr>)}</tbody></table></div></div>
              <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Features Gained Through Level {level}</h3><div className="space-y-3">{classReference.features.filter((entry) => entry.level <= level).map((entry) => <div key={entry.level}><h4 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-fuchsia-300">Level {entry.level}</h4><div className="space-y-2">{entry.features.map((feature) => <InfoDetails key={`${entry.level}-${feature.name}`} summary={feature.name}>{feature.description}</InfoDetails>)}</div></div>)}</div></div>
              {availableTalentSlots > 0 && <div className={panelClass}><h3 className="mb-1 font-black text-violet-200">Talents ({talents.length}/{availableTalentSlots})</h3><p className="mb-3 text-sm text-slate-500">Only talents whose level prerequisites are met are shown.</p><div className="grid gap-2 lg:grid-cols-2">{classReference.talents.filter((talent) => talent.minimumLevel <= level).map((talent) => <div key={talent.name} className={`rounded-xl border p-3 ${talents.includes(talent.name) ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 bg-slate-950/45'}`}><div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-200">{talent.name}</span><button type="button" onClick={() => toggleLimited(talents, talent.name, availableTalentSlots, setTalents)} className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-violet-200">{talents.includes(talent.name) ? 'Remove' : 'Select'}</button></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">{talent.description}</p></div>)}</div></div>}
              {featureChoiceGroups.length > 0 && <div className={panelClass}><h3 className="mb-3 font-black text-violet-200">Class Feature Options</h3><div className="space-y-4">{featureChoiceGroups.map((group) => <div key={`${group.id}-${group.requiredSubclass ?? ''}`} className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><h4 className="font-black text-slate-200">{group.title} <span className="text-xs text-slate-500">({group.feature})</span></h4><p className="mt-1 text-sm text-slate-500">{group.prompt} Choose {group.limit}.</p><div className="mt-3 grid gap-2 md:grid-cols-2">{group.options.map((option) => <InfoDetails key={option.name} summary={<label className="flex flex-1 cursor-pointer items-center gap-2" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={(featureChoices[group.id] ?? []).includes(option.name)} onChange={() => setFeatureChoice(group, option.name)} />{option.name}</label>}>{option.description}</InfoDetails>)}</div></div>)}</div></div>}
              <div className={panelClass}><label className="block text-sm font-bold text-slate-300">Spell Source{!classReference.fixedSpellSource && <select value={spellSource} onChange={(event) => { setSpellSource(event.target.value); setSelectedSpells([]); }} className={`${fieldClass} mt-2`}><option value="">Choose a source or review all eligible spells</option>{Array.from(new Set(spells.flatMap((spell) => spell.source.split(', ')))).sort().map((source) => <option key={source}>{source}</option>)}</select>}{classReference.fixedSpellSource && <div className="mt-2 rounded-lg bg-slate-950/50 px-3 py-2 text-violet-200">{classReference.fixedSpellSource}</div>}</label>
                <div className="mt-4 space-y-3"><details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-violet-200">Spells ({selectedSpells.length}/{derived?.spellLimit ?? 0})</summary><div className="mt-4 grid max-h-[520px] gap-2 overflow-auto pr-2 lg:grid-cols-2">{allowedSpells.map((spell) => <InfoDetails key={spell.name} summary={<label className="flex flex-1 cursor-pointer items-center gap-2" onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={(derived?.spellLimit ?? 0) === 0} checked={selectedSpells.includes(spell.name)} onChange={() => toggleLimited(selectedSpells, spell.name, derived?.spellLimit ?? 0, setSelectedSpells)} />{spell.name}<span className="ml-auto text-xs text-slate-500">{spell.cost}</span></label>}><p className="mb-2 text-xs font-bold text-violet-300">{spell.source} • {spell.school} • {spell.range} • {spell.duration}</p>{spell.description}{spell.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{spell.enhancements}</p></>}</InfoDetails>)}</div></details>
                  {classTotals && classTotals.cantrips > 0 && <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-sky-200">Psion Cantrips ({selectedCantrips.length}/{derived?.cantripLimit ?? 0})</summary><div className="mt-4 grid gap-2 lg:grid-cols-2">{allowedSpells.filter(({ cost }) => cost.includes('0 MP') || !cost.includes('MP')).map((spell) => <label key={spell.name} className="flex items-center gap-2 rounded-lg bg-slate-900 p-3 text-sm text-slate-300"><input type="checkbox" checked={selectedCantrips.includes(spell.name)} onChange={() => toggleLimited(selectedCantrips, spell.name, derived?.cantripLimit ?? 0, setSelectedCantrips)} />{spell.name}</label>)}</div></details>}
                  <details className="rounded-xl border border-white/10 bg-slate-950/45 p-4"><summary className="cursor-pointer font-black text-fuchsia-200">Maneuvers ({selectedManeuvers.length}/{derived?.maneuverLimit ?? 0})</summary><div className="mt-4 grid max-h-[520px] gap-2 overflow-auto pr-2 lg:grid-cols-2">{maneuvers.map((maneuver) => <InfoDetails key={maneuver.name} summary={<label className="flex flex-1 cursor-pointer items-center gap-2" onClick={(event) => event.stopPropagation()}><input type="checkbox" disabled={(derived?.maneuverLimit ?? 0) === 0} checked={selectedManeuvers.includes(maneuver.name)} onChange={() => toggleLimited(selectedManeuvers, maneuver.name, derived?.maneuverLimit ?? 0, setSelectedManeuvers)} />{maneuver.name}<span className="ml-auto text-xs text-slate-500">{maneuver.cost}</span></label>}><p className="mb-2 text-xs font-bold text-fuchsia-300">{maneuver.category} • {maneuver.range}{maneuver.requirements ? ` • ${maneuver.requirements}` : ''}</p>{maneuver.description}{maneuver.enhancements && <><h5 className="mt-4 font-bold text-slate-300">Enhancements</h5><p>{maneuver.enhancements}</p></>}</InfoDetails>)}</div></details></div>
              </div>
            </div></div>
          </section>}

          {currentStep === 'equipment' && classReference && <section><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{classReference.name} Training</p><h2 className="text-2xl font-black text-white">Starting Equipment</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{classReference.startingEquipment.description}</p></div>{equipmentLoading ? <p className="text-slate-400">Loading equipment…</p> : <div className="space-y-6">{([['arsenal', `Arsenal — choose ${classReference.startingEquipment.arsenalCount}`], ['armor', 'Armor — choose 1'], ['tools', `Trade Tools — choose ${classReference.startingEquipment.tradeToolCount}`]] as const).map(([group, title]) => <div key={group}><h3 className="mb-3 font-black text-violet-200">{title}</h3><div className="grid gap-2 lg:grid-cols-2">{startingEquipment[group].map((item) => { const selected = inventoryItems.some((entry) => entry.equipmentID === item.id && entry.source === 'startingEquipment'); return <InfoDetails key={item.id} summary={<label className="flex flex-1 cursor-pointer items-center gap-2" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected} onChange={() => toggleStartingEquipment(item.id, group)} />{item.name}<span className="ml-auto text-xs text-slate-500">{item.slot}</span></label>}><p className="mb-2 font-semibold text-violet-200">{item.summary}</p>{item.mechanics}</InfoDetails>; })}</div></div>)}</div>}<label className="mt-6 block text-sm font-bold text-slate-300">Character Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className={`${fieldClass} mt-2`} placeholder="Goals, bonds, appearance, reminders…" /></label></section>}

          {currentStep === 'summary' && derived && classReference && <section><h2 className="text-2xl font-black text-white">Final Character Summary</h2><p className="mt-2 text-slate-400">All health, resources, defenses, combat values, and saves are calculated from the preceding choices.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Metric label="Maximum HP" value={derived.maxHP} tone="red" /><Metric label="Action Points" value={4} /><Metric label="Stamina" value={derived.maxStamina} tone="blue" /><Metric label="Mana" value={derived.maxMana} tone="blue" /><Metric label="Physical Defense" value={derived.physicalDefense} /><Metric label="Arcane Defense" value={derived.arcaneDefense} /><Metric label="Combat Mastery" value={`+${derived.combatMastery}`} /><Metric label="Prime Modifier" value={`+${derived.primeModifier}`} /><Metric label="Martial Check" value={`+${derived.martialCheck}`} /><Metric label="Spell Check" value={`+${derived.spellCheck}`} /><Metric label="Class Save DC" value={derived.saveDC} /><Metric label="Speed" value={derived.speed} /></div><div className="mt-6 grid gap-5 lg:grid-cols-2"><div className={panelClass}><h3 className="font-black text-violet-200">Identity</h3><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Name</dt><dd className="font-bold text-slate-200">{name || 'Unnamed'}</dd></div><div><dt className="text-slate-500">Level & Class</dt><dd className="font-bold text-slate-200">Level {level} {className}</dd></div><div><dt className="text-slate-500">Subclass</dt><dd className="font-bold text-slate-200">{subclass || 'Not yet available'}</dd></div><div><dt className="text-slate-500">Ancestry</dt><dd className="font-bold text-slate-200">{ancestry}{secondaryAncestry ? ` / ${secondaryAncestry}` : ''}</dd></div><div className="col-span-2"><dt className="text-slate-500">Background</dt><dd className="font-bold text-slate-200">{backgroundName || 'Unnamed background'}</dd></div></dl></div><div className={panelClass}><h3 className="font-black text-violet-200">Attributes & Saves</h3><div className="mt-3 grid grid-cols-2 gap-3">{ATTRIBUTE_NAMES.map((attribute) => <div key={attribute} className="rounded-lg bg-slate-950/50 p-3"><div className="text-xs text-slate-500">{attribute}</div><div className="text-xl font-black text-slate-100">{derived.effectiveAttributes[attribute] >= 0 ? '+' : ''}{derived.effectiveAttributes[attribute]}</div><div className="text-xs text-violet-300">Save +{derived.effectiveAttributes[attribute] + derived.combatMastery}</div></div>)}</div></div><div className={panelClass}><h3 className="font-black text-violet-200">Training</h3><p className="mt-3 text-sm text-slate-400">Skills {skillSpent}/{derived.skillPointBudget} • Trades {tradeSpent}/{derived.tradePointBudget} • Languages {languageSpent}/{derived.languagePointBudget}</p><p className="mt-2 text-sm text-slate-400">Mastery cap: {masteryTitle(masteryMaximum)}{Object.keys(expertise.skills).length || Object.keys(expertise.trades).length ? ' (expertise bonuses shown in Skills)' : ''}</p></div><div className={panelClass}><h3 className="font-black text-violet-200">Features & Powers</h3><p className="mt-3 text-sm text-slate-400">{classReference.features.filter(({ level: featureLevel }) => featureLevel <= level).reduce((sum, entry) => sum + entry.features.length, 0)} class features • {selectedTraits.length} ancestry traits • {talents.length} talents</p><p className="mt-2 text-sm text-slate-400">{selectedSpells.length} spells • {selectedCantrips.length} cantrips • {selectedManeuvers.length} maneuvers</p></div></div>{validation.length > 0 && <div role="alert" className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><h3 className="font-black text-amber-200">Finish these choices</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/80">{validation.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}</section>}
        </main>

        {(rulesError || powersError) && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{rulesError || powersError}</div>}
        <footer className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={currentStepIndex === 0} onClick={() => setCurrentStep(STEPS[Math.max(0, currentStepIndex - 1)].id)} className="rounded-xl border border-slate-600 bg-slate-900 px-5 py-3 font-bold text-slate-300 disabled:opacity-30">← Previous</button><span className="hidden text-sm text-slate-500 sm:block">Step {currentStepIndex + 1} of {STEPS.length}{powersLoading ? ' • Loading powers…' : ''}</span>{currentStep !== 'summary' ? <button type="button" disabled={currentStep === 'attributes' && !name.trim()} onClick={() => setCurrentStep(STEPS[Math.min(STEPS.length - 1, currentStepIndex + 1)].id)} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-black text-white disabled:opacity-40">Next →</button> : <button type="button" disabled={validation.length > 0} onClick={finish} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{editingCharacter ? 'Save Character' : 'Finish Character'}</button>}</footer>
      </div>
    </div>
  );
};

export default CharacterBuilderView;
