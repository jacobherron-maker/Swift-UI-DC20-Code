import type { CharacterInventoryItem, EquipmentCatalogItem, EquipmentSlot } from '../types/models';
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
  speedPenalty: number;
  agilityCheckDisadvantage: number;
}

const DEFENSIVE_EQUIPMENT: Record<string, DefensiveEquipmentProfile> = {
  'Defensive Light Armor': { physicalDefense: 1, areaDefense: 1, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Deflecting Light Armor': { physicalDefense: 2, areaDefense: 0, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Fortified Light Armor': { physicalDefense: 0, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Defensive Heavy Armor': { physicalDefense: 1, areaDefense: 1, physicalDamageReduction: true, elementalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Deflecting Heavy Armor': { physicalDefense: 2, areaDefense: 0, physicalDamageReduction: true, elementalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Fortified Heavy Armor': { physicalDefense: 0, areaDefense: 2, physicalDamageReduction: true, elementalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Highly Defensive Heavy Armor': { physicalDefense: 2, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  Buckler: { physicalDefense: 1, areaDefense: 0, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Round Shield': { physicalDefense: 0, areaDefense: 1, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Heater Shield': { physicalDefense: 1, areaDefense: 1, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 0, agilityCheckDisadvantage: 0 },
  'Kite Shield': { physicalDefense: 1, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
  'Tower Shield': { physicalDefense: 2, areaDefense: 2, physicalDamageReduction: false, elementalDamageReduction: false, speedPenalty: 1, agilityCheckDisadvantage: 1 },
};

export const WEAPON_ENHANCEMENTS: Record<string, string> = {
  Axe: 'Bleed — the target makes a Repeated Physical Save. Failure: The target begins Bleeding.',
  Bow: 'Slow — the target makes an Agility Save. Failure: The target becomes Slowed until the end of its next turn.',
  Crossbow: 'Accuracy — add a d4 to your Attack Check.',
  Fist: 'Grapple — the target makes a Physical Save. Failure: The target becomes Grappled by you. Fist Weapons count as a free hand for Grappling.',
  Hammer: 'Knockback — the target makes a Might Save. Failure: The target is pushed 1 Space away, plus 1 Space each time you use this Enhancement.',
  Pick: 'Hinder — the target makes an Agility Save. Failure: The target becomes Hindered until the end of its next turn.',
  Sling: 'Hinder — the target makes an Agility Save. Failure: The target becomes Hindered until the end of its next turn.',
  Spear: 'Slow — the target makes an Agility Save. Failure: The target becomes Slowed until the end of its next turn.',
  Staff: 'Trip — the target makes a Physical Save. Failure: The target falls Prone.',
  Sword: 'Accuracy — add a d4 to your Attack Check.',
  Whip: 'Pull — the target makes a Might Save. Failure: Move it horizontally 1 Space toward you or to either side, plus 1 Space each time you use this Enhancement.',
};

export function defensiveEquipmentProfile(item: EquipmentCatalogItem): DefensiveEquipmentProfile {
  return DEFENSIVE_EQUIPMENT[item.name] ?? {
    physicalDefense: 0,
    areaDefense: 0,
    physicalDamageReduction: false,
    elementalDamageReduction: false,
    speedPenalty: 0,
    agilityCheckDisadvantage: 0,
  };
}

/** Structured combat data for every published Beta weapon example. */
export function weaponMechanicalProfile(item: EquipmentCatalogItem): WeaponMechanicalProfile | null {
  if (item.category !== 'Weapons') return null;
  const damage = item.summary.match(/^(\d+) ([A-Za-z]+(?: or [A-Za-z]+)?) damage/);
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
  return item.name === 'Medicine Kit' ? 5 : undefined;
}

export function healingPotionAmount(item: EquipmentCatalogItem): number {
  if (item.category !== 'Adventuring Supplies' || !item.properties.includes('Healing') || !item.properties.includes('Consumable')) return 0;
  return Number(item.summary.match(/Restores (\d+) HP/)?.[1] ?? 0);
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
  return [...items, {
    id: generateUUID(),
    equipmentID: equipment.id,
    quantity: 1,
    isEquipped: false,
    source: 'added',
    remainingUses: equipmentUseCapacity(equipment),
  }];
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
): CharacterInventoryItem[] {
  return items.map((item) => {
    if (item.id !== inventoryID) return item;
    const nextQuantity = Math.max(1, Math.trunc(quantity));
    if (item.remainingUses === undefined) return { ...item, quantity: nextQuantity };
    const useDifference = (nextQuantity - item.quantity) * 5;
    return { ...item, quantity: nextQuantity, remainingUses: Math.max(0, Math.min(nextQuantity * 5, item.remainingUses + useDifference)) };
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
