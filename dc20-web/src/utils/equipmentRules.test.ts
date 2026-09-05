import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CharacterInventoryItem, EquipmentCatalogItem } from '../types/models';
import {
  addInventoryItem,
  consumeInventoryQuantity,
  defensiveEquipmentProfile,
  enforceEquipmentHandCapacity,
  equipmentTransitionActionPointCost,
  healingPotionAmount,
  spendInventoryUse,
  toggleInventoryEquipped,
  weaponMechanicalProfile,
  WEAPON_ENHANCEMENTS,
} from './equipmentRules';

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

  it('matches every weapon example row published on Beta page 166', () => {
    expect(catalog.filter(({ category }) => category === 'Weapons').map((item) => [item.name, item.subtype, item.summary])).toEqual([
      ['Sickle / Hand Axe / Throwing Star', 'Axe', '1 Slashing damage • Concealable, Toss • Range 5/10'],
      ['Brass Knuckles', 'Fist', '1 Bludgeoning damage • Concealable, Impact • Range 1'],
      ['Club', 'Hammer', '1 Bludgeoning damage • Concealable, Toss • Range 5/10'],
      ['Light Hammer', 'Hammer', '1 Bludgeoning damage • Impact, Toss • Range 5/10'],
      ['Boomerang', 'Hammer', '1 Bludgeoning damage • Toss, Returning • Range 5/10'],
      ['Mining Pick', 'Pick', '1 Piercing damage • Impact, Toss • Range 5/10'],
      ['Dart', 'Spear', '1 Piercing damage • Concealable, Toss • Range 5/10'],
      ['Javelin', 'Spear', '1 Piercing damage • Thrown • Range 10/20'],
      ['Throwing Dagger', 'Sword', '1 Slashing damage • Concealable, Toss • Range 5/10'],
      ['Short Sword', 'Sword', '1 Slashing damage • Guard, Impact • Range 1'],
      ['Rapier', 'Sword/Spear', '1 Slashing or Piercing damage • Guard, Multi-Faceted • Range 1'],
      ['Chain Whip', 'Whip', '1 Slashing damage • Reach, Impact • Range 2'],
      ['Battleaxe', 'Axe', '1 Slashing damage • Versatile, Impact • Range 1'],
      ['Flail', 'Hammer/Whip', '1 Bludgeoning or Slashing damage • Versatile, Multi-Faceted • Range 1'],
      ['Morningstar / Warhammer', 'Hammer/Pick', '1 Bludgeoning or Piercing damage • Versatile, Multi-Faceted • Range 1'],
      ['Pickaxe', 'Pick', '1 Piercing damage • Versatile, Impact • Range 1'],
      ['Spear', 'Spear', '1 Piercing damage • Versatile, Toss • Range 5/10'],
      ['Long Spear', 'Spear', '1 Piercing damage • Versatile, Reach • Range 2'],
      ['Bo Staff', 'Staff', '1 Bludgeoning damage • Versatile, Guard • Range 1'],
      ['Longsword', 'Sword', '1 Slashing damage • Versatile, Guard • Range 1'],
      ['Bastard Sword', 'Sword', '1 Slashing damage • Versatile, Impact • Range 1'],
      ['Bull Whip', 'Whip', '1 Slashing damage • Versatile, Reach, Unwieldy, Impact • Range 2'],
      ['Scythe', 'Two-Handed Axe', '2 Slashing damage • Two-Handed, Heavy, Reach • Range 2'],
      ['Greataxe', 'Two-Handed Axe', '2 Slashing damage • Two-Handed, Heavy, Impact • Range 1'],
      ['Halberd', 'Two-Handed Axe/Pick', '1 Slashing or Piercing damage • Two-Handed, Multi-Faceted, Reach, Impact • Range 2'],
      ['War Flail', 'Two-Handed Hammer/Whip', '2 Bludgeoning or Slashing damage • Two-Handed, Heavy, Multi-Faceted • Range 1'],
      ['Meteor Hammer', 'Two-Handed Hammer/Whip', '2 Bludgeoning or Slashing damage • Two-Handed, Heavy, Multi-Faceted, Reach, Unwieldy • Range 2'],
      ['Greatmaul', 'Two-Handed Hammer', '2 Bludgeoning damage • Two-Handed, Heavy, Impact • Range 1'],
      ['Pike', 'Two-Handed Spear', '2 Piercing damage • Two-Handed, Heavy, Reach, Impact, Unwieldy • Range 2'],
      ['Quarterstaff', 'Two-Handed Staff', '1 Bludgeoning damage • Two-Handed, Guard, Reach, Impact • Range 2'],
      ['Glaive', 'Two-Handed Sword', '2 Slashing damage • Two-Handed, Heavy, Reach • Range 2'],
      ['Greatsword', 'Two-Handed Sword', '2 Slashing damage • Two-Handed, Heavy, Impact • Range 1'],
      ['Great Whip', 'Two-Handed Whip', '2 Slashing damage • Two-Handed, Heavy, Reach, Impact, Unwieldy • Range 2'],
      ['Sling', 'Sling', '1 Bludgeoning damage • Ammo, Impact • Range 15/45'],
      ['Hand Crossbow', 'Crossbow', '2 Piercing damage • Ammo, Reload, Deft, Impact • Range 15/45'],
      ['Hand Stonebow', 'Crossbow/Sling', '2 Bludgeoning or Piercing damage • Ammo, Reload, Deft, Multi-Faceted • Range 15/45'],
      ['Shortbow', 'Two-Handed Bow', '1 Piercing damage • Two-Handed, Ammo, Impact, Silent • Range 15/45'],
      ['Longbow', 'Two-Handed Bow', '1 Piercing damage • Two-Handed, Ammo, Impact, Long-Ranged • Range 30/90'],
      ['Greatbow', 'Two-Handed Bow', '2 Piercing damage • Two-Handed, Ammo, Impact, Heavy, Cumbersome • Range 15/45'],
      ['Blowgun (Needle)', 'Two-Handed Crossbow', '1 Piercing damage • Two-Handed, Ammo, Deft, Silent • Range 15/45'],
      ['Light Crossbow', 'Two-Handed Crossbow', '3 Piercing damage • Two-Handed, Ammo, Reload, Deft, Heavy • Range 15/45'],
      ['Heavy Crossbow', 'Two-Handed Crossbow', '3 Piercing damage • Two-Handed, Ammo, Reload, Deft, Impact, Heavy, Cumbersome • Range 15/45'],
      ['Stonebow', 'Two-Handed Crossbow/Sling', '3 Bludgeoning or Piercing damage • Two-Handed, Ammo, Reload, Deft, Multi-Faceted, Heavy, Cumbersome • Range 15/45'],
      ['Slingshot', 'Two-Handed Sling', '1 Bludgeoning damage • Two-Handed, Ammo, Impact, Silent • Range 15/45'],
      ['War Sling', 'Two-Handed Sling', '2 Bludgeoning damage • Two-Handed, Ammo, Heavy • Range 15/45'],
    ]);
  });

  it('documents every listed weapon property and every applicable style enhancement', () => {
    for (const item of catalog.filter(({ category }) => category === 'Weapons')) {
      for (const property of item.properties) expect(item.mechanics).toContain(`• ${property}:`);
      for (const style of weaponMechanicalProfile(item)?.styles ?? []) {
        expect(WEAPON_ENHANCEMENTS[style]).toBeTruthy();
        expect(item.mechanics).toContain(`• ${style}:`);
      }
    }
  });

  it('documents every listed Spell Focus property and its Training requirement', () => {
    for (const item of catalog.filter(({ category }) => category === 'Spell Focuses')) {
      expect(item.mechanics).toContain('Without Spell Focus Training');
      for (const property of item.properties.filter((value) => value !== 'Two-Handed')) {
        expect(item.mechanics).toContain(`• ${property}:`);
      }
    }
  });

  it('matches the published focus, armor, shield, and adventuring-supply tables', () => {
    expect(catalog.filter(({ category }) => category === 'Spell Focuses').map(({ name, properties }) => [name, properties])).toEqual([
      ['Orb', ['Channeling']], ['Ceremonial Dagger', ['Close Quarters']], ['Crystal', ['Vicious']], ['Totem', ['Protective']],
      ['Holy Medallion / Relic', ['Warded']], ['Wand', ['Long-Ranged']], ['Rod', ['Reach']], ['Poppet', ['Muffled']],
      ['Ritual Bell', ['Reactive']], ['Mage Staff / Twin Crystals', ['Powerful', 'Two-Handed']],
      ['Grimoire / Tarot Deck', ['Channeling', 'Vicious', 'Two-Handed']], ['Censer', ['Protective', 'Warded', 'Two-Handed']],
      ['Magical Instrument', ['Long-Ranged', 'Reactive', 'Two-Handed']],
    ]);
    expect(catalog.filter(({ category }) => category === 'Armor').map(({ name, summary }) => [name, summary])).toEqual([
      ['Defensive Light Armor', '+1 PD and +1 AD.'], ['Deflecting Light Armor', '+2 PD.'], ['Fortified Light Armor', '+2 AD.'],
      ['Defensive Heavy Armor', '+1 PD, +1 AD, PDR (Half), Speed -1, and DisADV on Agility Checks.'],
      ['Deflecting Heavy Armor', '+2 PD, PDR (Half), Speed -1, and DisADV on Agility Checks.'],
      ['Fortified Heavy Armor', '+2 AD, PDR (Half), Speed -1, and DisADV on Agility Checks.'],
      ['Highly Defensive Heavy Armor', '+2 PD and +2 AD, Speed -1, and DisADV on Agility Checks.'],
    ]);
    expect(catalog.filter(({ category }) => category === 'Shields').map(({ name, summary, properties }) => [name, summary, properties])).toEqual([
      ['Buckler', '+1 PD', ['Grasp']], ['Round Shield', '+1 AD', ['Toss']], ['Heater Shield', '+1 PD, +1 AD', []],
      ['Kite Shield', '+1 PD, +2 AD, Speed -1, DisADV on Agility Checks', ['Mounted']],
      ['Tower Shield', '+2 PD, +2 AD, Speed -1, DisADV on Agility Checks', []],
    ]);
    expect(catalog.filter(({ category }) => category === 'Adventuring Supplies').map(({ name }) => name)).toEqual([
      'Gauntlet', 'Healing Potion (1st Level)', 'Healing Potion (2nd Level)', 'Healing Potion (3rd Level)',
      'Healing Potion (4th Level)', 'Healing Potion (5th Level)', 'Medicine Kit', 'Net',
    ]);
  });

  it('contains a correctly attributed tool for every trade that requires one', () => {
    expect(catalog.filter(({ category }) => category === 'Trade Tools').map(({ properties }) => properties[0])).toEqual([
      'Illustration', 'Musician', 'Alchemy', 'Blacksmithing', 'Glassblowing', 'Herbalism', 'Jeweler', 'Leatherworking',
      'Sculpting', 'Tinkering', 'Weaving', 'Brewing', 'Carpentry', 'Cartography', 'Cooking', 'Masonry',
      'Cryptography', 'Disguise', 'Gaming', 'Lockpicking',
    ]);
    for (const item of catalog.filter(({ category }) => category === 'Trade Tools')) {
      expect(item.mechanics).toContain(`Associated Attribute:`);
      expect(item.mechanics).toContain(`perform ${item.properties[0]} activities`);
    }
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

  it('charges AP for every Shield or Cumbersome item changed during a hand swap', () => {
    const shield = catalog.find(({ name }) => name === 'Tower Shield')!;
    const cumbersome = catalog.find(({ name }) => name === 'Greatbow')!;
    const before = [inventory(shield, 'shield', true), inventory(longsword, 'longsword', true), inventory(cumbersome, 'greatbow')];
    const after = toggleInventoryEquipped(before, 'greatbow', catalog);
    expect(after.map(({ isEquipped }) => isEquipped)).toEqual([false, false, true]);
    expect(equipmentTransitionActionPointCost(before, after, catalog)).toBe(2);
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

  it('derives attack and defense mechanics from the audited catalog', () => {
    expect(weaponMechanicalProfile(greatsword)).toMatchObject({
      baseDamage: 2,
      damageTypes: ['Slashing'],
      range: '1',
      styles: ['Sword'],
      isNativeRanged: false,
      heavyHitDamageBonus: 1,
    });
    expect(defensiveEquipmentProfile(heavyArmor)).toEqual({
      physicalDefense: 1,
      areaDefense: 1,
      physicalDamageReduction: true,
      elementalDamageReduction: false,
      speedPenalty: 1,
      agilityCheckDisadvantage: 1,
    });
    expect(healingPotionAmount(potion)).toBe(2);
  });

  it('tracks potion quantities and Medicine Kit uses', () => {
    const potionItem = inventory(potion, 'potion');
    expect(consumeInventoryQuantity([potionItem], 'potion')).toEqual([]);
    const kit = catalog.find(({ name }) => name === 'Medicine Kit')!;
    const kitItem = addInventoryItem([], kit)[0];
    expect(kitItem.remainingUses).toBe(5);
    expect(spendInventoryUse([kitItem], kitItem.id)[0].remainingUses).toBe(4);
  });
});
