import type {
  Character,
  CharacterCompanion,
  DC20Attribute,
  EquipmentCatalogItem,
  EquipmentSheetEffects,
  GmVaultEntry,
  Maneuver,
  Spell,
  VaultContentKind,
  VaultDistribution,
  VaultMechanicalEffects,
  VaultRecharge,
} from '../types/models';
import {
  EquipmentCategoryValues,
  EquipmentSlotValues,
  VaultContentKindValues,
} from '../types/models';
import { generateUUID } from './gameUtils';
import { companionDefaultsForKind, companionRulesText } from './companionRules';

const ATTRIBUTES: DC20Attribute[] = ['Might', 'Agility', 'Charisma', 'Intelligence'];

const cleanStrings = (value: unknown): string[] => Array.isArray(value)
  ? Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)))
  : [];

const numberRecord = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const amount = Number(entry);
    return Number.isFinite(amount) && amount !== 0 ? [[key, amount]] : [];
  }));
};

const numberValue = (value: unknown, fallback = 0): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
};

export function emptyVaultEffects(): VaultMechanicalEffects {
  return {
    attributeBonuses: {},
    skillBonuses: {},
    tradeBonuses: {},
    saveBonuses: {},
    skillMasteryIncreases: {},
    skillBonusesAtCap: {},
    weaponSpecificBonuses: {},
    spellSpecificBonuses: {},
    conditionSaveAdvantages: [],
    advantageRules: [],
    disadvantageRules: [],
    movementModes: [],
    vulnerabilities: [],
    damageReductions: [],
    conditionsGranted: [],
    resistances: [],
    immunities: [],
    senses: [],
    conditionalRules: [],
  };
}

function emptyCompanion(name: string): CharacterCompanion {
  const base: CharacterCompanion = {
    id: `vault-companion-${generateUUID()}`,
    name,
    kind: 'Pet',
    source: 'GM Vault',
    size: 'Medium',
    currentHP: 1,
    maxHP: 1,
    sharesHealthWithCharacter: false,
    currentAP: 2,
    maxAP: 2,
    physicalDefense: 10,
    areaDefense: 10,
    speed: 5,
    primeModifier: 0,
    combatMastery: 0,
    attackCheck: 0,
    saveDC: 10,
    attributes: { Might: 0, Agility: 0, Charisma: 0, Intelligence: 0 },
    features: '',
    notes: '',
  };
  return { ...base, ...companionDefaultsForKind('Pet'), id: base.id, name };
}

export function createVaultEntry(kind: VaultContentKind = VaultContentKindValues.ITEM): GmVaultEntry {
  const now = new Date().toISOString();
  const id = `vault-${generateUUID()}`;
  const name = kind === VaultContentKindValues.ITEM ? 'New Magic Item'
    : kind === VaultContentKindValues.SPELL ? 'New Spell'
      : kind === VaultContentKindValues.MANEUVER ? 'New Maneuver'
      : kind === VaultContentKindValues.COMPANION ? 'New Companion'
        : `New ${kind}`;
  const entry: GmVaultEntry = {
    id,
    kind,
    name,
    summary: '',
    description: '',
    tags: [],
    folder: '',
    favorite: false,
    status: 'Draft',
    version: 1,
    revisions: [],
    linkedEntryIDs: [],
    bundledEntries: [],
    activation: kind === VaultContentKindValues.ITEM ? 'Equipped' : 'Passive',
    duration: '',
    stacking: 'Does not stack',
    distribution: { mode: 'Player Choice', characterIDs: [] },
    requirements: {},
    effects: emptyVaultEffects(),
    createdAt: now,
    updatedAt: now,
  };
  if (kind === VaultContentKindValues.ITEM) entry.item = {
    id: `vault-item-${generateUUID()}`,
    name,
    category: EquipmentCategoryValues.WONDROUS_ITEMS,
    subtype: 'Custom Magic Item',
    summary: '',
    mechanics: '',
    properties: [],
    slot: EquipmentSlotValues.WORN,
    sourcePage: 'GM Vault',
    sourceDocument: 'GM Vault',
    collection: 'Magic',
    requiresAttunement: false,
  };
  if (kind === VaultContentKindValues.SPELL) entry.spell = {
    id: `vault-spell-${generateUUID()}`,
    name,
    source: 'GM Vault',
    school: 'Custom',
    tags: '',
    cost: '1 AP',
    range: 'Self',
    duration: 'Instantaneous',
    resolution: 'Spell Check',
    sourceNote: 'Custom spell shared from the GM Vault.',
    description: '',
    enhancements: '',
  };
  if (kind === VaultContentKindValues.MANEUVER) entry.maneuver = {
    id: `vault-maneuver-${generateUUID()}`,
    name,
    type: 'Custom',
    category: 'Utility',
    cost: '1 AP',
    range: 'Self',
    requirements: '',
    resolution: 'Martial Check',
    sourceNote: 'Custom maneuver shared from the GM Vault.',
    description: '',
    enhancements: '',
  };
  if (kind === VaultContentKindValues.COMPANION) entry.companion = emptyCompanion(name);
  return entry;
}

