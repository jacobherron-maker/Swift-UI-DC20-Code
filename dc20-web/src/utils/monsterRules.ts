import type {
  Character,
  Combatant,
  Encounter,
  Monster,
  MonsterAbility,
  MonsterRole,
  MonsterType,
  SavedCombat,
} from '../types/models';
import {
  CombatantTeamValues,
  MonsterAbilityKindValues,
  MonsterRoleValues,
  MonsterTypeValues,
} from '../types/models';
import { generateUUID } from './gameUtils';

interface MonsterBaseline {
  hp: number;
  defense: number;
  attack: number;
  save: number;
  prime: number;
  mastery: number;
  traits: number;
}

export interface MonsterRecommendation {
  hp: number;
  physicalDefense: number;
  arcaneDefense: number;
  attack: number;
  save: number;
  damage: number;
  prime: number;
  mastery: number;
  traits: number;
}

export interface MonsterTraitTemplate {
  name: string;
  category: string;
  value: number;
  details: string;
}

export interface EncounterMetrics {
  easyBudget: number;
  mediumBudget: number;
  hardBudget: number;
  veryHardBudget: number;
  deadlyBudget: number;
  monsterBudget: number;
  averageLevel: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Deadly';
}

const MONSTER_BASELINES: Record<number, MonsterBaseline> = {
  [-1]: { hp: 7, defense: 10, attack: 2, save: 12, prime: 2, mastery: 0, traits: 2 },
  0: { hp: 11, defense: 11, attack: 3, save: 13, prime: 2, mastery: 1, traits: 4 },
  1: { hp: 13, defense: 12, attack: 4, save: 14, prime: 3, mastery: 1, traits: 6 },
  2: { hp: 15, defense: 12, attack: 4, save: 14, prime: 3, mastery: 1, traits: 8 },
  3: { hp: 19, defense: 13, attack: 5, save: 15, prime: 3, mastery: 2, traits: 10 },
  4: { hp: 20, defense: 13, attack: 5, save: 15, prime: 3, mastery: 2, traits: 12 },
  5: { hp: 24, defense: 15, attack: 7, save: 17, prime: 4, mastery: 3, traits: 14 },
  6: { hp: 25, defense: 15, attack: 7, save: 17, prime: 4, mastery: 3, traits: 16 },
  7: { hp: 28, defense: 16, attack: 8, save: 18, prime: 4, mastery: 4, traits: 18 },
  8: { hp: 30, defense: 16, attack: 8, save: 18, prime: 4, mastery: 4, traits: 20 },
  9: { hp: 34, defense: 17, attack: 9, save: 19, prime: 4, mastery: 5, traits: 22 },
  10: { hp: 36, defense: 18, attack: 10, save: 20, prime: 5, mastery: 5, traits: 24 },
  11: { hp: 40, defense: 19, attack: 11, save: 21, prime: 5, mastery: 6, traits: 26 },
  12: { hp: 42, defense: 19, attack: 11, save: 21, prime: 5, mastery: 6, traits: 28 },
  13: { hp: 44, defense: 20, attack: 12, save: 22, prime: 5, mastery: 7, traits: 30 },
  14: { hp: 46, defense: 20, attack: 12, save: 22, prime: 5, mastery: 7, traits: 32 },
  15: { hp: 50, defense: 22, attack: 14, save: 24, prime: 6, mastery: 8, traits: 34 },
  16: { hp: 51, defense: 22, attack: 14, save: 24, prime: 6, mastery: 8, traits: 36 },
  17: { hp: 55, defense: 23, attack: 15, save: 25, prime: 6, mastery: 9, traits: 38 },
  18: { hp: 56, defense: 23, attack: 15, save: 25, prime: 6, mastery: 9, traits: 40 },
  19: { hp: 60, defense: 24, attack: 16, save: 26, prime: 6, mastery: 10, traits: 42 },
  20: { hp: 62, defense: 25, attack: 17, save: 27, prime: 7, mastery: 10, traits: 44 },
};

const MEDIUM_DAMAGE: Record<number, number> = {
  [-1]: 0.25,
  0: 0.5,
  1: 0.5,
  2: 1,
  3: 1,
  4: 1.5,
  5: 1.5,
  6: 2,
  7: 2,
  8: 2.5,
  9: 2.5,
  10: 3,
  11: 3.5,
  12: 4,
  13: 4,
  14: 4.5,
  15: 4.5,
  16: 5,
  17: 5,
  18: 5.5,
  19: 5.5,
  20: 6,
};

