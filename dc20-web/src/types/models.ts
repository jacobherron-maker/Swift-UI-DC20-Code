// Core DC20 TTRPG Data Models ported from Swift

export const HubSectionValues = {
  DASHBOARD: "Dashboard",
  RULES: "Rules",
  POWERS: "Spells & Maneuvers",
  DICE: "Dice Roller",
  ENCOUNTERS: "Encounters",
  MONSTERS: "Monsters",
  CHARACTERS: "Characters",
  EQUIPMENT: "Equipment",
  COMBAT: "Combat",
  CAMPAIGN: "Campaign",
} as const;

export type HubSection = (typeof HubSectionValues)[keyof typeof HubSectionValues];

export const HubSectionIcons: Record<HubSection, string> = {
  "Dashboard": "sparkles",
  "Rules": "books.vertical.fill",
  "Spells & Maneuvers": "wand.and.stars",
  "Dice Roller": "die.face.5.fill",
  "Encounters": "shield.lefthalf.filled",
  "Monsters": "pawprint.fill",
  "Characters": "person.3.fill",
  "Equipment": "backpack.fill",
  "Combat": "bolt.fill",
  "Campaign": "map.fill",
};

export const DiceKindValues = {
  D2: 2,
  D4: 4,
  D6: 6,
  D8: 8,
  D10: 10,
  D12: 12,
  D20: 20,
  D100: 100,
} as const;

export type DiceKind = (typeof DiceKindValues)[keyof typeof DiceKindValues];

export interface CampaignNote {
  id: string;
  title: string;
  body: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  notes: CampaignNote[];
}

export const CombatantTeamValues = {
  HEROES: "Heroes",
  ENEMIES: "Enemies",
  NEUTRAL: "Neutral",
} as const;

export type CombatantTeam = (typeof CombatantTeamValues)[keyof typeof CombatantTeamValues];

export interface Combatant {
  id: string;
  name: string;
  team: CombatantTeam;
  maxHP: number;
  hp: number;
  maxAP: number;
  ap: number;
  reactionPoints: number;
  currentReactionPoints: number;
  conditions: string[];
  hasActed: boolean;
  physicalDefense?: number;
  arcaneDefense?: number;
  attackBonus?: number;
  saveDC?: number;
  speed?: number;
  sourceMonsterID?: string;
  sourceCharacterID?: string;
  monsterAbilities?: MonsterAbility[];
}

export interface SavedCombat {
  id: string;
  name: string;
  combatants: Combatant[];
  round: number;
  firstTeam: CombatantTeam;
  notes: string;
  sourceEncounterID?: string;
}

export interface CampaignData {
  title: string;
  notes: string;
  combats: SavedCombat[];
  campaigns: CampaignRecord[];
  customMonsters: Monster[];
  customEquipment: EquipmentCatalogItem[];
  encounters: Encounter[];
}

// ============================================
// DC20 SYSTEM ENUMS & TYPES
// ============================================

// Only 4 core attributes in DC20
export const DC20Attributes = {
  MIGHT: "Might",
  AGILITY: "Agility",
  INTELLIGENCE: "Intelligence",
  CHARISMA: "Charisma",
} as const;

export type DC20Attribute = (typeof DC20Attributes)[keyof typeof DC20Attributes];

// Mastery levels for skills and trades.
export const MasteryLevels = {
  UNTRAINED: "Untrained",
  NOVICE: "Novice",
  ADEPT: "Adept",
  EXPERT: "Expert",
  MASTER: "Master",
  GRANDMASTER: "Grandmaster",
} as const;

export type MasteryLevel = (typeof MasteryLevels)[keyof typeof MasteryLevels];

// Languages use fluency rather than the five-stage mastery system.
export const LanguageFluencyValues = {
  UNTRAINED: "Untrained",
  LIMITED: "Limited",
  FLUENT: "Fluent",
} as const;

export type LanguageFluency = (typeof LanguageFluencyValues)[keyof typeof LanguageFluencyValues];

