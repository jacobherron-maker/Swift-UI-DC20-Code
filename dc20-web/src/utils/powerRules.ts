export type PowerResolution =
  | 'Melee Spell Attack'
  | 'Ranged Spell Attack'
  | 'Area Spell Attack'
  | 'Spell Attack'
  | 'Spell Check'
  | 'Melee Martial Attack'
  | 'Ranged Martial Attack'
  | 'Area Martial Attack'
  | 'Martial Attack'
  | 'Martial Check'
  | 'None';

export type PowerRuleBlockKind = 'paragraph' | 'heading' | 'bullet' | 'enhancement' | 'tip';

export interface PowerRuleBlock {
  kind: PowerRuleBlockKind;
  text: string;
}

const SECTION_HEADINGS = new Set([
  'D12',
  'Damage',
  'Save Failure',
  'Familiar',
  'Familiar Traits',
  'Spell Actions',
  'Managing the Familiar',
  'Base Summon Traits',
  'Managing the Summons',
  'Elemental Trait',
  'Expanded Familiar Traits',
  'Expanded Summon Traits',
  'Summon Traits',
  'Repeatable Traits',
  'Unique Traits',
  'Gravity Plane',
  'Falling into a Gravity Plane',
  'Telekinetic Action',
]);

const BREAK_BEFORE_LABELS = [
  'Beta Note',
  'DC Tip',
  'Spell Cast',
  'Spell End',
  'Spell Passive',
  'Recasting the Spell',
  'Familiar Traits',
  'Spell Actions',
  'Managing the Familiar',
  'Base Summon Traits',
  'Managing the Summons',
  'Elemental Trait',
  'Expanded Familiar Traits',
  'Expanded Summon Traits',
  'Repeatable Traits',
  'Unique Traits',
  'Gravity Plane',
  'Falling into a Gravity Plane',
  'Telekinetic Action',
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function preparePowerText(text: string, enhancements: boolean): string {
  let prepared = text.trim().replace(/\r/g, '');
  prepared = prepared.replace(/\s*•\s*/g, '\n• ');
  for (const label of BREAK_BEFORE_LABELS) {
    if (SECTION_HEADINGS.has(label)) {
      prepared = prepared.replace(new RegExp(`\\s+(${escapeRegExp(label)})(?=\\s|$)`, 'g'), '\n\n$1\n');
    } else {
      prepared = prepared.replace(new RegExp(`\\s+(?=${escapeRegExp(label)}:)`, 'g'), '\n\n');
    }
  }
  if (enhancements) {
    prepared = prepared.replace(/([.!?])\s+(?=[A-Z][A-Za-z’'& -]{0,54}:\s*\((?:X|\d)[^)]*(?:AP|MP|SP|Action|Repeatable|Requires))/g, '$1\n');
    prepared = prepared.replace(/\s+(?=\(\d+\)\s*[A-Z][^:]{0,48}:)/g, '\n');
  }
  return prepared;
}

function isHeading(line: string): boolean {
  return SECTION_HEADINGS.has(line)
    || /^Summoned [A-Z][A-Za-z’' -]+$/.test(line)
    || /^Expanded [A-Z][A-Za-z’' -]+ Traits$/.test(line);
}

export function powerRuleBlocks(text: string, enhancements = false): PowerRuleBlock[] {
  if (!text.trim()) return [];
  return preparePowerText(text, enhancements)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): PowerRuleBlock => {
      if (isHeading(line)) return { kind: 'heading', text: line };
      if (line.startsWith('• ')) return { kind: 'bullet', text: line.slice(2).trim() };
      if (/^(?:DC Tip|Beta Note):/.test(line)) return { kind: 'tip', text: line };
      if (enhancements && (/^[A-Z][A-Za-z’'& -]{0,54}:\s*\((?:X|\d)/.test(line) || /^\(\d+\)\s*[A-Z][^:]{0,48}:/.test(line))) {
        return { kind: 'enhancement', text: line };
      }
      return { kind: 'paragraph', text: line };
    });
}

export function isPowerAttack(resolution: PowerResolution | undefined): boolean {
  return Boolean(resolution && resolution.includes('Attack'));
}

export function powerResolutionLabel(resolution: PowerResolution | undefined): string {
  return resolution && resolution !== 'None' ? resolution : 'No casting check';
}

export function basePowerCost(cost = ''): { actionPoints: number; manaPoints: number; staminaPoints: number } {
  const amount = (resource: 'AP' | 'MP' | 'SP') => Number(cost.match(new RegExp(`(\\d+)\\s*${resource}\\b`, 'i'))?.[1] ?? 0);
  return { actionPoints: amount('AP'), manaPoints: amount('MP'), staminaPoints: amount('SP') };
}
