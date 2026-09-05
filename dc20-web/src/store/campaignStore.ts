import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CampaignData,
  CampaignRecord,
  Character,
  CharacterBuildData,
  Combatant,
  CombatantTeam,
  Encounter,
  EquipmentCatalogItem,
  HubSection,
  HubState,
  Monster,
  MonsterAbility,
  MonsterAbilityKind,
  MonsterRole,
  MonsterType,
  SavedCombat,
} from '../types/models';
import {
  CombatantTeamValues,
  DC20Attributes,
  EquipmentCategoryValues,
  EquipmentSlotValues,
  HubSectionValues,
  MonsterAbilityKindValues,
  MonsterRoleValues,
  MonsterTypeValues,
} from '../types/models';
import { classHealth, combatMastery, defaultBuild } from '../utils/characterRules';
import {
  createCustomMonster,
  monsterActionPoints,
  monsterReactionPoints,
  synchronizeCombatant,
} from '../utils/monsterRules';
import { generateUUID } from '../utils/gameUtils';
import { DEFAULT_PALETTE_ID, themePalette } from '../data/themePalettes';

const STORE_VERSION = 7;

export const defaultCampaignData: CampaignData = {
  title: 'DC20 Hub',
  notes: 'Welcome to your campaign. Keep locations, factions, session notes, and secrets here.',
  combats: [],
  campaigns: [],
  customMonsters: [],
  customEquipment: [],
  encounters: [],
};

interface CampaignStore extends HubState {
  lastSavedAt: string | null;
  setCurrentSection: (section: HubSection) => void;
  updateCampaignData: (data: Partial<CampaignData>) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (character: Character) => void;
  deleteCharacter: (id: string) => void;
  selectCharacter: (id: string | null) => void;
  selectMonster: (id: string | null) => void;
  selectEncounter: (id: string | null) => void;
  selectCombat: (id: string | null) => void;
  selectCampaign: (id: string | null) => void;
  toggleDarkMode: () => void;
  setSelectedPalette: (id: string) => void;
  exportData: () => string;
  importData: (value: unknown) => void;
  saveCampaign: () => void;
  loadCampaign: () => void;
  addCampaign: (campaign: CampaignRecord) => void;
  updateCampaign: (campaign: CampaignRecord) => void;
  removeCampaign: (id: string) => void;
  addCombat: (combat: SavedCombat) => void;
  removeCombat: (id: string) => void;
  updateCombat: (combat: SavedCombat) => void;
  addEncounter: (encounter: Encounter) => void;
  updateEncounter: (encounter: Encounter) => void;
  removeEncounter: (id: string) => void;
  addCustomMonster: (monster: Monster) => void;
  updateCustomMonster: (monster: Monster) => void;
  removeCustomMonster: (id: string) => void;
  addCustomEquipment: (item: EquipmentCatalogItem) => void;
  updateCustomEquipment: (item: EquipmentCatalogItem) => void;
  removeCustomEquipment: (id: string) => void;
}

type PersistedCampaignState = Pick<
  CampaignStore,
  | 'currentSection'
  | 'campaignData'
  | 'characters'
  | 'selectedCharacterId'
  | 'selectedMonsterId'
  | 'selectedEncounterId'
  | 'selectedCombatId'
  | 'selectedCampaignId'
  | 'isDarkMode'
  | 'selectedPaletteID'
  | 'lastSavedAt'
>;

function persistedSlice(state: CampaignStore): PersistedCampaignState {
  return {
    currentSection: state.currentSection,
    campaignData: state.campaignData,
    characters: state.characters,
    selectedCharacterId: state.selectedCharacterId,
    selectedMonsterId: state.selectedMonsterId,
    selectedEncounterId: state.selectedEncounterId,
    selectedCombatId: state.selectedCombatId,
    selectedCampaignId: state.selectedCampaignId,
    isDarkMode: state.isDarkMode,
    selectedPaletteID: state.selectedPaletteID,
    lastSavedAt: state.lastSavedAt,
  };
}

function asNumber(value: unknown, fallback: number): number {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
}