// Beta 0.10.5 skills. Knowledge disciplines are Trades in DC20, not Skills.
export const DC20Skills = {
  ATHLETICS: "Athletics",
  INTIMIDATION: "Intimidation",
  ACROBATICS: "Acrobatics",
  TRICKERY: "Trickery",
  STEALTH: "Stealth",
  ANIMAL: "Animal",
  INSIGHT: "Insight",
  INFLUENCE: "Influence",
  INVESTIGATION: "Investigation",
  MEDICINE: "Medicine",
  SURVIVAL: "Survival",
  AWARENESS: "Awareness",
} as const;

export type DC20Skill = (typeof DC20Skills)[keyof typeof DC20Skills];

export type DC20Trade = string;

// Attribute selection method for character creation (Step 1)
export const AttributeSelectionMethods = {
  STANDARD_ARRAY: "Standard Array",
  POINT_BUY: "Point Buy",
  ROLLED: "Rolled",
} as const;

export type AttributeSelectionMethod = (typeof AttributeSelectionMethods)[keyof typeof AttributeSelectionMethods];

// Classes
export const DC20Classes = {
  BARBARIAN: "Barbarian",
  BARD: "Bard",
  CHAMPION: "Champion",
  CLERIC: "Cleric",
  COMMANDER: "Commander",
  DRUID: "Druid",
  HUNTER: "Hunter",
  MONK: "Monk",
  PSION: "Psion",
  ROGUE: "Rogue",
  SORCERER: "Sorcerer",
  SPELLBLADE: "Spellblade",
  SUMMONER: "Summoner",
  WARLOCK: "Warlock",
  WIZARD: "Wizard",
} as const;

export type DC20Class = (typeof DC20Classes)[keyof typeof DC20Classes];

// Ancestries
export const DC20Ancestries = {
  HUMAN: "Human",
  ELF: "Elf",
  DWARF: "Dwarf",
  HALFLING: "Halfling",
  GNOME: "Gnome",
  ORC: "Orc",
  DRAGONBORN: "Dragonborn",
  GIANTBORN: "Giantborn",
  ANGELBORN: "Angelborn",
  FIENDBORN: "Fiendborn",
  BEASTBORN: "Beastborn",
  PSYBORN: "Psyborn",
  CUSTOM: "Custom",
} as const;

export type DC20Ancestry = (typeof DC20Ancestries)[keyof typeof DC20Ancestries];

// Ancestry trait information
export interface AncestryTrait {
  id: string;
  ancestry: string;
  category: string;
  name: string;
  cost: number;
  description: string;
  isRepeatable: boolean;
  countsAsZeroPointTrait: boolean;
  prerequisite?: string;
}

// Character model with proper DC20 attributes (4, not 6)
export interface Attribute {
  name: DC20Attribute;
  /** In DC20, the attribute value is also the check/save modifier. */
  score: number;
  modifier: number;
}

export type CharacterPathChoice = 'Martial' | 'Spellcaster';

export type CharacterCompanionKind = 'Familiar' | 'Summon' | 'Pet';

/** A persistent, player-editable stat sheet for a familiar, summon, or other companion. */
export interface CharacterCompanion {
  id: string;
  name: string;
  kind: CharacterCompanionKind;
  source: string;
  size: string;
  currentHP: number;
  maxHP: number;
  sharesHealthWithCharacter: boolean;
  currentAP: number;
  maxAP: number;
  physicalDefense: number;
  areaDefense: number;
  speed: number;
  primeModifier: number;
  combatMastery: number;
  attackCheck: number;
  saveDC: number;
  attributes: Record<DC20Attribute, number>;
  features: string;
  notes: string;
}

/** A Druid Wild Form remains available with its own HP and Traits until it reaches 0 HP or the Druid Long Rests. */
export interface DruidWildFormRecord {
  id: string;
  name: string;
  size: string;
  creatureType: string;
  naturalWeaponDamageType: string;
  traits: string[];
  skillMasteries: string[];
  currentHP: number;
  extraMP: number;
  expansionApplied: boolean;
}