export const MONSTER_ROLE_GUIDANCE: Record<MonsterRole, string> = {
  Brute: 'HP +25% • Damage +25% • Defenses -4 • excels at close-range damage and durability.',
  Defender: 'Damage -25% • Defenses +2 • Trait Value -4 • protects allies and controls movement.',
  Leader: 'Damage -25% • Trait Value +4 • buffs, heals, and repositions allies.',
  Soldier: 'No baseline stat adjustment • mobile, well-rounded battlefield pressure.',
  Striker: 'HP -25% • Damage +50% • Defenses -2 • burst damage, range, and mobility.',
  Tactician: 'HP -25% • Damage -25% • Trait Value +8 • control, zones, healing, and debuffs.',
};

export const MONSTER_TYPE_GUIDANCE: Record<MonsterType, string> = {
  Minion: 'Replaces half a monster • ×0.5 HP • 2 AP.',
  Standard: 'Replaces one monster • baseline HP • 4 AP.',
  Epic: 'Replaces two monsters • ×2 HP • 4 AP + 3 Reaction Points • may have Round Actions.',
  Legendary: 'Replaces four monsters • ×4 HP • 4 AP + 6 Reaction Points • has Round Actions.',
};

export const MONSTER_TRAIT_CATALOG: MonsterTraitTemplate[] = [
  { name: 'Enrage', category: 'Offense', value: 4, details: 'Once you become Bloodied, gain +1 damage on all Attacks.' },
  { name: 'Opportunist', category: 'Offense', value: 2, details: 'Deal +1 damage on Heavy Hits to creatures affected by at least one Condition.' },
  { name: 'Pack Tactics', category: 'Offense', value: 2, details: 'Gain an additional +2 bonus to Attacks while Flanking a creature.' },
  { name: 'Unrelenting', category: 'Defense', value: 2, details: 'The only way you can be reduced below 1 HP is by a Heavy Hit or an Attack that deals Radiant damage.' },
  { name: 'Regeneration', category: 'Defense', value: 2, details: 'Heal 1 HP at the start of each of your turns.' },
  { name: 'Death’s Door', category: 'Defense', value: 2, details: 'Use the Death’s Door mechanic like a PC.' },
  { name: 'Shot Caller', category: 'Utility', value: 2, details: 'When you use the Help Action on another creature, its next Attack deals +1 damage.' },
  { name: 'Inspire', category: 'Utility', value: 2, details: 'Once per turn, give a Help Die to an allied creature for free.' },
  { name: 'False Appearance', category: 'Utility', value: 4, details: 'While motionless, you’re indistinguishable from a specified object.' },
  { name: 'Attribute Increase', category: 'Statistics', value: 2, details: '+1 to one Attribute, up to the monster’s Prime Modifier.' },
  { name: 'Attribute Decrease', category: 'Statistics', value: -2, details: '-1 to one Attribute, to a minimum of -5.' },
  { name: 'Damage Increase', category: 'Statistics', value: 4, details: 'Increase damage by roughly 25%, using the Monster Collection Damage Change Table.' },
  { name: 'Damage Decrease', category: 'Statistics', value: -4, details: 'Decrease damage by roughly 25%, using the Monster Collection Damage Change Table.' },
  { name: 'HP Increase', category: 'Statistics', value: 4, details: '+25% maximum HP.' },
  { name: 'HP Decrease', category: 'Statistics', value: -4, details: '-25% maximum HP.' },
  { name: 'Defense Increase', category: 'Statistics', value: 1, details: '+1 to PD or AD.' },
  { name: 'Defense Decrease', category: 'Statistics', value: -1, details: '-1 to PD or AD.' },
  { name: 'Speed Increase', category: 'Movement', value: 1, details: '+3 Speed.' },
  { name: 'Speed Decrease', category: 'Movement', value: -1, details: '-1 Speed.' },
  { name: 'Fly Speed', category: 'Movement', value: 4, details: 'Gain a Fly Speed equal to Speed.' },
  { name: 'Burrow Speed', category: 'Movement', value: 4, details: 'Gain a Burrow Speed equal to Speed.' },
  { name: 'Swim Speed', category: 'Movement', value: 2, details: 'Gain a Swim Speed and the ability to breathe underwater.' },
  { name: 'Climb Speed', category: 'Movement', value: 2, details: 'Gain a Climb Speed and Resistance (Half) to Falling damage.' },
  { name: 'Truewalk', category: 'Movement', value: 2, details: 'Walk normally on solid surfaces regardless of their orientation without falling or needing to Climb.' },
  { name: 'Incorporeal', category: 'Movement', value: 2, details: 'Move through solid objects and creatures; ending a turn inside one deals True damage equal to 25% of maximum HP.' },
  { name: 'Darkvision', category: 'Senses', value: 1, details: 'Gain Darkvision 10 Spaces.' },
  { name: 'Tremorsense', category: 'Senses', value: 2, details: 'Gain Tremorsense 3 Spaces.' },
  { name: 'Blindsight', category: 'Senses', value: 2, details: 'Gain Blindsight 3 Spaces.' },
  { name: 'Truesight', category: 'Senses', value: 4, details: 'Gain Truesight 10 Spaces.' },
  { name: 'Damage Reduction', category: 'Mitigation', value: 1, details: 'Gain Damage Reduction to Physical, Elemental, or Mystical damage.' },
  { name: 'Resistance', category: 'Mitigation', value: 2, details: 'Gain Resistance (Half) to one damage type.' },
  { name: 'Vulnerability', category: 'Mitigation', value: -2, details: 'Gain Vulnerability (Double) to one damage type.' },
  { name: 'Immunity', category: 'Mitigation', value: 4, details: 'Gain Immunity to one damage type.' },
  { name: 'Absorption', category: 'Mitigation', value: 8, details: 'Gain Immunity to one damage type and regain HP equal to half the prevented damage.' },
  { name: 'Skill Check Advantage', category: 'Checks & Saves', value: 1, details: 'Gain ADV on one Skill Check.' },
  { name: 'Skill Check Disadvantage', category: 'Checks & Saves', value: -1, details: 'Gain DisADV on one Skill Check.' },
  { name: 'Attribute Save Advantage', category: 'Checks & Saves', value: 1, details: 'Gain ADV on one Attribute Save.' },
  { name: 'Attribute Save Disadvantage', category: 'Checks & Saves', value: -1, details: 'Gain DisADV on one Attribute Save.' },
  { name: 'Condition Resistance', category: 'Checks & Saves', value: 1, details: 'Gain ADV on Checks and Saves against one Condition.' },
  { name: 'Condition Vulnerability', category: 'Checks & Saves', value: -1, details: 'Gain DisADV on Checks and Saves against one Condition.' },
  { name: 'Condition Immunity', category: 'Checks & Saves', value: 2, details: 'Gain Immunity to one Condition.' },
  { name: 'Class Feature', category: 'Class Features', value: 2, details: 'Gain one Class Feature or a monster-scaled version of it.' },
];