function normalizeMonsterType(value: unknown): MonsterType {
  return Object.values(MonsterTypeValues).includes(value as MonsterType)
    ? value as MonsterType
    : MonsterTypeValues.STANDARD;
}

function normalizeMonsterRole(value: unknown): MonsterRole {
  return Object.values(MonsterRoleValues).includes(value as MonsterRole)
    ? value as MonsterRole
    : MonsterRoleValues.SOLDIER;
}

function normalizeAbility(value: unknown): MonsterAbility | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const rawKind = item.kind;
  const kind = Object.values(MonsterAbilityKindValues).includes(rawKind as MonsterAbilityKind)
    ? rawKind as MonsterAbilityKind
    : MonsterAbilityKindValues.FEATURE;
  const traitValue = item.traitValue === undefined ? undefined : asNumber(item.traitValue, 0);
  return {
    id: typeof item.id === 'string' ? item.id : generateUUID(),
    kind,
    name: typeof item.name === 'string' ? item.name : 'Unnamed Ability',
    cost: typeof item.cost === 'string' ? item.cost : '',
    details: typeof item.details === 'string'
      ? item.details
      : typeof item.description === 'string' ? item.description : '',
    traitValue,
  };
}

function normalizeCustomEquipment(value: unknown): EquipmentCatalogItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  if (!name) return null;
  const description = typeof item.mechanics === 'string'
    ? item.mechanics
    : typeof item.summary === 'string' ? item.summary : '';
  return {
    id: typeof item.id === 'string' ? item.id : `custom-equipment-${generateUUID()}`,
    name,
    category: Object.values(EquipmentCategoryValues).includes(item.category as EquipmentCatalogItem['category'])
      ? item.category as EquipmentCatalogItem['category']
      : EquipmentCategoryValues.ADVENTURING_SUPPLIES,
    subtype: 'Custom Item',
    summary: typeof item.summary === 'string' ? item.summary : description,
    mechanics: description,
    properties: Array.isArray(item.properties) ? item.properties.filter((entry): entry is string => typeof entry === 'string') : [],
    slot: Object.values(EquipmentSlotValues).includes(item.slot as EquipmentCatalogItem['slot'])
      ? item.slot as EquipmentCatalogItem['slot']
      : EquipmentSlotValues.CARRIED,
    sourcePage: 'Custom Item',
  };
}

