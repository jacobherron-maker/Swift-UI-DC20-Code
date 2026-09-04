import type {
  AncestryTrait,
  Character,
  CharacterBuildData,
  ClassChoiceGroupReference,
  ClassReference,
  DC20Attribute,
  EquipmentCatalogItem,
  MasteryLevel,
  Spell,
} from '../types/models';

export const ATTRIBUTE_NAMES: DC20Attribute[] = ['Might', 'Agility', 'Charisma', 'Intelligence'];
export const MASTERY_TITLES: MasteryLevel[] = [
  'Untrained', 'Novice', 'Adept', 'Expert', 'Master', 'Grandmaster',
];

export function attributeCap(level: number): number {
  return level >= 20 ? 7 : level >= 15 ? 6 : level >= 10 ? 5 : level >= 5 ? 4 : 3;
}

export function masteryCap(level: number): number {
  return level >= 20 ? 5 : level >= 15 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : 1;
}

/** Roguish Finesse raises only the Skill Mastery Limit, not the Trade Mastery Limit. */
export function skillMasteryCap(character: Pick<Character, 'class' | 'level'>): number {
  return Math.min(5, masteryCap(character.level) + Number(character.class === 'Rogue'));
}

export function combatMastery(level: number): number {
  return Math.max(1, Math.floor((Math.max(1, level) + 1) / 2));
}

export function masteryRank(value: MasteryLevel | undefined): number {
  return Math.max(0, MASTERY_TITLES.indexOf(value ?? 'Untrained'));
}

export function masteryTitle(rank: number): MasteryLevel {
  return MASTERY_TITLES[Math.min(MASTERY_TITLES.length - 1, Math.max(0, Math.trunc(rank)))];
}

export function masteryBonus(value: MasteryLevel | undefined): number {
  return masteryRank(value) * 2;
}

export function classHealth(className: string, level: number): number {
  const laterLevels = Math.max(0, Math.trunc(level) - 1);
  if (['Barbarian', 'Champion', 'Commander', 'Hunter', 'Monk'].includes(className)) {
    return 8 + laterLevels * 2;
  }
  if (['Rogue', 'Spellblade', 'Warlock'].includes(className)) {
    return 8 + laterLevels + Math.floor(laterLevels / 2);
  }
  return 7 + laterLevels;
}

export function classTableTotals(reference: ClassReference, level: number) {
  const rows = reference.tableRows.filter((row) => row.level <= level);
  const total = (field: 'attribute' | 'skill' | 'trade' | 'stamina' | 'mana' | 'spells' | 'cantrips' | 'maneuvers') => (
    rows.reduce((sum, row) => sum + (row[field] ?? 0), 0)
  );
  return {
    attribute: total('attribute'),
    skill: total('skill'),
    trade: total('trade'),
    stamina: total('stamina'),
    mana: total('mana'),
    spells: total('spells'),
    cantrips: total('cantrips'),
    maneuvers: total('maneuvers'),
  };
}

export function talentSlots(className: string, level: number, subclass?: string): number {
  const progression = className === 'Psion' ? [2, 4, 7, 10] : [2, 4, 6, 8];
  const paragon = subclass === 'Paragon' ? [3, 7, 10].filter((entry) => entry <= level).length : 0;
  return progression.filter((entry) => entry <= level).length + paragon;
}

export const BARBARIAN_RAGE_STATE = 'barbarian.rage';

export interface CharacterSheetEffects {
  physicalDefense: number;
  speed: number;
  saveAdvantage: Partial<Record<DC20Attribute, number>>;
  martialMeleeDamageBonus: number;
  resistances: string[];
}