export function monsterActionPoints(type: MonsterType): number {
  return type === MonsterTypeValues.MINION ? 2 : 4;
}

export function monsterReactionPoints(type: MonsterType): number {
  if (type === MonsterTypeValues.EPIC) return 3;
  if (type === MonsterTypeValues.LEGENDARY) return 6;
  return 0;
}

function monsterTypeMultiplier(type: MonsterType): number {
  if (type === MonsterTypeValues.MINION) return 0.5;
  if (type === MonsterTypeValues.EPIC) return 2;
  if (type === MonsterTypeValues.LEGENDARY) return 4;
  return 1;
}

export function getMonsterRecommendation(
  level: number,
  type: MonsterType,
  role: MonsterRole,
): MonsterRecommendation {
  const normalizedLevel = Math.min(20, Math.max(-1, Math.trunc(level)));
  const row = MONSTER_BASELINES[normalizedLevel];
  let hp = row.hp * monsterTypeMultiplier(type);
  let physicalDefense = row.defense;
  let arcaneDefense = row.defense;
  let damage = MEDIUM_DAMAGE[normalizedLevel];
  let traits = row.traits;

  switch (role) {
    case MonsterRoleValues.BRUTE:
      hp *= 1.25;
      damage *= 1.25;
      physicalDefense -= 4;
      arcaneDefense -= 4;
      break;
    case MonsterRoleValues.DEFENDER:
      damage *= 0.75;
      physicalDefense += 2;
      arcaneDefense += 2;
      traits -= 4;
      break;
    case MonsterRoleValues.LEADER:
      damage *= 0.75;
      traits += 4;
      break;
    case MonsterRoleValues.STRIKER:
      hp *= 0.75;
      damage *= 1.5;
      physicalDefense -= 2;
      arcaneDefense -= 2;
      break;
    case MonsterRoleValues.TACTICIAN:
      hp *= 0.75;
      damage *= 0.75;
      traits += 8;
      break;
    case MonsterRoleValues.SOLDIER:
      break;
  }

  return {
    hp: Math.max(1, Math.round(hp)),
    physicalDefense,
    arcaneDefense,
    attack: row.attack,
    save: row.save,
    damage: Math.max(0, Math.round(damage * 2) / 2),
    prime: row.prime,
    mastery: row.mastery,
    traits: Math.max(0, traits),
  };
}