function normalizeMonster(value: unknown): Monster {
  if (!value || typeof value !== 'object') return createCustomMonster();
  const item = value as Record<string, unknown>;
  const level = Math.min(20, Math.max(-1, Math.trunc(asNumber(item.level, 1))));
  const type = normalizeMonsterType(item.type);
  const role = normalizeMonsterRole(item.role);
  const baseline = createCustomMonster(level, type, role);
  const legacyTraits = Array.isArray(item.traits) ? item.traits : [];
  const legacyActions = Array.isArray(item.actions) ? item.actions : [];
  const suppliedAbilities = Array.isArray(item.abilities)
    ? item.abilities
        .filter((ability) => {
          if (!ability || typeof ability !== 'object') return false;
          const record = ability as Record<string, unknown>;
          return 'kind' in record || 'details' in record || 'cost' in record;
        })
        .map(normalizeAbility)
        .filter((entry): entry is MonsterAbility => entry !== null)
    : [];
  const migratedAbilities: MonsterAbility[] = suppliedAbilities.length > 0
    ? suppliedAbilities
    : [
        ...legacyTraits.map((trait) => normalizeAbility({
          ...(trait as Record<string, unknown>),
          kind: MonsterAbilityKindValues.FEATURE,
        })),
        ...legacyActions.map((action) => normalizeAbility({
          ...(action as Record<string, unknown>),
          kind: MonsterAbilityKindValues.ACTION,
        })),
      ].filter((entry): entry is MonsterAbility => entry !== null);
  const legacySpeed = item.speed && typeof item.speed === 'object'
    ? Object.values(item.speed as Record<string, unknown>)[0]
    : item.speed;

  return {
    ...baseline,
    id: typeof item.id === 'string' ? item.id : generateUUID(),
    name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Unnamed Monster',
    hp: asNumber(item.hp ?? item.stamina, baseline.hp),
    physicalDefense: asNumber(item.physicalDefense ?? item.ac, baseline.physicalDefense),
    arcaneDefense: asNumber(item.arcaneDefense ?? item.ac, baseline.arcaneDefense),
    attackBonus: asNumber(item.attackBonus, baseline.attackBonus),
    saveDC: asNumber(item.saveDC, baseline.saveDC),
    damage: asNumber(item.damage, baseline.damage),
    notes: typeof item.notes === 'string' ? item.notes : '',
    sourceBook: typeof item.sourceBook === 'string' ? item.sourceBook : undefined,
    sourcePage: item.sourcePage === undefined ? undefined : asNumber(item.sourcePage, 0),
    publishedRole: typeof item.publishedRole === 'string' ? item.publishedRole : undefined,
    size: typeof item.size === 'string' ? item.size : baseline.size,
    creatureType: typeof item.creatureType === 'string'
      ? item.creatureType
      : typeof item.type === 'string' && !Object.values(MonsterTypeValues).includes(item.type as MonsterType)
        ? item.type
        : '',
    descriptionText: typeof item.descriptionText === 'string' ? item.descriptionText : '',
    tactics: typeof item.tactics === 'string' ? item.tactics : '',
    lore: typeof item.lore === 'string' ? item.lore : '',
    actionPoints: asNumber(item.actionPoints, monsterActionPoints(type)),
    reactionPoints: asNumber(item.reactionPoints, monsterReactionPoints(type)),
    speed: asNumber(legacySpeed, baseline.speed),
    primeModifier: asNumber(item.primeModifier, baseline.primeModifier),
    combatMastery: asNumber(item.combatMastery, baseline.combatMastery),
    might: asNumber(item.might, baseline.might),
    agility: asNumber(item.agility, baseline.agility),
    charisma: asNumber(item.charisma, baseline.charisma),
    intelligence: asNumber(item.intelligence, baseline.intelligence),
    skills: typeof item.skills === 'string' ? item.skills : '',
    senses: typeof item.senses === 'string' ? item.senses : '',
    languages: Array.isArray(item.languages)
      ? item.languages.join(', ')
      : typeof item.languages === 'string' ? item.languages : '',
    otherSpeeds: typeof item.otherSpeeds === 'string' ? item.otherSpeeds : '',
    reductions: typeof item.reductions === 'string' ? item.reductions : '',
    resistances: typeof item.resistances === 'string' ? item.resistances : '',
    vulnerabilities: typeof item.vulnerabilities === 'string' ? item.vulnerabilities : '',
    immunities: typeof item.immunities === 'string' ? item.immunities : '',
    abilities: migratedAbilities,
  };
}

function normalizeTeam(value: unknown): CombatantTeam {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'enemies') return CombatantTeamValues.ENEMIES;
  if (normalized === 'neutral') return CombatantTeamValues.NEUTRAL;
  return CombatantTeamValues.HEROES;
}

