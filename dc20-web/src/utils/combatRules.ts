import type {
  CombatConditionEffect,
  CombatHistoryEntry,
  CombatHistoryKind,
  Combatant,
  CombatantTeam,
  SavedCombat,
} from '../types/models';
import { CombatantTeamValues } from '../types/models';
import { generateUUID } from './gameUtils';

export type HitSeverity = 'Normal' | 'Heavy' | 'Brutal' | 'Critical';

export interface DamageResolutionInput {
  mode: 'Damage' | 'Healing';
  amount: number;
  damageType: string;
  severity: HitSeverity;
}

export interface DamageResolutionPreview {
  originalAmount: number;
  finalAmount: number;
  hpAfter: number;
  steps: string[];
}

export interface CombatTeamMetrics {
  team: CombatantTeam;
  active: number;
  bloodied: number;
  defeated: number;
  currentHP: number;
  maxHP: number;
  remainingAP: number;
  remainingRP: number;
}

export interface CombatTacticalMetrics {
  teams: CombatTeamMetrics[];
  totalConditions: number;
  hiddenEnemies: number;
  alerts: string[];
}

function isResolved(combatant: Combatant): boolean {
  return combatant.turnState === 'Defeated' || combatant.turnState === 'Escaped' || combatant.turnState === 'Surrendered' || combatant.turnState === 'Captured';
}

function cloneCombatants(combatants: Combatant[]): Combatant[] {
  return combatants.map((combatant) => ({
    ...combatant,
    conditions: [...combatant.conditions],
    activeConditions: combatant.activeConditions?.map((condition) => ({ ...condition })),
    monsterAbilities: combatant.monsterAbilities?.map((ability) => ({ ...ability, mechanics: ability.mechanics ? { ...ability.mechanics } : undefined })),
  }));
}

export function normalizedInitiativeOrder(combat: SavedCombat): string[] {
  const ids = new Set(combat.combatants.map(({ id }) => id));
  return [
    ...(combat.initiativeOrder ?? []).filter((id, index, entries) => ids.has(id) && entries.indexOf(id) === index),
    ...combat.combatants.map(({ id }) => id).filter((id) => !(combat.initiativeOrder ?? []).includes(id)),
  ];
}

export function recordCombatChange(
  combat: SavedCombat,
  changed: SavedCombat,
  label: string,
  kind: CombatHistoryKind,
  isPrivate = false,
): SavedCombat {
  const snapshot = {
    id: generateUUID(),
    label,
    round: combat.round,
    combatants: cloneCombatants(combat.combatants),
    initiativeOrder: normalizedInitiativeOrder(combat),
    activeCombatantID: combat.activeCombatantID,
    status: combat.status ?? 'Active' as const,
    completedAt: combat.completedAt,
  };
  return {
    ...changed,
    history: [...(combat.history ?? []), {
      id: generateUUID(), timestamp: new Date().toISOString(), round: combat.round, kind, text: label, private: isPrivate,
    }].slice(-150),
    undoStack: [...(combat.undoStack ?? []), snapshot].slice(-8),
  };
}

export function undoLastCombatChange(combat: SavedCombat): SavedCombat {
  const stack = combat.undoStack ?? [];
  const snapshot = stack.at(-1);
  if (!snapshot) return combat;
  const historyEntry: CombatHistoryEntry = {
    id: generateUUID(), timestamp: new Date().toISOString(), round: snapshot.round, kind: 'System', text: `Undid: ${snapshot.label}`, private: false,
  };
  return {
    ...combat,
    round: snapshot.round,
    combatants: cloneCombatants(snapshot.combatants),
    initiativeOrder: [...snapshot.initiativeOrder],
    activeCombatantID: snapshot.activeCombatantID,
    status: snapshot.status,
    completedAt: snapshot.completedAt,
    undoStack: stack.slice(0, -1),
    history: [...(combat.history ?? []), historyEntry].slice(-150),
  };
}

export function sortInitiative(combat: SavedCombat): string[] {
  const teamRank = (team: CombatantTeam): number => {
    if (team === combat.firstTeam) return 0;
    if (team === CombatantTeamValues.NEUTRAL) return 2;
    return 1;
  };
  return [...combat.combatants].sort((left, right) => {
    if ((combat.initiativeMode ?? 'Team') === 'Team') {
      const rank = teamRank(left.team) - teamRank(right.team);
      if (rank !== 0) return rank;
    }
    return (right.initiative ?? 0) - (left.initiative ?? 0) || left.name.localeCompare(right.name);
  }).map(({ id }) => id);
}

