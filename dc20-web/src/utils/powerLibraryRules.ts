import type {
  Character,
  CharacterReferenceData,
  GmVaultEntry,
  Maneuver,
  Spell,
} from '../types/models';
import {
  ancestryGrantedSpellNames,
  grantedClassManeuverNames,
  grantedClassSpellNames,
  spellIsAvailableToClass,
} from './characterRules';
import { powerRuleBlocks, type PowerResolution, type PowerRuleBlock } from './powerRules';
import { vaultEntryEligibility } from './vaultRules';

export type PowerLibraryKind = 'Spell' | 'Maneuver';
export type PowerLibraryOrigin = 'Official' | 'GM Vault' | 'Campaign Shared';
export type PowerAccessState = 'Known' | 'Granted' | 'Available' | 'Locked' | 'No Character';

export interface PowerResourceCost {
  actionPoints: number;
  manaPoints: number;
  staminaPoints: number;
}

export interface PowerEnhancementOption {
  id: string;
  name: string;
  costText: string;
  description: string;
  blocks: PowerRuleBlock[];
  repeatable: boolean;
  variable: boolean;
  sustained: boolean;
  requirements: string[];
  paymentOptions: string[];
}

export interface PowerAccessResult {
  state: PowerAccessState;
  reason: string;
  canAddVaultEntry: boolean;
}

const ZERO_COST: PowerResourceCost = { actionPoints: 0, manaPoints: 0, staminaPoints: 0 };

export const POWER_CONDITIONS = [
  'Bleeding', 'Blinded', 'Burning', 'Charmed', 'Dazed', 'Deafened', 'Disoriented',
  'Doomed', 'Exhaustion', 'Exposed', 'Frightened', 'Hindered', 'Immobilized',
  'Impaired', 'Incapacitated', 'Intimidated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned', 'Surprised', 'Taunted',
  'Terrified', 'Tethered', 'Unconscious', 'Weakened',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function addPowerCosts(left: PowerResourceCost, right: PowerResourceCost): PowerResourceCost {
  return {
    actionPoints: left.actionPoints + right.actionPoints,
    manaPoints: left.manaPoints + right.manaPoints,
    staminaPoints: left.staminaPoints + right.staminaPoints,
  };
}

/** Parses a printed power cost without altering the source-facing cost text. */
export function parsePowerResourceCost(
  costText = '',
  magnitude = 1,
  paymentOption = 0,
  repeatable = false,
): PowerResourceCost {
  const alternatives = costText.split(/\s+or\s+/i).map((value) => value.trim()).filter(Boolean);
  const selected = alternatives[Math.min(Math.max(0, paymentOption), Math.max(0, alternatives.length - 1))] ?? costText;
  if (/\bno\s+(?:AP|MP|SP)\s+required\b/i.test(selected)) return ZERO_COST;
  const hasVariable = /\bX\s*(?:AP|MP|SP)\b/i.test(selected);
  const multiplier = repeatable && !hasVariable ? Math.max(1, magnitude) : 1;
  const amount = (resource: 'AP' | 'MP' | 'SP') => {
    const match = selected.match(new RegExp(`(X|\\d+)\\s*${resource}\\b`, 'i'));
    if (!match) return 0;
    return (match[1].toUpperCase() === 'X' ? Math.max(1, magnitude) : Number(match[1])) * multiplier;
  };
  return { actionPoints: amount('AP'), manaPoints: amount('MP'), staminaPoints: amount('SP') };
}

function enhancementHeader(text: string): { name: string; costText: string; description: string } | null {
  const match = text.match(/^((?:\(\d+\)\s*)?[A-Z][^:]{0,80}):\s*\(([^)]*)\)\s*([\s\S]*)$/);
  return match ? { name: match[1].trim(), costText: match[2].trim(), description: match[3].trim() } : null;
}

/** Groups the source text into selectable enhancement cards while preserving every word. */
export function powerEnhancementOptions(text = ''): PowerEnhancementOption[] {
  const blocks = powerRuleBlocks(text, true);
  const groups: Array<{ header: ReturnType<typeof enhancementHeader>; blocks: PowerRuleBlock[] }> = [];
  for (const block of blocks) {
    const header = block.kind === 'enhancement' ? enhancementHeader(block.text) : null;
    if (header) groups.push({ header, blocks: [block] });
    else if (groups.length > 0) groups[groups.length - 1].blocks.push(block);
  }
  return groups.flatMap(({ header, blocks }, index) => {
    if (!header) return [];
    const costMetadata = header.costText.split(',').map((value) => value.trim()).filter(Boolean);
    const paymentOptions = costMetadata[0]?.split(/\s+or\s+/i).map((value) => value.trim()).filter(Boolean) ?? [];
    const trailingText = blocks.slice(1).map(({ text: value }) => value).join('\n\n');
    return [{
      id: `${slug(header.name)}-${index}`,
      name: header.name,
      costText: header.costText,
      description: [header.description, trailingText].filter(Boolean).join('\n\n'),
      blocks,
      repeatable: /\bRepeatable\b/i.test(header.costText),
      variable: /\bX\s*(?:AP|MP|SP)\b/i.test(header.costText),
      sustained: /\bSustained\b/i.test(header.costText),
      requirements: costMetadata.filter((value) => /^Requires\b/i.test(value)),
      paymentOptions,
    }];
  });
}

