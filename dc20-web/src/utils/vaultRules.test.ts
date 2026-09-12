import { describe, expect, it } from 'vitest';
import { migratePersistedState } from '../store/campaignStore';
import { VaultContentKindValues } from '../types/models';
import type { Character, GmVaultEntry } from '../types/models';
import { activeEquipmentSheetEffects } from './equipmentRules';
import { completeCharacterRest } from './characterRules';
import {
  activeCharacterVaultEffects,
  addVaultEntryToCharacter,
  createVaultEntry,
  normalizeVaultEntry,
  prepareVaultEntry,
  removeVaultEntryFromCharacter,
  vaultEntryEligibility,
} from './vaultRules';

function character(overrides: Partial<Character> = {}): Character {
  const migrated = migratePersistedState({
    characters: [{
      id: 'vault-hero',
      name: 'Vault Hero',
      level: 2,
      ancestry: 'Human',
      class: 'Barbarian',
      attributes: {
        Might: { score: 2, modifier: 2 },
        Agility: { score: 1, modifier: 1 },
        Charisma: { score: 0, modifier: 0 },
        Intelligence: { score: -1, modifier: -1 },
      },
      healthPoints: 10,
      maxHealthPoints: 10,
      stamina: 4,
      maxStamina: 4,
      manaPoints: 0,
      maxManaPoints: 0,
      physicalDefense: 10,
      arcaneDefense: 10,
      speed: 5,
      ...overrides,
    }],
  });
  return migrated.characters[0];
}