export function startCombatTurns(combat: SavedCombat): SavedCombat {
  const order = sortInitiative(combat);
  const first = order.find((id) => {
    const entry = combat.combatants.find((candidate) => candidate.id === id);
    return entry && !isResolved(entry);
  });
  const changed: SavedCombat = {
    ...combat,
    initiativeOrder: order,
    activeCombatantID: first,
    status: 'Active',
    startedAt: combat.startedAt ?? new Date().toISOString(),
    completedAt: undefined,
    combatants: combat.combatants.map((entry) => ({ ...entry, hasActed: false, turnState: entry.id === first ? 'Active' : isResolved(entry) ? entry.turnState : 'Ready' })),
  };
  return recordCombatChange(combat, changed, `Started combat${first ? ` with ${combat.combatants.find(({ id }) => id === first)?.name}` : ''}.`, 'Turn');
}

function conditionLabel(condition: CombatConditionEffect): string {
  return `${condition.name}${condition.level > 1 ? ` ${condition.level}` : ''}`;
}

function tickConditions(combatant: Combatant, timing: CombatConditionEffect['expiresAt']): Combatant {
  const activeConditions = (combatant.activeConditions ?? []).flatMap((condition) => {
    if (condition.expiresAt !== timing || condition.remainingRounds === undefined) return [condition];
    const remainingRounds = condition.remainingRounds - 1;
    return remainingRounds > 0 ? [{ ...condition, remainingRounds }] : [];
  });
  return { ...combatant, activeConditions, conditions: activeConditions.map(conditionLabel) };
}

export function advanceCombatTurn(combat: SavedCombat): SavedCombat {
  const order = normalizedInitiativeOrder(combat);
  if (order.length === 0) return combat;
  const activeIndex = Math.max(0, order.indexOf(combat.activeCombatantID ?? order[0]));
  const activeID = order[activeIndex];
  let combatants = combat.combatants.map((entry) => entry.id === activeID
    ? { ...tickConditions(entry, 'End of Turn'), hasActed: true, turnState: entry.turnState === 'Defeated' ? 'Defeated' as const : 'Ready' as const }
    : entry);
  let nextIndex = activeIndex;
  let wrapped = false;
  for (let attempts = 0; attempts < order.length; attempts += 1) {
    nextIndex = (nextIndex + 1) % order.length;
    if (nextIndex <= activeIndex) wrapped = true;
    const candidate = combatants.find(({ id }) => id === order[nextIndex]);
    if (candidate && !isResolved(candidate) && candidate.turnState !== 'Skipped') break;
  }
  let round = combat.round;
  if (wrapped) {
    round += 1;
    combatants = combatants.map((entry) => ({
      ...tickConditions(tickConditions(entry, 'End of Round'), 'Start of Round'),
      hasActed: false,
      ap: entry.maxAP,
      currentReactionPoints: entry.reactionPoints,
      turnState: isResolved(entry) ? entry.turnState : 'Ready',
    }));
  }
  const nextID = order[nextIndex];
  combatants = combatants.map((entry) => entry.id === nextID
    ? { ...tickConditions(entry, 'Start of Turn'), turnState: 'Active' }
    : entry);
  const nextName = combatants.find(({ id }) => id === nextID)?.name ?? 'next combatant';
  return recordCombatChange(combat, { ...combat, round, combatants, activeCombatantID: nextID, initiativeOrder: order }, `${nextName}'s turn${wrapped ? ` • Round ${round}` : ''}.`, 'Turn');
}

export function retreatCombatTurn(combat: SavedCombat): SavedCombat {
  const order = normalizedInitiativeOrder(combat);
  if (order.length === 0) return combat;
  const activeIndex = Math.max(0, order.indexOf(combat.activeCombatantID ?? order[0]));
  let previousIndex = activeIndex;
  let wrapped = false;
  for (let attempts = 0; attempts < order.length; attempts += 1) {
    previousIndex = (previousIndex - 1 + order.length) % order.length;
    if (previousIndex >= activeIndex) wrapped = true;
    const candidate = combat.combatants.find(({ id }) => id === order[previousIndex]);
    if (candidate && !isResolved(candidate) && candidate.turnState !== 'Skipped') break;
  }
  const previousID = order[previousIndex];
  const combatants = combat.combatants.map((entry) => entry.id === previousID
    ? { ...entry, turnState: 'Active' as const, hasActed: false }
    : entry.id === combat.activeCombatantID && !isResolved(entry) ? { ...entry, turnState: 'Ready' as const } : entry);
  const round = wrapped ? Math.max(1, combat.round - 1) : combat.round;
  const name = combatants.find(({ id }) => id === previousID)?.name ?? 'previous combatant';
  return recordCombatChange(combat, { ...combat, round, combatants, activeCombatantID: previousID, initiativeOrder: order }, `Returned to ${name}'s turn${wrapped ? ` • Round ${round}` : ''}.`, 'Turn');
}

