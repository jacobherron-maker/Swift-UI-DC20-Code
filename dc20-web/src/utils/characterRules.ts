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
import { hasAutomaticMulticlassFlavor, hasDirectMulticlassFeature, hasMulticlassSubclass, multiclassParagonTalentSlotClasses, multiclassSubclassCount } from './talentRules';

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
export function skillMasteryCap(character: Pick<Character, 'class' | 'level'> & Partial<Pick<Character, 'build'>>): number {
  const hasRoguishFinesse = character.class === 'Rogue'
    || hasDirectMulticlassFeature(character, 'Rogue', 'Roguish Finesse');
  return Math.min(5, masteryCap(character.level) + Number(hasRoguishFinesse));
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

export function ordinaryTalentSlots(className: string, level: number): number {
  const progression = className === 'Psion' ? [2, 4, 7, 10] : [2, 4, 6, 8];
  return progression.filter((entry) => entry <= level).length;
}

export function talentSlots(className: string, level: number, subclass?: string): number {
  const paragon = subclass === 'Paragon' ? [3, 7, 10].filter((entry) => entry <= level).length : 0;
  return ordinaryTalentSlots(className, level) + paragon;
}

/** Every Paragon slot is restricted to a Class Talent from its granting Class. */
export function paragonTalentSlotClasses(
  character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>,
): string[] {
  const native = character.subclass === 'Paragon'
    ? [3, 7, 10].filter((entry) => entry <= character.level).map(() => character.class)
    : [];
  return [...native, ...multiclassParagonTalentSlotClasses(character)];
}

/** Psion v2 lists Talents at 2/4/7/10, but never grants Character Path Progression. */
export function classPathProgressionLevels(className: string, level: number): number[] {
  if (className === 'Psion') return [];
  return [2, 4, 6, 8].filter((entry) => entry <= level);
}

export const BARBARIAN_RAGE_STATE = 'barbarian.rage';
export const BARD_PERFORMANCE_STATE = 'bard.performance.active';
export const DRUID_DOMAIN_ACTIVE = 'druid.domain.active';
export const DRUID_WILD_FORM_ACTIVE = 'druid.wildForm.active';
export const DRUID_WILD_FORM_FREE_USED = 'druid.wildForm.freeUsed';
export const DRUID_WILD_FORM_EXPANSION_USED = 'druid.wildForm.expansionUsed';
export const DRUID_WILD_FORM_EXPANSION_ACTIVE = 'druid.wildForm.expansionActive';
export const DRUID_WILD_FORM_TRAITS = 'druid.wildForm.activeTraits';
export const DRUID_WILD_FORM_SKILLS = 'druid.wildForm.skillfulSkills';
export const DRUID_WILD_FORM_SIZE = 'druid.wildForm.size';
export const DRUID_WILD_FORM_TYPE = 'druid.wildForm.type';
export const DRUID_WILD_FORM_DAMAGE = 'druid.wildForm.damage';
export const DRUID_WILD_FORM_HP = 'druid.wildForm.hp';
export const DRUID_WILD_FORM_EXTRA_MP = 'druid.wildForm.extraMP';
export const DRUID_WILD_FORM_ID = 'druid.wildForm.id';
export const DRUID_WILD_FORM_NAME = 'druid.wildForm.name';
export const DRUID_NATURE_TORRENT_ACTIVE = 'druid.naturesTorrent.active';
export const DRUID_BEAST_TRAIT_PREFIX = 'Beast Trait';
export const HUNTER_MARK_ACTIVE = 'hunter.mark.active';
export const HUNTER_MARK_FIRST_ATTACK_USED = 'hunter.mark.firstAttackUsed';
export const HUNTER_STAMINA_REGEN_USED = 'hunter.staminaRegen.used';
export const HUNTER_CONCOCTION_ACTIVE = 'hunter.concoction.active';
export const HUNTER_TRAPS_AVAILABLE = 'hunter.traps.available';
export const MONK_STANCE_ACTIVE = 'monk.stance.active';
export const MONK_ACTIVE_STANCE = 'monk.stance.name';
export const MONK_STAMINA_REGEN_USED = 'monk.staminaRegen.used';
export const MONK_KI_CURRENT = 'monk.ki.current';
export const MONK_ASTRAL_SELF_ACTIVE = 'monk.astralSelf.active';
export const MONK_MEDITATION_SKILL = 'monk.meditation.skill';
export const MONK_MEDITATION_PENDING = 'monk.meditation.pendingSkill';
export const MONK_EXPANDED_STANCE_USED = 'monk.expandedStances.usedThisTurn';
export const MONK_BEAR_ADVANTAGE = 'monk.bear.nextAttackAdvantage';
export const MONK_MANTIS_GRAPPLE_AP = 'monk.mantis.grappleAP';
export const MONK_FLURRY_USED = 'monk.flurry.usedThisTurn';
export const MONK_COBRA_REVENGE = 'monk.cobra.damagedByTarget';
export const MONK_MONGOOSE_FLANKED = 'monk.mongoose.flanked';
export const SORCERER_OVERLOAD_ACTIVE = 'sorcerer.overload.active';
export const SORCERER_OVERLOAD_EXHAUSTION = 'sorcerer.overload.exhaustion';
export const SORCERER_WILD_NEXT_ADVANTAGE = 'sorcerer.wildMagic.nextSpellAdvantage';
export const SORCERER_WILD_OUTCOME = 'sorcerer.wildMagic.outcome';
export const SORCERER_WILD_FORM_HP = 'sorcerer.wildMagic.formHP';
export const SORCERER_META_FREE_USED = 'sorcerer.metaMagic.freeUsed';
export const SORCERER_META_ACTIVE = 'sorcerer.metaMagic.active';
export const SORCERER_CELESTIAL_LIGHT_ACTIVE = 'sorcerer.celestialLight.active';
export const SORCERER_CELESTIAL_OVERLOAD_USED = 'sorcerer.celestialOverload.used';
export const PSION_MIND_SENSE_ACTIVE = 'psion.mindSense.active';
export const PSION_INVASION_ACTIVE = 'psion.invadeMind.active';
export const PSION_AP_ENHANCEMENT_SP = 'psion.psionicMind.apEnhancementSP';
export const PSION_DAZE_PENDING = 'psion.psionicSpell.daze';
export const PSION_DISRUPTION_PENDING = 'psion.psionicSpell.disruption';
export const PSION_COMPONENTLESS_PENDING = 'psion.psionicSpell.componentless';
export const WIZARD_SIGNATURE_ACTIVE = 'wizard.signature.activeSchool';
export const WIZARD_SIGNATURE_USED_PREFIX = 'wizard.signature.used.';
export const WIZARD_MANA_LIMIT_BREAK_READY = 'wizard.manaLimitBreak.ready';
export const WIZARD_MANA_LIMIT_BREAK_USED = 'wizard.manaLimitBreak.used';
export const WIZARD_PREPARED_DUEL_ACTIVE = 'wizard.preparedSpell.duelActive';
export const WIZARD_PREPARED_ACTIVE = 'wizard.preparedSpell.active';
export const WIZARD_SIGIL_ACTIVE = 'wizard.sigil.active';
export const WIZARD_SIGIL_INSIDE = 'wizard.sigil.inside';
export const WIZARD_SIGIL_PORTAL = 'wizard.sigil.portal';
export const WIZARD_SIGIL_BOUND_SELF = 'wizard.sigil.boundSelf';
export const WIZARD_SIGIL_TAGS = 'wizard.sigil.tags';
export const WIZARD_SIGIL_DIAMETER = 'wizard.sigil.diameter';
export const WIZARD_HEX_PENDING = 'wizard.hex.pending';
export const WIZARD_HEX_ACTIVE = 'wizard.hex.active';

export function wizardSchoolSpellSelectionKey(school: string): string {
  return `wizard.schoolSpells.${school}`;
}

export function wizardSchoolSpellGrantLimit(level: number): number {
  return level >= 5 ? 3 : 2;
}

export function druidBeastTraitSelection(name: string, cost: number): string {
  return `${DRUID_BEAST_TRAIT_PREFIX} (${cost}) — ${name}`;
}

export function druidBeastTraitName(selection: string): string | null {
  const match = selection.match(/^Beast Trait \((\d+)\) — (.+)$/);
  return match?.[2] ?? null;
}

export function druidWildFormTraitCost(selection: string): number {
  const dedicated = DRUID_WILD_FORM_TRAIT_OPTIONS.find(({ name }) => name === selection);
  if (dedicated) return dedicated.cost;
  const match = selection.match(/^Beast Trait \((\d+)\) — .+$/);
  return match ? Number(match[1]) : 0;
}

export const DRUID_WILD_FORM_TRAIT_OPTIONS: Array<{
  name: string;
  cost: number;
  description: string;
  repeatable?: boolean;
  maximumCount?: number;
}> = [
  { name: 'Size — Tiny', cost: 2, description: 'Your size changes to Tiny.' },
  { name: 'Size — Large', cost: 2, description: 'Your size changes to Large.' },
  { name: 'Attribute Increase — Might', cost: 1, repeatable: true, description: 'You gain +2 to Might, up to your Attribute Limit.' },
  { name: 'Attribute Increase — Agility', cost: 1, repeatable: true, description: 'You gain +2 to Agility, up to your Attribute Limit.' },
  { name: 'Defensive — PD', cost: 1, repeatable: true, description: 'Your PD increases by 2.' },
  { name: 'Defensive — AD', cost: 1, repeatable: true, description: 'Your AD increases by 2.' },
  { name: 'Healthy', cost: 1, repeatable: true, description: 'You gain +2 maximum HP.' },
  ...['Bludgeoning', 'Piercing', 'Slashing', 'Cold', 'Corrosion', 'Fire', 'Lightning', 'Poison'].map((damage) => ({
    name: `Resistance — ${damage}`,
    cost: 1,
    repeatable: true,
    description: `You gain Resistance (1) to ${damage} damage.`,
  })),
  { name: 'Skillful', cost: 1, repeatable: true, description: 'You gain Skill Mastery in 2 eligible Skills, up to your Skill Mastery Cap. A Skill already at the cap gains ADV instead.' },
  { name: 'Swift', cost: 1, repeatable: true, maximumCount: 5, description: 'Your Speed is increased by 1 Space.' },
];

export const DRUID_WILD_FORM_SKILL_OPTIONS = [
  'Acrobatics', 'Animal', 'Athletics', 'Awareness', 'Intimidation', 'Stealth', 'Survival',
];

export interface DruidWildFormProfile {
  active: boolean;
  traitPointBudget: number;
  traitPointsSpent: number;
  maximumHP: number;
  currentHP: number;
  physicalDefense: number;
  areaDefense: number;
  speed: number;
  size: string;
  creatureType: string;
  might: number;
  agility: number;
  naturalWeaponDamageType: string;
  damageTypes: string[];
  resistances: string[];
  skillMasteries: string[];
  beastTraits: string[];
  physicalDamageReduction: boolean;
  elementalDamageReduction: boolean;
  shellRetreatAvailable: boolean;
  shellRetreatActive: boolean;
  bleedingImmune: boolean;
}

/** Live Wild Form statistics; the selected traits are chosen when the Druid transforms. */
export function druidWildFormProfile(character: Pick<Character, 'class' | 'level' | 'primeModifier' | 'combatMastery' | 'subclass' | 'build'>): DruidWildFormProfile {
  const build = character.build;
  const ownsWildForm = character.class === 'Druid' || hasDirectMulticlassFeature(character, 'Druid', 'Wild Form');
  const expertDruid = (character.class === 'Druid' && character.level >= 5)
    || hasDirectMulticlassFeature(character, 'Druid', 'Expert Druid');
  const phoenix = (character.class === 'Druid' && character.subclass === 'Phoenix')
    || hasMulticlassSubclass(character, 'Druid', 'Phoenix');
  const rampantGrowth = (character.class === 'Druid' && character.subclass === 'Rampant Growth')
    || hasMulticlassSubclass(character, 'Druid', 'Rampant Growth');
  const selections = build?.classFeatureSelections?.[DRUID_WILD_FORM_TRAITS] ?? [];
  const count = (name: string) => selections.filter((selection) => selection === name).length;
  const beastTraits = selections.map(druidBeastTraitName).filter((name): name is string => Boolean(name));
  const beastCount = (name: string) => beastTraits.filter((trait) => trait === name).length;
  const shellRetreatAvailable = beastCount('Shell Retreat') > 0;
  const shellRetreatActive = shellRetreatAvailable && Boolean(build?.sheetFeatureStates?.['ancestry.shellRetreat.active']);
  const extraMP = Math.max(0, Math.trunc(build?.sheetFeatureCounters?.[DRUID_WILD_FORM_EXTRA_MP] ?? 0));
  const expansion = Number(Boolean(build?.sheetFeatureStates?.[DRUID_WILD_FORM_EXPANSION_ACTIVE]));
  const traitPointBudget = 3 + Number(expertDruid) + extraMP * 2 + expansion * 2;
  const traitPointsSpent = selections.reduce((total, selection) => (
    total + druidWildFormTraitCost(selection)
  ), 0);
  const maximumHP = 3 + Number(expertDruid) + count('Healthy') * 2 + beastCount('Tough');
  const baseSize = build?.sheetFeatureSelections?.[DRUID_WILD_FORM_SIZE] ?? 'Medium';
  const size = count('Size — Tiny') > 0 ? 'Tiny' : count('Size — Large') > 0 ? 'Large' : baseSize;
  const creatureType = build?.sheetFeatureSelections?.[DRUID_WILD_FORM_TYPE] ?? 'Beast';
  const selectedDamage = build?.sheetFeatureSelections?.[DRUID_WILD_FORM_DAMAGE] ?? 'Bludgeoning';
  const resistances = selections.filter((selection) => selection.startsWith('Resistance — '))
    .map((selection) => `${selection.slice('Resistance — '.length)} (1)`);
  if (beastCount('Cold Resistance')) resistances.push('Cold Resistance (Half)');
  if (beastCount('Fire Resistance')) resistances.push('Fire Resistance (Half)');
  if (beastCount('Toxic Fortitude')) resistances.push('Poison Resistance (Half)');
  if (phoenix && creatureType === 'Elemental (Fire)') resistances.push('Fire (1)');
  return {
    active: ownsWildForm && Boolean(build?.sheetFeatureStates?.[DRUID_WILD_FORM_ACTIVE]),
    traitPointBudget,
    traitPointsSpent,
    maximumHP,
    currentHP: Math.min(maximumHP, Math.max(0, Math.trunc(build?.sheetFeatureCounters?.[DRUID_WILD_FORM_HP] ?? maximumHP))),
    physicalDefense: 8 + character.combatMastery + character.primeModifier + count('Defensive — PD') * 2
      + beastCount('Quick Reactions') + Number(shellRetreatActive) * 5,
    areaDefense: 8 + character.combatMastery + character.primeModifier + count('Defensive — AD') * 2
      + beastCount('Thick-Skinned') + beastCount('Hard Shell') + Number(shellRetreatActive) * 5,
    speed: shellRetreatActive ? 0 : Math.max(0, 5 + count('Swift') + beastCount('Speed Increase') - beastCount('Hard Shell')),
    size,
    creatureType,
    might: Math.min(attributeCap(character.level), 1 + count('Attribute Increase — Might') * 2),
    agility: Math.min(attributeCap(character.level), 1 + count('Attribute Increase — Agility') * 2),
    naturalWeaponDamageType: selectedDamage,
    damageTypes: Array.from(new Set(['Bludgeoning', 'Piercing', 'Slashing', ...(phoenix ? ['Fire'] : []), ...(rampantGrowth ? ['Poison'] : [])])),
    resistances: Array.from(new Set(resistances)),
    skillMasteries: (build?.classFeatureSelections?.[DRUID_WILD_FORM_SKILLS] ?? []).slice(0, count('Skillful') * 2),
    beastTraits,
    physicalDamageReduction: beastCount('Natural Armor') > 0 || shellRetreatActive,
    elementalDamageReduction: shellRetreatActive,
    shellRetreatAvailable,
    shellRetreatActive,
    bleedingImmune: rampantGrowth && creatureType === 'Plant',
  };
}

export interface CharacterSheetEffects {
  physicalDefense: number;
  areaDefense: number;
  speed: number;
  saveAdvantage: Partial<Record<DC20Attribute, number>>;
  martialMeleeDamageBonus: number;
  resistances: string[];
}

export const SORCERER_WILD_MAGIC_OUTCOMES = [
  'You turn into a small creature with the stats of a Sheep (HP 2, PD & AD 5, Melee Attack +2, Damage 1).',
  'A wave of magic explodes out from you. You take True damage equal to your Prime Modifier and creatures within 5 Spaces must succeed a Physical Save against your Save DC or take the same amount of damage.',
  'You are Stunned 3.',
  'You are overcome by a wave of lethargy. You have DisADV on all Checks and Saves.',
  'You are Stunned 1.',
  'You are Blinded and Deafened.',
  'All living creatures become Invisible to you.',
  'You gain a d4 penalty on all Checks and Saves.',
  'You grow by 1 Size, become 2 times heavier, and your Speed is reduced by 2.',
  'A strong gravitational pull originates from you. All creatures within 5 Spaces must make a Might Save or be pulled 4 Spaces toward you.',
  'Forceful winds shoot out from you in all directions. All creatures within 5 Spaces (except you) must make a Might Save or be pushed 4 Spaces away from you.',
  'You grow by 1 Size, become one and a half times heavier, and your Speed is increased by 2.',
  'You gain a d4 bonus to all Checks and Saves.',
  'You gain a Truesight of 10 Spaces.',
  'You become Invisible.',
  'Your maximum AP increases by 1 and you gain 1 AP.',
  'You become energized. You have ADV on all Checks and Saves.',
  'You gain a surge of power, granting you +5 to all Spell Checks you make.',
  'You overflow with life energy. You and creatures within 5 Spaces regain HP equal to your Prime Modifier.',
  'You turn into a large creature with the stats of a Young Purple Dragon, but without a Breath Weapon (HP 30, PD & AD 16, Attack +10, Damage 4, Fly Speed 6).',
] as const;

export function sorcererWildMagicOutcome(roll: number): string {
  return SORCERER_WILD_MAGIC_OUTCOMES[Math.min(20, Math.max(1, Math.trunc(roll))) - 1];
}

export function sorcererDraconicDamageType(
  character: Pick<Character, 'class' | 'subclass' | 'ancestry' | 'build'>,
  traits: AncestryTrait[] = [],
): string | undefined {
  const draconic = (character.class === 'Sorcerer' && character.subclass === 'Draconic')
    || hasMulticlassSubclass(character, 'Sorcerer', 'Draconic');
  if (!draconic) return undefined;
  const ancestryOrigin = selectedAncestryTraits(character, traits).find(({ ancestry, name }) => ancestry === 'Dragonborn' && name === 'Draconic Origin');
  return (ancestryOrigin ? character.build?.ancestryTraitChoices?.[ancestryOrigin.id]?.[0] : undefined)
    ?? character.build?.ancestryTraitChoices?.['Dragonborn|Draconic Origin']?.[0]
    ?? character.build?.classFeatureSelections?.['sorcerer.draconicOrigin']?.[0];
}

export interface SorcererWildMagicProfile {
  outcome: number;
  description: string;
  allCheckSaveAdjustment: number;
  allCheckSaveDie: number;
  spellCheckBonus: number;
  speedAdjustment: number;
  actionPointMaximumBonus: number;
  transformation: {
    name: 'Sheep' | 'Young Purple Dragon';
    size: 'Small' | 'Large';
    maximumHP: number;
    currentHP: number;
    physicalDefense: number;
    areaDefense: number;
    attackCheck: number;
    damage: number;
    flySpeed?: number;
  } | null;
}

export function sorcererWildMagicProfile(character: Pick<Character, 'class' | 'build'>): SorcererWildMagicProfile {
  const outcome = character.class === 'Sorcerer'
    ? Math.min(20, Math.max(0, Math.trunc(character.build?.sheetFeatureCounters?.[SORCERER_WILD_OUTCOME] ?? 0))) : 0;
  const form = outcome === 1
    ? { name: 'Sheep' as const, size: 'Small' as const, maximumHP: 2, physicalDefense: 5, areaDefense: 5, attackCheck: 2, damage: 1 }
    : outcome === 20
      ? { name: 'Young Purple Dragon' as const, size: 'Large' as const, maximumHP: 30, physicalDefense: 16, areaDefense: 16, attackCheck: 10, damage: 4, flySpeed: 6 }
      : null;
  return {
    outcome,
    description: outcome ? sorcererWildMagicOutcome(outcome) : '',
    allCheckSaveAdjustment: outcome === 17 ? 1 : outcome === 4 ? -1 : 0,
    allCheckSaveDie: outcome === 13 ? 4 : outcome === 8 ? -4 : 0,
    spellCheckBonus: outcome === 18 ? 5 : 0,
    speedAdjustment: outcome === 12 ? 2 : outcome === 9 ? -2 : 0,
    actionPointMaximumBonus: Number(outcome === 16),
    transformation: form ? {
      ...form,
      currentHP: Math.min(form.maximumHP, Math.max(0, Math.trunc(character.build?.sheetFeatureCounters?.[SORCERER_WILD_FORM_HP] ?? form.maximumHP))),
    } : null,
  };
}

/** Records the sheet-facing portion of a Wild Magic result and its next-Spell ADV. */
export function applySorcererWildMagic(character: Character, outcome: number): Character {
  if (character.class !== 'Sorcerer' || !character.build) return character;
  const roll = Math.min(20, Math.max(1, Math.trunc(outcome)));
  const conditions = { ...character.build.sheetConditionLevels };
  if (roll === 3) conditions.Stunned = Math.max(3, conditions.Stunned ?? 0);
  if (roll === 5) conditions.Stunned = Math.max(1, conditions.Stunned ?? 0);
  if (roll === 6) { conditions.Blinded = Math.max(1, conditions.Blinded ?? 0); conditions.Deafened = Math.max(1, conditions.Deafened ?? 0); }
  if (roll === 15) conditions.Invisible = Math.max(1, conditions.Invisible ?? 0);
  const counters: Record<string, number> = { ...character.build.sheetFeatureCounters, [SORCERER_WILD_OUTCOME]: roll };
  if (roll === 1) counters[SORCERER_WILD_FORM_HP] = 2;
  else if (roll === 20) counters[SORCERER_WILD_FORM_HP] = 30;
  else delete counters[SORCERER_WILD_FORM_HP];
  return {
    ...character,
    healthPoints: roll === 2 ? Math.max(0, character.healthPoints - Math.max(0, character.primeModifier))
      : roll === 19 ? Math.min(character.maxHealthPoints, character.healthPoints + Math.max(0, character.primeModifier)) : character.healthPoints,
    currentAP: roll === 16 ? character.currentAP + 1 : character.currentAP,
    build: {
      ...character.build,
      sheetConditionLevels: conditions,
      sheetFeatureStates: { ...character.build.sheetFeatureStates, [SORCERER_WILD_NEXT_ADVANTAGE]: true },
      sheetFeatureCounters: counters,
    },
  };
}

/** Sheet-facing effects that must change live rather than being baked into a character's base statistics. */
export function characterSheetEffects(character: Character): CharacterSheetEffects {
  const isRaging = (character.class === 'Barbarian' || hasDirectMulticlassFeature(character, 'Barbarian', 'Rage'))
    && Boolean(character.build?.sheetFeatureStates?.[BARBARIAN_RAGE_STATE]);
  const selectedRune = ((character.class === 'Spellblade' && character.subclass === 'Rune Knight')
    || hasMulticlassSubclass(character, 'Spellblade', 'Rune Knight'))
    ? character.build?.sheetFeatureSelections?.['spellblade.rune.active']
    : undefined;
  const activeRune = selectedRune && character.build?.classFeatureSelections?.['spellblade.runes']?.includes(selectedRune)
    ? selectedRune : undefined;
  const spellbladeDisciplines = new Set(spellbladeDisciplineNames(character));
  const spellWarderActive = spellbladeDisciplines.has('Spell Warder')
    && Boolean(character.build?.sheetFeatureStates?.['spellblade.spellWarder.active']);
  const spellWarderDamage = character.build?.sheetFeatureSelections?.['spellblade.spellWarder.damage'];
  const spellWarderHalf = (character.build?.sheetFeatureCounters?.['spellblade.spellWarder.half'] ?? 0) > 0;
  const adaptiveDamage = (character.build?.selectedTalents ?? []).includes('Adaptive Bond')
    ? character.build?.sheetFeatureSelections?.['spellblade.boundDamage.current']
      ?? character.build?.classFeatureSelections?.['spellblade.boundDamage']?.[0]
    : undefined;
  const clericDomains = new Set(character.class === 'Cleric' || hasDirectMulticlassFeature(character, 'Cleric', 'Cleric Order')
    ? character.build?.classFeatureSelections?.['cleric.domains'] ?? []
    : []);
  const clericDivineDamage = character.class === 'Cleric' || hasDirectMulticlassFeature(character, 'Cleric', 'Cleric Order')
    ? character.build?.classFeatureSelections?.['cleric.divineDamage']?.[0]
    : undefined;
  const inquisitorResistances = ((character.class === 'Cleric' && character.subclass === 'Inquisitor')
    || hasMulticlassSubclass(character, 'Cleric', 'Inquisitor'))
    ? ['Charmed Condition', 'Intimidated Condition', 'Taunted Condition']
    : [];
  const bardPerformanceActive = (character.class === 'Bard' || hasDirectMulticlassFeature(character, 'Bard', 'Bardic Performance'))
    && Boolean(character.build?.sheetFeatureStates?.[BARD_PERFORMANCE_STATE]);
  const bardPerformanceAppliesToSelf = bardPerformanceActive
    && Boolean(character.build?.sheetFeatureStates?.['bard.performance.selfIncluded']);
  const bardPerformanceEnhanced = ((character.class === 'Bard' && character.level >= 5)
    || hasDirectMulticlassFeature(character, 'Bard', 'Expert Bard'))
    && Boolean(character.build?.sheetFeatureStates?.['bard.performance.enhanced']);
  const bardPerformance = character.build?.sheetFeatureSelections?.['bard.performance.activeChoice'];
  const bardEmotionalCondition = character.build?.sheetFeatureSelections?.['bard.performance.condition'];
  const bardResistances = bardPerformanceAppliesToSelf && bardPerformance === 'Emotional'
    ? bardPerformanceEnhanced
      ? ['Charmed Condition', 'Frightened Condition', 'Intimidated Condition', 'Taunted Condition']
      : bardEmotionalCondition ? [`${bardEmotionalCondition} Condition`] : []
    : [];
  const commanderResistances = ((character.class === 'Commander' && character.subclass === 'Crusader')
    || hasMulticlassSubclass(character, 'Commander', 'Crusader'))
    ? ['Frightened Condition', 'Intimidated Condition'] : [];
  const hunterTerrains = new Set(hunterFavoredTerrainNames(character));
  const hunterConcoctionActive = ((character.class === 'Hunter' && character.subclass === 'Monster Slayer')
    || hasMulticlassSubclass(character, 'Hunter', 'Monster Slayer'))
    && Boolean(character.build?.sheetFeatureStates?.[HUNTER_CONCOCTION_ACTIVE]);
  const hunterConcoction = hunterConcoctionActive
    ? character.build?.sheetFeatureSelections?.['hunter.concoction.name'] : undefined;
  const hunterElementalDamage = character.build?.sheetFeatureSelections?.['hunter.concoction.element'];
  const hunterResistances = [
    hunterTerrains.has('Desert') && 'Fire (Half)',
    hunterTerrains.has('Swamp') && 'Poison (Half)',
    hunterTerrains.has('Tundra') && 'Cold (Half)',
    hunterConcoction === 'Elemental Infusion' && hunterElementalDamage && `${hunterElementalDamage} (1)`,
    hunterConcoction === 'Basilisk Eye' && 'Physical (1)',
    hunterConcoction === 'Aberrant Tumor' && 'Psychic (1)',
    hunterConcoction === 'Deathweed' && 'Umbral (Half)',
    hunterConcoction === 'Divine Water' && 'Radiant (Half)',
  ].filter((entry): entry is string => Boolean(entry));
  const monkStance = (character.class === 'Monk' || hasDirectMulticlassFeature(character, 'Monk', 'Monk Stance')) && character.build?.sheetFeatureStates?.[MONK_STANCE_ACTIVE]
    ? character.build?.sheetFeatureSelections?.[MONK_ACTIVE_STANCE] : undefined;
  const monkCobraDamage = monkStance === 'Cobra Stance' && Boolean(character.build?.sheetFeatureStates?.[MONK_COBRA_REVENGE]);
  const monkMongooseDamage = monkStance === 'Mongoose Stance' && Boolean(character.build?.sheetFeatureStates?.[MONK_MONGOOSE_FLANKED]);
  const sorcererOrigins = new Set(character.class === 'Sorcerer' || hasDirectMulticlassFeature(character, 'Sorcerer', 'Innate Power')
    ? character.build?.classFeatureSelections?.['sorcerer.origin'] ?? [] : []);
  const sorcererOverloaded = (character.class === 'Sorcerer' || hasDirectMulticlassFeature(character, 'Sorcerer', 'Overload Magic'))
    && Boolean(character.build?.sheetFeatureStates?.[SORCERER_OVERLOAD_ACTIVE]);
  const sorcererDraconicDamage = sorcererDraconicDamageType(character);
  const wizardCrownedSigil = (character.build?.selectedTalents ?? []).includes('Crowned Sigil')
    && Boolean(character.build?.sheetFeatureStates?.[WIZARD_SIGIL_ACTIVE])
    && Boolean(character.build?.sheetFeatureStates?.[WIZARD_SIGIL_BOUND_SELF]);
  const wizardOverlyPrepared = (character.build?.selectedTalents ?? []).includes('Overly Prepared Spellcaster');
  const saveAdvantage: Partial<Record<DC20Attribute, number>> = {};
  if (isRaging || monkStance === 'Turtle Stance') saveAdvantage.Might = 1;
  if (monkStance === 'Gazelle Stance') saveAdvantage.Agility = 1;
  const activeSpeed = character.speed
    + (activeRune === 'Lightning Rune' ? 1 : 0)
    + (bardPerformanceAppliesToSelf && bardPerformance === 'Fast Tempo' ? (bardPerformanceEnhanced ? 2 : 1) : 0)
    + Number(monkStance === 'Gazelle Stance')
    + sorcererWildMagicProfile(character).speedAdjustment;
  return {
    physicalDefense: character.physicalDefense - (isRaging ? 5 : 0),
    areaDefense: character.arcaneDefense + Number(wizardCrownedSigil) * 2,
    speed: monkStance === 'Turtle Stance' ? Math.min(character.speed, 1) : activeSpeed,
    saveAdvantage,
    martialMeleeDamageBonus: Number(isRaging) + Number(monkCobraDamage) + Number(monkMongooseDamage),
    resistances: [
      ...(isRaging ? ['Elemental (Half)', 'Physical (Half)'] : []),
      ...(adaptiveDamage ? [`${adaptiveDamage} (1)`] : []),
      ...(spellWarderActive && spellWarderDamage ? [`${spellWarderDamage} (${spellWarderHalf ? 'Half' : '1'})`] : []),
      ...(clericDomains.has('Divine Damage Expansion') && clericDivineDamage ? [`${clericDivineDamage} (1)`] : []),
      ...inquisitorResistances,
      ...bardResistances,
      ...commanderResistances,
      ...hunterResistances,
      ...(monkStance === 'Turtle Stance' ? ['Physical (Half)', 'Elemental (Half)', 'Mystical (Half)'] : []),
      ...(sorcererOrigins.has('Resilient Magic') ? ['Dazed Condition'] : []),
      ...(sorcererOverloaded && ((character.class === 'Sorcerer' && character.subclass === 'Draconic')
        || hasMulticlassSubclass(character, 'Sorcerer', 'Draconic'))
        ? ['Physical (1)', ...(sorcererDraconicDamage ? [`${sorcererDraconicDamage} (1)`] : [])] : []),
      ...(wizardOverlyPrepared ? ['Dazed Condition'] : []),
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

/** Monk Martial Path recovery follows the universal round-up rule for half maximum SP. */
export function monkStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Spiritual Balance matches maximum SP, then Expert Monk increases the maximum by 1. */
export function monkKiMaximum(maximumStamina: number, level: number): number {
  return Math.max(0, maximumStamina) + Number(level >= 5);
}

/** Before Expert Monk, spending SP regains 1 Ki; Expert Monk instead regains half maximum Ki. */
export function monkKiRecoveryAmount(maximumKi: number, level: number): number {
  return level >= 5 ? Math.max(0, Math.ceil(maximumKi / 2)) : Number(maximumKi > 0);
}

/** Bear Stance adds damage only to Heavy-or-higher melee Martial Attack results. */
export function monkMeleeHeavyHitDamageBonus(character: Pick<Character, 'class' | 'build'>): number {
  return Number((character.class === 'Monk' || hasDirectMulticlassFeature(character, 'Monk', 'Monk Stance'))
    && character.build?.sheetFeatureStates?.[MONK_STANCE_ACTIVE]
    && character.build?.sheetFeatureSelections?.[MONK_ACTIVE_STANCE] === 'Bear Stance');
}

/** Applies Spiritual Balance once for a sheet action that spends one or more SP. */
export function applyMonkStaminaSpendRecovery(character: Character, previousStamina: number): Character {
  if (character.class !== 'Monk' || character.level < 2 || character.stamina >= previousStamina || !character.build) return character;
  const maximumKi = monkKiMaximum(character.maxStamina, character.level);
  const currentKi = Math.min(maximumKi, Math.max(0, character.build.sheetFeatureCounters[MONK_KI_CURRENT] ?? maximumKi));
  return {
    ...character,
    build: {
      ...character.build,
      sheetFeatureCounters: {
        ...character.build.sheetFeatureCounters,
        [MONK_KI_CURRENT]: Math.min(maximumKi, currentKi + monkKiRecoveryAmount(maximumKi, character.level)),
      },
    },
  };
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

/** DC20 rounds fractions up, so a Hunter regains ceil(maximum SP / 2). */
export function hunterStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Favored Terrains currently selected through the Hunter class feature. */
export function hunterFavoredTerrainNames(character: Pick<Character, 'class' | 'build'>): string[] {
  if (character.class !== 'Hunter' && !hasDirectMulticlassFeature(character, 'Hunter', 'Favored Terrain')) return [];
  return Array.from(new Set(character.build?.classFeatureSelections?.['hunter.terrain'] ?? []));
}

/** Every Rogue Martial Path trigger can restore up to half maximum SP once per Round. */
export function rogueStaminaRegenAmount(maximumStamina: number): number {
  return Math.max(0, Math.ceil(maximumStamina / 2));
}

/** Psion Stamina restores exactly 1 SP whenever at least one creature fails an imposed Mental Save. */
export function psionStaminaAfterMentalSaveFailure(currentStamina: number, maximumStamina: number): number {
  return Math.min(Math.max(0, maximumStamina), Math.max(0, currentStamina) + 1);
}

/** Languages granted directly by Class Features are Fluent without spending Language Points. */
export function grantedClassLanguageNames(character: Pick<Character, 'class' | 'subclass' | 'build'>): string[] {
  if (character.class === 'Rogue' || hasAutomaticMulticlassFlavor(character, 'Rogue')) {
    return (character.build?.classFeatureSelections?.['rogue.language'] ?? []).slice(0, 1);
  }
  if ((character.class === 'Warlock' && character.subclass === 'Eldritch')
    || hasMulticlassSubclass(character, 'Warlock', 'Eldritch')) {
    return ['Deep Speech'];
  }
  return [];
}

/** Class Features that increase a Language by one stage instead of granting full Fluency. */
export function grantedClassLanguageLevels(character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>): Record<string, number> {
  const angelic = (character.class === 'Sorcerer' && character.level >= 3 && character.subclass === 'Angelic')
    || hasMulticlassSubclass(character, 'Sorcerer', 'Angelic');
  const draconic = (character.class === 'Sorcerer' && character.level >= 3 && character.subclass === 'Draconic')
    || hasMulticlassSubclass(character, 'Sorcerer', 'Draconic');
  const languages = [
    angelic ? character.build?.classFeatureSelections?.['sorcerer.celestialLanguage']?.[0] : undefined,
    draconic ? character.build?.classFeatureSelections?.['sorcerer.draconicLanguage']?.[0] : undefined,
  ].filter((language): language is string => Boolean(language));
  return languages.reduce<Record<string, number>>((levels, language) => ({
    ...levels,
    [language]: (levels[language] ?? 0) + 1,
  }), {});
}

/** Cheap Shot improves at Expert Rogue; each Sinister Shot adds damage per Condition beyond the first. */
export function rogueCheapShotDamage(level: number, distinctConditions: number, sinisterShotCount = 0): number {
  const baseDamage = level >= 5 ? 2 : 1;
  return baseDamage + Math.max(0, Math.trunc(distinctConditions) - 1) * Math.max(0, Math.trunc(sinisterShotCount));
}

/** Every Spellblade Discipline known from the base feature or Holy Warrior. */
export function spellbladeDisciplineNames(character: Pick<Character, 'class' | 'build'>): string[] {
  if (character.class !== 'Spellblade' && !hasDirectMulticlassFeature(character, 'Spellblade', 'Spellblade Disciplines')) return [];
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
  const owns = (className: string, feature: string, nativeLevel: number) => (
    (character.class === className && character.level >= nativeLevel)
    || hasDirectMulticlassFeature(character, className, feature)
  );
  if (group.id === 'bard.expression' && owns('Bard', 'Remarkable Repertoire', 1)) {
    return (character.build?.selectedTalents ?? []).includes('Expanded Repertoire') ? 2 : 1;
  }
  if (group.id === 'cleric.domains' && owns('Cleric', 'Cleric Order', 1)) {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Order').length;
    return 2 + expanded * 2 + Number(owns('Cleric', 'Expert Cleric', 5));
  }
  if (group.id === 'warlock.boon' && owns('Warlock', 'Pact Boon', 1)) {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Boon').length;
    return Math.min(group.options.length, 1 + expanded);
  }
  if (group.id === 'hunter.terrain' && owns('Hunter', 'Favored Terrain', 1)) {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Terrains').length;
    return Math.min(group.options.length, 2 + expanded * 2 + Number(owns('Hunter', 'Expert Hunter', 5)));
  }
  if (group.id === 'monk.ironPalm' && owns('Monk', 'Monk Training', 1)) {
    return Math.min(group.options.length, 1 + Number(owns('Monk', 'Expert Monk', 5)));
  }
  if (group.id === 'monk.stances' && owns('Monk', 'Monk Stance', 1)) {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Stances').length;
    return Math.min(group.options.length, 2 + expanded * 2 + Number(owns('Monk', 'Expert Monk', 5)));
  }
  if (group.id === 'sorcerer.origin' && owns('Sorcerer', 'Innate Power', 1)) {
    const greater = (character.build?.selectedTalents ?? []).filter((name) => name === 'Greater Innate Power').length;
    return Math.min(group.options.length, 1 + greater);
  }
  if (group.id === 'sorcerer.focus' && owns('Sorcerer', 'Innate Power', 1)) {
    const greater = (character.build?.selectedTalents ?? []).filter((name) => name === 'Greater Innate Power').length;
    return Math.min(group.options.length, 1 + greater + Number(owns('Sorcerer', 'Expert Sorcerer', 5)));
  }
  if (group.id === 'sorcerer.metaMagic' && owns('Sorcerer', 'Meta Magic', 2)) {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Meta Magic').length;
    const nativeSubclassGrant = Number(character.class === 'Sorcerer' && character.level >= 3
      && ['Angelic', 'Draconic'].includes(character.subclass ?? ''));
    const subclassGrant = nativeSubclassGrant
      + multiclassSubclassCount(character, 'Angelic')
      + multiclassSubclassCount(character, 'Draconic');
    return Math.min(group.options.length, 2 + expanded * 2 + Number(owns('Sorcerer', 'Expert Sorcerer', 5)) + subclassGrant);
  }
  if (group.id === 'wizard.school' && owns('Wizard', 'Spell School Initiate', 1)) {
    const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Spell School').length;
    return Math.min(group.options.length, 1 + expanded);
  }
  if (group.id === 'wizard.preparedSpells' && owns('Wizard', 'Prepared Spell', 2)) {
    return owns('Wizard', 'Expert Wizard', 5) ? 2 : 1;
  }
  if (group.id === 'summoner.creatureSpecialistSpell' && owns('Summoner', 'Bonded Summons', 1)) {
    const copies = (character.build?.selectedTalents ?? []).filter((name) => name === 'Creature Specialist').length;
    return group.options.length > 0 ? Math.min(group.options.length, copies) : copies;
  }
  if (group.id === 'summoner.hordeSummons' && owns('Summoner', 'Bonded Summons', 1)) {
    const copies = (character.build?.selectedTalents ?? []).filter((name) => name === 'Horde Summoner').length;
    return group.options.length > 0 ? Math.min(group.options.length, copies * 2) : copies * 2;
  }
  if (group.id !== 'spellblade.disciplines' || !owns('Spellblade', 'Spellblade Disciplines', 1)) return group.limit;
  const expanded = (character.build?.selectedTalents ?? []).filter((name) => name === 'Expanded Disciplines').length;
  const paladinReserve = character.subclass === 'Paladin' || hasMulticlassSubclass(character, 'Spellblade', 'Paladin') ? 1 : 0;
  return Math.min(Math.max(0, group.options.length - paladinReserve), 2 + expanded * 2 + Number(owns('Spellblade', 'Expert Spellblade', 5)));
}

/** Maneuvers granted by a class feature do not consume the class-table Maneuvers Known allowance. */
export function grantedClassManeuverNames(character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>): string[] {
  const choices = character.build?.classFeatureSelections ?? {};
  const granted: string[] = [];
  const owns = (className: string, feature: string, nativeLevel: number) => (
    (character.class === className && character.level >= nativeLevel)
    || hasDirectMulticlassFeature(character, className, feature)
  );
  if (owns('Champion', 'Master-at-Arms', 1)) {
    granted.push(
      ...(choices['champion.masterAtArmsManeuver'] ?? []).slice(0, 1),
      ...(owns('Champion', 'Expert Champion', 5) ? (choices['champion.expertManeuvers'] ?? []).slice(0, 2) : []),
    );
  }
  if ((character.class === 'Barbarian' && character.subclass === 'Spirit Guardian')
    || hasMulticlassSubclass(character, 'Barbarian', 'Spirit Guardian')) {
    granted.push(...(choices['barbarian.guardianManeuver'] ?? []).slice(0, 1));
  }
  if (owns('Warlock', 'Pact Boon', 1)) {
    const boons = new Set(choices['warlock.boon'] ?? []);
    const maneuverLimit = owns('Warlock', 'Expert Warlock', 5) ? 3 : 2;
    granted.push(
      ...(boons.has('Pact Weapon') ? (choices['warlock.pactWeaponManeuvers'] ?? []).slice(0, maneuverLimit) : []),
      ...(boons.has('Pact Armor') ? (choices['warlock.pactArmorManeuvers'] ?? []).slice(0, maneuverLimit) : []),
    );
  }
  if (owns('Cleric', 'Cleric Order', 1)) {
    const domains = new Set(choices['cleric.domains'] ?? []);
    granted.push(
      ...(domains.has('War') ? (choices['cleric.warManeuver'] ?? []).slice(0, 1) : []),
      ...(domains.has('Peace') ? (choices['cleric.peaceManeuver'] ?? []).slice(0, 1) : []),
    );
  }
  return Array.from(new Set(granted.filter(Boolean)));
}

/** Spells explicitly learned from class features are additional to the class-table Spells Known. */
export function grantedClassSpellNames(character: Pick<Character, 'class' | 'level' | 'subclass' | 'build'>): string[] {
  const choices = character.build?.classFeatureSelections ?? {};
  const talents = new Set(character.build?.selectedTalents ?? []);
  const granted: string[] = [];
  const owns = (className: string, feature: string, nativeLevel: number) => (
    (character.class === className && character.level >= nativeLevel)
    || hasDirectMulticlassFeature(character, className, feature)
  );
  if (owns('Psion', 'Psionic Mind', 1)) granted.push('Psi Bolt');
  if (owns('Bard', 'Remarkable Repertoire', 1)) {
    granted.push(
      ...(choices['bard.magicalSecrets'] ?? []).slice(0, 2),
      ...(owns('Bard', 'Expert Bard', 5) ? (choices['bard.expertSecrets'] ?? []).slice(0, 2) : []),
      ...(talents.has('Expanded Repertoire')
        ? (choices['bard.expandedRepertoireSpells'] ?? []).slice(0, 2) : []),
      ...(((character.class === 'Bard' && character.level >= 3 && character.subclass === 'Eloquence')
        || hasMulticlassSubclass(character, 'Bard', 'Eloquence'))
        ? (choices['bard.enthrallSpell'] ?? []).slice(0, 1) : []),
    );
  }
  if (owns('Warlock', 'Pact Boon', 1)) {
    const boons = new Set(choices['warlock.boon'] ?? []);
    granted.push(
      ...(boons.has('Pact Familiar') ? ['Call Familiar'] : []),
      ...(((character.class === 'Warlock' && character.level >= 3 && character.subclass === 'Eldritch')
        || hasMulticlassSubclass(character, 'Warlock', 'Eldritch')) ? choices['warlock.psychicSpell'] ?? [] : []),
      ...(owns('Warlock', 'Expert Warlock', 5) && boons.has('Pact Spell') ? (choices['warlock.expertSpells'] ?? []).slice(0, 2) : []),
      ...(talents.has('Pact Bane') ? choices['warlock.pactBaneSpells'] ?? [] : []),
    );
  }
  if (owns('Cleric', 'Cleric Order', 1)) {
    const magicDomains = (choices['cleric.domains'] ?? []).filter((domain) => domain === 'Magic').length;
    granted.push(...(choices['cleric.magicDomainSpells'] ?? []).slice(0, magicDomains).filter(Boolean));
  }
  if (character.class === 'Sorcerer' || hasAutomaticMulticlassFlavor(character, 'Sorcerer')) granted.push('Sorcery');
  if (owns('Druid', 'Druid Domain', 1)) granted.push('Druidcraft');
  if (owns('Wizard', 'Spell School Initiate', 1)) {
    const schools = choices['wizard.school'] ?? [];
    const schoolSpellLimit = owns('Wizard', 'Expert Wizard', 5) ? 3 : 2;
    granted.push(
      ...schools.flatMap((school) => (choices[wizardSchoolSpellSelectionKey(school)] ?? []).slice(0, schoolSpellLimit)),
      ...(((character.class === 'Wizard' && character.level >= 3 && character.subclass === 'Witch')
        || hasMulticlassSubclass(character, 'Wizard', 'Witch')) ? (choices['wizard.witchCurseSpell'] ?? []).slice(0, 1) : []),
    );
  }
  if (owns('Summoner', 'Bonded Summons', 1)) {
    const groups = [
      'summoner.bondedSummon',
      ...(((character.class === 'Summoner' && character.subclass === 'Chimera')
        || hasMulticlassSubclass(character, 'Summoner', 'Chimera')) ? ['summoner.chimeraSummons'] : []),
      ...(((character.class === 'Summoner' && character.subclass === 'Dread Lord')
        || hasMulticlassSubclass(character, 'Summoner', 'Dread Lord')) ? ['summoner.dreadLordSummon'] : []),
      ...(talents.has('Horde Summoner') ? ['summoner.hordeSummons'] : []),
    ];
    granted.push(...groups.flatMap((group) => choices[group] ?? []));
  }
  return Array.from(new Set(granted.filter(Boolean)));
}

export function sorcererOriginAncestryBonuses(
  character: Pick<Character, 'level' | 'class' | 'subclass' | 'build'>,
): Record<'Angelborn' | 'Dragonborn', number> {
  const nativeAngelic = Number(character.class === 'Sorcerer' && character.level >= 3 && character.subclass === 'Angelic');
  const nativeDraconic = Number(character.class === 'Sorcerer' && character.level >= 3 && character.subclass === 'Draconic');
  return {
    Angelborn: (nativeAngelic + multiclassSubclassCount(character, 'Angelic')) * 2,
    Dragonborn: (nativeDraconic + multiclassSubclassCount(character, 'Draconic')) * 2,
  };
}

export function ancestryPointBudget(character: Pick<Character, 'level' | 'class' | 'subclass' | 'ancestry' | 'build'>): number {
  // Beta p.194: every ancestry gains 2 points at levels 4 and 7. Custom
  // ancestries use the p.196 variant's lower 4-point starting budget.
  const advancement = (character.level >= 4 ? 2 : 0) + (character.level >= 7 ? 2 : 0);
  const talentPoints = (character.build?.selectedTalents ?? []).filter((name) => name === 'Ancestry Increase').length * 4;
  const clericAncestralDomain = (character.class === 'Cleric' || hasDirectMulticlassFeature(character, 'Cleric', 'Cleric Order'))
    && (character.build?.classFeatureSelections?.['cleric.domains'] ?? []).includes('Ancestral') ? 2 : 0;
  const sorcererOriginPoints = Object.values(sorcererOriginAncestryBonuses(character)).reduce((sum, points) => sum + points, 0);
  const startingPoints = character.ancestry === 'Custom' ? 4 : 5;
  return startingPoints + advancement + talentPoints + clericAncestralDomain + sorcererOriginPoints;
}

/** Whether one additional copy of a Trait fits both the total ancestry budget and any origin-restricted bonus. */
export function canAddAncestryTraitCopy(
  character: Pick<Character, 'level' | 'class' | 'subclass' | 'ancestry' | 'build'>,
  selectedTraits: AncestryTrait[],
  trait: AncestryTrait,
): boolean {
  if (trait.cost <= 0) return true;
  const budget = ancestryPointBudget(character);
  const spent = ancestryTraitPointTotals(character, selectedTraits).spent;
  if (spent + trait.cost > budget) return false;

  const originBonuses = sorcererOriginAncestryBonuses(character);
  const bonusTotal = Object.values(originBonuses).reduce((sum, points) => sum + points, 0);
  if (bonusTotal === 0) return true;
  const spentByAncestry = selectedTraits.reduce<Record<string, number>>((totals, selectedTrait) => ({
    ...totals,
    [selectedTrait.ancestry]: (totals[selectedTrait.ancestry] ?? 0)
      + selectedTrait.cost * ancestryTraitSelectionCount(character, selectedTrait),
  }), {});
  spentByAncestry[trait.ancestry] = (spentByAncestry[trait.ancestry] ?? 0) + trait.cost;
  const candidateSpent = Object.values(spentByAncestry).reduce((sum, points) => sum + points, 0);
  const originBonusUsed = Object.entries(originBonuses).reduce((sum, [ancestry, points]) => (
    sum + Math.min(points, Math.max(0, spentByAncestry[ancestry] ?? 0))
  ), 0);
  const basePointsRequired = candidateSpent - originBonusUsed;
  return basePointsRequired <= budget - bonusTotal;
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
  character: Pick<Character, 'build' | 'ancestry' | 'class' | 'level' | 'subclass'>,
  traits: AncestryTrait[],
): Set<string> {
  if (character.ancestry === 'Custom') {
    return new Set(traits.map(({ ancestry }) => ancestry));
  }
  const result = new Set([character.ancestry, character.build?.ancestrySecondary].filter((value): value is string => Boolean(value)));
  const selected = selectedAncestryTraits(character, traits);
  if (selected.some(({ name }) => name === 'Fallen')) result.add('Fiendborn');
  if (selected.some(({ name }) => name === 'Redeemed')) result.add('Angelborn');
  if ((character.class === 'Sorcerer' && character.level >= 3 && character.subclass === 'Angelic')
    || hasMulticlassSubclass(character, 'Sorcerer', 'Angelic')) result.add('Angelborn');
  if ((character.class === 'Sorcerer' && character.level >= 3 && character.subclass === 'Draconic')
    || hasMulticlassSubclass(character, 'Sorcerer', 'Draconic')) result.add('Dragonborn');
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
  HUNTER_MARK_FIRST_ATTACK_USED,
  'hunter.plantFibers.usedThisTurn',
  MONK_EXPANDED_STANCE_USED,
  MONK_BEAR_ADVANTAGE,
  MONK_MANTIS_GRAPPLE_AP,
  MONK_FLURRY_USED,
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
  let sheetFeatureSelections = { ...build.sheetFeatureSelections };
  let classFeatureSelections = { ...build.classFeatureSelections };
  const sheetConditionLevels = { ...build.sheetConditionLevels };

  if (character.class === 'Sorcerer' || hasDirectMulticlassFeature(character, 'Sorcerer', 'Overload Magic')) {
    sheetFeatureStates[SORCERER_OVERLOAD_ACTIVE] = false;
    delete sheetFeatureSelections[SORCERER_META_ACTIVE];
    delete sheetFeatureCounters[SORCERER_WILD_OUTCOME];
    delete sheetFeatureCounters[SORCERER_WILD_FORM_HP];
    sheetFeatureStates[SORCERER_WILD_NEXT_ADVANTAGE] = false;
    if (type === 'Short') {
      const overloadExhaustion = Math.max(0, sheetFeatureCounters[SORCERER_OVERLOAD_EXHAUSTION] ?? 0);
      if (overloadExhaustion > 0) {
        const remaining = Math.max(0, (sheetConditionLevels.Exhaustion ?? 0) - overloadExhaustion);
        if (remaining > 0) sheetConditionLevels.Exhaustion = remaining;
        else delete sheetConditionLevels.Exhaustion;
        delete sheetFeatureCounters[SORCERER_OVERLOAD_EXHAUSTION];
      }
    }
  }
  if (character.class === 'Wizard') {
    sheetFeatureStates[WIZARD_SIGIL_ACTIVE] = false;
    sheetFeatureStates[WIZARD_SIGIL_INSIDE] = false;
    sheetFeatureStates[WIZARD_SIGIL_PORTAL] = false;
    sheetFeatureStates[WIZARD_SIGIL_BOUND_SELF] = false;
    sheetFeatureStates[WIZARD_MANA_LIMIT_BREAK_READY] = false;
    sheetFeatureStates[WIZARD_PREPARED_DUEL_ACTIVE] = false;
    sheetFeatureStates[WIZARD_HEX_PENDING] = false;
    delete sheetFeatureSelections[WIZARD_SIGNATURE_ACTIVE];
    delete sheetFeatureSelections[WIZARD_SIGIL_TAGS];
    delete sheetFeatureSelections[WIZARD_HEX_ACTIVE];
    delete sheetFeatureCounters[WIZARD_SIGIL_DIAMETER];
    if (type === 'Long') {
      sheetFeatureStates[WIZARD_MANA_LIMIT_BREAK_USED] = false;
      for (const key of Object.keys(sheetFeatureStates)) {
        if (key.startsWith(WIZARD_SIGNATURE_USED_PREFIX)) delete sheetFeatureStates[key];
      }
      delete sheetFeatureSelections[WIZARD_PREPARED_ACTIVE];
    }
  }
  if (character.class === 'Psion') {
    sheetFeatureStates[PSION_MIND_SENSE_ACTIVE] = false;
    sheetFeatureStates[PSION_DAZE_PENDING] = false;
    sheetFeatureStates[PSION_DISRUPTION_PENDING] = false;
    sheetFeatureStates[PSION_COMPONENTLESS_PENDING] = false;
    delete sheetFeatureSelections[PSION_INVASION_ACTIVE];
    delete sheetFeatureCounters[PSION_AP_ENHANCEMENT_SP];
  }

  if (type === 'Long') {
    restPoints = character.maxHealthPoints;
    sheetFeatureStates = Object.fromEntries(Object.keys(sheetFeatureStates).map((key) => [key, false]));
    sheetFeatureCounters = {};
    if (character.class === 'Druid' || hasDirectMulticlassFeature(character, 'Druid', 'Wild Form')) {
      classFeatureSelections = { ...classFeatureSelections, [DRUID_WILD_FORM_TRAITS]: [], [DRUID_WILD_FORM_SKILLS]: [] };
      sheetFeatureSelections = { ...sheetFeatureSelections };
      delete sheetFeatureSelections[DRUID_WILD_FORM_SIZE];
      delete sheetFeatureSelections[DRUID_WILD_FORM_TYPE];
      delete sheetFeatureSelections[DRUID_WILD_FORM_DAMAGE];
      delete sheetFeatureSelections[DRUID_WILD_FORM_ID];
      delete sheetFeatureSelections[DRUID_WILD_FORM_NAME];
    }
    delete sheetConditionLevels.Doomed;
  } else if (type === 'Short' && ((character.class === 'Hunter' && character.subclass === 'Trapper')
    || hasMulticlassSubclass(character, 'Hunter', 'Trapper'))) {
    const maximumTraps = Math.max(0, character.primeModifier);
    const availableTraps = Math.max(0, sheetFeatureCounters[HUNTER_TRAPS_AVAILABLE] ?? maximumTraps);
    sheetFeatureCounters[HUNTER_TRAPS_AVAILABLE] = Math.min(maximumTraps, availableTraps + 1);
  }

  if (type !== 'Quick' && (character.class === 'Monk' || hasAutomaticMulticlassFlavor(character, 'Monk')) && sheetFeatureSelections[MONK_MEDITATION_PENDING]) {
    sheetFeatureSelections[MONK_MEDITATION_SKILL] = sheetFeatureSelections[MONK_MEDITATION_PENDING];
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
      sheetFeatureSelections,
      classFeatureSelections,
      druidWildForms: type === 'Long' && (character.class === 'Druid' || hasDirectMulticlassFeature(character, 'Druid', 'Wild Form')) ? [] : build.druidWildForms,
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
  if (className === 'Wizard') {
    const sources = (spell.source ?? '').split(', ');
    return sources.includes(fixedSpellSource ?? 'Arcane')
      || (subclass === 'Witch' && tags.includes('curse'))
      || (subclass === 'Portal Mage' && tags.includes('teleportation'));
  }
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
  const domains = new Set(character.class === 'Cleric' || hasDirectMulticlassFeature(character, 'Cleric', 'Cleric Order') ? choices['cleric.domains'] ?? [] : []);
  const disciplines = new Set(spellbladeDisciplineNames(character));
  const pactBoons = new Set(character.class === 'Warlock' || hasDirectMulticlassFeature(character, 'Warlock', 'Pact Boon') ? choices['warlock.boon'] ?? [] : []);
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
  const hasPactArmor = (character.class === 'Warlock' || hasDirectMulticlassFeature(character, 'Warlock', 'Pact Boon'))
    && (character.build?.classFeatureSelections?.['warlock.boon'] ?? []).includes('Pact Armor')
    && Boolean(equippedArmor);
  const innateFocusProperties = character.class === 'Sorcerer' || hasDirectMulticlassFeature(character, 'Sorcerer', 'Innate Power')
    ? character.build?.classFeatureSelections?.['sorcerer.focus'] ?? [] : [];
  const focusProperties = Array.from(new Set([
    ...focuses.flatMap(({ properties }) => properties.filter((property) => property !== 'Two-Handed')),
    ...innateFocusProperties,
  ]));
  const overloaded = (character.class === 'Sorcerer' || hasDirectMulticlassFeature(character, 'Sorcerer', 'Overload Magic'))
    && Boolean(character.build?.sheetFeatureStates?.[SORCERER_OVERLOAD_ACTIVE]);
  const wildMagic = sorcererWildMagicProfile(character);
  return {
    spellCheckBonus: focuses.filter(({ properties }) => properties.includes('Channeling')).length
      + Number(innateFocusProperties.includes('Channeling')) + Number(overloaded) * 5 + wildMagic.spellCheckBonus,
    spellAttackBonus: focuses.filter(({ properties }) => properties.includes('Vicious')).length
      + Number(innateFocusProperties.includes('Vicious')) + Number(overloaded) * 5,
    spellAttackDamageBonus: focuses.filter(({ properties }) => properties.includes('Powerful')).length,
    attackAndSpellDisadvantage: untrainedGear > 0 ? -untrainedGear : 0,
    agilityCheckDisadvantage: heavyGear > 0 ? -heavyGear : 0,
    physicalDamageReduction: Boolean(armorProfile?.physicalDamageReduction),
    elementalDamageReduction: Boolean(armorProfile?.elementalDamageReduction),
    mysticalDamageReduction: hasPactArmor || focusProperties.includes('Warded'),
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
  const innateFocusProperties = character.class === 'Sorcerer' || hasDirectMulticlassFeature(character, 'Sorcerer', 'Innate Power')
    ? character.build?.classFeatureSelections?.['sorcerer.focus'] ?? [] : [];
  const weaponPD = equipped.filter((item) => item.category === 'Weapons' && item.properties.includes('Guard')).length;
  return {
    pd: (armor?.physicalDefense ?? 0) + (shield?.physicalDefense ?? 0) + weaponPD,
    ad: (armor?.areaDefense ?? 0) + (shield?.areaDefense ?? 0) + focusAD + Number(innateFocusProperties.includes('Protective')),
    physicalDR: Number(Boolean(armor?.physicalDamageReduction || shield?.physicalDamageReduction)),
    elementalDR: Number(Boolean(armor?.elementalDamageReduction || shield?.elementalDamageReduction)),
    mysticalDR: Math.max(focusMDR, Number(innateFocusProperties.includes('Warded'))),
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
  const ownsFeature = (className: string, feature: string, nativeLevel: number) => (
    (character.class === className && character.level >= nativeLevel)
    || hasDirectMulticlassFeature(character, className, feature)
  );
  // Ignore stale Psion path choices from older saves. Psion v2 grants Talents at
  // 2/4/7/10, not the Martial or Spellcaster Path Progression benefit.
  const paths = character.class === 'Psion' ? [] : Object.values(character.build?.pathProgressionChoices ?? {});
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
  const classPD = equipment.isUnarmored && ownsFeature('Monk', 'Monk Training', 1) ? 2 : 0;
  const classAD = equipment.isUnarmored && ownsFeature('Barbarian', 'Berserker', 1) ? 2 : 0;
  const warlockPactBoons = new Set(character.class === 'Warlock' || hasDirectMulticlassFeature(character, 'Warlock', 'Pact Boon')
    ? character.build?.classFeatureSelections?.['warlock.boon'] ?? []
    : []);
  const pactArmorActive = equipment.hasArmor && warlockPactBoons.has('Pact Armor');
  const classFeatureHP = ((character.class === 'Warlock' && character.level >= 5)
    || hasDirectMulticlassFeature(character, 'Warlock', 'Expert Warlock')) ? 2 : 0;
  const hunterTerrains = new Set(hunterFavoredTerrainNames(character));
  const classSpeed = Number(ownsFeature('Barbarian', 'Berserker', 1))
    + (ownsFeature('Monk', 'Monk Training', 1) ? (ownsFeature('Monk', 'Expert Monk', 5) ? 2 : 1) : 0)
    + Number(ownsFeature('Hunter', 'Favored Terrain', 1) && hunterTerrains.has('Grassland'));
  const disciplines = new Set(spellbladeDisciplineNames(character));
  const clericDomains = character.class === 'Cleric' || hasDirectMulticlassFeature(character, 'Cleric', 'Cleric Order')
    ? character.build?.classFeatureSelections?.['cleric.domains'] ?? [] : [];
  const clericMagicDomains = clericDomains.filter((domain) => domain === 'Magic').length;
  const selectedTalents = character.build?.selectedTalents ?? [];
  const sorcererGreaterInnate = ownsFeature('Sorcerer', 'Innate Power', 1)
    ? selectedTalents.filter((name) => name === 'Greater Innate Power').length : 0;
  const sorcererExpandedMeta = ownsFeature('Sorcerer', 'Meta Magic', 2)
    ? selectedTalents.filter((name) => name === 'Expanded Meta Magic').length : 0;
  const sorcererIntuitiveOrigins = ownsFeature('Sorcerer', 'Innate Power', 1)
    ? (character.build?.classFeatureSelections?.['sorcerer.origin'] ?? []).filter((name) => name === 'Intuitive Magic').length : 0;
  const featureMana = ownsFeature('Sorcerer', 'Innate Power', 1)
    ? 1 + Number(ownsFeature('Sorcerer', 'Expert Sorcerer', 5)) + sorcererGreaterInnate + sorcererExpandedMeta * 2
    : disciplines.has('Magus') ? 1
      : clericMagicDomains;
  const skillFeaturePoints = (ownsFeature('Bard', 'Remarkable Repertoire', 1)
    ? 2 + Number(ownsFeature('Bard', 'Expert Bard', 5)) * 2 + selectedTalents.filter((name) => name === 'Expanded Repertoire').length * 2 : 0)
    + (ownsFeature('Rogue', 'Roguish Finesse', 1) ? 1 + Number(ownsFeature('Rogue', 'Expert Rogue', 5)) : 0)
    + (ownsFeature('Cleric', 'Cleric Order', 1) && clericDomains.includes('Knowledge') ? 2 : 0)
    + (ownsFeature('Hunter', 'Favored Terrain', 1) ? ['Forest', 'Urban'].filter((terrain) => hunterTerrains.has(terrain)).length * 2 : 0);
  const skillConversions = character.build?.skillPointsConvertedToTrades ?? 0;
  const tradeConversions = character.build?.tradePointsConvertedToLanguages ?? 0;
  const skillTalentPoints = selectedTalents.filter((name) => name === 'Skill Increase').length * 4;
  const paragonTradePoints = Number(character.subclass === 'Paragon' && character.level >= 3)
    + multiclassSubclassCount(character, 'Paragon');

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
      + sorcererIntuitiveOrigins * 2
      + Number(ownsFeature('Spellblade', 'Spellblade Disciplines', 1) && disciplines.has('Magus')),
    cantripLimit: totals.cantrips,
    maneuverLimit: totals.maneuvers + martialPaths
      + selectedTalents.filter((name) => name === 'Martial Expansion').length * 2
      + Number(ownsFeature('Spellblade', 'Spellblade Disciplines', 1) && disciplines.has('Warrior')),
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
    druidWildForms: [],
    rollAdjustment: 0,
    isFinalized: false,
  };
}