function normalizeEffects(value: unknown): VaultMechanicalEffects {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const numbers = ['allCheckBonus', 'martialCheckBonus', 'spellCheckBonus', 'spellAttackBonus', 'saveDCBonus', 'weaponDamageBonus', 'spellDamageBonus', 'maxHPBonus', 'maxStaminaBonus', 'maxManaBonus', 'physicalDefenseBonus', 'areaDefenseBonus', 'speedBonus'] as const;
  const result: VaultMechanicalEffects = {
    attributeBonuses: numberRecord(raw.attributeBonuses),
    skillBonuses: numberRecord(raw.skillBonuses),
    tradeBonuses: numberRecord(raw.tradeBonuses),
    saveBonuses: numberRecord(raw.saveBonuses),
    skillMasteryIncreases: numberRecord(raw.skillMasteryIncreases),
    skillBonusesAtCap: numberRecord(raw.skillBonusesAtCap),
    weaponSpecificBonuses: numberRecord(raw.weaponSpecificBonuses),
    spellSpecificBonuses: numberRecord(raw.spellSpecificBonuses),
    conditionSaveAdvantages: cleanStrings(raw.conditionSaveAdvantages),
    advantageRules: cleanStrings(raw.advantageRules),
    disadvantageRules: cleanStrings(raw.disadvantageRules),
    movementModes: cleanStrings(raw.movementModes),
    vulnerabilities: cleanStrings(raw.vulnerabilities),
    damageReductions: cleanStrings(raw.damageReductions),
    conditionsGranted: cleanStrings(raw.conditionsGranted),
    resistances: cleanStrings(raw.resistances),
    immunities: cleanStrings(raw.immunities),
    senses: cleanStrings(raw.senses),
    conditionalRules: cleanStrings(raw.conditionalRules),
  };
  for (const key of numbers) {
    const amount = numberValue(raw[key]);
    if (amount) result[key] = amount;
  }
  return result;
}

function normalizeItem(value: unknown, entry: GmVaultEntry): EquipmentCatalogItem | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const category = Object.values(EquipmentCategoryValues).includes(raw.category as EquipmentCatalogItem['category'])
    ? raw.category as EquipmentCatalogItem['category'] : EquipmentCategoryValues.WONDROUS_ITEMS;
  const slot = Object.values(EquipmentSlotValues).includes(raw.slot as EquipmentCatalogItem['slot'])
    ? raw.slot as EquipmentCatalogItem['slot'] : EquipmentSlotValues.WORN;
  const requiresAttunement = Boolean(raw.requiresAttunement);
  const effect = equipmentEffectsFromVault(entry.effects);
  return {
    ...(raw as unknown as EquipmentCatalogItem),
    id: typeof raw.id === 'string' ? raw.id : `vault-item-${generateUUID()}`,
    name: entry.name,
    category,
    subtype: typeof raw.subtype === 'string' ? raw.subtype : 'Custom Magic Item',
    summary: entry.summary,
    mechanics: entry.description,
    properties: cleanStrings(raw.properties),
    slot,
    sourcePage: 'GM Vault',
    sourceDocument: 'GM Vault',
    collection: 'Magic',
    charges: raw.charges === undefined ? undefined : Math.max(0, Math.trunc(numberValue(raw.charges))),
    grantedSpells: (entry.grantedSpells?.length ?? 0) > 0
      ? entry.grantedSpells!.map(({ name }) => name)
      : cleanStrings(raw.grantedSpells),
    requiresAttunement,
    equippedEffects: requiresAttunement ? undefined : effect,
    attunedEffects: requiresAttunement ? effect : undefined,
  };
}

function normalizeSpell(value: unknown, entry: GmVaultEntry): Spell | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  return {
    ...(raw as unknown as Spell),
    id: typeof raw.id === 'string' ? raw.id : `vault-spell-${generateUUID()}`,
    name: entry.name,
    source: 'GM Vault',
    school: typeof raw.school === 'string' ? raw.school : 'Custom',
    tags: typeof raw.tags === 'string' ? raw.tags : '',
    cost: typeof raw.cost === 'string' ? raw.cost : '1 AP',
    range: typeof raw.range === 'string' ? raw.range : 'Self',
    duration: typeof raw.duration === 'string' ? raw.duration : 'Instantaneous',
    description: entry.description,
    enhancements: typeof raw.enhancements === 'string' ? raw.enhancements : '',
    sourceNote: 'Custom spell shared from the GM Vault.',
  };
}

function normalizeManeuver(value: unknown, entry: GmVaultEntry): Maneuver | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  return {
    ...(raw as unknown as Maneuver),
    id: typeof raw.id === 'string' ? raw.id : `vault-maneuver-${generateUUID()}`,
    name: entry.name,
    type: typeof raw.type === 'string' ? raw.type : 'Custom',
    category: typeof raw.category === 'string' ? raw.category : 'Custom',
    cost: typeof raw.cost === 'string' ? raw.cost : '1 AP',
    range: typeof raw.range === 'string' ? raw.range : 'Self',
    requirements: typeof raw.requirements === 'string' ? raw.requirements : '',
    description: entry.description,
    enhancements: typeof raw.enhancements === 'string' ? raw.enhancements : '',
    sourceNote: 'Custom maneuver shared from the GM Vault.',
  };
}