export function powerResourceKinds(cost = ''): string[] {
  const resources = ['AP', 'MP', 'SP'].filter((resource) => new RegExp(`(?:\\d+|X)\\s*${resource}\\b`, 'i').test(cost));
  if (resources.length === 0) resources.push('Free');
  if (/\bX\s*(?:AP|MP|SP)\b/i.test(cost)) resources.push('Variable');
  return resources;
}

export function powerRangeBucket(range = ''): 'Self' | 'Melee / 1 Space' | '2–10 Spaces' | '11+ Spaces' | 'Special' {
  if (/\bSelf\b/i.test(range)) return 'Self';
  if (/\bMelee\b/i.test(range) || /^1\s*Space/i.test(range)) return 'Melee / 1 Space';
  const spaces = Number(range.match(/(\d+)\s*Spaces?/i)?.[1] ?? Number.NaN);
  if (Number.isFinite(spaces)) return spaces <= 10 ? '2–10 Spaces' : '11+ Spaces';
  return 'Special';
}

export function powerDurationBucket(duration = ''): 'Instant' | 'Round' | 'Minute+' | 'Sustained' | 'Special' {
  if (/\bSustain/i.test(duration)) return 'Sustained';
  if (/\bInstant/i.test(duration)) return 'Instant';
  if (/\bRound/i.test(duration)) return 'Round';
  if (/\b(?:Minute|Hour|Day)/i.test(duration)) return 'Minute+';
  return 'Special';
}

export function detectedPowerConditions(text: string): string[] {
  return POWER_CONDITIONS.filter((condition) => new RegExp(`\\b${escapeRegExp(condition)}(?:\\s+X|\\s+\\d+)?\\b`, 'i').test(text));
}

function selectedNames(character: Character, kind: PowerLibraryKind): Set<string> {
  if (kind === 'Maneuver') return new Set([
    ...character.maneuvers.map(({ name }) => name),
    ...(character.build?.selectedManeuvers ?? []),
  ]);
  return new Set([
    ...character.spells.map(({ name }) => name),
    ...(character.build?.selectedSpells ?? []),
    ...(character.build?.selectedCantrips ?? []),
  ]);
}

function grantedNames(character: Character, kind: PowerLibraryKind, reference: CharacterReferenceData | null): Set<string> {
  if (kind === 'Maneuver') return new Set(grantedClassManeuverNames(character));
  const ancestry = reference ? ancestryGrantedSpellNames(character, reference.ancestryTraits).map(({ name }) => name) : [];
  const vault = (character.vaultEntries ?? []).flatMap((entry) => [
    ...(entry.spell ? [entry.spell.name] : []),
    ...(entry.grantedSpells ?? []).map(({ name }) => name),
    ...(entry.item?.grantedSpells ?? []),
  ]);
  const inventory = (character.inventoryItems ?? []).flatMap(({ itemSnapshot }) => itemSnapshot?.grantedSpells ?? []);
  return new Set([...grantedClassSpellNames(character), ...ancestry, ...vault, ...inventory]);
}

function spellListEligibility(character: Character, spell: Pick<Spell, 'school' | 'source' | 'tags'>, reference: CharacterReferenceData | null): PowerAccessResult {
  if (!reference) return { state: 'Locked', reason: 'Character rules are still loading.', canAddVaultEntry: false };
  const build = character.build;
  const choices = build?.classFeatureSelections ?? {};
  const nativeClassReference = reference.classes.find(({ name }) => name === character.class);
  const nativeSpellAllowance = nativeClassReference?.tableRows
    .filter(({ level }) => level <= character.level)
    .reduce((sum, row) => sum + (row.spells ?? 0) + (row.cantrips ?? 0), 0) ?? 0;
  const hasSpellcasterProgression = Object.values(build?.pathProgressionChoices ?? {}).includes('Spellcaster');
  const borrowedClass = nativeSpellAllowance === 0 && hasSpellcasterProgression
    ? build?.selectedSpellListClass
    : '';
  const accessClassName = borrowedClass || character.class;
  const classReference = reference.classes.find(({ name }) => name === accessClassName);
  const ownsSpellList = Boolean(classReference?.tableRows.some((row) => row.level <= character.level && ((row.spells ?? 0) > 0 || (row.cantrips ?? 0) > 0))) || Boolean(borrowedClass);
  const featureTags = choices['cleric.magicDomainTags'] ?? [];
  const classAllows = Boolean(classReference && ownsSpellList && spellIsAvailableToClass(
    accessClassName,
    spell,
    classReference.fixedSpellSource,
    build?.selectedSpellSource ?? '',
    build?.selectedSpellSchools ?? [],
    character.subclass,
    featureTags,
  ));
  const hasExpansion = (build?.selectedTalents ?? []).includes('Spellcasting Expansion');
  const expansionMode = choices['talent.spellcastingExpansion.mode']?.[0] ?? '';
  const expansionAllows = hasExpansion && (expansionMode === 'Source'
    ? (spell.source ?? '').split(',').map((value) => value.trim()).includes(choices['talent.spellcastingExpansion.source']?.[0] ?? '')
    : expansionMode === 'Schools' && (choices['talent.spellcastingExpansion.schools'] ?? []).includes(spell.school));
  if (classAllows || expansionAllows) return {
    state: 'Available',
    reason: classAllows ? `Appears on ${accessClassName}'s current Spell List.` : 'Added to the Spell List by Spellcasting Expansion.',
    canAddVaultEntry: false,
  };
  if (ownsSpellList || hasExpansion) return { state: 'Locked', reason: `Not on ${character.name}'s configured Spell List.`, canAddVaultEntry: false };
  return { state: 'Locked', reason: `${character.name} does not currently have a Spell List.`, canAddVaultEntry: false };
}

