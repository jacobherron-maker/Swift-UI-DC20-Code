import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Character, Encounter, Monster } from '../types/models';
import { MonsterRoleValues, MonsterTypeValues } from '../types/models';
import {
  combatFromEncounter,
  combatantFromMonster,
  createCustomMonster,
  encounterMetrics,
  getMonsterRecommendation,
  monsterBudget,
  monsterDisplayRole,
  partyReadinessMetrics,
  synchronizeCombatant,
  synchronizeEncounterPartyCharacters,
} from './monsterRules';

describe('Monster Collection builder defaults', () => {
  it('matches the level 1 Standard Soldier baseline', () => {
    expect(getMonsterRecommendation(1, MonsterTypeValues.STANDARD, MonsterRoleValues.SOLDIER)).toEqual({
      hp: 13,
      physicalDefense: 12,
      arcaneDefense: 12,
      attack: 4,
      save: 14,
      damage: 0.5,
      prime: 3,
      mastery: 1,
      traits: 6,
    });
  });

  it('applies type and role multipliers in the native app order', () => {
    const result = getMonsterRecommendation(1, MonsterTypeValues.LEGENDARY, MonsterRoleValues.TACTICIAN);
    expect(result.hp).toBe(39);
    expect(result.damage).toBe(0.5);
    expect(result.traits).toBe(14);
    expect(createCustomMonster(1, MonsterTypeValues.LEGENDARY, MonsterRoleValues.TACTICIAN)).toMatchObject({
      actionPoints: 4,
      reactionPoints: 6,
    });
  });

  it('uses the DC20 encounter budget multiplier for each monster type', () => {
    expect(monsterBudget(createCustomMonster(0, MonsterTypeValues.MINION))).toBe(0.25);
    expect(monsterBudget(createCustomMonster(4, MonsterTypeValues.STANDARD))).toBe(4);
    expect(monsterBudget(createCustomMonster(4, MonsterTypeValues.EPIC))).toBe(8);
    expect(monsterBudget(createCustomMonster(4, MonsterTypeValues.LEGENDARY))).toBe(16);
  });
});