export function moveInitiative(combat: SavedCombat, combatantID: string, direction: -1 | 1): SavedCombat {
  const order = normalizedInitiativeOrder(combat);
  const index = order.indexOf(combatantID);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return combat;
  [order[index], order[target]] = [order[target], order[index]];
  const name = combat.combatants.find(({ id }) => id === combatantID)?.name ?? 'Combatant';
  return recordCombatChange(combat, { ...combat, initiativeOrder: order }, `Moved ${name} in the initiative order.`, 'Turn');
}

const PHYSICAL = new Set(['Bludgeoning', 'Piercing', 'Slashing']);
const ELEMENTAL = new Set(['Cold', 'Corrosion', 'Corrosive', 'Fire', 'Lightning', 'Poison']);
const MYSTICAL = new Set(['Psychic', 'Radiant', 'Umbral']);

function hasType(text: string | undefined, type: string): boolean {
  if (!text || !type) return false;
  const category = PHYSICAL.has(type) ? 'Physical' : ELEMENTAL.has(type) ? 'Elemental' : MYSTICAL.has(type) ? 'Mystical' : '';
  const candidates = [type, category].filter(Boolean).join('|');
  return new RegExp(`\\b(?:${candidates})\\b`, 'i').test(text);
}

function numericModifier(text: string | undefined, type: string): number | null {
  if (!text || !type) return null;
  const category = PHYSICAL.has(type) ? 'Physical' : ELEMENTAL.has(type) ? 'Elemental' : MYSTICAL.has(type) ? 'Mystical' : '';
  const candidates = [type, category].filter(Boolean).join('|');
  const match = text.match(new RegExp(`(?:${candidates})[^,;|]*(?:\\(|\\s)(\\d+)(?:\\)|\\b)`, 'i'));
  return match ? Number(match[1]) : null;
}

export function resolveDamage(combatant: Combatant, input: DamageResolutionInput): DamageResolutionPreview {
  const originalAmount = Math.max(0, Math.round(Number(input.amount) || 0));
  if (input.mode === 'Healing') {
    const finalAmount = Math.min(originalAmount, Math.max(0, combatant.maxHP - combatant.hp));
    return { originalAmount, finalAmount, hpAfter: Math.min(combatant.maxHP, combatant.hp + originalAmount), steps: finalAmount < originalAmount ? [`Capped at maximum HP (${combatant.maxHP}).`] : [] };
  }
  let amount = originalAmount;
  const steps: string[] = [];
  if (hasType(combatant.immunities, input.damageType)) {
    return { originalAmount, finalAmount: 0, hpAfter: combatant.hp, steps: [`${input.damageType} Immunity prevents all damage.`] };
  }
  if (hasType(combatant.vulnerabilities, input.damageType)) {
    if (/double/i.test(combatant.vulnerabilities ?? '')) {
      amount *= 2;
      steps.push(`${input.damageType} Vulnerability (Double): ${originalAmount} → ${amount}.`);
    } else {
      const increase = numericModifier(combatant.vulnerabilities, input.damageType) ?? 1;
      amount += increase;
      steps.push(`${input.damageType} Vulnerability (+${increase}): ${amount - increase} → ${amount}.`);
    }
  }
  if (hasType(combatant.resistances, input.damageType)) {
    if (/half/i.test(combatant.resistances ?? '')) {
      const previous = amount;
      amount = Math.max(0, Math.ceil(amount / 2));
      steps.push(`${input.damageType} Resistance (Half): ${previous} → ${amount}.`);
    } else {
      const reduction = numericModifier(combatant.resistances, input.damageType) ?? 1;
      const previous = amount;
      amount = Math.max(0, amount - reduction);
      steps.push(`${input.damageType} Resistance (${reduction}): ${previous} → ${amount}.`);
    }
  }
  const damageReduction = PHYSICAL.has(input.damageType) ? 'PDR' : ELEMENTAL.has(input.damageType) ? 'EDR' : MYSTICAL.has(input.damageType) ? 'MDR' : '';
  if (damageReduction && new RegExp(`\\b${damageReduction}\\b`, 'i').test(combatant.reductions ?? '')) {
    if (input.severity === 'Normal') {
      const previous = amount;
      amount = Math.max(0, Math.ceil(amount / 2));
      steps.push(`${damageReduction} grants Resistance (Half): ${previous} → ${amount}.`);
    } else steps.push(`${input.severity} damage bypasses ${damageReduction}.`);
  }
  return { originalAmount, finalAmount: amount, hpAfter: Math.max(-20, combatant.hp - amount), steps };
}

