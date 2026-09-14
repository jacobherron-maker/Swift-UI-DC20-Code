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
const adventureRewards = readJSON<EquipmentCatalogItem[]>('../../public/data/AdventureRewards.json');
const adventureBoons = readJSON<RulesReferenceData['entries']>('../../public/data/AdventureRewardBoons.json');
const magicalConsumables = readJSON<EquipmentCatalogItem[]>('../../public/data/MagicalConsumables.json');
const magicalConsumableRules = readJSON<RulesReferenceData['entries']>('../../public/data/MagicalConsumablesRules.json');
const poisons = readJSON<EquipmentCatalogItem[]>('../../public/data/Poisons.json');
const poisonRules = readJSON<RulesReferenceData['entries']>('../../public/data/PoisonsRules.json');
const mundaneObjects = readJSON<EquipmentCatalogItem[]>('../../public/data/MundaneObjects.json');
const allEquipment = [...equipment, ...mundaneObjects, ...adventureRewards, ...magicalConsumables, ...poisons];
const auditedWithAdventureRewards = auditRulesReference(
  { ...rawRules, entries: [...rawRules.entries, ...adventureBoons] },
  spellDocument.spells,
  maneuverDocument.maneuvers,
  characterReference,
  [...equipment, ...adventureRewards],
);
const auditedWithMagicalConsumables = auditRulesReference(
  { ...rawRules, entries: [...rawRules.entries, ...magicalConsumableRules] },
  spellDocument.spells,
  maneuverDocument.maneuvers,
  characterReference,
  [...equipment, ...magicalConsumables],
);
const auditedWithPoisons = auditRulesReference(
  { ...rawRules, entries: [...rawRules.entries, ...poisonRules] },
  spellDocument.spells,
  maneuverDocument.maneuvers,
  characterReference,
  [...equipment, ...poisons],
);
const fullyAudited = auditRulesReference(
  { ...rawRules, entries: [...rawRules.entries, ...adventureBoons, ...magicalConsumableRules, ...poisonRules] },
  spellDocument.spells,
  maneuverDocument.maneuvers,
  characterReference,
  allEquipment,
);

function rule(title: string) {
  const entry = audited.entries.find((candidate) => candidate.title === title);
  if (!entry) throw new Error(`Missing rule: ${title}`);
  return entry;
}