function normalizeCombatant(value: unknown): Combatant {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const maxHP = asNumber(item.maxHP ?? item.maxStamina, 1);
  const maxAP = asNumber(item.maxAP, 4);
  const status = typeof item.status === 'string' ? item.status.trim() : '';
  const conditions = Array.isArray(item.conditions)
    ? item.conditions.filter((condition): condition is string => typeof condition === 'string')
    : status ? [status] : [];
  return {
    id: typeof item.id === 'string' ? item.id : generateUUID(),
    name: typeof item.name === 'string' ? item.name : 'Unnamed Combatant',
    team: normalizeTeam(item.team),
    maxHP,
    hp: asNumber(item.hp ?? item.stamina, maxHP),
    maxAP,
    ap: asNumber(item.ap, maxAP),
    reactionPoints: asNumber(item.reactionPoints, 0),
    currentReactionPoints: asNumber(item.currentReactionPoints, asNumber(item.reactionPoints, 0)),
    conditions,
    hasActed: Boolean(item.hasActed),
    sourceMonsterID: typeof item.sourceMonsterID === 'string' ? item.sourceMonsterID : undefined,
    sourceCharacterID: typeof item.sourceCharacterID === 'string' ? item.sourceCharacterID : undefined,
    physicalDefense: item.physicalDefense === undefined ? undefined : asNumber(item.physicalDefense, 0),
    arcaneDefense: item.arcaneDefense === undefined ? undefined : asNumber(item.arcaneDefense, 0),
    attackBonus: item.attackBonus === undefined ? undefined : asNumber(item.attackBonus, 0),
    saveDC: item.saveDC === undefined ? undefined : asNumber(item.saveDC, 0),
    speed: item.speed === undefined ? undefined : asNumber(item.speed, 0),
    monsterAbilities: Array.isArray(item.monsterAbilities)
      ? item.monsterAbilities.map(normalizeAbility).filter((entry): entry is MonsterAbility => entry !== null)
      : undefined,
  };
}

function normalizeCombat(value: unknown): SavedCombat {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: typeof item.id === 'string' ? item.id : generateUUID(),
    name: typeof item.name === 'string' ? item.name : 'New Combat',
    combatants: Array.isArray(item.combatants) ? item.combatants.map(normalizeCombatant) : [],
    round: Math.max(1, Math.trunc(asNumber(item.round, 1))),
    firstTeam: normalizeTeam(item.firstTeam),
    notes: typeof item.notes === 'string' ? item.notes : '',
    sourceEncounterID: typeof item.sourceEncounterID === 'string' ? item.sourceEncounterID : undefined,
  };
}

function normalizeEncounter(value: unknown): Encounter {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawEntries = Array.isArray(item.entries)
    ? item.entries
    : Array.isArray(item.monsters)
      ? item.monsters.map((monster) => ({ id: generateUUID(), monster, count: 1 }))
      : [];
  return {
    id: typeof item.id === 'string' ? item.id : generateUUID(),
    name: typeof item.name === 'string' ? item.name : 'New Encounter',
    partyLevels: Array.isArray(item.partyLevels)
      ? item.partyLevels.map((level) => Math.min(20, Math.max(1, Math.trunc(asNumber(level, 1)))))
      : [1, 1, 1, 1],
    entries: rawEntries.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const record = entry as Record<string, unknown>;
      return [{
        id: typeof record.id === 'string' ? record.id : generateUUID(),
        monster: normalizeMonster(record.monster),
        count: Math.max(1, Math.trunc(asNumber(record.count, 1))),
      }];
    }),
    notes: typeof item.notes === 'string' ? item.notes : '',
  };
}

function normalizeAvatarDataURL(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 180_000) return undefined;
  return /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value) ? value : undefined;
}

