import { describe, expect, it } from 'vitest';
import referenceDocument from '../../public/data/CharacterReference.json';
import equipmentDocument from '../../public/data/EquipmentCatalog.json';
import type { Character, CharacterReferenceData, EquipmentCatalogItem } from '../types/models';
import {
  accessibleAncestryNames,
  ancestryGrantedSpellNames,
  ancestryExpertise,
  ancestryMechanicalProfile,
  ancestryPointBudget,
  ancestryTraitPointTotals,
  ancestryTraitPrerequisiteMet,
  ancestryTraitRulesTags,
  ancestryTraitSelectionCount,
  ancestryTraitSource,
  applyMonkStaminaSpendRecovery,
  applySorcererWildMagic,
  applyDerivedCharacter,
  attributeCap,
  barbarianStaminaRegenAmount,
  bardHelpDieSize,
  canAddAncestryTraitCopy,
  championStaminaRegenAmount,
  championTacticalDieSize,
  commanderHelpDieSize,
  commanderInspiringPresenceHealing,
  commanderRallyAmount,
  commanderStaminaRegenAmount,
  classChoiceSelectionLimit,
  classPathProgressionLevels,
  classTableTotals,
  characterCombatTraining,
  characterRestPoints,
  characterSheetEffects,
  classHealth,
  combatMastery,
  completeCharacterRest,
  defaultBuild,
  deriveCharacter,
  DRUID_WILD_FORM_ACTIVE,
  DRUID_WILD_FORM_DAMAGE,
  DRUID_WILD_FORM_EXPANSION_ACTIVE,
  DRUID_WILD_FORM_EXTRA_MP,
  DRUID_WILD_FORM_FREE_USED,
  DRUID_WILD_FORM_HP,
  DRUID_WILD_FORM_SKILLS,
  DRUID_WILD_FORM_TRAITS,
  DRUID_WILD_FORM_TYPE,
  druidBeastTraitSelection,
  druidWildFormProfile,
  equippedCombatModifiers,
  grantedClassLanguageNames,
  grantedClassLanguageLevels,
  grantedClassManeuverNames,
  grantedClassSpellNames,
  HUNTER_CONCOCTION_ACTIVE,
  HUNTER_MARK_ACTIVE,
  HUNTER_MARK_FIRST_ATTACK_USED,
  HUNTER_TRAPS_AVAILABLE,
  hunterFavoredTerrainNames,
  hunterStaminaRegenAmount,
  masteryCap,
  MONK_ACTIVE_STANCE,
  MONK_COBRA_REVENGE,
  MONK_FLURRY_USED,
  MONK_KI_CURRENT,
  MONK_MEDITATION_PENDING,
  MONK_MEDITATION_SKILL,
  MONK_MONGOOSE_FLANKED,
  MONK_STANCE_ACTIVE,
  monkKiMaximum,
  monkKiRecoveryAmount,
  monkMeleeHeavyHitDamageBonus,
  monkStaminaRegenAmount,
  PSION_AP_ENHANCEMENT_SP,
  PSION_COMPONENTLESS_PENDING,
  PSION_DAZE_PENDING,
  PSION_DISRUPTION_PENDING,
  PSION_INVASION_ACTIVE,
  PSION_MIND_SENSE_ACTIVE,
  psionStaminaAfterMentalSaveFailure,
  rogueCheapShotDamage,
  rogueStaminaRegenAmount,
  resetCharacterTurn,
  selectedAncestryTraits,
  skillMasteryCap,
  spellbladeDisciplineNames,
  spellIsAvailableToClass,
  talentSlots,
  SORCERER_OVERLOAD_ACTIVE,
  SORCERER_OVERLOAD_EXHAUSTION,
  SORCERER_WILD_FORM_HP,
  SORCERER_WILD_NEXT_ADVANTAGE,
  SORCERER_WILD_OUTCOME,
  sorcererDraconicDamageType,
  sorcererWildMagicOutcome,
  sorcererWildMagicProfile,
  WIZARD_HEX_ACTIVE,
  WIZARD_HEX_PENDING,
  WIZARD_MANA_LIMIT_BREAK_READY,
  WIZARD_MANA_LIMIT_BREAK_USED,
  WIZARD_PREPARED_ACTIVE,
  WIZARD_SIGNATURE_ACTIVE,
  WIZARD_SIGNATURE_USED_PREFIX,
  WIZARD_SIGIL_ACTIVE,
  WIZARD_SIGIL_BOUND_SELF,
  WIZARD_SIGIL_DIAMETER,
  WIZARD_SIGIL_INSIDE,
  WIZARD_SIGIL_PORTAL,
  WIZARD_SIGIL_TAGS,
  wizardSchoolSpellGrantLimit,
  wizardSchoolSpellSelectionKey,
} from './characterRules';

