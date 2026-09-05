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
import { defensiveEquipmentProfile } from './equipmentRules';

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
export const BARD_PERFORMANCE_STATE = 'bard.performance.active';

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
  const clericDomains = new Set(character.class === 'Cleric'
    ? character.build?.classFeatureSelections?.['cleric.domains'] ?? []
    : []);
  const clericDivineDamage = character.class === 'Cleric'
    ? character.build?.classFeatureSelections?.['cleric.divineDamage']?.[0]
    : undefined;
  const inquisitorResistances = character.class === 'Cleric' && character.subclass === 'Inquisitor'
    ? ['Charmed Condition', 'Intimidated Condition', 'Taunted Condition']
    : [];
  const bardPerformanceActive = character.class === 'Bard'
    && Boolean(character.build?.sheetFeatureStates?.[BARD_PERFORMANCE_STATE]);
  const bardPerformanceAppliesToSelf = bardPerformanceActive
    && Boolean(character.build?.sheetFeatureStates?.['bard.performance.selfIncluded']);
  const bardPerformanceEnhanced = character.level >= 5
    && Boolean(character.build?.sheetFeatureStates?.['bard.performance.enhanced']);
  const bardPerformance = character.build?.sheetFeatureSelections?.['bard.performance.activeChoice'];
  const bardEmotionalCondition = character.build?.sheetFeatureSelections?.['bard.performance.condition'];
  const bardResistances = bardPerformanceAppliesToSelf && bardPerformance === 'Emotional'
    ? bardPerformanceEnhanced
      ? ['Charmed Condition', 'Frightened Condition', 'Intimidated Condition', 'Taunted Condition']
      : bardEmotionalCondition ? [`${bardEmotionalCondition} Condition`] : []
    : [];
  const commanderResistances = character.class === 'Commander' && character.subclass === 'Crusader'
    ? ['Frightened Condition', 'Intimidated Condition'] : [];
  return {
    physicalDefense: character.physicalDefense - (isRaging ? 5 : 0),
    speed: character.speed + (activeRune === 'Lightning Rune' ? 1 : 0)
      + (bardPerformanceAppliesToSelf && bardPerformance === 'Fast Tempo' ? (bardPerformanceEnhanced ? 2 : 1) : 0),
    saveAdvantage: isRaging ? { Might: 1 } : {},
    martialMeleeDamageBonus: isRaging ? 1 : 0,
    resistances: [
      ...(isRaging ? ['Elemental (Half)', 'Physical (Half)'] : []),
      ...(adaptiveDamage ? [`${adaptiveDamage} (1)`] : []),
      ...(spellWarderActive && spellWarderDamage ? [`${spellWarderDamage} (${spellWarderHalf ? 'Half' : '1'})`] : []),
      ...(clericDomains.has('Divine Damage Expansion') && clericDivineDamage ? [`${clericDivineDamage} (1)`] : []),
      ...inquisitorResistances,
      ...bardResistances,
      ...commanderResistances,
    ],
  };
}

/** Font of Inspiration begins at d8 and improves to d10 with Expert Bard. */
export function bardHelpDieSize(level: number): number {
  return level >= 5 ? 10 : 8;
}

/** DC20 rounds fractions up, so a Barbarian regains ceil(maximum SP / 2). */
export function barbarianStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** A Champion can recover up to half maximum SP after performing a Maneuver once per Round. */
export function championStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Adaptive Tactics begins with a d8 Tactical Die and improves with Expert Champion. */
export function championTacticalDieSize(level: number): number {
  return level >= 5 ? 10 : 8;
}

/** Commanding Aura starts with the core d8 Help Die, then Expert Commander starts at d10. */
export function commanderHelpDieSize(level: number, priorHelpUsesThisTurn = 0): number {
  const steps = level >= 5 ? [10, 8, 6, 4] : [8, 6, 4];
  return steps[Math.min(Math.max(0, Math.trunc(priorHelpUsesThisTurn)), steps.length - 1)];
}

/** A Commander can recover up to half maximum SP after granting a Help Die once per Round. */
export function commanderStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Inspiring Presence restores 1 HP, 2 at Expert, plus 1 while its target is on Death's Door. */
export function commanderInspiringPresenceHealing(level: number, onDeathsDoor = false): number {
  return 1 + Number(level >= 5) + Number(onDeathsDoor);
}

/** Rally grants 1 Temp HP; Expert Commander adds 1 per 2 additional SP spent. */
export function commanderRallyAmount(level: number, additionalStamina = 0): number {
  return 1 + (level >= 5 ? Math.floor(Math.max(0, additionalStamina) / 2) : 0);
}

/** Every Rogue Martial Path trigger can restore up to half maximum SP once per Round. */
export function rogueStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Languages granted directly by Class Features are Fluent without spending Language Points. */
export function grantedClassLanguageNames(character: Pick<Character, 'class' | 'subclass' | 'build'>): string[] {
  if (character.class === 'Rogue') {
    return (character.build?.classFeatureSelections?.['rogue.language'] ?? []).slice(0, 1);
  }
  if (character.class === 'Warlock' && character.subclass === 'Eldritch') {
    return ['Deep Speech'];
  }
  return [];
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
  if (group.id === 'bard.expression' && character.class === 'Bard') {
    return (character.build?.selectedTalents ?? []).includes('Expanded Repertoire') ? 2 : 1;
  }
  if (group.id === 'cleric.domains' && character.class === 'Cleric') {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Order').length;
    return 2 + expanded * 2 + Number(character.level >= 5);
  }
  if (group.id === 'warlock.boon' && character.class === 'Warlock') {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Boon').length;
    return Math.min(group.options.length, 1 + expanded);
  }
  if (group.id !== 'spellblade.disciplines' || character.class !== 'Spellblade') return group.limit;
  const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Disciplines').length;
  const paladinReserve = character.subclass === 'Paladin' ? 1 : 0;
  return Math.min(Math.max(0, group.options.length - paladinReserve), 2 + expanded * 2 + (character.level >= 5 ? 1 : 0));
}