function normalizeGrantedSpell(value: unknown): Spell | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    ...(raw as unknown as Spell),
    id: typeof raw.id === 'string' ? raw.id : `vault-granted-spell-${generateUUID()}`,
    name,
    source: typeof raw.source === 'string' ? raw.source : 'GM Vault',
    school: typeof raw.school === 'string' ? raw.school : 'Custom',
    tags: typeof raw.tags === 'string' ? raw.tags : '',
    cost: typeof raw.cost === 'string' ? raw.cost : '',
    range: typeof raw.range === 'string' ? raw.range : 'See feature',
    duration: typeof raw.duration === 'string' ? raw.duration : 'See feature',
    description: typeof raw.description === 'string' ? raw.description : '',
    enhancements: typeof raw.enhancements === 'string' ? raw.enhancements : '',
  };
}

function normalizeCompanion(value: unknown, entry: GmVaultEntry): CharacterCompanion | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const base = emptyCompanion(entry.name);
  const kind = raw.kind === 'Familiar' || raw.kind === 'Summon' || raw.kind === 'Pet' ? raw.kind : 'Pet';
  const defaults = companionDefaultsForKind(kind);
  const abilities = Array.isArray(raw.abilities) ? raw.abilities.flatMap((value) => {
    if (!value || typeof value !== 'object') return [];
    const ability = value as Record<string, unknown>;
    const name = typeof ability.name === 'string' ? ability.name.trim() : '';
    if (!name) return [];
    const abilityKind = ['Trait', 'Feature', 'Action', 'Reaction'].includes(String(ability.kind))
      ? String(ability.kind) as 'Trait' | 'Feature' | 'Action' | 'Reaction' : 'Feature';
    return [{
      id: typeof ability.id === 'string' ? ability.id : generateUUID(),
      kind: abilityKind,
      name,
      cost: typeof ability.cost === 'string' ? ability.cost : '',
      details: typeof ability.details === 'string' ? ability.details : '',
    }];
  }) : [];
  return {
    ...base,
    ...defaults,
    ...(raw as unknown as CharacterCompanion),
    id: typeof raw.id === 'string' ? raw.id : base.id,
    name: entry.name,
    kind,
    source: 'GM Vault',
    currentHP: Math.max(0, numberValue(raw.currentHP, numberValue(raw.maxHP, 1))),
    maxHP: Math.max(1, numberValue(raw.maxHP, 1)),
    currentAP: Math.max(0, numberValue(raw.currentAP, numberValue(raw.maxAP, 2))),
    maxAP: Math.max(0, numberValue(raw.maxAP, 2)),
    currentRP: Math.max(0, numberValue(raw.currentRP, numberValue(raw.maxRP, numberValue(defaults.maxRP)))),
    maxRP: Math.max(0, numberValue(raw.maxRP, numberValue(defaults.maxRP))),
    level: Math.max(-1, Math.trunc(numberValue(raw.level))),
    damage: Math.max(0, numberValue(raw.damage, 1)),
    physicalDefense: numberValue(raw.physicalDefense, base.physicalDefense),
    areaDefense: numberValue(raw.areaDefense, base.areaDefense),
    speed: Math.max(0, numberValue(raw.speed, numberValue(defaults.speed, base.speed))),
    primeModifier: numberValue(raw.primeModifier, base.primeModifier),
    combatMastery: Math.max(0, numberValue(raw.combatMastery, base.combatMastery)),
    attackCheck: numberValue(raw.attackCheck, base.attackCheck),
    saveDC: numberValue(raw.saveDC, base.saveDC),
    attributes: { ...base.attributes, ...numberRecord(raw.attributes) } as Record<DC20Attribute, number>,
    linkedSpellName: typeof raw.linkedSpellName === 'string' ? raw.linkedSpellName : defaults.linkedSpellName,
    creatureType: typeof raw.creatureType === 'string' ? raw.creatureType : defaults.creatureType,
    speedType: typeof raw.speedType === 'string' ? raw.speedType : defaults.speedType,
    otherSpeeds: typeof raw.otherSpeeds === 'string' ? raw.otherSpeeds : '',
    usesOwnerStats: raw.usesOwnerStats === undefined ? Boolean(defaults.usesOwnerStats) : Boolean(raw.usesOwnerStats),
    actsOnOwnersTurn: raw.actsOnOwnersTurn === undefined ? Boolean(defaults.actsOnOwnersTurn) : Boolean(raw.actsOnOwnersTurn),
    requiresCommand: raw.requiresCommand === undefined ? Boolean(defaults.requiresCommand) : Boolean(raw.requiresCommand),
    canAttack: raw.canAttack === undefined ? Boolean(defaults.canAttack) : Boolean(raw.canAttack),
    skills: typeof raw.skills === 'string' ? raw.skills : '',
    senses: typeof raw.senses === 'string' ? raw.senses : '',
    languages: typeof raw.languages === 'string' ? raw.languages : '',
    reductions: typeof raw.reductions === 'string' ? raw.reductions : '',
    resistances: typeof raw.resistances === 'string' ? raw.resistances : '',
    vulnerabilities: typeof raw.vulnerabilities === 'string' ? raw.vulnerabilities : '',
    immunities: typeof raw.immunities === 'string' ? raw.immunities : '',
    categoryRules: typeof raw.categoryRules === 'string' ? raw.categoryRules : defaults.categoryRules,
    abilities,
    features: entry.description,
  };
}

