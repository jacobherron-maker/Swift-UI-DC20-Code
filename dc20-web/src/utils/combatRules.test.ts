import { describe, expect, it } from 'vitest';
import type { Combatant, SavedCombat } from '../types/models';
import { CombatantTeamValues } from '../types/models';
import { advanceCombatTurn, recordCombatChange, resolveDamage, startCombatTurns, undoLastCombatChange } from './combatRules';

function fighter(id: string, name: string, team = CombatantTeamValues.HEROES): Combatant {
  return { id, name, team, maxHP: 12, hp: 12, maxAP: 4, ap: 2, reactionPoints: 1, currentReactionPoints: 0, conditions: [], activeConditions: [], hasActed: false, initiative: 10, turnState: 'Ready' };
}

function combat(combatants: Combatant[]): SavedCombat {
  return { id: 'combat', name: 'Test', combatants, round: 1, firstTeam: CombatantTeamValues.HEROES, notes: '', initiativeMode: 'Individual', initiativeOrder: combatants.map(({ id }) => id), status: 'Active', history: [], undoStack: [] };
}

describe('live combat rules', () => {
  it('sorts, starts, advances, wraps the round, and refreshes turn resources', () => {
    const hero = { ...fighter('hero', 'Hero'), initiative: 18 };
    const enemy = { ...fighter('enemy', 'Enemy', CombatantTeamValues.ENEMIES), initiative: 12 };
    const started = startCombatTurns(combat([enemy, hero]));
    expect(started.initiativeOrder).toEqual(['hero', 'enemy']);
    expect(started.activeCombatantID).toBe('hero');
    const enemyTurn = advanceCombatTurn(started);
    expect(enemyTurn.activeCombatantID).toBe('enemy');
    const secondRound = advanceCombatTurn(enemyTurn);
    expect(secondRound.round).toBe(2);
    expect(secondRound.activeCombatantID).toBe('hero');
    expect(secondRound.combatants[0]).toMatchObject({ ap: 4, currentReactionPoints: 1 });
  });

  it('ticks structured effects at their configured timing', () => {
    const hero = { ...fighter('hero', 'Hero'), initiative: 18, activeConditions: [{ id: 'effect', name: 'Hindered', level: 1, source: 'Spell', expiresAt: 'End of Turn' as const, remainingRounds: 1 }], conditions: ['Hindered'] };
    const enemy = { ...fighter('enemy', 'Enemy', CombatantTeamValues.ENEMIES), initiative: 12 };
    const advanced = advanceCombatTurn(startCombatTurns(combat([hero, enemy])));
    expect(advanced.combatants.find(({ id }) => id === 'hero')?.activeConditions).toEqual([]);
  });

  it('previews immunity, vulnerability, and damage reduction without mutating HP', () => {
    const target = { ...fighter('hero', 'Hero'), hp: 10, vulnerabilities: 'Fire (Double)', reductions: 'PDR', immunities: 'Poison' };
    expect(resolveDamage(target, { mode: 'Damage', amount: 4, damageType: 'Fire', severity: 'Normal' })).toMatchObject({ finalAmount: 8, hpAfter: 2 });
    expect(resolveDamage(target, { mode: 'Damage', amount: 5, damageType: 'Slashing', severity: 'Normal' })).toMatchObject({ finalAmount: 3, hpAfter: 7 });
    expect(resolveDamage(target, { mode: 'Damage', amount: 5, damageType: 'Poison', severity: 'Normal' })).toMatchObject({ finalAmount: 0, hpAfter: 10 });
    expect(target.hp).toBe(10);
  });

  it('undoes a multi-combatant change as one action', () => {
    const original = combat([fighter('hero', 'Hero'), fighter('enemy', 'Enemy', CombatantTeamValues.ENEMIES)]);
    const damaged = { ...original, combatants: original.combatants.map((entry) => ({ ...entry, hp: entry.hp - 4 })) };
    const changed = recordCombatChange(original, damaged, 'Damaged both targets.', 'Damage');
    expect(changed.undoStack).toHaveLength(1);
    expect(undoLastCombatChange(changed).combatants.map(({ hp }) => hp)).toEqual([12, 12]);
  });
});