/** Maneuvers granted by a class feature do not consume the class-table Maneuvers Known allowance. */
export function grantedClassManeuverNames(character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>): string[] {
  const choices = character.build?.classFeatureSelections ?? {};
  if (character.class === 'Champion') {
    return Array.from(new Set([
      ...(choices['champion.masterAtArmsManeuver'] ?? []).slice(0, 1),
      ...(character.level >= 5 ? (choices['champion.expertManeuvers'] ?? []).slice(0, 2) : []),
    ].filter(Boolean)));
  }
  if (character.class === 'Barbarian' && character.subclass === 'Spirit Guardian') {
    return (choices['barbarian.guardianManeuver'] ?? []).slice(0, 1);
  }
  if (character.class === 'Warlock') {
    const boons = new Set(choices['warlock.boon'] ?? []);
    const maneuverLimit = character.level >= 5 ? 3 : 2;
    return Array.from(new Set([
      ...(boons.has('Pact Weapon') ? (choices['warlock.pactWeaponManeuvers'] ?? []).slice(0, maneuverLimit) : []),
      ...(boons.has('Pact Armor') ? (choices['warlock.pactArmorManeuvers'] ?? []).slice(0, maneuverLimit) : []),
    ]));
  }
  if (character.class === 'Cleric') {
    const domains = new Set(choices['cleric.domains'] ?? []);
    return Array.from(new Set([
      ...(domains.has('War') ? (choices['cleric.warManeuver'] ?? []).slice(0, 1) : []),
      ...(domains.has('Peace') ? (choices['cleric.peaceManeuver'] ?? []).slice(0, 1) : []),
    ]));
  }
  return [];
}

/** Spells explicitly learned from class features are additional to the class-table Spells Known. */
export function grantedClassSpellNames(character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>): string[] {
  const choices = character.build?.classFeatureSelections ?? {};
  const talents = new Set(character.build?.selectedTalents ?? []);
  if (character.class === 'Bard') {
    return Array.from(new Set([
      ...(choices['bard.magicalSecrets'] ?? []).slice(0, 2),
      ...(character.level >= 5 ? (choices['bard.expertSecrets'] ?? []).slice(0, 2) : []),
      ...(character.level >= 3 && talents.has('Expanded Repertoire')
        ? (choices['bard.expandedRepertoireSpells'] ?? []).slice(0, 2) : []),
      ...(character.level >= 3 && character.subclass === 'Eloquence'
        ? (choices['bard.enthrallSpell'] ?? []).slice(0, 1) : []),
    ].filter(Boolean)));
  }
  if (character.class === 'Warlock') {
    const boons = new Set(choices['warlock.boon'] ?? []);
    return Array.from(new Set([
      ...(boons.has('Pact Familiar') ? ['Call Familiar'] : []),
      ...(character.level >= 3 && character.subclass === 'Eldritch' ? choices['warlock.psychicSpell'] ?? [] : []),
      ...(character.level >= 5 && boons.has('Pact Spell') ? (choices['warlock.expertSpells'] ?? []).slice(0, 2) : []),
      ...(character.level >= 3 && talents.has('Pact Bane') ? choices['warlock.pactBaneSpells'] ?? [] : []),
    ]));
  }
  if (character.class === 'Cleric') {
    const magicDomains = (choices['cleric.domains'] ?? []).filter((domain) => domain === 'Magic').length;
    return Array.from(new Set((choices['cleric.magicDomainSpells'] ?? []).slice(0, magicDomains).filter(Boolean)));
  }
  if (character.class !== 'Summoner') return [];
  const groups = [
    'summoner.bondedSummon',
    ...(character.subclass === 'Chimera' ? ['summoner.chimeraSummons'] : []),
    ...(character.subclass === 'Dread Lord' ? ['summoner.dreadLordSummon'] : []),
    ...(talents.has('Horde Summoner') ? ['summoner.hordeSummons'] : []),
  ];
  return Array.from(new Set(groups.flatMap((group) => choices[group] ?? [])));
}

export function ancestryPointBudget(character: Pick<Character, 'level' | 'class' | 'subclass' | 'ancestry' | 'build'>): number {
  // Beta p.194: every ancestry gains 2 points at levels 4 and 7. Custom
  // ancestries use the p.196 variant's lower 4-point starting budget.
  const advancement = (character.level >= 4 ? 2 : 0) + (character.level >= 7 ? 2 : 0);
  const talentPoints = (character.build?.selectedTalents ?? []).filter((name) => name === 'Ancestry Increase').length * 4;
  const clericAncestralDomain = character.class === 'Cleric'
    && (character.build?.classFeatureSelections?.['cleric.domains'] ?? []).includes('Ancestral') ? 2 : 0;
  const startingPoints = character.ancestry === 'Custom' ? 4 : 5;
  return startingPoints + advancement + talentPoints + clericAncestralDomain;
}

/** Number of paid copies of a selected trait; old saves implicitly contain one. */
export function ancestryTraitSelectionCount(
  character: Pick<Character, 'build' | 'ancestry'>,
  trait: AncestryTrait,
): number {
  const ancestries = new Set([character.ancestry, character.build?.ancestrySecondary]
    .filter((value): value is string => Boolean(value)));
  const selected = (character.build?.selectedAncestryTraitIDs ?? []).includes(trait.id)
    || isAutomaticAncestryTrait(trait, ancestries);
  if (!selected) return 0;
  return Math.max(1, Math.trunc(character.build?.ancestryTraitCounts?.[trait.id] ?? 1));
}