/** Sheet-facing effects that must change live rather than being baked into a character's base statistics. */
export function characterSheetEffects(character: Character): CharacterSheetEffects {
  const isRaging = character.class === 'Barbarian'
    && Boolean(character.build?.sheetFeatureStates?.[BARBARIAN_RAGE_STATE]);
  const selectedRune = character.class === 'Spellblade'
    ? character.build?.sheetFeatureSelections?.['spellblade.rune.active']
    : undefined;
  const activeRune = selectedRune && character.build?.classFeatureSelections?.['spellblade.runes']?.includes(selectedRune)
    ? selectedRune : undefined;
  const spellbladeDisciplines = new Set(spellbladeDisciplineNames(character));
  const spellWarderActive = character.class === 'Spellblade'
    && spellbladeDisciplines.has('Spell Warder')
    && Boolean(character.build?.sheetFeatureStates?.['spellblade.spellWarder.active']);
  const spellWarderDamage = character.build?.sheetFeatureSelections?.['spellblade.spellWarder.damage'];
  const spellWarderHalf = (character.build?.sheetFeatureCounters?.['spellblade.spellWarder.half'] ?? 0) > 0;
  const adaptiveDamage = character.class === 'Spellblade'
    && (character.build?.selectedTalents ?? []).includes('Adaptive Bond')
    ? character.build?.sheetFeatureSelections?.['spellblade.boundDamage.current']
      ?? character.build?.classFeatureSelections?.['spellblade.boundDamage']?.[0]
    : undefined;
  return {
    physicalDefense: character.physicalDefense - (isRaging ? 5 : 0),
    speed: character.speed + (activeRune === 'Lightning Rune' ? 1 : 0),
    saveAdvantage: isRaging ? { Might: 1 } : {},
    martialMeleeDamageBonus: isRaging ? 1 : 0,
    resistances: [
      ...(isRaging ? ['Elemental (Half)', 'Physical (Half)'] : []),
      ...(adaptiveDamage ? [`${adaptiveDamage} (1)`] : []),
      ...(spellWarderActive && spellWarderDamage ? [`${spellWarderDamage} (${spellWarderHalf ? 'Half' : '1'})`] : []),
    ],
  };
}

/** DC20 rounds fractions up, so a Barbarian regains ceil(maximum SP / 2). */
export function barbarianStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Every Rogue Martial Path trigger can restore up to half maximum SP once per Round. */
export function rogueStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** The Mortal Language selected for Cypher Speech is Fluent without spending Language Points. */
export function grantedClassLanguageNames(character: Pick<Character, 'class' | 'build'>): string[] {
  if (character.class !== 'Rogue') return [];
  return (character.build?.classFeatureSelections?.['rogue.language'] ?? []).slice(0, 1);
}

/** Cheap Shot improves at Expert Rogue; each Sinister Shot adds damage per Condition beyond the first. */
export function rogueCheapShotDamage(level: number, distinctConditions: number, sinisterShotCount = 0): number {
  const baseDamage = level >= 5 ? 2 : 1;
  return baseDamage + Math.max(0, Math.trunc(distinctConditions) - 1) * Math.max(0, Math.trunc(sinisterShotCount));
}

/** Every Spellblade Discipline known from the base feature or Holy Warrior. */
export function spellbladeDisciplineNames(character: Pick<Character, 'class' | 'build'>): string[] {
  if (character.class !== 'Spellblade') return [];
  const choices = character.build?.classFeatureSelections ?? {};
  return Array.from(new Set([
    ...(choices['spellblade.disciplines'] ?? []),
    ...(choices['spellblade.paladinDiscipline'] ?? []),
  ]));
}

/** Base Disciplines: 2 at level 1, +2 per Talent, +1 at Expert Spellblade. */
export function classChoiceSelectionLimit(
  group: ClassChoiceGroupReference,
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
): number {
  if (group.id !== 'spellblade.disciplines' || character.class !== 'Spellblade') return group.limit;
  const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Disciplines').length;
  const paladinReserve = character.subclass === 'Paladin' ? 1 : 0;
  return Math.min(Math.max(0, group.options.length - paladinReserve), 2 + expanded * 2 + (character.level >= 5 ? 1 : 0));
}

