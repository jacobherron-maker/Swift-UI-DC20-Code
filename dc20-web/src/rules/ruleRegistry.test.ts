import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterReferenceData, EquipmentCatalogItem, RulesReferenceData } from '../types/models';
import { auditRulesReference, type AuditedManeuverRecord, type AuditedSpellRecord } from '../utils/ruleRules';
import { buildRuleRegistry, detectedRuleReferences, parseRuleText, resolveRuleAlias } from './ruleRegistry';

function readJSON<T>(relativePath: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')) as T;
}

const rawRules = readJSON<RulesReferenceData>('../../public/data/RulesReference.json');
const spellDocument = readJSON<{ spells: AuditedSpellRecord[] }>('../../public/data/BetaSpells.json');
const maneuverDocument = readJSON<{ maneuvers: AuditedManeuverRecord[] }>('../../public/data/BetaManeuvers.json');
const characterReference = readJSON<CharacterReferenceData>('../../public/data/CharacterReference.json');
const equipment = readJSON<EquipmentCatalogItem[]>('../../public/data/EquipmentCatalog.json');
const supplementalRules = [
  ...readJSON<RulesReferenceData['entries']>('../../public/data/AdventureRewardBoons.json'),
  ...readJSON<RulesReferenceData['entries']>('../../public/data/MagicalConsumablesRules.json'),
  ...readJSON<RulesReferenceData['entries']>('../../public/data/PoisonsRules.json'),
];
const supplementalEquipment = [
  ...readJSON<EquipmentCatalogItem[]>('../../public/data/MundaneObjects.json'),
  ...readJSON<EquipmentCatalogItem[]>('../../public/data/AdventureRewards.json'),
  ...readJSON<EquipmentCatalogItem[]>('../../public/data/MagicalConsumables.json'),
  ...readJSON<EquipmentCatalogItem[]>('../../public/data/Poisons.json'),
];
const audited = auditRulesReference(
  { ...rawRules, entries: [...rawRules.entries, ...supplementalRules] },
  spellDocument.spells,
  maneuverDocument.maneuvers,
  characterReference,
  [...equipment, ...supplementalEquipment],
);
const registry = buildRuleRegistry(audited);

const linkedIDs = (text: string) => parseRuleText(text, registry).flatMap((segment) => segment.kind === 'rule' ? [segment.ruleID] : []);