export function ancestryTraitPointTotals(
  character: Pick<Character, 'build' | 'ancestry'>,
  traits: AncestryTrait[],
): { spent: number; negativePoints: number; zeroPointTraits: number; traitCopies: number } {
  return traits.reduce((totals, trait) => {
    const count = ancestryTraitSelectionCount(character, trait);
    if (count === 0) return totals;
    totals.spent += trait.cost * count;
    totals.negativePoints += trait.cost < 0 ? -trait.cost * count : 0;
    totals.zeroPointTraits += trait.countsAsZeroPointTrait ? count : 0;
    totals.traitCopies += count;
    return totals;
  }, { spent: 0, negativePoints: 0, zeroPointTraits: 0, traitCopies: 0 });
}

export function selectedAncestryTraits(character: Pick<Character, 'build' | 'ancestry'>, traits: AncestryTrait[]): AncestryTrait[] {
  const selected = new Set(character.build?.selectedAncestryTraitIDs ?? []);
  const ancestries = new Set([character.ancestry, character.build?.ancestrySecondary].filter((ancestry): ancestry is string => Boolean(ancestry)));
  for (const trait of traits) {
    if (isAutomaticAncestryTrait(trait, ancestries)) selected.add(trait.id);
  }
  return traits.filter((trait) => selected.has(trait.id));
}

/** Trait lists available from the chosen ancestries and ancestry-access origin traits. */
export function accessibleAncestryNames(
  character: Pick<Character, 'build' | 'ancestry'>,
  traits: AncestryTrait[],
): Set<string> {
  if (character.ancestry === 'Custom') {
    return new Set(traits.map(({ ancestry }) => ancestry));
  }
  const result = new Set([character.ancestry, character.build?.ancestrySecondary].filter((value): value is string => Boolean(value)));
  const selected = selectedAncestryTraits(character, traits);
  if (selected.some(({ name }) => name === 'Fallen')) result.add('Fiendborn');
  if (selected.some(({ name }) => name === 'Redeemed')) result.add('Angelborn');
  return result;
}

/** Handles exact-name requirements plus the two quantified Beastborn requirements. */
export function ancestryTraitPrerequisiteMet(
  character: Pick<Character, 'build' | 'ancestry'>,
  trait: AncestryTrait,
  selectedTraits: AncestryTrait[],
): boolean {
  const originRequirement = ['Draconic Resistance', 'Draconic Breath Weapon', 'Draconic Affinity', 'Draconic Ward'].includes(trait.name)
    ? 'Draconic Origin'
    : ['Fiendish Resistance', 'Fiendish Magic', 'Fiendish Aura'].includes(trait.name) ? 'Fiendish Origin' : '';
  if (originRequirement && !selectedTraits.some(({ name }) => name === originRequirement)) return false;
  if (!trait.prerequisite) return true;
  if (trait.prerequisite === 'Any Flying Beast Trait') {
    return selectedTraits.some(({ ancestry, category, name }) => ancestry === 'Beastborn'
      && (category === 'Flying' || name === 'Glide Speed'));
  }
  if (trait.name === 'Capable Limb') {
    const additional = selectedTraits.find(({ ancestry, name }) => ancestry === 'Beastborn' && name === 'Additional Limb');
    return Boolean(additional && ancestryTraitSelectionCount(character, additional) > 0);
  }
  return selectedTraits.some(({ name }) => name === trait.prerequisite);
}

export interface AncestryGrantedSpell {
  name: string;
  traitName: string;
  traitDescription: string;
}

/** Spells learned directly from selected or automatic ancestry traits. */
export function ancestryGrantedSpellNames(
  character: Pick<Character, 'build' | 'ancestry'>,
  traits: AncestryTrait[],
): AncestryGrantedSpell[] {
  const fixedSpells: Record<string, string> = {
    'Fiendish Aura': 'Sorcery',
    'Psionic Hand': 'Mage Hand',
  };
  const choiceTraits = new Set(['Celestial Magic', 'Fiendish Magic', 'Psionic Magic']);
  const result: AncestryGrantedSpell[] = [];
  for (const trait of selectedAncestryTraits(character, traits)) {
    const name = fixedSpells[trait.name]
      ?? (choiceTraits.has(trait.name) ? character.build?.ancestryTraitChoices?.[trait.id]?.[0] : undefined);
    if (name && !result.some((entry) => entry.name === name && entry.traitName === trait.name)) {
      result.push({ name, traitName: trait.name, traitDescription: trait.description });
    }
  }
  return result;
}

export type CharacterRestType = 'Quick' | 'Short' | 'Long';

export function characterRestPoints(character: Pick<Character, 'maxHealthPoints' | 'build'>): number {
  return Math.min(character.maxHealthPoints, Math.max(0, character.build?.restPoints ?? character.maxHealthPoints));
}

const TURN_STATE_KEYS = new Set([
  'bard.performance.changedThisTurn',
  'bard.help.helpingHandsUsed',
  'champion.disciplinedCombatant.used',
  'champion.hero.adrenaline.active',
  'champion.hero.unyielding.used',
  'commander.help.granted',
  'commander.call.attack.used',
  'commander.call.dodge.used',
  'commander.call.move.used',
  'commander.crusader.protectiveOrders',
  'commander.warlord.moraleAvailable',
  'commander.reinforce.active',
  'commander.warlord.priorityTarget.active',
  'cleric.order.used',
]);

/** Starts a fresh turn without incorrectly resetting round-, combat-, or rest-limited features. */
export function resetCharacterTurn(character: Character): Character {
  if (!character.build) return { ...character, currentAP: character.maxAP };
  const states = { ...character.build.sheetFeatureStates };
  TURN_STATE_KEYS.forEach((key) => { states[key] = false; });
  return {
    ...character,
    currentAP: character.maxAP,
    build: {
      ...character.build,
      sheetFeatureStates: states,
      sheetFeatureCounters: {
        ...character.build.sheetFeatureCounters,
        'bard.help.usesThisTurn': 0,
        'bard.help.result': 0,
        'bard.help.helpingHandsResult': 0,
        'commander.help.usesThisTurn': 0,
        'commander.help.result': 0,
      },
    },
  };
}

