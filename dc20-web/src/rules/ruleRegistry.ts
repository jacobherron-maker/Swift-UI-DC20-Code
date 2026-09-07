import type { RuleReferenceEntry, RulesReferenceData, SemanticRuleReference } from '../types/models';

export const CURRENT_RULES_VERSION = '0.10.5';

export interface RuleAlias {
  text: string;
  caseSensitive?: boolean;
  autoLink?: boolean;
}

export interface RuleRegistryEntry {
  id: string;
  canonicalName: string;
  category: string;
  shortDefinition: string;
  ruleEntryID: string;
  source: string;
  rulesVersion: string;
  sourcePage: string;
  aliases: RuleAlias[];
  relatedIDs: string[];
  ruleReference: RuleReferenceEntry;
  isConcept: boolean;
}

export interface RuleRegistry {
  version: string;
  entries: RuleRegistryEntry[];
  byID: ReadonlyMap<string, RuleRegistryEntry>;
  byRuleEntryID: ReadonlyMap<string, RuleRegistryEntry>;
  aliases: ReadonlyMap<string, Array<{ entry: RuleRegistryEntry; alias: RuleAlias }>>;
  autoAliasPattern: RegExp | null;
}

interface ConceptDefinition {
  id: string;
  name: string;
  targetTitle: string;
  category: string;
  aliases: RuleAlias[];
  related?: string[];
  definition?: string;
}

const exact = (text: string): RuleAlias => ({ text, caseSensitive: true });
const flexible = (text: string): RuleAlias => ({ text });
const explicit = (text: string): RuleAlias => ({ text, autoLink: false });

