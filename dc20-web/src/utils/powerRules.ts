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

export type PowerRuleBlockKind = 'paragraph' | 'heading' | 'bullet' | 'enhancement' | 'tip' | 'tableHeader' | 'tableRow';

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
  'Blessings',
  'Curses',
  'Heightened Gravity',
  'Connection Bonus',
  'Knowledge of Target DC',
  'D4 Distortion Effect',
  'D6 Effect',
]);

const BREAK_BEFORE_LABELS = [
  'Beta Note',
  'DC Tip',
  'Spell Cast',
  'Spell End',
  'Spell Passive',
  'Recasting the Spell',
];

// The source export flattens some visual headings into the following sentence. Match both the
// heading and its actual opening words so ordinary mentions of the same term remain in their
// sentence. This is especially important for Gravity Plane, Familiar Traits, Summon Traits, and
// Telekinetic Action, which are referenced repeatedly inside their own rules.
const CONTEXTUAL_HEADINGS: Array<[heading: string, opening: string]> = [
  ['Familiar Traits', 'Your Familiar has the following Familiar Traits:'],
  ['Spell Actions', 'Pocket Dimension:'],
  ['Managing the Familiar', 'Combat:'],
  ['Base Summon Traits', 'The summoned creature has the following Summon Traits:'],
  ['Managing the Summons', 'The creature shares your Initiative'],
  ['Elemental Trait', 'When you summon the elemental'],
  ['Expanded Familiar Traits', 'Summoned Familiars can choose'],
  ['Expanded Summon Traits', 'Summoned'],
  ['Summon Traits', 'Below is a list of repeatable and unique Summon Traits.'],
  ['Gravity Plane', 'Creatures and unsecured objects fall toward a Gravity Plane.'],
  ['Falling into a Gravity Plane', 'Creatures and objects that fall into a Gravity Plane'],
  ['Telekinetic Action', 'When you Sustain this Spell'],
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function preparePowerText(text: string, enhancements: boolean): string {
  let prepared = text.trim().replace(/\r/g, '');
  prepared = prepared.replace(/\s*•\s*/g, '\n• ');
  prepared = prepared.replace(/\s+(Blessings|Curses|Heightened Gravity):?(?=\s*\n?•)/g, '\n\n$1\n');
  prepared = prepared.replace(/\s+(Summoned [A-Z][A-Za-z’' -]+)(?=\s+HP\b)/g, '\n\n$1\n');
  prepared = prepared.replace(/(Summoned [A-Z][A-Za-z’' -]+\n)([\s\S]*?)(?=\s+DC Tip:)/g, (_match, heading: string, stats: string) => (
    `${heading}${stats.trim().replace(/\s+(?=(?:AP|PD|AD|PM|Save DC|Speed|CM|MIG|CHA|AGI|INT)\s+(?:Shared|See Traits|PM|-?\d))/g, '\n')}\n`
  ));
  for (const [heading, opening] of CONTEXTUAL_HEADINGS) {
    prepared = prepared.replace(
      new RegExp(`\\s*${escapeRegExp(heading)}\\s+(?=${escapeRegExp(opening)})`, 'g'),
      `\n\n${heading}\n`,
    );
  }
  prepared = prepared.replace(/\s+(Repeatable Traits|Unique Traits)\s+(?=\(\d+\)\s+[A-Z])/g, '\n\n$1\n');
  for (const label of BREAK_BEFORE_LABELS) {
    prepared = prepared.replace(new RegExp(`\\s+(?=${escapeRegExp(label)}:)`, 'g'), '\n\n');
  }
  if (!enhancements) {
    prepared = prepared.replace(/([.!?])\s+(?=[A-Z][A-Za-z’'& -]{1,40}:\s)/g, '$1\n');
  }
  if (enhancements) {
    prepared = prepared.replace(/([.!?)])\s+(?=[A-Z][A-Za-z’'& -]{0,54}:\s*\((?:X|\d)[^)]*(?:AP|MP|SP|Action|Repeatable|Requires))/g, '$1\n');
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
  const lines = preparePowerText(text, enhancements)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: PowerRuleBlock[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === 'D12' && lines[index + 1] === 'Damage' && lines[index + 2] === 'Save Failure') {
      blocks.push({ kind: 'tableHeader', text: 'D12\tDamage\tSave Failure' });
      index += 3;
      while (index + 2 < lines.length && /^(?:[1-9]|1[0-2])$/.test(lines[index])) {
        blocks.push({ kind: 'tableRow', text: `${lines[index]}\t${lines[index + 1]}\t${lines[index + 2]}` });
        index += 3;
      }
      index -= 1;
      continue;
    }
    const compactTable = line.match(/^(D4|D6) (Distortion Effect|Effect)$/);
    if (compactTable) {
      blocks.push({ kind: 'tableHeader', text: `${compactTable[1]}\t${compactTable[2]}` });
      index += 1;
      while (index < lines.length && /^(?:[1-9]|1[0-2])\t/.test(lines[index])) {
        blocks.push({ kind: 'tableRow', text: lines[index] });
        index += 1;
      }
      index -= 1;
      continue;
    }
    blocks.push(((): PowerRuleBlock => {
      if (isHeading(line)) return { kind: 'heading', text: line };
      if (line.startsWith('• ')) return { kind: 'bullet', text: line.slice(2).trim() };
      if (/^(?:DC Tip|Beta Note):/.test(line)) return { kind: 'tip', text: line };
      if (enhancements && (/^[A-Z][A-Za-z’'& -]{0,54}:\s*\((?:X|\d)/.test(line) || /^\(\d+\)\s*[A-Z][^:]{0,48}:/.test(line))) {
        return { kind: 'enhancement', text: line };
      }
      return { kind: 'paragraph', text: line };
    })());
  }
  return blocks;
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