function normalizeCharacter(value: unknown): Character {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawAttributes = item.attributes && typeof item.attributes === 'object'
    ? item.attributes as Record<string, unknown> : {};
  const normalizeAttribute = (name: string): number => {
    const raw = rawAttributes[name];
    const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const stored = asNumber(record.score ?? record.modifier ?? item[name.toLowerCase()], 0);
    const dc20Value = Math.abs(stored) > 7 ? Math.floor((stored - 10) / 2) : stored;
    return Math.min(7, Math.max(-2, Math.trunc(dc20Value)));
  };
  const might = normalizeAttribute(DC20Attributes.MIGHT);
  const agility = normalizeAttribute(DC20Attributes.AGILITY);
  const charisma = normalizeAttribute(DC20Attributes.CHARISMA);
  const intelligence = normalizeAttribute(DC20Attributes.INTELLIGENCE);
  const level = Math.min(20, Math.max(1, Math.trunc(asNumber(item.level, 1))));
  const characterClass = typeof item.class === 'string'
    ? item.class : typeof item.characterClass === 'string' ? item.characterClass : 'Champion';
  const fallbackHP = Math.max(1, classHealth(characterClass, level) + might);
  const maxHealthPoints = Math.max(1, asNumber(item.maxHealthPoints ?? item.maxHP, fallbackHP));
  const maxStamina = Math.max(0, asNumber(item.maxStamina ?? item.stamina, 0));
  const maxMana = Math.max(0, asNumber(item.maxManaPoints ?? item.mana, 0));
  const rawBuild = item.build && typeof item.build === 'object'
    ? item.build as Record<string, unknown>
    : {};
  const legacyLanguages = rawBuild.languageMasteries && typeof rawBuild.languageMasteries === 'object'
    ? rawBuild.languageMasteries as Record<string, unknown>
    : {};
  const rawFluencies = rawBuild.languageFluencies && typeof rawBuild.languageFluencies === 'object'
    ? rawBuild.languageFluencies as Record<string, unknown>
    : legacyLanguages;
  const languageFluencies = Object.fromEntries(Object.entries(rawFluencies).map(([language, value]) => {
    if (value === 'Fluent' || value === 'Master' || value === 'Grandmaster') return [language, 'Fluent'];
    if (value === 'Limited' || value === 'Novice' || value === 'Adept' || value === 'Expert') return [language, language === 'Common' ? 'Fluent' : 'Limited'];
    return [language, 'Untrained'];
  }));
  languageFluencies.Common = 'Fluent';
  const build: CharacterBuildData = {
    ...defaultBuild(),
    ...rawBuild,
    attributeAssignments: Array.isArray(rawBuild.attributeAssignments)
      ? rawBuild.attributeAssignments.slice(0, 4) as CharacterBuildData['attributeAssignments']
      : [],
    attributeBonusPoints: rawBuild.attributeBonusPoints && typeof rawBuild.attributeBonusPoints === 'object'
      ? rawBuild.attributeBonusPoints as CharacterBuildData['attributeBonusPoints']
      : {},
    languageFluencies: languageFluencies as CharacterBuildData['languageFluencies'],
    restPoints: Math.min(maxHealthPoints, Math.max(0, asNumber(rawBuild.restPoints, maxHealthPoints))),
    shortRestsTaken: Math.min(2, Math.max(0, Math.trunc(asNumber(rawBuild.shortRestsTaken, 0)))),
    sheetCompanions: Array.isArray(rawBuild.sheetCompanions)
      ? rawBuild.sheetCompanions as CharacterBuildData['sheetCompanions']
      : [],
  };
  const attributes = {
    Might: { name: DC20Attributes.MIGHT, score: might, modifier: might },
    Agility: { name: DC20Attributes.AGILITY, score: agility, modifier: agility },
    Charisma: { name: DC20Attributes.CHARISMA, score: charisma, modifier: charisma },
    Intelligence: { name: DC20Attributes.INTELLIGENCE, score: intelligence, modifier: intelligence },
  };
  return {
    id: typeof item.id === 'string' ? item.id : generateUUID(),
    name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Unnamed Character',
    avatarDataURL: normalizeAvatarDataURL(item.avatarDataURL),
    level,
    ancestry: typeof item.ancestry === 'string' ? item.ancestry : 'Human',
    class: characterClass,
    subclass: typeof item.subclass === 'string' ? item.subclass : undefined,
    background: typeof item.background === 'string'
      ? item.background : typeof build.backgroundName === 'string' ? build.backgroundName : '',
    alignment: typeof item.alignment === 'string' ? item.alignment : '',
    attributes,
    primeModifier: Math.max(might, agility, charisma, intelligence),
    skillMasteries: item.skillMasteries && typeof item.skillMasteries === 'object'
      ? item.skillMasteries as Character['skillMasteries'] : {},
    tradeMasteries: item.tradeMasteries && typeof item.tradeMasteries === 'object'
      ? item.tradeMasteries as Character['tradeMasteries'] : {},
    languages: Array.isArray(item.languages)
      ? item.languages.filter((entry): entry is string => typeof entry === 'string') : ['Common'],
    healthPoints: Math.min(maxHealthPoints, Math.max(0, asNumber(item.healthPoints ?? item.currentHP, maxHealthPoints))),
    maxHealthPoints,
    stamina: Math.min(maxStamina, Math.max(0, asNumber(item.stamina ?? item.currentStamina, maxStamina))),
    maxStamina,
    manaPoints: Math.min(maxMana, Math.max(0, asNumber(item.manaPoints ?? item.currentMana, maxMana))),
    maxManaPoints: maxMana,
    currentAP: Math.max(0, asNumber(item.currentAP, 4)),
    maxAP: Math.max(1, asNumber(item.maxAP, 4)),
    physicalDefense: asNumber(item.physicalDefense ?? item.defense, 8 + combatMastery(level) + agility + intelligence),
    arcaneDefense: asNumber(item.arcaneDefense, 8 + combatMastery(level) + might + charisma),
    combatMastery: combatMastery(level),
    speed: Math.max(0, asNumber(item.speed, 5)),
    defense: asNumber(item.defense ?? item.physicalDefense, 8 + combatMastery(level) + agility + intelligence),
    injuries: Array.isArray(item.injuries) ? item.injuries as Character['injuries'] : [],
    skills: Array.isArray(item.skills) ? item.skills as Character['skills'] : [],
    equipment: Array.isArray(item.equipment) ? item.equipment as Character['equipment'] : [],
    inventoryItems: Array.isArray(item.inventoryItems) ? item.inventoryItems as Character['inventoryItems'] : [],
    spells: Array.isArray(item.spells) ? item.spells as Character['spells'] : [],
    maneuvers: Array.isArray(item.maneuvers) ? item.maneuvers as Character['maneuvers'] : [],
    notes: typeof item.notes === 'string' ? item.notes : '',
    build,
  };
}