export function normalizeVaultEntry(value: unknown): GmVaultEntry | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const kinds = Object.values(VaultContentKindValues);
  const kind = kinds.includes(raw.kind as VaultContentKind) ? raw.kind as VaultContentKind : VaultContentKindValues.OTHER;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const rechargeOptions: VaultRecharge[] = ['Manual', 'Quick Rest', 'Short Rest', 'Long Rest'];
  const charges = raw.charges === undefined ? undefined : Math.max(0, Math.trunc(numberValue(raw.charges)));
  const rawDistribution = raw.distribution && typeof raw.distribution === 'object' ? raw.distribution as Record<string, unknown> : {};
  const distribution: VaultDistribution = {
    mode: rawDistribution.mode === 'Assigned Characters' ? 'Assigned Characters' : 'Player Choice',
    characterIDs: cleanStrings(rawDistribution.characterIDs),
    ...(numberValue(rawDistribution.quantityLimit) > 0 ? { quantityLimit: Math.max(1, Math.trunc(numberValue(rawDistribution.quantityLimit))) } : {}),
    notes: typeof rawDistribution.notes === 'string' ? rawDistribution.notes : '',
  };
  const revisionValues = Array.isArray(raw.revisions) ? raw.revisions : [];
  const entry: GmVaultEntry = {
    id: typeof raw.id === 'string' ? raw.id : `vault-${generateUUID()}`,
    kind,
    name,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    tags: cleanStrings(raw.tags),
    folder: typeof raw.folder === 'string' ? raw.folder : '',
    favorite: Boolean(raw.favorite),
    status: raw.status === 'Ready' || raw.status === 'Archived' ? raw.status : 'Draft',
    version: Math.max(1, Math.trunc(numberValue(raw.version, 1))),
    revisions: revisionValues.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const revision = value as Record<string, unknown>;
      if (typeof revision.snapshot !== 'string') return [];
      return [{
        id: typeof revision.id === 'string' ? revision.id : `vault-revision-${generateUUID()}`,
        version: Math.max(1, Math.trunc(numberValue(revision.version, 1))),
        savedAt: typeof revision.savedAt === 'string' ? revision.savedAt : new Date().toISOString(),
        snapshot: revision.snapshot,
      }];
    }).slice(-20),
    linkedEntryIDs: cleanStrings(raw.linkedEntryIDs),
    activation: ['Passive', 'Equipped', 'Attuned', 'Manual Toggle', 'Conditional'].includes(String(raw.activation))
      ? raw.activation as GmVaultEntry['activation'] : kind === VaultContentKindValues.ITEM ? 'Equipped' : 'Passive',
    duration: typeof raw.duration === 'string' ? raw.duration : '',
    stacking: typeof raw.stacking === 'string' ? raw.stacking : 'Does not stack',
    distribution,
    requirements: {
      minimumLevel: Math.max(0, Math.trunc(numberValue((raw.requirements as Record<string, unknown> | undefined)?.minimumLevel))),
      classes: cleanStrings((raw.requirements as Record<string, unknown> | undefined)?.classes),
      ancestries: cleanStrings((raw.requirements as Record<string, unknown> | undefined)?.ancestries),
      notes: typeof (raw.requirements as Record<string, unknown> | undefined)?.notes === 'string' ? String((raw.requirements as Record<string, unknown>).notes) : '',
    },
    effects: normalizeEffects(raw.effects),
    ...(charges ? {
      charges,
      remainingCharges: Math.min(charges, Math.max(0, Math.trunc(numberValue(raw.remainingCharges, charges)))),
      recharge: rechargeOptions.includes(raw.recharge as VaultRecharge) ? raw.recharge as VaultRecharge : 'Long Rest',
    } : {}),
    grantedSpells: Array.isArray(raw.grantedSpells)
      ? raw.grantedSpells.map(normalizeGrantedSpell).filter((spell): spell is Spell => spell !== null)
      : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
  entry.item = normalizeItem(raw.item, entry);
  entry.spell = normalizeSpell(raw.spell, entry);
  entry.maneuver = normalizeManeuver(raw.maneuver, entry);
  entry.companion = normalizeCompanion(raw.companion, entry);
  entry.bundledEntries = Array.isArray(raw.bundledEntries)
    ? raw.bundledEntries.flatMap((bundled) => {
      const normalized = normalizeVaultEntry(bundled);
      if (!normalized || normalized.id === entry.id) return [];
      return [{ ...normalized, bundledEntries: [] }];
    })
    : [];
  return entry;
}