describe('encounter and combat interoperability', () => {
  const monster = createCustomMonster(1, MonsterTypeValues.LEGENDARY, MonsterRoleValues.TACTICIAN, 'Void Stalker');
  const encounter: Encounter = {
    id: 'encounter-1',
    name: 'At the Violet Gate',
    partyLevels: [1, 1, 1, 1],
    entries: [{ id: 'entry-1', monster, count: 2 }],
    notes: 'The gate pulses each round.',
  };

  it('calculates all difficulty thresholds using party average level', () => {
    expect(encounterMetrics(encounter)).toMatchObject({
      easyBudget: 3,
      mediumBudget: 4,
      hardBudget: 5,
      veryHardBudget: 6,
      deadlyBudget: 8,
      monsterBudget: 8,
      difficulty: 'Deadly',
    });
  });

  it('treats an encounter with no party and no monsters as easy instead of deadly', () => {
    expect(encounterMetrics({ ...encounter, partyLevels: [], entries: [] }).difficulty).toBe('Easy');
  });

  it('expands encounter counts into linked, uniquely named combatants', () => {
    const combat = combatFromEncounter(encounter);
    expect(combat.sourceEncounterID).toBe(encounter.id);
    expect(combat.combatants.map(({ name }) => name)).toEqual(['Void Stalker 1', 'Void Stalker 2']);
    expect(combat.combatants.every(({ sourceMonsterID }) => sourceMonsterID === monster.id)).toBe(true);
  });

  it('counts connected party characters and carries their live source into combat', () => {
    const character = {
      id: 'hero-id',
      name: 'Oak',
      level: 3,
      healthPoints: 14,
      maxHealthPoints: 18,
      currentAP: 3,
      maxAP: 4,
      stamina: 1,
      maxStamina: 2,
      manaPoints: 4,
      maxManaPoints: 6,
      physicalDefense: 14,
      arcaneDefense: 12,
      primeModifier: 3,
      combatMastery: 2,
      speed: 5,
    } as Character;
    const connectedEncounter: Encounter = {
      ...encounter,
      partyLevels: [],
      partyCharacters: [{
        id: 'party-entry',
        partyId: 'party-id',
        memberId: 'player-id',
        partyName: 'The Verdant Company',
        memberName: 'Player',
        character,
      }],
    };

    expect(encounterMetrics(connectedEncounter).mediumBudget).toBe(3);
    expect(combatFromEncounter(connectedEncounter).combatants[0]).toMatchObject({
      name: 'Oak',
      hp: 14,
      sourceCharacterID: undefined,
      sourcePartyCampaignID: 'party-id',
      sourcePartyMemberID: 'player-id',
    });
    expect(partyReadinessMetrics(connectedEncounter)).toEqual({
      characterCount: 1,
      currentHP: 14,
      maxHP: 18,
      currentStamina: 1,
      maxStamina: 2,
      currentMana: 4,
      maxMana: 6,
      currentAP: 3,
      maxAP: 4,
    });

    const refreshedCharacter = { ...character, healthPoints: 7, stamina: 0 };
    const synchronized = synchronizeEncounterPartyCharacters(connectedEncounter, [{
      partyId: 'party-id',
      partyName: 'The Verdant Company',
      memberId: 'player-id',
      memberName: 'Player',
      character: refreshedCharacter,
    }]);
    expect(synchronized.partyCharacters?.[0].character).toBe(refreshedCharacter);
    expect(combatFromEncounter(synchronized).combatants[0].hp).toBe(7);
  });

  it('preserves spent resources while synchronizing changed custom monster stats', () => {
    const combatant = {
      ...combatantFromMonster(monster, 'Void Stalker 2'),
      hp: monster.hp - 7,
      ap: 2,
      currentReactionPoints: 4,
    };
    const updated: Monster = { ...monster, name: 'Astral Stalker', hp: 50, actionPoints: 5, reactionPoints: 8 };
    expect(synchronizeCombatant(combatant, updated, monster.name)).toMatchObject({
      name: 'Astral Stalker 2',
      maxHP: 50,
      hp: 43,
      maxAP: 5,
      ap: 3,
      reactionPoints: 8,
      currentReactionPoints: 6,
    });
  });
});

