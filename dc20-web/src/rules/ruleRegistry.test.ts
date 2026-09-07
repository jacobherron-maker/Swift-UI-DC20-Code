import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { CharacterReferenceData, EquipmentCatalogItem, RulesReferenceData } from '../types/models';
import { auditRulesReference, type AuditedManeuverRecord, type AuditedSpellRecord } from '../utils/ruleRules';
import { buildRuleRegistry, detectedRuleReferences, parseRuleText } from './ruleRegistry';

function readJSON<T>(relativePath: string): T {
  return JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')) as T;
}

const rawRules = readJSON<RulesReferenceData>('../../public/data/RulesReference.json');
const spellDocument = readJSON<{ spells: AuditedSpellRecord[] }>('../../public/data/BetaSpells.json');
const maneuverDocument = readJSON<{ maneuvers: AuditedManeuverRecord[] }>('../../public/data/BetaManeuvers.json');
const characterReference = readJSON<CharacterReferenceData>('../../public/data/CharacterReference.json');
const equipment = readJSON<EquipmentCatalogItem[]>('../../public/data/EquipmentCatalog.json');
const registry = buildRuleRegistry(auditRulesReference(rawRules, spellDocument.spells, maneuverDocument.maneuvers, characterReference, equipment));

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
    expect(linkedIDs('The weapon gains Impact.')).toContain('equipment.property.impact');
    expect(registry.byID.get('equipment.property.impact')?.shortDefinition).toContain('+1 damage on Heavy Hits');
  });

  it('does not link ambiguous or partial language', () => {
    expect(linkedIDs('Please save this note before attacking the adaptation.')).toEqual([]);
    expect(linkedIDs('The captain has a heavy responsibility.')).toEqual([]);
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