export function equipmentEffectsFromVault(effects: VaultMechanicalEffects): EquipmentSheetEffects {
  return {
    ...effects,
    resistances: [...(effects.resistances ?? [])],
    immunities: [...(effects.immunities ?? [])],
    senses: [...(effects.senses ?? [])],
    conditionalRules: [...(effects.conditionalRules ?? [])],
    conditionSaveAdvantages: [...(effects.conditionSaveAdvantages ?? [])],
  };
}

/** Keeps an entry's specialized payload synchronized with its common name and mechanics. */
export function prepareVaultEntry(entry: GmVaultEntry): GmVaultEntry {
  const updatedAt = new Date().toISOString();
  const charges = Math.max(0, Math.trunc(entry.charges ?? 0));
  const next: GmVaultEntry = {
    ...entry,
    name: entry.name.trim(),
    tags: cleanStrings(entry.tags),
    folder: entry.folder?.trim() ?? '',
    status: entry.status ?? 'Draft',
    version: Math.max(1, entry.version ?? 1),
    linkedEntryIDs: cleanStrings(entry.linkedEntryIDs),
    bundledEntries: (entry.bundledEntries ?? []).map((bundled) => ({ ...bundled, bundledEntries: [] })),
    distribution: {
      mode: entry.distribution?.mode ?? 'Player Choice',
      characterIDs: cleanStrings(entry.distribution?.characterIDs),
      ...(entry.distribution?.quantityLimit ? { quantityLimit: Math.max(1, Math.trunc(entry.distribution.quantityLimit)) } : {}),
      notes: entry.distribution?.notes?.trim() ?? '',
    },
    grantedSpells: (entry.grantedSpells ?? []).map((spell) => ({ ...spell })),
    ...(charges ? { charges, remainingCharges: charges, recharge: entry.recharge ?? 'Long Rest' } : {
      charges: undefined, remainingCharges: undefined, recharge: undefined,
    }),
    updatedAt,
  };
  if (next.item) {
    const effect = equipmentEffectsFromVault(next.effects);
    next.item = {
      ...next.item,
      name: next.name,
      summary: next.summary,
      mechanics: next.description,
      sourcePage: 'GM Vault',
      sourceDocument: 'GM Vault',
      collection: 'Magic',
      grantedSpells: (next.grantedSpells?.length ?? 0) > 0
        ? next.grantedSpells!.map(({ name }) => name)
        : next.item.grantedSpells ?? [],
      equippedEffects: next.item.requiresAttunement ? undefined : effect,
      attunedEffects: next.item.requiresAttunement ? effect : undefined,
    };
  }
  if (next.spell) next.spell = { ...next.spell, name: next.name, source: 'GM Vault', description: next.description };
  if (next.maneuver) next.maneuver = { ...next.maneuver, name: next.name, description: next.description };
  if (next.companion) next.companion = { ...next.companion, name: next.name, source: 'GM Vault', features: next.description };
  return next;
}

function addEffects(target: VaultMechanicalEffects, effect: VaultMechanicalEffects) {
  const numeric = ['allCheckBonus', 'martialCheckBonus', 'spellCheckBonus', 'spellAttackBonus', 'saveDCBonus', 'weaponDamageBonus', 'spellDamageBonus', 'maxHPBonus', 'maxStaminaBonus', 'maxManaBonus', 'physicalDefenseBonus', 'areaDefenseBonus', 'speedBonus'] as const;
  for (const key of numeric) target[key] = (target[key] ?? 0) + (effect[key] ?? 0);
  for (const key of ['attributeBonuses', 'skillBonuses', 'tradeBonuses', 'saveBonuses', 'weaponSpecificBonuses', 'spellSpecificBonuses'] as const) {
    const current = { ...(target[key] ?? {}) } as Record<string, number>;
    for (const [name, amount] of Object.entries(effect[key] ?? {})) current[name] = (current[name] ?? 0) + amount;
    target[key] = current as never;
  }
  for (const key of ['resistances', 'immunities', 'senses', 'conditionalRules', 'conditionSaveAdvantages', 'advantageRules', 'disadvantageRules', 'movementModes', 'vulnerabilities', 'damageReductions', 'conditionsGranted'] as const) {
    target[key] = Array.from(new Set([...(target[key] ?? []), ...(effect[key] ?? [])]));
  }
  for (const key of ['skillMasteryIncreases', 'skillBonusesAtCap'] as const) {
    const current = { ...(target[key] ?? {}) };
    for (const [name, amount] of Object.entries(effect[key] ?? {})) current[name] = Math.max(current[name] ?? 0, amount);
    target[key] = current;
  }
}

