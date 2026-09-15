// Core DC20 TTRPG Data Models ported from Swift

export const HubSectionValues = {
  DASHBOARD: "Dashboard",
  LIBRARY: "Library",
  CHARACTER_OPTIONS: "Character Options",
  HOMEBREW: "Homebrew",
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
  "Library": "books.vertical.fill",
  "Character Options": "person.text.rectangle",
  "Homebrew": "hammer.fill",
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
  visibility?: CampaignNoteVisibility;
  visibleToUserIDs?: string[];
  playerCanEdit?: boolean;
  /** Cloud storage scope used to safely move a note when its visibility changes. */
  storageScope?: 'shared' | 'gm' | 'selected';
  updatedAt?: string;
  updatedByName?: string;
}

export type CampaignNoteVisibility = 'Shared' | 'GM Only' | 'Selected Players';
export type PartyCampaignRole = 'gm' | 'co-gm' | 'player';

export interface ThemePalette {
  id: string;
  name: string;
  associatedClass: string;
  symbol: string;
  accent: string;
  highlight: string;
  background: string;
  backgroundSecondary: string;
  custom?: boolean;
}

export type AppearanceMode = 'System' | 'Light' | 'Dark';
export type InterfaceScale = 'Small' | 'Standard' | 'Large' | 'Extra Large';
export type BackgroundTexture = 'None' | 'Arcane Mist' | 'Parchment' | 'Starfield';
export type AnimationLevel = 'None' | 'Reduced' | 'Full';
export type AppearanceSyncScope = 'Cloud' | 'Device';

export interface AppearanceSettings {
  mode: AppearanceMode;
  interfaceScale: InterfaceScale;
  automaticClassThemes: boolean;
  campaignThemes: boolean;
  backgroundTexture: BackgroundTexture;
  glowIntensity: number;
  panelTransparency: number;
  shadowIntensity: number;
  animationLevel: AnimationLevel;
  syncScope: AppearanceSyncScope;
}

export interface CampaignAppearance {
  paletteID: string;
  paletteSnapshot?: ThemePalette;
  icon?: string;
  bannerDataURL?: string;
  shareWithPlayers: boolean;
}

export interface PartyCampaignPermissions {
  playersCanCreateSharedNotes: boolean;
  playersCanEditSharedNotes: boolean;
  playersCanManageInventory: boolean;
}

export interface CampaignPartyLink {
  partyId: string;
  role: PartyCampaignRole;
  inviteCode?: string;
  characterId?: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  notes: CampaignNote[];
  party?: CampaignPartyLink;
  appearance?: CampaignAppearance;
}

export interface PartyCampaignMember {
  userId: string;
  displayName: string;
  role: PartyCampaignRole;
  characterId?: string;
  character?: Character;
  joinedAt: string;
  updatedAt: string;
}

export interface PartyInventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  addedBy: string;
  updatedAt: string;
  /** Catalog identity and snapshot make shared equipment usable across accounts and future catalog revisions. */
  equipmentID?: string;
  itemSnapshot?: EquipmentCatalogItem;
  ownerCharacterID?: string;
  ownerName?: string;
  goldCost?: number;
  remainingUses?: number;
  distributedByGM?: boolean;
  container?: string;
  isEquipped?: boolean;
  requestable?: boolean;
}

export type PartyInventoryRequestStatus = 'Pending' | 'Approved' | 'Denied';

export interface PartyInventoryRequest {
  id: string;
  itemId: string;
  itemName: string;
  requesterUserId: string;
  requesterName: string;
  characterId?: string;
  characterName?: string;
  status: PartyInventoryRequestStatus;
  createdAt: string;
  updatedAt: string;
  resolvedBy?: string;
}

export interface PartyInventoryLedgerEntry {
  id: string;
  action: string;
  itemId?: string;
  itemName?: string;
  actorUserId: string;
  actorName: string;
  details: string;
  createdAt: string;
}

export const VaultContentKindValues = {
  ITEM: 'Magic Item',
  TALENT: 'Talent',
  FEATURE: 'Feature',
  SPELL: 'Spell',
  MANEUVER: 'Maneuver',
  COMPANION: 'Pet / Summon / Familiar',
  OTHER: 'Other',
} as const;

export type VaultContentKind = (typeof VaultContentKindValues)[keyof typeof VaultContentKindValues];