/** Applies the universal Beta 0.10.5 recovery rules and the sheet's tracked rest interactions. */
export function completeCharacterRest(character: Character, type: CharacterRestType, requestedRestPoints: number): Character {
  const build = character.build;
  if (!build) return character;
  const shortRestsTaken = Math.max(0, build.shortRestsTaken ?? 0);
  if (type === 'Short' && shortRestsTaken >= 2) return character;

  const available = characterRestPoints(character);
  const missingHP = Math.max(0, character.maxHealthPoints - character.healthPoints);
  const spent = Math.min(available, missingHP, Math.max(0, Math.trunc(requestedRestPoints)));
  const activeRune = build.sheetFeatureSelections['spellblade.rune.active'];
  const flameRuneRecovery = type === 'Short' && activeRune === 'Flame Rune' ? 2 : 0;
  let restPoints = Math.min(character.maxHealthPoints, available - spent + flameRuneRecovery);
  let sheetFeatureStates = { ...build.sheetFeatureStates };
  let sheetFeatureCounters = { ...build.sheetFeatureCounters };
  const sheetConditionLevels = { ...build.sheetConditionLevels };

  if (type === 'Long') {
    restPoints = character.maxHealthPoints;
    sheetFeatureStates = Object.fromEntries(Object.keys(sheetFeatureStates).map((key) => [key, false]));
    sheetFeatureCounters = {};
    delete sheetConditionLevels.Doomed;
  }

  return {
    ...character,
    healthPoints: character.healthPoints + spent,
    stamina: type === 'Quick' ? character.stamina : character.maxStamina,
    manaPoints: type === 'Long' ? character.maxManaPoints : character.manaPoints,
    currentAP: type === 'Long' ? character.maxAP : character.currentAP,
    build: {
      ...build,
      temporaryHP: type === 'Long' ? 0 : build.temporaryHP,
      restPoints,
      shortRestsTaken: type === 'Long' ? 0 : shortRestsTaken + Number(type === 'Short'),
      sheetConditionLevels,
      sheetFeatureStates,
      sheetFeatureCounters,
    },
  };
}

export function isAutomaticAncestryTrait(trait: AncestryTrait, ancestries: ReadonlySet<string>): boolean {
  if (!ancestries.has(trait.ancestry)) return false;
  if (trait.name === 'Small-Sized') return ['Gnome', 'Halfling'].includes(trait.ancestry);
  return (trait.ancestry === 'Beastborn' && trait.name === 'Beastkind')
    || (trait.ancestry === 'Dragonborn' && trait.name === 'Draconic Origin')
    || (trait.ancestry === 'Fiendborn' && trait.name === 'Fiendish Origin');
}