/** Passive effects from accepted talents, features, and other boons. Items route only while equipped. */
export function activeCharacterVaultEffects(character: Character): VaultMechanicalEffects {
  const result = emptyVaultEffects();
  for (const entry of character.vaultEntries ?? []) {
    if ([VaultContentKindValues.ITEM, VaultContentKindValues.SPELL, VaultContentKindValues.MANEUVER, VaultContentKindValues.COMPANION].includes(entry.kind as never)) continue;
    if (entry.activation === 'Manual Toggle' || entry.activation === 'Conditional' || entry.activation === 'Equipped' || entry.activation === 'Attuned') {
      result.conditionalRules = Array.from(new Set([
        ...(result.conditionalRules ?? []),
        `${entry.name}: ${entry.activation}${entry.duration ? ` • ${entry.duration}` : ''}${entry.stacking ? ` • ${entry.stacking}` : ''}`,
        ...(entry.effects.conditionalRules ?? []),
      ]));
      continue;
    }
    addEffects(result, entry.effects);
  }
  return result;
}

export function vaultEntryEligibility(character: Character, entry: GmVaultEntry): { eligible: boolean; reason: string } {
  const requirements = entry.requirements;
  if ((requirements.minimumLevel ?? 0) > character.level) return { eligible: false, reason: `Requires level ${requirements.minimumLevel}.` };
  if ((requirements.classes?.length ?? 0) > 0 && !requirements.classes?.includes(character.class)) return { eligible: false, reason: `Requires ${requirements.classes?.join(' or ')}.` };
  if ((requirements.ancestries?.length ?? 0) > 0 && !requirements.ancestries?.includes(character.ancestry)) return { eligible: false, reason: `Requires ${requirements.ancestries?.join(' or ')} ancestry.` };
  if (entry.distribution?.mode === 'Assigned Characters' && entry.distribution.characterIDs.length > 0 && !entry.distribution.characterIDs.includes(character.id)) {
    return { eligible: false, reason: 'Assigned to other campaign characters.' };
  }
  for (const bundled of entry.bundledEntries ?? []) {
    const bundledEligibility = vaultEntryEligibility(character, bundled);
    if (!bundledEligibility.eligible) return { eligible: false, reason: `${bundled.name}: ${bundledEligibility.reason}` };
  }
  return { eligible: true, reason: '' };
}

export function addVaultEntryToCharacter(character: Character, supplied: GmVaultEntry): Character {
  const normalized = normalizeVaultEntry(supplied);
  if (!normalized || (character.vaultEntries ?? []).some(({ id }) => id === normalized.id)) return character;
  const entry = JSON.parse(JSON.stringify(normalized)) as GmVaultEntry;
  if (entry.charges) entry.remainingCharges = entry.charges;
  let next: Character = { ...character, vaultEntries: [...(character.vaultEntries ?? []), entry] };
  if (entry.item) next.inventoryItems = [...(character.inventoryItems ?? []), {
    id: generateUUID(),
    equipmentID: entry.item.id,
    quantity: 1,
    isEquipped: false,
    isAttuned: false,
    source: 'added',
    itemSnapshot: entry.item,
    ...(entry.item.charges !== undefined ? { remainingUses: entry.item.charges } : {}),
  }];
  if (entry.companion && next.build) {
    const suppliedCompanion = entry.companion;
    const companion: CharacterCompanion = {
      ...suppliedCompanion,
      id: generateUUID(),
      sourceVaultEntryID: entry.id,
      features: companionRulesText(suppliedCompanion),
      ...(suppliedCompanion.usesOwnerStats ? {
        primeModifier: character.primeModifier,
        combatMastery: character.combatMastery,
        attackCheck: character.primeModifier + character.combatMastery,
        saveDC: character.saveDC ?? 10 + character.primeModifier + character.combatMastery,
      } : {}),
      ...(suppliedCompanion.sharesHealthWithCharacter ? {
        currentHP: character.healthPoints,
        maxHP: character.maxHealthPoints,
      } : {}),
    };
    next.build = { ...next.build, sheetCompanions: [...(next.build.sheetCompanions ?? []), companion] };
  }
  if ([VaultContentKindValues.TALENT, VaultContentKindValues.FEATURE, VaultContentKindValues.OTHER].includes(entry.kind as never)) {
    const attributeBonuses = entry.effects.attributeBonuses ?? {};
    const might = attributeBonuses.Might ?? 0;
    const agility = attributeBonuses.Agility ?? 0;
    const charisma = attributeBonuses.Charisma ?? 0;
    const intelligence = attributeBonuses.Intelligence ?? 0;
    const maxHPDelta = (entry.effects.maxHPBonus ?? 0) + might;
    const maxStaminaDelta = entry.effects.maxStaminaBonus ?? 0;
    const maxManaDelta = entry.effects.maxManaBonus ?? 0;
    const attributes = Object.fromEntries(ATTRIBUTES.map((attribute) => [attribute, {
      ...character.attributes[attribute],
      modifier: character.attributes[attribute].modifier + (attributeBonuses[attribute] ?? 0),
    }])) as Character['attributes'];
    next = {
      ...next,
      attributes,
      primeModifier: Math.max(...ATTRIBUTES.map((attribute) => attributes[attribute].modifier)),
      saveDC: (character.saveDC ?? 10 + character.primeModifier + character.combatMastery) + (entry.effects.saveDCBonus ?? 0)
        + Math.max(...ATTRIBUTES.map((attribute) => attributes[attribute].modifier)) - character.primeModifier,
      maxHealthPoints: Math.max(1, character.maxHealthPoints + maxHPDelta),
      healthPoints: Math.max(0, character.healthPoints + Math.max(0, maxHPDelta)),
      maxStamina: Math.max(0, character.maxStamina + maxStaminaDelta),
      stamina: Math.max(0, character.stamina + Math.max(0, maxStaminaDelta)),
      maxManaPoints: Math.max(0, character.maxManaPoints + maxManaDelta),
      manaPoints: Math.max(0, character.manaPoints + Math.max(0, maxManaDelta)),
      physicalDefense: character.physicalDefense + agility + intelligence + (entry.effects.physicalDefenseBonus ?? 0),
      arcaneDefense: character.arcaneDefense + might + charisma + (entry.effects.areaDefenseBonus ?? 0),
      speed: Math.max(0, character.speed + (entry.effects.speedBonus ?? 0)),
    };
  }
  for (const bundled of entry.bundledEntries ?? []) next = addVaultEntryToCharacter(next, bundled);
  return next;
}