const CORE_CONCEPTS: ConceptDefinition[] = [
  { id: 'combat.advantage', name: 'Advantage', targetTitle: 'Advantage & Disadvantage', category: 'Check Modifier', aliases: [flexible('Advantage'), exact('ADV')], related: ['combat.disadvantage', 'combat.heavyHit'], definition: 'Roll one additional d20 for each stack of Advantage and use the highest result. Advantage and Disadvantage cancel one-for-one.' },
  { id: 'combat.disadvantage', name: 'Disadvantage', targetTitle: 'Advantage & Disadvantage', category: 'Check Modifier', aliases: [flexible('Disadvantage'), exact('DisADV')], related: ['combat.advantage', 'combat.heavyHit'], definition: 'Roll one additional d20 for each stack of Disadvantage and use the lowest result. Advantage and Disadvantage cancel one-for-one.' },
  { id: 'combat.heavyHit', name: 'Heavy Hit', targetTitle: 'Damage, Heavy Hits, & Critical Hits', category: 'Hit Outcome', aliases: [flexible('Heavy Hit'), flexible('Heavy Hits')], related: ['combat.brutalHit', 'combat.criticalHit', 'damage.reduction'] },
  { id: 'combat.brutalHit', name: 'Brutal Hit', targetTitle: 'Damage, Heavy Hits, & Critical Hits', category: 'Hit Outcome', aliases: [flexible('Brutal Hit'), flexible('Brutal Hits')], related: ['combat.heavyHit', 'combat.criticalHit'] },
  { id: 'combat.criticalHit', name: 'Critical Hit', targetTitle: 'Damage, Heavy Hits, & Critical Hits', category: 'Hit Outcome', aliases: [flexible('Critical Hit'), flexible('Critical Hits'), flexible('Critical Success'), flexible('Critical Failure')], related: ['combat.heavyHit', 'combat.brutalHit'] },
  { id: 'health.deathsDoor', name: 'Death’s Door', targetTitle: 'Death’s Door & Death Saves', category: 'Health', aliases: [flexible('Death’s Door'), flexible("Death's Door")], related: ['health.bloodied', 'health.wellBloodied'] },
  { id: 'health.bloodied', name: 'Bloodied', targetTitle: 'Health, Temporary HP, & Thresholds', category: 'Health', aliases: [exact('Bloodied')], related: ['health.wellBloodied', 'health.deathsDoor'] },
  { id: 'health.wellBloodied', name: 'Well-Bloodied', targetTitle: 'Health, Temporary HP, & Thresholds', category: 'Health', aliases: [flexible('Well-Bloodied'), flexible('Well Bloodied')], related: ['health.bloodied', 'health.deathsDoor'] },
  { id: 'health.temporaryHP', name: 'Temporary HP', targetTitle: 'Health, Temporary HP, & Thresholds', category: 'Health', aliases: [flexible('Temporary HP'), exact('Temp HP')] },

  { id: 'resource.actionPoints', name: 'Action Points', targetTitle: 'Action Points', category: 'Combat Resource', aliases: [flexible('Action Points'), exact('AP')] },
  { id: 'resource.staminaPoints', name: 'Stamina Points', targetTitle: 'Stamina Points & Stamina Spend Limit', category: 'Combat Resource', aliases: [flexible('Stamina Points'), exact('SP')], related: ['maneuver.rules'] },
  { id: 'resource.manaPoints', name: 'Mana Points', targetTitle: 'Mana Points & Mana Spend Limit', category: 'Combat Resource', aliases: [flexible('Mana Points'), exact('MP')], related: ['spell.spellcasting'] },
  { id: 'resource.grit', name: 'Grit', targetTitle: 'Grit Points', category: 'Combat Resource', aliases: [exact('Grit'), flexible('Grit Points')] },

  { id: 'action.actions', name: 'Actions', targetTitle: 'Actions & Minor Actions', category: 'Action', aliases: [exact('Actions'), flexible('Minor Action'), flexible('Minor Actions')] },
  { id: 'action.move', name: 'Move Action', targetTitle: 'Actions & Minor Actions', category: 'Action', aliases: [flexible('Move Action')] },
  { id: 'action.help', name: 'Help Action', targetTitle: 'Actions & Minor Actions', category: 'Action', aliases: [flexible('Help Action'), flexible('Help Die')] },
  { id: 'action.spell', name: 'Spell Action', targetTitle: 'Actions & Minor Actions', category: 'Action', aliases: [flexible('Spell Action')] },
  { id: 'action.reaction', name: 'Reaction', targetTitle: 'Reactions', category: 'Reaction', aliases: [exact('Reaction'), exact('Reactions'), flexible('Reaction Point'), flexible('Reaction Points'), exact('RP')] },
  { id: 'action.opportunityAttack', name: 'Opportunity Attack', targetTitle: 'Opportunity Attacks', category: 'Reaction', aliases: [flexible('Opportunity Attack'), flexible('Opportunity Attacks')] },
  { id: 'action.sustain', name: 'Sustain', targetTitle: 'Utility Actions', category: 'Spell Mechanic', aliases: [exact('Sustain'), exact('Sustained'), exact('Sustaining')], related: ['spell.spellcasting', 'condition.dazed'], definition: 'A Sustained effect requires 1 AP at the start of each turn and ends if the creature becomes Dazed.' },
  { id: 'spell.concentration', name: 'Concentration', targetTitle: 'Spellcasting', category: 'Spell Mechanic', aliases: [exact('Concentration')] },
  { id: 'spell.spellcasting', name: 'Spellcasting', targetTitle: 'Spellcasting', category: 'Spell Mechanic', aliases: [exact('Spellcasting'), flexible('Spell Check'), flexible('Spell Checks'), flexible('Spell Attack'), flexible('Spell Attacks')] },
  { id: 'spell.tags', name: 'Spell Sources, Schools, & Tags', targetTitle: 'Spell Sources, Schools, & Tags', category: 'Spell Mechanic', aliases: [explicit('Spell Tag'), explicit('Spell Tags'), explicit('Spell School'), explicit('Spell Source')] },
  { id: 'maneuver.rules', name: 'Maneuvers', targetTitle: 'Maneuvers', category: 'Maneuver', aliases: [exact('Maneuver'), exact('Maneuvers'), flexible('Maneuver Enhancement'), flexible('Maneuver Enhancements'), flexible('Martial Check'), flexible('Martial Checks'), flexible('Martial Attack'), flexible('Martial Attacks')] },

  { id: 'check.formulas', name: 'Checks', targetTitle: 'Check Formulas', category: 'Check', aliases: [flexible('Physical Check'), flexible('Physical Checks'), flexible('Mental Check'), flexible('Mental Checks'), flexible('Skill Check'), flexible('Skill Checks'), flexible('Trade Check'), flexible('Trade Checks'), flexible('Flat Check'), flexible('Flat Checks')] },
  { id: 'save.rules', name: 'Saves', targetTitle: 'Saves, Save Categories, & Save DC', category: 'Save', aliases: [flexible('Physical Save'), flexible('Physical Saves'), flexible('Mental Save'), flexible('Mental Saves'), flexible('Might Save'), flexible('Agility Save'), flexible('Charisma Save'), flexible('Intelligence Save'), flexible('Save DC')], related: ['combat.dynamicAttackSave'] },
  { id: 'combat.dynamicAttackSave', name: 'Dynamic Attack Save', targetTitle: 'Dynamic Attack Saves', category: 'Save', aliases: [flexible('Dynamic Attack Save'), flexible('Dynamic Attack Saves')], related: ['save.rules'] },
  { id: 'combat.multipleCheckPenalty', name: 'Multiple Check Penalty', targetTitle: 'Multiple Check Penalty', category: 'Check', aliases: [flexible('Multiple Check Penalty'), exact('MCP')] },

  { id: 'defense.precisionDefense', name: 'Precision Defense', targetTitle: 'Precision Defense & Area Defense', category: 'Defense', aliases: [flexible('Precision Defense'), exact('PD')], related: ['defense.areaDefense'], definition: 'PD avoids precise attacks. PD = 8 + Combat Mastery + Agility + Intelligence + bonuses.' },
  { id: 'defense.areaDefense', name: 'Area Defense', targetTitle: 'Precision Defense & Area Defense', category: 'Defense', aliases: [flexible('Area Defense'), exact('AD')], related: ['defense.precisionDefense'], definition: 'AD withstands attacks that cover an area. AD = 8 + Combat Mastery + Might + Charisma + bonuses.' },
  { id: 'damage.resistance', name: 'Resistance', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [exact('Resistance'), flexible('Resistance Half'), flexible('Resistance (Half)')], related: ['damage.vulnerability', 'damage.immunity', 'damage.reduction'] },
  { id: 'damage.vulnerability', name: 'Vulnerability', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [exact('Vulnerability'), flexible('Vulnerability Double'), flexible('Vulnerability (Double)')], related: ['damage.resistance', 'damage.immunity'] },
  { id: 'damage.immunity', name: 'Immunity', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [exact('Immunity'), exact('Immune')], related: ['damage.resistance', 'damage.vulnerability'] },
  { id: 'damage.reduction', name: 'Damage Reduction', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [flexible('Damage Reduction'), exact('DR'), exact('PDR'), exact('EDR'), exact('MDR')], related: ['damage.resistance', 'combat.heavyHit', 'combat.criticalHit'] },
  { id: 'damage.types', name: 'Damage Types', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [explicit('Bludgeoning'), explicit('Piercing'), explicit('Slashing'), explicit('Cold'), explicit('Corrosion'), explicit('Fire'), explicit('Lightning'), explicit('Poison'), explicit('Psychic'), explicit('Radiant'), explicit('Umbral'), explicit('True Damage')] },

  { id: 'condition.grappled', name: 'Grappled', targetTitle: 'Creature Sizes & Grappling', category: 'Condition', aliases: [exact('Grappled')], related: ['action.grapple', 'condition.restrained', 'creature.movement'], definition: 'A Grappled creature is Immobilized and can escape with Acrobatics or Athletics contested by the grappler’s Athletics.' },
  { id: 'action.grapple', name: 'Grapple', targetTitle: 'Creature Sizes & Grappling', category: 'Action', aliases: [exact('Grapple'), flexible('Grapple Action')], related: ['condition.grappled', 'condition.restrained'] },
  { id: 'condition.prone', name: 'Prone', targetTitle: 'Prone, Hidden Creatures, & Underwater Combat', category: 'Condition', aliases: [exact('Prone')], definition: 'While Prone, your Attacks have Disadvantage; Melee Attacks against you have Advantage; Ranged Attacks against you have Disadvantage. Standing costs 2 Spaces of movement.' },
  { id: 'damage.poison', name: 'Poison', targetTitle: 'Damage Types, Resistance, & Damage Reduction', category: 'Damage', aliases: [exact('Poisoned'), explicit('Poison')] },
  { id: 'creature.size', name: 'Creature Sizes', targetTitle: 'Creature Sizes & Grappling', category: 'Creature Rule', aliases: [flexible('Creature Size'), flexible('Creature Sizes'), flexible('Size Category'), flexible('Size Categories')] },
  { id: 'creature.movement', name: 'Moving Through Creatures', targetTitle: 'Moving Through Creatures, Collision, & Throwing', category: 'Movement', aliases: [flexible('Moving Through Creatures'), exact('Collision'), exact('Throwing')] },
  { id: 'movement.difficultTerrain', name: 'Difficult Terrain', targetTitle: 'Spaces, Distance, & Difficult Terrain', category: 'Movement', aliases: [flexible('Difficult Terrain')] },
  { id: 'movement.jump', name: 'Jumping', targetTitle: 'Jumping', category: 'Movement', aliases: [flexible('Jump Distance'), exact('Jumping')] },
  { id: 'movement.falling', name: 'Falling', targetTitle: 'Falling', category: 'Movement', aliases: [exact('Falling'), flexible('Falling Damage')] },
  { id: 'combat.cover', name: 'Cover & Concealment', targetTitle: 'Line of Sight, Cover, & Concealment', category: 'Vision', aliases: [exact('Cover'), exact('Concealment'), flexible('Line of Sight')] },
  { id: 'combat.areaOfEffect', name: 'Areas of Effect', targetTitle: 'Areas of Effect', category: 'Area', aliases: [flexible('Area of Effect'), flexible('Areas of Effect'), exact('Sphere'), exact('Cylinder'), exact('Cone'), exact('Cube'), exact('Aura')] },
  { id: 'rest.rules', name: 'Resting', targetTitle: 'Resting', category: 'Rest', aliases: [flexible('Quick Rest'), flexible('Short Rest'), flexible('Long Rest'), flexible('Rest Point'), flexible('Rest Points')] },
  { id: 'equipment.weapons', name: 'Weapons', targetTitle: 'Weapons', category: 'Equipment', aliases: [explicit('Weapons'), explicit('Weapon')] },
];