export type VaultRecharge = 'Manual' | 'Quick Rest' | 'Short Rest' | 'Long Rest';

export type VaultEntryStatus = 'Draft' | 'Ready' | 'Archived';
export type VaultEffectActivation = 'Passive' | 'Equipped' | 'Attuned' | 'Manual Toggle' | 'Conditional';
export type VaultDistributionMode = 'Player Choice' | 'Assigned Characters';

export interface VaultDistribution {
  mode: VaultDistributionMode;
  /** Empty means every character in the campaign can claim the entry. */
  characterIDs: string[];
  quantityLimit?: number;
  notes?: string;
}

/** A compact JSON snapshot avoids recursive history while keeping every saved version recoverable. */
export interface VaultEntryRevision {
  id: string;
  version: number;
  savedAt: string;
  snapshot: string;
}

/** Numeric and reference effects that custom Vault content can route into a character sheet. */
export interface VaultMechanicalEffects {
  attributeBonuses?: Partial<Record<DC20Attribute, number>>;
  skillBonuses?: Record<string, number>;
  tradeBonuses?: Record<string, number>;
  saveBonuses?: Partial<Record<DC20Attribute | 'Physical' | 'Mental', number>>;
  allCheckBonus?: number;
  martialCheckBonus?: number;
  spellCheckBonus?: number;
  spellAttackBonus?: number;
  saveDCBonus?: number;
  weaponDamageBonus?: number;
  spellDamageBonus?: number;
  maxHPBonus?: number;
  maxStaminaBonus?: number;
  maxManaBonus?: number;
  physicalDefenseBonus?: number;
  areaDefenseBonus?: number;
  speedBonus?: number;
  skillMasteryIncreases?: Record<string, number>;
  skillBonusesAtCap?: Record<string, number>;
  conditionSaveAdvantages?: string[];
  advantageRules?: string[];
  disadvantageRules?: string[];
  movementModes?: string[];
  vulnerabilities?: string[];
  damageReductions?: string[];
  conditionsGranted?: string[];
  weaponSpecificBonuses?: Record<string, number>;
  spellSpecificBonuses?: Record<string, number>;
  resistances?: string[];
  immunities?: string[];
  senses?: string[];
  conditionalRules?: string[];
}

export interface VaultRequirements {
  minimumLevel?: number;
  classes?: string[];
  ancestries?: string[];
  notes?: string;
}

/** Private GM-authored content. A campaign receives a copy, never edit access to this original. */
export interface GmVaultEntry {
  id: string;
  kind: VaultContentKind;
  name: string;
  summary: string;
  description: string;
  tags: string[];
  folder?: string;
  favorite?: boolean;
  status?: VaultEntryStatus;
  version?: number;
  revisions?: VaultEntryRevision[];
  /** Other private entries packaged with this one. Shared copies also carry portable snapshots. */
  linkedEntryIDs?: string[];
  bundledEntries?: GmVaultEntry[];
  activation?: VaultEffectActivation;
  duration?: string;
  stacking?: string;
  distribution?: VaultDistribution;
  requirements: VaultRequirements;
  effects: VaultMechanicalEffects;
  /** Limited uses for accepted Talents and Features. The remaining value is character-owned state. */
  charges?: number;
  remainingCharges?: number;
  recharge?: VaultRecharge;
  /** Complete spell snapshots keep custom spell grants self-contained when shared with a campaign. */
  grantedSpells?: Spell[];
  item?: EquipmentCatalogItem;
  spell?: Spell;
  /** Reserved for the forthcoming custom-maneuver editor and already consumable by linked pickers. */
  maneuver?: Maneuver;
  companion?: CharacterCompanion;
  createdAt: string;
  updatedAt: string;
}

export interface PartyCampaignSnapshot {
  id: string;
  name: string;
  gmUserId: string;
  gmDisplayName: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
  role: PartyCampaignRole;
  permissions: PartyCampaignPermissions;
  members: PartyCampaignMember[];
  notes: CampaignNote[];
  inventory: PartyInventoryItem[];
  inventoryRequests: PartyInventoryRequest[];
  inventoryLedger: PartyInventoryLedgerEntry[];
  vaultEntries: GmVaultEntry[];
  gold: number;
  appearance?: CampaignAppearance;
}

export const CombatantTeamValues = {
  HEROES: "Heroes",
  ENEMIES: "Enemies",
  NEUTRAL: "Neutral",
} as const;