export function createCustomMonster(
  level = 1,
  type: MonsterType = MonsterTypeValues.STANDARD,
  role: MonsterRole = MonsterRoleValues.SOLDIER,
  name = 'New Monster',
): Monster {
  const recommendation = getMonsterRecommendation(level, type, role);
  return {
    id: generateUUID(),
    name,
    level,
    type,
    role,
    hp: recommendation.hp,
    physicalDefense: recommendation.physicalDefense,
    arcaneDefense: recommendation.arcaneDefense,
    attackBonus: recommendation.attack,
    saveDC: recommendation.save,
    damage: recommendation.damage,
    notes: 'Built from the Monster Collection baseline and role adjustments.',
    size: 'Medium',
    creatureType: '',
    descriptionText: '',
    tactics: '',
    lore: '',
    actionPoints: monsterActionPoints(type),
    reactionPoints: monsterReactionPoints(type),
    speed: 5,
    primeModifier: recommendation.prime,
    combatMastery: recommendation.mastery,
    might: 0,
    agility: 0,
    charisma: 0,
    intelligence: 0,
    skills: '',
    senses: '',
    languages: '',
    otherSpeeds: '',
    reductions: '',
    resistances: '',
    vulnerabilities: '',
    immunities: '',
    abilities: [],
  };
}

export function applyMonsterRecommendation(monster: Monster): Monster {
  const recommendation = getMonsterRecommendation(monster.level, monster.type, monster.role);
  return {
    ...monster,
    hp: recommendation.hp,
    physicalDefense: recommendation.physicalDefense,
    arcaneDefense: recommendation.arcaneDefense,
    attackBonus: recommendation.attack,
    saveDC: recommendation.save,
    damage: recommendation.damage,
    actionPoints: monsterActionPoints(monster.type),
    reactionPoints: monsterReactionPoints(monster.type),
    primeModifier: recommendation.prime,
    combatMastery: recommendation.mastery,
  };
}

export function monsterLevelLabel(level: number): string {
  return level < 0 ? 'Novice' : `Level ${level}`;
}

export function monsterBudget(monster: Monster): number {
  const levelBudget = monster.level < 1 ? 0.5 : monster.level;
  return levelBudget * monsterTypeMultiplier(monster.type);
}

export function monsterTraitValueSpent(monster: Monster): number {
  return monster.abilities.reduce((total, ability) => total + (ability.traitValue ?? 0), 0);
}

export function makeTraitAbility(template: MonsterTraitTemplate): MonsterAbility {
  return {
    id: generateUUID(),
    kind: MonsterAbilityKindValues.TRAIT,
    name: template.name,
    cost: '',
    details: template.details,
    traitValue: template.value,
  };
}

export function cloneMonsterAsCustom(monster: Monster): Monster {
  return {
    ...monster,
    id: generateUUID(),
    name: `${monster.name} Copy`,
    sourceBook: undefined,
    sourcePage: undefined,
    publishedRole: undefined,
    notes: monster.sourceBook
      ? `Custom copy based on ${monster.sourceBook}${monster.sourcePage ? `, page ${monster.sourcePage}` : ''}.`
      : monster.notes,
    abilities: monster.abilities.map((ability) => ({ ...ability, id: generateUUID() })),
  };
}

export function encounterMetrics(encounter: Encounter): EncounterMetrics {
  const mediumBudget = encounter.partyLevels.reduce((total, level) => total + level, 0);
  const averageLevel = encounter.partyLevels.length > 0
    ? mediumBudget / encounter.partyLevels.length
    : 0;
  const easyBudget = Math.max(0, mediumBudget - averageLevel);
  const hardBudget = mediumBudget + averageLevel;
  const veryHardBudget = mediumBudget + averageLevel * 2;
  const deadlyBudget = mediumBudget + averageLevel * 4;
  const monsterTotal = encounter.entries.reduce(
    (total, entry) => total + monsterBudget(entry.monster) * Math.max(1, entry.count),
    0,
  );
  const delta = monsterTotal - mediumBudget;
  let difficulty: EncounterMetrics['difficulty'];
  if (delta >= averageLevel * 4) difficulty = 'Deadly';
  else if (delta >= averageLevel * 2) difficulty = 'Very Hard';
  else if (delta >= averageLevel) difficulty = 'Hard';
  else if (delta >= -averageLevel / 2) difficulty = 'Medium';
  else difficulty = 'Easy';

  return {
    easyBudget,
    mediumBudget,
    hardBudget,
    veryHardBudget,
    deadlyBudget,
    monsterBudget: monsterTotal,
    averageLevel,
    difficulty,
  };
}