export function combatTacticalMetrics(combat: SavedCombat): CombatTacticalMetrics {
  const teams = Object.values(CombatantTeamValues).map((team) => {
    const entries = combat.combatants.filter((entry) => entry.team === team);
    return {
      team,
      active: entries.filter((entry) => entry.hp > 0 && !isResolved(entry)).length,
      bloodied: entries.filter(({ hp, maxHP }) => hp > 0 && hp <= maxHP / 2).length,
      defeated: entries.filter(({ hp, turnState }) => hp <= 0 || turnState === 'Defeated').length,
      currentHP: entries.reduce((sum, entry) => sum + Math.max(0, entry.hp), 0),
      maxHP: entries.reduce((sum, entry) => sum + Math.max(0, entry.maxHP), 0),
      remainingAP: entries.reduce((sum, entry) => sum + Math.max(0, entry.ap), 0),
      remainingRP: entries.reduce((sum, entry) => sum + Math.max(0, entry.currentReactionPoints), 0),
    };
  });
  const heroes = teams.find(({ team }) => team === CombatantTeamValues.HEROES)!;
  const enemies = teams.find(({ team }) => team === CombatantTeamValues.ENEMIES)!;
  const totalConditions = combat.combatants.reduce((sum, entry) => sum + (entry.activeConditions?.length ?? entry.conditions.length), 0);
  const hiddenEnemies = combat.combatants.filter(({ team, visibility }) => team === CombatantTeamValues.ENEMIES && visibility === 'Hidden').length;
  const alerts: string[] = [];
  if (heroes.defeated > 0) alerts.push(`${heroes.defeated} hero${heroes.defeated === 1 ? ' is' : 'es are'} defeated or at 0 HP.`);
  if (enemies.active > heroes.active && heroes.active > 0) alerts.push(`Enemies outnumber active heroes ${enemies.active} to ${heroes.active}.`);
  if (enemies.remainingAP > heroes.remainingAP) alerts.push(`Enemy AP advantage: ${enemies.remainingAP} remaining versus ${heroes.remainingAP}.`);
  if (totalConditions >= 5) alerts.push(`${totalConditions} active conditions may need attention.`);
  if (hiddenEnemies > 0) alerts.push(`${hiddenEnemies} hidden enem${hiddenEnemies === 1 ? 'y is' : 'ies are'} omitted from Player View.`);
  return { teams, totalConditions, hiddenEnemies, alerts };
}

export function createCombatSummary(combat: SavedCombat): string {
  const metrics = combatTacticalMetrics(combat);
  const teamLines = metrics.teams.filter(({ maxHP }) => maxHP > 0).map((team) => `${team.team}: ${team.active} active, ${team.defeated} defeated, ${team.currentHP}/${team.maxHP} HP remaining.`);
  const recent = (combat.history ?? []).filter(({ private: isPrivate }) => !isPrivate).slice(-12).map((entry) => `• Round ${entry.round}: ${entry.text}`);
  const dispositions = ['Defeated', 'Escaped', 'Surrendered', 'Captured'] as const;
  const resolutionLines = dispositions.flatMap((state) => {
    const names = combat.combatants.filter(({ turnState }) => turnState === state).map(({ name }) => name);
    return names.length > 0 ? [`${state}: ${names.join(', ')}.`] : [];
  });
  return [`${combat.name} concluded after ${combat.round} round${combat.round === 1 ? '' : 's'}.`, ...teamLines, ...resolutionLines, '', 'Recent events:', ...(recent.length > 0 ? recent : ['• No public combat events were recorded.'])].join('\n');
}