/** Maneuvers granted by a class feature do not consume the class-table Maneuvers Known allowance. */
export function grantedClassManeuverNames(character: Pick<Character, 'class' | 'subclass' | 'build'>): string[] {
  if (character.class !== 'Barbarian' || character.subclass !== 'Spirit Guardian') return [];
  return (character.build?.classFeatureSelections?.['barbarian.guardianManeuver'] ?? []).slice(0, 1);
}

/** Spells explicitly learned from Summoner features are additional to the class-table Spells Known. */
export function grantedClassSpellNames(character: Pick<Character, 'class' | 'subclass' | 'build'>): string[] {
  if (character.class !== 'Summoner') return [];
  const choices = character.build?.classFeatureSelections ?? {};
  const talents = new Set(character.build?.selectedTalents ?? []);
  const groups = [
    'summoner.bondedSummon',
    ...(character.subclass === 'Chimera' ? ['summoner.chimeraSummons'] : []),
    ...(character.subclass === 'Dread Lord' ? ['summoner.dreadLordSummon'] : []),
    ...(talents.has('Horde Summoner') ? ['summoner.hordeSummons'] : []),
  ];
  return Array.from(new Set(groups.flatMap((group) => choices[group] ?? [])));
}

export function ancestryPointBudget(character: Pick<Character, 'level' | 'class' | 'subclass' | 'build'>): number {
  const laterIncrease = character.class === 'Psion' ? 7 : 8;
  const advancement = (character.level >= 4 ? 2 : 0) + (character.level >= laterIncrease ? 2 : 0);
  const talentPoints = (character.build?.selectedTalents ?? []).filter((name) => name === 'Ancestry Increase').length * 4;
  return 5 + advancement + talentPoints;
}

export function selectedAncestryTraits(character: Pick<Character, 'build' | 'ancestry'>, traits: AncestryTrait[]): AncestryTrait[] {
  const selected = new Set(character.build?.selectedAncestryTraitIDs ?? []);
  const ancestries = new Set([character.ancestry, character.build?.ancestrySecondary].filter((ancestry): ancestry is string => Boolean(ancestry)));
  for (const trait of traits) {
    if (isAutomaticAncestryTrait(trait, ancestries)) selected.add(trait.id);
  }
  return traits.filter((trait) => selected.has(trait.id));
}

export function isAutomaticAncestryTrait(trait: AncestryTrait, ancestries: ReadonlySet<string>): boolean {
  if (!ancestries.has(trait.ancestry)) return false;
  if (trait.name === 'Small-Sized') return ['Gnome', 'Halfling'].includes(trait.ancestry);
  return trait.ancestry === 'Beastborn' && trait.name === 'Beastkind';
}

export function spellIsAvailableToClass(
  className: string,
  spell: Pick<Spell, 'school' | 'source' | 'tags'>,
  fixedSpellSource?: string,
  selectedSpellSource = '',
  selectedSpellSchools: string[] = [],
): boolean {
  const tags = (spell.tags ?? '').split(',').map((tag) => tag.trim().toLowerCase());
  if (className === 'Summoner') {
    return ['Astromancy', 'Conjuration', 'Transmutation'].includes(spell.school)
      || tags.some((tag) => tag === 'summoning' || tag === 'summon');
  }
  if (className === 'Psion') {
    return tags.some((tag) => ['psychic', 'gravity', 'illusion'].includes(tag))
      || ['Divination', 'Enchantment', 'Nullification'].includes(spell.school);
  }
  if (className === 'Bard') {
    return spell.school === 'Enchantment'
      || tags.some((tag) => ['embolden', 'enfeeble', 'healing', 'illusion', 'sound'].includes(tag));
  }
  if (className === 'Spellblade') {
    return selectedSpellSchools.includes(spell.school)
      || tags.some((tag) => ['weapon', 'ward'].includes(tag));
  }
  if (className === 'Warlock') return selectedSpellSchools.includes(spell.school);
  const source = fixedSpellSource ?? selectedSpellSource;
  return source ? (spell.source ?? '').split(', ').includes(source) : true;
}