export function combatantFromMonster(monster: Monster, name = monster.name): Combatant {
  const maxAP = monster.actionPoints ?? monsterActionPoints(monster.type);
  const reactionPoints = monster.reactionPoints ?? monsterReactionPoints(monster.type);
  return {
    id: generateUUID(),
    name,
    team: CombatantTeamValues.ENEMIES,
    maxHP: monster.hp,
    hp: monster.hp,
    maxAP,
    ap: maxAP,
    reactionPoints,
    currentReactionPoints: reactionPoints,
    conditions: [],
    hasActed: false,
    sourceMonsterID: monster.id,
    physicalDefense: monster.physicalDefense,
    arcaneDefense: monster.arcaneDefense,
    attackBonus: monster.attackBonus,
    saveDC: monster.saveDC,
    speed: monster.speed,
    monsterAbilities: monster.abilities.map((ability) => ({ ...ability })),
  };
}

export function combatantFromCharacter(character: Character): Combatant {
  return {
    id: generateUUID(),
    name: character.name || 'Unnamed Character',
    team: CombatantTeamValues.HEROES,
    maxHP: Math.max(1, character.maxHealthPoints),
    hp: Math.min(character.maxHealthPoints, character.healthPoints),
    maxAP: character.maxAP ?? 4,
    ap: character.currentAP ?? character.maxAP ?? 4,
    reactionPoints: 0,
    currentReactionPoints: 0,
    conditions: [],
    hasActed: false,
    sourceCharacterID: character.id,
    physicalDefense: character.physicalDefense ?? character.defense,
    arcaneDefense: character.arcaneDefense ?? character.defense,
    attackBonus: character.primeModifier + character.combatMastery,
    saveDC: 10 + character.primeModifier + character.combatMastery,
    speed: character.speed,
  };
}

export function combatFromEncounter(encounter: Encounter): SavedCombat {
  const combatants: Combatant[] = [];
  for (const entry of encounter.entries) {
    const count = Math.max(1, entry.count);
    for (let instance = 1; instance <= count; instance += 1) {
      const needsSuffix = count > 1 || combatants.some(({ name }) => name === entry.monster.name);
      const name = needsSuffix ? `${entry.monster.name} ${instance}` : entry.monster.name;
      combatants.push(combatantFromMonster(entry.monster, name));
    }
  }
  return {
    id: generateUUID(),
    name: encounter.name,
    combatants,
    round: 1,
    firstTeam: CombatantTeamValues.HEROES,
    notes: encounter.notes,
    sourceEncounterID: encounter.id,
  };
}

export function synchronizeCombatant(
  combatant: Combatant,
  monster: Monster,
  previousName?: string,
): Combatant {
  const damageTaken = combatant.maxHP - combatant.hp;
  const spentAP = combatant.maxAP - combatant.ap;
  const spentReactionPoints = combatant.reactionPoints - combatant.currentReactionPoints;
  const maxAP = monster.actionPoints ?? monsterActionPoints(monster.type);
  const reactionPoints = monster.reactionPoints ?? monsterReactionPoints(monster.type);
  let name = combatant.name;
  if (previousName) {
    if (name === previousName) name = monster.name;
    else if (name.startsWith(`${previousName} `)) {
      const suffix = name.slice(previousName.length + 1);
      if (/^\d+$/.test(suffix)) name = `${monster.name} ${suffix}`;
    }
  }
  return {
    ...combatant,
    name,
    maxHP: monster.hp,
    hp: Math.min(monster.hp, Math.max(-20, monster.hp - damageTaken)),
    maxAP,
    ap: Math.min(maxAP, Math.max(0, maxAP - spentAP)),
    reactionPoints,
    currentReactionPoints: Math.min(
      reactionPoints,
      Math.max(0, reactionPoints - spentReactionPoints),
    ),
    physicalDefense: monster.physicalDefense,
    arcaneDefense: monster.arcaneDefense,
    attackBonus: monster.attackBonus,
    saveDC: monster.saveDC,
    speed: monster.speed,
    monsterAbilities: monster.abilities.map((ability) => ({ ...ability })),
  };
}
