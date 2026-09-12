import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ManeuverReference, SpellReference } from '../hooks/usePowerCatalog';
import { basePowerCost, powerRuleBlocks, type PowerResolution } from './powerRules';

const spellPath = fileURLToPath(new URL('../../public/data/BetaSpells.json', import.meta.url));
const maneuverPath = fileURLToPath(new URL('../../public/data/BetaManeuvers.json', import.meta.url));
const spellDocument = JSON.parse(readFileSync(spellPath, 'utf8')) as { spellCount: number; spells: SpellReference[] };
const maneuverDocument = JSON.parse(readFileSync(maneuverPath, 'utf8')) as { maneuverCount: number; maneuvers: ManeuverReference[] };

const resolutions = new Set<PowerResolution>([
  'Melee Spell Attack', 'Ranged Spell Attack', 'Area Spell Attack', 'Spell Attack', 'Spell Check',
  'Melee Martial Attack', 'Ranged Martial Attack', 'Area Martial Attack', 'Martial Attack', 'Martial Check', 'None',
]);

describe('source-audited spell and maneuver catalogs', () => {
  it('contains all 160 spells and all 30 maneuvers exactly once', () => {
    expect(spellDocument.spells).toHaveLength(160);
    expect(spellDocument.spellCount).toBe(spellDocument.spells.length);
    expect(new Set(spellDocument.spells.map(({ name }) => name)).size).toBe(160);
    expect(maneuverDocument.maneuvers).toHaveLength(30);
    expect(maneuverDocument.maneuverCount).toBe(maneuverDocument.maneuvers.length);
    expect(new Set(maneuverDocument.maneuvers.map(({ name }) => name)).size).toBe(30);
  });

  it('gives every power complete source and resolution metadata', () => {
    const sources = new Set(['Arcane', 'Divine', 'Primal']);
    const schools = new Set(['Astromancy', 'Conjuration', 'Divination', 'Elemental', 'Enchantment', 'Invocation', 'Nullification', 'Transmutation']);
    for (const spell of spellDocument.spells) {
      expect(spell.name).not.toBe('');
      expect(spell.source).not.toBe('');
      expect(spell.school).not.toBe('');
      expect(spell.tags).not.toBe('');
      expect(spell.source.split(',').map((value) => value.trim()).every((value) => sources.has(value))).toBe(true);
      expect(schools.has(spell.school)).toBe(true);
      const tags = spell.tags.split(',').map((value) => value.trim()).filter(Boolean);
      expect(new Set(tags).size).toBe(tags.length);
      expect(spell.cost).not.toBe('');
      expect(spell.range).not.toBe('');
      expect(spell.page).toBeGreaterThanOrEqual(71);
      expect(spell.page).toBeLessThanOrEqual(145);
      expect(resolutions.has(spell.resolution)).toBe(true);
      expect((spell.alternateResolutions ?? []).every((resolution) => resolutions.has(resolution))).toBe(true);
      expect(typeof spell.reaction).toBe('boolean');
      expect(spell.description).not.toBe('');
      expect(spell.enhancements).not.toBe('');
    }
    for (const maneuver of maneuverDocument.maneuvers) {
      expect(maneuver.name).not.toBe('');
      expect(['Attack', 'Defense', 'Grapple', 'Utility']).toContain(maneuver.category);
      expect(maneuver.page).toBeGreaterThanOrEqual(52);
      expect(maneuver.page).toBeLessThanOrEqual(59);
      expect(resolutions.has(maneuver.resolution)).toBe(true);
      expect(typeof maneuver.reaction).toBe('boolean');
      expect(maneuver.description).not.toBe('');
      expect(maneuver.enhancements).not.toBe('');
    }
  });

  it('preserves printed wording, documents source inconsistencies, and removes extraction artifacts', () => {
    const spell = (name: string) => spellDocument.spells.find((entry) => entry.name === name)!;
    const maneuver = (name: string) => maneuverDocument.maneuvers.find((entry) => entry.name === name)!;
    expect(spell('Call Familiar').description).toContain('PD 8 + CM • AD 8 + CM');
    expect(spell('Summon Construct').description).toMatch(/^You summon a Small or Medium sized Construct/);
    expect(spell('Summon Fey').description).toMatch(/^You summon a Small or Medium sized Elemental/);
    expect(spell('Summon Fey').sourceNote).toContain('following sentence, stat block, and traits all identify it as Fey');
    expect(spell('Summon Fiend').description).toContain('Summoned Fey stat block');
    expect(spell('Summon Fiend').sourceNote).toContain('identify it as a Fiend');
    expect(spell('Summon Ooze').description).toContain('Summoned Fey stat block');
    expect(spell('Summon Ooze').sourceNote).toContain('identify it as an Ooze');
    expect(spell('Slumber').sourceNote).toContain('preserved here verbatim');
    expect(spell('Spirit Link').sourceNote).toContain('closing parenthesis');
    expect(spell('Unholy Aura').enhancements).not.toContain('Summon Spells');
    expect(spell('Summon Beast').enhancements).toContain('\n\nSummon Traits\n');
    expect(maneuver('Sunder Strike').enhancements).not.toMatch(/\n\nThe\n\n/);
    expect(maneuver('Pathcarver').enhancements).toContain('horizontally out of the area');
  });

  it('tags representative attacks, checks, reactions, and check-free powers correctly', () => {
    const spell = (name: string) => spellDocument.spells.find((entry) => entry.name === name)!;
    const maneuver = (name: string) => maneuverDocument.maneuvers.find((entry) => entry.name === name)!;
    expect(spell('Arcane Bolt').resolution).toBe('Ranged Spell Attack');
    expect(spell('Corrosive Wave').resolution).toBe('Spell Attack');
    expect(spell('Detect Magic').resolution).toBe('Spell Check');
    expect(spell('Teleport').resolution).toBe('None');
    expect(spell('Telekinesis').alternateResolutions).toEqual(['Ranged Spell Attack']);
    expect(spell('Solar Beam').resolution).toBe('Area Spell Attack');
    expect(spell('Summon Dragon').resolution).toBe('None');
    expect(spell('Absorb Elements').reaction).toBe(true);
    expect(spell('Chaos Bomb').reaction).toBe(true);
    expect(maneuver('Cleave').resolution).toBe('Area Martial Attack');
    expect(maneuver('Resolve').resolution).toBe('Martial Check');
    expect(maneuver('Parry').resolution).toBe('None');
    expect(maneuver('Parry').reaction).toBe(true);
  });
});