export interface CharacterBuildData {
  attributeMethod: AttributeSelectionMethod;
  rolledAttributeResults: number[];
  /** Pool slot to attribute assignments for Standard Array and Rolled generation. */
  attributeAssignments: Array<DC20Attribute | null>;
  /** The +2 creation points and later Attribute Increases allocated after the base pool. */
  attributeBonusPoints: Partial<Record<DC20Attribute, number>>;
  backgroundName: string;
  backgroundStory: string;
  skillPointsConvertedToTrades: number;
  tradePointsConvertedToLanguages: number;
  languageFluencies: Record<string, LanguageFluency>;
  /** Kept only so older saved characters can be migrated without losing language choices. */
  languageMasteries?: Record<string, MasteryLevel>;
  ancestrySecondary: string;
  selectedAncestryTraitIDs: string[];
  /** Number of copies selected for the few ancestry traits the Beta explicitly allows more than once. */
  ancestryTraitCounts?: Record<string, number>;
  ancestryTraitChoices: Record<string, string[]>;
  selectedTalents: string[];
  pathProgressionChoices: Record<string, CharacterPathChoice>;
  classFeatureSelections: Record<string, string[]>;
  /** Class whose Spell List was gained from Character Path progression. */
  selectedSpellListClass: string;
  selectedSpellSource: string;
  selectedSpellSchools: string[];
  selectedSpells: string[];
  selectedCantrips: string[];
  selectedManeuvers: string[];
  currentStamina: number;
  currentMana: number;
  temporaryHP: number;
  /** Remaining recovery currency. A missing value on an older save is treated as full. */
  restPoints?: number;
  /** Number of Short Rest benefits taken since the last Long Rest. */
  shortRestsTaken?: number;
  sheetConditionLevels: Record<string, number>;
  /** Persistent toggles for time-limited class features used from the character sheet. */
  sheetFeatureStates: Record<string, boolean>;
  /** Persistent option selections for class-feature controls used from the character sheet. */
  sheetFeatureSelections: Record<string, string>;
  /** Persistent numeric enhancement choices for class-feature controls used from the character sheet. */
  sheetFeatureCounters: Record<string, number>;
  characterNotes: CampaignNote[];
  sheetCompanions?: CharacterCompanion[];
  /** Persistent, independently damaged Wild Forms currently available to a Druid. */
  druidWildForms?: DruidWildFormRecord[];
  rollAdjustment: number;
  isFinalized: boolean;
}

export interface Character {
  id: string;
  name: string;
  /** Optimized square portrait stored with the character for backups and cloud sync. */
  avatarDataURL?: string;
  level: number;
  ancestry: DC20Ancestry | string;
  size?: string;
  class: DC20Class | string;
  subclass?: string;
  background: string;
  alignment: string;
  // Only 4 attributes in DC20
  attributes: Record<DC20Attribute, Attribute>;
  primeModifier: number; // Derived from highest attribute
  // Mastery system
  skillMasteries: Record<string, MasteryLevel>;
  tradeMasteries: Record<string, MasteryLevel>;
  languages: string[];
  // Combat stats
  healthPoints: number;
  maxHealthPoints: number;
  stamina: number;
  maxStamina: number;
  manaPoints: number;
  maxManaPoints: number;
  currentAP: number;
  maxAP: number;
  physicalDefense: number;
  arcaneDefense: number;
  combatMastery: number;
  speed: number;
  defense: number;
  // Character details
  injuries: Injury[];
  skills: Skill[];
  equipment: Equipment[];
  inventoryItems?: CharacterInventoryItem[];
  spells: Spell[];
  maneuvers: Maneuver[];
  notes: string;
  build?: CharacterBuildData;
}

export interface Skill {
  name: string;
  proficiency: number;
  relatedAbility: string;
}

