import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CharacterInventoryItem, EquipmentCatalogItem } from '../types/models';
import { addInventoryItem, enforceEquipmentHandCapacity, toggleInventoryEquipped } from './equipmentRules';

const catalogPath = fileURLToPath(new URL('../../public/data/EquipmentCatalog.json', import.meta.url));
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as EquipmentCatalogItem[];

function inventory(item: EquipmentCatalogItem, id: string, equipped = false): CharacterInventoryItem {
  return { id, equipmentID: item.id, quantity: 1, isEquipped: equipped, source: 'added' };
}

describe('native equipment catalog export', () => {
  it('contains every current native equipment category', () => {
    expect(catalog).toHaveLength(98);
    const counts = Object.fromEntries(
      Object.entries(catalog.reduce<Record<string, number>>((result, item) => {
        result[item.category] = (result[item.category] ?? 0) + 1;
        return result;
      }, {})).sort(),
    );
    expect(counts).toEqual({
      'Adventuring Supplies': 8,
      Armor: 7,
      Shields: 5,
      'Spell Focuses': 13,
      'Trade Tools': 20,
      Weapons: 45,
    });
  });
});

describe('character inventory equipment rules', () => {
  const longsword = catalog.find(({ name }) => name === 'Longsword')!;
  const greatsword = catalog.find(({ name }) => name === 'Greatsword')!;
  const lightArmor = catalog.find(({ name }) => name === 'Defensive Light Armor')!;
  const heavyArmor = catalog.find(({ name }) => name === 'Defensive Heavy Armor')!;
  const potion = catalog.find(({ name }) => name === 'Healing Potion (1st Level)')!;

  it('adds catalog references rather than copying licensed rules text into saves', () => {
    expect(addInventoryItem([], longsword)[0]).toMatchObject({
      equipmentID: longsword.id,
      quantity: 1,
      isEquipped: false,
      source: 'added',
    });
  });

  it('allows only one equipped armor set', () => {
    const items = [inventory(lightArmor, 'light', true), inventory(heavyArmor, 'heavy')];
    expect(toggleInventoryEquipped(items, 'heavy', catalog).map(({ isEquipped }) => isEquipped)).toEqual([false, true]);
  });

  it('enforces the two-hand capacity', () => {
    const items = [inventory(longsword, 'longsword', true), inventory(greatsword, 'greatsword')];
    expect(toggleInventoryEquipped(items, 'greatsword', catalog).map(({ isEquipped }) => isEquipped)).toEqual([false, true]);
  });

  it('lets Unfathomable Strength treat Two-Handed Weapons as one hand while Raging', () => {
    const secondGreatsword = inventory(greatsword, 'second-greatsword');
    const items = [inventory(greatsword, 'greatsword', true), secondGreatsword];
    expect(toggleInventoryEquipped(items, 'second-greatsword', catalog, { twoHandedWeaponHandCost: 1 }).map(({ isEquipped }) => isEquipped)).toEqual([true, true]);
    expect(enforceEquipmentHandCapacity([
      { ...items[0], isEquipped: true },
      { ...items[1], isEquipped: true },
    ], catalog).map(({ isEquipped }) => isEquipped)).toEqual([true, false]);
  });

  it('does not equip carried consumables', () => {
    const items = [inventory(potion, 'potion')];
    expect(toggleInventoryEquipped(items, 'potion', catalog)).toEqual(items);
  });
});