export function ancestryExpertise(
  character: Pick<Character, 'build' | 'ancestry' | 'class'>,
  traits: AncestryTrait[],
): { skills: Record<string, number>; trades: Record<string, number> } {
  const result = { skills: {} as Record<string, number>, trades: {} as Record<string, number> };
  for (const trait of selectedAncestryTraits(character, traits)) {
    const choice = character.build?.ancestryTraitChoices?.[trait.id]?.[0];
    if (!choice) continue;
    // Roguish Finesse already increases every Skill Mastery Limit, and both Features forbid stacking.
    if (trait.name === 'Skill Expertise' && character.class !== 'Rogue') result.skills[choice] = (result.skills[choice] ?? 0) + 1;
    if (trait.name === 'Trade Expertise') result.trades[choice] = (result.trades[choice] ?? 0) + 1;
  }
  return result;
}

function traitCount(traits: AncestryTrait[], name: string): number {
  return traits.filter((trait) => trait.name === name).length;
}

function equipmentBonuses(character: Character, catalog: EquipmentCatalogItem[]) {
  const equipped = (character.inventoryItems ?? [])
    .filter((entry) => entry.isEquipped)
    .flatMap((entry) => catalog.filter((item) => item.id === entry.equipmentID));
  const armorName = equipped.find((item) => item.category === 'Armor')?.name ?? '';
  const names = new Set(equipped.map((item) => item.name));
  const armor: Record<string, { pd: number; ad: number; pdr: number }> = {
    'Defensive Light Armor': { pd: 1, ad: 1, pdr: 0 },
    'Deflecting Light Armor': { pd: 2, ad: 0, pdr: 0 },
    'Fortified Light Armor': { pd: 0, ad: 2, pdr: 0 },
    'Defensive Heavy Armor': { pd: 1, ad: 1, pdr: 1 },
    'Deflecting Heavy Armor': { pd: 2, ad: 0, pdr: 1 },
    'Fortified Heavy Armor': { pd: 0, ad: 2, pdr: 1 },
    'Highly Defensive Heavy Armor': { pd: 2, ad: 2, pdr: 0 },
  };
  const shield = names.has('Tower Shield') ? { pd: 2, ad: 2 }
    : names.has('Kite Shield') ? { pd: 1, ad: 2 }
      : names.has('Heater Shield') ? { pd: 1, ad: 1 }
        : names.has('Buckler') ? { pd: 1, ad: 0 }
          : names.has('Round Shield') ? { pd: 0, ad: 1 } : { pd: 0, ad: 0 };
  const focusAD = equipped.filter((item) => item.category === 'Spell Focuses' && item.properties.includes('Protective')).length;
  const focusMDR = equipped.some((item) => item.category === 'Spell Focuses' && item.properties.includes('Warded')) ? 1 : 0;
  const weaponPD = equipped.filter((item) => item.category === 'Weapons' && item.properties.includes('Guard')).length;
  return {
    pd: (armor[armorName]?.pd ?? 0) + shield.pd + weaponPD,
    ad: (armor[armorName]?.ad ?? 0) + shield.ad + focusAD,
    physicalDR: armor[armorName]?.pdr ?? 0,
    mysticalDR: focusMDR,
    speedPenalty: (armorName.includes('Heavy Armor') ? 1 : 0)
      + Number(names.has('Kite Shield')) + Number(names.has('Tower Shield')),
    isUnarmored: !armorName,
  };
}

export interface CharacterDerivedSummary {
  effectiveAttributes: Record<DC20Attribute, number>;
  primeModifier: number;
  combatMastery: number;
  maxHP: number;
  maxStamina: number;
  maxMana: number;
  physicalDefense: number;
  arcaneDefense: number;
  speed: number;
  saveDC: number;
  martialCheck: number;
  spellCheck: number;
  skillPointBudget: number;
  tradePointBudget: number;
  languagePointBudget: number;
  ancestryPointBudget: number;
  spellLimit: number;
  cantripLimit: number;
  maneuverLimit: number;
  physicalDR: number;
  mysticalDR: number;
  size: string;
}