describe('audited sourcebook library', () => {
  it('contains the complete Monster Collection v0.1 roster with stable source metadata', () => {
    const libraryPath = fileURLToPath(new URL('../../public/data/MonsterSourceLibrary.json', import.meta.url));
    const monsters = JSON.parse(readFileSync(libraryPath, 'utf8')) as Monster[];
    const collection = monsters.filter(({ sourceBook }) => sourceBook === 'DC20 Monster Collection v0.1');
    expect(monsters).toHaveLength(31);
    expect(new Set(monsters.map(({ id }) => id)).size).toBe(monsters.length);
    expect(monsters[0].name).toBe('Angelic Herald');
    expect(monsters.at(-1)?.name).toBe('Zombie');
    expect(monsters.every(({ sourceBook, abilities }) => Boolean(sourceBook) && Array.isArray(abilities))).toBe(true);
    expect(collection.map(({ name }) => name)).toEqual([
      'Angelic Herald',
      'Animated Armor',
      'Animated Doll',
      'Bandit',
      'Bandit Captain',
      'Brown Bear',
      'Cherub',
      'Earth Tortoise',
      'Fairy Dragon',
      'Fiendish Harbinger',
      'Fire Lizard',
      'Ghost',
      'Honey Ooze',
      'Ice Raven',
      'Imp',
      'Juvenile Purple Drake',
      'Mandrake',
      'Manticore',
      'Mantrap Bloom',
      'Molten Glass Ooze',
      'Ogre Warrior',
      'Pixie',
      'Skeleton Warrior',
      'Small Mimic',
      'Sprite',
      'Storm Elemental',
      'Swarm of Bats',
      'Wolf',
      'Wyvern',
      'Zombie',
    ]);
    expect(collection.every(({ sourcePage }) => sourcePage !== undefined && sourcePage >= 16 && sourcePage <= 37)).toBe(true);
    expect(collection.find(({ name }) => name === 'Angelic Herald')).toMatchObject({
      descriptionText: 'Humanoid celestials with skin tones ranging from bronze to gold, four large, feathered wings, and shining with a bright halo, Angelic Heralds wear elegant robes with golden adornments and wield long, golden spears.',
      tactics: expect.stringContaining('They expose their foes with their Radiant Aura'),
      lore: expect.stringContaining('The Heralds are the first line of offense in angelic armies.'),
    });
    expect(collection.find(({ name }) => name === 'Animated Armor')?.abilities).toContainEqual(expect.objectContaining({
      name: 'Pathcarver',
      details: expect.stringContaining('Area Martial Attack vs AD, 4 Space Line'),
    }));
    expect(collection.filter(({ speedType }) => speedType === 'Fly').map(({ name }) => name)).toEqual([
      'Angelic Herald',
      'Cherub',
      'Fairy Dragon',
      'Ghost',
      'Ice Raven',
      'Imp',
      'Pixie',
      'Sprite',
      'Storm Elemental',
      'Swarm of Bats',
      'Wyvern',
    ]);
    expect(collection.find(({ name }) => name === 'Storm Elemental')?.otherSpeeds).toBe('');
    expect(collection.find(({ name }) => name === 'Swarm of Bats')?.otherSpeeds).toBe('');
  });

  it('includes all ten Beta Bestiary Vol. 4 monsters with complete encounter metadata', () => {
    const libraryPath = fileURLToPath(new URL('../../public/data/BetaBestiaryVol4.json', import.meta.url));
    const monsters = JSON.parse(readFileSync(libraryPath, 'utf8')) as Monster[];
    expect(monsters.map(({ name }) => name)).toEqual([
      'Arcane Tome',
      'Boulder Drake',
      'Divine Justiciar',
      'Drakus',
      'Formacyde Soldier',
      'Lifeleech',
      'Poison Puddle',
      'Starfly Swarm',
      'Unicorn',
      'Yeti Hunter',
    ]);
    expect(new Set(monsters.map(({ id }) => id)).size).toBe(10);
    expect(monsters.every((monster) => (
      monster.sourceBook === 'DC20 Magazine 21: Beta Bestiary Vol. 4'
      && Boolean(monster.sourcePage)
      && monster.actionPoints === 4
      && monster.abilities.length > 0
    ))).toBe(true);
    expect(monsters.find(({ name }) => name === 'Arcane Tome')).toMatchObject({
      type: MonsterTypeValues.EPIC,
      role: MonsterRoleValues.TACTICIAN,
      reactionPoints: 3,
    });
    expect(monsters.find(({ name }) => name === 'Divine Justiciar')).toMatchObject({
      type: MonsterTypeValues.LEGENDARY,
      role: MonsterRoleValues.BRUTE,
      reactionPoints: 6,
    });
  });

  it('includes all eleven Beta Bestiary Vol. 3 monsters, including the unlisted Screecher Drone', () => {
    const libraryPath = fileURLToPath(new URL('../../public/data/BetaBestiaryVol3.json', import.meta.url));
    const monsters = JSON.parse(readFileSync(libraryPath, 'utf8')) as Monster[];
    expect(monsters.map(({ name }) => name)).toEqual([
      'Oculoth',
      'Screecher Drone',
      'Mawworm',
      'Marrow Reaper Spider',
      'Psymanta',
      'Aqua Ooze',
      'Toxic Slime',
      'Crimson Ooze',
      'Plant Shambler',
      'Carnivorous Bloom',
      'Sporebloom Trap',
    ]);
    expect(new Set(monsters.map(({ id }) => id)).size).toBe(11);
    expect(new Set(monsters.flatMap(({ abilities }) => abilities.map(({ id }) => id))).size).toBe(76);
    expect(monsters.every((monster) => (
      monster.sourceBook === 'DC20 Magazine 17: Beta Bestiary Vol. 3'
      && monster.sourcePage !== undefined
      && monster.sourcePage >= 3
      && monster.sourcePage <= 13
      && monster.type === MonsterTypeValues.STANDARD
      && monster.actionPoints === 4
      && monster.abilities.length > 0
    ))).toBe(true);
    expect(monsters.find(({ name }) => name === 'Oculoth')).toMatchObject({
      role: MonsterRoleValues.STRIKER,
      publishedRole: 'Lurker',
      speed: 7,
      speedType: 'Fly',
    });
    expect(monsterDisplayRole(monsters.find(({ name }) => name === 'Oculoth')!)).toBe('Lurker');
    expect(monsterDisplayRole(createCustomMonster())).toBe(MonsterRoleValues.SOLDIER);
    expect(monsters.find(({ name }) => name === 'Psymanta')).toMatchObject({
      role: MonsterRoleValues.SOLDIER,
      publishedRole: 'Skirmisher',
      speedType: 'Hover',
    });
    expect(monsters.find(({ name }) => name === 'Plant Shambler')?.notes).toContain('Photosynthetic Rage');
    expect(monsters.find(({ name }) => name === 'Toxic Slime')?.notes).toContain('Mini Toxic Slime');
    expect(monsters.find(({ name }) => name === 'Sporebloom Trap')?.notes).toContain('Hallucinating Spores');
  });

  it('includes the complete Strong and Simple Monsters roster and its special mechanics', () => {
    const libraryPath = fileURLToPath(new URL('../../public/data/StrongSimpleMonsters.json', import.meta.url));
    const monsters = JSON.parse(readFileSync(libraryPath, 'utf8')) as Monster[];
    expect(monsters.map(({ name }) => name)).toEqual([
      'Animated Hut',
      'Bloated Zombie',
      'Dire Viper',
      'Divine Conduit',
      'Dune Beast',
      'Ettin Knight',
      'Giant Webspitter',
      'Paladin Commander',
      'Psionic Squidling',
      'Shadow Guardian',
      'Skeleton Sharpshooter',
      'Yeti Frostrager',
    ]);
    expect(new Set(monsters.map(({ id }) => id)).size).toBe(12);
    expect(monsters.every((monster) => (
      monster.sourceBook === 'DC20 Magazine 25: Strong and Simple Monsters'
      && Boolean(monster.sourcePage)
      && monster.type === MonsterTypeValues.STANDARD
      && monster.actionPoints === 4
      && monster.reactionPoints === 0
      && monster.abilities.length > 0
    ))).toBe(true);
    expect(monsters.find(({ name }) => name === 'Psionic Squidling')).toMatchObject({
      speed: 5,
      speedType: 'Hover',
      immunities: 'Psychic (Absorb)',
    });
    expect(monsters.find(({ name }) => name === 'Bloated Zombie')?.abilities).toContainEqual(expect.objectContaining({
      name: 'Death Burst',
      cost: 'Auto',
    }));
  });

  it('includes the Badger summoned by Bag of Badger Beads', () => {
    const libraryPath = fileURLToPath(new URL('../../public/data/MagicalConsumablesMonsters.json', import.meta.url));
    const monsters = JSON.parse(readFileSync(libraryPath, 'utf8')) as Monster[];
    expect(monsters).toHaveLength(1);
    expect(monsters[0]).toMatchObject({
      name: 'Badger',
      type: MonsterTypeValues.MINION,
      role: MonsterRoleValues.SOLDIER,
      hp: 2,
      actionPoints: 2,
      sourceBook: 'DC20 Magazine 24: Magical Consumables',
      sourcePage: 7,
    });
    expect(monsters[0].abilities.map(({ name }) => name)).toEqual(['Keen Smell', 'Bite or Scratch', 'Snarl']);
  });
});
