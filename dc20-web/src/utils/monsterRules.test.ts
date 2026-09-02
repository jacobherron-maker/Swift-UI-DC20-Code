import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Encounter, Monster } from '../types/models';
import { MonsterRoleValues, MonsterTypeValues } from '../types/models';
import {
  combatFromEncounter,
  combatantFromMonster,
  createCustomMonster,
  encounterMetrics,
  getMonsterRecommendation,
  monsterBudget,
  synchronizeCombatant,
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

  it('expands encounter counts into linked, uniquely named combatants', () => {
    const combat = combatFromEncounter(encounter);
    expect(combat.sourceEncounterID).toBe(encounter.id);
    expect(combat.combatants.map(({ name }) => name)).toEqual(['Void Stalker 1', 'Void Stalker 2']);
    expect(combat.combatants.every(({ sourceMonsterID }) => sourceMonsterID === monster.id)).toBe(true);
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
  it('contains the complete exported native library with stable unique IDs', () => {
    const libraryPath = fileURLToPath(new URL('../../public/data/MonsterSourceLibrary.json', import.meta.url));
    const monsters = JSON.parse(readFileSync(libraryPath, 'utf8')) as Monster[];
    expect(monsters).toHaveLength(31);
    expect(new Set(monsters.map(({ id }) => id)).size).toBe(monsters.length);
    expect(monsters[0].name).toBe('Angelic Herald');
    expect(monsters.at(-1)?.name).toBe('Zombie');
    expect(monsters.every(({ sourceBook, abilities }) => Boolean(sourceBook) && Array.isArray(abilities))).toBe(true);
  });
});
