import type { ClassReference, RuleReferenceEntry } from '../types/models';

export const CHARACTER_OPTION_CATEGORIES = [
  'Classes',
  'Subclasses',
  'Ancestries & Traits',
  'Talents',
  'Skills',
  'Trades',
  'Languages',
] as const;

export type CharacterOptionCategory = (typeof CHARACTER_OPTION_CATEGORIES)[number];

export const MECHANICAL_FACETS = [
  'Attributes',
  'Mastery',
  'HP & Recovery',
  'Defense',
  'Movement',
  'Training',
  'Spells',
  'Maneuvers',
  'Resources',
  'Checks & Saves',
  'Companions',
  'Conditions',
] as const;

export type MechanicalFacet = (typeof MECHANICAL_FACETS)[number];

const facetPatterns: Array<[MechanicalFacet, RegExp]> = [
  ['Attributes', /\battribute(?:s| points?| cap| increase)?\b/i],
  ['Mastery', /\b(?:mastery|novice|adept|expert|grandmaster)\b/i],
  ['HP & Recovery', /\b(?:health points?|\bHP\b|temporary health|recover|rest points?|short rest|long rest)\b/i],
  ['Defense', /\b(?:physical defense|area defense|\bPD\b|\bAD\b|heavy|brutal|armor|shield)\b/i],
  ['Movement', /\b(?:speed|movement|move|fly|climb|swim|teleport|burrow|glide)\b/i],
  ['Training', /\b(?:training|trained|weapon training|armor training|trade tools?)\b/i],
  ['Spells', /\b(?:spell|cantrip|mana|magic|spellcasting)\b/i],
  ['Maneuvers', /\b(?:maneuver|martial expansion|stamina)\b/i],
  ['Resources', /\b(?:action points?|reaction points?|stamina points?|mana points?|rest points?|resource)\b/i],
  ['Checks & Saves', /\b(?:check|saving throw|save dc|advantage|disadvantage)\b/i],
  ['Companions', /\b(?:companion|familiar|summon|pet|bonded summons?|conjured creature)\b/i],
  ['Conditions', /\b(?:condition|dazed|frightened|stunned|restrained|exhaustion|vulnerable)\b/i],
];

export function characterOptionCategoryForEntry(entry: Pick<RuleReferenceEntry, 'kind'>): CharacterOptionCategory | null {
  if (entry.kind === 'Class') return 'Classes';
  if (entry.kind === 'Subclass') return 'Subclasses';
  if (entry.kind === 'Ancestry') return 'Ancestries & Traits';
  if (entry.kind === 'Talent') return 'Talents';
  if (entry.kind === 'Skill') return 'Skills';
  if (entry.kind === 'Trade') return 'Trades';
  if (entry.kind === 'Language') return 'Languages';
  return null;
}

/** Search-only mechanical metadata derived without changing canonical rules text. */
export function characterOptionMechanicalFacets(entry: Pick<RuleReferenceEntry, 'title' | 'summary' | 'text' | 'keywords'>): MechanicalFacet[] {
  const haystack = `${entry.title}\n${entry.summary}\n${entry.text}\n${entry.keywords}`;
  return facetPatterns.filter(([, pattern]) => pattern.test(haystack)).map(([facet]) => facet);
}

export function classFeaturesAtLevel(classReference: ClassReference, level: number, cumulative: boolean) {
  const selectedLevel = Math.min(10, Math.max(1, Math.trunc(level)));
  return classReference.features
    .filter((entry) => cumulative ? entry.level <= selectedLevel : entry.level === selectedLevel)
    .flatMap((entry) => entry.features.map((feature) => ({ ...feature, level: entry.level })));
}

export function sourceMinimumLevel(entry: Pick<RuleReferenceEntry, 'text' | 'summary' | 'details'>): number {
  const metadata = entry.details?.find(({ label }) => /(?:minimum )?level/i.test(label))?.value ?? '';
  const match = `${metadata}\n${entry.summary}\n${entry.text}`.match(/(?:requirement:\s*)?level\s+(\d{1,2})/i);
  return match ? Number(match[1]) : 1;
}

export const MASTERY_STAGE_ROWS = [
  { name: 'Untrained', bonus: 0, rank: 0 },
  { name: 'Novice', bonus: 2, rank: 1 },
  { name: 'Adept', bonus: 4, rank: 2 },
  { name: 'Expert', bonus: 6, rank: 3 },
  { name: 'Master', bonus: 8, rank: 4 },
  { name: 'Grandmaster', bonus: 10, rank: 5 },
] as const;