export interface Injury {
  id: string;
  name: string;
  severity: "minor" | "moderate" | "severe";
  description: string;
}

export interface Equipment {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  rarity: string;
  effects: string[];
}

export const EquipmentCategoryValues = {
  WEAPONS: 'Weapons',
  SPELL_FOCUSES: 'Spell Focuses',
  ARMOR: 'Armor',
  SHIELDS: 'Shields',
  ADVENTURING_SUPPLIES: 'Adventuring Supplies',
  TRADE_TOOLS: 'Trade Tools',
} as const;

export type EquipmentCategory =
  (typeof EquipmentCategoryValues)[keyof typeof EquipmentCategoryValues];

export const EquipmentSlotValues = {
  CARRIED: 'Carried',
  ONE_HAND: 'One Hand',
  TWO_HANDS: 'Two Hands',
  ARMOR: 'Armor',
  WORN: 'Worn',
} as const;

export type EquipmentSlot = (typeof EquipmentSlotValues)[keyof typeof EquipmentSlotValues];

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  category: EquipmentCategory;
  subtype: string;
  summary: string;
  mechanics: string;
  properties: string[];
  slot: EquipmentSlot;
  sourcePage: string;
}

export interface CharacterInventoryItem {
  id: string;
  equipmentID: string;
  quantity: number;
  isEquipped: boolean;
  source: 'startingEquipment' | 'added';
  /** Remaining charges for limited-use supplies such as a Medicine Kit. */
  remainingUses?: number;
}

export interface Spell {
  id: string;
  name: string;
  level?: number;
  source?: string;
  school: string;
  tags?: string;
  cost?: string;
  castingTime?: string;
  range: string;
  components?: string[];
  duration: string;
  description: string;
  enhancements?: string;
}

export interface Maneuver {
  id: string;
  name: string;
  type?: string;
  category?: string;
  cost?: string;
  range: string;
  requirements?: string;
  description: string;
  enhancements?: string;
}

export interface MasteryReference {
  name: string;
  group: string;
  attribute?: string;
  tool?: string;
  typicalSpeakers?: string;
  description: string;
}

export interface ClassFeatureReference {
  name: string;
  description: string;
  /** Subclass feature level, when the source assigns one. Older entries without this field remain visible. */
  level?: number;
}

export interface ClassLevelReference {
  level: number;
  features: ClassFeatureReference[];
}

export interface ClassTableRowReference {
  level: number;
  features: string;
  health?: number;
  attribute?: number;
  skill?: number;
  trade?: number;
  stamina?: number;
  maneuvers?: number;
  mana?: number;
  cantrips?: number;
  spells?: number;
}

export interface ClassChoiceOptionReference {
  name: string;
  description: string;
  isRepeatable: boolean;
  pointCost: number;
  maximumCount?: number;
}

export interface ClassChoiceGroupReference {
  id: string;
  level: number;
  feature: string;
  title: string;
  prompt: string;
  limit: number;
  /** Minimum choices required to finish the builder. Defaults to the selection limit. */
  minimumSelections?: number;
  options: ClassChoiceOptionReference[];
  /** Reuse the option catalog from another choice group without duplicating source data. */
  optionsFromGroup?: string;
  requiredSubclass?: string;
  requiredTalent?: string;
}

export interface ClassReference {
  name: string;
  path: string;
  summary: string;
  description: string;
  baseHP: number;
  levelOneResource: string;
  fixedSpellSource?: string;
  schoolChoiceCount: number;
  spellsKnownAtLevel1: number;
  maneuversKnownAtLevel1: number;
  pathTitle: string;
  pathDetails: string;
  startingEquipment: {
    arsenal: string[];
    arsenalCount: number;
    armor: string[];
    tradeTools: string[];
    tradeToolCount: number;
    description: string;
  };
  tableSource: string;
  tableColumns: string[];
  tableRows: ClassTableRowReference[];
  features: ClassLevelReference[];
  subclasses: string[];
  subclassFeatures: Record<string, ClassFeatureReference[]>;
  talents: Array<{ name: string; description: string; minimumLevel: number; isRepeatable: boolean }>;
  choiceGroups: ClassChoiceGroupReference[];
}

