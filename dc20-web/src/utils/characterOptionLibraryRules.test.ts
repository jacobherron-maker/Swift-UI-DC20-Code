import { describe, expect, it } from 'vitest';
import type { ClassReference, RuleReferenceEntry } from '../types/models';
import {
  characterOptionCategoryForEntry,
  characterOptionMechanicalFacets,
  classFeaturesAtLevel,
  MASTERY_STAGE_ROWS,
  sourceMinimumLevel,
} from './characterOptionLibraryRules';

const entry = (kind: RuleReferenceEntry['kind'], text = ''): RuleReferenceEntry => ({
  id: kind, title: kind, section: 'Character Creation Rules', subsection: kind,
  summary: '', text, page: 'p.1', kind, keywords: '',
});

describe('character option library metadata', () => {
  it('routes each supported option kind to its landing category', () => {
    expect(characterOptionCategoryForEntry(entry('Class'))).toBe('Classes');
    expect(characterOptionCategoryForEntry(entry('Subclass'))).toBe('Subclasses');
    expect(characterOptionCategoryForEntry(entry('Ancestry'))).toBe('Ancestries & Traits');
    expect(characterOptionCategoryForEntry(entry('Spell'))).toBeNull();
  });

  it('derives useful mechanical facets without modifying source text', () => {
    expect(characterOptionMechanicalFacets(entry('Talent', 'Gain Weapon Training and learn a Maneuver.')))
      .toEqual(expect.arrayContaining(['Training', 'Maneuvers']));
    expect(characterOptionMechanicalFacets(entry('Ancestry', 'Your Speed increases and you gain Physical Defense.')))
      .toEqual(expect.arrayContaining(['Movement', 'Defense']));
  });

  it('reads minimum level requirements and mastery bonuses', () => {
    expect(sourceMinimumLevel(entry('Talent', 'Requirement: Level 6'))).toBe(6);
    expect(MASTERY_STAGE_ROWS.map(({ bonus }) => bonus)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('supports exact-level and cumulative class feature exploration', () => {
    const classReference = {
      features: [
        { level: 1, features: [{ name: 'One', description: 'First.' }] },
        { level: 2, features: [{ name: 'Two', description: 'Second.' }] },
      ],
    } as ClassReference;
    expect(classFeaturesAtLevel(classReference, 2, false).map(({ name }) => name)).toEqual(['Two']);
    expect(classFeaturesAtLevel(classReference, 2, true).map(({ name }) => name)).toEqual(['One', 'Two']);
  });
});