/** Removes an accepted snapshot and every inventory/companion record created from it. */
export function removeVaultEntryFromCharacter(character: Character, entryID: string): Character {
  const entry = (character.vaultEntries ?? []).find(({ id }) => id === entryID);
  if (!entry) return character;
  return {
    ...character,
    vaultEntries: (character.vaultEntries ?? []).filter(({ id }) => id !== entryID),
    inventoryItems: (character.inventoryItems ?? []).filter(({ equipmentID }) => equipmentID !== entry.item?.id),
    build: character.build ? {
      ...character.build,
      sheetCompanions: (character.build.sheetCompanions ?? []).filter((companion) => (
        companion.sourceVaultEntryID !== entryID
        && !(companion.source === 'GM Vault' && companion.name === entry.companion?.name)
      )),
    } : undefined,
  };
}

export const vaultEffectSummary = (effects: VaultMechanicalEffects): string[] => {
  const labels: Array<[keyof VaultMechanicalEffects, string]> = [
    ['allCheckBonus', 'all Checks'], ['martialCheckBonus', 'Martial Checks'], ['spellCheckBonus', 'Spell Checks'],
    ['spellAttackBonus', 'Spell Attacks'], ['saveDCBonus', 'Save DC'], ['weaponDamageBonus', 'weapon damage'],
    ['spellDamageBonus', 'spell damage'], ['maxHPBonus', 'maximum HP'], ['maxStaminaBonus', 'maximum Stamina'],
    ['maxManaBonus', 'maximum Mana'], ['physicalDefenseBonus', 'PD'], ['areaDefenseBonus', 'AD'], ['speedBonus', 'Speed'],
  ];
  const summary = labels.flatMap(([key, label]) => typeof effects[key] === 'number' && effects[key] !== 0
    ? [`${Number(effects[key]) > 0 ? '+' : ''}${effects[key]} ${label}`] : []);
  for (const [name, amount] of Object.entries(effects.attributeBonuses ?? {})) summary.push(`${amount > 0 ? '+' : ''}${amount} ${name}`);
  for (const [name, amount] of Object.entries(effects.skillBonuses ?? {})) summary.push(`${amount > 0 ? '+' : ''}${amount} ${name}`);
  for (const [name, amount] of Object.entries(effects.tradeBonuses ?? {})) summary.push(`${amount > 0 ? '+' : ''}${amount} ${name}`);
  if (effects.resistances?.length) summary.push(`Resistance: ${effects.resistances.join(', ')}`);
  if (effects.immunities?.length) summary.push(`Immunity: ${effects.immunities.join(', ')}`);
  if (Object.keys(effects.skillMasteryIncreases ?? {}).length) summary.push(`Skill mastery: ${Object.entries(effects.skillMasteryIncreases ?? {}).map(([name, amount]) => `${name} +${amount}`).join(', ')}`);
  if (effects.advantageRules?.length) summary.push(`Advantage: ${effects.advantageRules.join(', ')}`);
  if (effects.disadvantageRules?.length) summary.push(`Disadvantage: ${effects.disadvantageRules.join(', ')}`);
  if (effects.movementModes?.length) summary.push(`Movement: ${effects.movementModes.join(', ')}`);
  if (effects.vulnerabilities?.length) summary.push(`Vulnerability: ${effects.vulnerabilities.join(', ')}`);
  if (effects.damageReductions?.length) summary.push(`Damage reduction: ${effects.damageReductions.join(', ')}`);
  return summary;
};

