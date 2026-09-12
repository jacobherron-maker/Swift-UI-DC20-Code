import type { CharacterInventoryItem, EquipmentCatalogItem, EquipmentSheetEffects, EquipmentSlot } from '../types/models';
import { EquipmentSlotValues } from '../types/models';
import { generateUUID } from './gameUtils';

export interface WeaponMechanicalProfile {
  baseDamage: number;
  damageTypes: string[];
  range: string;
  styles: string[];
  isNativeRanged: boolean;
  canBeThrown: boolean;
  thrownRange?: string;
  heavyHitDamageBonus: number;
}

export interface DefensiveEquipmentProfile {
  physicalDefense: number;
  areaDefense: number;
  physicalDamageReduction: boolean;
  elementalDamageReduction: boolean;
  mysticalDamageReduction: boolean;
  speedPenalty: number;
  agilityCheckDisadvantage: number;
}

const DEFENSIVE_EQUIPMENT: Record<string, DefensiveEquipmentProfile> = {
  'Defensive Light Armor': { physicalDefense: 1, areaDefense: 1, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Deflecting Light Armor': { physicalDefense: 2, areaDefense: 0, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Fortified Light Armor': { physicalDefense: 0, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Defensive Heavy Armor': { physicalDefense: 1, areaDefense: 1, physicalDamageReduction: true, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Deflecting Heavy Armor': { physicalDefense: 2, areaDefense: 0, physicalDamageReduction: true, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Fortified Heavy Armor': { physicalDefense: 0, areaDefense: 2, physicalDamageReduction: true, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Highly Defensive Heavy Armor': { physicalDefense: 2, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  Buckler: { physicalDefense: 1, areaDefense: 0, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Round Shield': { physicalDefense: 0, areaDefense: 1, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Heater Shield': { physicalDefense: 1, areaDefense: 1, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Kite Shield': { physicalDefense: 1, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Tower Shield': { physicalDefense: 2, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, mysticalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
};

export const WEAPON_ENHANCEMENTS: Record<string, string> = {
  Axe: 'Bleed — the target makes a Repeated Physical Save. Failure: The target begins Bleeding.',
  Bow: 'Slow — the target makes an Agility Save. Failure: The target becomes Slowed until the end of its next turn.',
  Crossbow: 'Accuracy — add a d4 to your Attack Check.',
  Fist: 'Grapple — the target makes a Physical Save. Failure: The target becomes Grappled by you. Fist Weapons count as a free hand for Grappling.',
  Harpoon: 'Tether — the target makes a Might Save. Failure: The target is Tethered X to you, where X is its distance from you. While Tethered, you can’t make Attacks with the Weapon. You can spend 1 AP to make a contested Might Check to pull it 1 Space closer and reduce the Tethered distance by 1 (minimum 1), plus 1 Space for each 5 by which you succeed. The target can spend 1 AP to make a Might Check against your Save DC to break free. Stopping wielding the Weapon ends this Tether.',
  Hammer: 'Knockback — the target makes a Might Save. Failure: The target is pushed 1 Space away, plus 1 Space each time you use this Enhancement.',
  Pick: 'Hinder — the target makes an Agility Save. Failure: The target becomes Hindered until the end of its next turn.',
  Sling: 'Hinder — the target makes an Agility Save. Failure: The target becomes Hindered until the end of its next turn.',
  Spear: 'Slow — the target makes an Agility Save. Failure: The target becomes Slowed until the end of its next turn.',
  Staff: 'Trip — the target makes a Physical Save. Failure: The target falls Prone.',
  Sword: 'Accuracy — add a d4 to your Attack Check.',
  Trap: 'Immobilize — the target makes a Might or Agility Save (its choice). Failure: The target is Immobilized. While Immobilized, you can’t make Attacks with the Weapon. The target can spend 1 AP to make a Might or Agility Check (its choice) against your Save DC to break free. Stopping wielding the Weapon ends this Immobilization.',
  Whip: 'Pull — the target makes a Might Save. Failure: Move it horizontally 1 Space toward you or to either side, plus 1 Space each time you use this Enhancement.',
};

/**
 * Curated defensive modifiers a custom item can route into character-sheet math, stored as
 * ordinary entries in `EquipmentCatalogItem.properties` alongside real Weapon/Spell Focus tags.
 * Named standard armor and shields (DEFENSIVE_EQUIPMENT above) take precedence over these.
 */
export const ROUTED_SHEET_EFFECTS: Record<string, Partial<DefensiveEquipmentProfile>> = {
  '+1 Physical Defense': { physicalDefense: 1 },
  '+2 Physical Defense': { physicalDefense: 2 },
  '+1 Area Defense': { areaDefense: 1 },
  '+2 Area Defense': { areaDefense: 2 },
  'Physical Damage Reduction': { physicalDamageReduction: true },
  'Elemental Damage Reduction': { elementalDamageReduction: true },
  'Mystical Damage Reduction': { mysticalDamageReduction: true },
  'Speed Penalty (−1)': { speedPenalty: 1 },
  'Agility Check Disadvantage (−1)': { agilityCheckDisadvantage: 1 },
};

export const ZERO_DEFENSIVE_PROFILE: DefensiveEquipmentProfile = {
  physicalDefense: 0,
  areaDefense: 0,
  physicalDamageReduction: false,
  elementalDamageReduction: false,
  mysticalDamageReduction: false,
  speedPenalty: 0,
  agilityCheckDisadvantage: 0,
};

/**
 * Every Routed-Character Sheet Effect tag an item carries, regardless of its Category — a
 * custom Weapon, Spell Focus, or Supply can route these exactly like a custom Armor or Shield.
 * Named standard armor and shields (DEFENSIVE_EQUIPMENT above) take precedence over these tags.
 */
export function defensiveEquipmentProfile(item: EquipmentCatalogItem): DefensiveEquipmentProfile {
  const named = DEFENSIVE_EQUIPMENT[item.name];
  if (named) return named;
  return item.properties.reduce<DefensiveEquipmentProfile>((profile, tag) => {
    const effect = ROUTED_SHEET_EFFECTS[tag];
    if (!effect) return profile;
    return {
      physicalDefense: profile.physicalDefense + (effect.physicalDefense ?? 0),
      areaDefense: profile.areaDefense + (effect.areaDefense ?? 0),
      physicalDamageReduction: profile.physicalDamageReduction || Boolean(effect.physicalDamageReduction),
      elementalDamageReduction: profile.elementalDamageReduction || Boolean(effect.elementalDamageReduction),
      mysticalDamageReduction: profile.mysticalDamageReduction || Boolean(effect.mysticalDamageReduction),
      speedPenalty: profile.speedPenalty + (effect.speedPenalty ?? 0),
      agilityCheckDisadvantage: profile.agilityCheckDisadvantage + (effect.agilityCheckDisadvantage ?? 0),
    };
  }, ZERO_DEFENSIVE_PROFILE);
}

/** Sums Routed-Character Sheet Effect contributions across several equipped items (e.g. every equipped item that isn't already covered by the dedicated Armor/Shield selection logic in equipmentBonuses). */
export function combinedDefensiveProfile(items: EquipmentCatalogItem[]): DefensiveEquipmentProfile {
  return items.reduce<DefensiveEquipmentProfile>((total, item) => {
    const profile = defensiveEquipmentProfile(item);
    return {
      physicalDefense: total.physicalDefense + profile.physicalDefense,
      areaDefense: total.areaDefense + profile.areaDefense,
      physicalDamageReduction: total.physicalDamageReduction || profile.physicalDamageReduction,
      elementalDamageReduction: total.elementalDamageReduction || profile.elementalDamageReduction,
      mysticalDamageReduction: total.mysticalDamageReduction || profile.mysticalDamageReduction,
      speedPenalty: total.speedPenalty + profile.speedPenalty,
      agilityCheckDisadvantage: total.agilityCheckDisadvantage + profile.agilityCheckDisadvantage,
    };
  }, ZERO_DEFENSIVE_PROFILE);
}

/** Structured combat data for every published Beta weapon example. */
export function weaponMechanicalProfile(item: EquipmentCatalogItem): WeaponMechanicalProfile | null {
  if (item.category !== 'Weapons') return null;
  if (item.weaponProfile) return { ...item.weaponProfile, damageTypes: [...item.weaponProfile.damageTypes], styles: [...item.weaponProfile.styles] };
  const damage = item.summary.match(/^(\d+)(?: \(\d+\))? ([A-Za-z]+(?: or [A-Za-z]+)?) damage/);
  const range = item.summary.match(/Range ([0-9/]+)/)?.[1] ?? '1';
  const styles = item.subtype.replace(/^Two-Handed /, '').split('/');
  const isNativeRanged = item.properties.includes('Ammo');
  const thrownProperty = item.properties.includes('Thrown') ? 'Thrown' : item.properties.includes('Toss') ? 'Toss' : '';
  return {
    baseDamage: Number(damage?.[1] ?? 0),
    damageTypes: (damage?.[2] ?? '').split(' or ').filter(Boolean),
    range,
    styles,
    isNativeRanged,
    canBeThrown: Boolean(thrownProperty),
    thrownRange: thrownProperty === 'Thrown' ? '10/20' : thrownProperty === 'Toss' ? '5/10' : undefined,
    heavyHitDamageBonus: item.properties.includes('Impact') ? 1 : 0,
  };
}

export function equipmentUseCapacity(item: EquipmentCatalogItem): number | undefined {
  return item.charges ?? (item.name === 'Medicine Kit' ? 5 : undefined);
}

export function equipmentUsageLabel(item: EquipmentCatalogItem): 'Charges' | 'Uses' {
  return item.usageLabel ?? (item.properties.includes('Consumable') ? 'Uses' : 'Charges');
}

export interface ActiveEquipmentSheetEffects {
  resistances: string[];
  skillMasteryIncreases: Record<string, number>;
  skillBonusesAtCap: Record<string, number>;
  attributeBonuses: Record<string, number>;
  skillBonuses: Record<string, number>;
  tradeBonuses: Record<string, number>;
  saveBonuses: Record<string, number>;
  allCheckBonus: number;
  martialCheckBonus: number;
  spellCheckBonus: number;
  spellAttackBonus: number;
  saveDCBonus: number;
  weaponDamageBonus: number;
  spellDamageBonus: number;
  maxHPBonus: number;
  maxStaminaBonus: number;
  maxManaBonus: number;
  physicalDefenseBonus: number;
  areaDefenseBonus: number;
  speedBonus: number;
  immuneToFlanking: boolean;
  senses: string[];
  conditionalRules: string[];
  conditionSaveAdvantages: string[];
  immunities: string[];
}

const EMPTY_SHEET_EFFECTS: ActiveEquipmentSheetEffects = {
  resistances: [],
  skillMasteryIncreases: {},
  skillBonusesAtCap: {},
  attributeBonuses: {},
  skillBonuses: {},
  tradeBonuses: {},
  saveBonuses: {},
  allCheckBonus: 0,
  martialCheckBonus: 0,
  spellCheckBonus: 0,
  spellAttackBonus: 0,
  saveDCBonus: 0,
  weaponDamageBonus: 0,
  spellDamageBonus: 0,
  maxHPBonus: 0,
  maxStaminaBonus: 0,
  maxManaBonus: 0,
  physicalDefenseBonus: 0,
  areaDefenseBonus: 0,
  speedBonus: 0,
  immuneToFlanking: false,
  senses: [],
  conditionalRules: [],
  conditionSaveAdvantages: [],
  immunities: [],
};

function mergeSheetEffect(target: ActiveEquipmentSheetEffects, effect: EquipmentSheetEffects | undefined) {
  if (!effect) return;
  target.resistances.push(...(effect.resistances ?? []));
  target.senses.push(...(effect.senses ?? []));
  target.conditionalRules.push(...(effect.conditionalRules ?? []));
  target.conditionSaveAdvantages.push(...(effect.conditionSaveAdvantages ?? []));
  target.immunities.push(...(effect.immunities ?? []));
  target.immuneToFlanking ||= Boolean(effect.immuneToFlanking);
  for (const [name, value] of Object.entries(effect.skillMasteryIncreases ?? {})) {
    target.skillMasteryIncreases[name] = Math.max(target.skillMasteryIncreases[name] ?? 0, value);
  }
  for (const [name, value] of Object.entries(effect.skillBonusesAtCap ?? {})) {
    target.skillBonusesAtCap[name] = Math.max(target.skillBonusesAtCap[name] ?? 0, value);
  }
  for (const key of ['attributeBonuses', 'skillBonuses', 'tradeBonuses', 'saveBonuses'] as const) {
    for (const [name, value] of Object.entries(effect[key] ?? {})) {
      target[key][name] = (target[key][name] ?? 0) + value;
    }
  }
  for (const key of ['allCheckBonus', 'martialCheckBonus', 'spellCheckBonus', 'spellAttackBonus', 'saveDCBonus', 'weaponDamageBonus', 'spellDamageBonus', 'maxHPBonus', 'maxStaminaBonus', 'maxManaBonus', 'physicalDefenseBonus', 'areaDefenseBonus', 'speedBonus'] as const) {
    target[key] += effect[key] ?? 0;
  }
}

/** Published magic-item effects that are active for the character's current equip and attunement state. */
export function activeEquipmentSheetEffects(items: CharacterInventoryItem[], catalog: EquipmentCatalogItem[]): ActiveEquipmentSheetEffects {
  const equipmentByID = new Map(catalog.map((item) => [item.id, item]));
  const result: ActiveEquipmentSheetEffects = {
    ...EMPTY_SHEET_EFFECTS,
    resistances: [],
    skillMasteryIncreases: {},
    skillBonusesAtCap: {},
    attributeBonuses: {},
    skillBonuses: {},
    tradeBonuses: {},
    saveBonuses: {},
    senses: [],
    conditionalRules: [],
    conditionSaveAdvantages: [],
    immunities: [],
  };
  for (const inventory of items) {
    if (!inventory.isEquipped) continue;
    const equipment = equipmentByID.get(inventory.equipmentID);
    if (!equipment) continue;
    mergeSheetEffect(result, equipment.equippedEffects);
    if (inventory.isAttuned) mergeSheetEffect(result, equipment.attunedEffects);
  }
  result.resistances = Array.from(new Set(result.resistances));
  result.senses = Array.from(new Set(result.senses));
  result.conditionalRules = Array.from(new Set(result.conditionalRules));
  result.conditionSaveAdvantages = Array.from(new Set(result.conditionSaveAdvantages));
  result.immunities = Array.from(new Set(result.immunities));
  return result;
}

export function healingPotionAmount(item: EquipmentCatalogItem): number {
  if (item.category !== 'Adventuring Supplies' || !item.properties.includes('Healing') || !item.properties.includes('Consumable')) return 0;
  return Number(item.summary.match(/Restores (\d+) HP/i)?.[1] ?? item.mechanics.match(/regains (\d+) HP immediately/i)?.[1] ?? 0);
}

export function equipmentHandCost(slot: EquipmentSlot): number {
  if (slot === EquipmentSlotValues.ONE_HAND) return 1;
  if (slot === EquipmentSlotValues.TWO_HANDS) return 2;
  return 0;
}

export function isEquipmentEquippable(item: EquipmentCatalogItem): boolean {
  return item.slot !== EquipmentSlotValues.CARRIED;
}

export function enforceEquipmentHandCapacity(
  items: CharacterInventoryItem[],
  catalog: EquipmentCatalogItem[],
  options: { twoHandedWeaponHandCost?: 1 | 2 } = {},
): CharacterInventoryItem[] {
  const byID = new Map(catalog.map((equipment) => [equipment.id, equipment]));
  let occupiedHands = 0;
  return items.map((item) => {
    if (!item.isEquipped) return { ...item };
    const slot = byID.get(item.equipmentID)?.slot ?? EquipmentSlotValues.CARRIED;
    const cost = slot === EquipmentSlotValues.TWO_HANDS
      ? (options.twoHandedWeaponHandCost ?? 2)
      : equipmentHandCost(slot);
    if (cost === 0) return { ...item };
    if (occupiedHands + cost > 2) return { ...item, isEquipped: false };
    occupiedHands += cost;
    return { ...item };
  });
}

export function addInventoryItem(
  items: CharacterInventoryItem[],
  equipment: EquipmentCatalogItem,
): CharacterInventoryItem[] {
  const portableCustomItem = equipment.sourcePage === 'Custom Item'
    || equipment.sourcePage === 'GM Vault'
    || equipment.subtype === 'Custom Item'
    || equipment.subtype === 'Custom Magic Item';
  return [...items, {
    id: generateUUID(),
    equipmentID: equipment.id,
    quantity: 1,
    isEquipped: false,
    isAttuned: false,
    source: 'added',
    ...(portableCustomItem ? { itemSnapshot: equipment } : {}),
    remainingUses: equipmentUseCapacity(equipment),
  }];
}

/** Custom equipment embedded in a character, de-duplicated for local sheet resolution. */
export function inventoryCatalogSnapshots(items: CharacterInventoryItem[]): EquipmentCatalogItem[] {
  return Array.from(new Map(items.flatMap(({ itemSnapshot }) => itemSnapshot ? [[itemSnapshot.id, itemSnapshot] as const] : [])).values());
}

export function toggleInventoryEquipped(
  items: CharacterInventoryItem[],
  inventoryID: string,
  catalog: EquipmentCatalogItem[],
  options: { twoHandedWeaponHandCost?: 1 | 2 } = {},
): CharacterInventoryItem[] {
  const byID = new Map(catalog.map((equipment) => [equipment.id, equipment]));
  const targetIndex = items.findIndex(({ id }) => id === inventoryID);
  if (targetIndex < 0) return items;
  const targetEquipment = byID.get(items[targetIndex].equipmentID);
  if (!targetEquipment || !isEquipmentEquippable(targetEquipment)) return items;
  const updated = items.map((item) => ({ ...item }));
  if (updated[targetIndex].isEquipped) {
    updated[targetIndex].isEquipped = false;
    return updated;
  }

  if (targetEquipment.slot === EquipmentSlotValues.ARMOR) {
    updated.forEach((inventory, index) => {
      if (index !== targetIndex && byID.get(inventory.equipmentID)?.slot === EquipmentSlotValues.ARMOR) {
        inventory.isEquipped = false;
      }
    });
  } else if (targetEquipment.slot === EquipmentSlotValues.TWO_HANDS || targetEquipment.slot === EquipmentSlotValues.ONE_HAND) {
    const handCost = (slot: EquipmentSlot) => slot === EquipmentSlotValues.TWO_HANDS
      ? (options.twoHandedWeaponHandCost ?? 2)
      : equipmentHandCost(slot);
    const targetHandCost = handCost(targetEquipment.slot);
    const occupied = updated
      .map((inventory, index) => ({ inventory, index, equipment: byID.get(inventory.equipmentID) }))
      .filter(({ index, inventory, equipment }) => index !== targetIndex && inventory.isEquipped && handCost(equipment?.slot ?? EquipmentSlotValues.CARRIED) > 0);
    let occupiedHands = occupied.reduce((total, { equipment }) => total + handCost(equipment?.slot ?? EquipmentSlotValues.CARRIED), 0);
    while (occupiedHands + targetHandCost > 2) {
      const last = occupied.pop();
      if (!last) break;
      updated[last.index].isEquipped = false;
      occupiedHands -= handCost(last.equipment?.slot ?? EquipmentSlotValues.CARRIED);
    }
  }
  updated[targetIndex].isEquipped = true;
  return updated;
}

export function toggleInventoryAttuned(
  items: CharacterInventoryItem[],
  inventoryID: string,
  catalog: EquipmentCatalogItem[],
): CharacterInventoryItem[] {
  const inventory = items.find(({ id }) => id === inventoryID);
  const equipment = inventory ? catalog.find(({ id }) => id === inventory.equipmentID) : undefined;
  if (!inventory?.isEquipped || !equipment?.requiresAttunement) return items;
  return items.map((item) => item.id === inventoryID ? { ...item, isAttuned: !item.isAttuned } : item);
}

/** AP spent by the complete equip/stow transition, including gear auto-stowed to free a hand. */
export function equipmentTransitionActionPointCost(
  before: CharacterInventoryItem[],
  after: CharacterInventoryItem[],
  catalog: EquipmentCatalogItem[],
): number {
  const beforeByID = new Map(before.map((item) => [item.id, item]));
  const equipmentByID = new Map(catalog.map((item) => [item.id, item]));
  return after.reduce((cost, item) => {
    if (beforeByID.get(item.id)?.isEquipped === item.isEquipped) return cost;
    const equipment = equipmentByID.get(item.equipmentID);
    if (!equipment) return cost;
    return cost + Number(equipment.category === 'Shields' || equipment.properties.includes('Cumbersome'));
  }, 0);
}

export function setInventoryQuantity(
  items: CharacterInventoryItem[],
  inventoryID: string,
  quantity: number,
  usesPerItem?: number,
): CharacterInventoryItem[] {
  const effectiveUsesPerItem = usesPerItem ?? 5;
  return items.map((item) => {
    if (item.id !== inventoryID) return item;
    const nextQuantity = Math.max(1, Math.trunc(quantity));
    if (item.remainingUses === undefined) return { ...item, quantity: nextQuantity };
    const useDifference = (nextQuantity - item.quantity) * effectiveUsesPerItem;
    return { ...item, quantity: nextQuantity, remainingUses: Math.max(0, Math.min(nextQuantity * effectiveUsesPerItem, item.remainingUses + useDifference)) };
  });
}

export function consumeInventoryQuantity(
  items: CharacterInventoryItem[],
  inventoryID: string,
): CharacterInventoryItem[] {
  const target = items.find(({ id }) => id === inventoryID);
  if (!target) return items;
  if (target.quantity <= 1) return items.filter(({ id }) => id !== inventoryID);
  return items.map((item) => item.id === inventoryID ? { ...item, quantity: item.quantity - 1 } : item);
}

export function spendInventoryUse(
  items: CharacterInventoryItem[],
  inventoryID: string,
  defaultUses = 5,
): CharacterInventoryItem[] {
  return items.map((item) => item.id === inventoryID
    ? { ...item, remainingUses: Math.max(0, (item.remainingUses ?? item.quantity * defaultUses) - 1) }
    : item);
}