describe('central semantic rules registry', () => {
  it('keeps stable IDs, current provenance, and related rules', () => {
    const heavyHit = registry.byID.get('combat.heavyHit');
    expect(heavyHit?.canonicalName).toBe('Heavy Hit');
    expect(heavyHit?.rulesVersion).toBe('0.10.5');
    expect(heavyHit?.source).toContain('DC20');
    expect(heavyHit?.sourcePage).toContain('0.10.5');
    expect(heavyHit?.relatedIDs).toContain('combat.criticalHit');
  });

  it('links representative monster, spell, homebrew, and stat-block language', () => {
    expect(linkedIDs('On a Heavy Hit, the target becomes Grappled.')).toEqual(expect.arrayContaining(['combat.heavyHit', 'condition.grappled']));
    expect(linkedIDs('Sustain the spell while the creature is Burning.')).toEqual(expect.arrayContaining(['action.sustain', 'condition.burning']));
    expect(linkedIDs('Compare the result against PD or AD.')).toEqual(expect.arrayContaining(['defense.precisionDefense', 'defense.areaDefense']));
    expect(linkedIDs('The weapon gains the Impact Property.')).toContain('equipment.property.impact');
    expect(registry.byID.get('equipment.property.impact')?.shortDefinition).toContain('+1 damage on Heavy Hits');
  });

  it('routes each rules term to the document that actually defines it', () => {
    const target = (alias: string) => resolveRuleAlias(registry, alias, true)?.ruleReference.title;
    expect(target('Critical Success')).toBe('Critical Outcomes & Degrees of Success');
    expect(target('Critical Hit')).toBe('Damage, Heavy Hits, & Critical Hits');
    expect(target('Attack Check')).toBe('Check Formulas');
    expect(target('Spell Check')).toBe('Check Formulas');
    expect(target('Martial Check')).toBe('Check Formulas');
    expect(target('Spell Attack')).toBe('Attacks & Attack Ranges');
    expect(target('Martial Attack')).toBe('Attacks & Attack Ranges');
    expect(target('Melee Attack')).toBe('Attacks & Attack Ranges');
    expect(target('Move Action')).toBe('Utility Actions');
    expect(target('Help Action')).toBe('Utility Actions');
    expect(target('Grapple')).toBe('Offensive Actions');
    expect(target('Close Quarters')).toBe('Attacks & Attack Ranges');
    expect(target('RP')).toBe('Resting');
  });

  it('keeps version-incompatible and category-ambiguous language from auto-linking', () => {
    expect(resolveRuleAlias(registry, 'Concentration', true)).toBeNull();
    expect(resolveRuleAlias(registry, 'Reaction Points', true)).toBeNull();
    expect(resolveRuleAlias(registry, 'Resistance', true)).toBeNull();
    expect(resolveRuleAlias(registry, 'Immunity', true)).toBeNull();
    expect(resolveRuleAlias(registry, 'Cube', true)).toBeNull();
    expect(resolveRuleAlias(registry, 'Impact', true)).toBeNull();
    expect(resolveRuleAlias(registry, 'Close Quarters Property', true)?.id).toBe('equipment.property.closeQuarters');
    expect(resolveRuleAlias(registry, 'Impact Property', true)?.id).toBe('equipment.property.impact');
  });

  it('distinguishes damage defenses from condition defenses', () => {
    expect(resolveRuleAlias(registry, 'Damage Resistance', true)?.id).toBe('damage.resistance');
    expect(resolveRuleAlias(registry, 'Resistance (Half)', true)?.id).toBe('damage.resistance');
    expect(resolveRuleAlias(registry, 'Condition Resistance', true)?.id).toBe('condition.resistance');
    expect(resolveRuleAlias(registry, 'Damage Vulnerability', true)?.id).toBe('damage.vulnerability');
    expect(resolveRuleAlias(registry, 'Condition Vulnerability', true)?.id).toBe('condition.vulnerability');
  });

  it('uses the correct equipment chapter and source text for every property quick rule', () => {
    expect(registry.byID.get('equipment.property.closeQuarters')).toMatchObject({ category: 'Spell Focus Property', ruleEntryID: expect.stringContaining('Spell Focuses') });
    expect(registry.byID.get('equipment.property.grasp')).toMatchObject({ category: 'Shield Property', ruleEntryID: expect.stringContaining('Shields') });
    expect(registry.byID.get('equipment.property.armor.rigid')).toMatchObject({ category: 'Armor Property', ruleEntryID: expect.stringContaining('Armor') });
    expect(registry.byID.get('equipment.property.shields.rigid')).toMatchObject({ category: 'Shield Property', ruleEntryID: expect.stringContaining('Shields') });
    expect(registry.byID.get('equipment.property.weapons.longRanged')?.shortDefinition).toContain('30/90');
    expect(registry.byID.get('equipment.property.spellFocuses.longRanged')?.shortDefinition).toContain('5 Spaces');
    expect(registry.byID.get('equipment.property.doubleSided')).toMatchObject({ source: 'DC20 Magazine 27 — Mundane Objects', sourcePage: 'DC20 Magazine 27 p.3' });
    for (const property of registry.entries.filter(({ id }) => id.startsWith('equipment.property.'))) {
      expect(property.shortDefinition).not.toMatch(/published catalog entr/i);
      expect(property.shortDefinition.length).toBeGreaterThan(20);
    }
  });

  it('gives summary links a meaningful audited quick definition', () => {
    const summaryLinks = audited.entries.flatMap(({ summary }) => parseRuleText(summary, registry).flatMap((segment) => segment.kind === 'rule' ? [registry.byID.get(segment.ruleID)] : []));
    expect(summaryLinks.length).toBeGreaterThan(100);
    for (const entry of summaryLinks) {
      expect(entry).toBeDefined();
      expect(entry?.shortDefinition.trim().length).toBeGreaterThan(10);
      expect(entry?.shortDefinition).not.toMatch(/^(?:Condition|Stacking Condition)$/i);
      expect(entry?.shortDefinition).not.toMatch(/published catalog entr/i);
    }
  });

  it('keeps every automatic alias unique and resolvable', () => {
    for (const entry of registry.entries) {
      for (const alias of entry.aliases.filter(({ autoLink }) => autoLink !== false)) {
        expect(resolveRuleAlias(registry, alias.text, true)?.id, alias.text).toBe(entry.id);
      }
    }
  });

  it('does not link ambiguous or partial language', () => {
    expect(linkedIDs('Please save this note before attacking the adaptation.')).toEqual([]);
    expect(linkedIDs('The captain has a heavy responsibility.')).toEqual([]);
    expect(linkedIDs('Reaction Points are not a DC20 resource.')).toEqual([]);
    expect(linkedIDs('Deft Footwork improves movement.')).toEqual([]);
  });

  it('supports explicit author references while ignoring unavailable IDs safely', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const segments = parseRuleText('A strange fire surrounds it.', registry, [
      { ruleId: 'condition.burning', text: 'strange fire', rulesVersion: '0.9.0' },
      { ruleId: 'missing.rule', text: 'surrounds' },
    ]);
    expect(segments.some((segment) => segment.kind === 'rule' && segment.ruleID === 'condition.burning' && segment.explicit)).toBe(true);
    expect(segments.some((segment) => segment.kind === 'rule' && segment.ruleID === 'missing.rule')).toBe(false);
    expect(warn).toHaveBeenCalledWith('[rules-cross-link] Missing rule reference: missing.rule');
    warn.mockRestore();
  });

  it('lets authors suppress an incorrect automatic link without changing their text', () => {
    const segments = parseRuleText('The target is Grappled.', registry, [{ ruleId: 'condition.grappled', text: 'Grappled', disabled: true }]);
    expect(segments.map(({ text }) => text).join('')).toBe('The target is Grappled.');
    expect(segments.some(({ kind }) => kind === 'rule')).toBe(false);
  });

  it('caches parsed content and emits reviewable semantic references', () => {
    const first = parseRuleText('Grappled and Prone', registry);
    expect(parseRuleText('Grappled and Prone', registry)).toBe(first);
    expect(detectedRuleReferences('Grappled and Prone', registry).map(({ ruleId }) => ruleId)).toEqual(['condition.grappled', 'condition.prone']);
  });
});