const reference = referenceDocument as CharacterReferenceData;
const bard = reference.classes.find(({ name }) => name === 'Bard')!;
const barbarian = reference.classes.find(({ name }) => name === 'Barbarian')!;
const champion = reference.classes.find(({ name }) => name === 'Champion')!;
const commander = reference.classes.find(({ name }) => name === 'Commander')!;
const summoner = reference.classes.find(({ name }) => name === 'Summoner')!;
const spellblade = reference.classes.find(({ name }) => name === 'Spellblade')!;
const rogue = reference.classes.find(({ name }) => name === 'Rogue')!;
const warlock = reference.classes.find(({ name }) => name === 'Warlock')!;
const cleric = reference.classes.find(({ name }) => name === 'Cleric')!;
const druid = reference.classes.find(({ name }) => name === 'Druid')!;
const hunter = reference.classes.find(({ name }) => name === 'Hunter')!;
const monk = reference.classes.find(({ name }) => name === 'Monk')!;
const sorcerer = reference.classes.find(({ name }) => name === 'Sorcerer')!;
const wizard = reference.classes.find(({ name }) => name === 'Wizard')!;
const psion = reference.classes.find(({ name }) => name === 'Psion')!;
const equipmentCatalog = equipmentDocument as EquipmentCatalogItem[];

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
    expect(derived.spellLimit).toBe(4);
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

  it('contains every audited ancestry trait with unique IDs and usable metadata', () => {
    expect(reference.ancestryTraits).toHaveLength(195);
    expect(reference.ancestryTraits.reduce<Record<string, number>>((counts, { ancestry }) => ({ ...counts, [ancestry]: (counts[ancestry] ?? 0) + 1 }), {})).toEqual({
      Human: 8, Elf: 13, Dwarf: 13, Halfling: 13, Gnome: 13, Orc: 12,
      Dragonborn: 15, Giantborn: 14, Angelborn: 13, Fiendborn: 16, Beastborn: 52, Psyborn: 13,
    });
    expect(new Set(reference.ancestryTraits.map(({ id }) => id)).size).toBe(reference.ancestryTraits.length);
    for (const trait of reference.ancestryTraits) {
      expect(trait.id).toBe(`${trait.ancestry}|${trait.name}`);
      expect(trait.description.trim().length).toBeGreaterThan(5);
      expect(ancestryTraitRulesTags(trait).length).toBeGreaterThan(0);
      expect(ancestryTraitSource(trait).page).toBeGreaterThanOrEqual(5);
    }
    expect(reference.ancestryTraits.some(({ description }) => description.includes('Compatibility:'))).toBe(false);
    expect(ancestryTraitSource(reference.ancestryTraits.find(({ id }) => id === 'Beastborn|Sunlight Sensitivity')!).page).toBe(205);
    expect(ancestryTraitSource(reference.ancestryTraits.find(({ id }) => id === 'Beastborn|Natural Weapon')!).page).toBe(206);
  });

  it('uses the universal level 4 and 7 ancestry progression and Custom ancestry variant budget', () => {
    const hero = character();
    expect([1, 4, 7].map((level) => ancestryPointBudget({ ...hero, level }))).toEqual([5, 7, 9]);
    hero.ancestry = 'Custom';
    expect([1, 4, 7].map((level) => ancestryPointBudget({ ...hero, level }))).toEqual([4, 6, 8]);
  });

  it('prevents adding a Trait copy that exceeds the available ancestry-point budget', () => {
    const hero = character();
    const selectedNames = ['Attribute Increase', 'Skill Expertise', 'Human Resolve'];
    const selectedIDs = reference.ancestryTraits
      .filter(({ ancestry, name }) => ancestry === 'Human' && selectedNames.includes(name))
      .map(({ id }) => id);
    hero.build = { ...defaultBuild(), selectedAncestryTraitIDs: selectedIDs };
    const selected = selectedAncestryTraits(hero, reference.ancestryTraits);
    const additionalPositive = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Human' && name === 'Trade Expertise')!;
    const negative = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Human' && name === 'Attribute Decrease')!;
    expect(ancestryTraitPointTotals(hero, selected).spent).toBe(5);
    expect(canAddAncestryTraitCopy(hero, selected, additionalPositive)).toBe(false);
    expect(canAddAncestryTraitCopy(hero, selected, negative)).toBe(true);

    hero.build = { ...hero.build!, selectedAncestryTraitIDs: [...selectedIDs, negative.id] };
    const withNegative = selectedAncestryTraits(hero, reference.ancestryTraits);
    expect(canAddAncestryTraitCopy(hero, withNegative, additionalPositive)).toBe(true);
  });

  it('reserves a Sorcerer origin bonus for the matching ancestry Trait list', () => {
    const hero = character('Sorcerer');
    hero.level = 3;
    hero.subclass = 'Angelic';
    const selectedNames = ['Attribute Increase', 'Skill Expertise', 'Human Resolve'];
    hero.build = {
      ...defaultBuild(),
      selectedAncestryTraitIDs: reference.ancestryTraits
        .filter(({ ancestry, name }) => ancestry === 'Human' && selectedNames.includes(name))
        .map(({ id }) => id),
    };
    const selected = selectedAncestryTraits(hero, reference.ancestryTraits);
    const humanTrait = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Human' && name === 'Trade Expertise')!;
    const angelbornTrait = reference.ancestryTraits.find(({ ancestry, cost }) => ancestry === 'Angelborn' && cost > 0)!;
    expect(ancestryPointBudget(hero)).toBe(7);
    expect(canAddAncestryTraitCopy(hero, selected, humanTrait)).toBe(false);
    expect(canAddAncestryTraitCopy(hero, selected, angelbornTrait)).toBe(true);
  });

  it('automatically applies required ancestry origins without spending the Minor Trait slot', () => {
    const dragonborn = character();
    dragonborn.ancestry = 'Dragonborn';
    const dragonTraits = selectedAncestryTraits(dragonborn, reference.ancestryTraits);
    expect(dragonTraits.map(({ name }) => name)).toContain('Draconic Origin');
    expect(ancestryTraitPointTotals(dragonborn, dragonTraits).zeroPointTraits).toBe(0);

    const fiendborn = character();
    fiendborn.ancestry = 'Fiendborn';
    expect(selectedAncestryTraits(fiendborn, reference.ancestryTraits).map(({ name }) => name)).toContain('Fiendish Origin');
  });

  it('requires an origin before Custom ancestries take origin-dependent traits', () => {
    const custom = character();
    custom.ancestry = 'Custom';
    const draconicOrigin = reference.ancestryTraits.find(({ id }) => id === 'Dragonborn|Draconic Origin')!;
    const draconicResistance = reference.ancestryTraits.find(({ id }) => id === 'Dragonborn|Draconic Resistance')!;
    const fiendishOrigin = reference.ancestryTraits.find(({ id }) => id === 'Fiendborn|Fiendish Origin')!;
    const fiendishMagic = reference.ancestryTraits.find(({ id }) => id === 'Fiendborn|Fiendish Magic')!;
    expect(ancestryTraitPrerequisiteMet(custom, draconicResistance, [draconicResistance])).toBe(false);
    expect(ancestryTraitPrerequisiteMet(custom, draconicResistance, [draconicOrigin, draconicResistance])).toBe(true);
    expect(ancestryTraitPrerequisiteMet(custom, fiendishMagic, [fiendishMagic])).toBe(false);
    expect(ancestryTraitPrerequisiteMet(custom, fiendishMagic, [fiendishOrigin, fiendishMagic])).toBe(true);
  });

  it('counts repeatable ancestry traits and enforces quantified prerequisites', () => {
    const beastborn = character();
    beastborn.ancestry = 'Beastborn';
    const additional = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Beastborn' && name === 'Additional Limb')!;
    const capable = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Beastborn' && name === 'Capable Limb')!;
    beastborn.build = {
      ...defaultBuild(),
      selectedAncestryTraitIDs: [additional.id, capable.id],
      ancestryTraitCounts: { [additional.id]: 2, [capable.id]: 1 },
    };
    const selected = selectedAncestryTraits(beastborn, reference.ancestryTraits);
    expect(ancestryTraitSelectionCount(beastborn, additional)).toBe(2);
    expect(ancestryTraitPointTotals(beastborn, selected)).toMatchObject({ spent: 4, traitCopies: 4 });
    expect(ancestryTraitPrerequisiteMet(beastborn, capable, selected)).toBe(true);
  });

  it('separates Gnome Psychic Resistance from the Psyborn legacy MD defense bonus', () => {
    const gnome = character();
    gnome.ancestry = 'Gnome';
    const gnomeStrongMind = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Gnome' && name === 'Strong-Minded')!;
    gnome.build = { ...defaultBuild(), selectedAncestryTraitIDs: [gnomeStrongMind.id] };
    const baseAD = deriveCharacter(character(), barbarian, reference.ancestryTraits, []).arcaneDefense;
    expect(deriveCharacter(gnome, barbarian, reference.ancestryTraits, []).arcaneDefense).toBe(baseAD);
    expect(ancestryMechanicalProfile(gnome, reference.ancestryTraits).resistances).toContain('Psychic Resistance (1)');

    const psyborn = character();
    psyborn.ancestry = 'Psyborn';
    const psybornStrongMind = reference.ancestryTraits.find(({ ancestry, name }) => ancestry === 'Psyborn' && name === 'Strong Minded')!;
    psyborn.build = { ...defaultBuild(), selectedAncestryTraitIDs: [psybornStrongMind.id] };
    expect(deriveCharacter(psyborn, barbarian, reference.ancestryTraits, []).arcaneDefense).toBe(baseAD + 1);
  });

  it('routes size increases, Natural Armor, origins, and Death Door traits into live mechanics', () => {
    const hero = character();
    hero.ancestry = 'Custom';
    const names = ['Powerful Build', 'Natural Armor', 'Thick-Skinned', 'Human Resolve', 'Orcish Resolve'];
    const traits = names.map((name) => reference.ancestryTraits.find((trait) => trait.name === name)!);
    hero.build = { ...defaultBuild(), selectedAncestryTraitIDs: traits.map(({ id }) => id) };
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, []);
    expect(derived.size).toBe('Large');
    expect(derived.physicalDR).toBe(1);
    const mechanics = ancestryMechanicalProfile({ ...hero, speed: derived.speed }, reference.ancestryTraits);
    expect(mechanics.deathDoorThreshold).toBe(-5);
    expect(mechanics.deathDoorActionPoints).toBe(5);
  });

  it('routes choice-based and fixed ancestry spells into the character sheet', () => {
    const angelborn = character();
    angelborn.ancestry = 'Angelborn';
    const celestialMagic = reference.ancestryTraits.find(({ name }) => name === 'Celestial Magic')!;
    angelborn.build = {
      ...defaultBuild(),
      selectedAncestryTraitIDs: [celestialMagic.id],
      ancestryTraitChoices: { [celestialMagic.id]: ['Heal'] },
    };
    expect(ancestryGrantedSpellNames(angelborn, reference.ancestryTraits)).toEqual([
      { name: 'Heal', traitName: 'Celestial Magic', traitDescription: celestialMagic.description },
    ]);

    const psyborn = character();
    psyborn.ancestry = 'Psyborn';
    const psionicHand = reference.ancestryTraits.find(({ name }) => name === 'Psionic Hand')!;
    const psionicMagic = reference.ancestryTraits.find(({ name }) => name === 'Psionic Magic')!;
    psyborn.build = {
      ...defaultBuild(),
      selectedAncestryTraitIDs: [psionicHand.id, psionicMagic.id],
      ancestryTraitChoices: { [psionicMagic.id]: ['Gravity Well'] },
    };
    expect(ancestryGrantedSpellNames(psyborn, reference.ancestryTraits)).toEqual([
      { name: 'Mage Hand', traitName: 'Psionic Hand', traitDescription: psionicHand.description },
      { name: 'Gravity Well', traitName: 'Psionic Magic', traitDescription: psionicMagic.description },
    ]);
  });

  it('applies Quick, Short, and Long Rest recovery without granting free Long Rest healing', () => {
    const hero = character('Spellblade');
    hero.healthPoints = 5;
    hero.stamina = 0;
    hero.maxStamina = 4;
    hero.manaPoints = 1;
    hero.maxManaPoints = 6;
    hero.currentAP = 1;
    hero.build = {
      ...defaultBuild(),
      temporaryHP: 3,
      restPoints: 4,
      sheetConditionLevels: { Doomed: 2, Poisoned: 1 },
      sheetFeatureStates: { 'cleric.channel.used': true },
      sheetFeatureSelections: { 'spellblade.rune.active': 'Flame Rune' },
      sheetFeatureCounters: { 'cleric.omen.count': 2 },
    };

    const quick = completeCharacterRest(hero, 'Quick', 3);
    expect([quick.healthPoints, quick.stamina, quick.manaPoints, characterRestPoints(quick)]).toEqual([8, 0, 1, 1]);

    const short = completeCharacterRest(hero, 'Short', 2);
    expect([short.healthPoints, short.stamina, short.manaPoints, characterRestPoints(short), short.build?.shortRestsTaken]).toEqual([7, 4, 1, 4, 1]);
    const secondShort = completeCharacterRest(short, 'Short', 0);
    expect(secondShort.build?.shortRestsTaken).toBe(2);
    expect(completeCharacterRest(secondShort, 'Short', 1)).toBe(secondShort);

    const long = completeCharacterRest(hero, 'Long', 1);
    expect(long.healthPoints).toBe(6);
    expect([long.stamina, long.manaPoints, long.currentAP]).toEqual([4, 6, 4]);
    expect(characterRestPoints(long)).toBe(11);
    expect(long.build?.temporaryHP).toBe(0);
    expect(long.build?.shortRestsTaken).toBe(0);
    expect(long.build?.sheetConditionLevels).toEqual({ Poisoned: 1 });
    expect(long.build?.sheetFeatureStates['cleric.channel.used']).toBe(false);
    expect(long.build?.sheetFeatureCounters).toEqual({});
  });

  it('resets AP and only turn-limited character-sheet state on Reset Turn', () => {
    const hero = character('Commander');
    hero.currentAP = 0;
    hero.build = {
      ...defaultBuild(),
      sheetFeatureStates: {
        'commander.call.attack.used': true,
        'commander.staminaRegen.used': true,
        'barbarian.rage.active': true,
      },
      sheetFeatureCounters: { 'commander.help.usesThisTurn': 3, 'commander.help.result': 8 },
    };
    const reset = resetCharacterTurn(hero);
    expect(reset.currentAP).toBe(4);
    expect(reset.build?.sheetFeatureStates['commander.call.attack.used']).toBe(false);
    expect(reset.build?.sheetFeatureStates['commander.staminaRegen.used']).toBe(true);
    expect(reset.build?.sheetFeatureStates['barbarian.rage.active']).toBe(true);
    expect(reset.build?.sheetFeatureCounters['commander.help.usesThisTurn']).toBe(0);
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
      areaDefense: 14,
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

describe('character-sheet combat training and equipment modifiers', () => {
  it('collects class-feature and talent training for the Features tab', () => {
    const clericHero = character('Cleric');
    clericHero.build = { ...defaultBuild(), selectedTalents: ['Martial Expansion'], classFeatureSelections: { 'cleric.domains': ['War', 'Peace'] } };
    expect(characterCombatTraining(clericHero, cleric, reference.ancestryTraits).categories).toEqual([
      'Weapons', 'Spell Focuses', 'Light Armor', 'Heavy Armor', 'Light Shields', 'Heavy Shields',
    ]);
  });

  it('separates trained Spell Check and Spell Attack focus bonuses', () => {
    const hero = character('Wizard');
    const orb = equipmentCatalog.find(({ name }) => name === 'Orb')!;
    const crystal = equipmentCatalog.find(({ name }) => name === 'Crystal')!;
    hero.inventoryItems = [orb, crystal].map((item, index) => ({ id: `focus-${index}`, equipmentID: item.id, quantity: 1, isEquipped: true, source: 'added' }));
    expect(equippedCombatModifiers(hero, equipmentCatalog, wizard)).toMatchObject({
      spellCheckBonus: 1,
      spellAttackBonus: 1,
      spellAttackDamageBonus: 0,
      attackAndSpellDisadvantage: 0,
    });
  });

  it('reports untrained armor and heavy-gear Agility penalties as DisADV', () => {
    const hero = character('Wizard');
    const heavyArmor = equipmentCatalog.find(({ name }) => name === 'Defensive Heavy Armor')!;
    hero.inventoryItems = [{ id: 'heavy', equipmentID: heavyArmor.id, quantity: 1, isEquipped: true, source: 'added' }];
    expect(equippedCombatModifiers(hero, equipmentCatalog, wizard)).toMatchObject({
      attackAndSpellDisadvantage: -1,
      agilityCheckDisadvantage: -1,
      physicalDamageReduction: true,
      unarmedHeavyHitDamageBonus: 1,
    });
  });

  it('routes every trained Spell Focus statistic and damage reduction', () => {
    const hero = character('Wizard');
    const grimoire = equipmentCatalog.find(({ name }) => name === 'Grimoire / Tarot Deck')!;
    hero.inventoryItems = [{ id: 'grimoire', equipmentID: grimoire.id, quantity: 1, isEquipped: true, source: 'added' }];
    expect(equippedCombatModifiers(hero, equipmentCatalog, wizard)).toMatchObject({
      spellCheckBonus: 1,
      spellAttackBonus: 1,
      spellAttackDamageBonus: 0,
      focusProperties: ['Channeling', 'Vicious'],
    });

    const censer = equipmentCatalog.find(({ name }) => name === 'Censer')!;
    hero.inventoryItems = [{ id: 'censer', equipmentID: censer.id, quantity: 1, isEquipped: true, source: 'added' }];
    const derived = deriveCharacter(hero, wizard, reference.ancestryTraits, equipmentCatalog);
    expect(equippedCombatModifiers(hero, equipmentCatalog, wizard)).toMatchObject({
      mysticalDamageReduction: true,
      focusProperties: ['Protective', 'Warded'],
    });
    expect(derived.arcaneDefense).toBe(13);
    expect(derived.mysticalDR).toBe(1);
  });

  it('applies one chosen Shield bonus while retaining every heavy Shield drawback', () => {
    const hero = character('Barbarian');
    const kite = equipmentCatalog.find(({ name }) => name === 'Kite Shield')!;
    const tower = equipmentCatalog.find(({ name }) => name === 'Tower Shield')!;
    hero.inventoryItems = [kite, tower].map((item, index) => ({ id: `shield-${index}`, equipmentID: item.id, quantity: 1, isEquipped: true, source: 'added' }));
    hero.build = { ...defaultBuild(), sheetFeatureSelections: { 'equipment.activeShield': 'shield-0' } };
    const base = deriveCharacter({ ...hero, inventoryItems: [] }, barbarian, reference.ancestryTraits, equipmentCatalog);
    const derived = deriveCharacter(hero, barbarian, reference.ancestryTraits, equipmentCatalog);
    expect(derived.physicalDefense - base.physicalDefense).toBe(1);
    expect(derived.arcaneDefense - base.arcaneDefense).toBe(2);
    expect(derived.speed - base.speed).toBe(-2);
    expect(equippedCombatModifiers(hero, equipmentCatalog, barbarian)).toMatchObject({
      agilityCheckDisadvantage: -2,
      immuneToFlanking: true,
      mountedShieldDefense: { physicalDefense: 1, areaDefense: 2 },
    });
  });
});

describe('Bard Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => bard.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Bard class table', () => {
    expect(bard.tableRows.map((row) => ({
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
      { level: 3, health: 1, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete Font, Repertoire, Performance, and Expert wording', () => {
    expect(feature(1, 'Font of Inspiration')).toBe('You are an ever present source of aid for your allies. You gain the following benefits:\n• Ranged Help Attack: The range of your Help Action when aiding an Attack increases to 10 Spaces.\n• Help Reaction: When a creature you can see makes a Check, you can take the Help Action as a Reaction to aid them with their Check, provided you’re within range to do so.\n\nDC Tip: Helping with a Skill or Trade Check doesn’t have a default range limitation. The GM determines the range of the type of help required.');
    expect(feature(1, 'Remarkable Repertoire')).toBe('You’ve picked up a few tricks along your travels, granting you the following benefits:\n\nJack of All Trades: You gain 2 Skill Points.\n\nMagical Secrets: You learn any 2 Spells of your choice from any Spell List.\n\nMagical Expression: You learn to express your art in a unique manner, granting you the ability to alter how you cast Spells. Choose the manner of your expression: Visual or Auditory.\n• Visual: Through acrobatics, dancing, juggling, painting, drawing, or miming, you can ignore the Verbal Components of a Spell you cast, but you must provide a Somatic Component instead.\n• Auditory: Through singing, playing music, poetry, comedy, or storytelling, you can ignore the Somatic Components of a Spell you cast, but you must provide a Verbal Component instead.');
    expect(feature(2, 'Bardic Performance')).toBe('You can spend 1 AP and 1 MP to start a performance that grants you a 10 Space Aura for 1 minute. Choose 1 of the performances below. While creatures of your choice are within your Aura (and can see or hear you) they benefit from your performance. A creature can only benefit from one instance of each performance at a time.\n• Battle Ballad: The chosen creatures gain a d4 bonus to the first Attack Check they make on each of their turns.\n• Fast Tempo: The chosen creatures gain +1 Speed.\n• Inspiring: The chosen creatures gain 1 Temp HP at the start of each of their turns.\n• Emotional: Choose 1 of the following Conditions: Charmed, Frightened, Intimidated, or Taunted. The chosen creatures have Resistance against the chosen Condition. If a target is effected by the chosen Condition at the start of its turn, it can immediately attempt to end the Condition on itself by Repeating its Save.\n\nChanging Performances: Once on each of your turns, you can spend 1 AP to change your performance to a different one.\n\nEnding Early: The performance ends early if you become Incapacitated, you die, or choose to end it for free.');
    expect(feature(5, 'Expert Bard')).toBe('You gain the following benefits for your Bard Class Features.\n\nFont of Inspiration\nYour Help Die now starts at a d10.\n\nRemarkable Repertoire\nYou gain 2 Skill Points and learn any 2 Spells of your choice from any Spell List.\n\nBardic Performance\nChanging Performances: You can change your performance at the start of each of your turns for free.\n\nWhen you start your Bardic Performance you can spend an additional 2 MP to improve the performances in the following ways:\n• Battle Ballad: The size of the die increases to a d8.\n• Fast Tempo: The Speed increases by 2.\n• Inspiring: The Temp HP increases by 1.\n• Emotional: The chosen creatures have Resistance against all of the listed Conditions.');
  });

  it('preserves spell access, starting equipment, Talents, and subclass level metadata', () => {
    expect(bard.pathDetails).toBe('Combat Training: Spell Focuses, Light Armor, Light Shields\n\nSpell List: When you learn a new Spell, you can choose any Spell from the Enchantment Spell School or with the following Spell Tags: Embolden, Enfeeble, Healing, Illusion, or Sound.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Bard Class Table.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Bard Class Table.');
    expect(bard.startingEquipment.description).toBe('Arsenal: Choose 3 of any of the following items: Spell Focus, Weapon, or Light Shield.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 1 of any of the following items:\nCalligrapher’s Supplies, Disguise Kit, Gaming Kit, Musical Instrument, or Sculptor’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(bard.talents.slice(-2).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Expanded Repertoire', 3],
      ['Helping Hands', 3],
    ]);
    expect(bard.subclassFeatures.Eloquence.map(({ name, level }) => [name, level])).toEqual([
      ['Beguiling Presence', 3],
      ['Eloquent Orator (Flavor Feature)', 3],
    ]);
    expect(bard.subclassFeatures.Jester.map(({ name, level }) => [name, level])).toEqual([
      ['Antagonizing Act', 3],
      ['Comedian (Flavor Feature)', 3],
    ]);
    expect(bard.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });

  it('keeps table Spells separate from every Repertoire grant and routes Skill Points', () => {
    const expressionGroup = bard.choiceGroups.find(({ id }) => id === 'bard.expression')!;
    const hero = character('Bard');
    hero.level = 5;
    hero.subclass = 'Eloquence';
    hero.build = {
      ...defaultBuild(),
      selectedTalents: ['Expanded Repertoire'],
      classFeatureSelections: {
        'bard.expression': ['Visual', 'Auditory'],
        'bard.magicalSecrets': ['Fireball', 'Heal'],
        'bard.expertSecrets': ['Blink', 'Bane'],
        'bard.expandedRepertoireSpells': ['Create Water', 'Entangle'],
        'bard.enthrallSpell': ['Charm'],
      },
    };
    const derived = deriveCharacter(hero, bard, reference.ancestryTraits, []);
    expect(derived.maxMana).toBe(12);
    expect(derived.skillPointBudget).toBe(14);
    expect(derived.spellLimit).toBe(6);
    expect(classChoiceSelectionLimit(expressionGroup, hero)).toBe(2);
    expect(grantedClassSpellNames(hero)).toEqual(['Fireball', 'Heal', 'Blink', 'Bane', 'Create Water', 'Entangle', 'Charm']);
    expect(bardHelpDieSize(hero.level)).toBe(10);
  });

  it('limits ordinary Bard access to Enchantment and the five published tags', () => {
    const spell = (school: string, tags = '') => ({ school, tags, source: 'Arcane' });
    expect(spellIsAvailableToClass('Bard', spell('Enchantment'))).toBe(true);
    expect(spellIsAvailableToClass('Bard', spell('Elemental', 'Healing'))).toBe(true);
    expect(spellIsAvailableToClass('Bard', spell('Elemental', 'Sound'))).toBe(true);
    expect(spellIsAvailableToClass('Bard', spell('Elemental', 'Fire'))).toBe(false);
  });

  it('applies an enhanced Bardic Performance to the Bard when chosen', () => {
    const hero = character('Bard');
    hero.level = 5;
    hero.build = {
      ...defaultBuild(),
      sheetFeatureStates: {
        'bard.performance.active': true,
        'bard.performance.selfIncluded': true,
        'bard.performance.enhanced': true,
      },
      sheetFeatureSelections: { 'bard.performance.activeChoice': 'Emotional', 'bard.performance.condition': 'Charmed' },
    };
    expect(characterSheetEffects(hero)).toEqual({
      physicalDefense: 10,
      areaDefense: 14,
      speed: 6,
      saveAdvantage: {},
      martialMeleeDamageBonus: 0,
      resistances: ['Charmed Condition', 'Frightened Condition', 'Intimidated Condition', 'Taunted Condition'],
    });
  });
});

describe('Champion Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => champion.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Champion class table', () => {
    expect(champion.tableRows.map((row) => ({
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
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, features: 'Class Feature' },
      { level: 6, health: 2, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 2, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 2, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete Master-at-Arms, Fighting Spirit, Adaptive Tactics, and Expert wording', () => {
    expect(feature(1, 'Master-at-Arms')).toBe('Your training in warfare has granted you the following benefits:\n• Weapon Master: At the start of each of your turns, you can freely swap any Weapon you’re currently wielding in each hand for any other Weapon without provoking Opportunity Attacks.\n• Maneuver Master: You learn 1 Maneuver of your choice. Once per Round when you perform a Maneuver, you can reduce its SP cost by 1.');
    expect(feature(1, 'Fighting Spirit')).toBe('You stand ready for Combat at any moment, granting you the following benefits:\n• Combat Readiness: At the start of your first turn in Combat, you gain one of the following benefits:\n  • Fortify: You gain the benefits of the Dodge Action and ADV on the next Save you make until the end of Combat.\n  • Advance: You gain the benefits of the Move Action and ADV on the next Martial Attack or Physical Check you make until the end of Combat.\n• Second Wind: Once per Combat when you start your turn Bloodied, you can regain 2 HP and 2 SP.');
    expect(feature(1, 'Know Your Enemy (Flavor Feature)')).toBe('You can spend 1 minute observing or interacting with a creature out of Combat (or spend 1 AP in Combat) to learn information about its physical capabilities compared to your own. Choose one of the following stats of the creature to assess: Might, Agility, PD, AD, and HP. Make a DC 10 Knowledge or Insight Check (your choice).\n\nSuccess: You learn if the chosen stat is higher, lower, or the same as yours.\n\nDC Tip:** If a creature is better than most at disguising or concealing their “true power” then the GM can increase the DC for this Feature to be used against it. The GM won’t tell you if the DC is higher, and if you roll higher than a 10 and still fail… they can lie about what information you gather.');
    expect(feature(2, 'Adaptive Tactics')).toBe('When you roll for Initiative, and at the end of each of your turns, you gain a d8 Tactical Die if you don’t already have one. You can spend a Tactical Die to gain one of the following Tactics:\n• Assault: When you make a Martial Attack, you can add the die to the Attack’s result.\n• Deflect: When you are Attacked, you can subtract the die from the Attack’s result.');
    expect(feature(5, 'Expert Champion')).toBe('You gain the following benefits for your Champion Class Features.\n\nMaster-at-Arms\nYou learn 2 additional Maneuvers of your choice.\n\nFighting Spirit\nWhen you gain the benefits of Second Wind, you regain an additional 2 HP and 2 SP.\n\nAdaptive Tactics\nYour Tactical Die is now a d10.');
  });

  it('preserves the Champion path, equipment, Talents, and subclass level metadata', () => {
    expect(champion.pathDetails).toBe('Combat Training: Weapons, All Armor, All Shields\n\nManeuvers: The number of Maneuvers you know increases as shown in the Maneuvers Known column of the Champion Class Table.\n\nStamina Points: Your maximum number of Stamina Points increases as shown in the Stamina Points column of the Champion Class Table.\n\nStamina Regen: Once per Round, you can regain up to half your maximum SP when you perform a Maneuver.');
    expect(champion.startingEquipment.description).toBe('Arsenal: Choose 3 of any of the following items: Weapon or Shield.\nArmor: 1 set of Armor.\nTrade Tools: Choose 1 of any of the following items:\nCarpenter’s Tools, Cartographer’s Tools, Gaming Kit, or Mason’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(champion.talents.slice(-2).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ["Champion's Resolve", 3],
      ['Disciplined Combatant', 3],
    ]);
    expect(champion.talents.find(({ name }) => name === "Champion's Resolve")?.description).toBe('Requirement: Adaptive Tactics, Level 3\n\nWhen you use a Tactical Die, you gain the following benefit:\n• Assault: The Attack deals +1 damage.\n• Deflect: If the Attack Misses, the Attacker takes 1 damage of a Physical damage type of your choice.');
    expect(champion.talents.find(({ name }) => name === 'Disciplined Combatant')?.description).toBe('Requirement: Fighting Spirit, Level 3\n\nOnce on each of your turns, you can spend 2 SP to gain the benefit of Combat Readiness. Additionally, you can use Second Wind without being Bloodied.');
    expect(champion.subclassFeatures.Hero.map(({ name, level }) => [name, level])).toEqual([
      ['Hero’s Resolve', 3],
      ['Adventuring Hero (Flavor Feature)', 3],
    ]);
    expect(champion.subclassFeatures.Sentinel.map(({ name, level }) => [name, level])).toEqual([
      ['Stalwart Protector', 3],
      ['Vigilant Watcher (Flavor Feature)', 3],
    ]);
    expect(champion.subclassFeatures.Hero[0].description).toBe('Your warrior spirit refuses to yield in battle. You gain the following benefits:\n\nAdrenaline Boost: When you use your Second Wind, you gain a +5 bonus to Martial Attacks and Martial Checks you make until the end of your turn.\n\nCut Through: Your Martial Attacks that score Heavy Hits ignore the target’s Physical Resistances.\n\nUnyielding Spirit: While Bloodied, you gain 1 Temp HP at the start of each of your turns.');
    expect(champion.subclassFeatures.Sentinel[0].description).toBe('You gain the following benefits:\n\nSteadfast Defender: You can use your Deflect Tactic against any Attack that targets a creature within your Melee Range.\n\nDefensive Bash: When you use a Defensive Maneuver as a Reaction to an Attack from a creature within 1 Space of you, the attacker must make a Physical Save against your Attack Check. Save Failure: The target is pushed 1 Space away or Taunted by you until the end of its next turn (your choice).\n\nNot on my Watch: Creatures Taunted by you deal 1 less damage to targets within 1 Space of you.');
    expect(champion.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });

  it('keeps Master-at-Arms Maneuvers separate from table and path allowances', () => {
    const hero = character('Champion');
    hero.level = 5;
    hero.subclass = 'Hero';
    hero.build = {
      ...defaultBuild(),
      pathProgressionChoices: { '2': 'Martial', '4': 'Spellcaster' },
      classFeatureSelections: {
        'champion.masterAtArmsManeuver': ['Parry'],
        'champion.expertManeuvers': ['Savage Strike', 'Sunder Strike'],
      },
    };
    const derived = deriveCharacter(hero, champion, reference.ancestryTraits, []);
    expect(derived.maneuverLimit).toBe(5);
    expect(derived.maxStamina).toBe(4);
    expect(derived.maxMana).toBe(3);
    expect(grantedClassManeuverNames(hero)).toEqual(['Parry', 'Savage Strike', 'Sunder Strike']);
  });

  it('uses the published Tactical Die and half-SP recovery progressions', () => {
    expect([1, 2, 4, 5, 10].map(championTacticalDieSize)).toEqual([8, 8, 8, 10, 10]);
    expect([0, 1, 2, 3, 7].map(championStaminaRegenAmount)).toEqual([0, 1, 1, 2, 4]);
    expect(classHealth('Champion', 5)).toBe(16);
  });
});

describe('Commander Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => commander.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Commander class table', () => {
    expect(commander.tableRows.map((row) => ({
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
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, features: 'Class Feature' },
      { level: 6, health: 2, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 2, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 2, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete Inspiring Presence, Commander’s Call, Aura, and Expert wording', () => {
    expect(feature(1, 'Inspiring Presence')).toBe('Once per Round during Combat, when you spend SP you can restore 1 HP to a creature of your choice within 10 Spaces (including yourself) that can see or hear you. If the creature is on Death’s Door, they regain 1 additional HP.');
    expect(feature(1, 'Commander’s Call')).toBe('You can spend 1 AP and 1 SP to command a willing creature that you can see within 5 Spaces that can also see or hear you. The chosen creature can immediately take 1 of the following Actions of your choice as a Reaction for free. You can only use each of the following commands once on each of your turns.\n• Attack: The creature makes an Attack with ADV. They can’t spend any resources on this Attack, such as AP, SP, or MP.\n• Dodge: The creature takes the Full Dodge Action.\n• Move: The creature moves up to their Speed without provoking Opportunity Attacks.');
    expect(feature(1, 'Natural Leader (Flavor Feature)')).toBe('You have ADV on Checks made to convince creatures that you are an authority figure. Additionally, you have ADV on the first Charisma Check made to interact with non-hostile members of military groups (such as soldiers, guards, etc.).');
    expect(feature(2, 'Commanding Aura')).toBe('You’re surrounded by a 5 Space Aura. You can target any creature within your Aura to grant one of the following effects below, provided the target can see or hear you.\n• Bolster: (1 AP) You take the Help Action to aid the target with an Attack. You can also do so as a Reaction whenever a valid target makes an Attack.\n• Rally: (1 AP) You grant creatures of your choice (including yourself) 1 Temp HP.\n• Reinforce: (1 AP) When a creature in your Aura is targeted by an Attack, you can impose DisADV on the Attack as a Reaction.');
    expect(feature(5, 'Expert Commander')).toBe('You gain the following benefits for your Commander Class Features.\n\nCommander’s Call\nThe range of your Commander’s Call increases to 10 Spaces.\n\nWhen you use Commander’s Call, you can spend 2 additional SP to issue the creature 1 additional command of your choice. The creature chooses the order in which it resolves the granted commands.\n\nExample: You use Commander’s Call on an ally and spend 2 additional SP, 3 SP total. You choose the Move and Attack Commands. The creature chooses to up to their Speed without provoking Opportunity Attacks first and then Attacks with ADV after moving.\n\nDC Tip: You can still only use each command once on each of your turns.\n\nInspiring Presence\nThe amount of HP restored by Inspiring Presence is increased by 1.\n\nCommanding Aura\nWhen you help a creature within your Commanding Aura, your Help Die starts at a d10.\n\nWhen you use Commanding Aura, you can spend additional SP to enhance its effect:\n• Rally: The Temp HP granted increases by 1 per 2 SP spent.\n• Reinforce: You can spend 1 SP to grant the target ADV on any Saves made as part of the Attack.');
  });

  it('preserves the Commander path, equipment, Talents, and subclass metadata', () => {
    expect(commander.pathDetails).toBe('Combat Training: Weapons, All Armor, All Shields\n\nManeuvers: The number of Maneuvers you know increases as shown in the Maneuvers Known column of the Commander Class Table.\n\nStamina Points: Your maximum number of Stamina Points increases as shown in the Stamina Points column of the Commander Class Table.\n\nStamina Regen: Once per Round, you can regain up to half your maximum SP when you grant a creature a Help Die.');
    expect(commander.startingEquipment.description).toBe('Arsenal: Choose 3 of any of the following items: Weapon or Shield.\nArmor: 1 set of Armor.\nTrade Tools: Choose 1 of any of the following items:\nCartographer’s Tools, Calligrapher’s, Cryptographer’s Tools, or Gaming Set.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(commander.talents.slice(-2).map(({ name, description }) => [name, description])).toEqual([
      ['Seize Momentum', 'Requirements: Commander’s Call, Commanding Aura, Level 3\n\nWhen an ally within your Commanding Aura scores a Heavy Hit, you can use your Commander’s Call as a Reaction.'],
      ['Coordinated Command', 'Requirement: Commander’s Call, Level 3\n\nOnce per Round, when you use your Commander’s Call, you can spend 1 additional SP to target a second creature within range (including yourself), they also gain the benefits of the chosen command. You choose who acts first between the targeted creatures.'],
    ]);
    expect(commander.subclassFeatures.Crusader.map(({ name, level }) => [name, level])).toEqual([
      ['Virtuous Vanguard', 3],
      ['Gallant Hero (Flavor Feature)', 3],
    ]);
    expect(commander.subclassFeatures.Warlord.map(({ name, level }) => [name, level])).toEqual([
      ['Offensive Tactics', 3],
      ['Battlefield Tactician (Flavor Feature)', 3],
    ]);
    expect(commander.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });

  it('routes the table and mixed Path progression without hidden class bonuses', () => {
    const hero = character('Commander');
    hero.level = 5;
    hero.subclass = 'Crusader';
    hero.build = { ...defaultBuild(), pathProgressionChoices: { '2': 'Martial', '4': 'Spellcaster' } };
    const derived = deriveCharacter(hero, commander, reference.ancestryTraits, []);
    expect(derived.maneuverLimit).toBe(5);
    expect(derived.maxStamina).toBe(4);
    expect(derived.maxMana).toBe(3);
    expect(classHealth('Commander', 5)).toBe(16);
    expect(characterSheetEffects(hero).resistances).toEqual(['Frightened Condition', 'Intimidated Condition']);
  });

  it('calculates every published scaling Commander effect', () => {
    expect([0, 1, 2, 3, 4].map((uses) => commanderHelpDieSize(5, uses))).toEqual([10, 8, 6, 4, 4]);
    expect([0, 1, 2, 3, 7].map(commanderStaminaRegenAmount)).toEqual([0, 1, 1, 2, 4]);
    expect(commanderInspiringPresenceHealing(4, false)).toBe(1);
    expect(commanderInspiringPresenceHealing(5, false)).toBe(2);
    expect(commanderInspiringPresenceHealing(5, true)).toBe(3);
    expect([0, 2, 4].map((spent) => commanderRallyAmount(5, spent))).toEqual([1, 2, 3]);
    expect(commanderRallyAmount(4, 4)).toBe(1);
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
      areaDefense: 14,
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

describe('Warlock Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => warlock.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Warlock class table', () => {
    expect(warlock.tableRows.map((row) => ({
      level: row.level,
      health: row.health,
      attribute: row.attribute,
      skill: row.skill,
      trade: row.trade,
      mana: row.mana,
      spells: row.spells,
      features: row.features,
    }))).toEqual([
      { level: 1, health: 8, attribute: undefined, skill: undefined, trade: undefined, mana: 6, spells: 4, features: 'Class Features' },
      { level: 2, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 2, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete published Warlock Contract, Life Tap, and Expert Warlock wording', () => {
    expect(feature(1, 'Warlock Contract')).toBe('You have a binding agreement with your patron that allows you to make sacrifices in exchange for boons.\n\nHasty Bargain: Once per turn when you make a Check, you can spend 1 HP to gain ADV on the Check.\n\nDesperate Bargain: Once per Combat, you can spend 1 AP to regain an amount of HP equal to your Prime Modifier. When you do, you become Exposed until the end of your next turn.');
    expect(feature(2, 'Life Tap')).toBe('When you produce an MP Effect, you can spend HP in place of MP. The total amount of HP and MP spent can’t exceed your Mana Spend Limit. You can use this Feature once per Long Rest, and regain the ability to use it again when you roll for Initiative.');
    expect(feature(5, 'Expert Warlock')).toBe('You gain the following benefits for your Warlock Class Features.\n\nWARLOCK CONTRACT\nYour maximum HP increases by 2.\n\nPACT BOON\nPact Weapon:\n• Your Pact Weapon gains an additional 1 point Weapon Property. You can change the chosen Weapon Property when you complete a Quick Rest.\n• You learn 1 Attack Maneuver.\n• You can spend MP on Martial Enhancements and Maneuver performed with your Pact Weapon. When you do, you gain 2 SP worth of Enhancements per MP spent.\n\nPact Armor:\n• Your Pact Armor gains an additional 1 point Armor Property. You can change the chosen Armor Property when you complete a Quick Rest.\n• You learn 1 Defense Maneuver.\n• You can spend MP on Defense Maneuvers. When you do, you gain 2 SP worth of Enhancements per MP spent.\n\nPact Spell:\n• You learn 2 Spells of your choice from any Spell Source.\n• Choose a Spell you know to also become your Pact Spell, granting the benefits of your Pact Spell to both. You can change either or both of your Pact Spells when you complete a Long Rest.\n\nDC Tip: You still can only use Patron’s Favor once per Round.\n\nPact Familiar:\nWhen you cast the Call Familiar Spell, your Familiar gains an additional 3 points worth of Familiar or Beast Traits (you can’t choose Negative Traits) for free.\n\nLIFE TAP\nWhen you use Life Tap, you gain ADV on the Check made to produce the effect.');
  });

  it('preserves Warlock spell access, starting equipment, Talents, and subclass metadata', () => {
    expect(warlock.pathDetails).toBe('Combat Training: Spell Focuses, Light Armor\n\nSpell List: Choose 3 Spell Schools. When you learn a new Spell, you can choose any Spell from the chosen Spell Schools.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Warlock Class Table.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Warlock Class Table.');
    expect(warlock.startingEquipment.description).toBe('Arsenal: 2 Spell Focuses. You can choose Weapons if you choose the Pact Weapon option of the Pact Boon Feature.\nArmor: 1 set of Light Armor. You can choose 1 set of Heavy Armor instead if you choose the Pact Armor option of the Pact Boon Feature.\nTrade Tools: Choose 2 of any of the following items:\nAlchemist’s Supplies, Disguise Kit, Jeweler’s Tools, or Sculptor’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(warlock.talents.slice(-3).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Expanded Boon', 1],
      ['Pact Bane', 3],
      ['Warlock Subcontract', 3],
    ]);
    expect(warlock.talents.find(({ name }) => name === 'Expanded Boon')?.isRepeatable).toBe(true);
    expect(warlock.subclassFeatures.Eldritch.map(({ name, level }) => [name, level])).toEqual([
      ['Otherworldly Gift', 3],
      ['Alien Comprehension (Flavor Feature)', 3],
    ]);
    expect(warlock.subclassFeatures.Fey.map(({ name, level }) => [name, level])).toEqual([
      ['Fey Aspect', 3],
      ['Dream Walker (Flavor Feature)', 3],
    ]);
    expect(warlock.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });

  it('routes Expanded Boon and every feature-granted power separately', () => {
    const boonGroup = warlock.choiceGroups.find(({ id }) => id === 'warlock.boon')!;
    const hero = character('Warlock');
    hero.level = 5;
    hero.subclass = 'Eldritch';
    hero.build = {
      ...defaultBuild(),
      selectedTalents: ['Expanded Boon', 'Expanded Boon', 'Pact Bane'],
      classFeatureSelections: {
        'warlock.boon': ['Pact Weapon', 'Pact Familiar', 'Pact Spell'],
        'warlock.pactWeaponManeuvers': ['Heroic Bash', 'Savage Strike', 'Sunder Strike'],
        'warlock.psychicSpell': ['Mind Blast'],
        'warlock.expertSpells': ['Heal', 'Fireball'],
        'warlock.pactBaneSpells': ['Bane'],
      },
    };
    expect(classChoiceSelectionLimit(boonGroup, hero)).toBe(3);
    expect(grantedClassManeuverNames(hero)).toEqual(['Heroic Bash', 'Savage Strike', 'Sunder Strike']);
    expect(grantedClassSpellNames(hero)).toEqual(['Call Familiar', 'Mind Blast', 'Heal', 'Fireball', 'Bane']);
    expect(grantedClassLanguageNames(hero)).toEqual(['Deep Speech']);
  });

  it('applies Expert Warlock HP and equipped Pact Armor defenses', () => {
    const hero = character('Warlock');
    hero.level = 5;
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: {
        'warlock.boon': ['Pact Armor'],
        'warlock.pactArmorManeuvers': ['Parry', 'Brace', 'Side Step'],
      },
    };
    const armor: EquipmentCatalogItem = {
      id: 'pact-armor', name: 'Deflecting Heavy Armor', category: 'Armor', subtype: 'Heavy Armor',
      summary: '', mechanics: '', properties: [], slot: 'Armor', sourcePage: '',
    };
    hero.inventoryItems = [{ id: 'inventory', equipmentID: armor.id, quantity: 1, isEquipped: true, source: 'startingEquipment' }];
    const derived = deriveCharacter(hero, warlock, reference.ancestryTraits, [armor]);
    expect(derived.maxHP).toBe(19);
    expect(derived.arcaneDefense).toBe(15);
    expect(derived.mysticalDR).toBe(1);
  });

  it('adds Psychic-tag Spells to the Eldritch Warlock list', () => {
    const spell = (school: string, tags = '') => ({ school, tags, source: 'Arcane' });
    expect(spellIsAvailableToClass('Warlock', spell('Elemental'), undefined, '', ['Elemental'], 'Eldritch')).toBe(true);
    expect(spellIsAvailableToClass('Warlock', spell('Enchantment', 'Psychic'), undefined, '', ['Elemental'], 'Eldritch')).toBe(true);
    expect(spellIsAvailableToClass('Warlock', spell('Enchantment', 'Psychic'), undefined, '', ['Elemental'], 'Fey')).toBe(false);
  });
});

describe('Cleric Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => cleric.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Cleric class table', () => {
    expect(cleric.tableRows.map((row) => ({
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
      { level: 3, health: 1, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete Divine Blessing, Channel Divinity, and Expert Cleric wording', () => {
    expect(feature(1, 'Divine Blessing')).toBe('You can spend 1 AP to say a prayer and petition your deity for their divine blessing. Choose 1 of the blessings listed below. Each blessing has a listed MP cost that you must spend to gain the blessing. Once during the next minute, you can apply the blessing to a Spell you cast. If your Spell targets more than 1 creature, the blessing only applies to 1 target of your choice.\n\n• Destruction: (1 MP) The target takes 3 Divine damage, provided that the result of the Check used to cast the Spell is equal to or higher than the target’s AD. If the Spell doesn’t normally require a Check, then you must make a Spell Attack Check when you apply this blessing.\n• Guidance: (1 MP) The target gains a d8 Help Die that they can add to 1 Check of their choice they make within the next minute. When they use this Help Die, the Check gains ADV.\n• Restoration: (1 MP) The target regains 3 HP.\n\nUnused Blessing: You can only have 1 blessing at a time. If you petition your deity for a blessing while you already have a blessing, the first blessing immediately ends without granting any benefit. If the blessing ends without granting any benefit, you regain the MP spent to gain the blessing.');
    expect(feature(2, 'Channel Divinity')).toBe('You gain the ability to channel the direct power of your deity. When you use this Feature, choose 1 of the options below. You can use this Feature once per Long Rest, and regain the ability to use it again when you roll for Initiative.\n\nDivine Rebuke\nYou can spend 2 AP to censure all creatures of your choice who can see or hear you within 5 Spaces. Make a Spell Attack against each target’s AD, and each target makes a Repeated Mental Save against your Save DC. Hit: The target takes 1 Divine Damage. Save Failure: The target becomes Intimidated by you for 1 minute or until it takes damage again.\n\nLesser Divine Intervention\nYou can spend 2 AP to call on your deity to intervene on your behalf when your need is great to replenish you and your allies. You gain a pool of HP which you can distribute to creatures of your choice within 5 Space to restore their HP (in increments of 1 HP). Make a DC 15 Spell Check. Failure: You gain a pool of 3 HP. Success: You gain a pool of 3 HP and you regain 1 MP. Success (5): Your pool of HP increases 2.');
    expect(feature(5, 'Expert Cleric')).toBe('You gain the following benefits for your Cleric Class Features.\n\nCleric Order\nYou gain 1 additional Divine Domain.\n\nDivine Blessing\nWhen you use Divine Blessing you can spend additional MP to enhance the effect:\nDestruction: The damage increased by 2 per MP spent.\nRestoration: The healing increases by 2 per MP spent.\n\nChannel Divinity\nDivine Rebuke: The damage increases by 1.\nLesser Divine Intervention: The pool of HP increases by 2.');
  });

  it('preserves all domains, spell access, equipment, Talents, and subclass metadata', () => {
    expect(cleric.choiceGroups.find(({ id }) => id === 'cleric.domains')?.options.map(({ name }) => name)).toEqual([
      'Knowledge', 'Magic', 'Divine Damage Expansion', 'Life', 'Death', 'Grave', 'Light', 'Dark',
      'War', 'Peace', 'Order', 'Chaos', 'Divination', 'Trickery', 'Ancestral',
    ]);
    expect(cleric.pathDetails).toBe('Combat Training: Spell Focuses, Light Armor, Light Shields\n\nSpell List: When you learn a new Spell, you can choose any Spell on the Divine Spell Source.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Cleric Class Table.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Cleric Class Table.');
    expect(cleric.startingEquipment.description).toBe('Arsenal: Choose 3 of any of the following items: Spell Focus, Weapon, or Light Shield. You can also choose Heavy Shield if you choose the Peace Domain option of the Cleric Order Feature.\nArmor: 1 set of Light Armor. You can choose 1 set of Heavy Armor instead if you choose the Peace Domain option of the Cleric Order Feature.\nTrade Tools: Choose 1 of any of the following items:\nBrewer’s Supplies, Calligrapher’s Supplies, Herbalist’s Supplies, Musical Instrument, or Sculptor’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(cleric.talents.slice(-3).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Expanded Order', 1],
      ['Bountiful Blessings', 3],
      ['Divine Cleanse', 3],
    ]);
    expect(cleric.subclassFeatures.Inquisitor.map(({ name, level }) => [name, level])).toEqual([
      ['Vanquish Heresy', 3],
      ['Divine Interrogator (Flavor Feature)', 3],
    ]);
    expect(cleric.subclassFeatures.Priest.map(({ name, level }) => [name, level])).toEqual([
      ['Sanctification', 3],
      ['All that Ails (Flavor Feature)', 3],
    ]);
  });

  it('routes every selected Divine Domain into character calculations and granted powers', () => {
    const domainGroup = cleric.choiceGroups.find(({ id }) => id === 'cleric.domains')!;
    const hero = character('Cleric');
    hero.level = 5;
    hero.build = {
      ...defaultBuild(),
      selectedTalents: ['Expanded Order', 'Expanded Order'],
      classFeatureSelections: {
        'cleric.divineDamage': ['Fire'],
        'cleric.domains': ['Knowledge', 'Magic', 'Magic', 'War', 'Peace', 'Ancestral', 'Divine Damage Expansion'],
        'cleric.magicDomainTags': ['Healing', 'Fire'],
        'cleric.magicDomainSpells': ['Heal', 'Fireball'],
        'cleric.warManeuver': ['Savage Strike'],
        'cleric.peaceManeuver': ['Parry'],
      },
    };
    expect(classChoiceSelectionLimit(domainGroup, hero)).toBe(7);
    expect(grantedClassSpellNames(hero)).toEqual(['Heal', 'Fireball']);
    expect(grantedClassManeuverNames(hero)).toEqual(['Savage Strike', 'Parry']);
    const derived = deriveCharacter(hero, cleric, reference.ancestryTraits, []);
    expect(derived.maxMana).toBe(14);
    expect(derived.skillPointBudget).toBe(10);
    expect(derived.ancestryPointBudget).toBe(9);
    expect(derived.spellLimit).toBe(6);
    expect(characterSheetEffects(hero).resistances).toEqual(['Fire (1)']);
  });

  it('adds each Magic Domain tag to the Cleric Spell List without replacing Divine access', () => {
    const spell = (source: string, tags = '') => ({ school: 'Elemental', tags, source });
    expect(spellIsAvailableToClass('Cleric', spell('Divine'), 'Divine', '', [], '', ['Fire'])).toBe(true);
    expect(spellIsAvailableToClass('Cleric', spell('Primal', 'Fire'), 'Divine', '', [], '', ['Fire'])).toBe(true);
    expect(spellIsAvailableToClass('Cleric', spell('Arcane', 'Cold'), 'Divine', '', [], '', ['Fire'])).toBe(false);
  });

  it('applies the Inquisitor Condition resistances on the live sheet', () => {
    const hero = character('Cleric');
    hero.level = 3;
    hero.subclass = 'Inquisitor';
    expect(characterSheetEffects(hero).resistances).toEqual([
      'Charmed Condition', 'Intimidated Condition', 'Taunted Condition',
    ]);
  });
});

describe('Druid Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => druid.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Druid class table', () => {
    expect(druid.tableRows.map((row) => ({
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
      { level: 3, health: 1, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
    expect(druid.tableSource).toBe('BETA 0.10.5 • PAGE 230');
  });

  it('preserves the complete level-two and Expert Druid rules text', () => {
    expect(feature(2, 'Nature’s Torrent')).toBe('When a creature within 10 spaces of you takes Elemental damage, you can spend 1 AP as a Reaction to summon a torrent of nature. The torrent fills a 3 Space Diameter Sphere centered on the target that lasts for 1 minute. While creatures are within the area, they have Vulnerability (1) against the triggering damage type and have DisADV on Checks and Saves to resist being moved or knocked Prone. Ending Early: The torrent ends early if you use this Feature again, become Incapacitated, die, or choose to end it for free at anytime.');
    expect(feature(5, 'Expert Druid')).toBe('You gain the following benefits for your Druid Class Features. Druid Domain The number of Domain Spaces you create increases to 10. Losing Domain Spaces: A Domain Space disappears if you end your turn farther than 20 Spaces away from it. You can spend additional MP when you use Druid Domain to increase the number of Domain Spaces created by 8 per additional MP spent. Wild Growth: You can spend additional MP to increase the healing by 1 per 2 additional MP spent. Wild Form Your Wild Forms have +1 HP and 1 additional Trait Point. Nature’s Torrent The range of Nature’s Torrent increases to 15 Spaces. When you use Nature’s Torrent, you can spend MP to enhance its effects:\n• Vulnerability: (2 MP) The Vulnerability increases by 1.\n• Area: (X MP) The diameter of the Sphere increases by X.');
    expect(feature(1, 'Wild Form')).toContain('Once per Long Rest, you can transform without spending MP or using MP enhancements.');
    expect(feature(1, 'Wild Form')).toContain('You can have multiple Wild Forms available at a time which have their own Wild Form HP and Traits.');
    expect(feature(1, 'Wild Form')).toContain('You don’t benefit from your Ancestry Traits, but you gain 3 Trait Points to spend on Beast Traits or Wild Form Traits of your choice.');
  });

  it('preserves Druid training, equipment, Talents, and level-gated subclass metadata', () => {
    expect(druid.pathDetails).toBe('Combat Training: Spell Focuses, Light Armor\n\nSpell List: When you learn a new Spell, you can choose any Spell on the Primal Spell Source.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Druid Class Table.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Druid Class Table.');
    expect(druid.startingEquipment.description).toBe('Arsenal: 2 Spell Focuses.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 2 of any of the following items:\nHerbalist’s Supplies, Leatherworker’s Tools, Sculptor’s Tools, or Weaver’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(druid.choiceGroups.map(({ id }) => id)).toEqual(['druid.wildSpeech']);
    expect(druid.talents.slice(-2).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Wild Form Expansion', 3],
      ['Nature’s Vortex', 3],
    ]);
    expect(druid.subclassFeatures.Phoenix.map(({ name, level }) => [name, level])).toEqual([
      ['Flames of Rebirth', 3],
      ['Fire Within (Flavor Feature)', 3],
    ]);
    expect(druid.subclassFeatures['Rampant Growth'].map(({ name, level }) => [name, level])).toEqual([
      ['Overgrowth', 3],
      ['Seed Vault (Flavor Feature)', 3],
    ]);
  });

  it('routes Wild Speech and every selected Wild Form statistic to the live sheet', () => {
    const hero = character('Druid');
    hero.level = 5;
    hero.subclass = 'Phoenix';
    hero.primeModifier = 3;
    hero.combatMastery = 3;
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: {
        'druid.wildSpeech': ['Weather'],
        [DRUID_WILD_FORM_TRAITS]: [
          'Healthy', 'Healthy', 'Defensive — PD', 'Defensive — AD',
          'Attribute Increase — Might', 'Skillful', 'Resistance — Fire', 'Swift',
        ],
        [DRUID_WILD_FORM_SKILLS]: ['Animal', 'Survival'],
      },
      sheetFeatureStates: {
        [DRUID_WILD_FORM_ACTIVE]: true,
        [DRUID_WILD_FORM_EXPANSION_ACTIVE]: true,
      },
      sheetFeatureCounters: {
        [DRUID_WILD_FORM_EXTRA_MP]: 1,
        [DRUID_WILD_FORM_HP]: 5,
      },
      sheetFeatureSelections: {
        [DRUID_WILD_FORM_TYPE]: 'Elemental (Fire)',
        [DRUID_WILD_FORM_DAMAGE]: 'Fire',
      },
    };
    const profile = druidWildFormProfile(hero);
    expect(grantedClassSpellNames(hero)).toEqual(['Druidcraft']);
    expect(profile).toMatchObject({
      active: true,
      traitPointBudget: 8,
      traitPointsSpent: 8,
      maximumHP: 8,
      currentHP: 5,
      physicalDefense: 16,
      areaDefense: 16,
      speed: 6,
      size: 'Medium',
      creatureType: 'Elemental (Fire)',
      might: 3,
      agility: 1,
      naturalWeaponDamageType: 'Fire',
      resistances: ['Fire (1)'],
      skillMasteries: ['Animal', 'Survival'],
    });
  });

  it('routes positive Beast Traits selected for a Wild Form into its live mechanics', () => {
    const hero = character('Druid');
    hero.level = 5;
    hero.primeModifier = 3;
    hero.combatMastery = 3;
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: {
        [DRUID_WILD_FORM_TRAITS]: [
          druidBeastTraitSelection('Quick Reactions', 1),
          druidBeastTraitSelection('Thick-Skinned', 1),
          druidBeastTraitSelection('Hard Shell', 1),
          druidBeastTraitSelection('Shell Retreat', 1),
          druidBeastTraitSelection('Tough', 1),
          druidBeastTraitSelection('Natural Armor', 2),
          'Swift',
        ],
      },
      sheetFeatureStates: {
        [DRUID_WILD_FORM_ACTIVE]: true,
        [DRUID_WILD_FORM_EXPANSION_ACTIVE]: true,
        'ancestry.shellRetreat.active': true,
      },
      sheetFeatureCounters: {
        [DRUID_WILD_FORM_EXTRA_MP]: 1,
        [DRUID_WILD_FORM_HP]: 4,
      },
    };
    expect(druidWildFormProfile(hero)).toMatchObject({
      traitPointBudget: 8,
      traitPointsSpent: 8,
      maximumHP: 5,
      currentHP: 4,
      physicalDefense: 20,
      areaDefense: 21,
      speed: 0,
      physicalDamageReduction: true,
      elementalDamageReduction: true,
      shellRetreatAvailable: true,
      shellRetreatActive: true,
      beastTraits: ['Quick Reactions', 'Thick-Skinned', 'Hard Shell', 'Shell Retreat', 'Tough', 'Natural Armor'],
    });
  });

  it('expires Wild Forms and their Long-Rest resources on a Long Rest', () => {
    const hero = character('Druid');
    hero.manaPoints = 0;
    hero.maxManaPoints = 9;
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: {
        [DRUID_WILD_FORM_TRAITS]: ['Healthy', 'Swift'],
        [DRUID_WILD_FORM_SKILLS]: [],
      },
      sheetFeatureStates: {
        [DRUID_WILD_FORM_ACTIVE]: true,
        [DRUID_WILD_FORM_FREE_USED]: true,
      },
      sheetFeatureCounters: {
        [DRUID_WILD_FORM_EXTRA_MP]: 1,
        [DRUID_WILD_FORM_HP]: 2,
      },
      sheetFeatureSelections: {
        [DRUID_WILD_FORM_TYPE]: 'Beast',
        [DRUID_WILD_FORM_DAMAGE]: 'Piercing',
      },
      druidWildForms: [{
        id: 'wolf', name: 'Wolf', size: 'Medium', creatureType: 'Beast', naturalWeaponDamageType: 'Piercing',
        traits: ['Healthy', 'Swift'], skillMasteries: [], currentHP: 2, extraMP: 1, expansionApplied: false,
      }],
    };
    const rested = completeCharacterRest(hero, 'Long', 0);
    expect(rested.manaPoints).toBe(9);
    expect(rested.build?.sheetFeatureStates[DRUID_WILD_FORM_ACTIVE]).toBe(false);
    expect(rested.build?.sheetFeatureStates[DRUID_WILD_FORM_FREE_USED]).toBe(false);
    expect(rested.build?.sheetFeatureCounters).toEqual({});
    expect(rested.build?.classFeatureSelections[DRUID_WILD_FORM_TRAITS]).toEqual([]);
    expect(rested.build?.sheetFeatureSelections[DRUID_WILD_FORM_TYPE]).toBeUndefined();
    expect(rested.build?.sheetFeatureSelections[DRUID_WILD_FORM_DAMAGE]).toBeUndefined();
    expect(rested.build?.druidWildForms).toEqual([]);
  });
});

describe('Hunter Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => hunter.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Hunter class table', () => {
    expect(hunter.tableRows.map((row) => ({
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
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, features: 'Class Feature' },
      { level: 6, health: 2, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 2, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 2, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete published Hunter’s Mark, Hunter’s Strike, and Expert Hunter wording', () => {
    expect(feature(1, 'Hunter’s Mark')).toBe('You can spend 1 AP and 1 SP to focus on and mark a creature you can see within 15 Spaces as your quarry. Alternatively, you can mark a creature by studying its tracks for at least 1 minute. While a creature is marked, you gain the following benefits:\n• You have ADV on Awareness and Survival Checks made to find the target.\n• The first Martial Attack against your target on your turn has ADV and ignores PDR.\n• When you score a Heavy or Critical Hit against the target, you automatically grant a d8 Help Die to the next Attack made against the target before the start of your next turn.\n\nThe target is marked as long as it’s on the same Plane of Existence as you, and vanishes early if you complete a Long Rest, fall Unconscious, or use this Feature again to mark another creature.\n\nWhen a marked creature dies you can spend 1 AP or 1 SP as a reaction to immediately Mark another target within range.');
    expect(feature(2, 'Hunter’s Strike')).toBe('You can spend 1 SP as part of a Weapon Attack to add 1 of the unique Martial Enhancements listed below. You can only use 1 of these Enhancements per Attack. The damage increases by 1 for each SP spent beyond the first. If a Enhancement forces the target to make a Save, it does so against your Save DC.\n• Acid: The target takes 1 Corrosion damage and makes an Agility Save. Save Failure: The target becomes Hindered until the end of your next turn.\n• Fire: The target takes 1 Fire damage and makes a Might Save. Save Failure: The target begins Burning.\n• Piercing: The target takes 1 Piercing damage and makes a Might Save. Save Failure: The target begins Bleeding.\n• Snare: The target takes 1 Bludgeoning damage and makes an Agility Save. Save Failure: The target becomes Immobilized until the end of your next turn.\n• Toxin: The target takes 1 Poison damage and makes a Might Save. Save Failure: The target becomes Impaired until the end of your next turn.\n\nDC Tip: It’s assumed that the Hunter always has these supplies available to them (oils, tools, accessories, ammo, etc.) and they’ve prepared them ahead of time or quickly made them on the fly during Combat, however the PC or GM wants to describe it.');
    expect(feature(5, 'Expert Hunter')).toBe('You gain the following benefits for your Hunter Class Features.\n\nHunter’s Mark\n\nThe Help die granted by Hunter’s Mark is increased to a d10 and the first Martial Attack against your target on your turn ignores Physical Resistance.\n\nFavored Terrain\n\nYou gain 1 additional Favored Terrain.\n\nHunter’s Strike\n\nYou can use up to 2 Hunter’s Strike Enhancements on an Attack.');
  });

  it('preserves Hunter training, starting equipment, and every published class Talent', () => {
    expect(hunter.pathDetails).toBe('Combat Training: Weapons, Light Armor, Light Shields\n\nManeuvers: The number of Maneuvers you know increases as shown in the Maneuvers Known column of the Hunter Class Table.\n\nStamina Points: Your maximum number of Stamina Points increases as shown in the Stamina Points column of the Hunter Class Table.\n\nStamina Regen: Once per Round, you can regain up to half your maximum SP when:\n• When you Hit the target of your Hunter’s Mark with a Martial Attack.\n• The target of your Hunter’s Mark is reduced to 0 HP or dies.\n• You succeed on a Check to recall information about a creature.\n• You succeed on a Check to locate an Unseen creature.');
    expect(hunter.startingEquipment.description).toBe('Arsenal: Choose 3 of any of the following items: Weapon or Light Shield.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 1 of any of the following items:\nDisguise Kit, Herbalist’s Supplies, Leatherworker’s Tools, or Sculptor’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(hunter.talents.slice(-3).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Expanded Terrains', 1],
      ['Pack Leader', 3],
      ['Big Game Hunter', 3],
    ]);
  });

  it('scales Favored Terrain choices and routes terrain benefits into the builder', () => {
    const terrainGroup = hunter.choiceGroups.find(({ id }) => id === 'hunter.terrain')!;
    const novice = character('Hunter');
    expect(classChoiceSelectionLimit(terrainGroup, novice)).toBe(2);

    novice.level = 5;
    novice.build = {
      ...defaultBuild(),
      selectedTalents: ['Expanded Terrains', 'Expanded Terrains'],
      classFeatureSelections: { 'hunter.terrain': ['Forest', 'Urban', 'Grassland'] },
    };
    expect(classChoiceSelectionLimit(terrainGroup, novice)).toBe(7);
    expect(hunterFavoredTerrainNames(novice)).toEqual(['Forest', 'Urban', 'Grassland']);
    const derived = deriveCharacter(novice, hunter, reference.ancestryTraits, []);
    expect(derived.speed).toBe(6);
    expect(derived.skillPointBudget).toBe(12);
  });

  it('routes terrain and active Monster Slayer resistances to the live sheet', () => {
    const hero = character('Hunter');
    hero.level = 3;
    hero.subclass = 'Monster Slayer';
    hero.build = {
      ...defaultBuild(),
      classFeatureSelections: { 'hunter.terrain': ['Desert', 'Swamp', 'Tundra'], 'hunter.concoctions': ['Basilisk Eye'] },
      sheetFeatureStates: { [HUNTER_CONCOCTION_ACTIVE]: true },
      sheetFeatureSelections: { 'hunter.concoction.name': 'Basilisk Eye' },
    };
    expect(characterSheetEffects(hero).resistances).toEqual(['Fire (Half)', 'Poison (Half)', 'Cold (Half)', 'Physical (1)']);
    expect(hunterStaminaRegenAmount(5)).toBe(3);
  });

  it('resets the Hunter’s first Mark attack each turn and crafts a Trapper Trap on a Short Rest', () => {
    const hero = character('Hunter');
    hero.level = 3;
    hero.subclass = 'Trapper';
    hero.primeModifier = 3;
    hero.build = {
      ...defaultBuild(),
      sheetFeatureStates: { [HUNTER_MARK_ACTIVE]: true, [HUNTER_MARK_FIRST_ATTACK_USED]: true },
      sheetFeatureCounters: { [HUNTER_TRAPS_AVAILABLE]: 1 },
    };
    expect(resetCharacterTurn(hero).build?.sheetFeatureStates[HUNTER_MARK_FIRST_ATTACK_USED]).toBe(false);
    expect(completeCharacterRest(hero, 'Short', 0).build?.sheetFeatureCounters[HUNTER_TRAPS_AVAILABLE]).toBe(2);
  });

  it('includes every source option and level-gates all published Hunter subclass features', () => {
    expect(hunter.choiceGroups.find(({ id }) => id === 'hunter.terrain')?.options.map(({ name }) => name)).toEqual([
      'Coast', 'Desert', 'Forest', 'Grassland', 'Jungle', 'Mountain', 'Swamp', 'Tundra', 'Subterranean', 'Urban',
    ]);
    expect(hunter.choiceGroups.find(({ id }) => id === 'hunter.bestiary')?.options).toHaveLength(14);
    expect(hunter.choiceGroups.find(({ id }) => id === 'hunter.concoctions')?.options.map(({ name }) => name)).toEqual([
      'Elemental Infusion', 'Hydra’s Blood', 'Basilisk Eye', 'Ooze Gel', 'Aberrant Tumor', 'Deathweed', 'Plant Fibers', 'Divine Water',
    ]);
    expect(hunter.subclassFeatures['Monster Slayer'].map(({ name, level }) => [name, level])).toEqual([
      ['Monstrous Concoctions', 3],
      ['Monster Hunter (Flavor Feature)', 3],
    ]);
    expect(hunter.subclassFeatures.Trapper.map(({ name, level }) => [name, level])).toEqual([
      ['Dynamic Traps', 3],
      ['Discerning Eye (Flavor Feature)', 3],
    ]);
    expect(hunter.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
  });
});

describe('Monk Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => monk.features
    .find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every row of the published Monk class table', () => {
    expect(monk.tableRows.map((row) => ({
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
      { level: 5, health: 2, attribute: 1, skill: 2, trade: 1, stamina: undefined, maneuvers: 1, features: 'Class Feature' },
      { level: 6, health: 2, attribute: undefined, skill: 1, trade: undefined, stamina: undefined, maneuvers: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 2, attribute: 1, skill: 1, trade: 1, stamina: undefined, maneuvers: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 2, attribute: undefined, skill: undefined, trade: undefined, stamina: 1, maneuvers: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 2, attribute: 1, skill: 2, trade: 1, stamina: 1, maneuvers: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the complete published Monk Training, Spiritual Balance, and Expert Monk wording', () => {
    expect(feature(1, 'Monk Training')).toBe('Your martial arts training grants you greater offense, defense, and movement.\n\nIron Palm: Choose a Melee Weapon Style when you gain this Feature. Your limbs are considered Natural Weapons that deal 2 Bludgeoning damage and can perform the Weapon Enhancement of the chosen Weapon Style.\n\nDC Tip: Your hands are Natural Weapons that count as Melee Weapons Weapons for the purposes of Dual Wielding and abilities that require a Melee Weapon.\n\nPatient Defense: While you aren’t wearing Armor, you gain +2 PD.\n\nStep of the Wind: You gain the following benefits:\n• You gain +1 Speed and Jump Distance.\n• You can move a number of Spaces up to your Speed along vertical surfaces and across liquids without falling during your move.\n• You can use your Prime Modifier instead of Agility to determine your Jump Distance and the damage you take from Falling.');
    expect(feature(2, 'Spiritual Balance')).toBe('You gain the power to harness your inner spirit as a counterbalance against your physical energy.\n\nKi Points\nYou have a maximum number of Ki Points equal to your Stamina Points. When your Stamina Point maximum increases, your Ki Point maximum increases equally.\n\nRegaining Ki: When you spend a Stamina Point on your turn, you regain a Ki Point. You regain all spent Ki Points when Combat ends.\n\nKi Actions\nYou can spend Ki Points to perform the Reactions listed below:\n\nDeflect Attack: When a creature misses you with a Ranged Martial Attack that targets your PD, you can spend 1 or more Ki Points and use a free hand to redirect the Attack at a different creature you can see within 5 Spaces. Make an Attack Check against the new target’s PD. Hit: The new target takes an amount of damage equal to the Ki Points spent. The damage type is the same as the triggering Attack.\n\nDC Tip: Remember that the original target is who makes the Save against any effects from the attack, so Deflect Attack doesn’t protect them from that.\n\nSlow Fall: When you take damage from falling, you can spend 1 or more Ki Points to reduce the damage by an amount equal to the Ki Points spent.\n\nUncanny Dodge: When a creature makes an Attack against you, you can spend 1 Ki Point to impose DisADV on the attack.');
    expect(feature(5, 'Expert Monk')).toBe('You gain the following benefits for your Monk Class Features.\n\nMonk Training\nIron Palm: Choose an additional Melee Weapon Style. When you make an Attack with an Unarmed Strike, you can use both Weapon Enhancements.\n\nStep of the Wind: You gain an additional +1 Speed and Jump Distance.\n\nMonk Stances\nYou learn 1 additional Monk Stance.\n\nSpiritual Balance\nYour Ki Point maximum increases by 1. Whenever you regain Ki Points, you regain half of your maximum Ki instead.');
  });

  it('preserves Monk training, starting equipment, stance catalog, and every published class Talent', () => {
    expect(monk.pathDetails).toBe('Combat Training: Weapons, Light Armor\n\nManeuvers: The number of Maneuvers you know increases as shown in the Maneuvers Known column of the Monk Class Table.\n\nStamina Points: Your maximum number of Stamina Points increases as shown in the Stamina Points column of the Monk Class Table.\n\nStamina Regen: Once per Round, you can regain up to half your maximum SP when you succeed on an Athletics Check, Acrobatics Check, or Hit on a Martial Attack.');
    expect(monk.startingEquipment.description).toBe('Arsenal: 2 Weapons.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 2 of any of the following items:\nBrewer’s Supplies, Calligrapher’s Supplies, Cooking Utensils, or Weaver’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(monk.choiceGroups.find(({ id }) => id === 'monk.stances')?.options.map(({ name }) => name)).toEqual([
      'Bear Stance', 'Bull Stance', 'Cobra Stance', 'Gazelle Stance', 'Mantis Stance', 'Mongoose Stance', 'Scorpion Stance', 'Turtle Stance', 'Wolf Stance',
    ]);
    expect(monk.talents.slice(-3).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Expanded Stances', 1],
      ['Internal Damage', 3],
      ['Steel Fist', 3],
    ]);
  });

  it('scales Iron Palm and Monk Stance choices at the correct levels and from Expanded Stances', () => {
    const ironPalm = monk.choiceGroups.find(({ id }) => id === 'monk.ironPalm')!;
    const stances = monk.choiceGroups.find(({ id }) => id === 'monk.stances')!;
    const hero = character('Monk');
    expect(classChoiceSelectionLimit(ironPalm, hero)).toBe(1);
    expect(classChoiceSelectionLimit(stances, hero)).toBe(2);
    hero.level = 5;
    hero.build = { ...defaultBuild(), selectedTalents: ['Expanded Stances', 'Expanded Stances'] };
    expect(classChoiceSelectionLimit(ironPalm, hero)).toBe(2);
    expect(classChoiceSelectionLimit(stances, hero)).toBe(7);
  });

  it('routes Patient Defense, Step of the Wind, active Stances, and Expert scaling to calculations', () => {
    const hero = character('Monk');
    const novice = deriveCharacter(hero, monk, reference.ancestryTraits, equipmentCatalog);
    expect(novice.physicalDefense).toBe(12);
    expect(novice.speed).toBe(6);
    hero.level = 5;
    const expert = deriveCharacter(hero, monk, reference.ancestryTraits, equipmentCatalog);
    expect(expert.speed).toBe(7);
    hero.speed = expert.speed;
    hero.build = {
      ...defaultBuild(),
      sheetFeatureStates: { [MONK_STANCE_ACTIVE]: true },
      sheetFeatureSelections: { [MONK_ACTIVE_STANCE]: 'Gazelle Stance' },
    };
    expect(characterSheetEffects(hero)).toMatchObject({ speed: 8, saveAdvantage: { Agility: 1 } });
    hero.build.sheetFeatureSelections[MONK_ACTIVE_STANCE] = 'Turtle Stance';
    expect(characterSheetEffects(hero)).toMatchObject({ speed: 1, saveAdvantage: { Might: 1 } });
    expect(characterSheetEffects(hero).resistances).toEqual(['Physical (Half)', 'Elemental (Half)', 'Mystical (Half)']);
    hero.build.sheetFeatureSelections[MONK_ACTIVE_STANCE] = 'Bear Stance';
    expect(monkMeleeHeavyHitDamageBonus(hero)).toBe(1);
    hero.build.sheetFeatureSelections[MONK_ACTIVE_STANCE] = 'Cobra Stance';
    hero.build.sheetFeatureStates[MONK_COBRA_REVENGE] = true;
    expect(characterSheetEffects(hero).martialMeleeDamageBonus).toBe(1);
    hero.build.sheetFeatureSelections[MONK_ACTIVE_STANCE] = 'Mongoose Stance';
    hero.build.sheetFeatureStates[MONK_MONGOOSE_FLANKED] = true;
    expect(characterSheetEffects(hero).martialMeleeDamageBonus).toBe(1);
  });

  it('uses the audited Stamina and Ki formulas and resets turn-limited Monk benefits', () => {
    expect(monkStaminaRegenAmount(5)).toBe(3);
    expect(monkKiMaximum(3, 1)).toBe(3);
    expect(monkKiMaximum(3, 5)).toBe(4);
    expect(monkKiRecoveryAmount(3, 2)).toBe(1);
    expect(monkKiRecoveryAmount(5, 5)).toBe(3);
    const hero = character('Monk');
    hero.level = 2;
    hero.stamina = 1;
    hero.maxStamina = 2;
    hero.build = { ...defaultBuild(), sheetFeatureStates: { [MONK_FLURRY_USED]: true }, sheetFeatureCounters: { [MONK_KI_CURRENT]: 0 } };
    expect(applyMonkStaminaSpendRecovery(hero, 2).build?.sheetFeatureCounters[MONK_KI_CURRENT]).toBe(1);
    hero.level = 5;
    hero.maxStamina = 4;
    hero.build.sheetFeatureCounters[MONK_KI_CURRENT] = 0;
    expect(applyMonkStaminaSpendRecovery(hero, 2).build?.sheetFeatureCounters[MONK_KI_CURRENT]).toBe(3);
    expect(resetCharacterTurn(hero).build?.sheetFeatureStates[MONK_FLURRY_USED]).toBe(false);
  });

  it('applies a pending Meditation choice only after a Short or Long Rest', () => {
    const hero = character('Monk');
    hero.build = { ...defaultBuild(), sheetFeatureSelections: { [MONK_MEDITATION_PENDING]: 'Medicine' } };
    expect(completeCharacterRest(hero, 'Quick', 0).build?.sheetFeatureSelections[MONK_MEDITATION_SKILL]).toBeUndefined();
    expect(completeCharacterRest(hero, 'Short', 0).build?.sheetFeatureSelections[MONK_MEDITATION_SKILL]).toBe('Medicine');
    expect(completeCharacterRest(hero, 'Long', 0).build?.sheetFeatureSelections[MONK_MEDITATION_SKILL]).toBe('Medicine');
  });

  it('includes every published Monk subclass option with level-gated metadata', () => {
    expect(monk.subclasses).toEqual(['Astral Self', 'Shifting Tide', 'Paragon']);
    expect(monk.choiceGroups.find(({ id }) => id === 'monk.astralDamage')).toMatchObject({ level: 3, requiredSubclass: 'Astral Self', limit: 1 });
    expect(monk.subclassFeatures['Astral Self'].map(({ name, level }) => [name, level])).toEqual([
      ['Astral Awakening', 3],
      ['Astral Watch (Flavor Feature)', 3],
    ]);
    expect(monk.subclassFeatures['Shifting Tide'].map(({ name, level }) => [name, level])).toEqual([
      ['Ebb and Flow', 3],
      ['Fluid Movement (Flavor Feature)', 3],
    ]);
    expect(monk.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3],
      ['Novice Paragon', 3],
      ['Jack of one Trade (Flavor Feature)', 3],
      ['Expert Paragon', 7],
      ['Master Paragon', 10],
    ]);
    expect(monk.subclassFeatures['Astral Self'][0].description).toBe('Astral Damage: When you gain this feature, choose a Mystical damage type. This damage type is your Astral Damage.\n\nDuring Combat, you can spend 1 AP and 1 SP to manifest a portion of your astral self for 1 minute. For the duration, you gain the following benefits:\n• Astral Arms: You manifest 2 astral arms that can only be used to make Unarmed Strikes. They can’t otherwise interact with creatures or objects. Attacks made using these Astral Arms have the Reach property, deal Astral Damage instead of the normal damage type, and can target PD or AD (choose for each Attack).\n• Astral Deflection: You can now use Deflect Attack on Ranged Attacks that miss any target within 2 Spaces.\n\nEnding Early: The effect ends early if you fall Unconscious, die, or choose to end it for free.');
    expect(monk.subclassFeatures['Shifting Tide'][0].description).toBe('You gain the following benefits:\n\nEbb: When you enter a new Monk Stance, you gain 2 Spaces of movement.\n\nFlow: When you use your Uncanny Dodge against a Melee Attack, you can spend 1 AP to make an Opportunity Attack against the Attacker, provided they’re within range.\n\nChanging Tides: You can use your Deflect Attack on Melee Martial Attacks from Large or smaller creatures. When you do, you can redirect the Attack to another target within 1 Space of you.');
  });
});

describe('Sorcerer Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => sorcerer.features.find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches the published level 1-10 class table', () => {
    expect(sorcerer.tableRows).toEqual([
      { level: 1, health: 7, attribute: undefined, skill: undefined, trade: undefined, mana: 6, spells: 4, features: 'Class Features' },
      { level: 2, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 1, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the published path, equipment, core features, and Sorcerer Talents', () => {
    expect(sorcerer.pathDetails).toBe('Combat Training: Spell Focuses, Light Armor\n\nSpell List: You choose 1 Spell Source (Arcane, Divine, or Primal). When you learn a new Spell, you can choose any Spell from the chosen Spell Source.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Sorcerer Class Table.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Sorcerer Class Table.');
    expect(sorcerer.startingEquipment.description).toBe('Arsenal: 2 Spell Focuses.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 2 of any of the following items:\nAlchemist’s Supplies, Calligrapher’s Supplies, Jeweler’s Tools, or Weaver’s Tools.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(feature(1, 'Overload Magic')).toBe('You can spend 1 AP + 1 MP in Combat to channel raw magical energy for 1 minute, or until you become Incapacitated, die, or choose to end it early at any time for free. For the duration, your magic is overloaded and you’re subjected to the following effects:\n• You gain +5 to all Spell Attacks and Spell Checks you make.\n• You must immediately make an Attribute Save (your choice) against your Save DC upon using this Feature, and again at the start of each of your turns. Failure: You gain Exhaustion. You lose any Exhaustion gained in this way when you complete a Short Rest.');
    expect(feature(1, 'Sorcery (Flavor Feature)')).toBe('You learn the Sorcery Spell.');
    expect(feature(5, 'Expert Sorcerer')).toBe('You gain the following benefits for your Sorcerer Class Features.\n\nInnate Power\n\nYour Maximum MP increases by 1.\n\nYou gain the benefit of an additional 1 point Focus Property of your choice. You can change either or both Properties whenever you finish a Long Rest.\n\nOverload Magic\n\nYou no longer need to make an Attribute Save upon using Overload, but you still need to make a Save at the start of each of your turns while Overloaded.\n\nMeta Magic\n\nYou learn 1 additional Meta Magic option of your choice. You can now use 2 Meta Magic Spell Enhancements at a time, provided you don’t use the same option more than once.');
    expect(sorcerer.talents.slice(-3).map(({ name, minimumLevel }) => [name, minimumLevel])).toEqual([
      ['Expanded Meta Magic', 1], ['Greater Innate Power', 3], ['Font of Magic', 3],
    ]);
    expect(sorcerer.choiceGroups.find(({ id }) => id === 'sorcerer.focus')?.options.every(({ pointCost }) => pointCost === 1)).toBe(true);
  });

  it('scales Origins, 1-point Focus Properties, and Meta Magic from level and Talents', () => {
    const origin = sorcerer.choiceGroups.find(({ id }) => id === 'sorcerer.origin')!;
    const focus = sorcerer.choiceGroups.find(({ id }) => id === 'sorcerer.focus')!;
    const meta = sorcerer.choiceGroups.find(({ id }) => id === 'sorcerer.metaMagic')!;
    const hero = character('Sorcerer');
    expect(classChoiceSelectionLimit(origin, hero)).toBe(1);
    expect(classChoiceSelectionLimit(focus, hero)).toBe(1);
    expect(classChoiceSelectionLimit(meta, hero)).toBe(2);
    hero.level = 5;
    hero.subclass = 'Angelic';
    hero.build = { ...defaultBuild(), selectedTalents: ['Greater Innate Power', 'Expanded Meta Magic'] };
    expect(classChoiceSelectionLimit(origin, hero)).toBe(2);
    expect(classChoiceSelectionLimit(focus, hero)).toBe(3);
    expect(classChoiceSelectionLimit(meta, hero)).toBe(6);
  });

  it('routes Innate Power, Expert Sorcerer, and class Talents to Mana, Spells, defenses, and rolls', () => {
    const hero = character('Sorcerer');
    hero.build = { ...defaultBuild(), classFeatureSelections: { 'sorcerer.origin': ['Intuitive Magic'], 'sorcerer.focus': ['Channeling'] } };
    let derived = deriveCharacter(hero, sorcerer, reference.ancestryTraits, equipmentCatalog);
    expect([derived.maxMana, derived.spellLimit]).toEqual([7, 6]);
    expect(grantedClassSpellNames(hero)).toEqual(['Sorcery']);
    expect(equippedCombatModifiers(hero, equipmentCatalog, sorcerer).spellCheckBonus).toBe(1);
    hero.level = 5;
    hero.build = { ...hero.build, selectedTalents: ['Greater Innate Power', 'Expanded Meta Magic'], classFeatureSelections: { ...hero.build.classFeatureSelections, 'sorcerer.focus': ['Channeling', 'Protective', 'Warded'] } };
    derived = deriveCharacter(hero, sorcerer, reference.ancestryTraits, equipmentCatalog);
    expect(derived.maxMana).toBe(17);
    expect(derived.arcaneDefense).toBe(15);
    expect(derived.mysticalDR).toBe(1);
    expect(equippedCombatModifiers(hero, equipmentCatalog, sorcerer).mysticalDamageReduction).toBe(true);
  });

  it('routes subclass ancestry access, restricted points, language stages, and Draconic Overload', () => {
    const angelic = character('Sorcerer');
    angelic.subclass = 'Angelic';
    angelic.build = { ...defaultBuild(), classFeatureSelections: { 'sorcerer.celestialLanguage': ['Celestial'] } };
    expect(accessibleAncestryNames(angelic, reference.ancestryTraits)).not.toContain('Angelborn');
    expect(grantedClassLanguageLevels(angelic)).toEqual({});
    angelic.level = 3;
    expect(accessibleAncestryNames(angelic, reference.ancestryTraits)).toContain('Angelborn');
    expect(ancestryPointBudget(angelic)).toBe(7);
    expect(grantedClassLanguageLevels(angelic)).toEqual({ Celestial: 1 });

    const draconic = character('Sorcerer');
    draconic.level = 3;
    draconic.subclass = 'Draconic';
    draconic.build = { ...defaultBuild(), classFeatureSelections: { 'sorcerer.draconicOrigin': ['Fire'], 'sorcerer.draconicLanguage': ['Draconic'] }, sheetFeatureStates: { [SORCERER_OVERLOAD_ACTIVE]: true } };
    expect(accessibleAncestryNames(draconic, reference.ancestryTraits)).toContain('Dragonborn');
    expect(sorcererDraconicDamageType(draconic)).toBe('Fire');
    expect(characterSheetEffects(draconic).resistances).toEqual(['Physical (1)', 'Fire (1)']);
    expect(grantedClassLanguageLevels(draconic)).toEqual({ Draconic: 1 });
  });

  it('tracks every Wild Magic result and removes only Overload Exhaustion on a Short Rest', () => {
    expect(sorcererWildMagicOutcome(1)).toContain('Sheep');
    expect(sorcererWildMagicOutcome(20)).toContain('Young Purple Dragon');
    const hero = character('Sorcerer');
    hero.healthPoints = 8;
    hero.maxHealthPoints = 11;
    hero.build = { ...defaultBuild(), sheetConditionLevels: { Exhaustion: 3 }, sheetFeatureStates: { [SORCERER_OVERLOAD_ACTIVE]: true }, sheetFeatureCounters: { [SORCERER_OVERLOAD_EXHAUSTION]: 2 } };
    const surged = applySorcererWildMagic(hero, 13);
    expect(surged.build?.sheetFeatureStates[SORCERER_WILD_NEXT_ADVANTAGE]).toBe(true);
    expect(sorcererWildMagicProfile(surged)).toMatchObject({ outcome: 13, allCheckSaveDie: 4 });
    expect(surged.build?.sheetFeatureCounters[SORCERER_WILD_OUTCOME]).toBe(13);
    const sheep = applySorcererWildMagic(hero, 1);
    expect(sorcererWildMagicProfile(sheep).transformation).toMatchObject({ name: 'Sheep', currentHP: 2, maximumHP: 2, physicalDefense: 5, areaDefense: 5, attackCheck: 2, damage: 1 });
    expect(sheep.build?.sheetFeatureCounters[SORCERER_WILD_FORM_HP]).toBe(2);
    const dragon = applySorcererWildMagic(hero, 20);
    expect(sorcererWildMagicProfile(dragon).transformation).toMatchObject({ name: 'Young Purple Dragon', currentHP: 30, maximumHP: 30, physicalDefense: 16, areaDefense: 16, attackCheck: 10, damage: 4, flySpeed: 6 });
    const rested = completeCharacterRest(surged, 'Short', 0);
    expect(rested.build?.sheetConditionLevels.Exhaustion).toBe(1);
    expect(rested.build?.sheetFeatureStates[SORCERER_OVERLOAD_ACTIVE]).toBe(false);
    expect(rested.build?.sheetFeatureCounters[SORCERER_OVERLOAD_EXHAUSTION]).toBeUndefined();
    expect(rested.build?.sheetFeatureCounters[SORCERER_WILD_OUTCOME]).toBeUndefined();
    expect(rested.build?.sheetFeatureCounters[SORCERER_WILD_FORM_HP]).toBeUndefined();
  });

  it('includes all published Sorcerer subclasses with level-gated metadata and unique choice IDs', () => {
    expect(sorcerer.subclasses).toEqual(['Angelic', 'Draconic', 'Paragon']);
    expect(new Set(sorcerer.choiceGroups.map(({ id }) => id)).size).toBe(sorcerer.choiceGroups.length);
    expect(sorcerer.subclassFeatures.Angelic.map(({ name, level }) => [name, level])).toEqual([
      ['Celestial Spark', 3], ['Celestial Appearance (Flavor Feature)', 3],
    ]);
    expect(sorcerer.subclassFeatures.Draconic.map(({ name, level }) => [name, level])).toEqual([
      ['Draconic Spark', 3], ['Draconic Appearance (Flavor Feature)', 3],
    ]);
    expect(sorcerer.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3], ['Novice Paragon', 3], ['Jack of one Trade (Flavor Feature)', 3], ['Expert Paragon', 7], ['Master Paragon', 10],
    ]);
  });
});

describe('Wizard Beta 0.10.5 source audit', () => {
  const feature = (level: number, name: string) => wizard.features.find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches the published level 1-10 class table', () => {
    expect(wizard.tableRows).toEqual([
      { level: 1, health: 7, attribute: undefined, skill: undefined, trade: undefined, mana: 6, spells: 4, features: 'Class Features' },
      { level: 2, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Class Feature, Talent, Path Progression' },
      { level: 3, health: 1, attribute: 1, skill: 1, trade: 1, mana: 3, spells: 1, features: 'Subclass Feature' },
      { level: 4, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 5, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Class Feature' },
      { level: 6, health: 1, attribute: undefined, skill: 1, trade: undefined, mana: undefined, spells: undefined, features: 'Talent, Path Progression' },
      { level: 7, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Subclass Expert Feature' },
      { level: 8, health: 1, attribute: 1, skill: 1, trade: 1, mana: undefined, spells: undefined, features: 'Talent, 2 Ancestry Points, Path Progression' },
      { level: 9, health: 1, attribute: undefined, skill: undefined, trade: undefined, mana: 3, spells: 1, features: 'Class Capstone Feature' },
      { level: 10, health: 1, attribute: 1, skill: 2, trade: 1, mana: 3, spells: 1, features: 'Subclass Capstone Feature' },
    ]);
  });

  it('preserves the published path, equipment, and complete core feature wording', () => {
    expect(wizard.pathDetails).toBe('Combat Training: Spell Focuses, Light Armor\n\nSpell List: When you learn a new Spell, you can choose any Spell on the Arcane Spell Source.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Wizard Class Table.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Wizard Class Table.');
    expect(wizard.startingEquipment.description).toBe('Arsenal: 2 Spell Focuses.\nArmor: 1 set of Light Armor.\nTrade Tools: Choose 2 of any of the following items:\nAlchemist’s Supplies, Calligrapher’s Supplies, Glassblower’s Tools, or Herbalist’s Supplies.\nAdventuring Pack: Choose 1 of the following packs:\n(Adventuring Packs Coming Soon).');
    expect(feature(1, 'Spell School Initiate')).toBe('You’ve completed training in a specialized School of Magic. Choose a Spell School. You gain the following benefits:\n\nSchool Magic: You learn 2 Arcane Spells from this Spell School.\n\nSignature School: When you cast a Spell from the chosen School, you can reduce its MP cost by 1. Its total MP cost before the reduction can’t exceed your Mana Spend Limit. You can use this Feature once per Long Rest, but regain the ability to use it again when you roll for Initiative.');
    expect(feature(2, 'Prepared Spell')).toBe('When you complete a Long Rest, choose 1 Spell you know. The chosen Spell becomes your Prepared Spell until your next Long Rest. Your Prepared Spell gains the following benefits:\n\nMana Limit Break: When you cast your Prepared Spell, you can increase your Mana Spend Limit by 1 for the casting. You can use this Feature once per Long Rest, but you regain the ability to use it when you roll for Initiative.\n\nRehearsed Casting: When creatures Challenge your Spell as part of a Spell Duel, they have DisADV on Checks made to stop your Spell.');
    expect(feature(5, 'Expert Wizard')).toContain('You learn 1 additional Arcane Spell from the chosen School.');
    expect(feature(5, 'Expert Wizard')).toContain('Signature School: When you cast a Spell from the chosen School, you can reduce its MP cost by an additional 1.');
    expect(feature(5, 'Expert Wizard')).toContain('DC Tip: You can still only use Mana Limit Break once, on either of your Prepared Spells.');
  });

  it('scales unique Spell Schools, School Magic grants, and Prepared Spells', () => {
    const schoolGroup = wizard.choiceGroups.find(({ id }) => id === 'wizard.school')!;
    const preparedGroup = wizard.choiceGroups.find(({ id }) => id === 'wizard.preparedSpells')!;
    const hero = character('Wizard');
    hero.build = { ...defaultBuild(), selectedTalents: ['Expanded Spell School', 'Expanded Spell School'] };
    expect(classChoiceSelectionLimit(schoolGroup, hero)).toBe(3);
    expect(classChoiceSelectionLimit(preparedGroup, hero)).toBe(1);
    expect(wizardSchoolSpellGrantLimit(hero.level)).toBe(2);
    hero.level = 5;
    expect(classChoiceSelectionLimit(preparedGroup, hero)).toBe(2);
    expect(wizardSchoolSpellGrantLimit(hero.level)).toBe(3);
    expect(wizard.talents.find(({ name }) => name === 'Crowned Sigil')?.isRepeatable).toBe(true);
    expect(wizard.talents.find(({ name }) => name === 'Overly Prepared Spellcaster')?.isRepeatable).toBe(true);
  });

  it('routes School Magic and Coven’s Gift outside the Class Table spell allowance', () => {
    const hero = character('Wizard');
    hero.build = { ...defaultBuild(), classFeatureSelections: {
      'wizard.school': ['Astromancy'],
      [wizardSchoolSpellSelectionKey('Astromancy')]: ['Arcane Missiles', 'Blink', 'Extra ignored'],
    } };
    expect(grantedClassSpellNames(hero)).toEqual(['Arcane Missiles', 'Blink']);
    hero.level = 5;
    hero.subclass = 'Witch';
    hero.build = { ...hero.build, classFeatureSelections: { ...hero.build.classFeatureSelections, 'wizard.witchCurseSpell': ['Bane'] } };
    expect(grantedClassSpellNames(hero)).toEqual(['Arcane Missiles', 'Blink', 'Extra ignored', 'Bane']);
  });

  it('uses Arcane access plus the published Portal Mage and Witch expansions', () => {
    const arcane = { source: 'Arcane', school: 'Invocation', tags: 'Force' };
    const divineCurse = { source: 'Divine', school: 'Nullification', tags: 'Curse, Enfeeble' };
    const primalTeleport = { source: 'Primal', school: 'Conjuration', tags: 'Teleportation' };
    expect(spellIsAvailableToClass('Wizard', arcane, 'Arcane')).toBe(true);
    expect(spellIsAvailableToClass('Wizard', divineCurse, 'Arcane', '', [], 'Witch')).toBe(true);
    expect(spellIsAvailableToClass('Wizard', primalTeleport, 'Arcane', '', [], 'Portal Mage')).toBe(true);
    expect(spellIsAvailableToClass('Wizard', divineCurse, 'Arcane', '', [], 'Portal Mage')).toBe(false);
  });

  it('routes Wizard talent defenses and clears live features on the correct rest', () => {
    const hero = character('Wizard');
    hero.level = 3;
    hero.build = {
      ...defaultBuild(),
      selectedTalents: ['Crowned Sigil', 'Overly Prepared Spellcaster'],
      sheetFeatureStates: {
        [WIZARD_SIGIL_ACTIVE]: true,
        [WIZARD_SIGIL_INSIDE]: true,
        [WIZARD_SIGIL_PORTAL]: true,
        [WIZARD_SIGIL_BOUND_SELF]: true,
        [WIZARD_HEX_PENDING]: true,
        [WIZARD_MANA_LIMIT_BREAK_READY]: true,
        [WIZARD_MANA_LIMIT_BREAK_USED]: true,
        [`${WIZARD_SIGNATURE_USED_PREFIX}Astromancy`]: true,
      },
      sheetFeatureSelections: {
        [WIZARD_SIGNATURE_ACTIVE]: 'Astromancy',
        [WIZARD_PREPARED_ACTIVE]: 'Blink',
        [WIZARD_SIGIL_TAGS]: 'Astromancy|Teleportation',
        [WIZARD_HEX_ACTIVE]: 'Reaping Hex',
      },
      sheetFeatureCounters: { [WIZARD_SIGIL_DIAMETER]: 2 },
    };
    expect(characterSheetEffects(hero)).toMatchObject({ areaDefense: 16, resistances: ['Dazed Condition'] });
    const quick = completeCharacterRest(hero, 'Quick', 0);
    expect(quick.build?.sheetFeatureStates[WIZARD_SIGIL_ACTIVE]).toBe(false);
    expect(quick.build?.sheetFeatureStates[WIZARD_HEX_PENDING]).toBe(false);
    expect(quick.build?.sheetFeatureStates[`${WIZARD_SIGNATURE_USED_PREFIX}Astromancy`]).toBe(true);
    expect(quick.build?.sheetFeatureSelections[WIZARD_HEX_ACTIVE]).toBeUndefined();
    const long = completeCharacterRest(hero, 'Long', 0);
    expect(long.build?.sheetFeatureStates[`${WIZARD_SIGNATURE_USED_PREFIX}Astromancy`]).toBeUndefined();
    expect(long.build?.sheetFeatureSelections[WIZARD_PREPARED_ACTIVE]).toBeUndefined();
  });

  it('includes every published Wizard subclass feature with honest level metadata', () => {
    expect(wizard.subclasses).toEqual(['Portal Mage', 'Witch', 'Paragon']);
    expect(new Set(wizard.choiceGroups.map(({ id }) => id)).size).toBe(wizard.choiceGroups.length);
    expect(wizard.subclassFeatures['Portal Mage'].map(({ name, level }) => [name, level])).toEqual([
      ['Portal Magic', 3], ['Portal Sage (Flavor Feature)', 3],
    ]);
    expect(wizard.subclassFeatures.Witch.map(({ name, level }) => [name, level])).toEqual([
      ['Coven’s Gift', 3], ['Hex Enhancements', 3], ['Curse Expert (Flavor Feature)', 3],
    ]);
    expect(wizard.subclassFeatures.Paragon.map(({ name, level }) => [name, level])).toEqual([
      ['Paragon Subclass', 3], ['Novice Paragon', 3], ['Jack of one Trade (Flavor Feature)', 3], ['Expert Paragon', 7], ['Master Paragon', 10],
    ]);
  });
});

describe('Psion v2 Beta 0.9 source audit', () => {
  const feature = (level: number, name: string) => psion.features.find((entry) => entry.level === level)?.features.find((entry) => entry.name === name)?.description;

  it('matches every published value in the level 1-10 Psion Class Table', () => {
    expect(psion.tableRows).toEqual([
      { level: 1, stamina: 1, mana: 3, cantrips: 2, spells: 3, features: 'Class Features' },
      { level: 2, attribute: 1, features: 'Class Feature, Talent' },
      { level: 3, skill: 1, mana: 1, spells: 1, features: 'Subclass Feature' },
      { level: 4, attribute: 1, features: 'Talent, 2 Ancestry Points' },
      { level: 5, attribute: 1, skill: 2, mana: 1, cantrips: 1, features: 'Class Feature' },
      { level: 6, skill: 1, stamina: 1, mana: 1, spells: 1, features: 'Subclass Feature' },
      { level: 7, attribute: 1, features: 'Talent, 2 Ancestry Points' },
      { level: 8, skill: 1, mana: 1, cantrips: 1, features: 'Class Capstone Feature' },
      { level: 9, attribute: 1, mana: 1, spells: 1, features: 'Subclass Capstone Feature' },
      { level: 10, attribute: 1, skill: 2, features: 'Epic Boon, Talent' },
    ]);
    expect(classTableTotals(psion, 10)).toEqual({
      attribute: 6, skill: 7, trade: 0, stamina: 2, mana: 8, spells: 6, cantrips: 4, maneuvers: 0,
    });
    expect(talentSlots('Psion', 10)).toBe(4);
    expect(classPathProgressionLevels('Psion', 10)).toEqual([]);
  });

  it('preserves the published spellcasting, equipment, and complete level 1-2 wording', () => {
    expect(psion.pathDetails).toBe('Combat Training: Light Armor\n\nSpell List: When you learn a new Spell, you can choose any Spell with the Psychic or Gravity Spell Tags, or from the following Schools of Magic: Divination, Enchantment, Illusion, or Protection.\n\nCantrips Known: The number of Cantrips you know increases as shown in the Cantrips Known column of the Psion Class Table. Cantrips are Spells with the Cantrip Spell Tag.\n\nSpells Known: The number of Spells you know increases as shown in the Spells Known column of the Psion Class Table. These can be Spells with or without the Cantrip Spell Tag.\n\nMana Points: Your maximum number of Mana Points increases as shown in the Mana Points column of the Psion Class Table.\n\nStamina Points: Your maximum number of Stamina Points increases as shown in the Stamina Points column of the Psion Class Table.');
    expect(psion.startingEquipment.description).toBe('• 1 Light Weapon\n• 1 set of Novice Light Armor\n• X or Y “Packs” (Adventure Packs Coming Soon)');
    expect(feature(1, 'Psion Stamina')).toBe('You regain 1 SP when at least 1 creature fails a Mental Save you impose.');
    expect(feature(1, 'Psionic Mind')).toBe('Your training in the Psionic arts have granted you the following benefits:\n• You learn the Psi Bolt Cantrip.\n• You can spend SP on AP Enhancements.\n• When you make a Physical Save, you can spend 1 SP to make a Mental Save instead.\n\nPsionic Spell\nYou gain the following Spell Enhancements which you can use on any Spell you cast.\n• Daze: (1 AP) Mental Save. Failure: The target becomes Dazed (DisADV on Mental Checks) on the next Mental Check it makes before the end of your next turn.\n• Disruption: (1 AP) Mental Save. Failure: The target loses their Concentration.\n• Psionic: (1 MP) The Spell doesn’t require Verbal or Somatic Components.');
    expect(feature(1, 'Telekinesis')).toBe('You gain Telekinesis which grants you the ability to interact with things using only your mind. Your Telekinesis has a range of 5 Spaces. You can only interact with 1 object or creature using Telekinesis at a time, and the effect ends on a target when it’s beyond your range.\n\nYou can perform any Action with your Telekinesis that you could normally perform using a hand, such as the Object, Shove, and Grapple Actions. When you perform an Action using your Telekinesis, your Size is considered Medium and you make a Spell Check instead of the normal Check for the Action.\n\nObject: You can use your Telekinesis to pick up and hold an unheld and unsecured object that weighs up to 100lbs (45kg). Once on each of your turns, you can freely move an object held by your Telekinesis to another Space within range.\n\nShove: You can Shove another creature in any direction of your choice. If you Shove a creature vertically, the distance is halved.\n\nGrapple: When you perform a Grapple using Telekinesis, you can move normally while maintaining the Grapple, but the target doesn’t move with you unless you choose to drag it (following the normal rules for dragging a Grappled creature).\n\nGrapple Maneuvers: You can perform any Grapple Maneuver of your choice using Telekinesis, even if you don’t know it. When you do, they’re subjected to the following changes:\n\n• Body Block Maneuver: You, or the attacker, must be within 1 Space of the target.\n• Throw Maneuver: You can use your Prime Modifier instead of Might to determine the distance thrown, and the creature is thrown from its Space instead of yours.');
    expect(feature(1, 'Telepathy (Flavor Feature)')).toBe('You can communicate telepathically with any creature you can see within 10 Spaces. If it understands at least 1 Language it can respond to you telepathically.');
    expect(feature(2, 'Mind Sense')).toContain('For 1 minute, you know the location of any creature with an Intelligence of -3 or higher within range (even through Full Cover) and Psychic damage you deal to them increases by 1.');
    expect(feature(2, 'Mind Sense')).toContain('Read Emotions: Make a Spell Check contested by the target’s Charisma Save.');
    expect(feature(2, 'Mind Sense')).toContain('Read Thoughts: Make a Spell Check contested by the target’s Intelligence Save.');
    expect(feature(2, 'Talent')).toBe('You gain 1 Talent of your choice. If the Talent has any prerequisites, you must meet those prerequisites to choose that Talent.');
  });

  it('maps the legacy spell list to the current catalog without requiring a Spell Source', () => {
    const spell = (school: string, tags = '', source = 'Arcane') => ({ school, tags, source });
    expect(spellIsAvailableToClass('Psion', spell('Elemental', 'Psychic', 'Divine'))).toBe(true);
    expect(spellIsAvailableToClass('Psion', spell('Astromancy', 'Gravity', 'Primal'))).toBe(true);
    expect(spellIsAvailableToClass('Psion', spell('Divination', '', 'Divine'))).toBe(true);
    expect(spellIsAvailableToClass('Psion', spell('Enchantment', '', 'Primal'))).toBe(true);
    expect(spellIsAvailableToClass('Psion', spell('Conjuration', 'Illusion', 'Primal'))).toBe(true);
    expect(spellIsAvailableToClass('Psion', spell('Nullification', '', 'Arcane'))).toBe(true);
    expect(spellIsAvailableToClass('Psion', spell('Elemental', 'Fire', 'Arcane'))).toBe(false);
  });

  it('grants Psi Bolt separately and ignores stale Path Progression from older saves', () => {
    const hero = character('Psion');
    hero.level = 2;
    hero.build = { ...defaultBuild(), pathProgressionChoices: { 2: 'Spellcaster' } };
    expect(grantedClassSpellNames(hero)).toEqual(['Psi Bolt']);
    expect(characterCombatTraining(hero, psion, reference.ancestryTraits)).toMatchObject({
      categories: ['Light Armor'],
      weaponTraining: false,
      spellFocusTraining: false,
      lightArmorTraining: true,
      heavyArmorTraining: false,
      lightShieldTraining: false,
      heavyShieldTraining: false,
    });
    const derived = deriveCharacter(hero, psion, reference.ancestryTraits, []);
    expect(derived.maxStamina).toBe(1);
    expect(derived.maxMana).toBe(3);
    expect(derived.spellLimit).toBe(3);
    expect(derived.cantripLimit).toBe(2);
  });

  it('routes Psion Stamina and clears minute-long or pending live effects on rest', () => {
    expect(psionStaminaAfterMentalSaveFailure(0, 2)).toBe(1);
    expect(psionStaminaAfterMentalSaveFailure(2, 2)).toBe(2);
    const hero = character('Psion');
    hero.build = {
      ...defaultBuild(),
      sheetFeatureStates: {
        [PSION_MIND_SENSE_ACTIVE]: true,
        [PSION_DAZE_PENDING]: true,
        [PSION_DISRUPTION_PENDING]: true,
        [PSION_COMPONENTLESS_PENDING]: true,
      },
      sheetFeatureSelections: { [PSION_INVASION_ACTIVE]: 'Read Emotions' },
      sheetFeatureCounters: { [PSION_AP_ENHANCEMENT_SP]: 2 },
    };
    const rested = completeCharacterRest(hero, 'Quick', 0);
    expect(rested.build?.sheetFeatureStates).toMatchObject({
      [PSION_MIND_SENSE_ACTIVE]: false,
      [PSION_DAZE_PENDING]: false,
      [PSION_DISRUPTION_PENDING]: false,
      [PSION_COMPONENTLESS_PENDING]: false,
    });
    expect(rested.build?.sheetFeatureSelections[PSION_INVASION_ACTIVE]).toBeUndefined();
    expect(rested.build?.sheetFeatureCounters[PSION_AP_ENHANCEMENT_SP]).toBeUndefined();
  });

  it('keeps unpublished level 3-10 class and subclass rules explicitly marked as undeveloped', () => {
    expect(psion.subclasses).toEqual([]);
    expect(psion.features.find(({ level }) => level === 3)?.features[0].name).toBe('Subclass Feature — Not Yet Developed');
    expect(psion.features.find(({ level }) => level === 5)?.features[0].name).toBe('Class Feature — Not Yet Developed');
    expect(psion.features.find(({ level }) => level === 8)?.features[0].name).toBe('Class Capstone Feature — Not Yet Developed');
    expect(psion.features.find(({ level }) => level === 9)?.features[0].name).toBe('Subclass Capstone Feature — Not Yet Developed');
  });
});