describe('GM Vault entries', () => {
  it('normalizes shared snapshots and keeps specialized payloads synchronized', () => {
    const draft = createVaultEntry(VaultContentKindValues.SPELL);
    draft.name = 'Star Lance';
    draft.summary = 'A focused astral bolt.';
    draft.description = 'Make a Spell Attack against a creature in range.';
    draft.spell!.school = 'Astromancy';

    const normalized = normalizeVaultEntry(JSON.parse(JSON.stringify(prepareVaultEntry(draft))));

    expect(normalized).toMatchObject({ name: 'Star Lance', kind: VaultContentKindValues.SPELL });
    expect(normalized?.spell).toMatchObject({
      name: 'Star Lance',
      source: 'GM Vault',
      school: 'Astromancy',
      description: 'Make a Spell Attack against a creature in range.',
    });
  });

  it('routes item effects through attunement and adds the item unequipped', () => {
    const draft = createVaultEntry(VaultContentKindValues.ITEM);
    draft.name = 'Crown of the Deep Star';
    draft.effects.saveDCBonus = 2;
    draft.effects.resistances = ['Psychic'];
    draft.item!.requiresAttunement = true;
    const entry = prepareVaultEntry(draft);
    const updated = addVaultEntryToCharacter(character(), entry);
    const inventory = updated.inventoryItems?.find(({ equipmentID }) => equipmentID === entry.item?.id);

    expect(inventory).toMatchObject({ isEquipped: false, isAttuned: false, quantity: 1 });
    expect(entry.item?.equippedEffects).toBeUndefined();
    expect(entry.item?.attunedEffects).toMatchObject({ saveDCBonus: 2, resistances: ['Psychic'] });
    expect(activeEquipmentSheetEffects(updated.inventoryItems ?? [], [entry.item!]).saveDCBonus).toBe(0);

    const attunedInventory = (updated.inventoryItems ?? []).map((item) => item.id === inventory?.id
      ? { ...item, isEquipped: true, isAttuned: true } : item);
    expect(activeEquipmentSheetEffects(attunedInventory, [entry.item!])).toMatchObject({
      saveDCBonus: 2,
      resistances: ['Psychic'],
    });
  });

  it('keeps published and custom spell grants attached to magic items', () => {
    const draft = createVaultEntry(VaultContentKindValues.ITEM);
    draft.grantedSpells = [{
      id: 'custom-spell',
      name: 'Moonlit Step',
      source: 'GM Vault',
      school: 'Astromancy',
      cost: '1 AP',
      range: 'Self',
      duration: 'Instantaneous',
      description: 'Teleport to an unoccupied Space you can see.',
    }];
    const prepared = prepareVaultEntry(draft);

    expect(prepared.item?.grantedSpells).toEqual(['Moonlit Step']);
    expect(prepared.grantedSpells?.[0]).toMatchObject({ name: 'Moonlit Step', source: 'GM Vault' });
    expect(normalizeVaultEntry(JSON.parse(JSON.stringify(prepared)))?.grantedSpells?.[0].description)
      .toContain('Teleport');
  });

  it('copies companions into the character sheet and applies passive feature effects', () => {
    const companion = createVaultEntry(VaultContentKindValues.COMPANION);
    companion.name = 'Clockwork Owl';
    companion.companion!.maxHP = 6;
    const withCompanion = addVaultEntryToCharacter(character(), prepareVaultEntry(companion));
    expect(withCompanion.build?.sheetCompanions?.[0]).toMatchObject({
      name: 'Clockwork Owl',
      source: 'GM Vault',
      maxHP: 6,
      creatureType: 'Beast',
      canAttack: true,
    });

    const feature = createVaultEntry(VaultContentKindValues.FEATURE);
    feature.name = 'Titanic Soul';
    feature.effects.attributeBonuses = { Might: 1 };
    feature.effects.maxHPBonus = 2;
    feature.effects.physicalDefenseBonus = 1;
    feature.effects.allCheckBonus = 1;
    const updated = addVaultEntryToCharacter(character(), prepareVaultEntry(feature));

    expect(updated.attributes.Might.modifier).toBe(3);
    expect(updated.maxHealthPoints).toBe(13);
    expect(updated.physicalDefense).toBe(11);
    expect(activeCharacterVaultEffects(updated)).toMatchObject({
      attributeBonuses: { Might: 1 },
      maxHPBonus: 2,
      physicalDefenseBonus: 1,
      allCheckBonus: 1,
    });
  });

  it('scales summoned companions from the accepting character and retains structured abilities', () => {
    const summon = createVaultEntry(VaultContentKindValues.COMPANION);
    summon.name = 'Lantern Wisp';
    summon.companion = {
      ...summon.companion!,
      kind: 'Summon',
      usesOwnerStats: true,
      abilities: [{ id: 'glow', kind: 'Action', name: 'Searing Glow', cost: '1 AP', details: 'Make an Attack.' }],
    };
    const updated = addVaultEntryToCharacter(character(), prepareVaultEntry(summon));
    const accepted = updated.build?.sheetCompanions?.[0];

    expect(accepted).toMatchObject({
      kind: 'Summon',
      primeModifier: 2,
      combatMastery: 1,
      attackCheck: 3,
    });
    expect(accepted?.features).toContain('Action: Searing Glow (1 AP)');
  });

  it('tracks Talent and Feature charges and restores them at the configured rest', () => {
    const feature = createVaultEntry(VaultContentKindValues.FEATURE);
    feature.name = 'Starwell Blessing';
    feature.charges = 3;
    feature.remainingCharges = 3;
    feature.recharge = 'Short Rest';
    feature.grantedSpells = [{
      id: 'starwell-spell', name: 'Starlight', source: 'GM Vault', school: 'Astromancy',
      range: 'Self', duration: '1 Round', description: 'You glow with starlight.',
    }];
    const accepted = addVaultEntryToCharacter(character(), prepareVaultEntry(feature));
    const spent = { ...accepted, vaultEntries: accepted.vaultEntries?.map((entry) => ({ ...entry, remainingCharges: 0 })) };

    expect(spent.vaultEntries?.[0]).toMatchObject({ charges: 3, remainingCharges: 0, recharge: 'Short Rest' });
    expect(completeCharacterRest(spent, 'Quick', 0).vaultEntries?.[0].remainingCharges).toBe(0);
    expect(completeCharacterRest(spent, 'Short', 0).vaultEntries?.[0].remainingCharges).toBe(3);
    expect(spent.vaultEntries?.[0].grantedSpells?.[0].name).toBe('Starlight');
  });

  it('enforces level, class, and ancestry requirements before acceptance', () => {
    const entry = createVaultEntry(VaultContentKindValues.TALENT);
    entry.requirements = { minimumLevel: 3, classes: ['Wizard'], ancestries: ['Elf'] };
    expect(vaultEntryEligibility(character(), entry)).toEqual({ eligible: false, reason: 'Requires level 3.' });

    const levelThree = character({ level: 3 });
    expect(vaultEntryEligibility(levelThree, entry)).toEqual({ eligible: false, reason: 'Requires Wizard.' });

    const wizard = character({ level: 3, class: 'Wizard' });
    expect(vaultEntryEligibility(wizard, entry)).toEqual({ eligible: false, reason: 'Requires Elf ancestry.' });

    const eligible = character({ level: 3, class: 'Wizard', ancestry: 'Elf' });
    expect(vaultEntryEligibility(eligible, entry)).toEqual({ eligible: true, reason: '' });
  });

  it('does not add the same shared entry twice', () => {
    const entry = prepareVaultEntry(createVaultEntry(VaultContentKindValues.OTHER)) as GmVaultEntry;
    const once = addVaultEntryToCharacter(character(), entry);
    const twice = addVaultEntryToCharacter(once, entry);
    expect(twice.vaultEntries).toHaveLength(1);
  });

  it('removes an accepted entry together with the sheet records it created', () => {
    const companion = prepareVaultEntry(createVaultEntry(VaultContentKindValues.COMPANION));
    const addedCompanion = addVaultEntryToCharacter(character(), companion);
    const removedCompanion = removeVaultEntryFromCharacter(addedCompanion, companion.id);
    expect(removedCompanion.vaultEntries).toHaveLength(0);
    expect(removedCompanion.build?.sheetCompanions).toHaveLength(0);

    const item = prepareVaultEntry(createVaultEntry(VaultContentKindValues.ITEM));
    const addedItem = addVaultEntryToCharacter(character(), item);
    const removedItem = removeVaultEntryFromCharacter(addedItem, item.id);
    expect(removedItem.inventoryItems).toHaveLength(0);
  });
});