function maneuverListEligibility(character: Character, reference: CharacterReferenceData | null): PowerAccessResult {
  const classReference = reference?.classes.find(({ name }) => name === character.class);
  const classManeuvers = classReference?.tableRows
    .filter(({ level }) => level <= character.level)
    .reduce((sum, row) => sum + (row.maneuvers ?? 0), 0) ?? 0;
  const expansion = (character.build?.selectedTalents ?? []).filter((name) => name === 'Martial Expansion').length * 2;
  if (classManeuvers + expansion > 0) return {
    state: 'Available',
    reason: classManeuvers > 0 ? `Available through ${character.class}'s Maneuvers Known.` : 'Available through Martial Expansion.',
    canAddVaultEntry: false,
  };
  return { state: 'Locked', reason: `${character.name} does not currently have a Maneuvers Known allowance.`, canAddVaultEntry: false };
}

export function powerAccessForCharacter({
  character,
  kind,
  power,
  origin,
  reference,
  vaultEntry,
  campaignContainsCharacter = true,
}: {
  character: Character | null;
  kind: PowerLibraryKind;
  power: Spell | Maneuver;
  origin: PowerLibraryOrigin;
  reference: CharacterReferenceData | null;
  vaultEntry?: GmVaultEntry;
  campaignContainsCharacter?: boolean;
}): PowerAccessResult {
  if (!character) return { state: 'No Character', reason: 'Choose a character to see access and table controls.', canAddVaultEntry: false };
  const selected = selectedNames(character, kind);
  const granted = grantedNames(character, kind, reference);
  if (granted.has(power.name) || (vaultEntry && (character.vaultEntries ?? []).some(({ id }) => id === vaultEntry.id))) {
    return { state: 'Granted', reason: 'Granted by a character feature, ancestry, item, talent, or accepted Vault entry.', canAddVaultEntry: false };
  }
  if (selected.has(power.name)) return { state: 'Known', reason: 'Selected on this character.', canAddVaultEntry: false };
  if (origin !== 'Official' && vaultEntry) {
    if (origin === 'Campaign Shared' && !campaignContainsCharacter) return {
      state: 'Locked', reason: 'This character is not linked to the campaign sharing this power.', canAddVaultEntry: false,
    };
    const eligibility = vaultEntryEligibility(character, vaultEntry);
    return eligibility.eligible
      ? { state: 'Available', reason: origin === 'GM Vault' ? 'Eligible for this private GM Vault entry.' : 'Eligible to accept from the shared campaign Vault.', canAddVaultEntry: true }
      : { state: 'Locked', reason: eligibility.reason, canAddVaultEntry: false };
  }
  return kind === 'Spell'
    ? spellListEligibility(character, power as Spell, reference)
    : maneuverListEligibility(character, reference);
}

export function powerResolution(power: Pick<Spell | Maneuver, 'description' | 'resolution'>): PowerResolution {
  if (power.resolution) return power.resolution;
  const text = power.description;
  if (/Area Spell Attack/i.test(text)) return 'Area Spell Attack';
  if (/Ranged Spell Attack/i.test(text)) return 'Ranged Spell Attack';
  if (/Melee Spell Attack/i.test(text)) return 'Melee Spell Attack';
  if (/Spell Attack/i.test(text)) return 'Spell Attack';
  if (/Spell Check/i.test(text)) return 'Spell Check';
  if (/Area Martial Attack/i.test(text)) return 'Area Martial Attack';
  if (/Ranged Martial Attack/i.test(text)) return 'Ranged Martial Attack';
  if (/Melee Martial Attack/i.test(text)) return 'Melee Martial Attack';
  if (/Martial Attack/i.test(text)) return 'Martial Attack';
  if (/Martial Check/i.test(text)) return 'Martial Check';
  return 'None';
}
