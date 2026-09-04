import type { CharacterInventoryItem, EquipmentCatalogItem, EquipmentSlot } from '../types/models';
import { EquipmentSlotValues } from '../types/models';
import { generateUUID } from './gameUtils';

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

export function setInventoryQuantity(
  items: CharacterInventoryItem[],
  inventoryID: string,
  quantity: number,
): CharacterInventoryItem[] {
  return items.map((item) => item.id === inventoryID
    ? { ...item, quantity: Math.max(1, Math.trunc(quantity)) }
    : item);
}