export type CombatantTeam = (typeof CombatantTeamValues)[keyof typeof CombatantTeamValues];

export type CombatTurnState = 'Ready' | 'Active' | 'Delayed' | 'Readied' | 'Skipped' | 'Defeated' | 'Escaped' | 'Surrendered' | 'Captured';
export type CombatEffectTiming = 'Manual' | 'Start of Turn' | 'End of Turn' | 'Start of Round' | 'End of Round';

export interface CombatConditionEffect {
  id: string;
  name: string;
  level: number;
  source: string;
  remainingRounds?: number;
  expiresAt: CombatEffectTiming;
  saveDC?: number;
  description?: string;
}

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
  sourcePartyCampaignID?: string;
  sourcePartyMemberID?: string;
  monsterAbilities?: MonsterAbility[];
  /** Self-contained token snapshot so saved combats do not depend on a mutable monster record. */
  tokenDataURL?: string;
  initiative?: number;
  initiativeBonus?: number;
  turnState?: CombatTurnState;
  activeConditions?: CombatConditionEffect[];
  visibility?: 'Visible' | 'Hidden';
  maxStamina?: number;
  stamina?: number;
  maxMana?: number;
  mana?: number;
  reductions?: string;
  resistances?: string;
  vulnerabilities?: string;
  immunities?: string;
  movementDetails?: string;
}

export type CombatHistoryKind = 'Turn' | 'Damage' | 'Healing' | 'Condition' | 'Resource' | 'Roster' | 'Note' | 'System';

export interface CombatHistoryEntry {
  id: string;
  timestamp: string;
  round: number;
  kind: CombatHistoryKind;
  text: string;
  private: boolean;
}

export interface CombatUndoSnapshot {
  id: string;
  label: string;
  round: number;
  combatants: Combatant[];
  initiativeOrder: string[];
  activeCombatantID?: string;
  status: 'Active' | 'Paused' | 'Completed';
  completedAt?: string;
}

export interface SavedCombat {
  id: string;
  name: string;
  combatants: Combatant[];
  round: number;
  firstTeam: CombatantTeam;
  notes: string;
  sourceEncounterID?: string;
  initiativeMode?: 'Team' | 'Individual';
  initiativeOrder?: string[];
  activeCombatantID?: string;
  status?: 'Active' | 'Paused' | 'Completed';
  history?: CombatHistoryEntry[];
  undoStack?: CombatUndoSnapshot[];
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  playerView?: boolean;
}

export interface CampaignData {
  title: string;
  notes: string;
  combats: SavedCombat[];
  campaigns: CampaignRecord[];
  customMonsters: Monster[];
  customEquipment: EquipmentCatalogItem[];
  vaultEntries: GmVaultEntry[];
  encounters: Encounter[];
  monsterLibrary: MonsterLibraryOrganization;
}

