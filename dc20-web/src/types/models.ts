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
  HEROES: "heroes",
  ENEMIES: "enemies",
} as const;

export type CombatantTeam = (typeof CombatantTeamValues)[keyof typeof CombatantTeamValues];

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  stamina: number;
  maxStamina: number;
  status: string;
  team: CombatantTeam;
}

export interface SavedCombat {
  id: string;
  name: string;
  combatants: Combatant[];
  round: number;
  firstTeam: CombatantTeam;
}

export interface CampaignData {
  title: string;
  notes: string;
  combats: SavedCombat[];
  campaigns: CampaignRecord[];
  customMonsters: Monster[];
}

export interface Attribute {
  name: string;
  score: number;
  modifier: number;
}

// DC20 Classes
export const DC20Classes = {
  BARBARIAN: "Barbarian",
  BARD: "Bard",
  CHAMPION: "Champion",
  CLERIC: "Cleric",
  COMMANDER: "Commander",
  DRUID: "Druid",
  HUNTER: "Hunter",
  MONK: "Monk",
  ROGUE: "Rogue",
  SORCERER: "Sorcerer",
  SPELLBLADE: "Spellblade",
  WARLOCK: "Warlock",
  WIZARD: "Wizard",
} as const;

export type DC20Class = (typeof DC20Classes)[keyof typeof DC20Classes];

// DC20 Ancestries
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
} as const;

export type DC20Ancestry = (typeof DC20Ancestries)[keyof typeof DC20Ancestries];

// DC20 Attributes (the 6 core stats)
export const DC20Attributes = {
  MIGHT: "Might",
  INTELLECT: "Intellect",
  PRESENCE: "Presence",
  AGILITY: "Agility",
  FORTITUDE: "Fortitude",
  ATTUNEMENT: "Attunement",
} as const;

export type DC20Attribute = (typeof DC20Attributes)[keyof typeof DC20Attributes];

export interface Character {
  id: string;
  name: string;
  level: number;
  ancestry: DC20Ancestry;
  class: DC20Class;
  subclass?: string;
  background: string;
  alignment: string;
  // Attributes (Might, Intellect, Presence, Agility, Fortitude, Attunement)
  attributes: Record<DC20Attribute, Attribute>;
  // Combat stats
  healthPoints: number;
  maxHealthPoints: number;
  stamina: number;
  maxStamina: number;
  manaPoints: number;
  maxManaPoints: number;
  defense: number;
  // Character details
  injuries: Injury[];
  skills: Skill[];
  equipment: Equipment[];
  spells: Spell[];
  maneuvers: Maneuver[];
  notes: string;
}

export interface Ability {
  name: string;
  score: number;
  modifier: number;
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

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
}

export interface Maneuver {
  id: string;
  name: string;
  type: string;
  range: string;
  description: string;
}

export interface Monster {
  id: string;
  name: string;
  type: string;
  alignment: string;
  ac: number;
  stamina: number;
  speed: Record<string, string>;
  abilities: Ability[];
  skills: Record<string, number>;
  languages: string[];
  traits: MonsterTrait[];
  actions: MonsterAction[];
}

export interface MonsterTrait {
  name: string;
  description: string;
}

export interface MonsterAction {
  name: string;
  description: string;
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
  location: string;
  monsters: Monster[];
  difficulty: "easy" | "medium" | "hard" | "deadly";
  notes: string;
}

export interface HubState {
  currentSection: HubSection;
  campaignData: CampaignData;
  characters: Character[];
  selectedCharacterId: string | null;
  isDarkMode: boolean;
}
