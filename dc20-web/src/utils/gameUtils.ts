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

export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-600',
  uncommon: 'bg-green-600',
  rare: 'bg-blue-600',
  'very rare': 'bg-purple-600',
  legendary: 'bg-orange-600',
  artifact: 'bg-red-600',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-orange-400',
  deadly: 'text-red-400',
};

export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[rarity.toLowerCase()] || 'bg-gray-600';
}

export function getDifficultyColor(difficulty: string): string {
  return DIFFICULTY_COLORS[difficulty.toLowerCase()] || 'text-gray-400';
}