export function deriveCharacter(
  character: Character,
  classReference: ClassReference,
  allTraits: AncestryTrait[],
  equipmentCatalog: EquipmentCatalogItem[],
): CharacterDerivedSummary {
  const chosenTraits = selectedAncestryTraits(character, allTraits);
  const cap = attributeCap(character.level);
  const effectiveAttributes = Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => {
    let adjustment = 0;
    for (const trait of chosenTraits) {
      const choice = character.build?.ancestryTraitChoices?.[trait.id]?.[0];
      if (trait.name === 'Attribute Increase' && choice === attribute) adjustment += 1;
      if (trait.name === 'Attribute Decrease' && choice === attribute) adjustment -= 1;
      if (trait.name === `${attribute} Attribute Decrease`) adjustment -= 1;
    }
    const base = character.attributes?.[attribute]?.score ?? 0;
    return [attribute, Math.min(cap, Math.max(-2, base + adjustment))];
  })) as Record<DC20Attribute, number>;
  const primeModifier = Math.max(...Object.values(effectiveAttributes));
  const mastery = combatMastery(character.level);
  const equipment = equipmentBonuses(character, equipmentCatalog);
  const totals = classTableTotals(classReference, character.level);
  const paths = Object.values(character.build?.pathProgressionChoices ?? {});
  const martialPaths = paths.filter((path) => path === 'Martial').length;
  const spellcasterPaths = paths.filter((path) => path === 'Spellcaster').length;
  const manaTraits = traitCount(chosenTraits, 'Mana Increase');
  const ancestryHP = traitCount(chosenTraits, 'Tough') - traitCount(chosenTraits, 'Frail') * 2;
  const ancestryPD = -traitCount(chosenTraits, 'Reckless')
    + (equipment.isUnarmored ? traitCount(chosenTraits, 'Quick Reactions') : 0);
  const ancestryAD = -traitCount(chosenTraits, 'Brittle')
    + traitCount(chosenTraits, 'Strong Minded') + traitCount(chosenTraits, 'Strong-Minded')
    + (equipment.isUnarmored ? traitCount(chosenTraits, 'Thick-Skinned') + traitCount(chosenTraits, 'Hard Shell') : 0);
  const classPD = equipment.isUnarmored && character.class === 'Monk' ? 2 : 0;
  const classAD = equipment.isUnarmored && character.class === 'Barbarian' ? 2 : 0;
  const classSpeed = character.class === 'Barbarian' ? 1
    : character.class === 'Monk' ? (character.level >= 5 ? 2 : 1) : 0;
  const disciplines = new Set(spellbladeDisciplineNames(character));
  const featureMana = character.class === 'Sorcerer' ? (character.level >= 5 ? 2 : 1)
    : character.class === 'Spellblade' && disciplines.has('Magus') ? 1 : 0;
  const skillFeaturePoints = character.class === 'Bard' ? (character.level >= 5 ? 4 : 2)
    : character.class === 'Rogue' ? (character.level >= 5 ? 2 : 1) : 0;
  const bardMagicalSecrets = character.class === 'Bard' ? (character.level >= 5 ? 6 : 2) : 0;
  const skillConversions = character.build?.skillPointsConvertedToTrades ?? 0;
  const tradeConversions = character.build?.tradePointsConvertedToLanguages ?? 0;
  const selectedTalents = character.build?.selectedTalents ?? [];
  const skillTalentPoints = selectedTalents.filter((name) => name === 'Skill Increase').length * 4;
  const paragonTradePoints = character.subclass === 'Paragon' && character.level >= 3 ? 1 : 0;

  return {
    effectiveAttributes,
    primeModifier,
    combatMastery: mastery,
    maxHP: Math.max(1, classHealth(character.class, character.level) + effectiveAttributes.Might + ancestryHP),
    maxStamina: totals.stamina + martialPaths,
    maxMana: totals.mana + spellcasterPaths * 3 + manaTraits + featureMana,
    physicalDefense: 8 + mastery + effectiveAttributes.Agility + effectiveAttributes.Intelligence + equipment.pd + ancestryPD + classPD,
    arcaneDefense: 8 + mastery + effectiveAttributes.Might + effectiveAttributes.Charisma + equipment.ad + ancestryAD + classAD,
    speed: Math.max(0, 5 + traitCount(chosenTraits, 'Speed Increase') - traitCount(chosenTraits, 'Short-Legged')
      - traitCount(chosenTraits, 'Hard Shell') - equipment.speedPenalty + classSpeed),
    saveDC: 10 + primeModifier + mastery,
    martialCheck: primeModifier + mastery,
    spellCheck: primeModifier + mastery,
    skillPointBudget: Math.max(0, 5 + effectiveAttributes.Intelligence + totals.skill + skillFeaturePoints + skillTalentPoints - skillConversions),
    tradePointBudget: Math.max(0, 3 + totals.trade + paragonTradePoints + skillConversions * 2 - tradeConversions),
    languagePointBudget: 2 + tradeConversions * 2,
    ancestryPointBudget: ancestryPointBudget(character),
    spellLimit: totals.spells + bardMagicalSecrets + spellcasterPaths
      + selectedTalents.filter((name) => name === 'Spellcasting Expansion').length * 3
      + Number(character.class === 'Spellblade' && disciplines.has('Magus')),
    cantripLimit: totals.cantrips,
    maneuverLimit: totals.maneuvers + martialPaths
      + selectedTalents.filter((name) => name === 'Martial Expansion').length * 2
      + Number(character.class === 'Spellblade' && disciplines.has('Warrior')),
    physicalDR: equipment.physicalDR,
    mysticalDR: equipment.mysticalDR,
    size: chosenTraits.some((trait) => trait.name === 'Small-Sized') ? 'Small' : 'Medium',
  };
}

