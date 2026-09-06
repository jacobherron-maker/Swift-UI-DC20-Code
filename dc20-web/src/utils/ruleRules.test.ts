import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CharacterReferenceData, EquipmentCatalogItem, RulesReferenceData } from '../types/models';
import {
  AUDITED_SECTION_RANGES,
  auditRulesReference,
  ruleTextBlocks,
  sourcePages,
  type AuditedManeuverRecord,
  type AuditedSpellRecord,
} from './ruleRules';

function readJSON<T>(relativePath: string): T {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const rawRules = readJSON<RulesReferenceData>('../../public/data/RulesReference.json');
const spellDocument = readJSON<{ spells: AuditedSpellRecord[] }>('../../public/data/BetaSpells.json');
const maneuverDocument = readJSON<{ maneuvers: AuditedManeuverRecord[] }>('../../public/data/BetaManeuvers.json');
const characterReference = readJSON<CharacterReferenceData>('../../public/data/CharacterReference.json');
const equipment = readJSON<EquipmentCatalogItem[]>('../../public/data/EquipmentCatalog.json');
const audited = auditRulesReference(rawRules, spellDocument.spells, maneuverDocument.maneuvers, characterReference, equipment);

function rule(title: string) {
  const entry = audited.entries.find((candidate) => candidate.title === title);
  if (!entry) throw new Error(`Missing rule: ${title}`);
  return entry;
}

describe('source-audited rules library', () => {
  it('retains every unique document and uses the corrected printed chapter ranges', () => {
    expect(audited.entries).toHaveLength(475);
    expect(new Set(audited.entries.map(({ id }) => id)).size).toBe(475);
    expect(audited.sections).toEqual(AUDITED_SECTION_RANGES);
    expect(rule('Core Rules Overview').page).toBe('Beta 0.10.5 pp.9–39');
    expect(rule('Combat Rules Overview').page).toBe('Beta 0.10.5 pp.40–150');
    expect(rule('General Rules Overview').page).toBe('Beta 0.10.5 pp.151–180');
    expect(rule('Character Creation Overview').page).toBe('Beta 0.10.5 pp.181–185');
  });

  it('corrects representative page shifts throughout every rules chapter', () => {
    expect(rule('Attributes').page).toBe('Beta 0.10.5 pp.10–11');
    expect(rule('Languages').page).toBe('Beta 0.10.5 p.19');
    expect(rule('Action Points').page).toBe('Beta 0.10.5 p.41');
    expect(rule('Spellcasting').page).toBe('Beta 0.10.5 pp.60–61');
    expect(rule('Starting Combat & Encounter DC').page).toBe('Beta 0.10.5 p.146');
    expect(rule('Resting').page).toBe('Beta 0.10.5 p.177');
    expect(rule('Step 10: Weapons & Inventory').page).toBe('Beta 0.10.5 p.184');
    expect(rule('Ancestry System').page).toBe('Beta 0.10.5 pp.194–196');
    expect(rule('Bleeding X').page).toBe('Beta 0.10.5 p.173');
    expect(rule('Unconscious').page).toBe('Beta 0.10.5 p.174');
  });

  it('gives every document visible source provenance and searchable mechanical metadata', () => {
    for (const entry of audited.entries) {
      expect(entry.sourceDocument).not.toBe('');
      expect(entry.sourceStatus).toMatch(/source verified$/);
      expect(entry.sourcePages?.length ?? 0).toBeGreaterThan(0);
    }
    expect(rule('Check Formulas').formulas).toContain('Skill Check = d20 + Attribute + Skill Mastery');
    expect(rule('Precision Defense & Area Defense').formulas).toHaveLength(2);
    expect(rule('Psion').sourceDocument).toContain('Psion v2');
    expect(rule('Summoner').sourceDocument).toContain('The Summoner v1.0');
    const summonerParagon = audited.entries.find(({ title, characterClass }) => title === 'Paragon' && characterClass === 'Summoner')!;
    expect(summonerParagon.sourceDocument).toBe('DC20 RPG Beta 0.10.5');
  });

  it('replaces all duplicate spell and maneuver records with the audited catalogs', () => {
    const spellEntries = audited.entries.filter(({ kind }) => kind === 'Spell');
    const maneuverEntries = audited.entries.filter(({ kind }) => kind === 'Maneuver');
    expect(spellEntries).toHaveLength(160);
    expect(maneuverEntries).toHaveLength(30);
    for (const source of spellDocument.spells) {
      const entry = spellEntries.find(({ title }) => title === source.name)!;
      expect(entry.page).toBe(`Beta 0.10.5 p.${source.page}`);
      expect(entry.text).toContain(source.description);
      expect(entry.text).toContain(source.enhancements);
      expect(entry.details).toContainEqual({ label: 'Resolution', value: source.resolution });
      expect(entry.sourceNote).toBe(source.sourceNote);
    }
    for (const source of maneuverDocument.maneuvers) {
      const entry = maneuverEntries.find(({ title }) => title === source.name)!;
      expect(entry.page).toBe(`Beta 0.10.5 p.${source.page}`);
      expect(entry.text).toContain(source.description);
      expect(entry.text).toContain(source.enhancements);
      expect(entry.details).toContainEqual({ label: 'Resolution', value: source.resolution });
    }
  });

  it('uses the audited character and equipment catalogs instead of stale Rules copies', () => {
    const athletics = characterReference.skills.find(({ name }) => name === 'Athletics')!;
    expect(rule('Athletics').text).toBe(athletics.description);
    expect(rule('Athletics').details).toContainEqual({ label: 'Associated Attribute', value: 'Might' });
    expect(rule('Beastborn').text).toContain('Beastkind — 0 Ancestry Points');
    expect(rule('Beastborn').text).toContain('Shell Retreat');
    expect(rule('Beastborn').details).toContainEqual({ label: 'Published Traits', value: '52' });
    const axe = equipment.find(({ name }) => name === 'Battleaxe')!;
    expect(rule('Weapons').text).toContain(axe.mechanics);
    expect(rule('Weapons').details).toContainEqual({ label: 'Catalog Records', value: String(equipment.filter(({ category }) => category === 'Weapons').length) });
    const barbarian = characterReference.classes.find(({ name }) => name === 'Barbarian')!;
    const elementalFury = barbarian.subclassFeatures['Elemental Fury'][0];
    expect(rule('Elemental Fury').text).toContain(elementalFury.description);
    expect(rule('Martial Expansion').details).toContainEqual({ label: 'Repeatable', value: 'No' });
    expect(rule('Unfathomable Strength').details).toContainEqual({ label: 'Requirements', value: 'Rage' });
  });

  it('builds useful in-library cross references', () => {
    const byID = new Map(audited.entries.map((entry) => [entry.id, entry]));
    const relatedTitles = (title: string) => (rule(title).relatedIDs ?? []).map((id) => byID.get(id)?.title);
    expect(relatedTitles('Attributes')).toContain('Prime Modifier');
    expect(relatedTitles('Spellcasting')).toContain('Spell Sources, Schools, & Tags');
    expect(relatedTitles('Arcane Bolt')).toContain('Spellcasting');
    expect(relatedTitles('Heroic Bash')).toContain('Maneuvers');
    expect(relatedTitles('Burning X')).toContain('Condition Rules');
  });
});

describe('rules document formatting', () => {
  it('parses headings, subheadings, bullets, callouts, and paragraphs without rewriting them', () => {
    const blocks = ruleTextBlocks('FEATURES\n\nLevel Feature\nThis is text.\n• First effect\nDC Tip: Remember this.');
    expect(blocks).toEqual([
      { kind: 'heading', text: 'FEATURES' },
      { kind: 'subheading', text: 'Level Feature' },
      { kind: 'paragraph', text: 'This is text.' },
      { kind: 'bullet', text: 'First effect' },
      { kind: 'callout', text: 'DC Tip: Remember this.' },
    ]);
  });

  it('extracts printed page ranges without treating version numbers as pages', () => {
    expect(sourcePages('Beta 0.10.5 pp.37–39')).toEqual([37, 38, 39]);
    expect(sourcePages('Beta 0.10.5 pp.47–48, 66')).toEqual([47, 48, 66]);
    expect(sourcePages('Beta 0.10.5 pp.253-258; Class Talents p.189')).toEqual([253, 254, 255, 256, 257, 258, 189]);
  });
});