describe('power rules presentation and costs', () => {
  it('turns source bullets, headings, tips, and enhancements into semantic blocks', () => {
    const blessing = spellDocument.spells.find(({ name }) => name === 'Blessing of Air')!;
    const familiar = spellDocument.spells.find(({ name }) => name === 'Call Familiar')!;
    const arcaneBolt = spellDocument.spells.find(({ name }) => name === 'Arcane Bolt')!;
    const increaseGravity = spellDocument.spells.find(({ name }) => name === 'Increase Gravity')!;
    const summonBeast = spellDocument.spells.find(({ name }) => name === 'Summon Beast')!;
    expect(powerRuleBlocks(blessing.description).filter(({ kind }) => kind === 'bullet')).toHaveLength(3);
    expect(powerRuleBlocks(familiar.description)).toContainEqual({ kind: 'heading', text: 'Familiar Traits' });
    expect(powerRuleBlocks(familiar.description).some(({ kind }) => kind === 'tip')).toBe(true);
    expect(powerRuleBlocks(arcaneBolt.enhancements, true).filter(({ kind }) => kind === 'enhancement')).toHaveLength(4);
    expect(powerRuleBlocks(increaseGravity.description)).toContainEqual({ kind: 'heading', text: 'Heightened Gravity' });
    const chaosBomb = spellDocument.spells.find(({ name }) => name === 'Chaos Bomb')!;
    expect(powerRuleBlocks(chaosBomb.description).filter(({ kind }) => kind === 'tableRow')).toHaveLength(12);
    expect(powerRuleBlocks(chaosBomb.description).find(({ kind }) => kind === 'tip')?.text).not.toContain('Detonation:');
    expect(powerRuleBlocks(chaosBomb.description)).toContainEqual(expect.objectContaining({ kind: 'paragraph', text: expect.stringMatching(/^Detonation:/) }));
    const scrying = spellDocument.spells.find(({ name }) => name === 'Scrying')!;
    expect(powerRuleBlocks(scrying.description)).toContainEqual({ kind: 'heading', text: 'Connection Bonus' });
    const shatterReality = spellDocument.spells.find(({ name }) => name === 'Shatter Reality')!;
    expect(powerRuleBlocks(shatterReality.enhancements, true).filter(({ kind }) => kind === 'tableRow')).toHaveLength(4);
    const chaosTorrent = spellDocument.spells.find(({ name }) => name === 'Chaos Torrent')!;
    expect(powerRuleBlocks(chaosTorrent.description).filter(({ kind }) => kind === 'tableRow')).toHaveLength(6);
    const summonBlocks = powerRuleBlocks(summonBeast.enhancements, true);
    expect(summonBlocks).toContainEqual({ kind: 'heading', text: 'Expanded Summon Traits' });
    expect(summonBlocks).toContainEqual({ kind: 'heading', text: 'Summon Traits' });
    expect(summonBlocks.find(({ text }) => text.startsWith('Additional Traits:'))?.text).toContain('see Summon Traits after the Summon Spells');
  });

  it('reads fixed costs without treating variable enhancement notation as a fixed spend', () => {
    expect(basePowerCost('1 AP + 2 MP')).toEqual({ actionPoints: 1, manaPoints: 2, staminaPoints: 0 });
    expect(basePowerCost('1 AP + X MP (minimum of 1)')).toEqual({ actionPoints: 1, manaPoints: 0, staminaPoints: 0 });
    expect(basePowerCost('Taunt Action (1 AP)')).toEqual({ actionPoints: 1, manaPoints: 0, staminaPoints: 0 });
  });
});
