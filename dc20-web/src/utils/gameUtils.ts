import type { DiceKind } from '../types/models';
import { DiceKindValues } from '../types/models';

export function rollDice(diceKind: DiceKind, count: number = 1): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * diceKind) + 1);
  }
  return rolls;
}

export function rollD20WithAdjustment(adjustment: number = 0): {
  rolls: number[];
  chosen: number;
  total: number;
} {
  const count = 1 + Math.abs(adjustment);
  const rolls = rollDice(DiceKindValues.D20, count);

  let chosen: number;
  if (adjustment > 0) {
    chosen = Math.max(...rolls);
  } else if (adjustment < 0) {
    chosen = Math.min(...rolls);
  } else {
    chosen = rolls[0];
  }

  return {
    rolls,
    chosen,
    total: chosen,
  };
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