/** User-owned organization layered over immutable sourcebook and custom monster records. */
export interface MonsterLibraryOrganization {
  favoriteIDs: string[];
  recentIDs: string[];
  tagsByMonsterID: Record<string, string[]>;
  folderByMonsterID: Record<string, string>;
  campaignIDsByMonsterID: Record<string, string[]>;
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
  ARTIFICER: "Artificer",
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

export type CharacterCompanionAbilityKind = 'Trait' | 'Feature' | 'Action' | 'Reaction';

export interface CharacterCompanionAbility {
  id: string;
  kind: CharacterCompanionAbilityKind;
  name: string;
  cost: string;
  details: string;
}

/** A persistent, player-editable stat sheet for a familiar, summon, or other companion. */
export interface CharacterCompanion {
  id: string;
  /** Links a copied campaign companion back to the accepted GM Vault entry. */
  sourceVaultEntryID?: string;
  name: string;
  kind: CharacterCompanionKind;
  source: string;
  linkedSpellName?: string;
  creatureType?: string;
  level?: number;
  size: string;
  currentHP: number;
  maxHP: number;
  sharesHealthWithCharacter: boolean;
  currentAP: number;
  maxAP: number;
  currentRP?: number;
  maxRP?: number;
  physicalDefense: number;
  areaDefense: number;
  speed: number;
  speedType?: string;
  otherSpeeds?: string;
  damage?: number;
  primeModifier: number;
  combatMastery: number;
  attackCheck: number;
  saveDC: number;
  attributes: Record<DC20Attribute, number>;
  usesOwnerStats?: boolean;
  actsOnOwnersTurn?: boolean;
  requiresCommand?: boolean;
  canAttack?: boolean;
  skills?: string;
  senses?: string;
  languages?: string;
  reductions?: string;
  resistances?: string;
  vulnerabilities?: string;
  immunities?: string;
  categoryRules?: string;
  abilities?: CharacterCompanionAbility[];
  features: string;
  notes: string;
}

/** A consumable or poison currently being resolved from the character sheet. */
export interface CharacterTrackedEffect {
  id: string;
  name: string;
  sourceItemID: string;
  kind: 'Consumable' | 'Poison';
  target: string;
  description: string;
  durationLabel: string;
  /** Source tags retained so cures and other item interactions can distinguish effect tiers. */
  tags?: string[];
  remainingRounds?: number;
  healingPerTurn?: number;
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
  /** Active item effects with targets and optional round-by-round duration tracking. */
  sheetTrackedEffects?: CharacterTrackedEffect[];
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
  /** Fully derived Class Save DC, including active custom bonuses. */
  saveDC?: number;
  speed: number;
  defense: number;
  // Character details
  injuries: Injury[];
  skills: Skill[];
  equipment: Equipment[];
  inventoryItems?: CharacterInventoryItem[];
  /** Current spendable gold. Older saved characters default to 0. */
  gold?: number;
  spells: Spell[];
  maneuvers: Maneuver[];
  /** Self-contained snapshots accepted from a campaign's shared GM Vault. */
  vaultEntries?: GmVaultEntry[];
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
  SIEGE_WEAPONS: 'Siege Weapons',
  SPELL_FOCUSES: 'Spell Focuses',
  ARMOR: 'Armor',
  SHIELDS: 'Shields',
  WONDROUS_ITEMS: 'Wondrous Items',
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

export interface MagicItemFeature {
  name: string;
  power: number;
  description: string;
  requiresAttunement?: boolean;
  chargeCost?: number | 'X';
}

export interface EquipmentSheetEffects {
  resistances?: string[];
  skillMasteryIncreases?: Record<string, number>;
  skillBonusesAtCap?: Record<string, number>;
  immuneToFlanking?: boolean;
  senses?: string[];
  conditionalRules?: string[];
  conditionSaveAdvantages?: string[];
  attributeBonuses?: Partial<Record<DC20Attribute, number>>;
  skillBonuses?: Record<string, number>;
  tradeBonuses?: Record<string, number>;
  saveBonuses?: Partial<Record<DC20Attribute | 'Physical' | 'Mental', number>>;
  allCheckBonus?: number;
  martialCheckBonus?: number;
  spellCheckBonus?: number;
  spellAttackBonus?: number;
  saveDCBonus?: number;
  weaponDamageBonus?: number;
  spellDamageBonus?: number;
  maxHPBonus?: number;
  maxStaminaBonus?: number;
  maxManaBonus?: number;
  physicalDefenseBonus?: number;
  areaDefenseBonus?: number;
  speedBonus?: number;
  immunities?: string[];
}

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
  ruleReferences?: SemanticRuleReference[];
  /** Separates ordinary gear from supplemental magic-item catalogs. */
  collection?: 'Standard' | 'Magic';
  sourceDocument?: string;
  magicPower?: number;
  charges?: number;
  /** Printed label for the item's tracked pool; consumables use Uses while rechargeable items use Charges. */
  usageLabel?: 'Charges' | 'Uses';
  requiresAttunement?: boolean;
  magicFeatures?: MagicItemFeature[];
  /** A magic weapon can carry published statistics without replacing its source-accurate flavor summary. */
  weaponProfile?: {
    baseDamage: number;
    damageTypes: string[];
    range: string;
    styles: string[];
    isNativeRanged: boolean;
    canBeThrown: boolean;
    thrownRange?: string;
    heavyHitDamageBonus: number;
  };
  /** Some magic weapons also function as Spell Focuses. */
  actsAsSpellFocus?: boolean;
  grantedSpells?: string[];
  equippedEffects?: EquipmentSheetEffects;
  attunedEffects?: EquipmentSheetEffects;
}

export interface CharacterInventoryItem {
  id: string;
  equipmentID: string;
  quantity: number;
  isEquipped: boolean;
  source: 'startingEquipment' | 'added';
  /**
   * Self-contained copy of player-created equipment. Published catalog items stay ID-only,
   * while custom items carry this snapshot so shared/read-only character sheets can render
   * and apply them on a different account or device.
   */
  itemSnapshot?: EquipmentCatalogItem;
  /** Remaining charges for limited-use supplies such as a Medicine Kit. */
  remainingUses?: number;
  /** Attunement is tracked separately from whether an item is currently equipped. */
  isAttuned?: boolean;
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
  page?: number;
  resolution?: import('../utils/powerRules').PowerResolution;
  alternateResolutions?: import('../utils/powerRules').PowerResolution[];
  reaction?: boolean;
  sourceNote?: string;
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
  page?: number;
  resolution?: import('../utils/powerRules').PowerResolution;
  alternateResolutions?: import('../utils/powerRules').PowerResolution[];
  reaction?: boolean;
  sourceNote?: string;
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
  /** Printed source used to verify this reference record. */
  sourceDocument?: string;
  /** Exact printed source pages, excluding intentionally broad overview records. */
  sourcePages?: number[];
  /** A source-side typo or discrepancy retained for fidelity and explained to the reader. */
  sourceNote?: string;
  /** Compact rules metadata displayed above the source text. */
  details?: Array<{ label: string; value: string }>;
  /** Important calculations pulled out of prose for fast table use. */
  formulas?: string[];
  /** Exact document IDs that can be opened from this reference. */
  relatedIDs?: string[];
  /** Describes how faithfully the displayed text represents its cited source. */
  sourceStatus?: 'Beta source verified' | 'Supplemental source verified' | 'Verified source excerpt' | 'Condensed source reference' | 'Catalog source reference';
}

/** Semantic rules link stored separately from canonical display text. */
export interface SemanticRuleReference {
  ruleId: string;
  text?: string;
  start?: number;
  end?: number;
  rulesVersion?: string;
  /** Keeps matching text plain without altering the canonical description. */
  disabled?: boolean;
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

export interface MonsterAbilityPowerSource {
  kind: 'Spell' | 'Maneuver';
  id: string;
  source: string;
  custom: boolean;
}

export type MonsterAbilityTargetDefense = 'None' | 'PD' | 'AD' | 'Save';

/** Optional structured mechanics used by the builder, compact blocks, and matchup analysis. */
export interface MonsterAbilityMechanics {
  actionPointCost?: number;
  reactionPointCost?: number;
  staminaCost?: number;
  manaCost?: number;
  attackType?: string;
  targetDefense?: MonsterAbilityTargetDefense;
  saveType?: string;
  damage?: number;
  damageType?: string;
  range?: string;
  area?: string;
  duration?: string;
  condition?: string;
  recharge?: string;
  maximumUses?: number;
  grantsAbilityID?: string;
  modifiesAbilityID?: string;
}

export interface MonsterAbility {
  id: string;
  kind: MonsterAbilityKind;
  name: string;
  cost: string;
  details: string;
  traitValue?: number;
  /** The catalog power copied into this self-contained monster ability, when applicable. */
  sourcePower?: MonsterAbilityPowerSource;
  mechanics?: MonsterAbilityMechanics;
  ruleReferences?: SemanticRuleReference[];
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
  speedType?: string;
  primeModifier: number;
  combatMastery: number;
  might: number;
  agility: number;
  charisma: number;
  intelligence: number;
  /** Combat and equipment training, stored as display-ready text for custom and published stat blocks. */
  training: string;
  skills: string;
  senses: string;
  languages: string;
  otherSpeeds: string;
  reductions: string;
  resistances: string;
  vulnerabilities: string;
  immunities: string;
  abilities: MonsterAbility[];
  /** Custom tags and environments remain useful when a monster is copied or exported. */
  tags?: string[];
  environments?: string[];
  /** Cloud-safe compressed image snapshots. Artwork is wide; tokens are center-cropped squares. */
  artworkDataURL?: string;
  tokenDataURL?: string;
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
  partyCharacters?: EncounterPartyCharacter[];
  entries: EncounterEntry[];
  notes: string;
}

export interface EncounterPartyCharacter {
  id: string;
  partyId: string;
  memberId: string;
  partyName: string;
  memberName: string;
  character: Character;
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
  customPalettes: ThemePalette[];
  appearanceSettings: AppearanceSettings;
}