export function migratePersistedState(value: unknown): PersistedCampaignState {
  const state = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rawCampaignData = state.campaignData && typeof state.campaignData === 'object'
    ? state.campaignData as Record<string, unknown>
    : {};
  return {
    currentSection: Object.values(HubSectionValues).includes(state.currentSection as HubSection)
      ? state.currentSection as HubSection
      : 'Dashboard',
    campaignData: {
      ...defaultCampaignData,
      title: typeof rawCampaignData.title === 'string' && rawCampaignData.title !== 'The Amethyst Chronicle'
        ? rawCampaignData.title
        : defaultCampaignData.title,
      notes: typeof rawCampaignData.notes === 'string' ? rawCampaignData.notes : defaultCampaignData.notes,
      campaigns: Array.isArray(rawCampaignData.campaigns) ? rawCampaignData.campaigns as CampaignRecord[] : [],
      customMonsters: Array.isArray(rawCampaignData.customMonsters)
        ? rawCampaignData.customMonsters.map(normalizeMonster)
        : [],
      customEquipment: Array.isArray(rawCampaignData.customEquipment)
        ? rawCampaignData.customEquipment.map(normalizeCustomEquipment).filter((item): item is EquipmentCatalogItem => item !== null)
        : [],
      encounters: Array.isArray(rawCampaignData.encounters)
        ? rawCampaignData.encounters.map(normalizeEncounter)
        : [],
      combats: Array.isArray(rawCampaignData.combats)
        ? rawCampaignData.combats.map(normalizeCombat)
        : [],
    },
    characters: Array.isArray(state.characters) ? state.characters.map(normalizeCharacter) : [],
    selectedCharacterId: typeof state.selectedCharacterId === 'string' ? state.selectedCharacterId : null,
    selectedMonsterId: typeof state.selectedMonsterId === 'string' ? state.selectedMonsterId : null,
    selectedEncounterId: typeof state.selectedEncounterId === 'string' ? state.selectedEncounterId : null,
    selectedCombatId: typeof state.selectedCombatId === 'string' ? state.selectedCombatId : null,
    selectedCampaignId: typeof state.selectedCampaignId === 'string' ? state.selectedCampaignId : null,
    isDarkMode: typeof state.isDarkMode === 'boolean' ? state.isDarkMode : true,
    selectedPaletteID: typeof state.selectedPaletteID === 'string'
      ? themePalette(state.selectedPaletteID).id
      : DEFAULT_PALETTE_ID,
    lastSavedAt: typeof state.lastSavedAt === 'string' ? state.lastSavedAt : null,
  };
}