export function spellIsAvailableToClass(
  className: string,
  spell: Pick<Spell, 'school' | 'source' | 'tags'>,
  fixedSpellSource?: string,
  selectedSpellSource = '',
  selectedSpellSchools: string[] = [],
  subclass = '',
  featureSpellTags: string[] = [],
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
  if (className === 'Warlock') {
    return selectedSpellSchools.includes(spell.school)
      || (subclass === 'Eldritch' && tags.includes('psychic'));
  }
  if (className === 'Cleric' && featureSpellTags.some((tag) => tags.includes(tag.toLowerCase()))) return true;
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

export type AncestryRulesTag = 'Action' | 'Ancestry Access' | 'Attack' | 'Attribute' | 'Check'
  | 'Condition' | 'Damage' | 'Defense' | 'Health' | 'Mana' | 'Movement' | 'Natural Weapon'
  | 'Resistance' | 'Save' | 'Sense' | 'Size' | 'Spell' | 'Training' | 'Utility'
  | 'Vulnerability';

/** Search/display tags assigned from the actual rule content, with explicit tags for terse traits. */
export function ancestryTraitRulesTags(trait: AncestryTrait): AncestryRulesTag[] {
  const text = `${trait.name} ${trait.description}`;
  const tags = new Set<AncestryRulesTag>();
  if (/\bAP\b|Action|Reaction|Once per (?:Combat|Long Rest)/i.test(text)) tags.add('Action');
  if (/Attack|Weapon/i.test(text)) tags.add('Attack');
  if (/damage/i.test(text)) tags.add('Damage');
  if (/Attribute|Might|Agility|Charisma|Intelligence/i.test(text)) tags.add('Attribute');
  if (/\bCheck/i.test(text)) tags.add('Check');
  if (/Condition|Blinded|Bleeding|Charmed|Dazed|Deafened|Doomed|Frightened|Grappled|Hindered|Impaired|Intimidated|Petrified|Poisoned|Prone|Restrained|Slowed|Stunned|Taunted|Terrified/i.test(text)) tags.add('Condition');
  if (/\bPD\b|\bAD\b|\bMD\b|Armor|Shield|Damage Reduction|\bPDR\b|\bEDR\b/i.test(text)) tags.add('Defense');
  if (/\bHP\b|Heal|Death's Door/i.test(text)) tags.add('Health');
  if (/\bMP\b|Mana/i.test(text)) tags.add('Mana');
  if (/Speed|movement|Climb|Swim|Burrow|Fly|Flying|Glide|Jump|Falling/i.test(text)) tags.add('Movement');
  if (/Natural Weapon/i.test(text)) tags.add('Natural Weapon');
  if (/Resistance/i.test(text)) tags.add('Resistance');
  if (/\bSave/i.test(text)) tags.add('Save');
  if (/Darkvision|Blindsight|Tremorsense|Echolocation|sense|Sight|Vision/i.test(text)) tags.add('Sense');
  if (/\bSize/i.test(text)) tags.add('Size');
  if (/Spell|Cantrip/i.test(text)) tags.add('Spell');
  if (/Combat Training|Mastery/i.test(text)) tags.add('Training');
  if (/Vulnerability/i.test(text)) tags.add('Vulnerability');
  if (['Fallen', 'Redeemed'].includes(trait.name)) tags.add('Ancestry Access');
  if (tags.size === 0) tags.add('Utility');
  return [...tags];
}

export function ancestryTraitSource(trait: Pick<AncestryTrait, 'ancestry' | 'category'>): { title: string; page: number } {
  if (trait.ancestry === 'Psyborn') return { title: 'DC20 Magazine 01 — Psion v2', page: 5 };
  const pageByAncestry: Record<string, number> = {
    Human: 198, Elf: 198, Dwarf: 199, Halfling: 199, Gnome: 200, Orc: 200,
    Dragonborn: 201, Giantborn: 202, Angelborn: 203, Fiendborn: 204,
  };
  return {
    title: 'DC20 Beta 0.10.5',
    page: trait.ancestry === 'Beastborn'
      ? (['Origin', 'Senses', 'Mobility', 'Jumping', 'Flying'].includes(trait.category) ? 205 : 206)
      : pageByAncestry[trait.ancestry] ?? 195,
  };
}

export interface AncestryMechanicalProfile {
  resistances: string[];
  vulnerabilities: string[];
  senses: string[];
  movement: string[];
  defenses: string[];
  conditionalRolls: string[];
  other: string[];
  deathDoorThreshold: number;
  deathDoorActionPoints: number;
}

function unique(values: Array<string | false | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

/** Player-facing mechanical digest for every selected ancestry trait. */
export function ancestryMechanicalProfile(
  character: Pick<Character, 'ancestry' | 'build' | 'speed'>,
  allTraits: AncestryTrait[],
): AncestryMechanicalProfile {
  const traits = selectedAncestryTraits(character, allTraits);
  const has = (name: string) => traits.some((trait) => trait.name === name);
  const choice = (ancestry: string, name: string) => {
    const trait = traits.find((entry) => entry.ancestry === ancestry && entry.name === name);
    return trait ? character.build?.ancestryTraitChoices?.[trait.id]?.[0] : undefined;
  };
  const draconic = choice('Dragonborn', 'Draconic Origin') ?? 'chosen Draconic damage';
  const fiendish = choice('Fiendborn', 'Fiendish Origin') ?? 'chosen Fiendish damage';
  const darkvision = has('Superior Darkvision') ? 20 : has('Darkvision') ? 10 : 0;
  const keenSenses = traits.filter(({ name }) => name === 'Keen Sense')
    .flatMap((trait) => character.build?.ancestryTraitChoices?.[trait.id] ?? []);
  const conditionalRolls = traits.filter((trait) => /\b(?:ADV|DisADV)\b/.test(trait.description))
    .map((trait) => `${trait.name}: ${trait.description}`);
  const covered = new Set([
    'Attribute Increase', 'Attribute Decrease', 'Might Attribute Decrease', 'Agility Attribute Decrease',
    'Charisma Attribute Decrease', 'Intelligence Attribute Decrease', 'Skill Expertise', 'Trade Expertise',
    'Tough', 'Frail', 'Mana Increase', 'Quick Reactions', 'Brittle', 'Reckless', 'Strong Minded',
    'Thick-Skinned', 'Hard Shell', 'Small-Sized', 'Powerful Build', 'Speed Increase', 'Short-Legged',
    'Natural Combatant', 'Darkvision', 'Superior Darkvision', 'Minor Tremorsense', 'Echolocation',
    'Keen Sense', 'Draconic Resistance', 'Fiendish Resistance', 'Radiant Resistance', 'Psychic Resistance',
    'Strong-Minded', 'Toxic Fortitude', 'Lightning Insulation', 'Cold Resistance', 'Fire Resistance',
    'Cursed Mind', 'Umbral Weakness', 'Radiant Weakness', 'Climb Speed', 'Swim Speed', 'Burrow Speed',
    'Glide Speed', 'Limited Flight', 'Full Flight', 'Natural Armor', 'Human Resolve', 'Orcish Resolve',
  ]);
  return {
    resistances: unique([
      has('Radiant Resistance') && 'Radiant Resistance (Half)',
      has('Psychic Resistance') && 'Psychic Resistance (Half)',
      has('Strong-Minded') && 'Psychic Resistance (1)',
      has('Toxic Fortitude') && 'Poison Resistance (Half)',
      has('Lightning Insulation') && 'Lightning Resistance (Half)',
      has('Cold Resistance') && 'Cold Resistance (Half)',
      has('Fire Resistance') && 'Fire Resistance (Half)',
      has('Halfling Endurance') && 'Exhaustion Resistance',
      has('Draconic Resistance') && `${draconic} Resistance (Half)`,
      has('Fiendish Resistance') && `${fiendish} Resistance (Half)`,
    ]),
    vulnerabilities: unique([
      has('Cursed Mind') && 'Psychic Vulnerability (1)',
      has('Umbral Weakness') && 'Umbral Vulnerability (1)',
      has('Radiant Weakness') && 'Radiant Vulnerability (1)',
    ]),
    senses: unique([
      darkvision > 0 && `Darkvision ${darkvision} Spaces`,
      has('Minor Tremorsense') && 'Tremorsense 3 Spaces',
      has('Echolocation') && '1 AP: Blindsight in a 10 Space radius until your next turn',
      ...keenSenses.map((sense) => `Keen ${sense}: ADV on Awareness Checks using it`),
    ]),
    movement: unique([
      has('Climb Speed') && `Climb Speed ${character.speed} Spaces`,
      has('Swim Speed') && `Swim Speed ${character.speed} Spaces; Breath Duration +3`,
      has('Burrow Speed') && `Burrow Speed ${Math.floor(character.speed / 2)} Spaces`,
      has('Glide Speed') && 'Glide Speed; no Controlled Falling damage; descend 4 Spaces at turn end',
      has('Limited Flight') && 'Limited Flight: ascend 1 Space per 2 movement; can Hover',
      has('Full Flight') && `Fly Speed ${character.speed} Spaces`,
    ]),
    defenses: unique([
      has('Natural Armor') && 'PDR while not wearing Armor',
      has('Hard Shell') && '+1 AD while unarmored; immune to Flanking; Speed −1',
      has('Powerful Build') && 'Size increases by 1; occupy the Space of a creature 1 Size smaller',
      has('Strong Minded') && '+1 legacy MD, routed to Area Defense in the Beta 0.10.5 defense model',
    ]),
    conditionalRolls,
    other: traits.filter((trait) => !covered.has(trait.name) && !conditionalRolls.some((line) => line.startsWith(`${trait.name}:`)))
      .map((trait) => `${trait.name}: ${trait.description}`),
    deathDoorThreshold: -4 - Number(has('Human Resolve')),
    deathDoorActionPoints: 4 + Number(has('Orcish Resolve')),
  };
}

function traitCount(character: Pick<Character, 'build' | 'ancestry'>, traits: AncestryTrait[], name: string): number {
  return traits.filter((trait) => trait.name === name)
    .reduce((sum, trait) => sum + ancestryTraitSelectionCount(character, trait), 0);
}

export interface CharacterCombatTraining {
  categories: string[];
  weaponTraining: boolean;
  spellFocusTraining: boolean;
  lightArmorTraining: boolean;
  heavyArmorTraining: boolean;
  lightShieldTraining: boolean;
  heavyShieldTraining: boolean;
  pactWeaponTraining: boolean;
  pactArmorTraining: boolean;
}

/** Combat-equipment training granted by class paths, talents, ancestry, and selected class features. */
export function characterCombatTraining(
  character: Pick<Character, 'class' | 'ancestry' | 'build'>,
  classReference: ClassReference,
  allTraits: AncestryTrait[] = [],
): CharacterCombatTraining {
  const path = classReference.pathDetails;
  const talents = new Set(character.build?.selectedTalents ?? []);
  const choices = character.build?.classFeatureSelections ?? {};
  const domains = new Set(character.class === 'Cleric' ? choices['cleric.domains'] ?? [] : []);
  const disciplines = new Set(character.class === 'Spellblade' ? spellbladeDisciplineNames(character) : []);
  const pactBoons = new Set(character.class === 'Warlock' ? choices['warlock.boon'] ?? [] : []);
  const naturalCombatant = allTraits.length > 0
    && selectedAncestryTraits(character, allTraits).some(({ name }) => name === 'Natural Combatant');
  const martialExpansion = talents.has('Martial Expansion');
  const allArmor = path.includes('All Armor');
  const allShields = path.includes('All Shields');
  const weaponTraining = path.includes('Combat Training: Weapons') || martialExpansion || domains.has('War');
  const spellFocusTraining = path.includes('Spell Focuses') || talents.has('Spellcasting Expansion');
  const lightArmorTraining = allArmor || path.includes('Light Armor');
  const heavyArmorTraining = allArmor || path.includes('Heavy Armor') || martialExpansion || naturalCombatant || domains.has('Peace') || disciplines.has('Warrior');
  const lightShieldTraining = allShields || path.includes('Light Shields') || martialExpansion || naturalCombatant;
  const heavyShieldTraining = allShields || path.includes('Heavy Shields') || martialExpansion || naturalCombatant || domains.has('Peace') || disciplines.has('Warrior');
  const pactWeaponTraining = pactBoons.has('Pact Weapon');
  const pactArmorTraining = pactBoons.has('Pact Armor');
  return {
    categories: [
      weaponTraining && 'Weapons',
      spellFocusTraining && 'Spell Focuses',
      lightArmorTraining && 'Light Armor',
      heavyArmorTraining && 'Heavy Armor',
      lightShieldTraining && 'Light Shields',
      heavyShieldTraining && 'Heavy Shields',
      pactWeaponTraining && 'Chosen Pact Weapon',
      pactArmorTraining && 'Chosen Pact Armor',
    ].filter((entry): entry is string => Boolean(entry)),
    weaponTraining,
    spellFocusTraining,
    lightArmorTraining,
    heavyArmorTraining,
    lightShieldTraining,
    heavyShieldTraining,
    pactWeaponTraining,
    pactArmorTraining,
  };
}

export interface EquippedCombatModifiers {
  spellCheckBonus: number;
  spellAttackBonus: number;
  spellAttackDamageBonus: number;
  attackAndSpellDisadvantage: number;
  agilityCheckDisadvantage: number;
  physicalDamageReduction: boolean;
  elementalDamageReduction: boolean;
  mysticalDamageReduction: boolean;
  unarmedHeavyHitDamageBonus: number;
  immuneToFlanking: boolean;
  focusProperties: string[];
  mountedShieldDefense: { physicalDefense: number; areaDefense: number } | null;
}

/** Roll-facing modifiers from equipped armor, shields, and trained Spell Focuses. */
export function equippedCombatModifiers(
  character: Character,
  catalog: EquipmentCatalogItem[],
  classReference: ClassReference,
  allTraits: AncestryTrait[] = [],
): EquippedCombatModifiers {
  const training = characterCombatTraining(character, classReference, allTraits);
  const equipped = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped)
    .flatMap(({ equipmentID }) => catalog.filter(({ id }) => id === equipmentID));
  const focuses = training.spellFocusTraining ? equipped.filter(({ category }) => category === 'Spell Focuses') : [];
  const untrainedGear = equipped.filter((item) => {
    if (item.category === 'Armor') {
      if (training.pactArmorTraining) return false;
      return item.subtype === 'Heavy Armor' ? !training.heavyArmorTraining : !training.lightArmorTraining;
    }
    if (item.category === 'Shields') return item.subtype === 'Heavy Shield' ? !training.heavyShieldTraining : !training.lightShieldTraining;
    return false;
  }).length;
  const heavyGear = equipped.filter(({ subtype }) => subtype === 'Heavy Armor' || subtype === 'Heavy Shield').length;
  const equippedArmor = equipped.find(({ category }) => category === 'Armor');
  const armorProfile = equippedArmor ? defensiveEquipmentProfile(equippedArmor) : null;
  const equippedShields = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped)
    .flatMap((inventory) => catalog.filter(({ id, category }) => id === inventory.equipmentID && category === 'Shields')
      .map((item) => ({ inventory, item, profile: defensiveEquipmentProfile(item) })));
  const selectedShieldID = character.build?.sheetFeatureSelections?.['equipment.activeShield'];
  const activeShield = equippedShields.find(({ inventory }) => inventory.id === selectedShieldID)
    ?? equippedShields.reduce<(typeof equippedShields)[number] | undefined>((best, candidate) => (
      !best || candidate.profile.physicalDefense + candidate.profile.areaDefense > best.profile.physicalDefense + best.profile.areaDefense ? candidate : best
    ), undefined);
  const hasPactArmor = character.class === 'Warlock'
    && (character.build?.classFeatureSelections?.['warlock.boon'] ?? []).includes('Pact Armor')
    && Boolean(equippedArmor);
  const focusProperties = Array.from(new Set(focuses.flatMap(({ properties }) => properties.filter((property) => property !== 'Two-Handed'))));
  return {
    spellCheckBonus: focuses.filter(({ properties }) => properties.includes('Channeling')).length,
    spellAttackBonus: focuses.filter(({ properties }) => properties.includes('Vicious')).length,
    spellAttackDamageBonus: focuses.filter(({ properties }) => properties.includes('Powerful')).length,
    attackAndSpellDisadvantage: untrainedGear > 0 ? -untrainedGear : 0,
    agilityCheckDisadvantage: heavyGear > 0 ? -heavyGear : 0,
    physicalDamageReduction: Boolean(armorProfile?.physicalDamageReduction),
    elementalDamageReduction: Boolean(armorProfile?.elementalDamageReduction),
    mysticalDamageReduction: hasPactArmor || focuses.some(({ properties }) => properties.includes('Warded')),
    unarmedHeavyHitDamageBonus: Number(Boolean(equippedArmor?.subtype === 'Heavy Armor' || equipped.some(({ name }) => name === 'Gauntlet'))),
    immuneToFlanking: equipped.filter(({ category }) => category === 'Shields').length >= 2,
    focusProperties,
    mountedShieldDefense: activeShield?.item.properties.includes('Mounted')
      ? { physicalDefense: activeShield.profile.physicalDefense, areaDefense: activeShield.profile.areaDefense }
      : null,
  };
}

function equipmentBonuses(character: Character, catalog: EquipmentCatalogItem[], training: CharacterCombatTraining) {
  const equipped = (character.inventoryItems ?? [])
    .filter((entry) => entry.isEquipped)
    .flatMap((entry) => catalog.filter((item) => item.id === entry.equipmentID));
  const equippedArmor = equipped.find((item) => item.category === 'Armor');
  const armor = equippedArmor ? defensiveEquipmentProfile(equippedArmor) : null;
  // The Beta allows multiple wielded Shields but grants the bonuses of only one.
  // Choose the strongest combined published bonus; ties preserve inventory order.
  const equippedShields = (character.inventoryItems ?? []).filter(({ isEquipped }) => isEquipped)
    .flatMap((inventory) => catalog.filter(({ id, category }) => id === inventory.equipmentID && category === 'Shields')
      .map((item) => ({ inventory, profile: defensiveEquipmentProfile(item) })));
  const selectedShieldID = character.build?.sheetFeatureSelections?.['equipment.activeShield'];
  const shield = equippedShields.find(({ inventory }) => inventory.id === selectedShieldID)?.profile
    ?? equippedShields.map(({ profile }) => profile)
      .reduce<ReturnType<typeof defensiveEquipmentProfile> | null>((best, candidate) => (
        !best || candidate.physicalDefense + candidate.areaDefense > best.physicalDefense + best.areaDefense ? candidate : best
      ), null);
  const focusAD = training.spellFocusTraining
    ? equipped.filter((item) => item.category === 'Spell Focuses' && item.properties.includes('Protective')).length : 0;
  const focusMDR = training.spellFocusTraining
    && equipped.some((item) => item.category === 'Spell Focuses' && item.properties.includes('Warded')) ? 1 : 0;
  const weaponPD = equipped.filter((item) => item.category === 'Weapons' && item.properties.includes('Guard')).length;
  return {
    pd: (armor?.physicalDefense ?? 0) + (shield?.physicalDefense ?? 0) + weaponPD,
    ad: (armor?.areaDefense ?? 0) + (shield?.areaDefense ?? 0) + focusAD,
    physicalDR: Number(Boolean(armor?.physicalDamageReduction || shield?.physicalDamageReduction)),
    elementalDR: Number(Boolean(armor?.elementalDamageReduction || shield?.elementalDamageReduction)),
    mysticalDR: focusMDR,
    hasArmor: Boolean(equippedArmor),
    speedPenalty: (armor?.speedPenalty ?? 0) + equippedShields.reduce((sum, { profile }) => sum + profile.speedPenalty, 0),
    isUnarmored: !equippedArmor,
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
  elementalDR: number;
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
  const training = characterCombatTraining(character, classReference, allTraits);
  const equipment = equipmentBonuses(character, equipmentCatalog, training);
  const totals = classTableTotals(classReference, character.level);
  const paths = Object.values(character.build?.pathProgressionChoices ?? {});
  const martialPaths = paths.filter((path) => path === 'Martial').length;
  const spellcasterPaths = paths.filter((path) => path === 'Spellcaster').length;
  const manaTraits = traitCount(character, chosenTraits, 'Mana Increase');
  const ancestryHP = traitCount(character, chosenTraits, 'Tough') - traitCount(character, chosenTraits, 'Frail') * 2;
  const ancestryPD = -traitCount(character, chosenTraits, 'Reckless')
    + (equipment.isUnarmored ? traitCount(character, chosenTraits, 'Quick Reactions') : 0);
  // Gnome Strong-Minded grants Psychic Resistance (1); only the Psyborn
  // supplement's unhyphenated Strong Minded grants the legacy +1 MD/AD.
  const ancestryAD = -traitCount(character, chosenTraits, 'Brittle')
    + traitCount(character, chosenTraits, 'Strong Minded')
    + (equipment.isUnarmored ? traitCount(character, chosenTraits, 'Thick-Skinned') + traitCount(character, chosenTraits, 'Hard Shell') : 0);
  const classPD = equipment.isUnarmored && character.class === 'Monk' ? 2 : 0;
  const classAD = equipment.isUnarmored && character.class === 'Barbarian' ? 2 : 0;
  const warlockPactBoons = new Set(character.class === 'Warlock'
    ? character.build?.classFeatureSelections?.['warlock.boon'] ?? []
    : []);
  const pactArmorActive = equipment.hasArmor && warlockPactBoons.has('Pact Armor');
  const classFeatureHP = character.class === 'Warlock' && character.level >= 5 ? 2 : 0;
  const classSpeed = character.class === 'Barbarian' ? 1
    : character.class === 'Monk' ? (character.level >= 5 ? 2 : 1) : 0;
  const disciplines = new Set(spellbladeDisciplineNames(character));
  const clericDomains = character.class === 'Cleric'
    ? character.build?.classFeatureSelections?.['cleric.domains'] ?? [] : [];
  const clericMagicDomains = clericDomains.filter((domain) => domain === 'Magic').length;
  const selectedTalents = character.build?.selectedTalents ?? [];
  const featureMana = character.class === 'Sorcerer' ? (character.level >= 5 ? 2 : 1)
    : character.class === 'Spellblade' && disciplines.has('Magus') ? 1
      : clericMagicDomains;
  const skillFeaturePoints = character.class === 'Bard'
    ? (character.level >= 5 ? 4 : 2) + selectedTalents.filter((name) => name === 'Expanded Repertoire').length * 2
    : character.class === 'Rogue' ? (character.level >= 5 ? 2 : 1)
      : character.class === 'Cleric' && clericDomains.includes('Knowledge') ? 2 : 0;
  const skillConversions = character.build?.skillPointsConvertedToTrades ?? 0;
  const tradeConversions = character.build?.tradePointsConvertedToLanguages ?? 0;
  const skillTalentPoints = selectedTalents.filter((name) => name === 'Skill Increase').length * 4;
  const paragonTradePoints = character.subclass === 'Paragon' && character.level >= 3 ? 1 : 0;

  return {
    effectiveAttributes,
    primeModifier,
    combatMastery: mastery,
    maxHP: Math.max(1, classHealth(character.class, character.level) + effectiveAttributes.Might + ancestryHP + classFeatureHP),
    maxStamina: totals.stamina + martialPaths,
    maxMana: totals.mana + spellcasterPaths * 3 + manaTraits + featureMana,
    physicalDefense: 8 + mastery + effectiveAttributes.Agility + effectiveAttributes.Intelligence + equipment.pd + ancestryPD + classPD,
    arcaneDefense: 8 + mastery + effectiveAttributes.Might + effectiveAttributes.Charisma + equipment.ad + ancestryAD + classAD + Number(pactArmorActive),
    speed: Math.max(0, 5 + traitCount(character, chosenTraits, 'Speed Increase') - traitCount(character, chosenTraits, 'Short-Legged')
      - traitCount(character, chosenTraits, 'Hard Shell') - equipment.speedPenalty + classSpeed),
    saveDC: 10 + primeModifier + mastery,
    martialCheck: primeModifier + mastery,
    spellCheck: primeModifier + mastery,
    skillPointBudget: Math.max(0, 5 + effectiveAttributes.Intelligence + totals.skill + skillFeaturePoints + skillTalentPoints - skillConversions),
    tradePointBudget: Math.max(0, 3 + totals.trade + paragonTradePoints + skillConversions * 2 - tradeConversions),
    languagePointBudget: 2 + tradeConversions * 2,
    ancestryPointBudget: ancestryPointBudget(character),
    spellLimit: totals.spells + spellcasterPaths
      + selectedTalents.filter((name) => name === 'Spellcasting Expansion').length * 3
      + Number(character.class === 'Spellblade' && disciplines.has('Magus')),
    cantripLimit: totals.cantrips,
    maneuverLimit: totals.maneuvers + martialPaths
      + selectedTalents.filter((name) => name === 'Martial Expansion').length * 2
      + Number(character.class === 'Spellblade' && disciplines.has('Warrior')),
    physicalDR: Math.max(equipment.physicalDR, Number(equipment.isUnarmored && traitCount(character, chosenTraits, 'Natural Armor') > 0)),
    elementalDR: equipment.elementalDR,
    mysticalDR: equipment.mysticalDR + Number(pactArmorActive),
    size: (() => {
      const sizeOrder = ['Tiny', 'Small', 'Medium', 'Large', 'Huge'];
      const baseIndex = chosenTraits.some((trait) => trait.name === 'Small-Sized') ? 1 : 2;
      const increases = traitCount(character, chosenTraits, 'Powerful Build');
      return sizeOrder[Math.min(sizeOrder.length - 1, baseIndex + increases)];
    })(),
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
    ancestryTraitCounts: {},
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
    restPoints: undefined,
    shortRestsTaken: 0,
    sheetConditionLevels: {},
    sheetFeatureStates: {},
    sheetFeatureSelections: {},
    sheetFeatureCounters: {},
    characterNotes: [],
    sheetCompanions: [],
    rollAdjustment: 0,
    isFinalized: false,
  };
}