const WEAPON_PROPERTY_NAMES = ['Ammo', 'Close Quarters', 'Concealable', 'Cumbersome', 'Deft', 'Double Sided', 'Grasp', 'Guard', 'Heavy', 'Impact', 'Long-Ranged', 'Mounted', 'Muffled', 'Multi-Faceted', 'Pinpoint', 'Powerful', 'Protective', 'Reach', 'Reactive', 'Reload', 'Returning', 'Rigid', 'Silent', 'Thrown', 'Toss', 'Two-Handed', 'Unwieldy', 'Versatile', 'Vicious', 'Warded'];
const AMBIGUOUS_PROPERTY_NAMES = new Set(['Ammo', 'Deft', 'Grasp', 'Guard', 'Heavy', 'Mounted', 'Muffled', 'Powerful', 'Protective', 'Reach', 'Reactive', 'Reload', 'Returning', 'Rigid', 'Silent', 'Thrown', 'Toss', 'Versatile', 'Vicious', 'Warded']);

function slug(value: string): string {
  return value.normalize('NFKD').replace(/[’']/g, '').replace(/[^a-zA-Z0-9]+(.)?/g, (_, next: string | undefined) => next ? next.toUpperCase() : '').replace(/^./, (letter) => letter.toLowerCase());
}

export function weaponPropertyRuleID(name: string): string {
  return `equipment.property.${slug(name)}`;
}

function rulesVersion(entry: RuleReferenceEntry): string {
  return entry.page.match(/\b\d+\.\d+\.\d+\b/)?.[0]
    ?? entry.sourceDocument?.match(/\b\d+\.\d+\.\d+\b/)?.[0]
    ?? CURRENT_RULES_VERSION;
}

function buildAliasPattern(aliases: RuleAlias[]): RegExp | null {
  const values = Array.from(new Set(aliases.filter(({ autoLink }) => autoLink !== false).map(({ text }) => text).filter(Boolean)))
    .sort((left, right) => right.length - left.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return values.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${values.join('|')})(?![\\p{L}\\p{N}])`, 'giu') : null;
}

export function buildRuleRegistry(reference: RulesReferenceData): RuleRegistry {
  const titleLookup = new Map<string, RuleReferenceEntry>();
  for (const entry of reference.entries) if (!titleLookup.has(entry.title)) titleLookup.set(entry.title, entry);
  const entries: RuleRegistryEntry[] = [];
  const coveredRuleEntries = new Set<string>();

  for (const concept of CORE_CONCEPTS) {
    const ruleReference = titleLookup.get(concept.targetTitle);
    if (!ruleReference) continue;
    coveredRuleEntries.add(ruleReference.id);
    entries.push({
      id: concept.id,
      canonicalName: concept.name,
      category: concept.category,
      shortDefinition: concept.definition ?? ruleReference.summary,
      ruleEntryID: ruleReference.id,
      source: ruleReference.sourceDocument ?? reference.source,
      rulesVersion: rulesVersion(ruleReference),
      sourcePage: ruleReference.page,
      aliases: concept.aliases,
      relatedIDs: concept.related ?? [],
      ruleReference,
      isConcept: true,
    });
  }

  const weaponsReference = titleLookup.get('Weapons');
  if (weaponsReference) {
    for (const name of WEAPON_PROPERTY_NAMES) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const definition = weaponsReference.text.match(new RegExp(`• ${escapedName}: ([^\\n]+)`))?.[1] ?? weaponsReference.summary;
      entries.push({
        id: weaponPropertyRuleID(name),
        canonicalName: name,
        category: 'Weapon Property',
        shortDefinition: definition,
        ruleEntryID: weaponsReference.id,
        source: weaponsReference.sourceDocument ?? reference.source,
        rulesVersion: rulesVersion(weaponsReference),
        sourcePage: weaponsReference.page,
        aliases: [AMBIGUOUS_PROPERTY_NAMES.has(name) ? explicit(name) : exact(name)],
        relatedIDs: ['equipment.weapons'],
        ruleReference: weaponsReference,
        isConcept: true,
      });
    }
  }

  for (const ruleReference of reference.entries.filter(({ kind, title }) => kind === 'Condition' && !/Condition Rules/i.test(title))) {
    const name = ruleReference.title.replace(/ X$/, '');
    const id = `condition.${slug(name)}`;
    if (entries.some((entry) => entry.id === id)) continue;
    coveredRuleEntries.add(ruleReference.id);
    entries.push({
      id,
      canonicalName: name,
      category: 'Condition',
      shortDefinition: ruleReference.summary,
      ruleEntryID: ruleReference.id,
      source: ruleReference.sourceDocument ?? reference.source,
      rulesVersion: rulesVersion(ruleReference),
      sourcePage: ruleReference.page,
      aliases: [exact(name), ...(ruleReference.title !== name ? [exact(ruleReference.title)] : [])],
      relatedIDs: [],
      ruleReference,
      isConcept: true,
    });
  }

  for (const ruleReference of reference.entries) {
    if (coveredRuleEntries.has(ruleReference.id)) continue;
    const prefix = ruleReference.kind.toLowerCase();
    entries.push({
      id: `${prefix}.${slug(ruleReference.section)}.${slug(ruleReference.subsection)}.${slug(ruleReference.title)}`,
      canonicalName: ruleReference.title,
      category: ruleReference.kind,
      shortDefinition: ruleReference.summary,
      ruleEntryID: ruleReference.id,
      source: ruleReference.sourceDocument ?? reference.source,
      rulesVersion: rulesVersion(ruleReference),
      sourcePage: ruleReference.page,
      aliases: [explicit(ruleReference.title)],
      relatedIDs: [],
      ruleReference,
      isConcept: false,
    });
  }

  const byID = new Map(entries.map((entry) => [entry.id, entry]));
  const byRuleEntryID = new Map<string, RuleRegistryEntry>();
  for (const entry of entries) if (!byRuleEntryID.has(entry.ruleEntryID)) byRuleEntryID.set(entry.ruleEntryID, entry);
  for (const entry of entries) {
    const documentRelated = entry.ruleReference.relatedIDs ?? [];
    entry.relatedIDs = Array.from(new Set([
      ...entry.relatedIDs,
      ...documentRelated.map((id) => byRuleEntryID.get(id)?.id).filter((id): id is string => Boolean(id)),
    ])).filter((id) => id !== entry.id);
  }
  const aliases = new Map<string, Array<{ entry: RuleRegistryEntry; alias: RuleAlias }>>();
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      const normalized = alias.text.toLocaleLowerCase();
      aliases.set(normalized, [...(aliases.get(normalized) ?? []), { entry, alias }]);
    }
  }
  return {
    version: CURRENT_RULES_VERSION,
    entries,
    byID,
    byRuleEntryID,
    aliases,
    autoAliasPattern: buildAliasPattern(entries.flatMap(({ aliases: entryAliases }) => entryAliases)),
  };
}

export function resolveRuleAlias(registry: RuleRegistry, visibleText: string, autoOnly = false): RuleRegistryEntry | null {
  const matches = (registry.aliases.get(visibleText.toLocaleLowerCase()) ?? [])
    .filter(({ alias }) => (!autoOnly || alias.autoLink !== false) && (!alias.caseSensitive || alias.text === visibleText));
  const unique = Array.from(new Map(matches.map(({ entry }) => [entry.id, entry])).values());
  return unique.length === 1 ? unique[0] : null;
}

export type ParsedRuleSegment =
  | { kind: 'text'; text: string }
  | { kind: 'rule'; text: string; ruleID: string; explicit: boolean };

const parserCache = new Map<string, ParsedRuleSegment[]>();
const missingRuleIDsLogged = new Set<string>();
const MAX_CACHE_ENTRIES = 500;

function cacheResult(key: string, value: ParsedRuleSegment[]): ParsedRuleSegment[] {
  if (parserCache.size >= MAX_CACHE_ENTRIES) parserCache.delete(parserCache.keys().next().value ?? '');
  parserCache.set(key, value);
  return value;
}

export function parseRuleText(text: string, registry: RuleRegistry, references: SemanticRuleReference[] = []): ParsedRuleSegment[] {
  if (!text) return [{ kind: 'text', text }];
  const referenceKey = references.map(({ ruleId, text: label, start, end, disabled }) => `${ruleId}:${label ?? ''}:${start ?? ''}:${end ?? ''}:${disabled ? 'off' : 'on'}`).join('|');
  const cacheKey = `${registry.version}\u0000${referenceKey}\u0000${text}`;
  const cached = parserCache.get(cacheKey);
  if (cached) return cached;

  const candidates: Array<{ start: number; end: number; ruleID: string; explicit: boolean }> = [];
  for (const reference of references.filter(({ disabled }) => !disabled)) {
    if (!registry.byID.has(reference.ruleId)) {
      const missingKey = `${registry.version}:${reference.ruleId}`;
      if (!missingRuleIDsLogged.has(missingKey)) {
        missingRuleIDsLogged.add(missingKey);
        console.warn(`[rules-cross-link] Missing rule reference: ${reference.ruleId}`);
      }
      continue;
    }
    if (reference.start !== undefined && reference.end !== undefined && reference.start >= 0 && reference.end > reference.start && reference.end <= text.length) {
      candidates.push({ start: reference.start, end: reference.end, ruleID: reference.ruleId, explicit: true });
      continue;
    }
    const label = reference.text;
    if (!label) continue;
    let from = 0;
    while (from < text.length) {
      const start = text.indexOf(label, from);
      if (start < 0) break;
      candidates.push({ start, end: start + label.length, ruleID: reference.ruleId, explicit: true });
      from = start + label.length;
    }
  }

  if (registry.autoAliasPattern) {
    registry.autoAliasPattern.lastIndex = 0;
    const counts = new Map<string, number>();
    let match: RegExpExecArray | null;
    while ((match = registry.autoAliasPattern.exec(text)) && candidates.length < 80) {
      const visible = match[1];
      const entry = resolveRuleAlias(registry, visible, true);
      if (!entry || (counts.get(entry.id) ?? 0) >= 3) continue;
      const end = match.index + visible.length;
      const suppressed = references.some((reference) => reference.disabled && reference.ruleId === entry.id && (
        reference.start !== undefined && reference.end !== undefined
          ? match!.index < reference.end && end > reference.start
          : reference.text?.toLocaleLowerCase() === visible.toLocaleLowerCase()
      ));
      if (suppressed) continue;
      candidates.push({ start: match.index, end, ruleID: entry.id, explicit: false });
      counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1);
    }
  }

  const accepted: typeof candidates = [];
  for (const candidate of candidates.sort((left, right) => left.start - right.start || Number(right.explicit) - Number(left.explicit) || (right.end - right.start) - (left.end - left.start))) {
    const overlap = accepted.find((entry) => candidate.start < entry.end && candidate.end > entry.start);
    if (!overlap) accepted.push(candidate);
    else if (candidate.explicit && !overlap.explicit) accepted.splice(accepted.indexOf(overlap), 1, candidate);
  }
  accepted.sort((left, right) => left.start - right.start);
  const segments: ParsedRuleSegment[] = [];
  let cursor = 0;
  for (const candidate of accepted) {
    if (candidate.start < cursor) continue;
    if (candidate.start > cursor) segments.push({ kind: 'text', text: text.slice(cursor, candidate.start) });
    segments.push({ kind: 'rule', text: text.slice(candidate.start, candidate.end), ruleID: candidate.ruleID, explicit: candidate.explicit });
    cursor = candidate.end;
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
  return cacheResult(cacheKey, segments.length ? segments : [{ kind: 'text', text }]);
}

export function detectedRuleReferences(text: string, registry: RuleRegistry): SemanticRuleReference[] {
  return Array.from(new Map(parseRuleText(text, registry).filter((segment): segment is Extract<ParsedRuleSegment, { kind: 'rule' }> => segment.kind === 'rule')
    .map((segment) => [segment.ruleID, { ruleId: segment.ruleID, text: segment.text }])).values());
}
