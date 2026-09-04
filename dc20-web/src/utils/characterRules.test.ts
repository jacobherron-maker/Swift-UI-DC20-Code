import { describe, expect, it } from 'vitest';
import referenceDocument from '../../public/data/CharacterReference.json';
import type { Character, CharacterReferenceData, EquipmentCatalogItem } from '../types/models';
import {
  ancestryExpertise,
  applyDerivedCharacter,
  attributeCap,
  barbarianStaminaRegenAmount,
  classChoiceSelectionLimit,
  characterSheetEffects,
  classHealth,
  combatMastery,
  defaultBuild,
  deriveCharacter,
  grantedClassLanguageNames,
  grantedClassManeuverNames,
  grantedClassSpellNames,
  masteryCap,
  rogueCheapShotDamage,
  rogueStaminaRegenAmount,
  selectedAncestryTraits,
  skillMasteryCap,
  spellbladeDisciplineNames,
  spellIsAvailableToClass,
} from './characterRules';

const reference = referenceDocument as CharacterReferenceData;
const bard = reference.classes.find(({ name }) => name === 'Bard')!;
const barbarian = reference.classes.find(({ name }) => name === 'Barbarian')!;
const summoner = reference.classes.find(({ name }) => name === 'Summoner')!;
const spellblade = reference.classes.find(({ name }) => name === 'Spellblade')!;
const rogue = reference.classes.find(({ name }) => name === 'Rogue')!;

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
    expect(classHealth('Summoner', 5)).toBe(11);
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

  it('automatically applies the Small-Sized default trait to Halflings and Gnomes', () => {
    const halfling = character();
    halfling.ancestry = 'Halfling';
    const halflingDerived = deriveCharacter(halfling, barbarian, reference.ancestryTraits, []);
    expect(halflingDerived.size).toBe('Small');

    const gnome = character();
    gnome.ancestry = 'Gnome';
    const gnomeDerived = deriveCharacter(gnome, barbarian, reference.ancestryTraits, []);
    expect(gnomeDerived.size).toBe('Small');
  });

  it('applies Beastkind, not the negative Small-Sized trait, to Beastborn', () => {
    const beastborn = character();
    beastborn.ancestry = 'Beastborn';
    const selected = selectedAncestryTraits(beastborn, reference.ancestryTraits);
    expect(selected.map(({ name }) => name)).toContain('Beastkind');
    expect(selected.map(({ name }) => name)).not.toContain('Small-Sized');
    expect(deriveCharacter(beastborn, barbarian, reference.ancestryTraits, []).size).toBe('Medium');
  });

  it('gives Summoners school-based and Summoning-tag spell access without a source', () => {
    const spell = (school: string, tags = '', source = 'Arcane') => ({ school, tags, source });
    expect(spellIsAvailableToClass('Summoner', spell('Astromancy'))).toBe(true);
    expect(spellIsAvailableToClass('Summoner', spell('Conjuration'))).toBe(true);
    expect(spellIsAvailableToClass('Summoner', spell('Transmutation'))).toBe(true);
    expect(spellIsAvailableToClass('Summoner', spell('Elemental', 'Fire, Summoning', 'Primal'))).toBe(true);
    expect(spellIsAvailableToClass('Summoner', spell('Elemental', 'Fire', 'Primal'))).toBe(false);
  });

  it('routes Summoner progression and feature-granted Spells separately', () => {
    const hero = character('Summoner');
    hero.level = 5;
    hero.subclass = 'Chimera';
    hero.build = {
      ...defaultBuild(),
      selectedTalents: ['Horde Summoner'],
      classFeatureSelections: {
        'summoner.bondedSummon': ['Summon Beast'],
        'summoner.chimeraSummons': ['Summon Celestial', 'Summon Fiend'],
        'summoner.hordeSummons': ['Summon Ooze', 'Summon Plant'],
      },
    };
    const derived = deriveCharacter(hero, summoner, reference.ancestryTraits, []);
    expect(derived.maxHP).toBe(14);
    expect(derived.maxMana).toBe(12);
    expect(derived.spellLimit).toBe(6);
    expect(grantedClassSpellNames(hero)).toEqual([
      'Summon Beast', 'Summon Celestial', 'Summon Fiend', 'Summon Ooze', 'Summon Plant',
    ]);
  });

  it('grants the Dread Lord replacement Summon without consuming Spells Known', () => {
    const hero = character('Summoner');
    hero.level = 3;
    hero.subclass = 'Dread Lord';
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: {
        'summoner.bondedSummon': ['Summon Undead'],
        'summoner.dreadLordSummon': ['Summon Dragon'],
      },
    };
    expect(grantedClassSpellNames(hero)).toEqual(['Summon Undead', 'Summon Dragon']);
    expect(deriveCharacter(hero, summoner, reference.ancestryTraits, []).spellLimit).toBe(5);
  });

  it('lets martial classes take Spellcaster Path Progression', () => {
    const hero = character();
    hero.level = 2;
    hero.build = { ...defaultBuild(), pathProgressionChoices: { '2': 'Spellcaster' } };
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, []);
    expect(derived.maxMana).toBe(3);
    expect(derived.spellLimit).toBe(1);
  });

  it('routes Barbarian table progression, general Talents, and Paragon training', () => {
    const hero = character();
    hero.level = 3;
    hero.subclass = 'Paragon';
    hero.build = { ...defaultBuild(), selectedTalents: ['Skill Increase'] };
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, []);
    expect(derived.maxStamina).toBe(3);
    expect(derived.maneuverLimit).toBe(3);
    expect(derived.skillPointBudget).toBe(10);
    expect(derived.tradePointBudget).toBe(5);
  });

  it('routes Bestowed Protection as a granted maneuver outside the class-table limit', () => {
    const hero = character();
    hero.level = 3;
    hero.subclass = 'Spirit Guardian';
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: { 'barbarian.guardianManeuver': ['Parry'] },
    };
    expect(grantedClassManeuverNames(hero)).toEqual(['Parry']);
    expect(deriveCharacter(hero, barbarian, reference.ancestryTraits, []).maneuverLimit).toBe(3);
  });

  it('applies and removes live Rage effects without changing base statistics', () => {
    const hero = character();
    hero.build = {
      ...defaultBuild(),
      sheetFeatureStates: { 'barbarian.rage': true },
    };
    expect(characterSheetEffects(hero)).toEqual({
      physicalDefense: 5,
      speed: 6,
      saveAdvantage: { Might: 1 },
      martialMeleeDamageBonus: 1,
      resistances: ['Elemental (Half)', 'Physical (Half)'],
    });
    expect(hero.physicalDefense).toBe(10);
    expect(barbarianStaminaRegenAmount(3)).toBe(2);
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
    expect(derived.arcaneDefense).toBe(12);
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

describe('Spellblade Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => spellblade.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Spellblade class table', () => {
    expect(spellblade.tableRows.map((row) => ({
      level: row.level,
      health: row.health,
      attribute: row.attribute,
      skill: row.skill,
      trade: row.trade,
      stamina: row.stamina,
      maneuvers: row.maneuvers,
      mana: row.mana,
      spells: row.spells,
      features: row.features,
    }))).toEqual([
      { level: 1, health: 8, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, mana: 3, spells: 2, features: 'Class Features' },
      { level: 2, health: 1, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: undefined, mana: undefined, spells: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 2, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: 1, mana: 2, spells: undefined, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: undefined, mana: 1, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: 1, mana: 2, spells: undefined, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: undefined, mana: 1, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, mana: 2, spells: undefined, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete published Spellstrike and Expert Spellblade wording', () => {
    expect(feature(2, 'Spellstrike')).toBe('Once on each of your turns when you make a Martial Attack, you can also cast a Spell as part of the same Action, spending 1 AP less than normal.\n\nConverged Action: When you do, the Spell can only target 1 creature who must be a target of the Attack, and the range of the Attack can’t exceed the range of the Spell. If the Spell requires a Check, it uses your Attack Check instead. Any Saves the Spell forces the target to make are made against your Save DC.\n\nHarmonic Strike: The Martial Attack and Spell from a Spellstrike are treated as 1 Attack, and can benefit from Martial Enhancements and Spell Enhancements. The Spell doesn’t require Somatic Components.\n\nDC Tip: Because it’s treated as 1 Attack, the damage from the Martial Attack and Spell benefit from Critical Hits, Heavy Hits, and beyond only once.\n\nExample 1: A Spellblade makes a Weapon Attack using a Shortsword (1 Slashing damage) as part of the Attack Action. They choose to use Spellstrike, which lets them also cast a Spell as part of the same Action. They choose the Fire Bolt Spell (1 Fire damage). Normally the Spell costs 1 AP to cast, but now costs 0 AP (since Spellstrike reduces its cost by 1). On a Hit, the Spellstrike deals 2 total damage (1 Slashing and 1 Fire).\n\nExtended Example 1: The same Spellblade from Example 1 can add even more to their Spellstrike, by spending AP to add Martial Enhancements or to add the Fire Bolt Spell’s Spell Enhancement options that cost AP. You can also spend SP to use Smite.');
    expect(feature(5, 'Expert Spellblade')).toBe('You gain the following benefits for your Spellblade Class Features.\n\nBOUND WEAPON\nBound Damage: Your Bound Damage now ignores Resistance to its damage type.\n\nSPELLBLADE DISCIPLINE\nYou gain 1 Additional Spellblade Discipline.\n\nThe following Disciplines are changed in the following ways:\n• Acolyte: You can spend additional MP to increase the healing by 2 for each additional MP spent.\n• Hex Warrior: You can spend additional MP increase the damage by 1 for each additional MP spent.\n• Spell Warder: When you gain the Resistance granted by Spell Warder, you can spend 1 MP to gain Resistance (Half) to the damage type instead.\n\nSPELLSTRIKE\nThe Spell you cast as part of Spellstrike can target multiple creatures or an Area, provided at least one of the Spell targets is also a target of the Martial Attack.');
  });

  it('enforces the staged Discipline count and the Holy Warrior bonus', () => {
    const disciplineGroup = spellblade.choiceGroups.find(({ id }) => id === 'spellblade.disciplines')!;
    const levelOne = character('Spellblade');
    expect(classChoiceSelectionLimit(disciplineGroup, levelOne)).toBe(2);

    const expertPaladin = character('Spellblade');
    expertPaladin.level = 5;
    expertPaladin.subclass = 'Paladin';
    expertPaladin.build = { ...defaultBuild(), selectedTalents: ['Expanded Disciplines', 'Expanded Disciplines'] };
    expect(classChoiceSelectionLimit(disciplineGroup, expertPaladin)).toBe(6);
    expect(spellblade.choiceGroups.find(({ id }) => id === 'spellblade.paladinDiscipline')?.optionsFromGroup).toBe('spellblade.disciplines');
    expect(spellblade.choiceGroups.find(({ id }) => id === 'spellblade.oathTenets')?.minimumSelections).toBe(0);
  });

  it('routes Magus, Warrior, and Holy Warrior Disciplines into builder totals', () => {
    const hero = character('Spellblade');
    hero.level = 3;
    hero.subclass = 'Paladin';
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: {
        'spellblade.disciplines': ['Magus', 'Acolyte'],
        'spellblade.paladinDiscipline': ['Warrior'],
      },
    };
    const derived = deriveCharacter(hero, spellblade, reference.ancestryTraits, []);
    expect(spellbladeDisciplineNames(hero)).toEqual(['Magus', 'Acolyte', 'Warrior']);
    expect(derived.maxMana).toBe(6);
    expect(derived.spellLimit).toBe(3);
    expect(derived.maneuverLimit).toBe(3);
  });

  it('applies active Rune and resistance choices to the live sheet', () => {
    const hero = character('Spellblade');
    hero.build = {
      ...defaultBuild(),
      selectedTalents: ['Adaptive Bond'],
      classFeatureSelections: {
        'spellblade.disciplines': ['Spell Warder', 'Magus'],
        'spellblade.runes': ['Lightning Rune', 'Frost Rune'],
      },
      sheetFeatureStates: { 'spellblade.spellWarder.active': true },
      sheetFeatureSelections: {
        'spellblade.rune.active': 'Lightning Rune',
        'spellblade.boundDamage.current': 'Fire',
        'spellblade.spellWarder.damage': 'Cold',
      },
      sheetFeatureCounters: { 'spellblade.spellWarder.half': 1 },
    };
    expect(characterSheetEffects(hero)).toEqual({
      physicalDefense: 10,
      speed: 7,
      saveAdvantage: {},
      martialMeleeDamageBonus: 0,
      resistances: ['Fire (1)', 'Cold (Half)'],
    });
  });

  it('gives access to both chosen Schools and every Weapon or Ward Spell', () => {
    const spell = (school: string, tags = '') => ({ school, tags, source: 'Arcane' });
    expect(spellIsAvailableToClass('Spellblade', spell('Elemental'), undefined, '', ['Elemental', 'Enchantment'])).toBe(true);
    expect(spellIsAvailableToClass('Spellblade', spell('Conjuration', 'Weapon'), undefined, '', ['Elemental', 'Enchantment'])).toBe(true);
    expect(spellIsAvailableToClass('Spellblade', spell('Conjuration', 'Ward'), undefined, '', ['Elemental', 'Enchantment'])).toBe(true);
    expect(spellIsAvailableToClass('Spellblade', spell('Conjuration', 'Summoning'), undefined, '', ['Elemental', 'Enchantment'])).toBe(false);
  });

  it('level-gates every published Spellblade subclass feature', () => {
    expect(spellblade.subclassFeatures.Paladin.map(({ name, level }) => [name, level])).toEqual([
      ['Holy Warrior', 3],
      ['Oathsworn (Flavor Feature)', 3],
    ]);
    expect(spellblade.subclassFeatures['Rune Knight'].map(({ name, level }) => [name, level])).toEqual([
      ['Rune Weapon', 3],
      ['Rune Expert (Flavor Feature)', 3],
    ]);
    expect(spellblade.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });
});

describe('Barbarian Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => barbarian.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('preserves the complete Rage and Battlecry wording', () => {
    expect(feature(1, 'Rage')).toBe('You can spend 1 AP and 1 SP to enter a Rage for 1 minute. For the duration, you’re subjected to the following effects:\n• You deal +1 damage on Martial Attacks made using Unarmed Strikes or Melee Weapons.\n• You have ADV on Might Saves.\n• Your PD decreases by 5.\n• You gain Resistance (Half) to Elemental and Physical damage.\n\nEnding Early: Your Rage ends early if you fall Unconscious, die, or you choose to end it for free on your turn.\n\nDC Tip: The GM may allow you to Rage during stressful events, such as trying to lift a boulder to save an ally.');
    expect(feature(2, 'Battlecry')).toBe('You can spend 1 AP and 1 SP to release a shout of your choice listed below. Until the start of your next turn, you and creatures of your choice within 5 Spaces that can see or hear you are subjected to the effects of your shout. A creature can only benefit from the same type of shout once at a time.\n• Fortitude Shout: Each creature gains Resistance (1) against the next source of Physical or Elemental damage.\n• Fury Shout: Each creature deals +1 damage on their next Attack against 1 target.\n• Urgent Shout: Each creature gains +1 Speed until the start of your next turn.');
  });

  it('matches every Barbarian class-table row through the published level 10 table', () => {
    expect(barbarian.tableRows.map((row) => ({
      level: row.level,
      health: row.health,
      attribute: row.attribute,
      skill: row.skill,
      trade: row.trade,
      stamina: row.stamina,
      maneuvers: row.maneuvers,
      features: row.features,
    }))).toEqual([
      { level: 1, health: 8, attribute: undefined, skill: undefined, trade: undefined, stamina: 2, maneuvers: 2, features: 'Class Features' },
      { level: 2, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 2, attribute: 1, skill: 1, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Feature' },
      { level: 4, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, features: 'Class Expert Feature' },
      { level: 6, health: 2, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 2, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 2, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('level-gates the Paragon features published at levels 3, 7, and 10', () => {
    expect(barbarian.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });
});

describe('Summoner Magazine 23 source audit', () => {
  const feature = (level: number, name: string) => summoner.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('preserves the published Bonded Summons, Summon Exchange, and Expert Summoner rules', () => {
    expect(feature(1, 'Bonded Summons')).toBe('You learn 1 of the following Spells of your choice: Summon Aberration, Summon Beast, Summon Celestial, Summon Construct, Summon Dragon, Summon Elemental, Summon Fey, Summon Fiend, Summon Ooze, Summon Plant, or Summon Undead.\n\nWhen you cast one of the listed Spells, it gains the following benefits:\n\n• Creatures summoned by the Spell can use your AP when taking Actions.\n• While Sustaining 1 or more of these Spells, you can Sustain 1 of them for free.');
    expect(feature(2, 'Summon Exchange')).toBe('You can spend 1 AP to switch places with a creature within 10 Spaces that you’ve summoned (such as with the Call Familiar, Summon Celestial, or Summon Undead Spells).');
    expect(feature(5, 'Expert Summoner')).toBe('You gain the following benefits:\n\n• Summon Conduit: You can cast Spells as if you were standing in the Space of a creature you’ve summoned, provided it’s within 10 Spaces.\n• Summon Translocation: When you use Summon Exchange, you can instead switch the places of two creatures you have summoned provided they are both within range.\n• Extended Summoning: The duration of Spells listed in Bonded Summons now last until you complete a Long Rest.\n\nDC Tip: You can only Sustain 1 Spell at a time out of Combat, so if you have multiple Summon Spells active when Combat ends, all but one of them ends (you choose).');
  });

  it('matches every row of the published Summoner class table', () => {
    expect(summoner.tableRows.map((row) => ({
      level: row.level,
      health: row.health,
      attribute: row.attribute,
      skill: row.skill,
      trade: row.trade,
      mana: row.mana,
      spells: row.spells,
      features: row.features,
    }))).toEqual([
      { level: 1, health: 7, attribute: undefined, skill: undefined, trade: undefined, mana: 6, spells: 4, features: 'Class Features' },
      { level: 2, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 1, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Features' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression, 2 Ancestry Points' },
      { level: 5, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Expert Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, Path Progression, 2 Ancestry Points' },
      { level: 9, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('tags the published subclass features at level 3 and reuses the complete Bonded Summons catalog', () => {
    expect(summoner.subclassFeatures.Chimera.map(({ name, level }) => [name, level])).toEqual([
      ['Summon Chimera', 3],
      ['Chimeric Appearance (Flavor Feature)', 3],
    ]);
    expect(summoner.subclassFeatures['Dread Lord'].map(({ name, level }) => [name, level])).toEqual([
      ['Unending March', 3],
      ['Anguished Dead (Flavor Feature)', 3],
    ]);
    expect(summoner.choiceGroups.find(({ id }) => id === 'summoner.dreadLordSummon')?.optionsFromGroup).toBe('summoner.bondedSummon');
    expect(summoner.choiceGroups.find(({ id }) => id === 'summoner.hordeSummons')?.requiredTalent).toBe('Horde Summoner');
    expect(summoner.choiceGroups.find(({ id }) => id === 'summoner.creatureSpecialistSpell')?.requiredTalent).toBe('Creature Specialist');
  });

  it('includes every published Bonded Summons option, Paragon Talent, and starting-equipment instruction', () => {
    expect(summoner.choiceGroups.find(({ id }) => id === 'summoner.bondedSummon')?.options.map(({ name }) => name)).toEqual([
      'Summon Aberration', 'Summon Beast', 'Summon Celestial', 'Summon Construct', 'Summon Dragon',
      'Summon Elemental', 'Summon Fey', 'Summon Fiend', 'Summon Ooze', 'Summon Plant', 'Summon Undead',
    ]);
    expect(summoner.talents.slice(-4).map(({ name }) => name)).toEqual([
      'Creature Specialist', 'Horde Summoner', 'Grand Entrance', 'Reverse Summoning',
    ]);
    expect(summoner.startingEquipment.description).toBe('Arsenal: 2 Spell Focuses.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 2 of any of the following items:\nAlchemist’s Supplies, Calligrapher’s Supplies, Glassblower’s Tools, or Herbalist’s Supplies.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(feature(3, 'Subclass')).toBe('Choose one of the following options to become your Subclass and gain its Level 3 Features:\n• Chimera\n• Dread Lord\n• Paragon');
  });
});

describe('Rogue Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => rogue.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Rogue class table', () => {
    expect(rogue.tableRows.map((row) => ({
      level: row.level,
      health: row.health,
      attribute: row.attribute,
      skill: row.skill,
      trade: row.trade,
      stamina: row.stamina,
      maneuvers: row.maneuvers,
      features: row.features,
    }))).toEqual([
      { level: 1, health: 8, attribute: undefined, skill: undefined, trade: undefined, stamina: 2, maneuvers: 2, features: 'Class Features' },
      { level: 2, health: 1, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 2, attribute: 1, skill: 1, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete published Rogue feature wording', () => {
    expect(feature(1, 'Debilitating Strike')).toBe('When you make a Weapon Attack, you can spend 1 SP to force the target to make a Physical Save against your Save DC. Save Failure: The target suffers 1 of the following effects of your choice for 1 Round: Deafened, Exposed, Hindered, or Slowed 2. A target can’t be affected by the same option more than once at a time.');
    expect(feature(1, 'Roguish Finesse')).toBe('Cunning Action: You gain movement equal to half your Speed when you take the Disengage, Feint, or Hide Actions. You can use this movement immediately before or after you take the Action.\n\nSkill Expertise: Your Skill Mastery Limit increases by 1, up to Grandmaster (+10). A Skill can only benefit from one increase to its Mastery limit.\n\nMulti-Skilled: You gain 1 Skill Point.');
    expect(feature(1, 'Cypher Speech (Flavor Feature)')).toBe('You become Fluent in a Mortal Language of your choice. Additionally, you understand how to speak in code with a specific demographic of your choice (such as upper society, lower society, a faction, etc.). Your coded messages can be concealed in normal conversation and written communications. This allows you to leave simple messages such as “Safety”, “Threat”, or “Wealth”, or mark the location of a cache, a secret passageway, a safehouse, or an area of danger.\n\nDC Tip: This could be anything from the slang of the slums, to the fancy language of the upper classes. It could even be more specific as some kind of bizarre double speak between twin siblings or between the political elite. If the Player doesn’t know what to choose for this, they can always defer to a generic thieves guild option.');
    expect(feature(2, 'Cheap Shot')).toBe('You deal +1 damage on Martial Attacks against a creature that fulfills at least one of the following:\n• It’s Flanked or Prone.\n• It has any Condition other than Invisible.\n• You’re Hidden from it.');
    expect(feature(5, 'Expert Rogue')).toBe('You gain the following benefits for your Rogue Class Features.\n\nDebilitating Strike\n\nWhen you use Debilitating Strike, you can spend SP to choose an additional condition per SP spent.\n\nRoguish Finesse\n\nYou gain 1 Skill Point.\n\nCheap Shot\n\nCheap Shot now deals +2 damage instead.');
  });

  it('preserves Rogue training, starting equipment, and class Talents', () => {
    expect(rogue.pathDetails).toBe('Combat Training: Weapons, Light Armor, Light Shields\n\nManeuvers: The number of Maneuvers you know increases as shown in the Maneuvers Known column of the Rogue Class Table.\n\nStamina Points: Your maximum number of Stamina Points increases as shown in the Stamina Points column of the Rogue Class Table.\n\nStamina Regen: Once per Round, you can regain up to half your maximum SP when:\n• You Hit a Flanked or Prone target.\n• You Hit a target affected by at least 1 Condition.\n• You Hit a target you’re Hidden from.\n• You gain the benefits of your Cunning Action.');
    expect(rogue.startingEquipment.description).toBe('Arsenal: Choose 3 of any of the following items: Weapon or Light Shield.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 1 of any of the following items:\nCryptographer’s Tools, Disguise Kit, Herbalist’s Supplies, or Lockpicking Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(rogue.talents.slice(-2).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Unseen Ambusher', 3],
      ['Sinister Shot', 3],
    ]);
    expect(rogue.talents.at(-1)?.description).toBe('Requirements: Cheap Shot, Level 3\n\nYour Cheap Shot deals +1 damage for each additional Condition on the target. Multiple stacks of the same Condition count only once.');
  });

  it('level-gates every published Rogue subclass feature', () => {
    expect(rogue.subclassFeatures['Long Death'].map(({ name, level }) => [name, level])).toEqual([
      ['Thousand Cuts', 3],
      ['Hundred Ways to Die (Flavor Feature)', 3],
    ]);
    expect(rogue.subclassFeatures.Swashbuckler.map(({ name, level }) => [name, level])).toEqual([
      ['Renegade Duelist', 3],
      ['Tall Tales (Flavor Feature)', 3],
    ]);
    expect(rogue.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
    expect(rogue.subclassFeatures['Long Death'][0].description).toBe('When a creature fails its Save against your Debilitating Strike, it also begins Bleeding (even if it’s immune to the Condition). If a creature is affected by Bleeding from this Feature, the DC to end any Bleeding on it is equal to your Save DC and it can no longer be ended by regaining HP.\n\nDC Tip: These Rogues are able to apply magic or alchemical toxins to their blades that eat away at their targets over time, even things like Elementals or Undead that don’t have blood. The specific narrative reasoning is up to you.');
    expect(rogue.subclassFeatures.Swashbuckler[0].description).toBe('You’re skilled at making a mockery of your opponents while taking advantage of their openings. You gain the following benefits:\n• Flourishes: Your Cunning Action now also includes the Disarm and Dodge Actions.\n• Taunting Shot: Once per round, when you make an Attack against a creature that fulfills the criteria for Cheap Shot, you can forgo your Cheap Shot damage to force the target to make a Charisma Save instead. Save Failure: The target is Taunted by you until the end of your next turn.\n• Riposte: When a creature within your Melee Range misses you with an Attack, it provokes an Opportunity Attack from you.');
  });

  it('routes Roguish Finesse, Cypher Speech, and Expert Rogue into the builder', () => {
    const novice = character('Rogue');
    const humanSkillExpertise = reference.ancestryTraits.find((trait) => trait.ancestry === 'Human' && trait.name === 'Skill Expertise')!;
    novice.build = {
      ...defaultBuild(),
      selectedAncestryTraitIDs: [humanSkillExpertise.id],
      ancestryTraitChoices: { [humanSkillExpertise.id]: ['Stealth'] },
      classFeatureSelections: { 'rogue.language': ['Elvish'] },
    };
    expect(skillMasteryCap(novice)).toBe(2);
    expect(ancestryExpertise(novice, reference.ancestryTraits).skills.Stealth).toBeUndefined();
    expect(grantedClassLanguageNames(novice)).toEqual(['Elvish']);
    expect(deriveCharacter(novice, rogue, reference.ancestryTraits, []).skillPointBudget).toBe(6);

    const expert = character('Rogue');
    expert.level = 5;
    expect(skillMasteryCap(expert)).toBe(3);
    const derived = deriveCharacter(expert, rogue, reference.ancestryTraits, []);
    expect(derived.skillPointBudget).toBe(10);
    expect(derived.tradePointBudget).toBe(5);
    expect(derived.maxStamina).toBe(3);
    expect(derived.maneuverLimit).toBe(4);
  });

  it('calculates the live Rogue resource and Cheap Shot upgrades', () => {
    expect(rogueStaminaRegenAmount(3)).toBe(2);
    expect(rogueCheapShotDamage(2, 1)).toBe(1);
    expect(rogueCheapShotDamage(5, 1)).toBe(2);
    expect(rogueCheapShotDamage(5, 3, 1)).toBe(4);
    expect(rogueCheapShotDamage(5, 3, 2)).toBe(6);
  });
});