describe('source-audited rules library', () => {
  it('indexes the Adventure Rewards Boons as supplemental source documents', () => {
    const boons = auditedWithAdventureRewards.entries.filter(({ subsection }) => subsection.startsWith('Adventure Rewards'));
    expect(boons).toHaveLength(4);
    expect(boons.map(({ title }) => title)).toEqual(['Boons', 'Rampaging Monster', 'Cleanse an Ancient Forest', 'Impress a Lake Goddess']);
    for (const entry of boons) {
      expect(entry.sourceDocument).toBe('DC20 Magazine 20 — Adventure Rewards v1.0');
      expect(entry.sourceStatus).toBe('Supplemental source verified');
      expect(entry.sourcePages).toEqual([8]);
    }
  });

  it('indexes Magical Consumables guidance with formulas and supplemental provenance', () => {
    const entries = auditedWithMagicalConsumables.entries.filter(({ subsection }) => subsection.startsWith('Magical Consumables'));
    expect(entries).toHaveLength(7);
    expect(entries.every(({ sourceDocument, sourceStatus, sourcePages }) => (
      sourceDocument === 'DC20 Magazine 24 — Magical Consumables'
      && sourceStatus === 'Supplemental source verified'
      && sourcePages?.[0] === 3
    ))).toBe(true);
    expect(entries.find(({ title }) => title === 'Spell Consumables')?.formulas).toEqual([
      'Magic Power = Base MP + Enhancement MP + (AP / 2)',
    ]);
    expect(entries.find(({ title }) => title === 'Equipment Property Consumables')?.text).toContain('holding the Shield does not count as performing Somatic Components');
  });

  it('indexes the complete Poison subsystem with its legacy-version warning', () => {
    const entries = auditedWithPoisons.entries.filter(({ subsection }) => subsection.startsWith('Poisons'));
    expect(entries).toHaveLength(9);
    expect(entries.every(({ sourceDocument, sourceStatus, sourcePages, sourceNote }) => (
      sourceDocument === 'DC20 Magazine 15 — Poisons'
      && sourceStatus === 'Supplemental source verified'
      && (sourcePages?.[0] ?? 0) >= 3
      && (sourcePages?.[0] ?? 0) <= 5
      && sourceNote?.includes('Beta 0.9.5')
    ))).toBe(true);
    expect(entries.find(({ title }) => title === 'Using Poisons')?.formulas).toEqual([
      '2+ Sizes Smaller Throw Distance = 2 × Might',
      '1 Size Smaller Throw Distance = Might',
      'Same Size Throw Distance = 1/2 Might',
    ]);
    expect(entries.find(({ title }) => title === 'Poison Containers')?.details).toContainEqual({
      label: 'Cask', value: '20 doses • 5 Space Diameter Sphere',
    });
    expect(entries.find(({ title }) => title === 'Poisons')?.relatedIDs?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('retains every unique document and uses the corrected printed chapter ranges', () => {
    expect(audited.entries).toHaveLength(502 + equipment.length);
    expect(new Set(audited.entries.map(({ id }) => id)).size).toBe(502 + equipment.length);
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
    expect(rule('Bleeding X').page).toBe('Beta 0.10.5 pp.35, 173');
    expect(rule('Bleeding X').sourceNote).toContain('expanded Medicine outcome');
    expect(rule('Unconscious').page).toBe('Beta 0.10.5 p.174');
    expect(rule('Trade Tools').page).toBe('Beta 0.10.5 pp.15–18');
  });

  it('gives every document visible source provenance and an honest verification level', () => {
    const allowedStatuses = new Set(['Beta source verified', 'Supplemental source verified', 'Verified source excerpt', 'Condensed source reference', 'Catalog source reference']);
    for (const entry of audited.entries) {
      expect(entry.sourceDocument).not.toBe('');
      expect(allowedStatuses.has(entry.sourceStatus ?? '')).toBe(true);
      expect(entry.sourcePages?.length ?? 0).toBeGreaterThan(0);
    }
    expect(rule('Core Rules Overview').sourceStatus).toBe('Condensed source reference');
    expect(rule('Resting').sourceStatus).toBe('Beta source verified');
    expect(rule('Weapons').sourceStatus).toBe('Verified source excerpt');
    expect(rule('Check Formulas').formulas).toContain('Skill Check = d20 + Attribute + Skill Mastery');
    expect(rule('Precision Defense & Area Defense').formulas).toHaveLength(2);
    expect(rule('Psion').sourceDocument).toContain('Psion v2');
    expect(rule('Summoner').sourceDocument).toContain('The Summoner v1.0');
    expect(rule('Artificer').sourceDocument).toBe('DC20 Magazine 16 — Artificer');
    expect(rule('Oracle').sourceDocument).toBe('DC20 Magazine 09 — Psion Subclasses v1.1');
    expect(rule('Psi-Knight').text).toContain('Psionic Barrier');
    expect(rule('Artificer').text).toContain('Infusion Magic');
    expect(rule('Spell Bomb (Artificer Infusion)').text).toContain('Priming:');
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

  it('keeps rule prose separate from individually sourced equipment catalog records', () => {
    const athletics = characterReference.skills.find(({ name }) => name === 'Athletics')!;
    expect(rule('Athletics').text).toBe(athletics.description);
    expect(rule('Athletics').details).toContainEqual({ label: 'Associated Attribute', value: 'Might' });
    expect(rule('Beastborn').text).toContain('Beastkind — 0 Ancestry Points');
    expect(rule('Beastborn').text).toContain('Shell Retreat');
    expect(rule('Beastborn').details).toContainEqual({ label: 'Published Traits', value: '52' });
    const axe = equipment.find(({ name }) => name === 'Battleaxe')!;
    expect(rule('Weapons').text).toContain('WEAPON TYPES');
    expect(rule('Weapons').text).not.toContain(axe.mechanics);
    expect(rule('Battleaxe').text).toBe(axe.mechanics);
    expect(rule('Battleaxe').page).toBe(axe.sourcePage);
    expect(rule('Battleaxe').sourceStatus).toBe('Catalog source reference');
    const barbarian = characterReference.classes.find(({ name }) => name === 'Barbarian')!;
    const elementalFury = barbarian.subclassFeatures['Elemental Fury'][0];
    expect(rule('Elemental Fury').text).toContain(elementalFury.description);
    expect(rule('Martial Expansion').details).toContainEqual({ label: 'Repeatable', value: 'No' });
    expect(rule('Unfathomable Strength').details).toContainEqual({ label: 'Requirements', value: 'Rage' });
  });

  it('indexes every equipment category and preserves per-item supplemental provenance', () => {
    const catalogEntries = fullyAudited.entries.filter(({ id }) => id.startsWith('General Rules|Equipment Catalog|'));
    expect(catalogEntries).toHaveLength(allEquipment.length);
    const owlCloak = catalogEntries.find(({ title }) => title === 'Owl Cloak');
    expect(owlCloak).toMatchObject({
      page: 'DC20 Magazine 20 p.4',
      sourceDocument: 'DC20 Magazine 20 — Adventure Rewards v1.0',
      sourceStatus: 'Catalog source reference',
      subsection: 'Equipment Catalog — Wondrous Items',
    });
    const ballista = catalogEntries.find(({ title }) => title === 'Ballista');
    expect(ballista).toMatchObject({
      page: 'DC20 Magazine 27 p.3',
      sourceDocument: 'DC20 Magazine 27 — Mundane Objects',
      sourceStatus: 'Catalog source reference',
      subsection: 'Equipment Catalog — Siege Weapons',
    });
    expect(catalogEntries.filter(({ subsection }) => subsection.endsWith('Wondrous Items'))).toHaveLength(9);
    expect(catalogEntries.filter(({ subsection }) => subsection.endsWith('Siege Weapons'))).toHaveLength(1);
  });

  it('uses source-specific subclass progression metadata', () => {
    const progression = (title: string, characterClass: string) => fullyAudited.entries
      .find((entry) => entry.kind === 'Subclass' && entry.title === title && entry.characterClass === characterClass)
      ?.details?.find(({ label }) => label === 'Progression')?.value;
    expect(progression('Elemental Fury', 'Barbarian')).toBe('Levels 3, 7, and 10');
    expect(progression('Apothecary', 'Artificer')).toBe('Levels 3, 6, and 9');
    expect(progression('Oracle', 'Psion')).toBe('Level 3 published; later subclass levels are not yet published');
  });

  it('lists every installed supplemental class in the Classes Overview', () => {
    expect(rule('Classes Overview').text).toContain('Psion, Summoner, and Artificer');
  });

  it('uses source-grounded summaries instead of labels and catalog counts', () => {
    expect(rule('Athletics').summary).toContain('physical prowess');
    expect(rule('Blacksmithing').summary).toContain('melting and shaping metal');
    expect(rule('Bleeding X').summary).toBe('You take X True damage at the start of each of your turns.');
    expect(rule('Martial Expansion').summary).toContain('Combat Training');
    expect(rule('Barbarian').summary).toContain('reckless abandon');
    expect(rule('Elemental Fury').summary).toContain(':');
    expect(rule('Weapons').summary).toContain('Weapon Type');
    expect(rule('Spell Focuses').summary).toContain('Somatic Components');
    expect(rule('Armor').summary).toContain('Damage Reduction');
    expect(rule('Shields').summary).toContain('equip or stow');
    for (const entry of audited.entries.filter(({ kind }) => ['Skill', 'Trade', 'Language', 'Condition', 'Talent', 'Equipment'].includes(kind))) {
      expect(entry.summary).not.toMatch(/^(?:Condition|Stacking Condition|Talent|\d+ published catalog entries)$/i);
    }
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