export function applyDerivedCharacter(character: Character, derived: CharacterDerivedSummary): Character {
  const previousMaxHP = Math.max(1, character.maxHealthPoints || derived.maxHP);
  const damage = Math.max(0, previousMaxHP - character.healthPoints);
  return {
    ...character,
    attributes: Object.fromEntries(ATTRIBUTE_NAMES.map((attribute) => [attribute, {
      name: attribute,
      score: character.attributes[attribute].score,
      modifier: derived.effectiveAttributes[attribute],
    }])) as Character['attributes'],
    primeModifier: derived.primeModifier,
    combatMastery: derived.combatMastery,
    maxHealthPoints: derived.maxHP,
    healthPoints: Math.max(0, derived.maxHP - damage),
    maxStamina: derived.maxStamina,
    stamina: Math.min(character.stamina, derived.maxStamina),
    maxManaPoints: derived.maxMana,
    manaPoints: Math.min(character.manaPoints, derived.maxMana),
    physicalDefense: derived.physicalDefense,
    arcaneDefense: derived.arcaneDefense,
    defense: derived.physicalDefense,
    speed: derived.speed,
    size: derived.size,
  };
}

export function defaultBuild(): CharacterBuildData {
  return {
    attributeMethod: 'Standard Array',
    rolledAttributeResults: [],
    attributeAssignments: [],
    attributeBonusPoints: {},
    backgroundName: '',
    backgroundStory: '',
    skillPointsConvertedToTrades: 0,
    tradePointsConvertedToLanguages: 0,
    languageFluencies: { Common: 'Fluent' },
    ancestrySecondary: '',
    selectedAncestryTraitIDs: [],
    ancestryTraitChoices: {},
    selectedTalents: [],
    pathProgressionChoices: {},
    classFeatureSelections: {},
    selectedSpellListClass: '',
    selectedSpellSource: '',
    selectedSpellSchools: [],
    selectedSpells: [],
    selectedCantrips: [],
    selectedManeuvers: [],
    currentStamina: 0,
    currentMana: 0,
    temporaryHP: 0,
    sheetConditionLevels: {},
    sheetFeatureStates: {},
    sheetFeatureSelections: {},
    sheetFeatureCounters: {},
    characterNotes: [],
    rollAdjustment: 0,
    isFinalized: false,
  };
}