export interface CharacterReferenceData {
  source: string;
  ancestries: string[];
  ancestryTraits: AncestryTrait[];
  generalAncestryTraits: AncestryTrait[];
  skills: MasteryReference[];
  trades: MasteryReference[];
  languages: MasteryReference[];
  skillGroups: Array<{ name: string; options: string[] }>;
  tradeGroups: Array<{ name: string; options: string[] }>;
  languageGroups: Array<{ name: string; options: string[] }>;
  classes: ClassReference[];
}

export interface RuleReferenceEntry {
  id: string;
  title: string;
  section: string;
  subsection: string;
  summary: string;
  text: string;
  page: string;
  kind: 'Overview' | 'Rule' | 'Skill' | 'Trade' | 'Language' | 'Maneuver' | 'Spell' | 'Condition' | 'Equipment' | 'Talent' | 'Ancestry' | 'Class' | 'Subclass';
  keywords: string;
  characterClass?: string;
  subclassName?: string;
}

export interface RulesReferenceData {
  source: string;
  sections: Array<{ name: string; pageRange: string }>;
  entries: RuleReferenceEntry[];
}

export const MonsterTypeValues = {
  MINION: "Minion",
  STANDARD: "Standard",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
} as const;

export type MonsterType = (typeof MonsterTypeValues)[keyof typeof MonsterTypeValues];

export const MonsterRoleValues = {
  BRUTE: "Brute",
  DEFENDER: "Defender",
  LEADER: "Leader",
  SOLDIER: "Soldier",
  STRIKER: "Striker",
  TACTICIAN: "Tactician",
} as const;

export type MonsterRole = (typeof MonsterRoleValues)[keyof typeof MonsterRoleValues];

export const MonsterAbilityKindValues = {
  TRAIT: "Traits",
  FEATURE: "Features",
  ACTION: "Actions",
  REACTION: "Reactions",
  ROUND_ACTION: "Round Actions",
} as const;

export type MonsterAbilityKind =
  (typeof MonsterAbilityKindValues)[keyof typeof MonsterAbilityKindValues];

export interface MonsterAbility {
  id: string;
  kind: MonsterAbilityKind;
  name: string;
  cost: string;
  details: string;
  traitValue?: number;
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  type: MonsterType;
  role: MonsterRole;
  hp: number;
  physicalDefense: number;
  arcaneDefense: number;
  attackBonus: number;
  saveDC: number;
  damage: number;
  notes: string;
  sourceBook?: string;
  sourcePage?: number;
  publishedRole?: string;
  size: string;
  creatureType: string;
  descriptionText: string;
  tactics: string;
  lore: string;
  actionPoints?: number;
  reactionPoints?: number;
  speed: number;
  primeModifier: number;
  combatMastery: number;
  might: number;
  agility: number;
  charisma: number;
  intelligence: number;
  skills: string;
  senses: string;
  languages: string;
  otherSpeeds: string;
  reductions: string;
  resistances: string;
  vulnerabilities: string;
  immunities: string;
  abilities: MonsterAbility[];
}

export interface Rule {
  id: string;
  name: string;
  category: string;
  description: string;
  source: string;
}

export interface Encounter {
  id: string;
  name: string;
  partyLevels: number[];
  entries: EncounterEntry[];
  notes: string;
}

export interface EncounterEntry {
  id: string;
  monster: Monster;
  count: number;
}

export interface HubState {
  currentSection: HubSection;
  campaignData: CampaignData;
  characters: Character[];
  selectedCharacterId: string | null;
  selectedMonsterId: string | null;
  selectedEncounterId: string | null;
  selectedCombatId: string | null;
  selectedCampaignId: string | null;
  isDarkMode: boolean;
  selectedPaletteID: string;
}
