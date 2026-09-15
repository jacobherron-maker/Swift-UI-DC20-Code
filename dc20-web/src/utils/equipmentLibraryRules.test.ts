import { describe, expect, it } from 'vitest';
import type { Character, EquipmentCatalogItem } from '../types/models';
import {
  addEquipmentQuantity,
  equipmentAccessForCharacter,
  equipmentComparisonFacts,
  equipmentEffectKinds,
  equipmentProvenance,
  equipmentRangeBucket,
} from './equipmentLibraryRules';

const weapon: EquipmentCatalogItem = {
  id: 'test-sword',
  name: 'Test Sword',
  category: 'Weapons',
  subtype: 'Sword',
  summary: '1 Slashing damage • Guard • Range 1',
  mechanics: 'A test weapon.',
  properties: ['Guard'],
  slot: 'One Hand',
  sourcePage: 'Beta 0.10.5 p.166',
};

const potion: EquipmentCatalogItem = {
  id: 'custom-potion',
  name: 'Custom Potion',
  category: 'Adventuring Supplies',
  subtype: 'Custom Item',
  summary: 'Restores 3 HP when consumed.',
  mechanics: 'The creature regains 3 HP immediately.',
  properties: ['Healing', 'Consumable'],
  slot: 'Carried',
  sourcePage: 'Custom Item',
  charges: 1,
  usageLabel: 'Uses',
};

describe('equipment library helpers', () => {
  it('classifies searchable mechanics and comparison data without rewriting source text', () => {
    expect(equipmentRangeBucket(weapon)).toBe('Melee');
    expect(equipmentEffectKinds(weapon)).toEqual(expect.arrayContaining(['Attack', 'Defense']));
    expect(equipmentEffectKinds(potion)).toEqual(expect.arrayContaining(['Healing', 'Consumable']));
    expect(equipmentComparisonFacts(weapon)).toMatchObject({ Damage: '1 Slashing damage', Range: '1', Source: 'Beta 0.10.5 p.166' });
  });

  it('provides explicit published and user-authored provenance', () => {
    expect(equipmentProvenance(weapon)).toMatchObject({ sourceDocument: 'DC20 RPG Beta 0.10.5', status: 'Source verified' });
    expect(equipmentProvenance(potion, true)).toMatchObject({ sourceDocument: 'Player-created Equipment Library', status: 'User-authored' });
  });

  it('stacks quantities, portable snapshots, and limited-use pools together', () => {
    const once = addEquipmentQuantity([], potion, 2);
    expect(once[0]).toMatchObject({ equipmentID: potion.id, quantity: 2, remainingUses: 2, itemSnapshot: potion });
    const stacked = addEquipmentQuantity(once, potion, 3);
    expect(stacked).toHaveLength(1);
    expect(stacked[0]).toMatchObject({ quantity: 5, remainingUses: 5 });
  });

  it('reports whether a carried item is in the chosen character inventory', () => {
    const character = { inventoryItems: addEquipmentQuantity([], potion, 2) } as Character;
    expect(equipmentAccessForCharacter(character, potion, null)).toMatchObject({ state: 'In Inventory', inventoryQuantity: 2 });
  });
});