const revisionSnapshot = (entry: GmVaultEntry): string => JSON.stringify({
  ...entry,
  revisions: [],
  bundledEntries: (entry.bundledEntries ?? []).map((bundled) => ({ ...bundled, revisions: [], bundledEntries: [] })),
});

const comparableSnapshot = (entry: GmVaultEntry): string => JSON.stringify({
  ...entry,
  updatedAt: '',
  version: 0,
  revisions: [],
});

/** Saves a new recoverable version only when editable content actually changed. */
export function prepareVaultEntryForSave(next: GmVaultEntry, previous?: GmVaultEntry): GmVaultEntry {
  const prepared = prepareVaultEntry(next);
  if (!previous || comparableSnapshot(prepared) === comparableSnapshot(previous)) return prepared;
  return {
    ...prepared,
    version: Math.max(1, previous.version ?? 1) + 1,
    revisions: [...(previous.revisions ?? []), {
      id: `vault-revision-${generateUUID()}`,
      version: Math.max(1, previous.version ?? 1),
      savedAt: previous.updatedAt,
      snapshot: revisionSnapshot(previous),
    }].slice(-20),
  };
}

export function restoreVaultRevision(current: GmVaultEntry, snapshot: string): GmVaultEntry | null {
  try {
    const restored = normalizeVaultEntry(JSON.parse(snapshot));
    if (!restored) return null;
    return prepareVaultEntryForSave({ ...restored, id: current.id, createdAt: current.createdAt, revisions: current.revisions }, current);
  } catch {
    return null;
  }
}

export function duplicateVaultEntry(source: GmVaultEntry): GmVaultEntry {
  const copy = normalizeVaultEntry(JSON.parse(revisionSnapshot(source)));
  const created = copy ?? createVaultEntry(source.kind);
  const now = new Date().toISOString();
  const id = `vault-${generateUUID()}`;
  return prepareVaultEntry({
    ...created,
    id,
    name: `${source.name} (Copy)`,
    status: 'Draft',
    favorite: false,
    version: 1,
    revisions: [],
    createdAt: now,
    updatedAt: now,
    ...(created.item ? { item: { ...created.item, id: `vault-item-${generateUUID()}` } } : {}),
    ...(created.spell ? { spell: { ...created.spell, id: `vault-spell-${generateUUID()}` } } : {}),
    ...(created.maneuver ? { maneuver: { ...created.maneuver, id: `vault-maneuver-${generateUUID()}` } } : {}),
    ...(created.companion ? { companion: { ...created.companion, id: `vault-companion-${generateUUID()}` } } : {}),
  });
}

export function vaultEntryFromEquipment(item: EquipmentCatalogItem): GmVaultEntry {
  const entry = createVaultEntry(VaultContentKindValues.ITEM);
  return prepareVaultEntry({
    ...entry,
    name: `${item.name} Variant`,
    summary: item.summary,
    description: item.mechanics,
    tags: [...item.properties],
    item: { ...item, id: `vault-item-${generateUUID()}`, name: `${item.name} Variant`, sourceDocument: 'GM Vault', sourcePage: 'GM Vault', collection: 'Magic' },
    effects: {
      ...emptyVaultEffects(),
      ...(item.equippedEffects ?? {}),
      ...(item.attunedEffects ?? {}),
    },
  });
}

export function vaultEntryFromSpell(spell: Spell): GmVaultEntry {
  const entry = createVaultEntry(VaultContentKindValues.SPELL);
  return prepareVaultEntry({ ...entry, name: `${spell.name} Variant`, description: spell.description, tags: cleanStrings(spell.tags?.split(',')), spell: { ...spell, id: `vault-spell-${generateUUID()}`, name: `${spell.name} Variant`, source: 'GM Vault' } });
}

export function vaultEntryFromManeuver(maneuver: Maneuver): GmVaultEntry {
  const entry = createVaultEntry(VaultContentKindValues.MANEUVER);
  return prepareVaultEntry({ ...entry, name: `${maneuver.name} Variant`, description: maneuver.description, tags: [maneuver.category ?? maneuver.type ?? 'Maneuver'], maneuver: { ...maneuver, id: `vault-maneuver-${generateUUID()}`, name: `${maneuver.name} Variant` } });
}

/** Lightweight publishing preflight; drafts may still be saved with these issues. */
export function vaultValidationIssues(entry: GmVaultEntry): string[] {
  const issues: string[] = [];
  if (!entry.name.trim()) issues.push('Add a name.');
  if (!entry.summary.trim()) issues.push('Add a short summary.');
  if (!entry.description.trim()) issues.push('Add complete rules text.');
  if (entry.kind === VaultContentKindValues.SPELL && !entry.spell) issues.push('Complete the spell configuration.');
  if (entry.kind === VaultContentKindValues.MANEUVER && !entry.maneuver) issues.push('Complete the maneuver configuration.');
  if (entry.kind === VaultContentKindValues.ITEM && !entry.item) issues.push('Complete the item configuration.');
  if (entry.kind === VaultContentKindValues.COMPANION && !entry.companion) issues.push('Complete the companion stat block.');
  return issues;
}
