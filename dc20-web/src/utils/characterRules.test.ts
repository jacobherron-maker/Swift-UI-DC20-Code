import { describe, expect, it } from 'vitest';
import referenceDocument from '../../public/data/CharacterReference.json';
import type { Character, CharacterReferenceData, EquipmentCatalogItem } from '../types/models';
import {
  ancestryExpertise,
  applyDerivedCharacter,
  attributeCap,
  classHealth,
  combatMastery,
  defaultBuild,
  deriveCharacter,
  masteryCap,
} from './characterRules';

const reference = referenceDocument as CharacterReferenceData;
const bard = reference.classes.find(({ name }) => name === 'Bard')!;
const barbarian = reference.classes.find(({ name }) => name === 'Barbarian')!;

function character(className = 'Barbarian'): Character {
  return {
    id: 'hero', name: 'Hero', level: 1, ancestry: 'Human', class: className,
    background: '', alignment: '',
    attributes: {
      Might: { name: 'Might', score: 3, modifier: 3 },
      Agility: { name: 'Agility', score: 1, modifier: 1 },
      Charisma: { name: 'Charisma', score: 0, modifier: 0 },
      Intelligence: { name: 'Intelligence', score: 0, modifier: 0 },
    },
    primeModifier: 3, skillMasteries: {}, tradeMasteries: {}, languages: ['Common'],
    healthPoints: 11, maxHealthPoints: 11, stamina: 2, maxStamina: 2,
    manaPoints: 0, maxManaPoints: 0, currentAP: 4, maxAP: 4,
    physicalDefense: 10, arcaneDefense: 14, combatMastery: 1, speed: 6, defense: 10,
    injuries: [], skills: [], equipment: [], inventoryItems: [], spells: [], maneuvers: [], notes: '',
    build: defaultBuild(),
  };
}

describe('DC20 character calculations', () => {
  it('uses staged attribute and mastery caps', () => {
    expect([1, 5, 10, 15, 20].map(attributeCap)).toEqual([3, 4, 5, 6, 7]);
    expect([1, 5, 10, 15, 20].map(masteryCap)).toEqual([1, 2, 3, 4, 5]);
  });

  it('uses the DC20 combat mastery progression', () => {
    expect([1, 2, 3, 4, 5, 10].map(combatMastery)).toEqual([1, 1, 2, 2, 3, 5]);
  });

  it('uses the audited class health progressions', () => {
    expect(classHealth('Barbarian', 5)).toBe(16);
    expect(classHealth('Rogue', 5)).toBe(14);
    expect(classHealth('Wizard', 5)).toBe(11);
  });

  it('applies Bard Remarkable Repertoire to the Skill Point budget', () => {
    const hero = character('Bard');
    const derived = deriveCharacter(hero, bard, reference.ancestryTraits, []);
    expect(derived.skillPointBudget).toBe(7);
    expect(derived.spellLimit).toBe(6);
  });

  it('applies ancestry attribute increases and expertise mechanically', () => {
    const hero = character();
    const attributeTrait = reference.ancestryTraits.find((trait) => trait.ancestry === 'Human' && trait.name === 'Attribute Increase')!;
    const expertiseTrait = reference.ancestryTraits.find((trait) => trait.ancestry === 'Human' && trait.name === 'Skill Expertise')!;
    hero.build = {
      ...defaultBuild(),
      selectedAncestryTraitIDs: [attributeTrait.id, expertiseTrait.id],
      ancestryTraitChoices: { [attributeTrait.id]: ['Agility'], [expertiseTrait.id]: ['Athletics'] },
    };
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, []);
    expect(derived.effectiveAttributes.Agility).toBe(2);
    expect(ancestryExpertise(hero, reference.ancestryTraits).skills.Athletics).toBe(1);
  });

  it('lets martial classes take Spellcaster Path Progression', () => {
    const hero = character();
    hero.level = 2;
    hero.build = { ...defaultBuild(), pathProgressionChoices: { '2': 'Spellcaster' } };
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, []);
    expect(derived.maxMana).toBe(3);
    expect(derived.spellLimit).toBe(1);
  });

  it('includes equipped armor in the correct defense', () => {
    const hero = character();
    const armor: EquipmentCatalogItem = {
      id: 'armor', name: 'Deflecting Light Armor', category: 'Armor', subtype: 'Light Armor',
      summary: '', mechanics: '', properties: [], slot: 'Armor', sourcePage: '',
    };
    hero.inventoryItems = [{ id: 'inventory', equipmentID: armor.id, quantity: 1, isEquipped: true, source: 'startingEquipment' }];
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, [armor]);
    expect(derived.physicalDefense).toBe(12);
  });

  it('preserves damage when derived maximum HP changes', () => {
    const hero = character();
    hero.healthPoints = 7;
    hero.maxHealthPoints = 11;
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, []);
    const updated = applyDerivedCharacter(hero, { ...derived, maxHP: 15 });
    expect(updated.healthPoints).toBe(11);
    expect(updated.maxHealthPoints).toBe(15);
  });
});