export function parseCampaignBackup(value: unknown): PersistedCampaignState {
  const document = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const state = document.format === 'dc20hub-web-backup' && document.state && typeof document.state === 'object'
    ? document.state
    : value;
  return migratePersistedState(state);
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      currentSection: 'Dashboard',
      campaignData: defaultCampaignData,
      characters: [],
      selectedCharacterId: null,
      selectedMonsterId: null,
      selectedEncounterId: null,
      selectedCombatId: null,
      selectedCampaignId: null,
      isDarkMode: true,
      selectedPaletteID: DEFAULT_PALETTE_ID,
      lastSavedAt: null,

      setCurrentSection: (section) => set({ currentSection: section }),
      updateCampaignData: (data) => set((state) => ({ campaignData: { ...state.campaignData, ...data } })),
      addCharacter: (character) => set((state) => ({ characters: [...state.characters, character] })),
      updateCharacter: (character) => set((state) => {
        const previous = state.characters.find((existing) => existing.id === character.id);
        const combats = state.campaignData.combats.map((combat) => ({
          ...combat,
          combatants: combat.combatants.map((combatant) => {
            if (combatant.sourceCharacterID !== character.id) return combatant;
            const damage = Math.max(0, combatant.maxHP - combatant.hp);
            const spentAP = Math.max(0, combatant.maxAP - combatant.ap);
            const suffix = previous && combatant.name.startsWith(previous.name)
              ? combatant.name.slice(previous.name.length) : '';
            return {
              ...combatant,
              name: `${character.name}${suffix}`,
              maxHP: character.maxHealthPoints,
              hp: Math.max(0, character.maxHealthPoints - damage),
              maxAP: character.maxAP,
              ap: Math.max(0, character.maxAP - spentAP),
              physicalDefense: character.physicalDefense,
              arcaneDefense: character.arcaneDefense,
              attackBonus: character.primeModifier + character.combatMastery,
              saveDC: 10 + character.primeModifier + character.combatMastery,
              speed: character.speed,
            };
          }),
        }));
        return {
          characters: state.characters.map((existing) => existing.id === character.id ? character : existing),
          campaignData: { ...state.campaignData, combats },
        };
      }),
      deleteCharacter: (id) => set((state) => ({
        characters: state.characters.filter((character) => character.id !== id),
        selectedCharacterId: state.selectedCharacterId === id ? null : state.selectedCharacterId,
      })),
      selectCharacter: (id) => set({ selectedCharacterId: id }),
      selectMonster: (id) => set({ selectedMonsterId: id }),
      selectEncounter: (id) => set({ selectedEncounterId: id }),
      selectCombat: (id) => set({ selectedCombatId: id }),
      selectCampaign: (id) => set({ selectedCampaignId: id }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setSelectedPalette: (id) => set({ selectedPaletteID: themePalette(id).id }),
      exportData: () => JSON.stringify({
        format: 'dc20hub-web-backup',
        version: STORE_VERSION,
        exportedAt: new Date().toISOString(),
        state: persistedSlice(get()),
      }, null, 2),
      importData: (value) => set(parseCampaignBackup(value)),
      saveCampaign: () => set({ lastSavedAt: new Date().toISOString() }),
      loadCampaign: () => undefined,
      addCampaign: (campaign) => set((state) => ({
        campaignData: { ...state.campaignData, campaigns: [...state.campaignData.campaigns, campaign] },
        selectedCampaignId: campaign.id,
      })),
      updateCampaign: (campaign) => set((state) => ({
        campaignData: {
          ...state.campaignData,
          campaigns: state.campaignData.campaigns.map((existing) => existing.id === campaign.id ? campaign : existing),
        },
      })),
      removeCampaign: (id) => set((state) => ({
        campaignData: {
          ...state.campaignData,
          campaigns: state.campaignData.campaigns.filter((campaign) => campaign.id !== id),
        },
        selectedCampaignId: state.selectedCampaignId === id ? null : state.selectedCampaignId,
      })),
      addCombat: (combat) => set((state) => ({
        campaignData: { ...state.campaignData, combats: [...state.campaignData.combats, combat] },
        selectedCombatId: combat.id,
      })),
      removeCombat: (id) => set((state) => ({
        campaignData: { ...state.campaignData, combats: state.campaignData.combats.filter((combat) => combat.id !== id) },
        selectedCombatId: state.selectedCombatId === id ? null : state.selectedCombatId,
      })),
      updateCombat: (combat) => set((state) => ({
        campaignData: {
          ...state.campaignData,
          combats: state.campaignData.combats.map((existing) => existing.id === combat.id ? combat : existing),
        },
      })),
      addEncounter: (encounter) => set((state) => ({
        campaignData: { ...state.campaignData, encounters: [...state.campaignData.encounters, encounter] },
        selectedEncounterId: encounter.id,
      })),
      updateEncounter: (encounter) => set((state) => ({
        campaignData: {
          ...state.campaignData,
          encounters: state.campaignData.encounters.map((existing) => existing.id === encounter.id ? encounter : existing),
        },
      })),
      removeEncounter: (id) => set((state) => ({
        campaignData: { ...state.campaignData, encounters: state.campaignData.encounters.filter((encounter) => encounter.id !== id) },
        selectedEncounterId: state.selectedEncounterId === id ? null : state.selectedEncounterId,
      })),
      addCustomMonster: (monster) => set((state) => ({
        campaignData: { ...state.campaignData, customMonsters: [...state.campaignData.customMonsters, monster] },
        selectedMonsterId: monster.id,
      })),
      updateCustomMonster: (monster) => set((state) => {
        const previous = state.campaignData.customMonsters.find(({ id }) => id === monster.id);
        if (!previous) return state;
        const encounters = state.campaignData.encounters.map((encounter) => ({
          ...encounter,
          entries: encounter.entries.map((entry) => entry.monster.id === monster.id ? { ...entry, monster } : entry),
        }));
        const combats = state.campaignData.combats.map((combat) => ({
          ...combat,
          combatants: combat.combatants.map((combatant) =>
            combatant.sourceMonsterID === monster.id
              ? synchronizeCombatant(combatant, monster, previous.name)
              : combatant),
        }));
        return {
          campaignData: {
            ...state.campaignData,
            customMonsters: state.campaignData.customMonsters.map((existing) => existing.id === monster.id ? monster : existing),
            encounters,
            combats,
          },
        };
      }),
      removeCustomMonster: (id) => set((state) => ({
        campaignData: { ...state.campaignData, customMonsters: state.campaignData.customMonsters.filter((monster) => monster.id !== id) },
        selectedMonsterId: state.selectedMonsterId === id ? null : state.selectedMonsterId,
      })),
      addCustomEquipment: (item) => set((state) => ({
        campaignData: { ...state.campaignData, customEquipment: [...state.campaignData.customEquipment, item] },
      })),
      updateCustomEquipment: (item) => set((state) => ({
        campaignData: {
          ...state.campaignData,
          customEquipment: state.campaignData.customEquipment.map((existing) => existing.id === item.id ? item : existing),
        },
      })),
      removeCustomEquipment: (id) => set((state) => ({
        campaignData: {
          ...state.campaignData,
          customEquipment: state.campaignData.customEquipment.filter((item) => item.id !== id),
        },
        characters: state.characters.map((character) => ({
          ...character,
          inventoryItems: (character.inventoryItems ?? []).filter(({ equipmentID }) => equipmentID !== id),
        })),
      })),
    }),
    {
      name: 'campaign-store',
      version: STORE_VERSION,
      migrate: (persistedState) => migratePersistedState(persistedState),
      merge: (persistedState, currentState) => ({ ...currentState, ...migratePersistedState(persistedState) }),
      partialize: persistedSlice,
    },
  ),
);
