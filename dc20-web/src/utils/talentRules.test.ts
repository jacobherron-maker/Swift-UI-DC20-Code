import { describe, expect, it } from 'vitest';
import referenceDocument from '../../public/data/CharacterReference.json';
import rulesDocument from '../../public/data/RulesReference.json';
import type { Character, CharacterReferenceData, RulesReferenceData } from '../types/models';
import {
  accessibleAncestryNames,
  ancestryPointBudget,
  classChoiceSelectionLimit,
  defaultBuild,
  deriveCharacter,
  equippedCombatModifiers,
  grantedClassLanguageLevels,
  grantedClassSpellNames,
  paragonTalentSlotClasses,
  SORCERER_OVERLOAD_ACTIVE,
} from './characterRules';
import {
  MULTICLASS_SELECTION_KEYS,
  auditedTalentRuleEntry,
  multiclassChoiceIsValid,
  multiclassTalentOptions,
  ownedClassFeatures,
  talentByName,
  talentDefinitions,
  talentEligibility,
} from './talentRules';

const reference = referenceDocument as CharacterReferenceData;
const rules = rulesDocument as RulesReferenceData;

function hero(className = 'Barbarian', level = 1): Character {
  return {
    id: 'talent-hero', name: 'Talent Hero', level, ancestry: 'Human', class: className,
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

describe('audited Talent catalog and prerequisites', () => {
  it('contains every unique published Talent with source repeatability', () => {
    const talents = talentDefinitions(reference);
    expect(talents).toHaveLength(45);
    expect(new Set(talents.map(({ name }) => name)).size).toBe(45);
    expect(talents.filter(({ isRepeatable }) => !isRepeatable).map(({ name }) => name).sort()).toEqual([
      'Expanded Repertoire', 'Martial Expansion', 'Spellcasting Expansion',
    ]);
    expect(talentByName(reference, 'Master Multiclass')?.description).toContain('Level 7 Subclass Expert Feature');
    expect(talentByName(reference, 'Sling-Blade')?.requirements).toEqual(['Bound Weapon', 'Spellstrike']);
  });

  it('keeps every General and Class Talent description identical across builder and Rules data', () => {
    const rulesByTitle = new Map(rules.entries
      .filter(({ kind }) => kind === 'Talent')
      .map((entry) => [entry.title, entry.text]));
    const publishedTalents = talentDefinitions(reference).filter(({ category }) => category !== 'Multiclass');
    expect(publishedTalents).toHaveLength(41);
    publishedTalents.forEach((talent) => expect(talent.description).toBe(rulesByTitle.get(talent.name)));
  });

  it('locks Class Talents until every feature and level prerequisite is owned', () => {
    const barbarian = hero('Barbarian', 2);
    const unfathomable = talentByName(reference, 'Unfathomable Strength')!;
    expect(talentEligibility(unfathomable, barbarian, reference)).toEqual({ available: false, reason: 'Requires Level 3.' });
    barbarian.level = 3;
    expect(talentEligibility(unfathomable, barbarian, reference).available).toBe(true);

    const expandedMeta = talentByName(reference, 'Expanded Meta Magic')!;
    expect(talentEligibility(expandedMeta, barbarian, reference).reason).toContain('Sorcerer Class Feature');
    barbarian.level = 4;
    barbarian.build!.selectedTalents = ['Novice Multiclass', 'Adept Multiclass'];
    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Novice Multiclass']] = ['novice|Sorcerer|Innate Power'];
    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Adept Multiclass']] = ['adept|Sorcerer|Meta Magic'];
    expect(talentEligibility(expandedMeta, barbarian, reference).available).toBe(true);
  });

  it('offers only real non-Flavor Class Features and blocks duplicates', () => {
    const barbarian = hero('Barbarian', 2);
    barbarian.build!.selectedTalents = ['Novice Multiclass'];
    const options = multiclassTalentOptions('Novice Multiclass', barbarian, reference);
    expect(options.some(({ className }) => className === 'Barbarian')).toBe(false);
    expect(options.some(({ title }) => /Flavor|Talent|Path Progression/.test(title))).toBe(false);
    expect(options.some(({ id }) => id === 'novice|Bard|Remarkable Repertoire')).toBe(true);

    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Novice Multiclass']] = ['novice|Bard|Remarkable Repertoire'];
    expect(multiclassTalentOptions('Novice Multiclass', barbarian, reference)
      .some(({ id }) => id === 'novice|Bard|Remarkable Repertoire')).toBe(false);
  });

  it('grants automatic Flavor Features after two Features from the same Class', () => {
    const barbarian = hero('Barbarian', 4);
    barbarian.build!.selectedTalents = ['Novice Multiclass', 'Adept Multiclass'];
    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Novice Multiclass']] = ['novice|Bard|Remarkable Repertoire'];
    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Adept Multiclass']] = ['adept|Bard|Bardic Performance'];
    const bardFeatures = ownedClassFeatures(barbarian, reference).filter(({ className }) => className === 'Bard');
    expect(bardFeatures.map(({ name }) => name)).toEqual(expect.arrayContaining([
      'Remarkable Repertoire', 'Bardic Performance', 'Crowd Pleaser (Flavor Feature)',
    ]));
    expect(bardFeatures.find(({ name }) => name.includes('Crowd Pleaser'))?.source).toBe('Multiclass Flavor');
  });

  it('enforces Expert and Master Multiclass dependencies', () => {
    const barbarian = hero('Barbarian', 8);
    barbarian.build!.selectedTalents = ['Novice Multiclass', 'Expert Multiclass'];
    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Novice Multiclass']] = ['novice|Bard|Font of Inspiration'];
    let expertOptions = multiclassTalentOptions('Expert Multiclass', barbarian, reference);
    expect(expertOptions.some(({ id }) => id === 'expert-subclass|Bard|Paragon')).toBe(true);
    expect(expertOptions.some(({ className }) => className === 'Wizard')).toBe(false);
    barbarian.build!.classFeatureSelections[MULTICLASS_SELECTION_KEYS['Expert Multiclass']] = ['expert-subclass|Bard|Paragon'];
    barbarian.build!.selectedTalents.push('Master Multiclass');
    const masterOptions = multiclassTalentOptions('Master Multiclass', barbarian, reference);
    expect(masterOptions.map(({ id }) => id)).toContain('master-subclass|Bard|Paragon');
    expect(multiclassChoiceIsValid('Master Multiclass', 'master-subclass|Wizard|Witch', barbarian, reference)).toBe(false);
  });

  it('routes Paragon subclass Talent slots and trade training through Expert and Master Multiclass', () => {
    const barbarian = hero('Barbarian', 8);
    const baseline = deriveCharacter(
      barbarian,
      reference.classes.find(({ name }) => name === 'Barbarian')!,
      reference.ancestryTraits,
      [],
    );
    barbarian.build!.selectedTalents = ['Novice Multiclass', 'Expert Multiclass', 'Master Multiclass'];
    barbarian.build!.classFeatureSelections = {
      [MULTICLASS_SELECTION_KEYS['Novice Multiclass']]: ['novice|Bard|Font of Inspiration'],
      [MULTICLASS_SELECTION_KEYS['Expert Multiclass']]: ['expert-subclass|Bard|Paragon'],
      [MULTICLASS_SELECTION_KEYS['Master Multiclass']]: ['master-subclass|Bard|Paragon'],
    };
    expect(paragonTalentSlotClasses(barbarian)).toEqual(['Bard', 'Bard']);
    expect(deriveCharacter(
      barbarian,
      reference.classes.find(({ name }) => name === 'Barbarian')!,
      reference.ancestryTraits,
      [],
    ).tradePointBudget).toBe(baseline.tradePointBudget + 1);
  });

  it('routes multiple Sorcerer subclass origins acquired through Multiclass', () => {
    const barbarian = hero('Barbarian', 8);
    barbarian.build!.selectedTalents = ['Novice Multiclass', 'Adept Multiclass', 'Expert Multiclass', 'Expert Multiclass'];
    barbarian.build!.classFeatureSelections = {
      [MULTICLASS_SELECTION_KEYS['Novice Multiclass']]: ['novice|Sorcerer|Innate Power'],
      [MULTICLASS_SELECTION_KEYS['Adept Multiclass']]: ['adept|Sorcerer|Meta Magic'],
      [MULTICLASS_SELECTION_KEYS['Expert Multiclass']]: [
        'expert-subclass|Sorcerer|Angelic',
        'expert-subclass|Sorcerer|Draconic',
      ],
      'sorcerer.celestialLanguage': ['Celestial'],
      'sorcerer.draconicLanguage': ['Draconic'],
    };
    expect([...accessibleAncestryNames(barbarian, reference.ancestryTraits)]).toEqual(expect.arrayContaining([
      'Angelborn', 'Dragonborn',
    ]));
    expect(ancestryPointBudget(barbarian)).toBe(13);
    expect(grantedClassLanguageLevels(barbarian)).toEqual({ Celestial: 1, Draconic: 1 });
    expect(classChoiceSelectionLimit(
      reference.classes.find(({ name }) => name === 'Sorcerer')!.choiceGroups
        .find(({ id }) => id === 'sorcerer.metaMagic')!,
      barbarian,
    )).toBe(4);
  });

  it('routes Remarkable Repertoire skill points and Magical Secrets mechanically', () => {
    const barbarian = hero('Barbarian', 2);
    barbarian.build!.selectedTalents = ['Novice Multiclass'];
    barbarian.build!.classFeatureSelections = {
      [MULTICLASS_SELECTION_KEYS['Novice Multiclass']]: ['novice|Bard|Remarkable Repertoire'],
      'bard.expression': ['Auditory'],
      'bard.magicalSecrets': ['Blink', 'Light'],
    };
    const barbarianReference = reference.classes.find(({ name }) => name === 'Barbarian')!;
    const derived = deriveCharacter(barbarian, barbarianReference, reference.ancestryTraits, []);
    expect(derived.skillPointBudget).toBe(7);
    expect(grantedClassSpellNames(barbarian)).toEqual(expect.arrayContaining(['Blink', 'Light']));
  });

  it('routes passive benefits from individually granted multiclass Features', () => {
    const wizard = hero('Wizard', 2);
    const wizardReference = reference.classes.find(({ name }) => name === 'Wizard')!;
    const baseline = deriveCharacter(wizard, wizardReference, reference.ancestryTraits, []);
    wizard.build!.selectedTalents = ['Novice Multiclass', 'Novice Multiclass', 'Novice Multiclass'];
    wizard.build!.classFeatureSelections = {
      [MULTICLASS_SELECTION_KEYS['Novice Multiclass']]: [
        'novice|Monk|Monk Training',
        'novice|Barbarian|Berserker',
        'novice|Spellblade|Spellblade Disciplines',
      ],
      'spellblade.disciplines': ['Magus', 'Warrior'],
    };
    const multiclassed = deriveCharacter(wizard, wizardReference, reference.ancestryTraits, []);
    expect(multiclassed.physicalDefense).toBe(baseline.physicalDefense + 2);
    expect(multiclassed.arcaneDefense).toBe(baseline.arcaneDefense + 2);
    expect(multiclassed.speed).toBe(baseline.speed + 2);
    expect(multiclassed.maxMana).toBe(baseline.maxMana + 1);
    expect(multiclassed.spellLimit).toBe(baseline.spellLimit + 1);
    expect(multiclassed.maneuverLimit).toBe(baseline.maneuverLimit + 1);
  });

  it('applies the live Overload Magic bonus when that Feature comes from Multiclass', () => {
    const wizard = hero('Wizard', 2);
    wizard.build!.selectedTalents = ['Novice Multiclass'];
    wizard.build!.classFeatureSelections = {
      [MULTICLASS_SELECTION_KEYS['Novice Multiclass']]: ['novice|Sorcerer|Overload Magic'],
    };
    wizard.build!.sheetFeatureStates = { [SORCERER_OVERLOAD_ACTIVE]: true };
    const modifiers = equippedCombatModifiers(
      wizard,
      [],
      reference.classes.find(({ name }) => name === 'Wizard')!,
      reference.ancestryTraits,
    );
    expect(modifiers.spellCheckBonus).toBe(5);
    expect(modifiers.spellAttackBonus).toBe(5);
  });

  it('scales repeatable Summoner Talent choices and grants every learned Spell', () => {
    const summoner = hero('Summoner', 6);
    summoner.build!.selectedTalents = ['Creature Specialist', 'Creature Specialist', 'Horde Summoner', 'Horde Summoner'];
    summoner.build!.classFeatureSelections = {
      'summoner.creatureSpecialistSpell': ['Summon Beast', 'Summon Ooze'],
      'summoner.hordeSummons': ['Summon Celestial', 'Summon Construct', 'Summon Fey', 'Summon Fiend'],
    };
    const groups = reference.classes.find(({ name }) => name === 'Summoner')!.choiceGroups;
    expect(classChoiceSelectionLimit(groups.find(({ id }) => id === 'summoner.creatureSpecialistSpell')!, summoner)).toBe(2);
    expect(classChoiceSelectionLimit(groups.find(({ id }) => id === 'summoner.hordeSummons')!, summoner)).toBe(4);
    expect(grantedClassSpellNames(summoner)).toEqual(expect.arrayContaining([
      'Summon Celestial', 'Summon Construct', 'Summon Fey', 'Summon Fiend',
    ]));
  });

  it('repairs Talent source pages, class tags, prerequisites, and repeatability keywords', () => {
    const entry = (title: string) => auditedTalentRuleEntry(rules.entries.find((candidate) => candidate.kind === 'Talent' && candidate.title === title)!);
    expect(entry('Martial Expansion')).toMatchObject({ page: 'Beta 0.10.5 p.186' });
    expect(entry('Helping Hands')).toMatchObject({ page: 'Beta 0.10.5 p.187', characterClass: 'Bard' });
    expect(entry('Sling-Blade')).toMatchObject({ page: 'Beta 0.10.5 p.189', characterClass: 'Spellblade' });
    expect(entry('Creature Specialist')).toMatchObject({ page: 'DC20 Magazine 23 pp.4–5', characterClass: 'Summoner' });
    expect(entry('Master Multiclass')).toMatchObject({ page: 'Beta 0.10.5 p.191' });
    expect(entry('Expanded Boon').keywords).toContain('repeatable');
    expect(entry('Expanded Repertoire').keywords).toContain('once-only');
  });
});
